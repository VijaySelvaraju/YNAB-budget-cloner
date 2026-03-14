/**
 * cloner.ts — Core YNAB budget cloning logic
 *
 * Intentional design decisions worth calling out:
 *
 * 1. DATE FILTERING: We pass `since_date` to the YNAB GET /transactions
 *    endpoint so the server returns only the relevant window.  We never fetch
 *    all transactions and slice in memory — that would be wasteful for large
 *    budgets.
 *
 * 2. ACCOUNT FILTERING: We resolve the set of included account IDs BEFORE
 *    entering the POST loop.  Transactions whose source account is excluded
 *    are dropped at the map-building step, not discovered mid-loop.
 *
 * 3. SPLIT TRANSACTIONS: subtransactions carry their own category_id values.
 *    Each sub is mapped independently; if any sub's category is missing in the
 *    destination we record it in the skip log but still post the parent with
 *    the remaining matched subs.  A parent with zero matched subs is skipped
 *    entirely.
 *
 * 4. DRY RUN: the dryRun flag short-circuits only the POST calls.  Every
 *    other step (fetch, match, validate) runs exactly as in a real run so the
 *    caller gets a realistic preview.
 */

import * as ynab from 'ynab'
import type {
  AccountMatch,
  CategoryMatch,
  CloneResult,
  FilterPreferences,
  PreflightResult,
  SkippedSummary,
  SubtransactionToPost,
  TransactionResult,
  TransactionToPost,
} from './types'

// ─── YNAB client factory ──────────────────────────────────────────────────────

function makeClient(token: string): ynab.API {
  return new ynab.API(token)
}

// ─── Account & category lookups ───────────────────────────────────────────────

/**
 * Build a name→id map from a flat list of YNAB accounts.
 * Case-insensitive, trimmed.
 */
function buildAccountNameMap(
  accounts: ynab.Account[],
): Map<string, ynab.Account> {
  const m = new Map<string, ynab.Account>()
  for (const a of accounts) {
    if (!a.deleted && !a.closed) {
      m.set(a.name.trim().toLowerCase(), a)
    }
  }
  return m
}

/**
 * Build a name→id map from all categories across all groups.
 * Key is "<group name>/<category name>" (case-insensitive) to handle
 * same-named categories in different groups.  Falls back to plain
 * category name if the grouped key is not found (see matchCategory).
 */
function buildCategoryNameMap(
  groups: ynab.CategoryGroupWithCategories[],
): Map<string, ynab.Category> {
  const m = new Map<string, ynab.Category>()
  for (const group of groups) {
    if (group.deleted) continue
    for (const cat of group.categories) {
      if (cat.deleted) continue
      // Store under both qualified and plain key; qualified wins on collision
      const plain = cat.name.trim().toLowerCase()
      const qualified = `${group.name.trim().toLowerCase()}/${plain}`
      m.set(qualified, cat)
      if (!m.has(plain)) m.set(plain, cat)
    }
  }
  return m
}

/**
 * Look up a destination category by matching source group+name (qualified),
 * falling back to plain name.  Returns null if not found.
 */
function matchCategory(
  sourceGroupName: string,
  sourceCategoryName: string,
  destMap: Map<string, ynab.Category>,
): ynab.Category | null {
  const qualified = `${sourceGroupName.trim().toLowerCase()}/${sourceCategoryName.trim().toLowerCase()}`
  const plain = sourceCategoryName.trim().toLowerCase()
  return destMap.get(qualified) ?? destMap.get(plain) ?? null
}

// ─── Transaction fetching ─────────────────────────────────────────────────────

/**
 * Fetch transactions from a budget using YNAB's `since_date` parameter so
 * only the requested date window is returned from the server.
 *
 * If `accountIds` is provided, we issue one GET per account — each call
 * targets GET /budgets/{id}/accounts/{accountId}/transactions?since_date=…
 * so only selected accounts' data is transferred.
 *
 * If `accountIds` is null/empty we fall back to the budget-wide endpoint,
 * which is fine when the user has selected all accounts.
 */
async function fetchTransactions(
  client: ynab.API,
  budgetId: string,
  sinceDate: string, // "YYYY-MM-DD"
  accountIds: string[] | null,
): Promise<ynab.TransactionDetail[]> {
  if (accountIds && accountIds.length > 0) {
    // Fetch per-account — filters accounts server-side
    const results = await Promise.all(
      accountIds.map((accountId) =>
        client.transactions
          .getTransactionsByAccount(budgetId, accountId, sinceDate)
          .then((r) => r.data.transactions),
      ),
    )
    return results.flat()
  }

  // All accounts — single budget-wide call, still uses since_date
  const r = await client.transactions.getTransactions(budgetId, sinceDate)
  return r.data.transactions
}

// ─── Pre-flight check ─────────────────────────────────────────────────────────

/**
 * Read both budgets and produce a detailed diff without writing anything.
 *
 * @param token          YNAB personal access token
 * @param sourceBudgetId Source (real) budget ID
 * @param destBudgetId   Destination (sandbox) budget ID
 * @param filters        Active date range and account selection
 */
export async function runPreflight(
  token: string,
  sourceBudgetId: string,
  destBudgetId: string,
  filters: FilterPreferences,
): Promise<PreflightResult> {
  const client = makeClient(token)

  // Fetch both budgets' accounts and categories in parallel
  const [
    sourceAccountsResp,
    destAccountsResp,
    sourceCatsResp,
    destCatsResp,
  ] = await Promise.all([
    client.accounts.getAccounts(sourceBudgetId),
    client.accounts.getAccounts(destBudgetId),
    client.categories.getCategories(sourceBudgetId),
    client.categories.getCategories(destBudgetId),
  ])

  const sourceAccounts = sourceAccountsResp.data.accounts.filter(
    (a) => !a.deleted && !a.closed,
  )
  const destAccountMap = buildAccountNameMap(destAccountsResp.data.accounts)
  const destCategoryMap = buildCategoryNameMap(destCatsResp.data.category_groups)

  // Determine which source accounts are selected
  const selectedIds =
    filters.selectedAccountIds ??
    sourceAccounts.map((a) => a.id)

  const includedSourceAccounts = sourceAccounts.filter((a) =>
    selectedIds.includes(a.id),
  )

  // Fetch transactions only for selected accounts using since_date
  const transactions = await fetchTransactions(
    client,
    sourceBudgetId,
    filters.startDate,
    selectedIds,
  )

  // Apply the end-date filter client-side (YNAB only supports since_date, not until_date)
  const filtered = transactions.filter((t) => t.date <= filters.endDate)

  // Count transactions per account
  const txCountByAccount = new Map<string, number>()
  for (const tx of filtered) {
    txCountByAccount.set(tx.account_id, (txCountByAccount.get(tx.account_id) ?? 0) + 1)
  }

  // Build account match table
  const accountMatches: AccountMatch[] = includedSourceAccounts.map((a) => {
    const destAccount = destAccountMap.get(a.name.trim().toLowerCase()) ?? null
    return {
      sourceAccountId: a.id,
      sourceAccountName: a.name,
      destinationAccountId: destAccount?.id ?? null,
      destinationAccountName: destAccount?.name ?? null,
      transactionCount: txCountByAccount.get(a.id) ?? 0,
    }
  })

  // Collect all unique source categories referenced in filtered transactions
  const sourceCatGroups = sourceCatsResp.data.category_groups
  const sourceCatById = new Map<string, { cat: ynab.Category; group: ynab.CategoryGroupWithCategories }>()
  for (const group of sourceCatGroups) {
    for (const cat of group.categories) {
      sourceCatById.set(cat.id, { cat, group })
    }
  }

  const referencedCatIds = new Set<string>()
  for (const tx of filtered) {
    if (tx.category_id) referencedCatIds.add(tx.category_id)
    for (const sub of tx.subtransactions ?? []) {
      if (sub.category_id) referencedCatIds.add(sub.category_id)
    }
  }

  // Build category match table
  const categoryMatches: CategoryMatch[] = []
  for (const catId of referencedCatIds) {
    const entry = sourceCatById.get(catId)
    if (!entry) continue
    const { cat, group } = entry
    const destCat = matchCategory(group.name, cat.name, destCategoryMap)
    categoryMatches.push({
      sourceCategoryId: cat.id,
      sourceCategoryName: cat.name,
      sourceGroupName: group.name,
      destinationCategoryId: destCat?.id ?? null,
      destinationCategoryName: destCat?.name ?? null,
    })
  }

  // Build quick lookup maps for skip analysis
  const matchedAccountIds = new Set(
    accountMatches.filter((m) => m.destinationAccountId !== null).map((m) => m.sourceAccountId),
  )
  const matchedCatIds = new Set(
    categoryMatches.filter((m) => m.destinationCategoryId !== null).map((m) => m.sourceCategoryId),
  )

  // Count will-copy vs will-skip
  let willCopyCount = 0
  let willSkipCount = 0
  const skipMap = new Map<string, SkippedSummary>()

  for (const tx of filtered) {
    const accountMatched = matchedAccountIds.has(tx.account_id)

    if (!accountMatched) {
      willSkipCount++
      const key = `no_account:${tx.account_id}`
      const existing = skipMap.get(key)
      if (existing) {
        existing.count++
      } else {
        skipMap.set(key, {
          reason: 'no_account_match',
          accountName: tx.account_name,
          categoryName: '',
          count: 1,
        })
      }
      continue
    }

    // For split transactions, check if at least one sub can be mapped
    if (tx.subtransactions && tx.subtransactions.length > 0) {
      const matchedSubs = tx.subtransactions.filter(
        (sub) => !sub.category_id || matchedCatIds.has(sub.category_id),
      )
      if (matchedSubs.length === 0) {
        willSkipCount++
      } else {
        willCopyCount++
        // Subs with no category match are recorded but parent still copies
        for (const sub of tx.subtransactions) {
          if (sub.category_id && !matchedCatIds.has(sub.category_id)) {
            const key = `no_cat:${sub.category_id}`
            const existing = skipMap.get(key)
            if (existing) {
              existing.count++
            } else {
              const catEntry = sourceCatById.get(sub.category_id)
              skipMap.set(key, {
                reason: 'no_category_match',
                accountName: tx.account_name,
                categoryName: catEntry?.cat.name ?? sub.category_id,
                count: 1,
              })
            }
          }
        }
      }
      continue
    }

    // Non-split: category must match (null category = uncategorized, always ok)
    if (tx.category_id && !matchedCatIds.has(tx.category_id)) {
      willSkipCount++
      const key = `no_cat:${tx.category_id}`
      const existing = skipMap.get(key)
      if (existing) {
        existing.count++
      } else {
        const catEntry = sourceCatById.get(tx.category_id)
        skipMap.set(key, {
          reason: 'no_category_match',
          accountName: tx.account_name,
          categoryName: catEntry?.cat.name ?? tx.category_id,
          count: 1,
        })
      }
      continue
    }

    willCopyCount++
  }

  return {
    accountMatches,
    categoryMatches,
    willCopyCount,
    willSkipCount,
    skippedTransactionSummary: Array.from(skipMap.values()),
  }
}

// ─── Clone transactions ───────────────────────────────────────────────────────

/**
 * Clone transactions from source to destination budget.
 *
 * The account and category filters are resolved into lookup Maps BEFORE
 * the POST loop.  Each transaction is classified as copy/skip/error in one
 * pass; no per-transaction API reads are made during the loop.
 *
 * @param token          YNAB personal access token
 * @param sourceBudgetId Source (real) budget ID
 * @param destBudgetId   Destination (sandbox) budget ID
 * @param filters        Active date range and account selection
 * @param dryRun         When true, skip all POST calls
 * @param onProgress     Optional callback receiving [done, total] counts
 */
export async function cloneTransactions(
  token: string,
  sourceBudgetId: string,
  destBudgetId: string,
  filters: FilterPreferences,
  dryRun: boolean,
  onProgress?: (done: number, total: number) => void,
): Promise<CloneResult> {
  const startedAt = new Date().toISOString()
  const client = makeClient(token)

  // ── 1. Load destination accounts & categories ──────────────────────────────
  const [destAccountsResp, destCatsResp, sourceAccountsResp, sourceCatsResp] =
    await Promise.all([
      client.accounts.getAccounts(destBudgetId),
      client.categories.getCategories(destBudgetId),
      client.accounts.getAccounts(sourceBudgetId),
      client.categories.getCategories(sourceBudgetId),
    ])

  const destAccountMap = buildAccountNameMap(destAccountsResp.data.accounts)
  const destCategoryMap = buildCategoryNameMap(destCatsResp.data.category_groups)

  // Source category lookup (id → {cat, group})
  const sourceCatById = new Map<string, { cat: ynab.Category; group: ynab.CategoryGroupWithCategories }>()
  for (const group of sourceCatsResp.data.category_groups) {
    for (const cat of group.categories) {
      sourceCatById.set(cat.id, { cat, group })
    }
  }

  // Source account lookup (id → account)
  const sourceAccountById = new Map<string, ynab.Account>()
  for (const a of sourceAccountsResp.data.accounts) {
    sourceAccountById.set(a.id, a)
  }

  // ── 2. Build account ID translation map (source → destination) ─────────────
  // This is done BEFORE fetching transactions so we know exactly which
  // source account IDs to request.
  const selectedIds =
    filters.selectedAccountIds ??
    sourceAccountsResp.data.accounts
      .filter((a) => !a.deleted && !a.closed)
      .map((a) => a.id)

  const accountIdMap = new Map<string, string>() // sourceId → destId
  for (const srcId of selectedIds) {
    const srcAccount = sourceAccountById.get(srcId)
    if (!srcAccount) continue
    const destAccount = destAccountMap.get(srcAccount.name.trim().toLowerCase())
    if (destAccount) {
      accountIdMap.set(srcId, destAccount.id)
    }
  }

  // Only request transactions for accounts that BOTH are selected AND have a
  // destination match — no point fetching transactions we will definitely skip.
  const fetchableAccountIds = selectedIds.filter((id) => accountIdMap.has(id))

  // ── 3. Fetch transactions (server-side date filter via since_date) ──────────
  const transactions = await fetchTransactions(
    client,
    sourceBudgetId,
    filters.startDate,
    fetchableAccountIds.length > 0 ? fetchableAccountIds : null,
  )

  // Apply end-date client-side (YNAB API doesn't support an until_date param)
  const eligible = transactions.filter((t) => t.date <= filters.endDate)

  const total = eligible.length
  const results: TransactionResult[] = []
  let done = 0

  // ── 4. Build the batch of transactions to POST ─────────────────────────────
  // All account/category resolution happens here, before any POST calls.
  const toPost: Array<{ payload: TransactionToPost; sourceId: string }> = []
  const skippedResults: TransactionResult[] = []

  for (const tx of eligible) {
    const destAccountId = accountIdMap.get(tx.account_id)
    if (!destAccountId) {
      // Should not happen since we only fetched fetchableAccountIds, but guard anyway
      skippedResults.push({
        sourceTransactionId: tx.id,
        status: 'skipped',
        reason: `No destination account match for "${tx.account_name}"`,
      })
      continue
    }

    // Resolve category
    let destCategoryId: string | null = null
    if (tx.category_id) {
      const srcCatEntry = sourceCatById.get(tx.category_id)
      if (srcCatEntry) {
        const destCat = matchCategory(
          srcCatEntry.group.name,
          srcCatEntry.cat.name,
          destCategoryMap,
        )
        if (!destCat && tx.subtransactions?.length === 0) {
          skippedResults.push({
            sourceTransactionId: tx.id,
            status: 'skipped',
            reason: `No destination category match for "${srcCatEntry.cat.name}"`,
          })
          continue
        }
        destCategoryId = destCat?.id ?? null
      }
    }

    // Resolve subtransactions
    let resolvedSubs: SubtransactionToPost[] | undefined
    if (tx.subtransactions && tx.subtransactions.length > 0) {
      resolvedSubs = []
      for (const sub of tx.subtransactions) {
        let subCategoryId: string | null = null
        if (sub.category_id) {
          const subCatEntry = sourceCatById.get(sub.category_id)
          if (subCatEntry) {
            const destCat = matchCategory(
              subCatEntry.group.name,
              subCatEntry.cat.name,
              destCategoryMap,
            )
            subCategoryId = destCat?.id ?? null
          }
        }
        resolvedSubs.push({
          amount: sub.amount,
          payee_name: sub.payee_name ?? null,
          category_id: subCategoryId,
          memo: sub.memo ?? null,
        })
      }

      // Skip parent entirely if no subs could be mapped
      if (resolvedSubs.length === 0) {
        skippedResults.push({
          sourceTransactionId: tx.id,
          status: 'skipped',
          reason: 'All subtransactions have unmatched categories',
        })
        continue
      }
    }

    const payload: TransactionToPost = {
      account_id: destAccountId,
      date: tx.date,
      amount: tx.amount,
      payee_name: tx.payee_name ?? null,
      category_id: resolvedSubs ? null : destCategoryId, // splits use sub-level categories
      memo: tx.memo ?? null,
      cleared: tx.cleared,
      approved: tx.approved,
      flag_color: tx.flag_color ?? null,
      ...(resolvedSubs ? { subtransactions: resolvedSubs } : {}),
    }

    toPost.push({ payload, sourceId: tx.id })
  }

  // Record all pre-resolved skips
  results.push(...skippedResults)

  // ── 5. POST transactions (or dry-run skip) ─────────────────────────────────
  const BATCH_SIZE = 50 // YNAB accepts up to 1000, but smaller batches give better progress UX

  for (let i = 0; i < toPost.length; i += BATCH_SIZE) {
    const batch = toPost.slice(i, i + BATCH_SIZE)

    if (dryRun) {
      // Simulate success without hitting the API
      for (const item of batch) {
        results.push({ sourceTransactionId: item.sourceId, status: 'copied' })
      }
    } else {
      try {
        const resp = await client.transactions.createTransaction(destBudgetId, {
          transactions: batch.map((b) => b.payload as ynab.NewTransaction),
        })

        const created = resp.data.transactions ?? []
        for (let j = 0; j < batch.length; j++) {
          results.push({
            sourceTransactionId: batch[j].sourceId,
            status: 'copied',
            destinationTransactionId: created[j]?.id,
          })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        for (const item of batch) {
          results.push({
            sourceTransactionId: item.sourceId,
            status: 'error',
            reason: message,
          })
        }
      }
    }

    done += batch.length
    onProgress?.(results.length, total)
  }

  const finishedAt = new Date().toISOString()

  return {
    dryRun,
    startedAt,
    finishedAt,
    copied: results.filter((r) => r.status === 'copied').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    errors: results.filter((r) => r.status === 'error').length,
    transactions: results,
  }
}

// ─── Filter preferences (persisted in localStorage) ──────────────────────────

export interface FilterPreferences {
  startDate: string // ISO date string, e.g. "2024-01-01"
  endDate: string   // ISO date string, e.g. "2024-12-31"
  /** Account IDs in the SOURCE budget that are selected for cloning.
   *  null means "all accounts" (initial state before accounts are loaded). */
  selectedAccountIds: string[] | null
}

// ─── Preflight diff result ────────────────────────────────────────────────────

export interface AccountMatch {
  sourceAccountId: string
  sourceAccountName: string
  destinationAccountId: string | null
  destinationAccountName: string | null
  transactionCount: number // within the active date range
}

export interface CategoryMatch {
  sourceCategoryId: string
  sourceCategoryName: string
  sourceGroupName: string
  destinationCategoryId: string | null
  destinationCategoryName: string | null
}

export interface PreflightResult {
  accountMatches: AccountMatch[]
  categoryMatches: CategoryMatch[]
  /** Total transactions that WILL be posted (accounts + categories all matched). */
  willCopyCount: number
  /** Transactions skipped because account or category has no match. */
  willSkipCount: number
  skippedTransactionSummary: SkippedSummary[]
}

export interface SkippedSummary {
  reason: 'no_account_match' | 'no_category_match'
  accountName: string
  categoryName: string
  count: number
}

// ─── Clone result ─────────────────────────────────────────────────────────────

export type TransactionResult = {
  sourceTransactionId: string
  status: 'copied' | 'skipped' | 'error'
  reason?: string
  destinationTransactionId?: string
}

export interface CloneResult {
  dryRun: boolean
  startedAt: string
  finishedAt: string
  copied: number
  skipped: number
  errors: number
  transactions: TransactionResult[]
}

// ─── Internal working types ───────────────────────────────────────────────────

/** A flat transaction ready to POST, derived from a YNAB SaveTransaction shape. */
export interface TransactionToPost {
  account_id: string
  date: string
  amount: number
  payee_name: string | null
  category_id: string | null
  memo: string | null
  cleared: string
  approved: boolean
  flag_color: string | null
  subtransactions?: SubtransactionToPost[]
}

export interface SubtransactionToPost {
  amount: number
  payee_name: string | null
  category_id: string | null
  memo: string | null
}

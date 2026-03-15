// ─── Source mode ──────────────────────────────────────────────────────────────

export type SourceMode = 'api' | 'csv'

// ─── Filter preferences (persisted in localStorage) ──────────────────────────

export interface FilterPreferences {
  startDate: string // ISO date string, e.g. "2024-01-01"
  endDate: string   // ISO date string, e.g. "2024-12-31"
  /** Account IDs in the SOURCE budget that are selected for cloning.
   *  null means "all accounts" (initial state before accounts are loaded). */
  selectedAccountIds: string[] | null
}

/** Filter preferences for CSV mode — accounts are identified by name, not ID. */
export interface CsvFilterPreferences {
  startDate: string
  endDate: string
  /** Account names to include. null = all accounts. */
  selectedAccountNames: string[] | null
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

export interface TransferPayeeMatch {
  sourceAccountId: string
  sourceAccountName: string
  destinationTransferPayeeId: string | null
}

export interface PreflightResult {
  accountMatches: AccountMatch[]
  categoryMatches: CategoryMatch[]
  transferPayeeMatches: TransferPayeeMatch[]
  /** All destination categories available for override dropdowns */
  destinationCategories: DestinationCategory[]
  /** Total transactions that WILL be posted (accounts + categories all matched). */
  willCopyCount: number
  /** Number of transactions that are native transfers and will be successfully linked natively. */
  transferCount: number
  /** Transactions skipped because account or category has no match. */
  willSkipCount: number
  skippedTransactionSummary: SkippedSummary[]
}

/** Flat list of destination categories for override dropdowns */
export interface DestinationCategory {
  id: string
  name: string
  groupName: string
}

/**
 * Override map: key = "groupName/categoryName" (lowercased), value = destination category ID.
 * Populated by the user in the preflight step to remap unmatched categories.
 */
export type CategoryOverrides = Record<string, string>

export interface SkippedSummary {
  reason: 'no_account_match' | 'no_category_match' | 'date_out_of_range'
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
  payee_id?: string | null
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

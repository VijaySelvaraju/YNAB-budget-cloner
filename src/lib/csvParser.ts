import type { TransactionClearedStatus } from 'ynab'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CsvTransaction {
  account: string
  date: string            // ISO YYYY-MM-DD
  payee: string | null
  categoryGroup: string | null
  category: string | null
  memo: string | null
  amount: number          // milliunits (negative = outflow, positive = inflow)
  cleared: TransactionClearedStatus
  /** Whether this row looks like a "Transfer : AccountName" payee */
  isTransfer: boolean
  /** The name of the other account in the transfer (if isTransfer=true) */
  transferToAccount: string | null
}

export interface CsvParseResult {
  transactions: CsvTransaction[]
  accounts: string[]
  parseErrors: string[]
}

// ─── Amount parsing ───────────────────────────────────────────────────────────

function parseAmount(raw: string): number {
  // Remove currency symbols, spaces, and thousands separators, keep decimal point
  const cleaned = raw.replace(/[^0-9.,]/g, '').replace(/,/g, '.')
  // If there are multiple dots after cleanup, keep only the last one
  const parts = cleaned.split('.')
  if (parts.length > 2) {
    // e.g. "1.234.56" → "1234.56"
    const lastPart = parts.pop()!
    return parseFloat(parts.join('') + '.' + lastPart) || 0
  }
  return parseFloat(cleaned) || 0
}

// ─── Date parsing ─────────────────────────────────────────────────────────────

function parseDate(raw: string): string | null {
  // Handles DD/MM/YYYY (YNAB European export) and YYYY-MM-DD
  const eurMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (eurMatch) {
    const [, day, month, year] = eurMatch
    return `${year}-${month}-${day}`
  }
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) return raw
  // MM/DD/YYYY (US format)
  const usMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (usMatch) {
    // Same regex as EUR — ambiguous. We've already handled DD/MM/YYYY above.
    // Fall back to original string if both patterns match (caller gets null and we log error).
  }
  return null
}

// ─── Cleared status ───────────────────────────────────────────────────────────

function parseClearedStatus(raw: string): TransactionClearedStatus {
  const lower = raw.trim().toLowerCase()
  if (lower === 'reconciled') return 'reconciled'
  if (lower === 'cleared') return 'cleared'
  return 'uncleared'
}

// ─── CSV tokeniser ────────────────────────────────────────────────────────────
// Handles quoted fields containing commas and escaped quotes ("")

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let i = 0
  while (i <= line.length) {
    if (line[i] === '"') {
      // Quoted field
      i++ // skip opening quote
      let value = ''
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            value += '"'
            i += 2
          } else {
            i++ // skip closing quote
            break
          }
        } else {
          value += line[i++]
        }
      }
      fields.push(value)
      if (line[i] === ',') i++ // skip comma after closing quote
    } else {
      // Unquoted field
      const end = line.indexOf(',', i)
      if (end === -1) {
        fields.push(line.slice(i))
        break
      } else {
        fields.push(line.slice(i, end))
        i = end + 1
      }
    }
  }
  return fields
}

// ─── Main parser ──────────────────────────────────────────────────────────────

/**
 * Parse a YNAB "Register" CSV export (Account → Export → CSV).
 *
 * Expected columns (in order):
 *   Account, Flag, Date, Payee, Category Group/Category, Category Group,
 *   Category, Memo, Outflow, Inflow, Cleared
 */
export function parseYnabCsvExport(csvText: string): CsvParseResult {
  // Strip UTF-8 BOM if present
  const text = csvText.startsWith('\uFEFF') ? csvText.slice(1) : csvText

  const lines = text.split(/\r?\n/)
  const parseErrors: string[] = []
  const transactions: CsvTransaction[] = []

  if (lines.length === 0) {
    return { transactions: [], accounts: [], parseErrors: ['File is empty'] }
  }

  // Parse header to find column indices (defensive, supports column reordering)
  const header = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase())
  const col = (name: string) => header.indexOf(name)

  const IDX = {
    account: col('account'),
    date: col('date'),
    payee: col('payee'),
    categoryGroupCat: col('category group/category'),
    categoryGroup: col('category group'),
    category: col('category'),
    memo: col('memo'),
    outflow: col('outflow'),
    inflow: col('inflow'),
    cleared: col('cleared'),
  }

  // Validate required columns exist
  const missing = Object.entries(IDX)
    .filter(([, v]) => v === -1)
    .map(([k]) => k)

  if (missing.length > 0) {
    return {
      transactions: [],
      accounts: [],
      parseErrors: [`Missing required columns: ${missing.join(', ')}`],
    }
  }

  const accountSet = new Set<string>()

  for (let lineNum = 1; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum].trim()
    if (!line) continue

    const fields = parseCsvLine(line)
    if (fields.length < 11) {
      parseErrors.push(`Line ${lineNum + 1}: too few fields (${fields.length})`)
      continue
    }

    const rawDate = fields[IDX.date]?.trim() ?? ''
    const isoDate = parseDate(rawDate)
    if (!isoDate) {
      parseErrors.push(`Line ${lineNum + 1}: unparseable date "${rawDate}"`)
      continue
    }

    const rawOutflow = fields[IDX.outflow]?.trim() ?? '0'
    const rawInflow = fields[IDX.inflow]?.trim() ?? '0'
    const outflowAmt = parseAmount(rawOutflow)
    const inflowAmt = parseAmount(rawInflow)
    // YNAB milliunits: positive = inflow, negative = outflow
    const amount = Math.round((inflowAmt - outflowAmt) * 1000)

    const payee = fields[IDX.payee]?.trim() || null

    // Detect native transfers by the payee name convention "Transfer : AccountName"
    const transferMatch = payee?.match(/^Transfer\s*:\s*(.+)$/i)
    const isTransfer = !!transferMatch
    const transferToAccount = transferMatch ? transferMatch[1].trim() : null

    const account = fields[IDX.account]?.trim() ?? ''
    accountSet.add(account)

    const rawCategory = fields[IDX.category]?.trim() || null
    const rawCategoryGroup = fields[IDX.categoryGroup]?.trim() || null

    transactions.push({
      account,
      date: isoDate,
      payee,
      categoryGroup: rawCategoryGroup || null,
      category: rawCategory || null,
      memo: fields[IDX.memo]?.trim() || null,
      amount,
      cleared: parseClearedStatus(fields[IDX.cleared]?.trim() ?? ''),
      isTransfer,
      transferToAccount,
    })
  }

  return {
    transactions,
    accounts: Array.from(accountSet).sort(),
    parseErrors,
  }
}

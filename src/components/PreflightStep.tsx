import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Loader2, ArrowLeft, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { runPreflight } from '@/lib/cloner'
import type { CategoryOverrides, DestinationCategory, FilterPreferences, PreflightResult } from '@/lib/types'

interface Props {
  token: string
  sourceBudgetId: string
  destBudgetId: string
  filters: FilterPreferences
  dryRun: boolean
  onClone: (result: PreflightResult, overrides: CategoryOverrides) => void
  onBack: () => void
}

export function PreflightStep({
  token,
  sourceBudgetId,
  destBudgetId,
  filters,
  dryRun,
  onClone,
  onBack,
}: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PreflightResult | null>(null)
  const [overrides, setOverrides] = useState<CategoryOverrides>({})

  useEffect(() => {
    setLoading(true)
    setError(null)
    setOverrides({})
    runPreflight(token, sourceBudgetId, destBudgetId, filters)
      .then(setResult)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [token, sourceBudgetId, destBudgetId, filters])

  const unmatchedAccounts = result?.accountMatches.filter((m) => !m.destinationAccountId) ?? []

  // Calculate effective will-copy count incorporating overrides
  const overriddenKeys = new Set(Object.keys(overrides))
  const additionalFromOverrides = result
    ? result.skippedTransactionSummary
        .filter(s => s.reason === 'no_category_match' && overriddenKeys.has(
          `${result.categoryMatches.find(m => m.sourceCategoryName === s.categoryName)
            ? result.categoryMatches.find(m => m.sourceCategoryName === s.categoryName)!.sourceGroupName.trim().toLowerCase() + '/' + s.categoryName.trim().toLowerCase()
            : ''}`
        ))
        .reduce((sum, s) => sum + s.count, 0)
    : 0

  const effectiveWillCopy = (result?.willCopyCount ?? 0) + additionalFromOverrides
  const effectiveWillSkip = (result?.willSkipCount ?? 0) - additionalFromOverrides

  function handleOverrideChange(categoryKey: string, destCategoryId: string) {
    setOverrides(prev => {
      const next = { ...prev }
      if (destCategoryId) {
        next[categoryKey] = destCategoryId
      } else {
        delete next[categoryKey]
      }
      return next
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-12">
      <div className="max-w-2xl mx-auto space-y-6 pt-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h2 className="text-xl font-bold">Pre-flight Check</h2>
            <p className="text-sm text-muted-foreground">Review before cloning</p>
          </div>
          {dryRun && (
            <Badge variant="secondary" className="ml-auto bg-blue-100 text-blue-800">
              Dry Run
            </Badge>
          )}
        </div>

        {loading && (
          <Card>
            <CardContent className="flex items-center gap-3 py-10 justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Running pre-flight checks…
            </CardContent>
          </Card>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Will copy" value={effectiveWillCopy} color="green" />
              <StatCard label="Native Transfers" value={result.transferCount} color="blue" />
              <StatCard label="Will skip" value={effectiveWillSkip} color="amber" />
              <StatCard label="Accounts unmatched" value={unmatchedAccounts.length} color={unmatchedAccounts.length > 0 ? 'red' : 'green'} />
            </div>

            {/* Date range summary */}
            <p className="text-sm text-muted-foreground text-center">
              Date range: <strong>{filters.startDate}</strong> → <strong>{filters.endDate}</strong>
            </p>

            {/* Account matches */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Account Matches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.accountMatches.map((m) => {
                    const transferMatch = result.transferPayeeMatches.find(t => t.sourceAccountId === m.sourceAccountId)
                    
                    return (
                      <div key={m.sourceAccountId} className="flex flex-col gap-1 py-1 border-b last:border-0 border-slate-100">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            {m.destinationAccountId ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                            )}
                            <span className="truncate font-medium">{m.sourceAccountName}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="truncate text-muted-foreground">
                              {m.destinationAccountName ?? <em className="text-red-500">No match</em>}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                            {m.transactionCount} tx
                          </span>
                        </div>
                        {/* Transfer Support Indicator */}
                        {m.destinationAccountId && (
                          <div className="pl-6 flex items-center gap-1.5 text-xs">
                            {transferMatch?.destinationTransferPayeeId ? (
                              <span className="text-blue-600 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Native transfers supported
                              </span>
                            ) : (
                              <span className="text-amber-600 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> Transfers will fallback to plain text
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Category matches with override dropdowns */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Category Matches{' '}
                  <span className="font-normal text-muted-foreground text-sm">
                    ({result.categoryMatches.length} referenced)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.categoryMatches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No categorised transactions in range.</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {result.categoryMatches.map((m) => {
                      const categoryKey = `${m.sourceGroupName.trim().toLowerCase()}/${m.sourceCategoryName.trim().toLowerCase()}`
                      const isOverridden = !!overrides[categoryKey]
                      const isMatched = !!m.destinationCategoryId || isOverridden

                      return (
                        <div key={m.sourceCategoryId} className="py-1.5 border-b last:border-0 border-slate-100">
                          <div className="flex items-center gap-2 text-sm">
                            {isMatched ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                            )}
                            <span className="text-muted-foreground text-xs shrink-0">
                              {m.sourceGroupName} /
                            </span>
                            <span className="truncate font-medium">{m.sourceCategoryName}</span>
                            <span className="text-muted-foreground shrink-0">→</span>
                            <span className="truncate text-muted-foreground">
                              {m.destinationCategoryName ?? (isOverridden
                                ? <em className="text-green-600">Overridden</em>
                                : null
                              )}
                            </span>
                          </div>
                          {/* Override dropdown — only show for unmatched categories */}
                          {!m.destinationCategoryId && (
                            <div className="mt-1.5 pl-6">
                              <div className="relative">
                                <select
                                  value={overrides[categoryKey] ?? ''}
                                  onChange={(e) => handleOverrideChange(categoryKey, e.target.value)}
                                  className="w-full appearance-none pl-3 pr-8 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  <option value="">— Skip this category —</option>
                                  {groupDestCategories(result.destinationCategories).map(([group, cats]) => (
                                    <optgroup key={group} label={group}>
                                      {cats.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                      ))}
                                    </optgroup>
                                  ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Skip summary */}
            {result.skippedTransactionSummary.filter(s => {
              if (s.reason !== 'no_category_match') return true
              const m = result.categoryMatches.find(m => m.sourceCategoryName === s.categoryName)
              if (!m) return true
              const key = `${m.sourceGroupName.trim().toLowerCase()}/${m.sourceCategoryName.trim().toLowerCase()}`
              return !overrides[key]
            }).length > 0 && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-amber-800">
                    Transactions That Will Be Skipped
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {result.skippedTransactionSummary
                      .filter(s => {
                        if (s.reason !== 'no_category_match') return true
                        const m = result.categoryMatches.find(m => m.sourceCategoryName === s.categoryName)
                        if (!m) return true
                        const key = `${m.sourceGroupName.trim().toLowerCase()}/${m.sourceCategoryName.trim().toLowerCase()}`
                        return !overrides[key]
                      })
                      .map((s, i) => (
                        <div key={i} className="flex justify-between text-sm text-amber-900">
                          <span>
                            {s.reason === 'no_account_match'
                              ? `No account match: "${s.accountName}"`
                              : `No category match: "${s.categoryName}" (${s.accountName})`}
                          </span>
                          <span className="font-medium">{s.count}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Separator />

            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {effectiveWillCopy.toLocaleString()} transactions will be created in the sandbox budget.
              </p>
              <Button
                size="lg"
                onClick={() => onClone(result, overrides)}
                disabled={effectiveWillCopy === 0}
                className={dryRun ? 'bg-blue-600 hover:bg-blue-700' : ''}
              >
                {dryRun ? '🔬 Dry Run Clone' : '🚀 Clone Transactions'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: 'green' | 'blue' | 'amber' | 'red'
}) {
  const colors = {
    green: 'bg-green-50 border-green-200 text-green-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    red: 'bg-red-50 border-red-200 text-red-800',
  }
  return (
    <div className={`rounded-lg border p-3 text-center ${colors[color]}`}>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      <div className="text-xs mt-0.5 opacity-80">{label}</div>
    </div>
  )
}

function groupDestCategories(cats: DestinationCategory[]): [string, DestinationCategory[]][] {
  const map = new Map<string, DestinationCategory[]>()
  for (const cat of cats) {
    const list = map.get(cat.groupName) ?? []
    list.push(cat)
    map.set(cat.groupName, list)
  }
  return Array.from(map.entries())
}

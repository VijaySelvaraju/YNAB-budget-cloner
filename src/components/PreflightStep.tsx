import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { runPreflight } from '@/lib/cloner'
import type { FilterPreferences, PreflightResult } from '@/lib/types'

interface Props {
  token: string
  sourceBudgetId: string
  destBudgetId: string
  filters: FilterPreferences
  dryRun: boolean
  onClone: (result: PreflightResult) => void
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

  useEffect(() => {
    setLoading(true)
    setError(null)
    runPreflight(token, sourceBudgetId, destBudgetId, filters)
      .then(setResult)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [token, sourceBudgetId, destBudgetId, filters])

  const unmatchedAccounts = result?.accountMatches.filter((m) => !m.destinationAccountId) ?? []
  const unmatchedCategories = result?.categoryMatches.filter((m) => !m.destinationCategoryId) ?? []

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
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <StatCard label="Will copy" value={result.willCopyCount} color="green" />
              <StatCard label="Native Transfers" value={result.transferCount} color="blue" />
              <StatCard label="Will skip" value={result.willSkipCount} color="amber" />
              <StatCard label="Accounts unmatched" value={unmatchedAccounts.length} color={unmatchedAccounts.length > 0 ? 'red' : 'green'} />
              <StatCard label="Categories unmatched" value={unmatchedCategories.length} color={unmatchedCategories.length > 0 ? 'amber' : 'green'} />
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

            {/* Category matches */}
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
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {result.categoryMatches.map((m) => (
                      <div key={m.sourceCategoryId} className="flex items-center gap-2 text-sm">
                        {m.destinationCategoryId ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                        )}
                        <span className="text-muted-foreground text-xs shrink-0">
                          {m.sourceGroupName} /
                        </span>
                        <span className="truncate font-medium">{m.sourceCategoryName}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="truncate text-muted-foreground">
                          {m.destinationCategoryName ?? (
                            <em className="text-amber-600">No match — will skip</em>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Skip summary */}
            {result.skippedTransactionSummary.length > 0 && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-amber-800">
                    Transactions That Will Be Skipped
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {result.skippedTransactionSummary.map((s, i) => (
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
                {result.willCopyCount} transactions will be created in the sandbox budget.
              </p>
              <Button
                size="lg"
                onClick={() => onClone(result)}
                disabled={result.willCopyCount === 0}
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
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-0.5 opacity-80">{label}</div>
    </div>
  )
}

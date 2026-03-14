import { CheckCircle2, Download, RefreshCw, AlertCircle, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { CloneResult } from '@/lib/types'

interface Props {
  result: CloneResult
  sourceBudgetName: string
  destBudgetName: string
  onStartOver: () => void
}

export function ResultStep({ result, sourceBudgetName, destBudgetName, onStartOver }: Props) {
  function downloadLog() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `ynab-clone-${timestamp}.json`
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const allGood = result.errors === 0

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          {allGood ? (
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
          ) : (
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
          )}
          <h2 className="text-2xl font-bold">
            {result.dryRun ? 'Dry Run Complete' : 'Clone Complete'}
          </h2>
          {result.dryRun && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-sm px-3 py-1">
              🔬 Dry Run — nothing was written to YNAB
            </Badge>
          )}
          <p className="text-sm text-muted-foreground">
            {sourceBudgetName} → {destBudgetName}
          </p>
          <p className="text-xs text-muted-foreground">
            {result.startedAt.slice(0, 19).replace('T', ' ')} →{' '}
            {result.finishedAt.slice(0, 19).replace('T', ' ')}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
            label={result.dryRun ? 'Would copy' : 'Copied'}
            value={result.copied}
            color="green"
          />
          <StatCard
            icon={<SkipForward className="h-5 w-5 text-amber-500" />}
            label="Skipped"
            value={result.skipped}
            color="amber"
          />
          <StatCard
            icon={<AlertCircle className="h-5 w-5 text-red-500" />}
            label="Errors"
            value={result.errors}
            color={result.errors > 0 ? 'red' : 'neutral'}
          />
        </div>

        {/* Error summary */}
        {result.errors > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              {result.errors} transaction{result.errors !== 1 ? 's' : ''} failed. Download the log
              below for details.
            </AlertDescription>
          </Alert>
        )}

        {/* Errors detail */}
        {result.errors > 0 && (
          <Card className="border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-red-700">Error Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 max-h-40 overflow-y-auto">
              {result.transactions
                .filter((t) => t.status === 'error')
                .map((t) => (
                  <div key={t.sourceTransactionId} className="text-xs text-red-700">
                    <span className="font-mono">{t.sourceTransactionId.slice(0, 8)}…</span>
                    {' — '}
                    {t.reason}
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" onClick={downloadLog} className="flex-1">
            <Download className="mr-2 h-4 w-4" />
            Download Log
          </Button>
          <Button onClick={onStartOver} className="flex-1">
            <RefreshCw className="mr-2 h-4 w-4" />
            Start Over
          </Button>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: 'green' | 'amber' | 'red' | 'neutral'
}) {
  const bg = {
    green: 'bg-green-50 border-green-200',
    amber: 'bg-amber-50 border-amber-200',
    red: 'bg-red-50 border-red-200',
    neutral: 'bg-slate-50 border-slate-200',
  }[color]

  return (
    <div className={`rounded-lg border p-3 text-center ${bg}`}>
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  )
}

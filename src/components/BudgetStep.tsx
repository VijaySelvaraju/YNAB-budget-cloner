import { AlertCircle, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FreshStartCard } from './FreshStartCard'
import type { Budget } from '@/lib/ynabApi'

interface Props {
  budgets: Budget[]
  sourceBudgetId: string
  destBudgetId: string
  onSourceChange: (id: string) => void
  onDestChange: (id: string) => void
  onContinue: () => void
  onDisconnect: () => void
}

export function BudgetStep({
  budgets,
  sourceBudgetId,
  destBudgetId,
  onSourceChange,
  onDestChange,
  onContinue,
  onDisconnect,
}: Props) {
  const sameBudget = sourceBudgetId && destBudgetId && sourceBudgetId === destBudgetId
  const canContinue = sourceBudgetId && destBudgetId && !sameBudget

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">YNAB Budget Cloner</h1>
          <p className="text-muted-foreground">Select your source and destination budgets</p>
        </div>

        {/* Budget pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Source — red */}
          <Card className="border-2 border-red-300 bg-red-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="inline-flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                  🔴 Real Budget
                </span>
              </CardTitle>
              <p className="text-xs text-red-700 font-medium">
                READ ONLY — transactions are only read from this budget, never modified
              </p>
            </CardHeader>
            <CardContent>
              <Select value={sourceBudgetId} onValueChange={onSourceChange}>
                <SelectTrigger className="border-red-300 focus:ring-red-400 bg-white">
                  <SelectValue placeholder="Select source budget…" />
                </SelectTrigger>
                <SelectContent>
                  {budgets.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Destination — green */}
          <Card className="border-2 border-green-300 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="inline-flex items-center gap-1.5 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                  🟢 Sandbox
                </span>
              </CardTitle>
              <p className="text-xs text-green-700 font-medium">
                WRITE TARGET — transactions will be created in this budget
              </p>
            </CardHeader>
            <CardContent>
              <Select value={destBudgetId} onValueChange={onDestChange}>
                <SelectTrigger className="border-green-300 focus:ring-green-400 bg-white">
                  <SelectValue placeholder="Select destination budget…" />
                </SelectTrigger>
                <SelectContent>
                  {budgets.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Same-budget error */}
        {sameBudget && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Source and destination cannot be the same budget.</strong> Cloning a budget
              onto itself would duplicate all your transactions. Please select two different budgets.
            </AlertDescription>
          </Alert>
        )}

        <FreshStartCard />

        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onDisconnect} className="text-muted-foreground">
            <LogOut className="mr-2 h-4 w-4" />
            Disconnect
          </Button>
          <Button onClick={onContinue} disabled={!canContinue} size="lg">
            Continue to Filters →
          </Button>
        </div>
      </div>
    </div>
  )
}

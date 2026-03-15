import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldAlert, CheckCircle2 } from 'lucide-react'
import type { Budget } from '@/lib/ynabApi'

interface Props {
  budgets: Budget[]
  onComplete: (budgetId: string) => void
}

export function PrimaryBudgetStep({ budgets, onComplete }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const selectedBudget = budgets.find((b) => b.id === selectedId)

  if (confirmed && selectedBudget) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center border-green-200">
          <CardHeader>
            <div className="mx-auto bg-green-100 text-green-600 rounded-full p-3 mb-4 w-fit">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <CardTitle className="text-xl">Primary Budget Set</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-slate-600">
              <strong>{selectedBudget.name}</strong> is set as your real budget. It will never appear as a copy destination.
            </p>
            <Button size="lg" className="w-full" onClick={() => onComplete(selectedBudget.id)}>
              Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto bg-red-100 text-red-600 rounded-full p-3 w-fit mb-4">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Which is your real budget?</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            This is the budget you use day to day. We will make sure it can never accidentally be used as a destination.
          </p>
        </div>

        <div className="grid gap-3 mt-8 max-h-[50vh] overflow-y-auto pr-2">
          {budgets.map((budget) => {
            const isSelected = selectedId === budget.id
            return (
              <Card 
                key={budget.id}
                className={`cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-red-500 bg-red-50/50 shadow-sm ring-1 ring-red-500' 
                    : 'hover:border-slate-300 hover:shadow-sm'
                }`}
                onClick={() => setSelectedId(budget.id)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-900">{budget.name}</span>
                    <span className="text-xs text-slate-500 truncate mt-0.5">ID: {budget.id}</span>
                  </div>
                  {isSelected && <CheckCircle2 className="h-5 w-5 text-red-600" />}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-200 mt-6">
          <Button 
            size="lg" 
            disabled={!selectedId} 
            onClick={() => setConfirmed(true)}
          >
            Set as My Real Budget
          </Button>
        </div>
      </div>
    </div>
  )
}

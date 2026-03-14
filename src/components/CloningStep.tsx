import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'

interface Props {
  done: number
  total: number
  dryRun: boolean
}

export function CloningStep({ done, total, dryRun }: Props) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-slate-600" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold">
            {dryRun ? 'Running Dry Clone…' : 'Cloning Transactions…'}
          </h2>
          {dryRun && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Dry Run — nothing is being written
            </Badge>
          )}
        </div>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <Progress value={pct} className="h-3" />
            <p className="text-sm text-muted-foreground">
              {done} of {total} transactions processed ({pct}%)
            </p>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">Do not close this tab</p>
      </div>
    </div>
  )
}

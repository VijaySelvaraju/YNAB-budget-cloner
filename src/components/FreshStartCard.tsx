import { AlertTriangle, ExternalLink } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function FreshStartCard() {
  return (
    <Alert className="border-amber-300 bg-amber-50">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800">Complete the Fresh Start step in YNAB first</AlertTitle>
      <AlertDescription className="text-amber-700 space-y-2 mt-1">
        <p>
          Before cloning, your destination budget must be freshly reset so it has the same account
          and category structure as your source budget (but no transactions).
        </p>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Open your sandbox budget in YNAB</li>
          <li>
            Go to <strong>Budget → Fresh Start</strong>
          </li>
          <li>Confirm the reset — this wipes all transactions from that budget</li>
          <li>Come back here and continue</li>
        </ol>
        <a
          href="https://support.ynab.com/plan-resets-and-fresh-starts-HkXYR_c0q"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-amber-800 underline hover:text-amber-900"
        >
          YNAB Fresh Start guide
          <ExternalLink className="h-3 w-3" />
        </a>
      </AlertDescription>
    </Alert>
  )
}

import { useState } from 'react'
import { KeyRound, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { fetchBudgets, type Budget } from '@/lib/ynabApi'
import { setToken } from '@/lib/storage'

interface Props {
  initialToken: string
  onSuccess: (token: string, budgets: Budget[]) => void
}

export function TokenStep({ initialToken, onSuccess }: Props) {
  const [value, setValue] = useState(initialToken)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConnect() {
    const trimmed = value.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    try {
      const budgets = await fetchBudgets(trimmed)
      setToken(trimmed)
      onSuccess(trimmed, budgets)
    } catch {
      setError('Could not connect. Check your token and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-slate-900 text-white rounded-full p-3">
              <KeyRound className="h-6 w-6" />
            </div>
          </div>
          <CardTitle className="text-2xl">YNAB Budget Cloner</CardTitle>
          <CardDescription>
            Enter your YNAB Personal Access Token to get started.{' '}
            <a
              href="https://app.ynab.com/settings/developer"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-600 hover:text-blue-800"
            >
              Get a token →
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token">Personal Access Token</Label>
            <Input
              id="token"
              type="password"
              placeholder="Paste your token here"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              autoFocus
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button className="w-full" onClick={handleConnect} disabled={!value.trim() || loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting…
              </>
            ) : (
              'Connect to YNAB'
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Your token is stored only in your browser's localStorage and sent directly to{' '}
            <span className="font-mono">api.ynab.com</span>. Nothing passes through any server.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

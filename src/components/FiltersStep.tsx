import { useEffect, useState } from 'react'
import { format, subDays, subMonths } from 'date-fns'
import { Loader2, ArrowLeft } from 'lucide-react'
import type * as ynab from 'ynab'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { fetchAccounts } from '@/lib/ynabApi'
import { setFilters } from '@/lib/storage'
import type { FilterPreferences } from '@/lib/types'

interface Props {
  token: string
  sourceBudgetId: string
  filters: FilterPreferences
  dryRun: boolean
  onFiltersChange: (f: FilterPreferences) => void
  onDryRunChange: (v: boolean) => void
  onRunPreflight: () => void
  onBack: () => void
}

const PRESETS = [
  { label: 'Last 1 month', days: 30 },
  { label: 'Last 3 months', days: 90 },
  { label: 'Last 6 months', days: 180 },
  { label: 'Last 12 months', days: 365 },
] as const

const today = () => format(new Date(), 'yyyy-MM-dd')
const daysAgo = (n: number) => format(subDays(new Date(), n), 'yyyy-MM-dd')

export function FiltersStep({
  token,
  sourceBudgetId,
  filters,
  dryRun,
  onFiltersChange,
  onDryRunChange,
  onRunPreflight,
  onBack,
}: Props) {
  const [accounts, setAccounts] = useState<ynab.Account[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [accountsError, setAccountsError] = useState<string | null>(null)

  useEffect(() => {
    setLoadingAccounts(true)
    fetchAccounts(token, sourceBudgetId)
      .then((accts) => {
        setAccounts(accts)
        // If no saved selection yet, select all
        if (filters.selectedAccountIds === null) {
          const updated = { ...filters, selectedAccountIds: accts.map((a) => a.id) }
          onFiltersChange(updated)
          setFilters(updated)
        }
      })
      .catch(() => setAccountsError('Failed to load accounts. Check your connection.'))
      .finally(() => setLoadingAccounts(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, sourceBudgetId])

  function applyPreset(days: number) {
    const updated = { ...filters, startDate: daysAgo(days), endDate: today() }
    onFiltersChange(updated)
    setFilters(updated)
  }

  function applyAllTime() {
    const updated = { ...filters, startDate: '2000-01-01', endDate: today() }
    onFiltersChange(updated)
    setFilters(updated)
  }

  function setDate(field: 'startDate' | 'endDate', value: string) {
    const updated = { ...filters, [field]: value }
    onFiltersChange(updated)
    setFilters(updated)
  }

  function toggleAccount(id: string, checked: boolean) {
    const current = filters.selectedAccountIds ?? accounts.map((a) => a.id)
    const next = checked ? [...current, id] : current.filter((x) => x !== id)
    const updated = { ...filters, selectedAccountIds: next }
    onFiltersChange(updated)
    setFilters(updated)
  }

  function toggleAll(checked: boolean) {
    const updated = {
      ...filters,
      selectedAccountIds: checked ? accounts.map((a) => a.id) : [],
    }
    onFiltersChange(updated)
    setFilters(updated)
  }

  const selectedIds = filters.selectedAccountIds ?? accounts.map((a) => a.id)
  const allSelected = accounts.length > 0 && selectedIds.length === accounts.length
  const someSelected = selectedIds.length > 0 && selectedIds.length < accounts.length

  const activePreset = PRESETS.find((p) => filters.startDate === daysAgo(p.days) && filters.endDate === today())

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h2 className="text-xl font-bold">Configure Filters</h2>
            <p className="text-sm text-muted-foreground">Choose what to copy</p>
          </div>
        </div>

        {/* Date range */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Date Range</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Button
                  key={p.days}
                  variant={activePreset?.days === p.days ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => applyPreset(p.days)}
                >
                  {p.label}
                </Button>
              ))}
              <Button
                variant={!activePreset && filters.startDate === '2000-01-01' ? 'default' : 'outline'}
                size="sm"
                onClick={applyAllTime}
              >
                All time
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="start-date">From</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={filters.startDate}
                  max={filters.endDate}
                  onChange={(e) => setDate('startDate', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="end-date">To</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={filters.endDate}
                  min={filters.startDate}
                  max={today()}
                  onChange={(e) => setDate('endDate', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account filter */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Accounts to Include</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAccounts ? (
              <div className="flex items-center gap-2 text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading accounts…
              </div>
            ) : accountsError ? (
              <Alert variant="destructive">
                <AlertDescription>{accountsError}</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {/* Select all toggle */}
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Checkbox
                    id="select-all"
                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                    onCheckedChange={(v) => toggleAll(v === true)}
                  />
                  <Label htmlFor="select-all" className="font-medium cursor-pointer">
                    {allSelected ? 'Deselect all' : 'Select all'} ({accounts.length} accounts)
                  </Label>
                </div>
                {accounts.map((a) => (
                  <div key={a.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`acct-${a.id}`}
                      checked={selectedIds.includes(a.id)}
                      onCheckedChange={(v) => toggleAccount(a.id, v === true)}
                    />
                    <Label htmlFor={`acct-${a.id}`} className="cursor-pointer flex-1">
                      {a.name}
                    </Label>
                    <span className="text-xs text-muted-foreground capitalize">{a.type}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dry run toggle */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Dry Run Mode</p>
                <p className="text-sm text-muted-foreground">
                  Runs the full flow — pre-flight and progress UI — without writing any transactions
                </p>
              </div>
              <Switch checked={dryRun} onCheckedChange={onDryRunChange} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={onRunPreflight}
            disabled={loadingAccounts || selectedIds.length === 0}
          >
            Run Pre-flight Check →
          </Button>
        </div>
      </div>
    </div>
  )
}

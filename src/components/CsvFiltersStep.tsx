import { useState } from 'react'
import { format, subDays } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import type { CsvFilterPreferences } from '@/lib/types'

interface Props {
  accounts: string[]
  filters: CsvFilterPreferences
  dryRun: boolean
  onFiltersChange: (f: CsvFilterPreferences) => void
  onDryRunChange: (v: boolean) => void
  onRunPreflight: () => void
  onBack: () => void
}

const PRESETS = [
  { label: 'Last 1 month', days: 30 },
  { label: 'Last 3 months', days: 90 },
  { label: 'Last 6 months', days: 180 },
  { label: 'Last 12 months', days: 365 },
  { label: 'Last 5 years', days: 1825 },
] as const

const today = () => format(new Date(), 'yyyy-MM-dd')
const daysAgo = (n: number) => format(subDays(new Date(), n), 'yyyy-MM-dd')

export function CsvFiltersStep({
  accounts,
  filters,
  dryRun,
  onFiltersChange,
  onDryRunChange,
  onRunPreflight,
  onBack,
}: Props) {
  const [localFilters, setLocalFilters] = useState<CsvFilterPreferences>(() => ({
    ...filters,
    selectedAccountNames: filters.selectedAccountNames ?? accounts,
  }))

  function applyPreset(days: number) {
    const updated = { ...localFilters, startDate: daysAgo(days), endDate: today() }
    setLocalFilters(updated)
    onFiltersChange(updated)
  }

  function applyAllTime() {
    const updated = { ...localFilters, startDate: '2000-01-01', endDate: today() }
    setLocalFilters(updated)
    onFiltersChange(updated)
  }

  function setDate(field: 'startDate' | 'endDate', value: string) {
    const updated = { ...localFilters, [field]: value }
    setLocalFilters(updated)
    onFiltersChange(updated)
  }

  function toggleAccount(name: string, checked: boolean) {
    const current = localFilters.selectedAccountNames ?? accounts
    const next = checked ? [...current, name] : current.filter(x => x !== name)
    const updated = { ...localFilters, selectedAccountNames: next }
    setLocalFilters(updated)
    onFiltersChange(updated)
  }

  function toggleAll(checked: boolean) {
    const updated = { ...localFilters, selectedAccountNames: checked ? [...accounts] : [] }
    setLocalFilters(updated)
    onFiltersChange(updated)
  }

  const selectedNames = localFilters.selectedAccountNames ?? accounts
  const allSelected = accounts.length > 0 && selectedNames.length === accounts.length
  const someSelected = selectedNames.length > 0 && selectedNames.length < accounts.length
  const activePreset = PRESETS.find(p => localFilters.startDate === daysAgo(p.days) && localFilters.endDate === today())

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">

        {/* CSV mode header banner */}
        <div className="flex items-center gap-3 p-3 rounded-xl border border-violet-200 bg-violet-50">
          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-violet-800">CSV export mode — full history, no date limits</p>
            <p className="text-xs text-violet-600">{accounts.length} accounts loaded from your export file</p>
          </div>
        </div>

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
                variant={!activePreset && localFilters.startDate === '2000-01-01' ? 'default' : 'outline'}
                size="sm"
                onClick={applyAllTime}
              >
                All time
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="csv-start-date">From</Label>
                <Input
                  id="csv-start-date"
                  type="date"
                  value={localFilters.startDate}
                  max={localFilters.endDate}
                  onChange={(e) => setDate('startDate', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="csv-end-date">To</Label>
                <Input
                  id="csv-end-date"
                  type="date"
                  value={localFilters.endDate}
                  min={localFilters.startDate}
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
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Checkbox
                  id="csv-select-all"
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={(v) => toggleAll(v === true)}
                />
                <Label htmlFor="csv-select-all" className="font-medium cursor-pointer">
                  {allSelected ? 'Deselect all' : 'Select all'} ({accounts.length} accounts)
                </Label>
              </div>
              {accounts.map((name) => (
                <div key={name} className="flex items-center gap-2">
                  <Checkbox
                    id={`csv-acct-${name}`}
                    checked={selectedNames.includes(name)}
                    onCheckedChange={(v) => toggleAccount(name, v === true)}
                  />
                  <Label htmlFor={`csv-acct-${name}`} className="cursor-pointer flex-1">
                    {name}
                  </Label>
                </div>
              ))}
            </div>
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
            disabled={selectedNames.length === 0}
          >
            Run Pre-flight Check →
          </Button>
        </div>
      </div>
    </div>
  )
}

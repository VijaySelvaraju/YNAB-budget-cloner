import { useState } from 'react'
import { format } from 'date-fns'
import { TokenStep } from '@/components/TokenStep'
import { BudgetStep } from '@/components/BudgetStep'
import { FiltersStep } from '@/components/FiltersStep'
import { CsvFiltersStep } from '@/components/CsvFiltersStep'
import { PreflightStep } from '@/components/PreflightStep'
import { CsvPreflightStep } from '@/components/CsvPreflightStep'
import { CloningStep } from '@/components/CloningStep'
import { ResultStep } from '@/components/ResultStep'
import { HowItWorksModal } from '@/components/HowItWorksModal'
import { FreshStartConfirmStep } from '@/components/FreshStartConfirmStep'
import { PrimaryBudgetStep } from '@/components/PrimaryBudgetStep'
import { SourceModeStep } from '@/components/SourceModeStep'
import { CsvUploadStep } from '@/components/CsvUploadStep'
import { getToken, clearToken, getFilters, getPrimaryBudgetId, setPrimaryBudgetId as savePrimaryBudgetId, clearPrimaryBudgetId } from '@/lib/storage'
import { cloneTransactions, cloneFromCsv } from '@/lib/cloner'
import type { Budget } from '@/lib/ynabApi'
import type { CloneResult, CsvFilterPreferences, FilterPreferences, PreflightResult, SourceMode } from '@/lib/types'
import type { CsvTransaction } from '@/lib/csvParser'

type Step =
  | 'token'
  | 'source_mode'
  | 'primary_budget'
  | 'fresh_start_confirm'
  | 'budgets'
  | 'csv_upload'
  | 'filters'
  | 'csv_filters'
  | 'preflight'
  | 'csv_preflight'
  | 'cloning'
  | 'result'

const today = () => format(new Date(), 'yyyy-MM-dd')

const DEFAULT_CSV_FILTERS: CsvFilterPreferences = {
  startDate: '2000-01-01',
  endDate: today(),
  selectedAccountNames: null,
}

export default function App() {
  const savedToken = getToken() ?? ''
  const savedPrimary = getPrimaryBudgetId()

  const [step, setStep] = useState<Step>(savedToken ? 'budgets' : 'token')
  const [token, setTokenState] = useState(savedToken)
  const [primaryBudgetId, setPrimaryBudgetIdState] = useState<string | null>(savedPrimary)
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [sourceBudgetId, setSourceBudgetId] = useState(savedPrimary ?? '')
  const [destBudgetId, setDestBudgetId] = useState('')
  const [filters, setFiltersState] = useState<FilterPreferences>(getFilters)
  const [dryRun, setDryRun] = useState(false)
  const [cloneProgress, setCloneProgress] = useState({ done: 0, total: 0 })
  const [cloneResult, setCloneResult] = useState<CloneResult | null>(null)

  // ── CSV state ────────────────────────────────────────────────────────────────
  const [sourceMode, setSourceMode] = useState<SourceMode>('api')
  const [csvTransactions, setCsvTransactions] = useState<CsvTransaction[]>([])
  const [csvAccounts, setCsvAccounts] = useState<string[]>([])
  const [csvFilters, setCsvFiltersState] = useState<CsvFilterPreferences>(DEFAULT_CSV_FILTERS)

  // ── Token step ───────────────────────────────────────────────────────────────
  function handleTokenSuccess(t: string, b: Budget[]) {
    setTokenState(t)
    setBudgets(b)
    if (!primaryBudgetId) {
      setStep('primary_budget')
    } else {
      setStep('fresh_start_confirm')
    }
  }

  // ── Primary Budget step ──────────────────────────────────────────────────────
  function handlePrimaryBudgetComplete(id: string) {
    savePrimaryBudgetId(id)
    setPrimaryBudgetIdState(id)
    setSourceBudgetId(id)
    setStep('fresh_start_confirm')
  }

  // ── Disconnect ───────────────────────────────────────────────────────────────
  function handleDisconnect() {
    clearToken()
    clearPrimaryBudgetId()
    setTokenState('')
    setPrimaryBudgetIdState(null)
    setBudgets([])
    setSourceBudgetId('')
    setDestBudgetId('')
    setStep('token')
  }

  // ── Source mode selection ─────────────────────────────────────────────────
  function handleSourceModeSelect(mode: SourceMode) {
    setSourceMode(mode)
    if (mode === 'csv') {
      setStep('csv_upload')
    } else {
      setStep('filters')
    }
  }

  // ── CSV upload ───────────────────────────────────────────────────────────────
  function handleCsvParsed(transactions: CsvTransaction[], accounts: string[]) {
    setCsvTransactions(transactions)
    setCsvAccounts(accounts)
    setCsvFiltersState({
      startDate: '2000-01-01',
      endDate: today(),
      selectedAccountNames: accounts,
    })
    setStep('csv_filters')
  }

  // ── Preflight ────────────────────────────────────────────────────────────────
  function handleRunPreflight() {
    if (sourceMode === 'csv') {
      setStep('csv_preflight')
    } else {
      setStep('preflight')
    }
  }

  // ── Clone (API) ──────────────────────────────────────────────────────────────
  async function handleClone(_preflightResult: PreflightResult) {
    setCloneProgress({ done: 0, total: 0 })
    setStep('cloning')
    try {
      const result = await cloneTransactions(
        token,
        sourceBudgetId,
        destBudgetId,
        filters,
        dryRun,
        (done, total) => setCloneProgress({ done, total }),
      )
      setCloneResult(result)
      setStep('result')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setCloneResult({ dryRun, startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), copied: 0, skipped: 0, errors: 1, transactions: [{ sourceTransactionId: 'N/A', status: 'error', reason: message }] })
      setStep('result')
    }
  }

  // ── Clone (CSV) ──────────────────────────────────────────────────────────────
  async function handleCsvClone(_preflightResult: PreflightResult) {
    setCloneProgress({ done: 0, total: 0 })
    setStep('cloning')
    try {
      const result = await cloneFromCsv(
        token,
        destBudgetId,
        csvTransactions,
        csvFilters,
        dryRun,
        (done, total) => setCloneProgress({ done, total }),
      )
      setCloneResult(result)
      setStep('result')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setCloneResult({ dryRun, startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), copied: 0, skipped: 0, errors: 1, transactions: [{ sourceTransactionId: 'N/A', status: 'error', reason: message }] })
      setStep('result')
    }
  }

  // ── Start over ───────────────────────────────────────────────────────────────
  function handleStartOver() {
    setSourceBudgetId(primaryBudgetId ?? '')
    setDestBudgetId('')
    setFiltersState(getFilters())
    setCsvTransactions([])
    setCsvAccounts([])
    setCsvFiltersState(DEFAULT_CSV_FILTERS)
    setDryRun(false)
    setCloneResult(null)
    setSourceMode('api')
    setStep('budgets')
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  const sourceBudgetName = budgets.find((b) => b.id === sourceBudgetId)?.name ?? (sourceMode === 'csv' ? 'CSV Export' : sourceBudgetId)
  const destBudgetName = budgets.find((b) => b.id === destBudgetId)?.name ?? destBudgetId

  let content = null
  if (step === 'budgets' && budgets.length === 0) {
    content = <TokenStep initialToken={token} onSuccess={handleTokenSuccess} />
  } else {
    switch (step) {
      case 'token':
        content = <TokenStep initialToken={token} onSuccess={handleTokenSuccess} />
        break
      case 'primary_budget':
        content = <PrimaryBudgetStep budgets={budgets} onComplete={handlePrimaryBudgetComplete} />
        break
      case 'fresh_start_confirm':
        content = <FreshStartConfirmStep onConfirm={() => setStep('budgets')} />
        break
      case 'budgets':
        content = (
          <BudgetStep
            budgets={budgets}
            primaryBudgetId={primaryBudgetId}
            sourceBudgetId={sourceBudgetId}
            destBudgetId={destBudgetId}
            onSourceChange={setSourceBudgetId}
            onDestChange={setDestBudgetId}
            onContinue={() => setStep('source_mode')}
            onDisconnect={handleDisconnect}
            onChangePrimary={() => setStep('primary_budget')}
          />
        )
        break
      case 'source_mode':
        content = <SourceModeStep onSelect={handleSourceModeSelect} />
        break
      case 'csv_upload':
        content = (
          <CsvUploadStep
            onParsed={handleCsvParsed}
            onBack={() => setStep('source_mode')}
          />
        )
        break
      case 'filters':
        content = (
          <FiltersStep
            token={token}
            sourceBudgetId={sourceBudgetId}
            filters={filters}
            dryRun={dryRun}
            onFiltersChange={setFiltersState}
            onDryRunChange={setDryRun}
            onRunPreflight={handleRunPreflight}
            onBack={() => setStep('source_mode')}
          />
        )
        break
      case 'csv_filters':
        content = (
          <CsvFiltersStep
            accounts={csvAccounts}
            filters={csvFilters}
            dryRun={dryRun}
            onFiltersChange={setCsvFiltersState}
            onDryRunChange={setDryRun}
            onRunPreflight={handleRunPreflight}
            onBack={() => setStep('csv_upload')}
          />
        )
        break
      case 'preflight':
        content = (
          <PreflightStep
            token={token}
            sourceBudgetId={sourceBudgetId}
            destBudgetId={destBudgetId}
            filters={filters}
            dryRun={dryRun}
            onClone={handleClone}
            onBack={() => setStep('filters')}
          />
        )
        break
      case 'csv_preflight':
        content = (
          <CsvPreflightStep
            token={token}
            destBudgetId={destBudgetId}
            csvTransactions={csvTransactions}
            filters={csvFilters}
            dryRun={dryRun}
            onClone={handleCsvClone}
            onBack={() => setStep('csv_filters')}
          />
        )
        break
      case 'cloning':
        content = <CloningStep done={cloneProgress.done} total={cloneProgress.total} dryRun={dryRun} />
        break
      case 'result':
        content = (
          <ResultStep
            result={cloneResult!}
            sourceBudgetName={sourceBudgetName}
            destBudgetName={destBudgetName}
            onStartOver={handleStartOver}
          />
        )
        break
    }
  }

  return (
    <>
      <HowItWorksModal onChangePrimaryBudget={() => setStep('primary_budget')} />
      {content}
    </>
  )
}

import { useState } from 'react'
import { TokenStep } from '@/components/TokenStep'
import { BudgetStep } from '@/components/BudgetStep'
import { FiltersStep } from '@/components/FiltersStep'
import { PreflightStep } from '@/components/PreflightStep'
import { CloningStep } from '@/components/CloningStep'
import { ResultStep } from '@/components/ResultStep'
import { getToken, clearToken, getFilters } from '@/lib/storage'
import { cloneTransactions } from '@/lib/cloner'
import type { Budget } from '@/lib/ynabApi'
import type { CloneResult, FilterPreferences, PreflightResult } from '@/lib/types'

type Step = 'token' | 'budgets' | 'filters' | 'preflight' | 'cloning' | 'result'

export default function App() {
  const savedToken = getToken() ?? ''

  const [step, setStep] = useState<Step>(savedToken ? 'budgets' : 'token')
  const [token, setTokenState] = useState(savedToken)
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [sourceBudgetId, setSourceBudgetId] = useState('')
  const [destBudgetId, setDestBudgetId] = useState('')
  const [filters, setFiltersState] = useState<FilterPreferences>(getFilters)
  const [dryRun, setDryRun] = useState(false)
  const [cloneProgress, setCloneProgress] = useState({ done: 0, total: 0 })
  const [cloneResult, setCloneResult] = useState<CloneResult | null>(null)

  // ── Token step ──────────────────────────────────────────────────────────────
  function handleTokenSuccess(t: string, b: Budget[]) {
    setTokenState(t)
    setBudgets(b)
    setStep('budgets')
  }

  // ── Budget step ─────────────────────────────────────────────────────────────
  function handleDisconnect() {
    clearToken()
    setTokenState('')
    setBudgets([])
    setSourceBudgetId('')
    setDestBudgetId('')
    setStep('token')
  }

  // ── Filters step ────────────────────────────────────────────────────────────
  function handleContinueToFilters() {
    setStep('filters')
  }

  // ── Preflight step ──────────────────────────────────────────────────────────
  function handleRunPreflight() {
    setStep('preflight')
  }

  // ── Clone ───────────────────────────────────────────────────────────────────
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
      // Shouldn't normally reach here since cloneTransactions catches per-batch errors,
      // but handle catastrophic failures gracefully
      const message = err instanceof Error ? err.message : String(err)
      setCloneResult({
        dryRun,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        copied: 0,
        skipped: 0,
        errors: 1,
        transactions: [{ sourceTransactionId: 'N/A', status: 'error', reason: message }],
      })
      setStep('result')
    }
  }

  // ── Start over ───────────────────────────────────────────────────────────────
  function handleStartOver() {
    setSourceBudgetId('')
    setDestBudgetId('')
    setFiltersState(getFilters())
    setDryRun(false)
    setCloneResult(null)
    setStep('budgets')
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  const sourceBudgetName = budgets.find((b) => b.id === sourceBudgetId)?.name ?? sourceBudgetId
  const destBudgetName = budgets.find((b) => b.id === destBudgetId)?.name ?? destBudgetId

  // If we have a saved token but budgets haven't been loaded yet (e.g. page refresh),
  // show the token step to re-authenticate instead of crashing.
  if (step === 'budgets' && budgets.length === 0) {
    return (
      <TokenStep
        initialToken={token}
        onSuccess={handleTokenSuccess}
      />
    )
  }

  switch (step) {
    case 'token':
      return <TokenStep initialToken={token} onSuccess={handleTokenSuccess} />

    case 'budgets':
      return (
        <BudgetStep
          budgets={budgets}
          sourceBudgetId={sourceBudgetId}
          destBudgetId={destBudgetId}
          onSourceChange={setSourceBudgetId}
          onDestChange={setDestBudgetId}
          onContinue={handleContinueToFilters}
          onDisconnect={handleDisconnect}
        />
      )

    case 'filters':
      return (
        <FiltersStep
          token={token}
          sourceBudgetId={sourceBudgetId}
          filters={filters}
          dryRun={dryRun}
          onFiltersChange={setFiltersState}
          onDryRunChange={setDryRun}
          onRunPreflight={handleRunPreflight}
          onBack={() => setStep('budgets')}
        />
      )

    case 'preflight':
      return (
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

    case 'cloning':
      return (
        <CloningStep
          done={cloneProgress.done}
          total={cloneProgress.total}
          dryRun={dryRun}
        />
      )

    case 'result':
      return (
        <ResultStep
          result={cloneResult!}
          sourceBudgetName={sourceBudgetName}
          destBudgetName={destBudgetName}
          onStartOver={handleStartOver}
        />
      )
  }
}

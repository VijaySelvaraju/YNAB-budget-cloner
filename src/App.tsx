import { useState } from 'react'
import { TokenStep } from '@/components/TokenStep'
import { BudgetStep } from '@/components/BudgetStep'
import { FiltersStep } from '@/components/FiltersStep'
import { PreflightStep } from '@/components/PreflightStep'
import { CloningStep } from '@/components/CloningStep'
import { ResultStep } from '@/components/ResultStep'
import { HowItWorksModal } from '@/components/HowItWorksModal'
import { FreshStartConfirmStep } from '@/components/FreshStartConfirmStep'
import { PrimaryBudgetStep } from '@/components/PrimaryBudgetStep'
import { getToken, clearToken, getFilters, getPrimaryBudgetId, setPrimaryBudgetId as savePrimaryBudgetId, clearPrimaryBudgetId } from '@/lib/storage'
import { cloneTransactions } from '@/lib/cloner'
import type { Budget } from '@/lib/ynabApi'
import type { CloneResult, FilterPreferences, PreflightResult } from '@/lib/types'

type Step = 'token' | 'primary_budget' | 'fresh_start_confirm' | 'budgets' | 'filters' | 'preflight' | 'cloning' | 'result'

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

  // ── Token step ──────────────────────────────────────────────────────────────
  function handleTokenSuccess(t: string, b: Budget[]) {
    setTokenState(t)
    setBudgets(b)
    if (!primaryBudgetId) {
      setStep('primary_budget')
    } else {
      setStep('fresh_start_confirm')
    }
  }

  // ── Primary Budget step ─────────────────────────────────────────────────────
  function handlePrimaryBudgetComplete(id: string) {
    savePrimaryBudgetId(id)
    setPrimaryBudgetIdState(id)
    setSourceBudgetId(id) // Pre-select for the source picker
    setStep('fresh_start_confirm')
  }

  // ── Budget step ─────────────────────────────────────────────────────────────
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
            onContinue={handleContinueToFilters}
            onDisconnect={handleDisconnect}
            onChangePrimary={() => setStep('primary_budget')}
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
            onBack={() => setStep('budgets')}
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

import { useRef, useState, useCallback } from 'react'
import { parseYnabCsvExport } from '@/lib/csvParser'
import type { CsvTransaction } from '@/lib/csvParser'

interface Props {
  onParsed: (transactions: CsvTransaction[], accounts: string[]) => void
  onBack: () => void
}

export function CsvUploadStep({ onParsed, onBack }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ transactions: CsvTransaction[]; accounts: string[]; parseErrors: string[] } | null>(null)

  const processFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a .csv file exported from YNAB.')
      return
    }
    setParsing(true)
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const result = parseYnabCsvExport(text)
        if (result.transactions.length === 0) {
          setError(result.parseErrors[0] ?? 'No transactions found in the file.')
          setParsing(false)
          return
        }
        setPreview(result)
        setParsing(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse CSV file.')
        setParsing(false)
      }
    }
    reader.onerror = () => {
      setError('Failed to read the file. Please try again.')
      setParsing(false)
    }
    reader.readAsText(file, 'utf-8')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = () => setDragging(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleContinue = () => {
    if (preview) onParsed(preview.transactions, preview.accounts)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 mb-4 shadow-lg shadow-violet-500/25">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Upload YNAB Export</h1>
          <p className="text-slate-400 text-sm">
            Export your budget via <span className="text-slate-300 font-medium">Account → ⋯ → Export → Register (CSV)</span>
          </p>
        </div>

        {/* Drop zone (only shown before parse) */}
        {!preview && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
              dragging
                ? 'border-violet-500 bg-violet-500/5'
                : 'border-slate-700 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/60'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            {parsing ? (
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <svg className="w-8 h-8 animate-spin text-violet-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm">Parsing transactions…</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${dragging ? 'bg-violet-500/20' : 'bg-slate-700/60'}`}>
                  <svg className={`w-7 h-7 transition-colors ${dragging ? 'text-violet-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium">Drop your CSV file here</p>
                  <p className="text-slate-500 text-sm mt-0.5">or click to browse</p>
                </div>
                <span className="text-xs text-slate-600 border border-slate-700 rounded-full px-3 py-1">Register.csv</span>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Parse result preview */}
        {preview && (
          <div className="mt-2 space-y-4">
            {/* Success banner */}
            <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-emerald-300 font-semibold text-sm">CSV parsed successfully</p>
                <p className="text-emerald-400/70 text-xs mt-0.5">
                  <span className="font-medium text-emerald-300">{preview.transactions.length.toLocaleString()}</span> transactions
                  across <span className="font-medium text-emerald-300">{preview.accounts.length}</span> accounts
                </p>
              </div>
            </div>

            {/* Accounts list */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/40 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-700 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Accounts found</span>
                <span className="text-xs text-slate-500">{preview.accounts.length}</span>
              </div>
              <div className="max-h-40 overflow-y-auto divide-y divide-slate-700/50">
                {preview.accounts.map(a => (
                  <div key={a} className="px-4 py-2 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                    <span className="text-sm text-slate-300">{a}</span>
                    <span className="ml-auto text-xs text-slate-600">
                      {preview.transactions.filter(t => t.account === a).length} txs
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Parse warnings if any */}
            {preview.parseErrors.length > 0 && (
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs space-y-1">
                <p className="font-semibold">{preview.parseErrors.length} rows skipped due to parse errors:</p>
                {preview.parseErrors.slice(0, 3).map((e, i) => <p key={i} className="text-amber-400/70">• {e}</p>)}
                {preview.parseErrors.length > 3 && <p className="text-amber-400/50">…and {preview.parseErrors.length - 3} more</p>}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setPreview(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-300 hover:border-slate-600 transition-colors text-sm font-medium"
              >
                Upload different file
              </button>
              <button
                onClick={handleContinue}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 text-white font-semibold text-sm hover:from-violet-500 hover:to-violet-400 transition-all shadow-lg shadow-violet-500/25"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Back link */}
        {!preview && (
          <button
            onClick={onBack}
            className="mt-6 w-full text-center text-sm text-slate-600 hover:text-slate-400 transition-colors"
          >
            ← Back to source selection
          </button>
        )}
      </div>
    </div>
  )
}

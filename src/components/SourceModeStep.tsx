import { useState } from 'react'
import type { SourceMode } from '@/lib/types'

interface Props {
  onSelect: (mode: SourceMode) => void
}

export function SourceModeStep({ onSelect }: Props) {
  const [hovered, setHovered] = useState<SourceMode | null>(null)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 mb-5 shadow-lg shadow-blue-500/25">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Choose your source</h1>
          <p className="text-slate-400 text-base max-w-md mx-auto">
            Where should we read your transactions from? Both paths write to your sandbox budget.
          </p>
        </div>

        {/* Option cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Live API */}
          <button
            onClick={() => onSelect('api')}
            onMouseEnter={() => setHovered('api')}
            onMouseLeave={() => setHovered(null)}
            className={`relative group flex flex-col items-start gap-4 p-6 rounded-2xl border text-left transition-all duration-200 cursor-pointer
              ${hovered === 'api'
                ? 'border-blue-500 bg-slate-800/80 shadow-lg shadow-blue-500/10'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'}`}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 group-hover:border-blue-500/60 transition-colors">
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Live API</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Fetch directly from your YNAB account in real time. Up to 5 years of history.
              </p>
            </div>
            <div className="mt-auto flex items-center gap-1.5 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Recommended for recent data
              </span>
            </div>
          </button>

          {/* CSV Upload */}
          <button
            onClick={() => onSelect('csv')}
            onMouseEnter={() => setHovered('csv')}
            onMouseLeave={() => setHovered(null)}
            className={`relative group flex flex-col items-start gap-4 p-6 rounded-2xl border text-left transition-all duration-200 cursor-pointer
              ${hovered === 'csv'
                ? 'border-violet-500 bg-slate-800/80 shadow-lg shadow-violet-500/10'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'}`}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/30 group-hover:border-violet-500/60 transition-colors">
              <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Upload CSV Export</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Upload a Register CSV exported from YNAB. Contains your <strong className="text-slate-300">full history</strong> — no date limits.
              </p>
            </div>
            <div className="mt-auto flex items-center gap-1.5 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                Best for full history
              </span>
            </div>
          </button>
        </div>

        {/* Helper text */}
        <p className="text-center text-xs text-slate-600 mt-6">
          To export: open YNAB → click any account → <span className="text-slate-500">⋯ More options → Export → Register (CSV)</span>
        </p>
      </div>
    </div>
  )
}

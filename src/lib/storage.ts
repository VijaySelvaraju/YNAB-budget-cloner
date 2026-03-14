import { subDays, format } from 'date-fns'
import type { FilterPreferences } from './types'

const KEYS = {
  TOKEN: 'ynab_token',
  FILTERS: 'ynab_cloner_filters',
} as const

// ─── Token ────────────────────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem(KEYS.TOKEN)
}

export function setToken(token: string): void {
  localStorage.setItem(KEYS.TOKEN, token)
}

export function clearToken(): void {
  localStorage.removeItem(KEYS.TOKEN)
}

// ─── Filter preferences ───────────────────────────────────────────────────────

function defaultFilters(): FilterPreferences {
  const today = new Date()
  return {
    startDate: format(subDays(today, 90), 'yyyy-MM-dd'),
    endDate: format(today, 'yyyy-MM-dd'),
    selectedAccountIds: null,
  }
}

export function getFilters(): FilterPreferences {
  try {
    const raw = localStorage.getItem(KEYS.FILTERS)
    if (!raw) return defaultFilters()
    return { ...defaultFilters(), ...JSON.parse(raw) }
  } catch {
    return defaultFilters()
  }
}

export function setFilters(filters: Partial<FilterPreferences>): void {
  const current = getFilters()
  localStorage.setItem(KEYS.FILTERS, JSON.stringify({ ...current, ...filters }))
}

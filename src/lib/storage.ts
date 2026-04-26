import type { AppState, Trip } from './types'

const KEY = 'tourapp'

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as AppState
  } catch {}
  return { trips: [], activeTrip: '' }
}

export function saveState(state: AppState): void {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function activeTrip(state: AppState): Trip | undefined {
  return state.trips.find(t => t.id === state.activeTrip)
}

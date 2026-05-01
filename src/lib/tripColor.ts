import type { Trip } from './types'

const FALLBACK_PALETTE = [
  '#1D9E75',
  '#E54D2E',
  '#3E63DD',
  '#F76B15',
  '#8E4EC6',
  '#D6409F'
]

export const DEFAULT_TRIP_COLOR = FALLBACK_PALETTE[0]

export function getTripColor(trip: Trip, fallbackIdx = 0): string {
  if (trip.color) return trip.color
  return FALLBACK_PALETTE[fallbackIdx % FALLBACK_PALETTE.length]
}

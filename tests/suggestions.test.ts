import { describe, it, expect } from 'vitest'
import { computeSuggestions } from '../src/lib/suggestions'
import type { Trip } from '../src/lib/types'

const makeTrip = (): Trip => ({
  id: 't1', name: 'Test', visited: [],
  zones: [{
    id: 'z1', name: 'Zone A', color: '#111',
    stops: [
      { id: 's1', name: 'Close Stop', lat: 40.73, lng: -73.99, desc: '', tags: [], hours: null, estimatedMinutes: 60, connectorToNext: null, edges: ['s2'], branches: [] },
      { id: 's2', name: 'Far Stop', lat: 40.80, lng: -73.95, desc: '', tags: [], hours: null, estimatedMinutes: 30, connectorToNext: null, edges: [], branches: [] },
      { id: 's3', name: 'Closed Tonight', lat: 40.73, lng: -73.98, desc: '', tags: [], hours: { open: '22:00', close: '02:00', days: [0,1,2,3,4,5,6] }, estimatedMinutes: 30, connectorToNext: null, edges: [], branches: [] }
    ]
  }]
})

describe('computeSuggestions', () => {
  it('excludes visited stops', () => {
    const trip = makeTrip()
    trip.visited = ['s1']
    const results = computeSuggestions(trip, 40.73, -73.99)
    expect(results.find(r => r.stop.id === 's1')).toBeUndefined()
  })

  it('respects limit', () => {
    const trip = makeTrip()
    expect(computeSuggestions(trip, 40.73, -73.99, 2)).toHaveLength(2)
  })

  it('returns distance and walkMinutes', () => {
    const trip = makeTrip()
    const results = computeSuggestions(trip, 40.73, -73.99, 1)
    expect(results[0].distanceKm).toBeGreaterThanOrEqual(0)
    expect(results[0].walkMinutes).toBeGreaterThanOrEqual(0)
  })

  it('open stops come before closed stops', () => {
    const trip = makeTrip()
    const results = computeSuggestions(trip, 40.73, -73.99, 3)
    const openResults = results.filter(r => r.openNow)
    const closedResults = results.filter(r => !r.openNow)
    if (openResults.length > 0 && closedResults.length > 0) {
      const firstClosedIdx = results.findIndex(r => !r.openNow)
      const lastOpenIdx = results.map(r => r.openNow).lastIndexOf(true)
      expect(lastOpenIdx).toBeLessThan(firstClosedIdx)
    }
  })
})

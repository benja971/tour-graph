import { describe, it, expect, beforeEach } from 'vitest'
import { loadState, saveState } from '../src/lib/storage'
import type { Trip } from '../src/lib/types'

beforeEach(() => {
  localStorage.clear()
})

describe('loadState', () => {
  it('returns empty state when localStorage is empty', () => {
    expect(loadState()).toEqual({ trips: [], activeTrip: '' })
  })

  it('returns parsed state from localStorage', () => {
    const persisted = {
      trips: [{ id: 't1', name: 'A', color: '#aaa', visited: [], zones: [] }],
      activeTrip: 't1'
    }
    localStorage.setItem('tourapp', JSON.stringify(persisted))
    expect(loadState()).toEqual(persisted)
  })

  it('returns empty state on corrupted JSON', () => {
    localStorage.setItem('tourapp', '{not-json')
    expect(loadState()).toEqual({ trips: [], activeTrip: '' })
  })
})

describe('saveState / loadState round-trip', () => {
  it('preserves nested zones, stops, hours, edges, branches, visited', () => {
    const trip: Trip = {
      id: 't1',
      name: 'A',
      color: '#abcdef',
      visited: ['s1'],
      zones: [
        {
          id: 'z1',
          name: 'Z',
          color: '#zz0000',
          stops: [
            {
              id: 's1',
              name: 'S',
              lat: 1.5,
              lng: 2.5,
              desc: 'd',
              tags: ['t'],
              hours: { open: '09:00', close: '18:00', days: [1, 2, 3] },
              estimatedMinutes: 60,
              connectorToNext: 'walk',
              edges: ['s2'],
              branches: [{ label: 'B', stopIds: ['s3'] }]
            }
          ]
        }
      ]
    }
    saveState({ trips: [trip], activeTrip: 't1' })
    expect(loadState()).toEqual({ trips: [trip], activeTrip: 't1' })
  })
})

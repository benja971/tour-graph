import { describe, it, expect, beforeEach } from 'vitest'
import {
  state,
  createTrip,
  renameTrip,
  duplicateTrip,
  deleteTrip,
  resetActiveTrip,
  setActiveTrip
} from '../src/stores/app.svelte'

beforeEach(() => {
  state.trips = []
  state.activeTrip = ''
  localStorage.clear()
})

describe('createTrip', () => {
  it('creates a trip with the given name and color, empty visited and zones', () => {
    const trip = createTrip('NYC', '#ff0000')
    expect(trip.id).toBeTruthy()
    expect(trip.name).toBe('NYC')
    expect(trip.color).toBe('#ff0000')
    expect(trip.visited).toEqual([])
    expect(trip.zones).toEqual([])
  })

  it('pushes the trip to state.trips', () => {
    const trip = createTrip('NYC', '#ff0000')
    expect(state.trips).toHaveLength(1)
    expect(state.trips[0].id).toBe(trip.id)
  })

  it('sets the new trip as active', () => {
    const trip = createTrip('NYC', '#ff0000')
    expect(state.activeTrip).toBe(trip.id)
  })

  it('persists to localStorage', () => {
    createTrip('NYC', '#ff0000')
    const raw = localStorage.getItem('tourapp')
    expect(raw).toBeTruthy()
    const data = JSON.parse(raw!)
    expect(data.trips).toHaveLength(1)
    expect(data.trips[0].name).toBe('NYC')
    expect(data.trips[0].color).toBe('#ff0000')
  })

  it('generates different ids for trips with the same name', () => {
    const t1 = createTrip('NYC', '#ffffff')
    const t2 = createTrip('NYC', '#ffffff')
    expect(t1.id).not.toBe(t2.id)
  })
})

describe('renameTrip', () => {
  it('updates name and color', () => {
    const trip = createTrip('Old', '#aaaaaa')
    renameTrip(trip.id, 'New', '#bbbbbb')
    expect(state.trips[0].name).toBe('New')
    expect(state.trips[0].color).toBe('#bbbbbb')
  })

  it('is a no-op for unknown id', () => {
    createTrip('NYC', '#aaaaaa')
    renameTrip('bogus-id', 'Oops', '#ffffff')
    expect(state.trips[0].name).toBe('NYC')
    expect(state.trips[0].color).toBe('#aaaaaa')
  })

  it('persists changes', () => {
    const trip = createTrip('Old', '#aaaaaa')
    renameTrip(trip.id, 'New', '#bbbbbb')
    const data = JSON.parse(localStorage.getItem('tourapp')!)
    expect(data.trips[0].name).toBe('New')
  })
})

describe('duplicateTrip', () => {
  it('returns a new trip with a different id', () => {
    const original = createTrip('NYC', '#aaaaaa')
    const dup = duplicateTrip(original.id)
    expect(dup).not.toBeNull()
    expect(dup!.id).not.toBe(original.id)
  })

  it('deep-clones zones — mutating the clone does not affect the original', () => {
    const original = createTrip('NYC', '#aaaaaa')
    state.trips[0].zones.push({
      id: 'z1', name: 'Z1', color: '#111111',
      stops: [
        {
          id: 's1', name: 'S1', lat: 0, lng: 0, desc: '', tags: [],
          hours: null, estimatedMinutes: 60, connectorToNext: null,
          edges: ['s2'], branches: []
        }
      ]
    })
    const dup = duplicateTrip(original.id)
    expect(dup).not.toBeNull()
    dup!.zones[0].stops[0].name = 'Modified'
    const originalAfter = state.trips.find(t => t.id === original.id)!
    expect(originalAfter.zones[0].stops[0].name).toBe('S1')
  })

  it('resets visited to empty even if original had visited stops', () => {
    const original = createTrip('NYC', '#aaaaaa')
    state.trips[0].visited.push('s1', 's2')
    const dup = duplicateTrip(original.id)
    expect(dup!.visited).toEqual([])
  })

  it('appends " (copie)" to the name', () => {
    const original = createTrip('NYC', '#aaaaaa')
    const dup = duplicateTrip(original.id)
    expect(dup!.name).toBe('NYC (copie)')
  })

  it('copies the color', () => {
    const original = createTrip('NYC', '#abc123')
    const dup = duplicateTrip(original.id)
    expect(dup!.color).toBe('#abc123')
  })

  it('sets the duplicate as active', () => {
    const original = createTrip('NYC', '#aaaaaa')
    const dup = duplicateTrip(original.id)
    expect(state.activeTrip).toBe(dup!.id)
  })

  it('returns null for unknown id and does not mutate state', () => {
    createTrip('NYC', '#aaaaaa')
    const before = state.trips.length
    const dup = duplicateTrip('bogus-id')
    expect(dup).toBeNull()
    expect(state.trips.length).toBe(before)
  })
})

describe('deleteTrip', () => {
  it('removes the trip from state.trips', () => {
    const t1 = createTrip('A', '#aaa111')
    const t2 = createTrip('B', '#bbb222')
    deleteTrip(t1.id)
    expect(state.trips.map(t => t.id)).toEqual([t2.id])
  })

  it('if active trip is deleted and others remain, first trip becomes active', () => {
    const t1 = createTrip('A', '#aaa111')
    const t2 = createTrip('B', '#bbb222')
    setActiveTrip(t2.id)
    deleteTrip(t2.id)
    expect(state.activeTrip).toBe(t1.id)
  })

  it('if last trip is deleted, activeTrip becomes empty string', () => {
    const t1 = createTrip('A', '#aaa111')
    deleteTrip(t1.id)
    expect(state.trips).toEqual([])
    expect(state.activeTrip).toBe('')
  })

  it('non-active deletion leaves activeTrip unchanged', () => {
    const t1 = createTrip('A', '#aaa111')
    const t2 = createTrip('B', '#bbb222')
    setActiveTrip(t1.id)
    deleteTrip(t2.id)
    expect(state.activeTrip).toBe(t1.id)
  })

  it('persists', () => {
    const t1 = createTrip('A', '#aaa111')
    deleteTrip(t1.id)
    const data = JSON.parse(localStorage.getItem('tourapp')!)
    expect(data.trips).toEqual([])
    expect(data.activeTrip).toBe('')
  })
})

describe('resetActiveTrip', () => {
  it('clears visited[] of the active trip', () => {
    createTrip('NYC', '#aaaaaa')
    state.trips[0].visited.push('s1', 's2')
    resetActiveTrip()
    expect(state.trips[0].visited).toEqual([])
  })

  it('does not touch zones', () => {
    createTrip('NYC', '#aaaaaa')
    state.trips[0].zones.push({ id: 'z1', name: 'Z', color: '#ffffff', stops: [] })
    resetActiveTrip()
    expect(state.trips[0].zones).toHaveLength(1)
  })

  it('is a no-op if there is no active trip', () => {
    expect(() => resetActiveTrip()).not.toThrow()
    expect(state.trips).toEqual([])
  })

  it('persists', () => {
    createTrip('NYC', '#aaaaaa')
    state.trips[0].visited.push('s1')
    resetActiveTrip()
    const data = JSON.parse(localStorage.getItem('tourapp')!)
    expect(data.trips[0].visited).toEqual([])
  })
})

describe('setActiveTrip', () => {
  it('updates activeTrip', () => {
    const t1 = createTrip('A', '#aaa111')
    const t2 = createTrip('B', '#bbb222')
    setActiveTrip(t1.id)
    expect(state.activeTrip).toBe(t1.id)
  })

  it('persists', () => {
    const t1 = createTrip('A', '#aaa111')
    createTrip('B', '#bbb222')
    setActiveTrip(t1.id)
    const data = JSON.parse(localStorage.getItem('tourapp')!)
    expect(data.activeTrip).toBe(t1.id)
  })
})

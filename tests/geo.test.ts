import { describe, it, expect } from 'vitest'
import { haversineKm, walkMinutes, navigateUrl } from '../src/lib/geo'

describe('haversineKm', () => {
  it('returns 0 for same coordinates', () => {
    expect(haversineKm(40.73, -73.99, 40.73, -73.99)).toBe(0)
  })
  it('returns a small distance between two close NYC points', () => {
    const d = haversineKm(40.7308, -74.0002, 40.7292, -74.0020)
    expect(d).toBeGreaterThan(0.1)
    expect(d).toBeLessThan(2)
  })
  it('is symmetric', () => {
    const a = haversineKm(40.73, -73.99, 40.75, -73.97)
    const b = haversineKm(40.75, -73.97, 40.73, -73.99)
    expect(a).toBeCloseTo(b, 5)
  })
})

describe('walkMinutes', () => {
  it('returns 12 for 1 km (5 km/h)', () => {
    expect(walkMinutes(1)).toBe(12)
  })
  it('rounds up', () => {
    expect(walkMinutes(0.1)).toBe(2)
  })
})

describe('navigateUrl', () => {
  it('returns OpenStreetMap URL in test environment', () => {
    const url = navigateUrl(40.73, -73.99)
    expect(url).toContain('openstreetmap.org')
    expect(url).toContain('40.73')
    expect(url).toContain('-73.99')
  })
})

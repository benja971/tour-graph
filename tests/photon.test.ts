import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { searchPlaces, PhotonError } from '../src/lib/photon'

const fakeFetch = vi.fn()
const originalFetch = globalThis.fetch

beforeEach(() => {
  fakeFetch.mockReset()
  globalThis.fetch = fakeFetch as unknown as typeof globalThis.fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

function mockResponse(body: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json' }
  })
}

describe('searchPlaces — parsing', () => {
  it('returns parsed PhotonResult with lat/lng inverted from GeoJSON [lon,lat]', async () => {
    fakeFetch.mockResolvedValue(mockResponse({
      features: [{
        geometry: { type: 'Point', coordinates: [-73.9934, 40.7505] },
        properties: { name: 'Madison Square Garden', city: 'New York', state: 'New York', country: 'United States', countrycode: 'US' }
      }]
    }))
    const out = await searchPlaces('msg')
    expect(out).toHaveLength(1)
    expect(out[0].lat).toBe(40.7505)
    expect(out[0].lng).toBe(-73.9934)
    expect(out[0].shortName).toBe('Madison Square Garden')
    expect(out[0].name).toBe('Madison Square Garden, New York, United States')
  })

  it('builds label with city when state is absent', async () => {
    fakeFetch.mockResolvedValue(mockResponse({
      features: [{
        geometry: { type: 'Point', coordinates: [2.3, 48.85] },
        properties: { name: 'Eiffel Tower', city: 'Paris', country: 'France' }
      }]
    }))
    const [r] = await searchPlaces('eiffel')
    expect(r.name).toBe('Eiffel Tower, Paris, France')
  })

  it('falls back to street when name is missing', async () => {
    fakeFetch.mockResolvedValue(mockResponse({
      features: [{
        geometry: { type: 'Point', coordinates: [-73.99, 40.75] },
        properties: { street: '5th Avenue', city: 'New York', country: 'United States' }
      }]
    }))
    const [r] = await searchPlaces('5th ave')
    expect(r.shortName).toBe('5th Avenue')
    expect(r.name).toBe('5th Avenue, New York, United States')
  })

  it('falls back to country alone when name and street are missing', async () => {
    fakeFetch.mockResolvedValue(mockResponse({
      features: [{
        geometry: { type: 'Point', coordinates: [10.0, 50.0] },
        properties: { country: 'Germany' }
      }]
    }))
    const [r] = await searchPlaces('xyz')
    expect(r.name).toBe('Germany')
  })

  it('returns empty array when response has no features', async () => {
    fakeFetch.mockResolvedValue(mockResponse({ features: [] }))
    const out = await searchPlaces('zzz')
    expect(out).toEqual([])
  })
})

describe('searchPlaces — query building', () => {
  it('passes the query in q= and limits to 5 by default', async () => {
    fakeFetch.mockResolvedValue(mockResponse({ features: [] }))
    await searchPlaces('madison')
    const url = new URL(fakeFetch.mock.calls[0][0] as string)
    expect(url.origin + url.pathname).toBe('https://photon.komoot.io/api')
    expect(url.searchParams.get('q')).toBe('madison')
    expect(url.searchParams.get('limit')).toBe('5')
  })

  it('respects custom limit', async () => {
    fakeFetch.mockResolvedValue(mockResponse({ features: [] }))
    await searchPlaces('foo', { limit: 10 })
    const url = new URL(fakeFetch.mock.calls[0][0] as string)
    expect(url.searchParams.get('limit')).toBe('10')
  })

  it('appends bias lat/lon when provided', async () => {
    fakeFetch.mockResolvedValue(mockResponse({ features: [] }))
    await searchPlaces('cafe', { biasLat: 40.7, biasLng: -74 })
    const url = new URL(fakeFetch.mock.calls[0][0] as string)
    expect(url.searchParams.get('lat')).toBe('40.7')
    expect(url.searchParams.get('lon')).toBe('-74')
  })

  it('omits lat/lon when bias is missing', async () => {
    fakeFetch.mockResolvedValue(mockResponse({ features: [] }))
    await searchPlaces('cafe')
    const url = new URL(fakeFetch.mock.calls[0][0] as string)
    expect(url.searchParams.has('lat')).toBe(false)
    expect(url.searchParams.has('lon')).toBe(false)
  })
})

describe('searchPlaces — errors', () => {
  it('throws PhotonError on HTTP 500', async () => {
    fakeFetch.mockResolvedValue(mockResponse({}, { status: 500 }))
    await expect(searchPlaces('x')).rejects.toBeInstanceOf(PhotonError)
  })

  it('throws PhotonError on HTTP 4xx', async () => {
    fakeFetch.mockResolvedValue(mockResponse({}, { status: 429 }))
    await expect(searchPlaces('x')).rejects.toBeInstanceOf(PhotonError)
  })

  it('throws PhotonError on network failure', async () => {
    fakeFetch.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(searchPlaces('x')).rejects.toBeInstanceOf(PhotonError)
  })

  it('propagates AbortError without wrapping', async () => {
    const ac = new AbortController()
    fakeFetch.mockImplementation(() => {
      ac.abort()
      const err = new DOMException('aborted', 'AbortError')
      return Promise.reject(err)
    })
    await expect(searchPlaces('x', { signal: ac.signal })).rejects.toMatchObject({ name: 'AbortError' })
  })
})

export type PhotonResult = {
  lat: number
  lng: number
  name: string         // long label "Madison Square Garden, New York, United States"
  shortName: string    // "Madison Square Garden" (or street fallback) — used to auto-fill Stop.name
}

export class PhotonError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'PhotonError'
  }
}

const ENDPOINT = 'https://photon.komoot.io/api'

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] }
  properties?: {
    name?: string
    street?: string
    city?: string
    state?: string
    country?: string
  }
}

function buildShortName(p: NonNullable<PhotonFeature['properties']>): string {
  return p.name?.trim() || p.street?.trim() || p.country?.trim() || 'Sans nom'
}

function buildLabel(p: NonNullable<PhotonFeature['properties']>): string {
  const head = buildShortName(p)
  const region = p.city?.trim() || p.state?.trim()
  const parts = [head, region, p.country?.trim()].filter((s): s is string => !!s && s !== head)
  if (parts.length === 0) return head
  if (head === p.country?.trim()) return head
  return [head, ...parts].join(', ')
}

export async function searchPlaces(
  query: string,
  opts: { biasLat?: number; biasLng?: number; limit?: number; signal?: AbortSignal } = {}
): Promise<PhotonResult[]> {
  const url = new URL(ENDPOINT)
  url.searchParams.set('q', query)
  url.searchParams.set('limit', String(opts.limit ?? 5))
  if (opts.biasLat != null && opts.biasLng != null) {
    url.searchParams.set('lat', String(opts.biasLat))
    url.searchParams.set('lon', String(opts.biasLng))
  }

  let res: Response
  try {
    res = await fetch(url.toString(), { signal: opts.signal })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'AbortError') throw err
    throw new PhotonError('Network error', err)
  }

  if (!res.ok) {
    throw new PhotonError(`HTTP ${res.status}`)
  }

  let payload: { features?: PhotonFeature[] }
  try {
    payload = await res.json()
  } catch (err) {
    throw new PhotonError('Invalid JSON response', err)
  }

  const features = payload.features ?? []
  const results: PhotonResult[] = []
  for (const f of features) {
    const coords = f.geometry?.coordinates
    const props = f.properties
    if (!coords || coords.length !== 2 || !props) continue
    const [lon, lat] = coords
    if (typeof lon !== 'number' || typeof lat !== 'number') continue
    results.push({
      lat,
      lng: lon,
      shortName: buildShortName(props),
      name: buildLabel(props)
    })
  }
  return results
}

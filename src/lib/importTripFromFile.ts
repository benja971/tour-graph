import type { Trip } from './types'
import { DEFAULT_TRIP_COLOR } from './tripColor'

export class ImportTripError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportTripError'
  }
}

export function parseTripJson(raw: string): Trip {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    throw new ImportTripError('Impossible de lire le fichier JSON')
  }
  if (!data || typeof data !== 'object') {
    throw new ImportTripError('JSON invalide — racine non-objet')
  }
  const obj = data as Record<string, unknown>
  if (typeof obj.id !== 'string' || !Array.isArray(obj.zones)) {
    throw new ImportTripError('JSON invalide — il manque "id" ou "zones"')
  }
  const trip: Trip = {
    id: obj.id,
    name: typeof obj.name === 'string' ? obj.name : obj.id,
    color: typeof obj.color === 'string' ? obj.color : DEFAULT_TRIP_COLOR,
    visited: Array.isArray(obj.visited) ? obj.visited.filter((v): v is string => typeof v === 'string') : [],
    zones: obj.zones as Trip['zones']
  }
  return trip
}

export function importTripFromFile(file: File): Promise<Trip> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        resolve(parseTripJson(ev.target!.result as string))
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new ImportTripError('Impossible de lire le fichier'))
    reader.readAsText(file)
  })
}

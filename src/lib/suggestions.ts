import type { Trip, Stop, Suggestion } from './types'
import { haversineKm, walkMinutes } from './geo'

function zoneOf(trip: Trip, stopId: string): string | null {
  for (const zone of trip.zones) {
    if (zone.stops.some(s => s.id === stopId)) return zone.id
  }
  return null
}

function isOpenToday(stop: Stop): boolean {
  if (!stop.hours) return true
  const day = new Date().getDay()
  return stop.hours.days.includes(day)
}

function isOpenNow(stop: Stop): boolean {
  if (!stop.hours) return true
  const now = new Date()
  const current = now.getHours() * 60 + now.getMinutes()
  const [oh, om] = stop.hours.open.split(':').map(Number)
  const [ch, cm] = stop.hours.close.split(':').map(Number)
  const openMin = oh * 60 + om
  const closeMin = ch * 60 + cm
  if (closeMin < openMin) return current >= openMin || current <= closeMin
  return current >= openMin && current <= closeMin
}

export function computeSuggestions(
  trip: Trip,
  userLat: number,
  userLng: number,
  limit = 3
): Suggestion[] {
  const lastVisitedId = trip.visited.at(-1)
  const lastZone = lastVisitedId ? zoneOf(trip, lastVisitedId) : null
  const lastStop = lastVisitedId
    ? trip.zones.flatMap(z => z.stops).find(s => s.id === lastVisitedId) ?? null
    : null

  type Scored = Suggestion & { score: number }
  const open: Scored[] = []
  const closed: Scored[] = []

  for (const zone of trip.zones) {
    for (const stop of zone.stops) {
      if (trip.visited.includes(stop.id)) continue
      if (!isOpenToday(stop)) continue

      const distanceKm = haversineKm(userLat, userLng, stop.lat, stop.lng)
      const openNow = isOpenNow(stop)

      let score = 1 / (distanceKm + 0.01)
      if (lastStop?.edges.includes(stop.id)) score *= 1.2
      if (lastZone && zoneOf(trip, stop.id) === lastZone) score *= 1.1

      const suggestion: Scored = {
        stop, zoneId: zone.id, zoneName: zone.name, zoneColor: zone.color,
        distanceKm, walkMinutes: walkMinutes(distanceKm), openNow, score
      }
      if (openNow) open.push(suggestion)
      else closed.push(suggestion)
    }
  }

  open.sort((a, b) => b.score - a.score)
  closed.sort((a, b) => b.score - a.score)

  return [...open, ...closed].slice(0, limit).map(({ score, ...s }) => s)
}

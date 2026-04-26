import type { AppState, Trip, Zone, Stop } from '../lib/types'
import { loadState, saveState } from '../lib/storage'
import nycData from '../data/nyc.json'

function buildInitialState(): AppState {
  const saved = loadState()
  if (saved.trips.length > 0) return saved
  const trip = nycData as unknown as Trip
  return { trips: [trip], activeTrip: trip.id }
}

export const state = $state<AppState>(buildInitialState())

export function activeTripStore(): Trip | undefined {
  return state.trips.find(t => t.id === state.activeTrip)
}

export function markVisited(stopId: string): void {
  const trip = activeTripStore()
  if (!trip || trip.visited.includes(stopId)) return
  trip.visited.push(stopId)
  saveState(state)
}

export function unmarkVisited(stopId: string): void {
  const trip = activeTripStore()
  if (!trip) return
  const idx = trip.visited.indexOf(stopId)
  if (idx !== -1) trip.visited.splice(idx, 1)
  saveState(state)
}

export function upsertZone(tripId: string, zone: Zone): void {
  const trip = state.trips.find(t => t.id === tripId)
  if (!trip) return
  const idx = trip.zones.findIndex(z => z.id === zone.id)
  if (idx >= 0) trip.zones[idx] = zone
  else trip.zones.push(zone)
  saveState(state)
}

export function deleteZone(tripId: string, zoneId: string): void {
  const trip = state.trips.find(t => t.id === tripId)
  if (!trip) return
  trip.zones = trip.zones.filter(z => z.id !== zoneId)
  saveState(state)
}

export function upsertStop(tripId: string, zoneId: string, stop: Stop): void {
  const trip = state.trips.find(t => t.id === tripId)
  const zone = trip?.zones.find(z => z.id === zoneId)
  if (!zone) return
  const idx = zone.stops.findIndex(s => s.id === stop.id)
  if (idx >= 0) zone.stops[idx] = stop
  else zone.stops.push(stop)
  saveState(state)
}

export function deleteStop(tripId: string, zoneId: string, stopId: string): void {
  const trip = state.trips.find(t => t.id === tripId)
  const zone = trip?.zones.find(z => z.id === zoneId)
  if (!zone) return
  zone.stops = zone.stops.filter(s => s.id !== stopId)
  saveState(state)
}

export function importTrip(trip: Trip): void {
  const idx = state.trips.findIndex(t => t.id === trip.id)
  if (idx >= 0) state.trips[idx] = trip
  else state.trips.push(trip)
  state.activeTrip = trip.id
  saveState(state)
}

export function setActiveTrip(tripId: string): void {
  state.activeTrip = tripId
  saveState(state)
}

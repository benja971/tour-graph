// src/lib/types.ts

export interface AppState {
  trips: Trip[]
  activeTrip: string
}

export interface Trip {
  id: string
  name: string
  visited: string[]       // stop ids visited in THIS trip
  zones: Zone[]
}

export interface Zone {
  id: string
  name: string
  color: string           // hex color for markers and UI
  stops: Stop[]           // ordered array — stops[0] is graph root
}

export interface Stop {
  id: string
  name: string
  lat: number
  lng: number
  desc: string
  tags: string[]          // "free" | "food" | "night" | "sport" | "tip"
  hours: Hours | null     // null = always open
  estimatedMinutes: number
  connectorToNext: string | null  // text shown between this stop and the next in graph view
  edges: string[]         // ids of stops reachable from here (cross-zone allowed)
  branches: Branch[]
}

export interface Hours {
  open: string            // "HH:MM"
  close: string           // "HH:MM"
  days: number[]          // 0=Sun...6=Sat, [0,1,2,3,4,5,6] = every day
}

export interface Branch {
  label: string
  stopIds: string[]       // ids of existing stops in zone.stops[] shown as forks in graph view
}

export interface Suggestion {
  stop: Stop
  zoneId: string
  zoneName: string
  zoneColor: string
  distanceKm: number
  walkMinutes: number
  openNow: boolean
}

// scripts/geocode-stops.mjs
// One-shot geocoder. Fills lat/lng for every stop in src/data/nyc.json
// using Nominatim (OpenStreetMap). Run with: node scripts/geocode-stops.mjs

import { readFileSync, writeFileSync } from 'node:fs'

const FILE = new URL('../src/data/nyc.json', import.meta.url)
const UA = 'TourGraph-dev (nddm.benjamin@gmail.com)'
const SLEEP_MS = 1100

const QUERIES = {
  // Brooklyn Sud
  'smorgasburg':              'Smorgasburg, Williamsburg, Brooklyn',
  'williamsburg-bedford':     'Bedford Avenue and N 7th Street, Williamsburg, Brooklyn',
  'bushwick-collective':      'Troutman Street and Saint Nicholas Avenue, Bushwick, Brooklyn',
  'prospect-park':            'Prospect Park, Brooklyn',
  'coney-island':             "Nathan's Famous, Coney Island, Brooklyn",
  // Lower Manhattan + DUMBO
  'dumbo-washington':         'Washington Street and Water Street, DUMBO, Brooklyn',
  'brooklyn-bridge':          'Brooklyn Bridge, New York',
  'oculus':                   'Oculus, World Trade Center, New York',
  'ghostbusters-firehouse':   '14 North Moore Street, New York',
  'chinatown-nomwah':         'Nom Wah Tea Parlor, 13 Doyers Street, New York',
  'nolita':                   'Mulberry Street and Spring Street, Nolita, New York',
  'les-essex':                'Essex Market, New York',
  'pdt-speakeasy':            '113 St Marks Place, New York',
  // Greenwich Village + Soho
  'washington-square':        'Washington Square Park, New York',
  'friends-apartment':        '90 Bedford Street, New York',
  'phoebe-apartment':         '5 Morton Street, New York',
  'bleecker-macdougal':       'Bleecker Street and MacDougal Street, New York',
  'village-vanguard':         'Village Vanguard, 178 Seventh Avenue South, New York',
  'blue-note':                '131 West 3rd Street, New York',
  'soho-spring':              'Spring Street and Mercer Street, Soho, New York',
  'dead-rabbit':              '30 Water Street, New York',
  // Midtown
  'grand-central':            'Grand Central Terminal, New York',
  'bryant-park':              'Bryant Park, New York',
  'moma':                     'Museum of Modern Art, 11 West 53rd Street, New York',
  'koreatown':                '32nd Street and Broadway, New York',
  'empire-state':             'Empire State Building, New York',
  'msg-knicks':               'Madison Square Garden, New York',
  // Upper Manhattan
  'lincoln-center':           'Lincoln Center for the Performing Arts, New York',
  'empire-hotel-chuck':       'Empire Hotel, 44 West 63rd Street, New York',
  'met-steps':                'Metropolitan Museum of Art, 1000 Fifth Avenue, New York',
  'nate-townhouse':           '4 East 74th Street, New York',
  'blair-penthouse':          '1136 Fifth Avenue, New York',
  'bethesda-fountain':        'Bethesda Fountain New York',
  'central-park-ramble':      'Belvedere Castle, Central Park, New York',
  'harlem-apollo':            'Apollo Theater, 253 West 125th Street, New York',
  'roosevelt-island-tram':    'Roosevelt Island Tramway, 59th Street, New York',
  // Queens
  'flushing-chinatown':       'Main Street, Flushing, Queens',
  'jackson-heights':          '74th Street and Roosevelt Avenue, Jackson Heights, Queens',
  'astoria':                  '31st Street, Astoria, Queens',
  // Bronx
  'arthur-avenue':            'Arthur Avenue Retail Market, Bronx',
  'grand-concourse':          'Grand Concourse, Bronx',
  'yankee-stadium':           'Yankee Stadium, Bronx',
  // Jersey City
  'liberty-state-park':       'Liberty State Park, Jersey City, New Jersey',
  'grove-st-jc':              'Grove Street PATH Station, Jersey City'
}

async function geocode(q) {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', q)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' } })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const data = await r.json()
  if (!data.length) return null
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name }
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

const data = JSON.parse(readFileSync(FILE, 'utf8'))

let updated = 0
let skipped = 0
let failed = []

for (const zone of data.zones) {
  for (const stop of zone.stops) {
    const q = QUERIES[stop.id]
    if (!q) {
      console.log(`  ─  ${stop.id}: pas de query — skip`)
      skipped++
      continue
    }
    try {
      const r = await geocode(q)
      if (!r) {
        console.log(`  ✗  ${stop.id}: pas de résultat pour "${q}"`)
        failed.push(stop.id)
      } else {
        const dLat = Math.abs(r.lat - stop.lat).toFixed(4)
        const dLng = Math.abs(r.lng - stop.lng).toFixed(4)
        console.log(`  ✓  ${stop.id}: ${stop.lat},${stop.lng} → ${r.lat},${r.lng}  (Δ ${dLat},${dLng})`)
        stop.lat = +r.lat.toFixed(6)
        stop.lng = +r.lng.toFixed(6)
        updated++
      }
    } catch (e) {
      console.log(`  ✗  ${stop.id}: ${e.message}`)
      failed.push(stop.id)
    }
    await sleep(SLEEP_MS)
  }
}

writeFileSync(FILE, JSON.stringify(data))
console.log(`\nDone — ${updated} updated, ${skipped} skipped, ${failed.length} failed`)
if (failed.length) console.log('Failed:', failed.join(', '))

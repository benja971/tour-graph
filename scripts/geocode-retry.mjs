// scripts/geocode-retry.mjs
// Second pass with better queries for stops that failed or got wrong results.

import { readFileSync, writeFileSync } from 'node:fs'

const FILE = new URL('../src/data/nyc.json', import.meta.url)
const UA = 'TourGraph-dev (nddm.benjamin@gmail.com)'
const SLEEP_MS = 1100

// Better queries for the 15 failed + 3 visibly wrong (PDT, Blair, Grand Concourse)
const RETRY = {
  // Brooklyn — failed
  'williamsburg-bedford':   'Bedford Avenue, Williamsburg, Brooklyn, NY',
  'bushwick-collective':    'Troutman Street, Brooklyn, NY 11237',
  'coney-island':           'Luna Park, Coney Island, Brooklyn',
  'dumbo-washington':       'Washington Street, Brooklyn, NY 11201',
  // Lower Manhattan — failed
  'oculus':                 'World Trade Center PATH Station, New York',
  'nolita':                 'Mulberry Street, Manhattan, NY 10012',
  // PDT — wrong (got Long Island)
  'pdt-speakeasy':          'Crif Dogs, 113 Saint Marks Place, Manhattan, New York',
  // Greenwich/Soho — failed
  'bleecker-macdougal':     'MacDougal Street, Manhattan, NY 10012',
  'village-vanguard':       '178 7th Avenue South, Manhattan, New York',
  'soho-spring':            'Spring Street, Manhattan, NY 10012',
  // Midtown — failed
  'koreatown':              'Korea Way, 32nd Street, Manhattan, New York',
  // Upper Manhattan — failed + 1 wrong
  'met-steps':              'Metropolitan Museum of Art, Manhattan',
  'blair-penthouse':        '1136 5th Avenue, Manhattan, New York 10128',
  'central-park-ramble':    'The Ramble, Central Park, Manhattan',
  // Queens — failed
  'jackson-heights':        '74th Street, Queens, NY 11372',
  // Bronx — failed + 1 imprecise
  'arthur-avenue':          'Arthur Avenue, Belmont, Bronx, NY 10458',
  'grand-concourse':        '161 Street, Grand Concourse, Bronx',
  // Jersey — failed
  'grove-st-jc':            'Grove Street, Jersey City, NJ 07302'
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
let stillFailed = []

for (const zone of data.zones) {
  for (const stop of zone.stops) {
    const q = RETRY[stop.id]
    if (!q) continue
    try {
      const r = await geocode(q)
      if (!r) {
        console.log(`  ✗  ${stop.id}: aucun résultat pour "${q}"`)
        stillFailed.push(stop.id)
      } else {
        // Sanity check: NYC area is roughly lat 40-41, lng -74.5 to -73.5
        if (r.lat < 40 || r.lat > 41 || r.lng < -74.5 || r.lng > -73.5) {
          console.log(`  ⚠  ${stop.id}: résultat HORS NYC (${r.lat},${r.lng}) — non appliqué [${r.display}]`)
          stillFailed.push(stop.id + ' (out-of-bounds)')
        } else {
          console.log(`  ✓  ${stop.id}: ${stop.lat},${stop.lng} → ${r.lat},${r.lng}`)
          stop.lat = +r.lat.toFixed(6)
          stop.lng = +r.lng.toFixed(6)
          updated++
        }
      }
    } catch (e) {
      console.log(`  ✗  ${stop.id}: ${e.message}`)
      stillFailed.push(stop.id)
    }
    await sleep(SLEEP_MS)
  }
}

writeFileSync(FILE, JSON.stringify(data))
console.log(`\nRetry done — ${updated} updated, ${stillFailed.length} still failed`)
if (stillFailed.length) console.log('Still failed:', stillFailed.join(', '))

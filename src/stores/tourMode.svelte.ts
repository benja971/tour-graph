import type { Suggestion } from '../lib/types'

interface WakeLockSentinel {
  released: boolean
  release(): Promise<void>
  addEventListener(type: 'release', listener: () => void): void
}

interface NavigatorWakeLock {
  wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinel> }
}

const NOTIFICATION_THROTTLE_MS = 3 * 60 * 1000

export const tourState = $state({
  active: false,
  notificationsAllowed: false,
  wakeLockHeld: false,
  startedAt: 0 as number,
  notifiedCount: 0
})

let lastNotifiedTopId: string | null = null
let lastNotificationAt = 0
let wakeLockSentinel: WakeLockSentinel | null = null

// ── Notification dispatch — service worker preferred (Android Chrome requires it
//    when running in a tab; otherwise new Notification() vibrates but doesn't show) ──
async function showNotification(
  title: string,
  options: NotificationOptions & { tag?: string }
): Promise<{ ok: boolean; via: 'sw' | 'page' | 'none'; error?: string }> {
  const opts: NotificationOptions = {
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    ...options
  }

  // Try service worker first — but with a hard timeout so we never hang.
  if ('serviceWorker' in navigator) {
    try {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('SW ready timeout')), 1500)
        )
      ])
      await reg.showNotification(title, opts)
      return { ok: true, via: 'sw' }
    } catch (e) {
      console.warn('[tour] SW notification failed, falling back:', e)
    }
  }

  // Fallback: in-page Notification (desktop / iOS / dev without SW)
  try {
    const n = new Notification(title, opts)
    n.onclick = () => { window.focus(); n.close() }
    return { ok: true, via: 'page' }
  } catch (e) {
    return { ok: false, via: 'none', error: String(e) }
  }
}

async function ensurePermission(): Promise<{ ok: boolean; error?: string }> {
  if (!('Notification' in window)) return { ok: false, error: 'Notifications non disponibles' }
  let perm = Notification.permission
  if (perm === 'default') perm = await Notification.requestPermission()
  if (perm !== 'granted') return { ok: false, error: 'Permission refusée' }
  return { ok: true }
}

async function acquireWakeLock(): Promise<void> {
  const nav = navigator as Navigator & NavigatorWakeLock
  if (!nav.wakeLock) return
  try {
    wakeLockSentinel = await nav.wakeLock.request('screen')
    tourState.wakeLockHeld = true
    wakeLockSentinel.addEventListener('release', () => {
      tourState.wakeLockHeld = false
      wakeLockSentinel = null
    })
  } catch {
    tourState.wakeLockHeld = false
  }
}

async function releaseWakeLock(): Promise<void> {
  if (!wakeLockSentinel) return
  try { await wakeLockSentinel.release() } catch {}
  wakeLockSentinel = null
  tourState.wakeLockHeld = false
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (tourState.active && document.visibilityState === 'visible' && !wakeLockSentinel) {
      acquireWakeLock()
    }
  })
}

export async function startTour(): Promise<{ ok: boolean; error?: string }> {
  const perm = await ensurePermission()
  if (!perm.ok) return perm

  tourState.notificationsAllowed = true
  tourState.active = true
  tourState.startedAt = Date.now()
  tourState.notifiedCount = 0
  lastNotifiedTopId = null
  lastNotificationAt = 0

  if ('vibrate' in navigator) navigator.vibrate([60, 40, 60, 40, 120])

  // Fire and forget — don't block toggle return on SW or wake lock
  acquireWakeLock().catch(() => {})
  showNotification('Mode Tour activé', {
    body: 'Tu seras notifié quand le top stop change. Bonne balade.',
    tag: 'tour-started'
  }).catch(() => {})

  return { ok: true }
}

export async function stopTour(): Promise<void> {
  tourState.active = false
  // Fire and forget so the UI never gets stuck if release hangs
  releaseWakeLock().catch(() => {})
}

export async function fireTestNotification(top: Suggestion | null): Promise<{ ok: boolean; error?: string; via?: string }> {
  const perm = await ensurePermission()
  if (!perm.ok) return perm

  const title = '🧪 Test — stop proche'
  let body: string
  if (top) {
    const distLabel =
      top.distanceKm < 1
        ? Math.round(top.distanceKm * 1000) + ' m'
        : top.distanceKm.toFixed(1) + ' km'
    body = `${top.stop.name} · ${distLabel} · ~${top.walkMinutes} min à pied`
  } else {
    body = 'Pas de suggestion disponible — autorise le GPS d\'abord.'
  }

  const r = await showNotification(title, {
    body,
    tag: 'tour-test-' + Date.now()
  })

  if ('vibrate' in navigator) navigator.vibrate([120, 60, 120])
  return { ok: r.ok, error: r.error, via: r.via }
}

export async function maybeNotify(top: Suggestion | null): Promise<void> {
  if (!tourState.active || !tourState.notificationsAllowed || !top) return
  if (top.stop.id === lastNotifiedTopId) return

  const now = Date.now()
  if (now - lastNotificationAt < NOTIFICATION_THROTTLE_MS) return

  const distLabel =
    top.distanceKm < 1
      ? Math.round(top.distanceKm * 1000) + ' m'
      : top.distanceKm.toFixed(1) + ' km'

  const title = top.openNow ? 'Stop proche de toi' : 'Stop proche (fermé)'
  const body = `${top.stop.name} · ${distLabel} · ~${top.walkMinutes} min à pied`

  const r = await showNotification(title, {
    body,
    tag: 'tour-suggestion'
  })

  if (!r.ok) return

  if ('vibrate' in navigator) navigator.vibrate([120, 60, 120])

  lastNotifiedTopId = top.stop.id
  lastNotificationAt = now
  tourState.notifiedCount += 1
}

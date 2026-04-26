import type { Suggestion } from '../lib/types'

interface WakeLockSentinel {
  released: boolean
  release(): Promise<void>
  addEventListener(type: 'release', listener: () => void): void
}

interface NavigatorWakeLock {
  wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinel> }
}

const NOTIFICATION_THROTTLE_MS = 3 * 60 * 1000   // 3 min between identical notifs

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

// Re-acquire wake lock when tab becomes visible again (Android may release it)
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (tourState.active && document.visibilityState === 'visible' && !wakeLockSentinel) {
      acquireWakeLock()
    }
  })
}

export async function startTour(): Promise<{ ok: boolean; error?: string }> {
  if (!('Notification' in window)) {
    return { ok: false, error: 'Notifications non disponibles dans ce navigateur' }
  }

  let perm = Notification.permission
  if (perm === 'default') perm = await Notification.requestPermission()
  if (perm !== 'granted') {
    return { ok: false, error: 'Permission notifications refusée' }
  }

  tourState.notificationsAllowed = true
  tourState.active = true
  tourState.startedAt = Date.now()
  tourState.notifiedCount = 0
  lastNotifiedTopId = null
  lastNotificationAt = 0

  await acquireWakeLock()

  return { ok: true }
}

export async function stopTour(): Promise<void> {
  tourState.active = false
  await releaseWakeLock()
}

export function maybeNotify(top: Suggestion | null): void {
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

  try {
    const n = new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'tour-suggestion',
      requireInteraction: false,
      silent: false
    })
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch {
    return
  }

  if ('vibrate' in navigator) navigator.vibrate([120, 60, 120])

  lastNotifiedTopId = top.stop.id
  lastNotificationAt = now
  tourState.notifiedCount += 1
}

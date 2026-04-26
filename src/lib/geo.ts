export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  if (lat1 === lat2 && lng1 === lng2) return 0
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

export function walkMinutes(km: number): number {
  return Math.ceil((km / 5) * 60)
}

export function navigateUrl(lat: number, lng: number): string {
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent
    if (/iPhone|iPad|iPod/.test(ua)) return `https://maps.apple.com/?daddr=${lat},${lng}`
    if (/Android/.test(ua)) return `https://maps.google.com/?daddr=${lat},${lng}`
  }
  return `https://www.openstreetmap.org/directions?to=${lat},${lng}`
}

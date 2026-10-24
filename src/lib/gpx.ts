import type { Ride } from '@/types'

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/**
 * Builds a real GPX 1.1 file from the ride's meetup → destination line with
 * intermediate waypoints. Used by the PRO "offline mountain download" action.
 */
export const buildGpx = (ride: Ride) => {
  const points: Array<{ lat: number; lng: number; name: string; km: number }> = []
  const steps = 24
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    points.push({
      lat: ride.meetupCoords.lat + (ride.destinationCoords.lat - ride.meetupCoords.lat) * t,
      lng: ride.meetupCoords.lng + (ride.destinationCoords.lng - ride.meetupCoords.lng) * t,
      name: i === 0 ? ride.title : `KM ${Math.round(ride.distanceKm * t)}`,
      km: Math.round(ride.distanceKm * t),
    })
  }

  const trkpts = points
    .map(
      (point) =>
        `      <trkpt lat="${point.lat.toFixed(6)}" lon="${point.lng.toFixed(6)}"><name>${escapeXml(
          point.name,
        )}</name></trkpt>`,
    )
    .join('\n')

  const wpts = ride.waypoints
    .map((waypoint, index) => {
      const t = Math.min(1, waypoint.km / Math.max(1, ride.distanceKm))
      const lat = ride.meetupCoords.lat + (ride.destinationCoords.lat - ride.meetupCoords.lat) * t
      const lng = ride.meetupCoords.lng + (ride.destinationCoords.lng - ride.meetupCoords.lng) * t
      return `  <wpt lat="${lat.toFixed(6)}" lon="${lng.toFixed(6)}"><name>${escapeXml(
        `${index + 1}. ${waypoint.label}`,
      )}</name><desc>${escapeXml(waypoint.note ?? '')}</desc></wpt>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Ride &amp; Roam (PackPulse)" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(ride.title)}</name>
    <desc>${escapeXml(ride.routeSummary)} · ${ride.distanceLabel}</desc>
    <author><name>Ride &amp; Roam</name></author>
  </metadata>
${wpts}
  <trk>
    <name>${escapeXml(ride.title)}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`
}

export const downloadFile = (filename: string, content: string, mime = 'application/gpx+xml') => {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

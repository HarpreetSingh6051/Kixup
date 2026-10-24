import { useCallback, useEffect, useState } from 'react'
import type { LatLng } from '@/types'

interface GeoState {
  coords: LatLng | null
  status: 'idle' | 'locating' | 'granted' | 'denied' | 'unsupported'
  error: string | null
}

/** Browser/Capacitor geolocation with a graceful demo fallback (Ludhiana, IN). */
export const useGeolocation = (auto = false) => {
  const [state, setState] = useState<GeoState>({
    coords: null,
    status: 'idle',
    error: null,
  })

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState({ coords: { lat: 30.901, lng: 75.8573 }, status: 'unsupported', error: null })
      return
    }
    setState((prev) => ({ ...prev, status: 'locating', error: null }))
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          coords: { lat: position.coords.latitude, lng: position.coords.longitude },
          status: 'granted',
          error: null,
        })
      },
      (error) => {
        // Demo fallback keeps "Near Me" useful when permission is blocked.
        setState({
          coords: { lat: 30.901, lng: 75.8573 },
          status: 'denied',
          error: error.message,
        })
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 },
    )
  }, [])

  useEffect(() => {
    if (auto) request()
  }, [auto, request])

  return { ...state, request }
}

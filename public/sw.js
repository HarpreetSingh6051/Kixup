/* Ride & Roam (PackPulse) — offline shell service worker.
 * Registered in production only (see src/main.tsx).
 * Strategy:
 *   - navigations: network first, fall back to the cached app shell
 *   - static assets: stale-while-revalidate
 *   - Supabase / Gemini / font requests: pass straight through
 */
const CACHE = 'packpulse-v1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg']

const precache = async () => {
  const cache = await caches.open(CACHE)
  await Promise.all(SHELL.map((path) => cache.add(path).catch(() => undefined)))

  // Vite emits hashed asset names, so discover them from the built HTML.
  try {
    const response = await fetch('/index.html', { cache: 'reload' })
    if (!response.ok) return
    await cache.put('/index.html', response.clone())
    const html = await response.text()
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1])
    await Promise.all(assets.map((asset) => cache.add(asset).catch(() => undefined)))
  } catch {
    /* offline shell is best-effort */
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

const isCacheable = (request) => {
  if (request.method !== 'GET') return false
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return false
  if (url.pathname.startsWith('/api/')) return false
  return true
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (!isCacheable(request)) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put('/index.html', copy))
          return response
        })
        .catch(async () => (await caches.match('/index.html')) ?? Response.error()),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => cached ?? Response.error())
      return cached ?? network
    }),
  )
})

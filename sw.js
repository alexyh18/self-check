// 정수리 체크 PWA 서비스 워커
// 앱 셸을 캐시해 오프라인에서도 동작하게 한다.
// (사진 분석은 전부 로컬에서 이뤄지므로 네트워크가 전혀 필요 없다.)

const CACHE = 'scalp-check-v1'
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './analysis.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
]

// 설치: 앱 셸 프리캐시
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // 일부 아이콘이 아직 없어도 설치가 실패하지 않도록 개별 처리
      Promise.allSettled(ASSETS.map((url) => cache.add(url))),
    ),
  )
  self.skipWaiting()
})

// 활성화: 이전 버전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

// fetch: 캐시 우선, 없으면 네트워크 → 캐시에 저장 (same-origin GET만)
self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached
      return fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put(req, copy))
          return res
        })
        .catch(() => {
          // 오프라인이고 캐시에도 없는 네비게이션 요청이면 index.html로 폴백
          if (req.mode === 'navigate') return caches.match('./index.html')
          return new Response('', { status: 504, statusText: 'offline' })
        })
    }),
  )
})

const CACHE_NAME = 'tomorrow-app-v5';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/storage.js',
  './js/ui.js',
  './js/app.js',
  './js/sw-register.js',
  './js/modules/home.js',
  './js/modules/plan.js',
  './js/modules/outfit.js',
  './js/modules/meal.js',
  './js/modules/drink.js',
  './js/modules/sport.js',
  './manifest.json',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('部分资源缓存失败:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // 只缓存同源 GET 请求
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      // 网络优先，失败回退缓存（适用于动态内容）
      return fetch(e.request).then(response => {
        // 缓存新资源
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        return cached || caches.match('./index.html');
      });
    })
  );
});

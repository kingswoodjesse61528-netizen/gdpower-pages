/* 广东电力日前电价 PWA · service worker
   壳资源缓存优先；data.json 走 network-first（离线回退上次缓存）。
   改版时把 VER 加一位，强制刷新缓存。 */
const VER = 'gdpower-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VER).map(k => caches.delete(k))))
         .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // data.json：network-first，拿到就更新缓存，失败回退缓存
  if (url.pathname.endsWith('/data.json')) {
    e.respondWith(
      fetch(e.request).then(resp => {
        const copy = resp.clone();
        caches.open(VER).then(c => c.put('./data.json', copy));
        return resp;
      }).catch(() => caches.match('./data.json'))
    );
    return;
  }

  // 其余（壳/字体/Chart.js）：cache-first，回源后顺手缓存
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(resp => {
      if (resp.ok && (url.origin === location.origin || url.host.includes('cdnjs'))) {
        const copy = resp.clone();
        caches.open(VER).then(c => c.put(e.request, copy));
      }
      return resp;
    }).catch(() => hit))
  );
});

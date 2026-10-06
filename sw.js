/**
 * SERVICE WORKER (sw.js)
 * Mendukung instalasi PWA di HP & fungsi offline cache
 */

const CACHE_NAME = "bukukas-cache-v1";

// Berkas-berkas shell aplikasi yang di-cache
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/favicon.png",
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap",
  "https://cdn.tailwindcss.com",
  "https://unpkg.com/lucide@latest",
  "https://cdn.jsdelivr.net/npm/chart.js"
];

// 1. Install Event: Simpan aset statis ke Cache Storage
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[ServiceWorker] Caching app shell assets...");
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Bersihkan cache versi lama jika ada pembaruan
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[ServiceWorker] Menghapus cache lama:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Strategi Network-First dengan Cache Fallback
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Jangan cache permintaan ke Google Apps Script API atau metode non-GET
  if (url.hostname.includes("google.com") || url.hostname.includes("googleusercontent.com") || event.request.method !== "GET") {
    return; // Biarkan browser menangani secara langsung via internet
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Jika respon sukses, simpan salinannya ke cache untuk mode offline
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Jika internet terputus/offline, ambil dari cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // Jika membuka halaman utama saat offline
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }
      })
  );
});

// ===============================================
//  Service Worker — موقع المهارات الرقمية
//  يخزّن جميع الملفات الثابتة محلياً
//  بعد أول زيارة، الموقع يعمل بسرعة كاملة
// ===============================================

const CACHE_NAME = 'ibn-moshrf-v4';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 أيام

// الملفات التي تُخزَّن فوراً عند التثبيت
const PRECACHE_URLS = [
  './',
  './index.html',
  './dashboard.html',
  './css/style.css',
  './css/dashboard.css',
  './css/lesson-new.css',
  './js/data.js',
  './js/data-loader.js',
  './js/data-grade4.js',
  './js/data-grade5.js',
  './js/data-grade6.js',
  './js/app.js',
  './js/dashboard.js',
  './js/student-auth.js',
  './js/questions.js',
  './js/lesson-page.js',
  './js/animations.js',
  './js/unit-page.js',
  './js/theme.js',
  './js/curriculum-loader.js',
  './js/firebase-db.js',
  './js/firebase-config.js',
];

// ── التثبيت: تحميل مسبق لجميع الملفات ────────
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

// ── التفعيل: حذف الكاش القديم ──────────────────
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; })
            .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// ── الاعتراض: استراتيجية Cache-First للملفات الثابتة ──
self.addEventListener('fetch', function (event) {
  const url = new URL(event.request.url);

  // تجاهل Firebase و CDN وطلبات POST
  if (event.request.method !== 'GET') return;
  if (url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis') ||
      url.hostname.includes('jsdelivr') ||
      url.hostname.includes('gstatic') ||
      url.hostname.includes('cdnjs') ||
      url.hostname.includes('fonts.')) return;

  // استراتيجية: الكاش أولاً ← ثم الشبكة (للملفات الثابتة)
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(event.request));
  } else {
    // للصفحات HTML: الشبكة أولاً ← ثم الكاش كاحتياط
    event.respondWith(networkFirst(event.request));
  }
});

function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)$/i.test(pathname);
}

// Cache-First: من الكاش إذا موجود، وإلا من الشبكة وتخزينه
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('', { status: 503 });
  }
}

// Network-First: من الشبكة، وإذا فشل يرجع للكاش
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('<h1>لا يوجد اتصال بالإنترنت</h1>', {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

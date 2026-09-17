const CACHE_NAME = 'adc-shuttle-v3';
const APP_ICON = '/pwa-192x192.png';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 1. Handle background Web Push events (wakes up phone/device when app is closed)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'ADC Shuttle Alert',
        body: event.data.text(),
      };
    }
  }

  const title = data.title || 'ADC Shuttle';
  const options = {
    body: data.body || 'New notification from ADC Shuttle',
    icon: data.icon || APP_ICON,
    badge: data.badge || APP_ICON,
    vibrate: [250, 100, 250, 100, 250],
    tag: data.tag || 'adc_shuttle_' + Date.now(),
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
      ...data,
    },
    actions: [
      { action: 'open_app', title: 'Open App / فتح التطبيق' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 2. Handle tapping on the background notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// 3. Handle messages from client app (e.g. show system-level notification via SW)
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data.payload || {};
    const finalOptions = {
      icon: APP_ICON,
      badge: APP_ICON,
      vibrate: [250, 100, 250],
      requireInteraction: true,
      ...options,
    };
    event.waitUntil(self.registration.showNotification(title || 'ADC Shuttle', finalOptions));
  } else if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { title, options, delayMs } = event.data.payload || {};
    setTimeout(() => {
      const finalOptions = {
        icon: APP_ICON,
        badge: APP_ICON,
        vibrate: [250, 100, 250],
        requireInteraction: true,
        ...options,
      };
      self.registration.showNotification(title || 'ADC Shuttle', finalOptions);
    }, delayMs || 5000);
  }
});

// 4. Asset fetch handling with network-first for fresh API data
self.addEventListener('fetch', (event) => {
  // Let API calls go directly to network
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// MedDrop Service Worker — handles Web Push notifications

self.addEventListener('install', (event) => {
  self.skipWaiting(); // activate immediately
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim()); // take control of all open tabs
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch {
    data = { title: 'MedDrop', body: event.data?.text() || 'You have an update' };
  }

  const title = data.title || 'MedDrop';
  const options = {
    body: data.body || 'You have an order update',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: { url: data.url || '/orders' },
    tag: data.tag || 'meddrop-order',
    renotify: true,          // re-ring even if same tag
    requireInteraction: true, // stay on screen until dismissed
    vibrate: [200, 100, 200, 100, 200],
    actions: [
      { action: 'view', title: 'View Order' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/orders';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing tab if open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.postMessage({ type: 'NAVIGATE', url });
            return;
          }
        }
        // Open new tab
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});

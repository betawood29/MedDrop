// MedDrop Service Worker — handles Web Push notifications

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'MedDrop';
  const options = {
    body: data.body || 'You have an update',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: { url: data.url || '/orders' },
    tag: data.tag || 'meddrop',
    renotify: true,
    vibrate: [200, 100, 200],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/orders';
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If app is already open, focus it and navigate
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            client.postMessage({ type: 'NAVIGATE', url });
            return;
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});

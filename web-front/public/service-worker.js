self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'WorldCup Oracle', body: event.data.text() };
  }
  const options = {
    body: payload.body || '',
    icon: '/assets/icons/icon-192.png',
    badge: '/assets/icons/badge-72.png',
    data: { url: payload.url || '/' },
    actions: [
      { action: 'open', title: '进入直播大厅' },
      { action: 'dismiss', title: '继续睡觉' },
    ],
  };
  event.waitUntil(self.registration.showNotification(payload.title || 'WorldCup Oracle', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    const url = event.notification.data?.url || '/';
    event.waitUntil(clients.openWindow(url));
  }
});

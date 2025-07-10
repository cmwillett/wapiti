// Service Worker for background notifications and push messages

const CACHE_NAME = 'wapiti-v1';

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// Handle push messages from the server
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: data.icon || '/favicon.ico',
      badge: data.badge || '/favicon.ico',
      tag: data.tag || 'default',
      requireInteraction: true,
      actions: data.actions || [],
      data: data.data || {}
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('Error handling push message:', error);
    
    // Fallback notification if parsing fails
    event.waitUntil(
      self.registration.showNotification('Task Reminder', {
        body: 'You have a task reminder!',
        icon: '/favicon.ico',
        tag: 'fallback'
      })
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const taskId = event.notification.data?.taskId || event.notification.tag.replace('task-', '');

  if (action === 'complete') {
    // Handle task completion
    event.waitUntil(
      handleTaskAction('COMPLETE_TASK', taskId)
    );
  } else if (action === 'snooze') {
    // Handle snooze (15 minutes)
    event.waitUntil(
      handleTaskAction('SNOOZE_TASK', taskId, { minutes: 15 })
    );
  } else {
    // Default action - open the app
    event.waitUntil(
      openApp()
    );
  }
});

// Helper function to handle task actions
async function handleTaskAction(action, taskId, data = {}) {
  try {
    // Try to communicate with open app instances first
    const clients = await self.clients.matchAll({ type: 'window' });
    
    if (clients.length > 0) {
      // App is open, send message to it
      clients[0].postMessage({
        type: action,
        taskId: taskId,
        ...data
      });
      clients[0].focus();
    } else {
      // App is closed, open it with action data
      const url = new URL('/', self.location.origin);
      url.searchParams.set('action', action);
      url.searchParams.set('taskId', taskId);
      if (data.minutes) {
        url.searchParams.set('snoozeMinutes', data.minutes);
      }
      
      await self.clients.openWindow(url.href);
    }
  } catch (error) {
    console.error('Error handling task action:', error);
    // Fallback to just opening the app
    await openApp();
  }
}

// Helper function to open the app
async function openApp() {
  try {
    const clients = await self.clients.matchAll({ type: 'window' });
    
    if (clients.length > 0) {
      clients[0].focus();
    } else {
      await self.clients.openWindow('/');
    }
  } catch (error) {
    console.error('Error opening app:', error);
  }
}

// Background sync for checking reminders (when network is available)
self.addEventListener('sync', (event) => {
  if (event.tag === 'check-reminders') {
    event.waitUntil(checkReminders());
  }
});

async function checkReminders() {
  try {
    // This could call the Supabase Edge Function to check reminders
    console.log('Background sync: Checking for due reminders...');
    
    // For now, we'll let the server-side cron job handle this
    // But this could be useful for offline scenarios
  } catch (error) {
    console.error('Error in background reminder check:', error);
  }
}

// Handle messages from the main app
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'GET_CLIENTS':
      self.clients.matchAll().then(clients => {
        event.ports[0].postMessage(clients.length);
      });
      break;
    default:
      console.log('Unknown message type:', type);
  }
});

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
  console.log('SW: 🔔 Push event received in service worker:', event);
  console.log('SW: Event details:', {
    type: event.type,
    bubbles: event.bubbles,
    cancelable: event.cancelable,
    data: event.data ? 'present' : 'missing'
  });
  
  // If debugging is enabled, send info to main thread
  if (self.pushDebugEnabled && self.clients) {
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'PUSH_EVENT_DEBUG',
          eventType: 'push',
          hasData: !!event.data,
          timestamp: new Date().toISOString()
        });
      });
    });
  }
  
  // Try to get data from the push event first
  let pushData = null;
  try {
    if (event.data) {
      const rawData = event.data.text();
      console.log('SW: Raw push data:', rawData);
      
      // Try to parse as JSON
      try {
        pushData = JSON.parse(rawData);
        console.log('SW: ✅ Parsed push data:', pushData);
      } catch (parseError) {
        console.log('SW: ⚠️ Failed to parse push data as JSON, using as text:', parseError);
        // If it's not JSON, treat it as plain text
        pushData = { body: rawData };
      }
    } else {
      console.log('SW: ⚠️ No data in push event, will show generic notification');
    }
  } catch (error) {
    console.log('SW: ❌ Error extracting push data:', error);
  }
  
  console.log('SW: About to call fetchAndShowReminder with data:', pushData);
  
  event.waitUntil(
    fetchAndShowReminder(pushData).catch(error => {
      console.error('SW: ❌ fetchAndShowReminder failed:', error);
      // Show a fallback notification
      return showGenericNotification();
    })
  );
});

async function fetchAndShowReminder(pushData = null) {
  try {
    console.log('SW: 🔍 fetchAndShowReminder called with data:', pushData);
    
    // Check if we have push data in the new data-only format
    if (pushData && pushData.data) {
      console.log('SW: 📦 Using data-only push format:', pushData.data);
      
      const data = pushData.data;
      const notificationOptions = {
        body: data.body || 'You have a task reminder',
        icon: '/icons/icon-192x192.png', // Use PNG icon for better compatibility
        badge: '/favicon.svg',
        tag: data.tag || 'task-reminder',
        requireInteraction: true,
        silent: false,
        vibrate: [200, 100, 200],
        actions: [
          { action: 'complete', title: 'Mark Complete' },
          { action: 'snooze', title: 'Snooze 15 min' }
        ],
        data: {
          taskId: parseInt(data.taskId) || 0,
          action: data.action || 'task-reminder'
        }
      };
      
      console.log('SW: 🔔 About to show notification with options:', notificationOptions);
      
      await self.registration.showNotification(data.title || '📝 Task Reminder', notificationOptions);

      console.log(`SW: ✅ Showed notification using data-only format: ${data.body}`);
      return;
    }
    
    // Check if we have any push data with reminder information directly
    if (pushData && (pushData.taskId || pushData.body || pushData.text)) {
      console.log('SW: 📝 Using direct push data:', pushData);
      
      const taskText = pushData.body || pushData.text || 'You have a task reminder';
      
      const notificationOptions = {
        body: taskText,
        icon: '/icons/icon-192x192.png',
        badge: '/favicon.svg',
        tag: `task-${pushData.taskId || 'unknown'}`,
        requireInteraction: true,
        silent: false,
        vibrate: [200, 100, 200],
        actions: [
          { action: 'complete', title: 'Mark Complete' },
          { action: 'snooze', title: 'Snooze 15 min' }
        ],
        data: {
          taskId: parseInt(pushData.taskId) || 0,
          action: 'task-reminder'
        }
      };
      
      console.log('SW: 🔔 About to show notification with options:', notificationOptions);

      await self.registration.showNotification('📝 Task Reminder', notificationOptions);

      console.log(`SW: ✅ Showed notification using direct push data: ${taskText}`);
      return;
    }
    
    // Check if we have push data in the FCM notification format
    if (pushData && pushData.notification) {
      console.log('SW: 📱 Using FCM notification format:', pushData);
      
      const notificationOptions = {
        body: pushData.notification.body || 'You have a task reminder',
        icon: '/icons/icon-192x192.png',
        badge: '/favicon.svg',
        tag: pushData.data?.taskId ? `task-${pushData.data.taskId}` : 'fcm-notification',
        requireInteraction: true,
        silent: false,
        vibrate: [200, 100, 200],
        actions: [
          { action: 'complete', title: 'Mark Complete' },
          { action: 'snooze', title: 'Snooze 15 min' }
        ],
        data: {
          taskId: parseInt(pushData.data?.taskId) || 0,
          action: 'task-reminder'
        }
      };
      
      console.log('SW: 🔔 About to show FCM notification with options:', notificationOptions);

      await self.registration.showNotification(pushData.notification.title || '📝 Task Reminder', notificationOptions);

      console.log('SW: ✅ Showed notification using FCM notification format');
      return;
    }
    
    // Check if we have push data in the old notification format
    if (pushData && pushData.title && pushData.body) {
      console.log('SW: 📄 Using notification push format:', pushData);
      
      const notificationOptions = {
        body: pushData.body,
        icon: pushData.icon || '/icons/icon-192x192.png',
        badge: pushData.badge || '/favicon.svg',
        tag: pushData.tag || 'task-reminder',
        requireInteraction: true,
        silent: false,
        vibrate: [200, 100, 200],
        actions: pushData.actions || [
          { action: 'complete', title: 'Mark Complete' },
          { action: 'snooze', title: 'Snooze 15 min' }
        ],
        data: pushData.data || {
          action: 'task-reminder'
        }
      };
      
      console.log('SW: 🔔 About to show notification with options:', notificationOptions);

      await self.registration.showNotification(pushData.title, notificationOptions);

      console.log('SW: ✅ Showed notification using notification format');
      return;
    }
    
    console.log('SW: No push data available, fetching fresh reminder data from Edge Function...');
    
    // Try to fetch fresh reminder data from the Edge Function
    try {
      console.log('SW: Attempting to fetch pending reminders from Edge Function');
      
      // We need to get auth token from IndexedDB or other storage
      // For now, let's try to get it from IndexedDB where the app might store it
      const authToken = await getAuthTokenFromStorage();
      
      if (authToken) {
        console.log('SW: Found auth token, fetching pending reminders');
        
        const response = await fetch('https://uiczcbezwwfhvahfdxax.supabase.co/functions/v1/check-reminders/pending-reminders', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('SW: Fetched pending reminders:', data);
          
          if (data.tasks && data.tasks.length > 0) {
            const task = data.tasks[0]; // Use the first pending reminder
            
            await self.registration.showNotification('📝 Task Reminder', {
              body: `Don't forget: ${task.text}`,
              icon: '/favicon.svg',
              badge: '/favicon.svg',
              tag: `task-${task.id}`,
              requireInteraction: true,
              silent: false,
              vibrate: [200, 100, 200],
              actions: [
                { action: 'complete', title: 'Mark Complete' },
                { action: 'snooze', title: 'Snooze 15 min' }
              ],
              data: {
                taskId: task.id,
                action: 'task-reminder'
              }
            });

            console.log(`SW: Showed notification for fresh task: ${task.text}`);
            return;
          }
        }
      }
    } catch (fetchError) {
      console.error('SW: Failed to fetch fresh reminder data:', fetchError);
    }
    
    // Fall back to IndexedDB
    console.log('SW: Falling back to IndexedDB...');
    
    // Try to get pending reminders from IndexedDB
    const pendingData = await getFromIndexedDB('pendingReminders');
    
    console.log('SW: Received pending data from IndexedDB:', pendingData);
    
    if (pendingData && pendingData.reminders && pendingData.reminders.length > 0) {
      console.log(`SW: Found ${pendingData.reminders.length} pending reminders in IndexedDB`);
      
      // Find reminders that are due now (be very generous with timing for reliability)
      const now = new Date();
      const currentTime = now.getTime();
      
      const dueReminders = pendingData.reminders.filter(reminder => {
        const reminderTime = new Date(reminder.reminder_time).getTime();
        const timeDiff = currentTime - reminderTime;
        
        // Consider reminders due if they're within 30 minutes of the current time
        // (past due by up to 30 minutes, or due in the next 10 minutes)
        const isDue = timeDiff >= -600000 && timeDiff <= 1800000; // 10 minutes future, 30 minutes past
        
        console.log(`SW: Reminder "${reminder.text}" due at ${reminder.reminder_time}, diff: ${timeDiff}ms (${Math.round(timeDiff/60000)} min), isDue: ${isDue}`);
        
        return isDue;
      });
      
      console.log(`SW: Found ${dueReminders.length} due reminders`);
      
      if (dueReminders.length > 0) {
        // Use the first due reminder
        const task = dueReminders[0];
        
        console.log(`SW: Using due reminder for task: ${task.text}`);
        
        await self.registration.showNotification('📝 Task Reminder', {
          body: `Don't forget: ${task.text}`,
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          tag: `task-${task.id}`,
          requireInteraction: true,
          silent: false,
          vibrate: [200, 100, 200],
          actions: [
            { action: 'complete', title: 'Mark Complete' },
            { action: 'snooze', title: 'Snooze 15 min' }
          ],
          data: {
            taskId: task.id,
            action: 'task-reminder'
          }
        });

        console.log(`SW: Showed notification for task: ${task.text}`);
        return;
      } else {
        console.log('SW: No due reminders found in IndexedDB data');
        
        // Check if data is recent (within last 60 minutes) and use first reminder anyway
        const isRecent = Date.now() - pendingData.timestamp < 60 * 60 * 1000;
        
        if (isRecent) {
          const task = pendingData.reminders[0];
          
          console.log(`SW: Using recent pending reminder for task: ${task.text}`);
          
          await self.registration.showNotification('📝 Task Reminder', {
            body: `Don't forget: ${task.text}`,
            icon: '/favicon.svg',
            badge: '/favicon.svg',
            tag: `task-${task.id}`,
            requireInteraction: true,
            silent: false,
            vibrate: [200, 100, 200],
            actions: [
              { action: 'complete', title: 'Mark Complete' },
              { action: 'snooze', title: 'Snooze 15 min' }
            ],
            data: {
              taskId: task.id,
              action: 'task-reminder'
            }
          });

          console.log(`SW: Showed notification for recent task: ${task.text}`);
          return;
        } else {
          console.log('SW: Pending reminder data is too old, ignoring');
        }
      }
    }
    
    console.log('SW: No recent pending reminders found, trying Edge Function as last resort...');
    
    // Try to fetch from Edge Function without auth (it has an anonymous endpoint)
    try {
      console.log('SW: Attempting anonymous call to Edge Function pending-reminders endpoint');
      
      const response = await fetch('https://uiczcbezwwfhvahfdxax.supabase.co/functions/v1/check-reminders/pending-reminders', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 401) {
        console.log('SW: Edge Function requires auth, falling back to generic notification');
        return showGenericNotification();
      }
      
      if (response.ok) {
        const data = await response.json();
        console.log('SW: Edge Function pending reminders response:', data);
        
        if (data.tasks && data.tasks.length > 0) {
          const task = data.tasks[0]; // Use the first pending reminder
          
          await self.registration.showNotification('📝 Task Reminder', {
            body: `Don't forget: ${task.text}`,
            icon: '/favicon.svg',
            badge: '/favicon.svg',
            tag: `task-${task.id}`,
            requireInteraction: true,
            silent: false,
            vibrate: [200, 100, 200],
            actions: [
              { action: 'complete', title: 'Mark Complete' },
              { action: 'snooze', title: 'Snooze 15 min' }
            ],
            data: {
              taskId: task.id,
              action: 'task-reminder'
            }
          });

          console.log(`SW: Showed notification from Edge Function: ${task.text}`);
          return;
        }
      }
    } catch (fetchError) {
      console.error('SW: Failed to fetch from Edge Function:', fetchError);
    }
    
    return showGenericNotification();

  } catch (error) {
    console.error('SW: Error fetching reminder details:', error);
    showGenericNotification();
  }
}

// Helper function to read from IndexedDB
async function getFromIndexedDB(key) {
  try {
    console.log('SW: Attempting to read from IndexedDB, key:', key);
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WapitiReminders', 1);
      
      request.onerror = () => {
        console.log('SW: IndexedDB open error:', request.error);
        reject(request.error);
      };
      
      request.onupgradeneeded = (event) => {
        console.log('SW: IndexedDB upgrade needed');
        const db = event.target.result;
        if (!db.objectStoreNames.contains('reminders')) {
          db.createObjectStore('reminders');
        }
      };
      
      request.onsuccess = (event) => {
        console.log('SW: IndexedDB opened successfully');
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('reminders')) {
          console.log('SW: No reminders store found');
          db.close();
          resolve(null);
          return;
        }
        
        const transaction = db.transaction(['reminders'], 'readonly');
        const store = transaction.objectStore('reminders');
        
        const getRequest = store.get(key);
        
        getRequest.onsuccess = () => {
          const result = getRequest.result;
          console.log('SW: IndexedDB get result:', result);
          db.close();
          resolve(result);
        };
        
        getRequest.onerror = () => {
          console.log('SW: IndexedDB get error:', getRequest.error);
          db.close();
          reject(getRequest.error);
        };
      };
    });
  } catch (error) {
    console.error('SW: Error accessing IndexedDB:', error);
    return null;
  }
}

function showGenericNotification() {
  console.log('SW: 🔔 Showing enhanced generic notification with more details');
  
  const notificationOptions = {
    body: 'You have a task reminder! Check the app for details.',
    icon: '/icons/icon-192x192.png',
    badge: '/favicon.svg',
    tag: 'reminder',
    requireInteraction: true,
    silent: false,
    vibrate: [200, 100, 200, 100, 200], // More distinctive vibration
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    data: {
      action: 'generic-reminder'
    }
  };
  
  console.log('SW: 🔔 About to show generic notification with options:', notificationOptions);
  
  return self.registration.showNotification('📝 Task Reminder', notificationOptions);
}

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

// Handle messages from main thread
self.addEventListener('message', async (event) => {
  console.log('SW: Received message from main thread:', event.data);
  
  if (event.data.type === 'TEST_INDEXEDDB') {
    console.log('SW: Testing IndexedDB access...');
    
    try {
      const result = await getFromIndexedDB('pendingReminders');
      console.log('SW: IndexedDB test result:', result);
      
      // Send result back to main thread
      event.ports[0]?.postMessage({
        type: 'INDEXEDDB_TEST_RESULT',
        result: result
      });
      
      // Also try to send via client
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'INDEXEDDB_TEST_RESULT',
          result: result
        });
      });
    } catch (error) {
      console.error('SW: IndexedDB test error:', error);
      
      const errorResult = {
        type: 'INDEXEDDB_TEST_RESULT',
        result: null,
        error: error.message
      };
      
      event.ports[0]?.postMessage(errorResult);
      
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage(errorResult);
      });
    }
  }
});

// Handle messages from the main thread (for testing)
self.addEventListener('message', (event) => {
  console.log('SW: Message received:', event.data);
  
  if (event.data.type === 'test-push') {
    console.log('SW: Handling test push message');
    event.waitUntil(
      fetchAndShowReminder(event.data.data)
    );
  } else if (event.data.type === 'simulate-real-push') {
    console.log('SW: Simulating real FCM push event');
    // Parse the push data as if it came from a real push event
    try {
      const pushData = JSON.parse(event.data.pushData);
      console.log('SW: Parsed real push simulation data:', pushData);
      event.waitUntil(
        fetchAndShowReminder(pushData)
      );
    } catch (error) {
      console.error('SW: Failed to parse real push simulation data:', error);
    }
  } else if (event.data.type === 'ENABLE_PUSH_DEBUG') {
    console.log('SW: Push debugging enabled');
    self.pushDebugEnabled = true;
  } else {
    console.log('SW: Unknown message type:', event.data.type);
  }
});

// Helper function to get auth token for API calls
async function getAuthTokenFromStorage() {
  try {
    // Try to get the auth token from IndexedDB or other storage
    // This is a simplified approach - in production you might want more robust token management
    return new Promise((resolve) => {
      // Since we can't access localStorage from service worker, we'll return null for now
      // The main thread should handle auth-required operations
      console.log('SW: Auth token not available in service worker context');
      resolve(null);
    });
  } catch (error) {
    console.error('SW: Error getting auth token:', error);
    return null;
  }
}

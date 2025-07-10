// Notification service for handling reminders
import { tasksService } from './supabaseService';
import { supabase } from '../supabaseClient';

class NotificationService {
  constructor() {
    this.permission = null;
    this.registration = null;
    this.checkInterval = null;
    this.authChannel = null;
    this.reminderChannel = null;
    this.setupAuthChannel();
    console.log('NotificationService: Broadcast channels set up');
  }

  setupAuthChannel() {
    // Set up broadcast channel to handle auth requests from service worker
    try {
      this.authChannel = new BroadcastChannel('supabase-auth');
      this.authChannel.addEventListener('message', async (event) => {
        if (event.data.type === 'REQUEST_AUTH') {
          const session = await supabase.auth.getSession();
          if (session.data.session) {
            this.authChannel.postMessage({
              type: 'AUTH_RESPONSE',
              auth: {
                supabaseUrl: supabase.supabaseUrl,
                accessToken: session.data.session.access_token
              }
            });
          } else {
            this.authChannel.postMessage({
              type: 'AUTH_RESPONSE',
              auth: null
            });
          }
        }
      });
      
      // Also set up reminder data channel
      this.reminderChannel = new BroadcastChannel('reminder-data');
      this.reminderChannel.addEventListener('message', (event) => {
        console.log('NotificationService: Received message:', event.data);
        if (event.data.type === 'REQUEST_PENDING_REMINDERS') {
          console.log('NotificationService: Request for pending reminders received');
          
          // Get pending reminders from localStorage
          const pendingData = localStorage.getItem('pendingReminders');
          let reminders = null;
          
          console.log('NotificationService: Raw localStorage data:', pendingData);
          
          if (pendingData) {
            try {
              const parsed = JSON.parse(pendingData);
              console.log('NotificationService: Parsed data:', parsed);
              
              // Only send if data is recent (within last 5 minutes)
              if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
                reminders = parsed;
                console.log('NotificationService: Data is recent, sending to SW');
              } else {
                console.log('NotificationService: Data is too old, not sending');
              }
            } catch (error) {
              console.error('NotificationService: Error parsing pending reminders:', error);
            }
          } else {
            console.log('NotificationService: No pending reminders in localStorage');
          }
          
          console.log('NotificationService: Sending response to SW:', reminders);
          this.reminderChannel.postMessage({
            type: 'PENDING_REMINDERS_RESPONSE',
            data: reminders
          });
        }
      });
    } catch (error) {
      console.error('Failed to set up broadcast channels:', error);
    }
  }

  async initializeNotifications() {
    if ('Notification' in window) {
      this.permission = await Notification.requestPermission();
    }
    
    // Register service worker
    this.registration = await this.registerServiceWorker();
    
    // Start checking for due reminders every minute
    this.startReminderChecker();
  }

  async requestNotificationPermission() {
    if ('Notification' in window) {
      this.permission = await Notification.requestPermission();
      return this.permission;
    }
    return 'denied';
  }

  async showNotification(title, options = {}) {
    if (this.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });

      // Auto-close after 10 seconds unless requireInteraction is true
      if (!options.requireInteraction) {
        setTimeout(() => notification.close(), 10000);
      }

      return notification;
    }
  }

  async showTaskReminder(task) {
    const title = '📝 Task Reminder';
    const body = `Don't forget: ${task.text}`;
    
    // Use service worker for notifications with actions
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          body,
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          tag: `task-${task.id}`,
          requireInteraction: true,
          silent: false,
          vibrate: [200, 100, 200],
          data: { 
            taskId: task.id,
            action: 'task-reminder'
          },
          actions: [
            {
              action: 'complete',
              title: 'Mark Complete'
            },
            {
              action: 'snooze',
              title: 'Snooze 15 min'
            }
          ]
        });
        return;
      } catch (error) {
        console.error('Service worker notification failed:', error);
      }
    }
    
    // Fallback to regular notification without actions
    const options = {
      body,
      icon: '/favicon.svg',
      tag: `task-${task.id}`,
      requireInteraction: true,
      data: { 
        taskId: task.id,
        action: 'task-reminder'
      }
      // Note: No actions for regular notifications
    };

    return this.showNotification(title, options);
  }

  // Register service worker for background notifications
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
        
        // Subscribe to push notifications
        await this.subscribeToPush(registration);
        
        return registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  // Subscribe to push notifications
  async subscribeToPush(registration) {
    if ('PushManager' in window) {
      try {
        // First, check for existing subscription and unsubscribe if necessary
        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) {
          console.log('Found existing push subscription, unsubscribing first...');
          await existingSubscription.unsubscribe();
          console.log('Successfully unsubscribed from existing subscription');
        }
        
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(
            'BJPVlwpCxnv6hdAsbgspbI1xcE7_LwhJvDV2ibZ4alQ38WSzFzN6xf-QyYN2FUOP-miBMRTitIdVPSGb1mjYWZU'
          )
        });
        
        console.log('Push subscription obtained:', subscription);
        
        // Store subscription in Supabase for backend to use
        await this.savePushSubscription(subscription);
        
        return subscription;
      } catch (error) {
        console.error('Push subscription failed:', error);
      }
    }
  }

  // Save push subscription to Supabase (supports multiple devices)
  async savePushSubscription(subscription) {
    try {
      const { supabase } = await import('../supabaseClient');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No authenticated user to save subscription for');
        return;
      }

      // Extract subscription details
      const endpoint = subscription.endpoint;
      const keys = subscription.getKeys();
      const p256dh = btoa(String.fromCharCode(...new Uint8Array(keys.p256dh)));
      const auth = btoa(String.fromCharCode(...new Uint8Array(keys.auth)));
      
      // Get device information
      const userAgent = navigator.userAgent;
      const deviceName = this.getDeviceName(userAgent);
      
      console.log('Saving push subscription for device:', deviceName);
      
      // Save to push_subscriptions table (supports multiple devices)
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: endpoint,
          p256dh: p256dh,
          auth: auth,
          user_agent: userAgent,
          device_name: deviceName,
          last_used: new Date().toISOString()
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (error) {
        console.error('Error saving push subscription:', error);
      } else {
        console.log('Push subscription saved successfully for device:', deviceName);
      }
    } catch (error) {
      console.error('Error saving push subscription:', error);
    }
  }

  // Helper function to get device name from user agent
  getDeviceName(userAgent) {
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      if (/Android/.test(userAgent)) {
        return 'Android Device';
      } else if (/iPhone/.test(userAgent)) {
        return 'iPhone';
      } else if (/iPad/.test(userAgent)) {
        return 'iPad';
      } else {
        return 'Mobile Device';
      }
    } else {
      if (/Windows/.test(userAgent)) {
        return 'Windows Desktop';
      } else if (/Mac/.test(userAgent)) {
        return 'Mac Desktop';
      } else if (/Linux/.test(userAgent)) {
        return 'Linux Desktop';
      } else {
        return 'Desktop';
      }
    }
  }

  // Helper to convert VAPID key
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Start checking for due reminders periodically
  startReminderChecker() {
    // Check every minute
    this.checkInterval = setInterval(() => {
      this.checkDueReminders();
    }, 60000);
    
    // Also check immediately
    this.checkDueReminders();
  }

  // Stop the reminder checker
  stopReminderChecker() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // Check for due reminders (called periodically)
  async checkDueReminders() {
    try {
      // This would need to be updated to work with your current list/task system
      // For now, we'll rely on the backend service to send push notifications
      console.log('Checking for due reminders...');
    } catch (error) {
      console.error('Error checking reminders:', error);
    }
  }

  // Handle notification clicks
  handleNotificationClick(event) {
    event.notification.close();
    
    if (event.action === 'complete') {
      // Mark task as complete
      if (event.notification.data?.taskId) {
        tasksService.updateTask(event.notification.data.taskId, { completed: true });
      }
    } else if (event.action === 'snooze') {
      // Snooze for 15 minutes
      if (event.notification.data?.taskId) {
        const snoozeTime = new Date(Date.now() + 15 * 60 * 1000);
        tasksService.setReminder(event.notification.data.taskId, snoozeTime.toISOString());
      }
    } else {
      // Open the app
      clients.openWindow('/');
    }
  }
}

export const notificationService = new NotificationService();

// Export helper functions for use in components
export const initializeNotifications = () => notificationService.initializeNotifications();
export const registerNotifications = () => notificationService.requestNotificationPermission();

// Make notification service globally available for debugging
if (typeof window !== 'undefined') {
  window.notificationService = notificationService;
}
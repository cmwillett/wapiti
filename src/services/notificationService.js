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
    this.subscriptionPromise = null; // Add lock for subscription process
    this.initializationPromise = null; // Add lock for initialization process
    this.currentSubscription = null; // Track current active subscription
    this.isSubscribed = false; // Track subscription state
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
    // Prevent multiple simultaneous initialization attempts
    if (this.initializationPromise) {
      console.log('Initialization already in progress, waiting...');
      return await this.initializationPromise;
    }

    // Create a promise that we'll reuse for concurrent calls
    this.initializationPromise = this._doInitializeNotifications();
    
    try {
      const result = await this.initializationPromise;
      return result;
    } finally {
      // Clear the promise so future calls can proceed
      this.initializationPromise = null;
    }
  }

  // Internal initialization logic (protected from concurrent calls)
  async _doInitializeNotifications() {
    console.log('NotificationService: Starting initialization...');
    
    if ('Notification' in window) {
      this.permission = await Notification.requestPermission();
      console.log('NotificationService: Permission granted:', this.permission);
    }
    
    // Register service worker
    this.registration = await this.registerServiceWorker();
    
    // Start checking for due reminders every minute
    this.startReminderChecker();
    
    console.log('NotificationService: Initialization complete');
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
        console.log('NotificationService: Registering service worker...');
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('NotificationService: Service Worker registered:', registration);
        
        // Wait for service worker to be ready before subscribing to push
        await navigator.serviceWorker.ready;
        console.log('NotificationService: Service Worker ready, subscribing to push...');
        
        // Subscribe to push notifications
        await this.subscribeToPush(registration);
        
        return registration;
      } catch (error) {
        console.error('NotificationService: Service Worker registration failed:', error);
      }
    }
  }

  // Subscribe to push notifications
  async subscribeToPush(registration) {
    // Prevent multiple simultaneous subscription attempts
    if (this.subscriptionPromise) {
      console.log('NotificationService: Subscription already in progress, waiting...');
      return await this.subscriptionPromise;
    }

    console.log('NotificationService: Starting push subscription process...');
    
    // Create a promise that we'll reuse for concurrent calls
    this.subscriptionPromise = this._doSubscribeToPush(registration);
    
    try {
      const result = await this.subscriptionPromise;
      console.log('NotificationService: Push subscription completed successfully');
      return result;
    } finally {
      // Clear the promise so future calls can proceed
      this.subscriptionPromise = null;
    }
  }

  // Internal subscription logic (protected from concurrent calls)
  async _doSubscribeToPush(registration) {
    if ('PushManager' in window) {
      try {
        console.log('NotificationService: Starting subscription process...');
        console.log('NotificationService: Current subscription state:', this.isSubscribed);
        
        // If we already have a valid subscription, reuse it
        if (this.isSubscribed && this.currentSubscription) {
          console.log('NotificationService: Reusing existing valid subscription');
          return this.currentSubscription;
        }
        
        // Check if we already have a valid subscription
        let subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          console.log('NotificationService: Found existing push subscription:', subscription.endpoint);
          
          // Check if this subscription is already saved in database
          const isValid = await this.validateExistingSubscription(subscription);
          console.log('NotificationService: Subscription validation result:', isValid);
          
          if (isValid) {
            console.log('NotificationService: Existing subscription is valid, reusing it');
            this.currentSubscription = subscription;
            this.isSubscribed = true;
            return subscription;
          } else {
            console.log('NotificationService: Existing subscription is invalid, creating new one');
            await subscription.unsubscribe();
            subscription = null;
          }
        }
        
        // Create new subscription if we don't have a valid one
        if (!subscription) {
          console.log('NotificationService: Creating new push subscription...');
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: this.urlBase64ToUint8Array(
              'BJPVlwpCxnv6hdAsbgspbI1xcE7_LwhJvDV2ibZ4alQ38WSzFzN6xf-QyYN2FUOP-miBMRTitIdVPSGb1mjYWZU'
            )
          });
          
          console.log('NotificationService: New push subscription created:', subscription.endpoint);
          
          // Store subscription in Supabase for backend to use
          await this.savePushSubscription(subscription);
          
          // Update our internal state
          this.currentSubscription = subscription;
          this.isSubscribed = true;
        }
        
        return subscription;
      } catch (error) {
        console.error('NotificationService: Push subscription failed:', error);
        throw error;
      }
    }
    return null;
  }

  // Validate if existing subscription is saved in database
  async validateExistingSubscription(subscription) {
    try {
      console.log('NotificationService: Validating existing subscription...');
      const { supabase } = await import('../supabaseClient');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('NotificationService: No user found for validation');
        return false;
      }

      console.log('NotificationService: Checking database for endpoint:', subscription.endpoint.substring(0, 50) + '...');
      
      // Check if this endpoint exists in our database
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('id, device_name, created_at')
        .eq('user_id', user.id)
        .eq('endpoint', subscription.endpoint)
        .maybeSingle();

      if (error) {
        console.error('NotificationService: Error validating subscription:', error);
        return false;
      }

      // If we found a record, the subscription is valid
      const isValid = !!data;
      console.log('NotificationService: Validation result:', isValid, data ? `(Found: ${data.device_name})` : '(Not found in database)');
      return isValid;
    } catch (error) {
      console.error('NotificationService: Error validating subscription:', error);
      return false;
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

      // Extract subscription details safely
      const endpoint = subscription.endpoint;
      
      // Modern browsers use getKey() method separately for each key
      let p256dh, auth;
      try {
        const p256dhKey = subscription.getKey('p256dh');
        const authKey = subscription.getKey('auth');
        p256dh = btoa(String.fromCharCode(...new Uint8Array(p256dhKey)));
        auth = btoa(String.fromCharCode(...new Uint8Array(authKey)));
      } catch (keyError) {
        console.error('Error extracting subscription keys:', keyError);
        // Fallback for older browsers
        try {
          const keys = subscription.getKeys ? subscription.getKeys() : subscription.keys;
          p256dh = btoa(String.fromCharCode(...new Uint8Array(keys.p256dh)));
          auth = btoa(String.fromCharCode(...new Uint8Array(keys.auth)));
        } catch (fallbackError) {
          console.error('Fallback key extraction failed:', fallbackError);
          throw new Error('Unable to extract subscription keys');
        }
      }
      
      // Get device information
      const userAgent = navigator.userAgent;
      const deviceName = this.getDeviceName(userAgent);
      
      console.log('Saving push subscription for device:', deviceName);
      console.log('Endpoint:', endpoint.substring(0, 50) + '...');
      
      // Check if subscription already exists
      const { data: existing } = await supabase
        .from('push_subscriptions')
        .select('id, device_name, created_at')
        .eq('user_id', user.id)
        .eq('endpoint', endpoint)
        .maybeSingle();

      if (existing) {
        console.log(`Push subscription already exists for ${existing.device_name} (created ${existing.created_at})`);
        console.log('Skipping save to prevent duplicate');
        return existing;
      }
      
      // Save to push_subscriptions table (supports multiple devices)
      const { data, error } = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: user.id,
          endpoint: endpoint,
          p256dh: p256dh,
          auth: auth,
          user_agent: userAgent,
          device_name: deviceName
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving push subscription:', error);
        throw error;
      } else {
        console.log('Push subscription saved successfully for device:', deviceName);
        console.log('Subscription ID:', data.id);
        return data;
      }
    } catch (error) {
      console.error('Error saving push subscription:', error);
      throw error;
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

  // Check for due reminders (placeholder - actual logic handled by browserReminderChecker)
  async checkDueReminders() {
    // This is a placeholder method that gets called by the interval
    // The actual reminder checking logic is handled by browserReminderChecker
    console.log('Reminder check triggered at:', new Date().toLocaleTimeString());
    
    // The real work is done by the browser reminder checker service
    // which stores reminders in localStorage for the service worker
    return true;
  }

  // Stop the reminder checker
  stopReminderChecker() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // Clean up duplicate or old device registrations for current user
  async cleanupDeviceRegistrations() {
    try {
      const { supabase } = await import('../supabaseClient');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No authenticated user for cleanup');
        return;
      }

      console.log('Starting device registration cleanup for user:', user.id);

      // Get all subscriptions for this user
      const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching subscriptions for cleanup:', error);
        return;
      }

      if (!subscriptions || subscriptions.length <= 1) {
        console.log('No cleanup needed - user has', subscriptions?.length || 0, 'subscriptions');
        return;
      }

      console.log(`Found ${subscriptions.length} subscriptions, checking for duplicates...`);

      // Group by endpoint to find duplicates
      const endpointGroups = {};
      subscriptions.forEach(sub => {
        if (!endpointGroups[sub.endpoint]) {
          endpointGroups[sub.endpoint] = [];
        }
        endpointGroups[sub.endpoint].push(sub);
      });

      let deletedCount = 0;
      
      // For each endpoint, keep only the most recent one
      for (const [endpoint, subs] of Object.entries(endpointGroups)) {
        if (subs.length > 1) {
          console.log(`Found ${subs.length} duplicates for endpoint ${endpoint.substring(0, 50)}...`);
          
          // Sort by created_at descending, keep the first (most recent)
          subs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          const toDelete = subs.slice(1); // All except the most recent
          
          // Delete the duplicates
          for (const sub of toDelete) {
            const { error: deleteError } = await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id);
              
            if (deleteError) {
              console.error('Error deleting duplicate subscription:', deleteError);
            } else {
              deletedCount++;
              console.log(`Deleted duplicate subscription: ${sub.device_name} (${sub.created_at})`);
            }
          }
        }
      }

      console.log(`Cleanup complete. Deleted ${deletedCount} duplicate subscriptions.`);
      
      // Return summary
      return {
        totalBefore: subscriptions.length,
        deletedCount,
        totalAfter: subscriptions.length - deletedCount
      };
    } catch (error) {
      console.error('Error during device registration cleanup:', error);
    }
  }

  // Get device registration summary for current user
  async getDeviceRegistrationSummary() {
    try {
      const { supabase } = await import('../supabaseClient');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { error: 'No authenticated user' };
      }

      const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      // Group by endpoint to identify duplicates
      const endpointGroups = {};
      subscriptions?.forEach(sub => {
        const shortEndpoint = sub.endpoint.substring(0, 50) + '...';
        if (!endpointGroups[shortEndpoint]) {
          endpointGroups[shortEndpoint] = [];
        }
        endpointGroups[shortEndpoint].push(sub);
      });

      const duplicateEndpoints = Object.keys(endpointGroups).filter(
        endpoint => endpointGroups[endpoint].length > 1
      );

      return {
        totalSubscriptions: subscriptions?.length || 0,
        uniqueEndpoints: Object.keys(endpointGroups).length,
        duplicateEndpoints: duplicateEndpoints.length,
        devices: subscriptions?.map(sub => ({
          deviceName: sub.device_name,
          created: sub.created_at,
          endpoint: sub.endpoint.substring(0, 50) + '...'
        })) || []
      };
    } catch (error) {
      return { error: error.message };
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
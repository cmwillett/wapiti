// Notification service for handling reminders
import { tasksService } from './supabaseService';

class NotificationService {
  constructor() {
    this.permission = null;
    this.registration = null;
    this.checkInterval = null;
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
    
    const options = {
      body,
      icon: '/favicon.ico',
      tag: `task-${task.id}`, // Prevents duplicate notifications
      requireInteraction: true, // Keeps notification visible until user interacts
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
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(
            // You'll need to generate a VAPID key pair for production
            'BHd3KVnXjQxL4mIrWzuNwrRnwwG-6s-Y0YHgG0-P3xvJ7R3U9k2Dk1wJmFm5zqS4V8_gf2Mj3vMR5jMz8F-5D_Q'
          )
        });
        
        console.log('Push subscription:', subscription);
        // Store subscription in Supabase for backend to use
        // You'll need to implement this endpoint
        
        return subscription;
      } catch (error) {
        console.error('Push subscription failed:', error);
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

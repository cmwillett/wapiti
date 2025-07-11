// Simple browser-based reminder checker
// This runs while the app is open and checks for due reminders every minute

import { supabase } from '../supabaseClient';
import { tasksService } from './supabaseService';
import { notificationService } from './notificationService';

class BrowserReminderChecker {
  constructor() {
    this.checkInterval = null;
    this.isChecking = false;
  }

  start() {
    if (this.checkInterval) {
      this.stop();
    }

    console.log('Starting browser reminder checker...');
    
    // Check immediately
    this.checkReminders();
    
    // Then check every minute
    this.checkInterval = setInterval(() => {
      this.checkReminders();
    }, 60000); // 60 seconds
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('Stopped browser reminder checker');
    }
  }

  async checkReminders() {
    if (this.isChecking) return; // Prevent overlapping checks
    
    try {
      this.isChecking = true;
      console.log('Checking for due reminders...', new Date().toLocaleTimeString());

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all tasks with reminders for this user
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('reminder_sent', false)
        .eq('completed', false)
        .not('reminder_time', 'is', null);

      if (error) {
        console.error('Error fetching tasks for reminder check:', error);
        return;
      }

      const now = new Date();
      let remindersShown = 0;
      const pendingReminders = [];
      const allReminders = []; // Store all upcoming reminders, not just due ones

      // Check each task
      for (const task of tasks || []) {
        const reminderTime = new Date(task.reminder_time);
        
        // Store all upcoming reminders for service worker (within next 24 hours)
        const timeDiff = reminderTime.getTime() - now.getTime();
        if (timeDiff < 24 * 60 * 60 * 1000 && timeDiff > -30 * 60 * 1000) { // Within 24 hours future, or 30 minutes past
          allReminders.push({
            id: task.id,
            text: task.text,
            reminder_time: task.reminder_time
          });
        }
        
        if (reminderTime <= now) {
          // Store for immediate processing
          pendingReminders.push({
            id: task.id,
            text: task.text,
            reminder_time: task.reminder_time
          });
          
          // Show notification
          console.log(`📋 Attempting to show reminder for task: ${task.text}`);
          console.log(`🔔 Notification service available:`, notificationService ? 'Yes' : 'No');
          
          try {
            await notificationService.showTaskReminder(task);
            console.log(`✅ Notification service called successfully for: ${task.text}`);
          } catch (error) {
            console.error(`❌ Error calling notification service for task ${task.text}:`, error);
          }
          
          // Mark as sent in database
          await tasksService.updateTask(task.id, { reminder_sent: true });
          
          remindersShown++;
          console.log(`📝 Marked reminder as sent for task: ${task.text}`);
        }
      }

      // Always store all upcoming reminders in localStorage and IndexedDB for service worker
      const reminderData = {
        timestamp: Date.now(),
        reminders: allReminders.length > 0 ? allReminders : pendingReminders,
        lastCheck: now.toISOString()
      };
      
      if (allReminders.length > 0 || pendingReminders.length > 0) {
        localStorage.setItem('pendingReminders', JSON.stringify(reminderData));
        console.log(`Stored ${allReminders.length} upcoming reminders in localStorage`);
        
        // Also store in IndexedDB for service worker access
        try {
          await storeInIndexedDB('pendingReminders', reminderData);
          console.log('Stored upcoming reminders in IndexedDB for service worker');
        } catch (error) {
          console.error('Failed to store in IndexedDB:', error);
        }
      } else {
        // Still store timestamp for service worker to know we're active
        localStorage.setItem('pendingReminders', JSON.stringify(reminderData));
        try {
          await storeInIndexedDB('pendingReminders', reminderData);
        } catch (error) {
          console.error('Failed to store in IndexedDB:', error);
        }
      }

      if (remindersShown > 0) {
        console.log(`Showed ${remindersShown} reminder(s)`);
      }

    } catch (error) {
      console.error('Error in reminder check:', error);
    } finally {
      this.isChecking = false;
    }
  }
}

// Helper functions for IndexedDB
async function storeInIndexedDB(key, data) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('WapitiReminders', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('reminders')) {
        db.createObjectStore('reminders');
      }
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['reminders'], 'readwrite');
      const store = transaction.objectStore('reminders');
      
      const putRequest = store.put(data, key);
      
      putRequest.onsuccess = () => {
        db.close();
        resolve();
      };
      
      putRequest.onerror = () => {
        db.close();
        reject(putRequest.error);
      };
    };
  });
}

async function removeFromIndexedDB(key) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('WapitiReminders', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['reminders'], 'readwrite');
      const store = transaction.objectStore('reminders');
      
      const deleteRequest = store.delete(key);
      
      deleteRequest.onsuccess = () => {
        db.close();
        resolve();
      };
      
      deleteRequest.onerror = () => {
        db.close();
        reject(deleteRequest.error);
      };
    };
  });
}

// Export singleton instance
export const browserReminderChecker = new BrowserReminderChecker();

// Auto-start when imported
if (typeof window !== 'undefined') {
  // Make it accessible globally for debugging
  window.browserReminderChecker = browserReminderChecker;
  
  // Start checking when the module loads
  browserReminderChecker.start();
  
  // Stop when page unloads
  window.addEventListener('beforeunload', () => {
    browserReminderChecker.stop();
  });
  
  // Restart when page becomes visible (user switches back to tab)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      browserReminderChecker.start();
    }
  });
}

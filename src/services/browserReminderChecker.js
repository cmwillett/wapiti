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

      // Check each task
      for (const task of tasks || []) {
        const reminderTime = new Date(task.reminder_time);
        
        if (reminderTime <= now) {
          // Show notification
          await notificationService.showTaskReminder(task);
          
          // Mark as sent in database
          await tasksService.updateTask(task.id, { reminder_sent: true });
          
          remindersShown++;
          console.log(`Showed reminder for task: ${task.text}`);
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

// Export singleton instance
export const browserReminderChecker = new BrowserReminderChecker();

// Auto-start when imported
if (typeof window !== 'undefined') {
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

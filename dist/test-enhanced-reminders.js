// Test script to create a reminder that should trigger in 1 minute
console.log('=== Testing Enhanced Reminder System ===');

(async function() {
  try {
    // Get current user
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) {
      console.error('User not authenticated');
      return;
    }
    
    console.log('User ID:', user.id);
    
    // Create a test reminder for 1 minute from now
    const reminderTime = new Date(Date.now() + 60 * 1000); // 1 minute from now
    
    console.log('Creating test reminder for:', reminderTime.toLocaleString());
    
    const { data: task, error } = await window.supabase
      .from('tasks')
      .insert({
        text: `Enhanced Test Reminder - ${new Date().toLocaleTimeString()}`,
        completed: false,
        reminder_time: reminderTime.toISOString(),
        reminder_sent: false,
        user_id: user.id,
        list_id: null,
        notes: 'This is a test of the enhanced reminder system'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating test task:', error);
      return;
    }
    
    console.log('✅ Created test task:', task);
    console.log('⏰ Reminder set for:', new Date(task.reminder_time).toLocaleString());
    console.log('⏳ That\'s in about 1 minute from now');
    
    // Trigger browser reminder checker to update IndexedDB
    if (window.browserReminderChecker) {
      console.log('🔄 Triggering browser reminder checker to update IndexedDB...');
      await window.browserReminderChecker.checkReminders();
    }
    
    console.log('');
    console.log('📱 Test setup complete! In about 1 minute you should see:');
    console.log('   1. A push notification (if the Edge Function triggers)');
    console.log('   2. The notification should show the correct task text');
    console.log('   3. Check the browser console and service worker logs');
    console.log('');
    console.log('🔍 To monitor, open DevTools > Application > Service Workers');
    console.log('    and check the console for service worker logs');
    
  } catch (error) {
    console.error('Test setup error:', error);
  }
})();

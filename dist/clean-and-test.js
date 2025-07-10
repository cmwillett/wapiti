// Clean up old test reminders and create a fresh test
console.log('=== Clean Up and Fresh Test ===');

window.cleanAndTest = async function() {
  try {
    // Get current user
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) {
      console.error('❌ User not authenticated');
      return;
    }
    
    console.log('🧹 Cleaning up old test reminders...');
    
    // Delete old test reminders
    const { error: deleteError } = await window.supabase
      .from('tasks')
      .delete()
      .eq('user_id', user.id)
      .ilike('text', '%test%reminder%');
    
    if (deleteError) {
      console.error('❌ Error deleting old test reminders:', deleteError);
    } else {
      console.log('✅ Cleaned up old test reminders');
    }
    
    // Clear old IndexedDB data
    try {
      await clearIndexedDB();
      console.log('✅ Cleared old IndexedDB data');
    } catch (error) {
      console.log('⚠️ Could not clear IndexedDB:', error.message);
    }
    
    // Clear localStorage
    localStorage.removeItem('pendingReminders');
    console.log('✅ Cleared localStorage');
    
    console.log('');
    console.log('⏰ Creating fresh test reminder (2 minutes from now)...');
    
    // Create a fresh test reminder
    const reminderTime = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now
    const taskText = `Fresh Test Reminder - ${new Date().toLocaleTimeString()}`;
    
    const { data: task, error } = await window.supabase
      .from('tasks')
      .insert({
        text: taskText,
        completed: false,
        reminder_time: reminderTime.toISOString(),
        reminder_sent: false,
        user_id: user.id,
        list_id: null,
        notes: 'Fresh test of the enhanced reminder system'
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating fresh test task:', error);
      return;
    }
    
    console.log('✅ Created fresh test task:', task);
    console.log('⏰ Reminder set for:', new Date(task.reminder_time).toLocaleString());
    
    // Force browser reminder checker update
    if (window.browserReminderChecker) {
      console.log('🔄 Updating browser reminder checker...');
      await window.browserReminderChecker.checkReminders();
      console.log('✅ Browser reminder checker updated');
    } else {
      console.log('⚠️ Browser reminder checker not found - try refreshing the page');
    }
    
    console.log('');
    console.log('🎯 Fresh test setup complete!');
    console.log('📱 You should get a notification in 2 minutes');
    console.log('🔍 Run window.checkReminderSystemState() to verify');
    
    return task;
    
  } catch (error) {
    console.error('❌ Clean and test error:', error);
  }
};

// Helper to clear IndexedDB
function clearIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('WapitiReminders', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['reminders'], 'readwrite');
      const store = transaction.objectStore('reminders');
      
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
        db.close();
        resolve();
      };
      
      clearRequest.onerror = () => {
        db.close();
        reject(clearRequest.error);
      };
    };
  });
}

console.log('🧹 Ready! Run: window.cleanAndTest()');

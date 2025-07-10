// Simple test that doesn't require database cleanup
console.log('=== Simple Enhanced Reminder Test ===');

window.simpleTest = async function() {
  // Wait a moment for supabase to be available
  if (!window.supabase) {
    console.log('⏳ Waiting for supabase to be available...');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  if (!window.supabase) {
    console.error('❌ Supabase not available. Try refreshing the page.');
    return;
  }
  
  try {
    // Get current user
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) {
      console.error('❌ User not authenticated');
      return;
    }
    
    console.log('✅ User authenticated:', user.id);
    
    // Create a test reminder for 90 seconds from now
    const reminderTime = new Date(Date.now() + 90 * 1000); // 90 seconds from now
    const taskText = `Simple Test Reminder - ${new Date().toLocaleTimeString()}`;
    
    console.log('⏰ Creating test reminder for:', reminderTime.toLocaleString());
    
    const { data: task, error } = await window.supabase
      .from('tasks')
      .insert({
        text: taskText,
        completed: false,
        reminder_time: reminderTime.toISOString(),
        reminder_sent: false,
        user_id: user.id,
        list_id: null,
        notes: 'Simple test of enhanced reminders'
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating test task:', error);
      return;
    }
    
    console.log('✅ Created test task:', task);
    console.log('⏰ Reminder set for:', new Date(task.reminder_time).toLocaleString());
    console.log('⏳ That\'s in about 90 seconds from now');
    
    // Force browser reminder checker update if available
    if (window.browserReminderChecker) {
      console.log('🔄 Triggering browser reminder checker...');
      await window.browserReminderChecker.checkReminders();
      console.log('✅ Browser reminder checker updated');
      
      // Check what was stored
      const localData = localStorage.getItem('pendingReminders');
      if (localData) {
        const parsed = JSON.parse(localData);
        const ourTask = parsed.reminders?.find(r => r.id === task.id);
        if (ourTask) {
          console.log('✅ Test reminder is now in localStorage/IndexedDB');
        } else {
          console.log('⚠️ Test reminder not yet in storage (might be too far in future)');
        }
      }
    } else {
      console.log('⚠️ Browser reminder checker not available');
    }
    
    console.log('');
    console.log('🎯 Test setup complete!');
    console.log('📱 In about 90 seconds, you should see:');
    console.log('   1. A push notification');
    console.log('   2. With the text: "' + taskText + '"');
    console.log('   3. Thanks to the enhanced fallback system');
    console.log('');
    console.log('🔍 Monitor with: window.checkReminderSystemState()');
    
    return task;
    
  } catch (error) {
    console.error('❌ Simple test error:', error);
  }
};

// Quick status check
window.quickStatus = function() {
  console.log('📊 Quick Status:');
  console.log('   Supabase:', window.supabase ? '✅ Available' : '❌ Not available');
  console.log('   Browser Checker:', window.browserReminderChecker ? '✅ Available' : '❌ Not available');
  console.log('   Service Worker:', 'serviceWorker' in navigator ? '✅ Supported' : '❌ Not supported');
  
  const localData = localStorage.getItem('pendingReminders');
  if (localData) {
    try {
      const parsed = JSON.parse(localData);
      console.log('   Stored Reminders:', parsed.reminders?.length || 0);
    } catch (e) {
      console.log('   Stored Reminders: ❌ Corrupted data');
    }
  } else {
    console.log('   Stored Reminders: 0');
  }
};

console.log('🚀 Ready!');
console.log('   window.quickStatus() - Check current status');
console.log('   window.simpleTest() - Create a test reminder');

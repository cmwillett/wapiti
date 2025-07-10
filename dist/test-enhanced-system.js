// Comprehensive test for the enhanced reminder system
console.log('=== Testing Enhanced Reminder System (No CLI Version) ===');

window.testEnhancedReminders = async function() {
  try {
    // Get current user
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) {
      console.error('❌ User not authenticated');
      return;
    }
    
    console.log('✅ User authenticated:', user.id);
    
    // Create a test reminder for 2 minutes from now
    const reminderTime = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now
    
    console.log('⏰ Creating test reminder for:', reminderTime.toLocaleString());
    
    const taskText = `Enhanced Test Reminder - ${new Date().toLocaleTimeString()}`;
    
    const { data: task, error } = await window.supabase
      .from('tasks')
      .insert({
        text: taskText,
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
      console.error('❌ Error creating test task:', error);
      return;
    }
    
    console.log('✅ Created test task:', task);
    console.log('⏰ Reminder set for:', new Date(task.reminder_time).toLocaleString());
    console.log('⏳ That\'s in about 2 minutes from now');
    
    // Force browser reminder checker to update IndexedDB immediately
    if (window.browserReminderChecker) {
      console.log('🔄 Forcing browser reminder checker to update IndexedDB...');
      await window.browserReminderChecker.checkReminders();
      console.log('✅ Browser reminder checker updated');
    }
    
    // Check what's in IndexedDB
    console.log('🔍 Checking IndexedDB contents...');
    try {
      const idbData = await getFromIndexedDB('pendingReminders');
      console.log('📂 IndexedDB data:', idbData);
      
      if (idbData && idbData.reminders) {
        const ourReminder = idbData.reminders.find(r => r.id === task.id);
        if (ourReminder) {
          console.log('✅ Our test reminder is in IndexedDB:', ourReminder);
        } else {
          console.log('⚠️ Our test reminder is NOT in IndexedDB yet');
        }
      }
    } catch (idbError) {
      console.error('❌ Error reading IndexedDB:', idbError);
    }
    
    // Check localStorage too
    const localData = localStorage.getItem('pendingReminders');
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        console.log('📂 localStorage data:', parsed);
      } catch (e) {
        console.log('❌ Error parsing localStorage data');
      }
    }
    
    console.log('');
    console.log('🎯 Test setup complete! What should happen:');
    console.log('   1. ⏰ In about 2 minutes, you should get a push notification');
    console.log('   2. 📱 The notification should show: "' + taskText + '"');
    console.log('   3. 🔍 Even if FCM payload fails, the service worker should use IndexedDB');
    console.log('   4. ⚡ The enhanced timing logic should be more forgiving');
    console.log('');
    console.log('🔧 To monitor:');
    console.log('   • Open DevTools > Application > Service Workers');
    console.log('   • Watch the console for service worker logs');
    console.log('   • Check the Network tab for Edge Function calls');
    console.log('');
    console.log('📋 To test manually trigger Edge Function (if needed):');
    console.log('   window.testEdgeFunction()');
    
    // Set up a manual trigger function
    window.testEdgeFunction = async function() {
      try {
        console.log('🚀 Manually triggering Edge Function...');
        
        const response = await fetch('https://uiczcbezwwfhvahfdxax.supabase.co/functions/v1/check-reminders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const result = await response.json();
        console.log('📨 Edge Function response:', result);
        
      } catch (error) {
        console.error('❌ Error calling Edge Function:', error);
      }
    };
    
    return task;
    
  } catch (error) {
    console.error('❌ Test setup error:', error);
  }
};

// Helper function to read from IndexedDB
function getFromIndexedDB(key) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('WapitiReminders', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['reminders'], 'readonly');
      const store = transaction.objectStore('reminders');
      
      const getRequest = store.get(key);
      
      getRequest.onsuccess = () => {
        db.close();
        resolve(getRequest.result);
      };
      
      getRequest.onerror = () => {
        db.close();
        reject(getRequest.error);
      };
    };
  });
}

console.log('🚀 Ready! Run: window.testEnhancedReminders()');

// Test Actual FCM Push Events - Real push notification testing
// This simulates the actual FCM push event format more accurately

console.log('🔔 FCM Push Event Tester: Testing real push notification flow...');

async function testActualFCMPush() {
  try {
    console.log('\n=== 🔔 TESTING ACTUAL FCM PUSH EVENTS ===\n');
    
    // Get the current push subscription
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      console.error('❌ No push subscription found');
      return;
    }
    
    console.log('📱 Current subscription endpoint:', subscription.endpoint);
    
    // Test 1: Send a direct FCM push via our Edge Function
    console.log('\n1️⃣ Testing via Edge Function (simulates real FCM)...');
    
    try {
      // This should trigger the actual Edge Function which sends real FCM push
      const response = await fetch('https://uiczcbezwwfhvahfdxax.supabase.co/functions/v1/check-reminders/test-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.supabase?.auth?.session?.access_token || 'anonymous'}`
        },
        body: JSON.stringify({
          message: 'Test FCM push notification',
          user_id: 'test-user'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Edge Function test-push response:', result);
        console.log('   📨 This should trigger a REAL FCM push notification');
        console.log('   🕐 Wait 10-15 seconds for the notification to appear...');
      } else {
        console.error('❌ Edge Function test failed:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('   Error details:', errorText);
      }
    } catch (error) {
      console.error('❌ Edge Function test error:', error);
    }
    
    // Test 2: Manually create a test reminder and let the system handle it
    console.log('\n2️⃣ Creating test reminder for immediate trigger...');
    
    try {
      // Create a task with a reminder set for 30 seconds from now
      const testTime = new Date();
      testTime.setSeconds(testTime.getSeconds() + 30);
      
      console.log('🕐 Creating test reminder for:', testTime.toLocaleTimeString());
      console.log('   📝 This will test the full end-to-end flow');
      console.log('   ⏰ Notification should appear in ~30 seconds');
      
      // We'll need to use the app's supabase client to create this
      if (window.supabase) {
        const { data, error } = await window.supabase
          .from('tasks')
          .insert([
            {
              text: `🧪 FCM Test Reminder - ${new Date().toLocaleTimeString()}`,
              reminder_time: testTime.toISOString(),
              completed: false,
              list_id: 1 // Assuming a default list exists
            }
          ])
          .select();
        
        if (error) {
          console.error('❌ Failed to create test reminder:', error);
        } else {
          console.log('✅ Test reminder created:', data);
          console.log('   🎯 This will trigger the real FCM flow in ~30 seconds');
        }
      } else {
        console.warn('⚠️ Supabase client not available, skipping database test');
      }
    } catch (error) {
      console.error('❌ Test reminder creation failed:', error);
    }
    
    // Test 3: Check if we can listen for actual push events
    console.log('\n3️⃣ Setting up real push event listener...');
    
    try {
      // Add a temporary listener to log actual push events
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'PUSH_EVENT_DEBUG') {
          console.log('🔔 REAL PUSH EVENT DETECTED:', event.data);
        }
      });
      
      // Send a message to the SW to enable push event debugging
      navigator.serviceWorker.controller?.postMessage({
        type: 'ENABLE_PUSH_DEBUG'
      });
      
      console.log('✅ Push event debugging enabled');
      console.log('   📡 Real push events will now be logged to console');
    } catch (error) {
      console.error('❌ Push event listener setup failed:', error);
    }
    
    // Test 4: Verify the service worker can handle actual push data formats
    console.log('\n4️⃣ Testing with FCM-style data formats...');
    
    const fcmFormats = [
      {
        name: 'FCM Data-only',
        data: JSON.stringify({
          data: {
            title: 'FCM Test',
            body: 'This mimics real FCM data-only format',
            taskId: '123'
          }
        })
      },
      {
        name: 'FCM Notification',
        data: JSON.stringify({
          notification: {
            title: 'FCM Test',
            body: 'This mimics real FCM notification format'
          },
          data: {
            taskId: '123'
          }
        })
      }
    ];
    
    for (const format of fcmFormats) {
      console.log(`   Testing ${format.name}...`);
      
      // This more closely simulates how FCM delivers data to the push event
      navigator.serviceWorker.controller?.postMessage({
        type: 'simulate-real-push',
        pushData: format.data
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait between tests
    }
    
    console.log('\n🎯 FCM Push Test Summary:');
    console.log('   1. Edge Function test - triggers real FCM push');
    console.log('   2. Database reminder - tests full end-to-end flow');
    console.log('   3. Push event debugging - monitors real push events');
    console.log('   4. FCM format simulation - tests data format handling');
    console.log('\n✅ FCM push testing complete!');
    console.log('   📱 Watch for notifications in the next 30-60 seconds...');
    
  } catch (error) {
    console.error('❌ FCM push testing failed:', error);
  }
}

// Function to check current reminder status
async function checkReminderStatus() {
  try {
    console.log('\n🔍 Checking current reminder status...');
    
    if (window.supabase) {
      const { data: tasks, error } = await window.supabase
        .from('tasks')
        .select('*')
        .not('reminder_time', 'is', null)
        .order('reminder_time', { ascending: true });
      
      if (error) {
        console.error('❌ Failed to fetch reminders:', error);
      } else {
        console.log('📝 Current reminders:');
        tasks.forEach(task => {
          const reminderTime = new Date(task.reminder_time);
          const now = new Date();
          const diff = reminderTime.getTime() - now.getTime();
          const isOverdue = diff < 0;
          const minutes = Math.abs(diff / 1000 / 60);
          const timeStr = isOverdue ? `${minutes.toFixed(1)} min ago` : `in ${minutes.toFixed(1)} min`;
          
          console.log(`   - "${task.text}" - ${reminderTime.toLocaleTimeString()} (${timeStr})`);
        });
      }
    } else {
      console.warn('⚠️ Supabase client not available');
    }
  } catch (error) {
    console.error('❌ Reminder status check failed:', error);
  }
}

// Auto-run the test
testActualFCMPush();

// Expose functions for manual testing
window.testActualFCMPush = testActualFCMPush;
window.checkReminderStatus = checkReminderStatus;

console.log('\n🎮 Manual test functions available:');
console.log('   - window.testActualFCMPush() - Test real FCM push flow');
console.log('   - window.checkReminderStatus() - Check current reminders');

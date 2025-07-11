// Multi-Device Notification Test Script
// Run this in your mobile browser console to test push notifications

console.log('🔔 Starting Multi-Device Notification Test...');

async function testMultiDeviceNotifications() {
  try {
    // Wait for supabase to be available
    if (typeof window.supabase === 'undefined') {
      console.log('⏳ Waiting for supabase to load...');
      await new Promise(resolve => {
        const checkSupabase = () => {
          if (typeof window.supabase !== 'undefined') {
            resolve();
          } else {
            setTimeout(checkSupabase, 100);
          }
        };
        checkSupabase();
      });
    }

    const supabase = window.supabase;
    
    // 1. Check if we're authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ Not authenticated. Please log in first.');
      return;
    }
    console.log('✅ Authenticated as user:', user.id);

    // 2. Check notification permission
    console.log('📱 Notification permission:', Notification.permission);
    
    // 3. Check service worker status
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      console.log('🔧 Service worker ready:', registration);
      
      const subscription = await registration.pushManager.getSubscription();
      console.log('📩 Current push subscription:', subscription ? 'EXISTS' : 'NONE');
      
      if (subscription) {
        console.log('📱 Push endpoint:', subscription.endpoint.substring(0, 50) + '...');
      }
    }

    // 4. Check how many devices are registered for this user
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id);
    
    if (subError) {
      console.error('❌ Error fetching subscriptions:', subError);
    } else {
      console.log(`📱 Found ${subscriptions.length} registered device(s):`);
      subscriptions.forEach((sub, index) => {
        console.log(`  Device ${index + 1}: ${sub.device_name} (${sub.endpoint.substring(0, 50)}...)`);
      });
    }

    // 5. Test notification service if available
    if (typeof notificationService !== 'undefined') {
      console.log('🔔 Testing notification service...');
      const result = await notificationService.requestPermission();
      console.log('✅ Notification service result:', result);
    } else {
      console.log('⚠️ notificationService not available globally');
    }

    // 6. Create a test reminder for 1 minute from now
    const reminderTime = new Date(Date.now() + 60 * 1000); // 1 minute from now
    const testTaskText = `Test reminder created at ${new Date().toLocaleTimeString()}`;

    console.log('📝 Creating test task with reminder...');
    console.log('⏰ Reminder time:', reminderTime.toISOString());

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        text: testTaskText,
        completed: false,
        reminder_time: reminderTime.toISOString(),
        reminder_sent: false,
        list_id: null // Will use default list
      })
      .select()
      .single();

    if (taskError) {
      console.error('❌ Error creating test task:', taskError);
      return;
    }

    console.log('✅ Test task created:', task);
    console.log('⏱️ You should receive a notification in about 1 minute.');
    console.log('📱 Make sure to close/background the app to test background notifications.');

    // 7. Test Edge Function manually (optional)
    console.log('🔧 Testing Edge Function manually...');
    try {
      const edgeResponse = await fetch(`${supabase.supabaseUrl}/functions/v1/check-reminders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const edgeResult = await edgeResponse.json();
      console.log('🚀 Edge Function test result:', edgeResult);
    } catch (edgeError) {
      console.log('⚠️ Edge Function test failed (this is normal if no reminders are due):', edgeError.message);
    }

    return {
      success: true,
      taskId: task.id,
      reminderTime: reminderTime.toISOString(),
      deviceCount: subscriptions.length,
      message: 'Test reminder created. You should get notified in 1 minute on all your devices!'
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error.message };
  }
}

// Auto-run the test
testMultiDeviceNotifications().then(result => {
  console.log('🎯 Test Complete:', result);
  
  if (result.success) {
    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log('1. Close or background this app');
    console.log('2. Wait about 1 minute');
    console.log('3. You should receive a push notification');
    console.log('4. Check Supabase Edge Function logs for delivery details');
    console.log('');
    console.log('🔍 To check logs:');
    console.log('- Go to Supabase Dashboard → Edge Functions → check-reminders → Logs');
    console.log('- Look for messages showing notification delivery to multiple devices');
  }
});

// Make function available globally for manual testing
window.testMultiDeviceNotifications = testMultiDeviceNotifications;

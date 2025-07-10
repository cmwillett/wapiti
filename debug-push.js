// Comprehensive push notification debugging script
async function debugPushNotifications() {
  console.log('=== Push Notification Debug ===');
  
  try {
    // 1. Check service worker registration
    console.log('1. Checking service worker...');
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }
    
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!registration) {
      console.log('❌ No service worker registration found');
      return;
    }
    console.log('✅ Service worker registered:', registration);
    
    // 2. Check if service worker is active
    if (registration.active) {
      console.log('✅ Service worker is active');
    } else {
      console.log('❌ Service worker is not active');
    }
    
    // 3. Check push subscription
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      console.log('❌ No push subscription found');
      return;
    }
    console.log('✅ Push subscription exists:', subscription);
    
    // 4. Check notification permission
    console.log('2. Checking notification permission...');
    const permission = Notification.permission;
    console.log('Notification permission:', permission);
    if (permission !== 'granted') {
      console.log('❌ Notification permission not granted');
      return;
    }
    console.log('✅ Notification permission granted');
    
    // 5. Test local notification
    console.log('3. Testing local notification...');
    const testNotification = new Notification('🧪 Test Notification', {
      body: 'This is a test to verify local notifications work',
      icon: '/favicon.ico',
      tag: 'test'
    });
    console.log('✅ Local notification created');
    
    // 6. Check if subscription is saved in Supabase
    console.log('4. Checking Supabase subscription...');
    const { supabase } = await import('./src/supabaseClient.js');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('❌ No authenticated user');
      return;
    }
    
    const { data: userPrefs, error } = await supabase
      .from('user_preferences')
      .select('push_subscription, notification_method')
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      console.log('❌ Error fetching user preferences:', error);
      return;
    }
    
    if (!userPrefs?.push_subscription) {
      console.log('❌ No push subscription saved in Supabase');
      return;
    }
    
    console.log('✅ Push subscription saved in Supabase');
    console.log('Notification method:', userPrefs.notification_method);
    
    // 7. Test Edge Function directly
    console.log('5. Testing Edge Function...');
    const response = await fetch(`${supabase.supabaseUrl}/functions/v1/check-reminders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabase.supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    console.log('Edge Function response:', result);
    
    // 8. Create a test reminder for immediate testing
    console.log('6. Creating test reminder...');
    const testTime = new Date(Date.now() + 30000).toISOString(); // 30 seconds from now
    
    const { data: lists } = await supabase
      .from('lists')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);
    
    if (lists && lists.length > 0) {
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          text: '🧪 Test Push Notification',
          list_id: lists[0].id,
          user_id: user.id,
          reminder_time: testTime,
          reminder_sent: false,
          completed: false
        })
        .select()
        .single();
      
      if (taskError) {
        console.log('❌ Error creating test task:', taskError);
      } else {
        console.log('✅ Test task created, reminder set for:', testTime);
        console.log('Task ID:', task.id);
        console.log('Wait 30 seconds, then check Edge Function again...');
      }
    }
    
    console.log('=== Debug Complete ===');
    return {
      serviceWorkerActive: !!registration.active,
      pushSubscriptionExists: !!subscription,
      notificationPermission: permission,
      subscriptionSaved: !!userPrefs?.push_subscription,
      notificationMethod: userPrefs?.notification_method
    };
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    return { error: error.message };
  }
}

// Test service worker message handling
async function testServiceWorkerMessages() {
  console.log('=== Testing Service Worker Messages ===');
  
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (registration && registration.active) {
      // Test message to service worker
      registration.active.postMessage({
        type: 'TEST_MESSAGE',
        data: { test: true }
      });
      console.log('✅ Test message sent to service worker');
    }
  }
}

// Make functions available globally
window.debugPushNotifications = debugPushNotifications;
window.testServiceWorkerMessages = testServiceWorkerMessages;

console.log('Debug script loaded. Run:');
console.log('- window.debugPushNotifications() - Full debug check');
console.log('- window.testServiceWorkerMessages() - Test SW messages');

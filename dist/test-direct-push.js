// Simple push notification test using the exact same mechanism as reminders
console.log('=== Direct Push Test ===');

window.testDirectPush = async function() {
  try {
    if (!window.supabase) {
      console.error('❌ Supabase not available');
      return;
    }

    console.log('🚀 Testing direct push notification...');
    
    // Get the current push subscription
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        console.error('❌ No push subscription found');
        return;
      }
      
      console.log('✅ Found push subscription');
      console.log('📍 Endpoint:', subscription.endpoint.substring(0, 50) + '...');
      
      // Show a test notification directly via service worker
      console.log('📱 Showing test service worker notification...');
      
      await registration.showNotification('🧪 Direct Push Test', {
        body: 'This is a direct test of the service worker notification system',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: 'direct-push-test',
        requireInteraction: true,
        silent: false,
        vibrate: [300, 100, 300],
        actions: [
          { action: 'success', title: '✅ Success!' },
          { action: 'close', title: 'Close' }
        ],
        data: {
          testType: 'direct-push',
          timestamp: Date.now()
        }
      });
      
      console.log('✅ Direct service worker notification sent');
      console.log('');
      console.log('🎯 You should see a notification with:');
      console.log('   Title: "🧪 Direct Push Test"');
      console.log('   Body: "This is a direct test..."');
      console.log('   Actions: "✅ Success!" and "Close"');
      console.log('');
      console.log('💡 If this works but Edge Function notifications don\'t,');
      console.log('    the issue is with the push payload from the Edge Function.');
      
    } else {
      console.error('❌ Service Worker not supported');
    }
    
  } catch (error) {
    console.error('❌ Direct push test error:', error);
  }
};

// Test if we can trigger a push event manually
window.testManualPush = async function() {
  try {
    console.log('🔄 Testing manual push event...');
    
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const sw = registration.active;
      
      if (sw) {
        // Send a message to the service worker to simulate a push
        sw.postMessage({
          type: 'TEST_PUSH',
          data: {
            title: '🔄 Manual Push Test',
            body: 'This is a manual push test message',
            taskId: 999,
            action: 'test-manual-push'
          }
        });
        
        console.log('✅ Manual push message sent to service worker');
        console.log('🎯 Check if you see a notification from the manual push');
      }
    }
    
  } catch (error) {
    console.error('❌ Manual push test error:', error);
  }
};

console.log('🧪 Ready!');
console.log('   window.testDirectPush() - Test direct service worker notification');
console.log('   window.testManualPush() - Test manual push simulation');

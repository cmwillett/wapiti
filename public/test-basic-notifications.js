// Test if basic notifications are working
console.log('=== Basic Notification Test ===');

window.testBasicNotifications = async function() {
  console.log('🔔 Testing basic notification functionality...');
  
  // Check notification permission
  console.log('📋 Notification permission:', Notification.permission);
  
  if (Notification.permission === 'denied') {
    console.log('❌ Notifications are BLOCKED! You need to:');
    console.log('   1. Click the 🔒 lock icon in your browser address bar');
    console.log('   2. Set notifications to "Allow"');
    console.log('   3. Refresh the page');
    return;
  }
  
  if (Notification.permission !== 'granted') {
    console.log('🔔 Requesting notification permission...');
    const permission = await Notification.requestPermission();
    console.log('📋 Permission result:', permission);
    
    if (permission !== 'granted') {
      console.log('❌ Permission denied. Cannot test notifications.');
      return;
    }
  }
  
  console.log('✅ Testing simple browser notification...');
  
  try {
    // Test simple browser notification
    const notification = new Notification('🧪 Test Notification', {
      body: 'This is a test notification from the browser',
      icon: '/favicon.svg',
      tag: 'test-notification'
    });
    
    console.log('✅ Simple notification created successfully');
    
    // Close after 3 seconds
    setTimeout(() => {
      notification.close();
      console.log('✅ Simple notification closed');
    }, 3000);
    
  } catch (error) {
    console.error('❌ Simple notification failed:', error);
  }
  
  // Test service worker notification
  if ('serviceWorker' in navigator) {
    try {
      console.log('✅ Testing service worker notification...');
      
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('🔧 Service Worker Test', {
        body: 'This is a test notification from the service worker',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: 'sw-test-notification',
        requireInteraction: true,
        actions: [
          { action: 'ok', title: 'OK' },
          { action: 'cancel', title: 'Cancel' }
        ]
      });
      
      console.log('✅ Service worker notification created successfully');
      
    } catch (error) {
      console.error('❌ Service worker notification failed:', error);
    }
  }
  
  console.log('');
  console.log('🎯 You should have seen 2 notifications:');
  console.log('   1. A simple browser notification (auto-closes in 3 sec)');
  console.log('   2. A service worker notification (with action buttons)');
  console.log('');
  console.log('💡 If you didn\'t see them, check:');
  console.log('   • Browser notification settings');
  console.log('   • Windows notification settings');
  console.log('   • Do Not Disturb mode');
};

console.log('🔔 Ready! Run: window.testBasicNotifications()');

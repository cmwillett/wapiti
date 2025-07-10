// Comprehensive notification debugging and final test
console.log('=== Final Notification Debug Test ===');

window.finalNotificationTest = async function() {
  console.log('🔍 Running comprehensive notification test...');
  
  // Test 1: Check notification permission
  console.log('1️⃣ Checking notification permission...');
  console.log('   Permission:', Notification.permission);
  
  if (Notification.permission !== 'granted') {
    console.log('❌ Notifications not granted! Requesting permission...');
    const permission = await Notification.requestPermission();
    console.log('   New permission:', permission);
    
    if (permission !== 'granted') {
      console.log('❌ Cannot proceed without notification permission');
      return;
    }
  }
  
  // Test 2: Basic browser notification
  console.log('2️⃣ Testing basic browser notification...');
  try {
    const browserNotif = new Notification('🧪 Browser Test', {
      body: 'Basic browser notification test',
      icon: '/favicon.svg',
      requireInteraction: false // Don't require interaction for this test
    });
    
    console.log('✅ Browser notification created');
    
    // Auto close after 3 seconds
    setTimeout(() => {
      browserNotif.close();
      console.log('✅ Browser notification closed');
    }, 3000);
    
    // Wait a moment before next test
    await new Promise(resolve => setTimeout(resolve, 1000));
    
  } catch (error) {
    console.error('❌ Browser notification failed:', error);
  }
  
  // Test 3: Service worker notification
  console.log('3️⃣ Testing service worker notification...');
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      console.log('✅ Service worker ready');
      
      await registration.showNotification('🔧 Service Worker Test', {
        body: 'Service worker notification test',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: 'sw-test',
        requireInteraction: false, // Don't require interaction for this test
        silent: false,
        vibrate: [200, 100, 200]
      });
      
      console.log('✅ Service worker notification sent');
      
    } catch (error) {
      console.error('❌ Service worker notification failed:', error);
    }
  }
  
  // Test 4: Check Windows/system notification settings
  console.log('4️⃣ Checking system notification status...');
  
  // Check if we're in a visible window
  console.log('   Document visible:', !document.hidden);
  console.log('   Window focused:', document.hasFocus());
  
  // Check user agent for OS detection
  const isWindows = navigator.userAgent.includes('Windows');
  console.log('   Operating System:', isWindows ? 'Windows' : 'Other');
  
  if (isWindows) {
    console.log('');
    console.log('💡 Windows notification troubleshooting:');
    console.log('   1. Check Windows notification settings:');
    console.log('      Settings > System > Notifications & actions');
    console.log('   2. Ensure notifications are enabled for Chrome/browser');
    console.log('   3. Check Focus Assist (Do Not Disturb) settings');
    console.log('   4. Try clicking the browser notification permission icon');
  }
  
  // Test 5: Manual notification timing
  console.log('5️⃣ Testing timed notifications...');
  console.log('   Will show 3 notifications over the next 6 seconds...');
  
  for (let i = 1; i <= 3; i++) {
    setTimeout(async () => {
      try {
        const testNotif = new Notification(`🕐 Timed Test ${i}`, {
          body: `This is timed notification #${i} - you should see this!`,
          icon: '/favicon.svg',
          tag: `timed-test-${i}`,
          requireInteraction: false
        });
        
        console.log(`✅ Timed notification ${i} sent`);
        
        // Close after 2 seconds
        setTimeout(() => testNotif.close(), 2000);
        
      } catch (error) {
        console.error(`❌ Timed notification ${i} failed:`, error);
      }
    }, i * 2000); // 2 seconds apart
  }
  
  console.log('');
  console.log('🎯 What you should see:');
  console.log('   • 1 browser notification (3 seconds)');
  console.log('   • 1 service worker notification');
  console.log('   • 3 timed notifications (2 seconds apart)');
  console.log('');
  console.log('🔍 If you see NONE of these notifications, the issue is:');
  console.log('   • Windows notification settings');
  console.log('   • Browser notification settings');
  console.log('   • Focus Assist/Do Not Disturb mode');
  console.log('');
  console.log('💡 If you see SOME but not all, there may be:');
  console.log('   • Service worker registration issues');
  console.log('   • Notification timing/conflict issues');
};

// Quick system check
window.quickSystemCheck = function() {
  console.log('🔍 Quick System Check:');
  console.log('   Notification API:', 'Notification' in window ? '✅ Available' : '❌ Not available');
  console.log('   Service Worker:', 'serviceWorker' in navigator ? '✅ Available' : '❌ Not available');
  console.log('   Push Manager:', 'PushManager' in window ? '✅ Available' : '❌ Not available');
  console.log('   Permission:', Notification.permission);
  console.log('   Page visible:', !document.hidden);
  console.log('   Page focused:', document.hasFocus());
  console.log('   User agent:', navigator.userAgent.substring(0, 100) + '...');
};

console.log('🧪 Ready!');
console.log('   window.quickSystemCheck() - Quick system info');
console.log('   window.finalNotificationTest() - Comprehensive test');

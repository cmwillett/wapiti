// Debug Push Notifications - Comprehensive diagnostics and testing
// This script tests the full push notification flow to identify where notifications fail

console.log('🔍 Debug Push Notifications: Starting comprehensive diagnostics...');

async function debugPushNotifications() {
  try {
    console.log('\n=== 🔍 PUSH NOTIFICATION DIAGNOSTICS ===\n');
    
    // 1. Check service worker state
    console.log('1️⃣ Checking Service Worker State...');
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      console.log('✅ Service Worker registered:', registration);
      console.log('   - Active:', !!registration.active);
      console.log('   - Installing:', !!registration.installing);
      console.log('   - Waiting:', !!registration.waiting);
      console.log('   - Scope:', registration.scope);
      
      if (registration.active) {
        console.log('   - State:', registration.active.state);
        console.log('   - Script URL:', registration.active.scriptURL);
      }
    } else {
      console.error('❌ Service Worker not supported');
      return;
    }
    
    // 2. Check notification permission
    console.log('\n2️⃣ Checking Notification Permission...');
    console.log('   - Permission:', Notification.permission);
    if (Notification.permission !== 'granted') {
      console.error('❌ Notification permission not granted');
      return;
    }
    
    // 3. Check push subscription
    console.log('\n3️⃣ Checking Push Subscription...');
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      console.error('❌ No push subscription found');
      return;
    }
    
    console.log('✅ Push subscription exists');
    console.log('   - Endpoint:', subscription.endpoint);
    console.log('   - Keys:', {
      p256dh: subscription.getKey('p256dh') ? 'present' : 'missing',
      auth: subscription.getKey('auth') ? 'present' : 'missing'
    });
    
    // 4. Test manual notification (should work if setup is correct)
    console.log('\n4️⃣ Testing Manual Notification...');
    try {
      const manualNotification = new Notification('🧪 Manual Test', {
        body: 'This is a manual notification test - should appear immediately',
        icon: '/favicon.svg',
        tag: 'manual-test'
      });
      console.log('✅ Manual notification created successfully');
      
      // Close after 3 seconds
      setTimeout(() => {
        manualNotification.close();
        console.log('   - Manual notification closed');
      }, 3000);
    } catch (error) {
      console.error('❌ Manual notification failed:', error);
    }
    
    // 5. Test service worker showNotification
    console.log('\n5️⃣ Testing Service Worker showNotification...');
    try {
      await registration.showNotification('🧪 SW Test', {
        body: 'This is a service worker notification test - should appear immediately',
        icon: '/favicon.svg',
        tag: 'sw-test',
        requireInteraction: false,
        actions: [
          { action: 'test', title: 'Test Action' }
        ]
      });
      console.log('✅ Service worker notification created successfully');
    } catch (error) {
      console.error('❌ Service worker notification failed:', error);
    }
    
    // 6. Test push event simulation
    console.log('\n6️⃣ Testing Push Event Simulation...');
    try {
      // Send a message to the service worker to simulate a push event
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        console.log('📨 Response from service worker:', event.data);
      };
      
      navigator.serviceWorker.controller?.postMessage({
        type: 'test-push',
        data: {
          title: '🧪 Simulated Push',
          body: 'This simulates a push notification from the server',
          taskId: 999,
          action: 'test-reminder'
        }
      }, [messageChannel.port2]);
      
      console.log('✅ Push simulation message sent to service worker');
    } catch (error) {
      console.error('❌ Push simulation failed:', error);
    }
    
    // 7. Test with various payload formats
    console.log('\n7️⃣ Testing Various Payload Formats...');
    
    const testPayloads = [
      {
        name: 'Data-only format',
        payload: {
          data: {
            title: '🧪 Data Format Test',
            body: 'Testing data-only payload format',
            taskId: 100,
            action: 'task-reminder'
          }
        }
      },
      {
        name: 'Direct format',
        payload: {
          title: '🧪 Direct Format Test',
          body: 'Testing direct payload format',
          taskId: 101,
          action: 'task-reminder'
        }
      },
      {
        name: 'Legacy format',
        payload: {
          taskId: 102,
          text: 'Testing legacy payload format'
        }
      }
    ];
    
    for (const test of testPayloads) {
      try {
        console.log(`   Testing ${test.name}...`);
        
        navigator.serviceWorker.controller?.postMessage({
          type: 'test-push',
          data: test.payload
        });
        
        console.log(`   ✅ ${test.name} message sent`);
        
        // Wait a bit between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`   ❌ ${test.name} failed:`, error);
      }
    }
    
    // 8. Check browser-specific issues
    console.log('\n8️⃣ Checking Browser-Specific Issues...');
    console.log('   - User Agent:', navigator.userAgent);
    console.log('   - Platform:', navigator.platform);
    console.log('   - Online:', navigator.onLine);
    console.log('   - Cookies enabled:', navigator.cookieEnabled);
    
    // Check if notifications are being blocked by OS/browser
    if ('Notification' in window) {
      console.log('   - Notification API available: ✅');
      console.log('   - Max actions supported:', Notification.maxActions || 'unknown');
    }
    
    // 9. Test notification visibility and timing
    console.log('\n9️⃣ Testing Notification Visibility and Timing...');
    
    let notificationCount = 0;
    const testNotificationVisibility = () => {
      notificationCount++;
      const notification = new Notification(`🧪 Visibility Test ${notificationCount}`, {
        body: `Testing if notifications are visible - Test #${notificationCount}`,
        tag: `visibility-test-${notificationCount}`,
        icon: '/favicon.svg',
        requireInteraction: false
      });
      
      console.log(`   - Created notification #${notificationCount}`);
      
      notification.onclick = () => {
        console.log(`   - ✅ Notification #${notificationCount} was clicked!`);
        notification.close();
      };
      
      notification.onshow = () => {
        console.log(`   - ✅ Notification #${notificationCount} was shown!`);
      };
      
      notification.onerror = (error) => {
        console.error(`   - ❌ Notification #${notificationCount} error:`, error);
      };
      
      notification.onclose = () => {
        console.log(`   - 📝 Notification #${notificationCount} was closed`);
      };
      
      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);
    };
    
    // Create a few test notifications with delays
    testNotificationVisibility();
    setTimeout(testNotificationVisibility, 3000);
    setTimeout(testNotificationVisibility, 6000);
    
    // 10. Check system notification settings
    console.log('\n🔟 System Notification Information...');
    console.log('   Note: Check your system notification settings:');
    console.log('   - Windows: Settings > System > Notifications & actions');
    console.log('   - macOS: System Preferences > Notifications');
    console.log('   - Linux: System settings > Notifications');
    console.log('   - Make sure browser notifications are enabled');
    console.log('   - Check if "Do Not Disturb" mode is active');
    
    // Summary
    console.log('\n🎯 DIAGNOSTIC SUMMARY:');
    console.log('   - If manual notifications work but push doesn\'t: Service worker issue');
    console.log('   - If no notifications appear at all: System/browser blocking');
    console.log('   - If notifications appear but wrong content: Payload parsing issue');
    console.log('   - If some formats work but others don\'t: Format handling issue');
    
    console.log('\n✅ Diagnostic complete! Check the results above.');
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  }
}

// Auto-run the diagnostics
debugPushNotifications();

// Also expose for manual testing
window.debugPushNotifications = debugPushNotifications;
window.testManualNotification = () => {
  new Notification('🧪 Quick Manual Test', {
    body: 'Manual notification test from console',
    icon: '/favicon.svg'
  });
};

window.testSWNotification = async () => {
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification('🧪 Quick SW Test', {
    body: 'Service worker notification test from console',
    icon: '/favicon.svg'
  });
};

console.log('\n🎮 Additional manual test functions available:');
console.log('   - window.testManualNotification() - Test manual notification');
console.log('   - window.testSWNotification() - Test service worker notification');
console.log('   - window.debugPushNotifications() - Re-run full diagnostics');

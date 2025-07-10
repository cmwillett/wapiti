// Test notification visibility
async function testNotificationVisibility() {
  console.log('🔔 Testing notification visibility...');
  
  // Test 1: Simple notification
  console.log('Test 1: Simple notification');
  new Notification('Test 1', { 
    body: 'This is a simple test notification',
    icon: '/favicon.svg'
  });
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: Service worker notification
  console.log('Test 2: Service worker notification');
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      registration.showNotification('Test 2', {
        body: 'This is a service worker notification',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        requireInteraction: true,
        silent: false,
        vibrate: [200, 100, 200],
        tag: 'test'
      });
    }
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 3: Persistent notification
  console.log('Test 3: Persistent notification');
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      registration.showNotification('🚨 URGENT TEST', {
        body: 'This notification should be VERY visible!',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        requireInteraction: true,
        silent: false,
        vibrate: [300, 100, 300, 100, 300],
        tag: 'urgent-test',
        actions: [
          { action: 'ok', title: 'OK' },
          { action: 'cancel', title: 'Cancel' }
        ]
      });
    }
  }
  
  console.log('✅ All test notifications sent. Check:');
  console.log('1. Browser notification area');
  console.log('2. Windows Action Center');
  console.log('3. System tray');
}

window.testNotificationVisibility = testNotificationVisibility;

console.log('Notification visibility test loaded. Run window.testNotificationVisibility()');

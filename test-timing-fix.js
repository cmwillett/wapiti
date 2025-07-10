// Test script to verify the timing fix in service worker
// Run this in the browser console

async function testTimingFix() {
  console.log('🧪 Testing timing fix for service worker reminders...');
  
  // First, create a reminder that's due now
  const now = new Date();
  const testReminder = {
    id: 999,
    text: 'Test timing fix reminder',
    reminder_time: now.toISOString()
  };
  
  console.log('📝 Creating test reminder due now:', testReminder.reminder_time);
  
  // Store it in IndexedDB
  const testData = {
    reminders: [testReminder],
    timestamp: Date.now()
  };
  
  // Store in IndexedDB
  await new Promise((resolve, reject) => {
    const request = indexedDB.open('WapitiReminders', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['reminders'], 'readwrite');
      const store = transaction.objectStore('reminders');
      
      const putRequest = store.put(testData, 'pendingReminders');
      
      putRequest.onsuccess = () => {
        console.log('✅ Test data stored in IndexedDB');
        resolve();
      };
      
      putRequest.onerror = () => reject(putRequest.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('reminders')) {
        db.createObjectStore('reminders');
      }
    };
  });
  
  // Now trigger a test push notification
  console.log('🔔 Triggering test push notification...');
  
  // Register service worker if not already registered
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    
    // Simulate a push event by manually calling the service worker
    // We'll do this by sending a message to the service worker
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'test-push',
        data: null // Simulate FCM not delivering data
      });
      console.log('📤 Sent test push message to service worker');
    } else {
      console.log('❌ No service worker controller available');
    }
  }
  
  console.log('🎯 Check the notification that should appear with the correct task text!');
}

// Run the test
testTimingFix().catch(console.error);

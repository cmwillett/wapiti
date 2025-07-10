// Quick diagnostic and improvement summary
console.log('=== Enhanced Reminder System Improvements ===');
console.log('');

console.log('🔧 Improvements Made:');
console.log('   1. ✅ Service Worker timing is now more generous (30 min window vs 10 min)');
console.log('   2. ✅ Browser checker stores ALL upcoming reminders (next 24h) in IndexedDB');
console.log('   3. ✅ Service Worker handles multiple push payload formats');
console.log('   4. ✅ Service Worker falls back to IndexedDB for up to 60 minutes');
console.log('   5. ✅ Better error handling and logging throughout');
console.log('');

// Check current state
window.checkReminderSystemState = async function() {
  console.log('📊 Current System State:');
  
  // Check if service worker is registered
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      console.log('✅ Service Worker: Registered and active');
      console.log('   📍 Scope:', registration.scope);
      console.log('   🔄 State:', registration.active?.state);
    } else {
      console.log('❌ Service Worker: Not registered');
    }
  }
  
  // Check push subscription
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        console.log('✅ Push Subscription: Active');
        console.log('   📍 Endpoint:', subscription.endpoint.substring(0, 50) + '...');
      } else {
        console.log('❌ Push Subscription: Not found');
      }
    } catch (error) {
      console.log('❌ Push Subscription: Error checking -', error.message);
    }
  }
  
  // Check browser reminder checker
  if (window.browserReminderChecker) {
    console.log('✅ Browser Reminder Checker: Active');
  } else {
    console.log('❌ Browser Reminder Checker: Not found');
  }
  
  // Check IndexedDB data
  try {
    const idbData = await getFromIndexedDB('pendingReminders');
    if (idbData) {
      console.log('✅ IndexedDB: Has data');
      console.log('   📊 Reminders stored:', idbData.reminders?.length || 0);
      console.log('   ⏰ Last update:', new Date(idbData.timestamp).toLocaleString());
      
      if (idbData.reminders && idbData.reminders.length > 0) {
        console.log('   📋 Next reminders:');
        idbData.reminders.slice(0, 3).forEach((reminder, i) => {
          const timeUntil = new Date(reminder.reminder_time).getTime() - Date.now();
          const minutesUntil = Math.round(timeUntil / 60000);
          console.log(`      ${i + 1}. "${reminder.text}" (in ${minutesUntil} min)`);
        });
      }
    } else {
      console.log('⚠️ IndexedDB: No reminder data found');
    }
  } catch (error) {
    console.log('❌ IndexedDB: Error reading -', error.message);
  }
  
  // Check localStorage
  const localData = localStorage.getItem('pendingReminders');
  if (localData) {
    try {
      const parsed = JSON.parse(localData);
      console.log('✅ localStorage: Has data (' + (parsed.reminders?.length || 0) + ' reminders)');
    } catch (e) {
      console.log('❌ localStorage: Has corrupted data');
    }
  } else {
    console.log('⚠️ localStorage: No reminder data');
  }
  
  console.log('');
  console.log('🎯 To test the system:');
  console.log('   window.testEnhancedReminders() - Create a test reminder');
  console.log('   window.testEdgeFunction() - Manually trigger Edge Function');
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

console.log('🚀 Ready! Run: window.checkReminderSystemState()');

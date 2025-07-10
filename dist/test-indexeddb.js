// Test IndexedDB functionality for service worker
async function testIndexedDBApproach() {
  console.log('=== TESTING INDEXEDDB APPROACH ===');
  
  // Helper function to store in IndexedDB (same as in browserReminderChecker)
  async function storeInIndexedDB(key, data) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WapitiReminders', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('reminders')) {
          db.createObjectStore('reminders');
        }
      };
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['reminders'], 'readwrite');
        const store = transaction.objectStore('reminders');
        
        const putRequest = store.put(data, key);
        
        putRequest.onsuccess = () => {
          db.close();
          resolve();
        };
        
        putRequest.onerror = () => {
          db.close();
          reject(putRequest.error);
        };
      };
    });
  }
  
  // 1. Store test data in IndexedDB
  const testData = {
    timestamp: Date.now(),
    reminders: [
      {
        id: 456,
        text: 'Test IndexedDB reminder',
        reminder_time: new Date().toISOString()
      }
    ]
  };
  
  try {
    await storeInIndexedDB('pendingReminders', testData);
    console.log('✅ Stored test data in IndexedDB:', testData);
  } catch (error) {
    console.error('❌ Failed to store in IndexedDB:', error);
    return;
  }
  
  // 2. Test if service worker can read from IndexedDB
  console.log('📡 Testing service worker IndexedDB access...');
  
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    // Send a message to the service worker to test IndexedDB reading
    navigator.serviceWorker.controller.postMessage({
      type: 'TEST_INDEXEDDB'
    });
    
    // Listen for response
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'INDEXEDDB_TEST_RESULT') {
        console.log('📥 Service worker IndexedDB test result:', event.data.result);
        if (event.data.result && event.data.result.reminders) {
          console.log('✅ Service worker can read IndexedDB data!');
        } else {
          console.log('❌ Service worker could not read IndexedDB data');
        }
      }
    });
  } else {
    console.log('❌ No service worker controller available');
  }
}

// Run the test
testIndexedDBApproach();

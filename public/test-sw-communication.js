// Test service worker communication
async function testServiceWorkerCommunication() {
  console.log('Testing service worker communication...');
  
  // Test reminder data channel
  const reminderChannel = new BroadcastChannel('reminder-data');
  
  // Create some test data in localStorage
  const testData = {
    timestamp: Date.now(),
    reminders: [
      {
        id: 999,
        text: 'Test reminder from main app',
        reminder_time: new Date().toISOString()
      }
    ]
  };
  
  localStorage.setItem('pendingReminders', JSON.stringify(testData));
  console.log('Stored test reminder data:', testData);
  
  // Test communication
  reminderChannel.postMessage({ type: 'REQUEST_PENDING_REMINDERS' });
  
  reminderChannel.addEventListener('message', (event) => {
    if (event.data.type === 'PENDING_REMINDERS_RESPONSE') {
      console.log('Received response from service worker:', event.data.data);
      reminderChannel.close();
    }
  });
  
  console.log('Sent request to service worker...');
}

// Test if service worker is registered
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(registration => {
    console.log('Service worker is ready:', registration);
    testServiceWorkerCommunication();
  }).catch(error => {
    console.error('Service worker not ready:', error);
  });
} else {
  console.log('Service worker not supported');
}

// Manual test to check service worker communication
async function manualTestSWCommunication() {
  console.log('=== MANUAL SW COMMUNICATION TEST ===');
  
  // 1. First, store some test data
  const testData = {
    timestamp: Date.now(),
    reminders: [
      {
        id: 123,
        text: 'Test reminder from manual test',
        reminder_time: new Date().toISOString()
      }
    ]
  };
  
  localStorage.setItem('pendingReminders', JSON.stringify(testData));
  console.log('✅ Stored test data in localStorage:', testData);
  
  // 2. Test if notification service is responding
  console.log('📡 Testing broadcast channel communication...');
  const reminderChannel = new BroadcastChannel('reminder-data');
  
  let responseReceived = false;
  
  reminderChannel.addEventListener('message', (event) => {
    console.log('📥 Main app received message:', event.data);
    if (event.data.type === 'PENDING_REMINDERS_RESPONSE') {
      responseReceived = true;
      console.log('✅ Got response from notification service:', event.data.data);
      reminderChannel.close();
    }
  });
  
  // Send test request
  console.log('📤 Sending test request...');
  reminderChannel.postMessage({ type: 'REQUEST_PENDING_REMINDERS' });
  
  // Wait for response
  setTimeout(() => {
    if (!responseReceived) {
      console.log('❌ No response received from notification service');
      reminderChannel.close();
    }
  }, 2000);
  
  // 3. Test service worker registration
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      console.log('✅ Service worker is ready:', registration);
      
      // Check if service worker is active
      if (registration.active) {
        console.log('✅ Service worker is active');
      } else {
        console.log('❌ Service worker is not active');
      }
    } catch (error) {
      console.log('❌ Service worker error:', error);
    }
  } else {
    console.log('❌ Service worker not supported');
  }
}

// Run the test
manualTestSWCommunication();

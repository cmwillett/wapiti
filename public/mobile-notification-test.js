// Mobile-friendly notification test with visual feedback
console.log('📱 Mobile notification test loaded');

function createMobileNotificationTest() {
  // Create a floating test button for mobile
  const testButton = document.createElement('div');
  testButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 10000;
    background: #3498db;
    color: white;
    padding: 15px 20px;
    border-radius: 12px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    border: none;
    font-family: system-ui, -apple-system, sans-serif;
    text-align: center;
    min-width: 120px;
    user-select: none;
    touch-action: manipulation;
  `;
  
  testButton.textContent = '🔔 Test Push';
  
  // Create status display
  const statusDisplay = document.createElement('div');
  statusDisplay.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10001;
    background: rgba(0,0,0,0.9);
    color: white;
    padding: 20px;
    border-radius: 12px;
    font-size: 18px;
    font-family: system-ui, -apple-system, sans-serif;
    text-align: center;
    max-width: 80%;
    display: none;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  `;

  function showStatus(message, isSuccess = false) {
    statusDisplay.innerHTML = message;
    statusDisplay.style.background = isSuccess ? 'rgba(39, 174, 96, 0.95)' : 'rgba(231, 76, 60, 0.95)';
    statusDisplay.style.display = 'block';
    
    setTimeout(() => {
      statusDisplay.style.display = 'none';
    }, 4000);
  }

  testButton.onclick = async () => {
    testButton.textContent = '🔄 Testing...';
    testButton.style.background = '#f39c12';

    try {
      // Check if we have access to notification service
      if (!window.notificationService) {
        showStatus('❌ Notification service not available. Try refreshing the page.');
        testButton.textContent = '🔔 Test Push';
        testButton.style.background = '#3498db';
        return;
      }

      // Try to send test notification
      if (typeof window.notificationService.testPushToAllDevices === 'function') {
        const result = await window.notificationService.testPushToAllDevices();
        showStatus('✅ Test notification sent to all devices! Check if you received it.', true);
      } else {
        // Fallback: try manual notification
        const { data: { user } } = await window.supabase.auth.getUser();
        if (!user) {
          showStatus('❌ Not logged in. Please log in first.');
          return;
        }

        // Get device count
        const { data: tokens } = await window.supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', user.id);

        const deviceCount = tokens?.length || 0;
        
        if (deviceCount === 0) {
          showStatus('❌ No devices registered for notifications.');
        } else if (deviceCount === 1) {
          showStatus(`⚠️ Only 1 device registered. Expected 2 (desktop + mobile).`);
        } else if (deviceCount === 2) {
          showStatus(`✅ Perfect! 2 devices registered. Create a reminder to test automatic notifications.`, true);
        } else {
          showStatus(`⚠️ ${deviceCount} devices registered. Should be exactly 2.`);
        }
      }

    } catch (error) {
      console.error('Test error:', error);
      showStatus(`❌ Test failed: ${error.message}`);
    }

    testButton.textContent = '🔔 Test Push';
    testButton.style.background = '#3498db';
  };

  document.body.appendChild(testButton);
  document.body.appendChild(statusDisplay);
  
  console.log('✅ Mobile test button created (bottom-right corner)');
}

// Create the test button
createMobileNotificationTest();

// Also create a device count checker
setTimeout(async () => {
  try {
    const { data: { user } } = await window.supabase.auth.getUser();
    if (user) {
      const { data: tokens } = await window.supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id);

      console.log(`📱 Device count: ${tokens?.length || 0}`);
      tokens?.forEach((token, i) => {
        console.log(`  Device ${i + 1}: ${token.device_name}`);
      });
    }
  } catch (error) {
    console.error('Device check error:', error);
  }
}, 2000);

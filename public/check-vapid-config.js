// Check VAPID configuration and test push setup
console.log('🔍 Checking VAPID configuration...');

// Check if we have the public key configured
const vapidPublicKey = 'BFzFBJeHJ8OEBtE7y1ZeL4bBTwl-cOA_d3pZueFPa7vFYbCEKQfZGQJQ-5BpUwDGHQT_KS8TxYkgSFGnuqwMB-Y';

console.log('Frontend VAPID Public Key:', vapidPublicKey);

// Check if service worker can access the key
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(registration => {
    console.log('Service worker ready:', !!registration);
    
    // Check push manager
    if ('pushManager' in registration) {
      console.log('Push manager available');
      
      // Check for existing subscription
      registration.pushManager.getSubscription().then(subscription => {
        if (subscription) {
          console.log('Existing push subscription found:');
          console.log('Endpoint:', subscription.endpoint);
          console.log('Keys:', subscription.toJSON().keys);
          
          // Test the endpoint format
          if (subscription.endpoint.includes('fcm.googleapis.com')) {
            console.log('✅ FCM endpoint detected');
          } else if (subscription.endpoint.includes('mozilla.com')) {
            console.log('✅ Mozilla endpoint detected');
          } else {
            console.log('❓ Unknown push service:', subscription.endpoint);
          }
        } else {
          console.log('❌ No push subscription found');
        }
      }).catch(err => {
        console.error('Error checking subscription:', err);
      });
    } else {
      console.error('❌ Push manager not available');
    }
  });
} else {
  console.error('❌ Service worker not supported');
}

// Test function to manually trigger Edge Function
async function testEdgeFunction() {
  console.log('🧪 Testing Edge Function directly...');
  
  try {
    const response = await fetch('/api/check-reminders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    console.log('Edge Function response:', result);
    
    if (result.notifications) {
      result.notifications.forEach(notif => {
        if (notif.result && !notif.result.success) {
          console.error('❌ Notification failed:', notif.result.error);
        }
      });
    }
  } catch (error) {
    console.error('❌ Edge Function test failed:', error);
  }
}

// Expose test function globally
window.testEdgeFunction = testEdgeFunction;

console.log('✅ VAPID diagnostic loaded. Run testEdgeFunction() to test notifications.');

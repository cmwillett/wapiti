// Hybrid sendFCMNotification function that works for both desktop and mobile
// Replace the existing sendFCMNotification function in your Edge Function with this code

async function sendFCMNotification(subscription, task) {
  try {
    console.log(`Sending notification for task ${task.id}`);
    console.log('Subscription data:', JSON.stringify(subscription, null, 2));

    // Use the flat structure from your database
    const endpoint = subscription.endpoint;
    const p256dh = subscription.p256dh;
    const auth = subscription.auth;

    if (!endpoint) {
      console.error('Subscription structure:', subscription);
      throw new Error('Invalid subscription: missing endpoint');
    }

    console.log(`Endpoint: ${endpoint.substring(0, 50)}...`);

    // Detect if this is a mobile device based on user_agent or device_name
    const isMobile = (subscription.user_agent && (
      subscription.user_agent.includes('Mobile') || 
      subscription.user_agent.includes('Android') || 
      subscription.user_agent.includes('iPhone')
    )) || (subscription.device_name && subscription.device_name.includes('Android'));

    console.log(`Device type: ${isMobile ? 'Mobile' : 'Desktop'}`);

    // Create push payload
    const payload = JSON.stringify({
      title: '📝 Task Reminder',
      body: `Don't forget: ${task.text}`,
      data: {
        taskId: task.id.toString(),
        action: 'task-reminder',
        icon: '/icons/icon-192x192.png',
        badge: '/favicon.svg',
        tag: `task-${task.id}`,
        requireInteraction: true
      }
    });

    console.log('Push payload:', payload);

    if (isMobile) {
      // For mobile devices: Use simple FCM format (what was working)
      return await sendMobileNotification(endpoint, payload);
    } else {
      // For desktop: Use Web Push with VAPID (but simpler approach)
      return await sendDesktopNotification(endpoint, p256dh, auth, payload);
    }

  } catch (error) {
    console.error('Notification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Simple mobile notification (FCM format that was working)
async function sendMobileNotification(endpoint, payload) {
  console.log('📱 Sending mobile notification');
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400'
      },
      body: payload
    });

    if (response.ok) {
      console.log('✅ Mobile notification sent successfully');
      return {
        success: true,
        messageId: `mobile-${Date.now()}`
      };
    } else {
      console.error('❌ Mobile notification failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return {
        success: false,
        error: `Mobile push error: ${response.status} ${response.statusText}`
      };
    }
  } catch (error) {
    console.error('Mobile notification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Desktop notification with simplified VAPID
async function sendDesktopNotification(endpoint, p256dh, auth, payload) {
  console.log('🖥️ Sending desktop notification with VAPID');
  
  try {
    // Get VAPID keys from environment
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.log('VAPID keys not found, falling back to simple push');
      return await sendMobileNotification(endpoint, payload);
    }

    // For desktop, try simple approach first
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${vapidPrivateKey}`, // Try this format first
        'TTL': '86400'
      },
      body: payload
    });

    if (response.ok) {
      console.log('✅ Desktop notification sent successfully');
      return {
        success: true,
        messageId: `desktop-${Date.now()}`
      };
    } else {
      console.error('❌ Desktop notification failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      
      // If that fails, try without auth
      console.log('Trying desktop notification without auth...');
      const fallbackResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'TTL': '86400'
        },
        body: payload
      });

      if (fallbackResponse.ok) {
        console.log('✅ Desktop notification (fallback) sent successfully');
        return {
          success: true,
          messageId: `desktop-fallback-${Date.now()}`
        };
      } else {
        return {
          success: false,
          error: `Desktop push error: ${response.status} ${response.statusText}`
        };
      }
    }
  } catch (error) {
    console.error('Desktop notification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

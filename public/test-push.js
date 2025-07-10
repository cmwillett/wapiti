// Test push notification registration and save to Supabase
async function testPushNotifications() {
  console.log('Testing push notification setup...');
  
  try {
    // Check if service worker and push manager are supported
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }
    
    if (!('PushManager' in window)) {
      throw new Error('Push Manager not supported');
    }
    
    // Request notification permission
    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }
    
    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered:', registration);
    
    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;
    
    // Check for existing subscription and unsubscribe if necessary
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('Found existing subscription, unsubscribing...');
      await existingSubscription.unsubscribe();
      console.log('Successfully unsubscribed from existing subscription');
      
      // Also clear from Supabase if possible
      try {
        const { supabase } = await import('./src/supabaseClient.js');
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          await supabase
            .from('user_preferences')
            .update({ push_subscription: null })
            .eq('user_id', user.id);
          console.log('Cleared old subscription from Supabase');
        }
      } catch (dbError) {
        console.warn('Could not clear old subscription from database:', dbError);
      }
    }
    
    // Wait a bit for the unsubscribe to fully process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array('BJPVlwpCxnv6hdAsbgspbI1xcE7_LwhJvDV2ibZ4alQ38WSzFzN6xf-QyYN2FUOP-miBMRTitIdVPSGb1mjYWZU')
    });
    
    console.log('Push subscription created:', subscription);
    
    // Import Supabase client
    const { supabase } = await import('./src/supabaseClient.js');
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No authenticated user');
    }
    
    console.log('Current user:', user.id);
    
    // Save subscription to Supabase
    const subscriptionData = JSON.stringify(subscription);
    
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        push_subscription: subscriptionData
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      throw error;
    }
    
    console.log('Push subscription saved to Supabase successfully!', data);
    
    // Test local notification
    const testNotification = new Notification('🎉 Push Setup Complete!', {
      body: 'Your push notifications are now configured.',
      icon: '/favicon.ico'
    });
    
    return {
      success: true,
      subscription: subscription,
      user: user.id
    };
    
  } catch (error) {
    console.error('Push notification test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Function to clear existing push subscriptions
async function clearPushSubscriptions() {
  console.log('Clearing existing push subscriptions...');
  
  try {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }
    
    // Get service worker registration
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!registration) {
      console.log('No service worker registration found');
      return { success: true, message: 'No registration to clear' };
    }
    
    // Get existing subscription
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('Found existing subscription:', existingSubscription);
      await existingSubscription.unsubscribe();
      console.log('Successfully unsubscribed');
      
      // Also clear from Supabase
      try {
        const { supabase } = await import('./src/supabaseClient.js');
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { error } = await supabase
            .from('user_preferences')
            .update({ push_subscription: null })
            .eq('user_id', user.id);
            
          if (error) {
            console.warn('Could not clear subscription from Supabase:', error);
          } else {
            console.log('Cleared subscription from Supabase');
          }
        }
      } catch (dbError) {
        console.warn('Could not clear from database:', dbError);
      }
      
      return { success: true, message: 'Subscription cleared successfully' };
    } else {
      console.log('No existing subscription found');
      return { success: true, message: 'No subscription to clear' };
    }
  } catch (error) {
    console.error('Error clearing subscriptions:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Make test function available globally
window.testPushNotifications = testPushNotifications;
window.clearPushSubscriptions = clearPushSubscriptions;

console.log('Push notification test loaded. Available functions:');
console.log('- window.testPushNotifications() - Test push notification setup');
console.log('- window.clearPushSubscriptions() - Clear existing subscriptions');

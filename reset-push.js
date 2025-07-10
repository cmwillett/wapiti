// Reset push notifications completely
async function resetPushNotifications() {
  console.log('🔄 Resetting push notifications...');
  
  try {
    // 1. Clear existing subscription
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          console.log('✅ Unsubscribing from existing push subscription...');
          await subscription.unsubscribe();
          console.log('✅ Unsubscribed successfully');
        }
      }
    }
    
    // 2. Clear from Supabase
    try {
      const { supabase } = await import('./src/supabaseClient.js');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        console.log('✅ Clearing subscription from Supabase...');
        const { error } = await supabase
          .from('user_preferences')
          .update({ push_subscription: null })
          .eq('user_id', user.id);
          
        if (error) {
          console.warn('⚠️ Could not clear from Supabase:', error);
        } else {
          console.log('✅ Cleared from Supabase');
        }
      }
    } catch (dbError) {
      console.warn('⚠️ Database error:', dbError);
    }
    
    // 3. Unregister service worker
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        console.log('✅ Unregistering service worker...');
        await registration.unregister();
      }
    }
    
    console.log('🎉 Reset complete! Please refresh the page and try again.');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Reset failed:', error);
    return { success: false, error: error.message };
  }
}

// Make function available globally
window.resetPushNotifications = resetPushNotifications;

console.log('Reset script loaded. Run window.resetPushNotifications() to completely reset push notifications.');

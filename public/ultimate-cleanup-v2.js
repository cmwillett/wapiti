// Ultimate Cleanup v2 - More aggressive duplicate prevention
console.log('🧹 Ultimate Cleanup v2: Removing ALL duplicates and preventing re-registration...');

async function ultimateCleanupV2() {
  try {
    console.log('\n=== 🧹 ULTIMATE CLEANUP V2 ===\n');
    
    // Get current user session
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session) {
      console.error('❌ Not authenticated');
      return;
    }
    
    const userId = session.user.id;
    console.log('👤 User ID:', userId);
    
    // 1. Delete ALL push subscriptions for this user
    console.log('1️⃣ Deleting ALL push subscriptions...');
    const { data: deletedSubs, error: deleteError } = await window.supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .select();
    
    if (deleteError) {
      console.error('❌ Delete error:', deleteError);
    } else {
      console.log(`✅ Deleted ${deletedSubs?.length || 0} subscriptions`);
    }
    
    // 2. Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 3. Verify cleanup
    const { data: remainingSubs } = await window.supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);
    
    console.log(`📊 Remaining subscriptions: ${remainingSubs?.length || 0}`);
    
    // 4. Set a flag to prevent immediate re-registration
    localStorage.setItem('wapiti_cleanup_timestamp', Date.now().toString());
    localStorage.setItem('wapiti_prevent_registration', 'true');
    
    console.log('🚧 Registration prevention flag set');
    
    // 5. Clear any cached subscription data
    if (window.notificationService) {
      window.notificationService.subscriptionPromise = null;
      window.notificationService.initializationPromise = null;
      console.log('🧹 Cleared notification service cache');
    }
    
    // 6. Unregister current push subscription
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      console.log('🔌 Unregistering current push subscription...');
      await subscription.unsubscribe();
      console.log('✅ Push subscription unregistered');
    }
    
    console.log('\n🎯 Ultimate Cleanup v2 Complete!');
    console.log('⚠️ DO NOT refresh the page for 30 seconds');
    console.log('⚠️ This prevents immediate re-registration');
    
    // 7. Set up timer to re-enable registration after 30 seconds
    setTimeout(() => {
      localStorage.removeItem('wapiti_prevent_registration');
      console.log('✅ Registration prevention disabled - safe to refresh');
      
      // Re-register with proper deduplication
      if (window.notificationService && window.notificationService.initializeNotifications) {
        console.log('🔄 Re-initializing notifications with deduplication...');
        window.notificationService.initializeNotifications();
      }
    }, 30000);
    
    // 8. Show countdown
    let countdown = 30;
    const countdownInterval = setInterval(() => {
      console.log(`⏱️ Safe to refresh in ${countdown}s...`);
      countdown--;
      if (countdown <= 0) {
        clearInterval(countdownInterval);
        console.log('🟢 Safe to refresh now!');
      }
    }, 1000);
    
  } catch (error) {
    console.error('❌ Ultimate cleanup v2 failed:', error);
  }
}

// Run immediately
ultimateCleanupV2();

// Expose for manual use
window.ultimateCleanupV2 = ultimateCleanupV2;

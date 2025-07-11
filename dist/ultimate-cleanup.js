// Ultimate Cleanup Script - Prevents re-registration during cleanup
console.log('🧹 Ultimate Push Subscription Cleanup');

async function ultimateCleanup() {
  try {
    // 1. Temporarily disable auto-registration
    if (window.notificationService) {
      console.log('Temporarily disabling notification service...');
      window.notificationService.isSubscribed = false;
      window.notificationService.currentSubscription = null;
    }

    // 2. Unsubscribe from browser
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        console.log('Unsubscribing from browser push...');
        await subscription.unsubscribe();
      }
    }

    // 3. Delete from database
    console.log('Deleting from database...');
    const { data, error } = await window.supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', (await window.supabase.auth.getUser()).data.user.id);

    if (error) {
      console.error('Database deletion error:', error);
    } else {
      console.log('Database deletion successful');
    }

    // 4. Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 5. Check clean state
    const { data: remaining } = await window.supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', (await window.supabase.auth.getUser()).data.user.id);

    console.log('🎯 Cleanup Results:');
    console.log('Remaining subscriptions:', remaining?.length || 0);
    
    if (remaining && remaining.length > 0) {
      console.log('⚠️ Still have subscriptions:', remaining);
    } else {
      console.log('✅ All subscriptions cleaned up!');
    }

    // 6. Now you can manually re-register
    console.log('');
    console.log('🔧 Manual re-registration available:');
    console.log('   window.notificationService.initializeNotifications()');
    console.log('');
    console.log('Or just refresh the page to auto-register');

  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

// Make it available globally
window.ultimateCleanup = ultimateCleanup;

console.log('🚀 Ready! Run: window.ultimateCleanup()');

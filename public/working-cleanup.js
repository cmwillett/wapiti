// Simple Push Subscription Cleanup
// This script cleans up old subscriptions using the already-loaded supabase instance

console.log('🧹 Starting Push Subscription Cleanup');
console.log('===================================');

async function cleanupAllSubscriptions() {
  try {
    // Check if supabase is available
    if (typeof supabase === 'undefined') {
      console.error('❌ Supabase not available. Make sure you are on the app page.');
      return;
    }

    console.log('✅ Supabase is available');

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ No authenticated user:', userError);
      return;
    }

    console.log(`👤 Authenticated as: ${user.email}`);

    // Get all current subscriptions
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Error fetching subscriptions:', fetchError);
      return;
    }

    console.log(`📊 Found ${subscriptions.length} subscriptions to clean up`);

    if (subscriptions.length === 0) {
      console.log('✅ No subscriptions to clean up');
      return;
    }

    // Show what we found
    subscriptions.forEach((sub, index) => {
      console.log(`  ${index + 1}. ${sub.device_name} (${sub.created_at})`);
      console.log(`     Endpoint: ${sub.endpoint.substring(0, 50)}...`);
    });

    // Ask for confirmation
    const shouldProceed = confirm(`Found ${subscriptions.length} push subscriptions. Do you want to delete ALL of them? This will require re-registering your device for notifications.`);
    
    if (!shouldProceed) {
      console.log('❌ Cleanup cancelled by user');
      return;
    }

    // Clear browser subscription first
    console.log('\n🔧 Step 1: Clearing browser push subscription...');
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        console.log('✅ Browser subscription cleared');
      } else {
        console.log('ℹ️ No active browser subscription found');
      }
    }

    // Delete all database records
    console.log('\n🗄️ Step 2: Clearing database records...');
    const { error: deleteError } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('❌ Error deleting subscriptions:', deleteError);
      return;
    }

    console.log(`✅ Successfully deleted ${subscriptions.length} subscriptions`);

    // Verify cleanup
    console.log('\n🔍 Step 3: Verifying cleanup...');
    const { data: remaining, error: verifyError } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id);

    if (verifyError) {
      console.error('❌ Error verifying cleanup:', verifyError);
      return;
    }

    console.log(`📊 Remaining subscriptions: ${remaining.length}`);

    if (remaining.length === 0) {
      console.log('\n🎉 CLEANUP COMPLETE!');
      console.log('✅ All old push subscriptions have been removed');
      console.log('\n📱 Next steps:');
      console.log('1. Refresh the page to re-register for notifications');
      console.log('2. Check that only 1 new subscription is created');
      console.log('3. Test notifications to make sure everything still works');
    } else {
      console.log(`⚠️ Warning: ${remaining.length} subscriptions still remain`);
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Also provide option to keep only the most recent
async function keepOnlyMostRecent() {
  try {
    if (typeof supabase === 'undefined') {
      console.error('❌ Supabase not available');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ No authenticated user');
      return;
    }

    // Get all subscriptions ordered by creation date
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (fetchError || !subscriptions || subscriptions.length <= 1) {
      console.log('✅ No cleanup needed - 1 or fewer subscriptions found');
      return;
    }

    console.log(`📊 Found ${subscriptions.length} subscriptions`);
    console.log(`🎯 Keeping most recent: ${subscriptions[0].device_name} (${subscriptions[0].created_at})`);
    console.log(`🗑️ Deleting ${subscriptions.length - 1} older subscriptions`);

    // Keep the first (most recent), delete the rest
    const idsToDelete = subscriptions.slice(1).map(sub => sub.id);

    const { error: deleteError } = await supabase
      .from('push_subscriptions')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('❌ Error deleting old subscriptions:', deleteError);
      return;
    }

    console.log(`✅ Successfully deleted ${idsToDelete.length} old subscriptions`);
    console.log('✅ Kept the most recent subscription');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Make functions available globally
window.cleanupAllSubscriptions = cleanupAllSubscriptions;
window.keepOnlyMostRecent = keepOnlyMostRecent;

console.log('\n💡 Available cleanup options:');
console.log('  cleanupAllSubscriptions() - Remove ALL subscriptions (start fresh)');
console.log('  keepOnlyMostRecent() - Keep only the newest subscription');
console.log('\n🚀 Choose your cleanup method and run it!');

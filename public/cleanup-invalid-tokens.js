// Clean up invalid/expired push subscription tokens
console.log('🧹 Starting cleanup of invalid push subscription tokens...');

// Wait for supabase to be available
let supabase;
let retryCount = 0;
const maxRetries = 10;

function waitForSupabase() {
  return new Promise((resolve, reject) => {
    function checkSupabase() {
      if (window.supabase) {
        supabase = window.supabase;
        resolve();
      } else if (retryCount < maxRetries) {
        retryCount++;
        console.log(`Waiting for supabase... attempt ${retryCount}/${maxRetries}`);
        setTimeout(checkSupabase, 500);
      } else {
        reject(new Error('Supabase not available after maximum retries'));
      }
    }
    checkSupabase();
  });
}

async function cleanupInvalidTokens() {
  try {
    await waitForSupabase();
    console.log('✅ Supabase client loaded');

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ User not authenticated:', userError);
      return;
    }

    console.log(`🔍 Cleaning up tokens for user: ${user.id}`);

    // Delete all existing push subscriptions for this user
    const { data: deleted, error: deleteError } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('❌ Error deleting old tokens:', deleteError);
      return;
    }

    console.log('✅ All old push subscription tokens deleted');

    // Check count
    const { data: remaining, error: countError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id);

    console.log(`📊 Remaining subscriptions: ${remaining?.length || 0}`);

    console.log('🎉 Cleanup complete! Now you can register fresh tokens.');
    console.log('💡 Refresh the page and click "Enable Notifications" again.');

  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}

// Run cleanup
cleanupInvalidTokens();

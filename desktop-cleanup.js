// Desktop cleanup and re-registration script
console.log('🖥️ Desktop Device Cleanup Tool');

async function cleanupAndReregisterDesktop() {
  try {
    // Wait for services to be ready
    if (!window.supabase) {
      console.error('❌ Supabase not loaded');
      return { success: false, error: 'Supabase not loaded' };
    }

    const { data: { user }, error: userError } = await window.supabase.auth.getUser();
    if (userError) {
      console.error('❌ Auth error:', userError);
      return { success: false, error: `Auth error: ${userError.message}` };
    }
    if (!user) {
      console.error('❌ Not authenticated');
      return { success: false, error: 'Not authenticated' };
    }

    console.log('🧹 Cleaning up invalid desktop tokens...');

    // Delete all push subscriptions for this user
    const { error: deleteError } = await window.supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('❌ Delete failed:', deleteError);
      return { success: false, error: `Delete failed: ${deleteError.message}` };
    }

    console.log('✅ Old tokens deleted');

    // Wait for notification service to be ready
    if (!window.notificationService) {
      console.error('❌ Notification service not ready');
      return { success: false, error: 'Notification service not ready' };
    }

    console.log('🔄 Re-initializing notifications...');
    await window.notificationService.initializeNotifications();
    console.log('✅ Desktop device re-registered!');

    // Verify registration
    const { data: newTokens } = await window.supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id);

    console.log(`🖥️ New tokens registered: ${newTokens?.length || 0}`);
    
    // Show details
    if (newTokens && newTokens.length > 0) {
      newTokens.forEach((token, i) => {
        console.log(`Device ${i + 1}: ${token.device_name || 'Unknown'} (${token.endpoint?.slice(-20)}...)`);
      });
    }

    return { 
      success: true, 
      message: `${newTokens?.length || 0} devices registered`,
      tokens: newTokens
    };

  } catch (error) {
    console.error('❌ Desktop cleanup error:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error'
    };
  }
}

// Run the cleanup
cleanupAndReregisterDesktop().then(result => {
  console.log('🖥️ Desktop cleanup result:', result);
  if (result.success) {
    console.log('✅ Desktop re-registration complete!');
    console.log('📱 Now run the mobile cleanup tool on your phone.');
  } else {
    console.error('❌ Desktop cleanup failed:', result.error);
  }
});

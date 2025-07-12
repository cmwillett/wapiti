// Check current device registrations
async function checkDeviceRegistrations() {
  try {
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) {
      console.error('❌ Not authenticated');
      return;
    }

    const { data: tokens, error } = await window.supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching tokens:', error);
      return;
    }

    console.log('📱 Current Device Registrations:');
    console.log(`Total devices: ${tokens?.length || 0}`);
    
    if (tokens && tokens.length > 0) {
      tokens.forEach((token, i) => {
        console.log(`\nDevice ${i + 1}:`);
        console.log(`  Name: ${token.device_name || 'Unknown'}`);
        console.log(`  Endpoint: ...${token.endpoint?.slice(-30)}`);
        console.log(`  Created: ${new Date(token.created_at).toLocaleString()}`);
        console.log(`  Last used: ${token.last_used ? new Date(token.last_used).toLocaleString() : 'Never'}`);
      });
    } else {
      console.log('❌ No devices registered!');
    }

    return tokens;
  } catch (error) {
    console.error('❌ Check error:', error);
  }
}

// Run the check
checkDeviceRegistrations();

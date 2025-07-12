// Fix duplicate registrations and refresh Android token
async function fixDuplicatesAndRefreshTokens() {
  try {
    console.log('🔧 Fixing duplicates and refreshing tokens...');
    
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) {
      console.error('❌ Not authenticated');
      return;
    }

    // Get current registrations
    const { data: tokens, error } = await window.supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching tokens:', error);
      return;
    }

    console.log(`📱 Found ${tokens?.length || 0} current registrations`);
    
    if (tokens && tokens.length > 0) {
      // Group by device type to find duplicates
      const deviceGroups = {};
      tokens.forEach(token => {
        const deviceType = token.device_name?.includes('Windows') ? 'Windows' : 
                          token.device_name?.includes('Android') ? 'Android' : 
                          'Unknown';
        
        if (!deviceGroups[deviceType]) deviceGroups[deviceType] = [];
        deviceGroups[deviceType].push(token);
      });

      console.log('📊 Device groups:', Object.keys(deviceGroups).map(type => 
        `${type}: ${deviceGroups[type].length}`
      ).join(', '));

      // Remove duplicates (keep only the most recent for each device type)
      for (const [deviceType, group] of Object.entries(deviceGroups)) {
        if (group.length > 1) {
          console.log(`🗑️ Removing ${group.length - 1} duplicate(s) for ${deviceType}`);
          
          // Sort by created_at, keep the newest, remove the rest
          group.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          const toRemove = group.slice(1); // All except the first (newest)
          
          for (const duplicate of toRemove) {
            console.log(`  Removing: ${duplicate.device_name} (${duplicate.created_at})`);
            await window.supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', duplicate.id);
          }
        }
      }
    }

    // Now refresh this device's token to ensure it's valid
    console.log('🔄 Refreshing current device token...');
    
    if (window.notificationService && typeof window.notificationService.initializeNotifications === 'function') {
      await window.notificationService.initializeNotifications();
      console.log('✅ Token refresh complete');
    } else {
      console.log('⚠️ notificationService not available, manually refreshing...');
      
      // Manual refresh for mobile
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          // Unsubscribe and resubscribe to get fresh token
          await subscription.unsubscribe();
          
          const newSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: 'BNJzaJmEwNKNB8JCCgBl8jP5f4n0kXgKlY2kZFhQ4S4V7TqXqz3q2X1L8uT6S5qJ2M9R7K3H1X4G8N6Q5F2A3D9'
          });
          
          // Save new subscription
          const deviceName = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
            ? 'Android Bulletproof' 
            : 'Windows Bulletproof';
            
          await window.supabase
            .from('push_subscriptions')
            .upsert({
              user_id: user.id,
              endpoint: newSubscription.endpoint,
              p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(newSubscription.getKey('p256dh')))),
              auth: btoa(String.fromCharCode.apply(null, new Uint8Array(newSubscription.getKey('auth')))),
              device_name: deviceName + ` (${new Date().toLocaleTimeString()})`
            }, {
              onConflict: 'endpoint'
            });
          
          console.log('✅ Manual token refresh complete');
        }
      }
    }

    // Final check
    setTimeout(async () => {
      const { data: finalTokens } = await window.supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      console.log('📊 Final device count:', finalTokens?.length || 0);
      finalTokens?.forEach((token, i) => {
        console.log(`  Device ${i + 1}: ${token.device_name}`);
      });
    }, 2000);

  } catch (error) {
    console.error('❌ Fix error:', error);
  }
}

// Run the fix
fixDuplicatesAndRefreshTokens();

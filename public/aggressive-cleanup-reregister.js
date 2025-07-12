// Aggressive cleanup: completely wipe and re-register cleanly
async function aggressiveCleanupAndReregister() {
  try {
    console.log('🧹 AGGRESSIVE CLEANUP: Wiping all devices and re-registering...');
    
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) {
      console.error('❌ Not authenticated');
      return;
    }

    // STEP 1: Delete ALL existing registrations for this user
    console.log('🗑️ Step 1: Deleting ALL existing registrations...');
    const { error: deleteError } = await window.supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('❌ Delete error:', deleteError);
      return;
    }

    console.log('✅ All existing registrations deleted');

    // STEP 2: Wait a moment for deletion to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // STEP 3: Unsubscribe from any existing push subscription
    console.log('🔄 Step 2: Unsubscribing from existing push...');
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        await existingSubscription.unsubscribe();
        console.log('✅ Unsubscribed from existing push');
      }
    }

    // STEP 4: Create ONE fresh subscription for this device
    console.log('🔄 Step 3: Creating fresh subscription...');
    
    const deviceType = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
      ? 'Android' 
      : 'Windows';
    
    const deviceName = `${deviceType} Clean (${new Date().toLocaleTimeString()})`;

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'BNJzaJmEwNKNB8JCCgBl8jP5f4n0kXgKlY2kZFhQ4S4V7TqXqz3q2X1L8uT6S5qJ2M9R7K3H1X4G8N6Q5F2A3D9'
      });

      // STEP 5: Save the new subscription (this should be the ONLY one for this device)
      console.log('💾 Step 4: Saving new subscription...');
      
      const { error: insertError } = await window.supabase
        .from('push_subscriptions')
        .insert({
          user_id: user.id,
          endpoint: newSubscription.endpoint,
          p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(newSubscription.getKey('p256dh')))),
          auth: btoa(String.fromCharCode.apply(null, new Uint8Array(newSubscription.getKey('auth')))),
          device_name: deviceName
        });

      if (insertError) {
        console.error('❌ Insert error:', insertError);
        return;
      }

      console.log(`✅ Fresh subscription saved: ${deviceName}`);
    }

    // STEP 6: Verify final state
    setTimeout(async () => {
      console.log('📊 Step 5: Verifying final state...');
      
      const { data: finalTokens } = await window.supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      console.log(`📱 Final device count: ${finalTokens?.length || 0}`);
      finalTokens?.forEach((token, i) => {
        console.log(`  Device ${i + 1}: ${token.device_name} (${new Date(token.created_at).toLocaleString()})`);
      });

      if (finalTokens?.length === 1) {
        console.log('🎉 SUCCESS: Clean single-device registration complete!');
        console.log('📝 Now run this on your OTHER device to get exactly 2 clean registrations.');
      } else if (finalTokens?.length === 2) {
        console.log('🎉 SUCCESS: Clean dual-device registration complete!');
        console.log('✅ Both devices should now receive notifications properly.');
      } else {
        console.log(`⚠️ Unexpected device count: ${finalTokens?.length}`);
      }

    }, 2000);

  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}

console.log('🧹 Aggressive cleanup script loaded!');
console.log('📝 Run: aggressiveCleanupAndReregister()');
console.log('⚠️ IMPORTANT: Run this on BOTH devices (desktop first, then mobile)');

// Auto-run after a short delay to let page load
setTimeout(() => {
  aggressiveCleanupAndReregister();
}, 3000);

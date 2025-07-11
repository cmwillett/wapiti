// Device Registration Monitor
// Run this in browser console to see real-time device registration status

console.log('📱 Device Registration Monitor Started');

async function checkDeviceRegistration() {
  try {
    // Wait for supabase to be available
    if (typeof window.supabase === 'undefined') {
      console.log('⏳ Waiting for supabase to load...');
      await new Promise(resolve => {
        const checkSupabase = () => {
          if (typeof window.supabase !== 'undefined') {
            resolve();
          } else {
            setTimeout(checkSupabase, 100);
          }
        };
        checkSupabase();
      });
    }

    const supabase = window.supabase;
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('❌ Not authenticated');
      return;
    }

    // Get all registered devices for this user
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (subError) {
      console.error('❌ Error fetching subscriptions:', subError);
      
      // Check if table doesn't exist
      if (subError.code === '42P01') {
        console.log('\n🔧 The push_subscriptions table does not exist in your Supabase database.');
        console.log('📋 To fix this, run the following SQL in your Supabase SQL Editor:');
        console.log('');
        console.log('CREATE TABLE IF NOT EXISTS push_subscriptions (');
        console.log('  id BIGSERIAL PRIMARY KEY,');
        console.log('  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,');
        console.log('  endpoint TEXT NOT NULL,');
        console.log('  p256dh TEXT NOT NULL,');
        console.log('  auth TEXT NOT NULL,');
        console.log('  device_name TEXT NOT NULL,');
        console.log('  user_agent TEXT,');
        console.log('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
        console.log('  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
        console.log('  UNIQUE(user_id, endpoint)');
        console.log(');');
        console.log('');
        console.log('-- Enable RLS and create policies');
        console.log('ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;');
        console.log('-- (Add RLS policies as needed)');
        console.log('');
        console.log('💡 Or check the file: supabase/migrations/create_push_subscriptions_table.sql');
      }
      return;
    }

    console.log(`\n📊 Registration Status for User: ${user.email || user.id}`);
    console.log(`🔢 Total Devices Registered: ${subscriptions.length}\n`);

    if (subscriptions.length === 0) {
      console.log('⚠️ No devices registered yet.');
      console.log('💡 Click "⚙️ Notification Settings" and allow notifications to register this device.');
      return;
    }

    subscriptions.forEach((sub, index) => {
      const createdDate = new Date(sub.created_at).toLocaleString();
      const isCurrentDevice = getCurrentDeviceFingerprint() === sub.device_name;
      
      console.log(`📱 Device ${index + 1}: ${sub.device_name} ${isCurrentDevice ? '← THIS DEVICE' : ''}`);
      console.log(`   📅 Registered: ${createdDate}`);
      console.log(`   🌐 Endpoint: ${sub.endpoint.substring(0, 60)}...`);
      console.log(`   🔧 Browser: ${sub.user_agent ? sub.user_agent.substring(0, 80) + '...' : 'Unknown'}`);
      console.log('');
    });

    // Check current device registration status
    const currentFingerprint = getCurrentDeviceFingerprint();
    const isRegistered = subscriptions.some(sub => sub.device_name === currentFingerprint);
    
    console.log(`🎯 Current Device Registration Status:`);
    console.log(`   📱 Device: ${currentFingerprint}`);
    console.log(`   ✅ Registered: ${isRegistered ? 'YES' : 'NO'}`);
    console.log(`   🔔 Permission: ${Notification.permission}`);
    
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      console.log(`   🔧 Push Subscription: ${subscription ? 'ACTIVE' : 'NONE'}`);
    }

    return {
      totalDevices: subscriptions.length,
      currentDeviceRegistered: isRegistered,
      devices: subscriptions.map(sub => ({
        name: sub.device_name,
        registered: sub.created_at,
        isCurrentDevice: sub.device_name === currentFingerprint
      }))
    };

  } catch (error) {
    console.error('❌ Error checking device registration:', error);
  }
}

function getCurrentDeviceFingerprint() {
  // Use the same device naming logic as NotificationService
  const userAgent = navigator.userAgent || 'Unknown';
  
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
    if (/Android/.test(userAgent)) {
      return 'Android Device';
    } else if (/iPhone/.test(userAgent)) {
      return 'iPhone';
    } else if (/iPad/.test(userAgent)) {
      return 'iPad';
    } else {
      return 'Mobile Device';
    }
  } else {
    if (/Windows/.test(userAgent)) {
      return 'Windows Desktop';
    } else if (/Mac/.test(userAgent)) {
      return 'Mac Desktop';
    } else if (/Linux/.test(userAgent)) {
      return 'Linux Desktop';
    } else {
      return 'Desktop';
    }
  }
}

// Auto-run on load
checkDeviceRegistration();

// Make available globally for manual checking
window.checkDeviceRegistration = checkDeviceRegistration;

// Set up auto-refresh every 30 seconds
let monitorInterval;

function startDeviceMonitor() {
  console.log('🔄 Starting auto-refresh every 30 seconds...');
  monitorInterval = setInterval(() => {
    console.log('\n🔄 Refreshing device registration status...');
    checkDeviceRegistration();
  }, 30000);
}

function stopDeviceMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    console.log('⏹️ Device monitor stopped');
  }
}

window.startDeviceMonitor = startDeviceMonitor;
window.stopDeviceMonitor = stopDeviceMonitor;

console.log('\n💡 Available commands:');
console.log('   window.checkDeviceRegistration() - Check device status now');
console.log('   window.startDeviceMonitor() - Auto-refresh every 30 seconds');
console.log('   window.stopDeviceMonitor() - Stop auto-refresh');

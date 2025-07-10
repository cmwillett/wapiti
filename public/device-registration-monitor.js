// Device Registration Monitor
// Run this in browser console to see real-time device registration status

console.log('📱 Device Registration Monitor Started');

async function checkDeviceRegistration() {
  try {
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
  // Simple device fingerprinting (matches the one used in notificationService)
  const platform = navigator.platform || 'Unknown';
  const userAgent = navigator.userAgent || 'Unknown';
  
  // Create a simple device identifier
  let deviceType = 'Desktop';
  if (/iPhone|iPad|iPod/.test(userAgent)) {
    deviceType = 'iOS';
  } else if (/Android/.test(userAgent)) {
    deviceType = 'Android';
  } else if (/Mobile/.test(userAgent)) {
    deviceType = 'Mobile';
  }
  
  const timestamp = new Date().toISOString().substring(0, 16); // YYYY-MM-DDTHH:MM
  return `${deviceType} ${platform} ${timestamp}`;
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

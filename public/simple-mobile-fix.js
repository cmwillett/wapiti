// Simple mobile fix that works step by step
console.log('📱 Simple Mobile Fix Tool loaded');

async function simpleMobileFix() {
  const log = (msg) => {
    console.log(msg);
    // Also show in UI if possible
    const statusDiv = document.getElementById('mobile-fix-status');
    if (statusDiv) {
      statusDiv.innerHTML += msg + '<br>';
      statusDiv.scrollTop = statusDiv.scrollHeight;
    }
  };

  try {
    log('🔄 Starting simple mobile fix...');

    // Step 1: Wait for everything to load
    log('⏳ Step 1: Waiting for services...');
    for (let i = 0; i < 20; i++) {
      if (window.supabase && window.notificationService) break;
      await new Promise(resolve => setTimeout(resolve, 500));
      if (i % 4 === 0) log(`   Still waiting... (${i/2}s)`);
    }

    if (!window.supabase) {
      throw new Error('Supabase failed to load');
    }
    if (!window.notificationService) {
      throw new Error('Notification service failed to load');
    }
    log('✅ Step 1: Services loaded');

    // Step 2: Check authentication
    log('🔑 Step 2: Checking authentication...');
    const { data: { user }, error: authError } = await window.supabase.auth.getUser();
    if (authError) throw new Error(`Auth error: ${authError.message}`);
    if (!user) throw new Error('Not authenticated');
    log(`✅ Step 2: Authenticated as ${user.email}`);

    // Step 3: Request notification permission if needed
    log('🔔 Step 3: Checking notification permission...');
    if (Notification.permission !== 'granted') {
      log('   Requesting notification permission...');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }
    }
    log('✅ Step 3: Notification permission granted');

    // Step 4: Clean up old subscriptions
    log('🧹 Step 4: Cleaning up old subscriptions...');
    const { error: deleteError } = await window.supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id);
    
    if (deleteError) {
      log(`⚠️ Step 4: Delete warning: ${deleteError.message}`);
    } else {
      log('✅ Step 4: Old subscriptions cleared');
    }

    // Step 5: Unsubscribe from any existing push subscription
    log('🔄 Step 5: Clearing browser subscription...');
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          const existingSub = await registration.pushManager.getSubscription();
          if (existingSub) {
            await existingSub.unsubscribe();
            log('✅ Step 5: Browser subscription cleared');
          } else {
            log('✅ Step 5: No existing browser subscription');
          }
        } else {
          throw new Error('No service worker registration found');
        }
      } catch (error) {
        throw new Error(`Service worker issue: ${error.message}`);
      }
    } else {
      throw new Error('Service Worker not supported');
    }

    // Step 6: Wait a moment for cleanup
    log('⏸️ Step 6: Waiting for cleanup to complete...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 7: Create fresh subscription manually
    log('🔄 Step 7: Creating fresh subscription...');
    const registration = await navigator.serviceWorker.getRegistration();
    
    const newSubscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: 'BJPVlwpCxnv6hdAsbgspbI1xcE7_LwhJvDV2ibZ4alQ38WSzFzN6xf-QyYN2FUOP-miBMRTitIdVPSGb1mjYWZU'
    });
    
    log('✅ Step 7: Fresh subscription created');

    // Step 8: Save to database manually
    log('💾 Step 8: Saving to database...');
    const subscriptionData = {
      user_id: user.id,
      endpoint: newSubscription.endpoint,
      p256dh: btoa(String.fromCharCode(...new Uint8Array(newSubscription.getKey('p256dh')))),
      auth: btoa(String.fromCharCode(...new Uint8Array(newSubscription.getKey('auth')))),
      device_name: 'Mobile Device (Fixed)',
      created_at: new Date().toISOString()
    };

    const { data: savedSub, error: saveError } = await window.supabase
      .from('push_subscriptions')
      .insert(subscriptionData)
      .select()
      .single();

    if (saveError) {
      throw new Error(`Database save failed: ${saveError.message}`);
    }
    log('✅ Step 8: Saved to database');

    // Step 9: Update notification service state
    log('🔄 Step 9: Updating notification service...');
    if (window.notificationService) {
      window.notificationService.currentSubscription = newSubscription;
      window.notificationService.isSubscribed = true;
    }
    log('✅ Step 9: Notification service updated');

    // Step 10: Verify everything worked
    log('🔍 Step 10: Verifying registration...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { data: verifyTokens, error: verifyError } = await window.supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id);

    if (verifyError) {
      throw new Error(`Verification failed: ${verifyError.message}`);
    }

    const mobileTokens = verifyTokens.filter(t => 
      t.device_name && (t.device_name.includes('Mobile') || t.device_name.includes('Android'))
    );

    if (mobileTokens.length === 0) {
      throw new Error('No mobile tokens found after fix');
    }

    log(`✅ Step 10: Verified! Found ${verifyTokens.length} total devices, ${mobileTokens.length} mobile`);
    log('🎉 SUCCESS: Mobile device is now registered and ready!');

    return {
      success: true,
      totalDevices: verifyTokens.length,
      mobileDevices: mobileTokens.length,
      endpoint: newSubscription.endpoint.slice(-30)
    };

  } catch (error) {
    log(`❌ FAILED: ${error.message}`);
    console.error('Simple mobile fix error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Create simple UI
function createSimpleMobileFixUI() {
  // Remove existing
  const existing = document.getElementById('simple-mobile-fix');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'simple-mobile-fix';
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 10000;
    background: #007bff;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    border: none;
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 300px;
  `;
  container.textContent = '🔧 Simple Fix';

  container.onclick = async () => {
    // Create status display
    container.innerHTML = `
      <div>🔄 Fixing...</div>
      <div id="mobile-fix-status" style="
        max-height: 200px;
        overflow-y: auto;
        font-size: 11px;
        margin-top: 8px;
        padding: 8px;
        background: rgba(0,0,0,0.2);
        border-radius: 4px;
        line-height: 1.3;
      "></div>
    `;

    try {
      const result = await simpleMobileFix();
      
      if (result.success) {
        container.innerHTML = `
          <div>✅ Fixed!</div>
          <div style="font-size: 11px; margin-top: 4px;">
            ${result.totalDevices} devices registered
          </div>
        `;
        container.style.background = '#28a745';
        
        // Auto-hide after success
        setTimeout(() => {
          container.style.display = 'none';
        }, 5000);
      } else {
        container.innerHTML = `
          <div>❌ Failed</div>
          <div style="font-size: 11px; margin-top: 4px;">
            ${result.error.substring(0, 50)}...
          </div>
        `;
        container.style.background = '#dc3545';
        
        // Reset after error
        setTimeout(() => {
          container.textContent = '🔧 Simple Fix';
          container.style.background = '#007bff';
        }, 5000);
      }
    } catch (error) {
      container.innerHTML = `❌ Error: ${error.message}`;
      container.style.background = '#dc3545';
    }
  };

  document.body.appendChild(container);
}

// Show UI
createSimpleMobileFixUI();

// Also expose function
window.simpleMobileFix = simpleMobileFix;

console.log('📱 Simple mobile fix ready! Look for blue "🔧 Simple Fix" button.');

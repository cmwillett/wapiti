// Mobile diagnostic tool to identify what's failing
console.log('🔍 Mobile Diagnostic Tool loaded');

async function runMobileDiagnostics() {
  console.log('🔍 Running comprehensive mobile diagnostics...');
  
  const results = {
    timestamp: new Date().toISOString(),
    checks: {}
  };

  try {
    // Check 1: Basic browser support
    console.log('\n1️⃣ Checking browser support...');
    results.checks.browserSupport = {
      serviceWorker: 'serviceWorker' in navigator,
      pushManager: 'PushManager' in window,
      notification: 'Notification' in window,
      broadcastChannel: 'BroadcastChannel' in window
    };
    console.log('Browser support:', results.checks.browserSupport);

    // Check 2: Service loading
    console.log('\n2️⃣ Checking service loading...');
    results.checks.services = {
      supabase: !!window.supabase,
      notificationService: !!window.notificationService,
      mobileDeviceManager: !!window.mobileDeviceManager
    };
    console.log('Services loaded:', results.checks.services);

    // Check 3: Authentication
    console.log('\n3️⃣ Checking authentication...');
    try {
      if (window.supabase) {
        const { data: { user }, error } = await window.supabase.auth.getUser();
        results.checks.auth = {
          authenticated: !!user,
          userId: user?.id || null,
          error: error?.message || null
        };
      } else {
        results.checks.auth = { error: 'Supabase not loaded' };
      }
    } catch (error) {
      results.checks.auth = { error: error.message };
    }
    console.log('Authentication:', results.checks.auth);

    // Check 4: Notification permission
    console.log('\n4️⃣ Checking notification permission...');
    results.checks.permission = {
      current: Notification.permission,
      canRequest: typeof Notification.requestPermission === 'function'
    };
    console.log('Notification permission:', results.checks.permission);

    // Check 5: Service worker registration
    console.log('\n5️⃣ Checking service worker...');
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        results.checks.serviceWorker = {
          registered: !!registration,
          scope: registration?.scope || null,
          active: !!registration?.active,
          installing: !!registration?.installing,
          waiting: !!registration?.waiting
        };
      } else {
        results.checks.serviceWorker = { error: 'Not supported' };
      }
    } catch (error) {
      results.checks.serviceWorker = { error: error.message };
    }
    console.log('Service worker:', results.checks.serviceWorker);

    // Check 6: Current push subscription
    console.log('\n6️⃣ Checking push subscription...');
    try {
      if (results.checks.serviceWorker.registered) {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration.pushManager.getSubscription();
        results.checks.pushSubscription = {
          exists: !!subscription,
          endpoint: subscription?.endpoint?.slice(-50) || null,
          keys: subscription ? {
            p256dh: !!subscription.getKey('p256dh'),
            auth: !!subscription.getKey('auth')
          } : null
        };
      } else {
        results.checks.pushSubscription = { error: 'No service worker' };
      }
    } catch (error) {
      results.checks.pushSubscription = { error: error.message };
    }
    console.log('Push subscription:', results.checks.pushSubscription);

    // Check 7: Database connectivity
    console.log('\n7️⃣ Checking database connectivity...');
    try {
      if (window.supabase && results.checks.auth.authenticated) {
        const { data, error } = await window.supabase
          .from('push_subscriptions')
          .select('count')
          .eq('user_id', results.checks.auth.userId);
        
        results.checks.database = {
          connected: !error,
          error: error?.message || null,
          canQuery: !!data
        };
      } else {
        results.checks.database = { error: 'Not authenticated or no supabase' };
      }
    } catch (error) {
      results.checks.database = { error: error.message };
    }
    console.log('Database connectivity:', results.checks.database);

    // Check 8: Try manual subscription creation
    console.log('\n8️⃣ Testing manual subscription creation...');
    try {
      if (results.checks.serviceWorker.registered && results.checks.permission.current === 'granted') {
        const registration = await navigator.serviceWorker.getRegistration();
        
        // First unsubscribe if exists
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          await existingSub.unsubscribe();
          console.log('Unsubscribed existing subscription');
        }

        // Try to create new subscription
        const newSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: 'BJPVlwpCxnv6hdAsbgspbI1xcE7_LwhJvDV2ibZ4alQ38WSzFzN6xf-QyYN2FUOP-miBMRTitIdVPSGb1mjYWZU'
        });

        results.checks.manualSubscription = {
          success: true,
          endpoint: newSubscription.endpoint.slice(-50),
          hasKeys: !!(newSubscription.getKey('p256dh') && newSubscription.getKey('auth'))
        };

        // Try to save to database
        if (results.checks.auth.authenticated) {
          const subscriptionData = {
            user_id: results.checks.auth.userId,
            endpoint: newSubscription.endpoint,
            p256dh: btoa(String.fromCharCode(...new Uint8Array(newSubscription.getKey('p256dh')))),
            auth: btoa(String.fromCharCode(...new Uint8Array(newSubscription.getKey('auth')))),
            device_name: 'Mobile Diagnostic Test',
            created_at: new Date().toISOString()
          };

          const { data, error } = await window.supabase
            .from('push_subscriptions')
            .insert(subscriptionData)
            .select()
            .single();

          results.checks.manualSubscription.databaseSave = {
            success: !error,
            error: error?.message || null,
            data: data ? 'Saved successfully' : null
          };
        }

      } else {
        results.checks.manualSubscription = { 
          error: 'Missing requirements',
          requirements: {
            serviceWorker: results.checks.serviceWorker.registered,
            permission: results.checks.permission.current === 'granted'
          }
        };
      }
    } catch (error) {
      results.checks.manualSubscription = { error: error.message };
    }
    console.log('Manual subscription test:', results.checks.manualSubscription);

    // Summary
    console.log('\n📋 DIAGNOSTIC SUMMARY:');
    console.log('==================');
    
    const issues = [];
    if (!results.checks.browserSupport.serviceWorker) issues.push('❌ Service Worker not supported');
    if (!results.checks.browserSupport.pushManager) issues.push('❌ Push Manager not supported');
    if (!results.checks.services.supabase) issues.push('❌ Supabase not loaded');
    if (!results.checks.services.notificationService) issues.push('❌ Notification Service not loaded');
    if (!results.checks.auth.authenticated) issues.push('❌ Not authenticated');
    if (results.checks.permission.current !== 'granted') issues.push('❌ Notification permission not granted');
    if (!results.checks.serviceWorker.registered) issues.push('❌ Service Worker not registered');
    if (results.checks.database.error) issues.push(`❌ Database issue: ${results.checks.database.error}`);
    if (results.checks.manualSubscription.error) issues.push(`❌ Subscription creation failed: ${results.checks.manualSubscription.error}`);

    if (issues.length === 0) {
      console.log('✅ All checks passed! Manual subscription should work.');
      if (results.checks.manualSubscription.databaseSave?.success) {
        console.log('✅ Database save also worked!');
      }
    } else {
      console.log('❌ Issues found:');
      issues.forEach(issue => console.log(`  ${issue}`));
    }

    return results;

  } catch (error) {
    console.error('❌ Diagnostic error:', error);
    results.error = error.message;
    return results;
  }
}

// Auto-run diagnostics
runMobileDiagnostics().then(results => {
  console.log('\n🔍 Full diagnostic results:', results);
});

// Also expose for manual use
window.runMobileDiagnostics = runMobileDiagnostics;

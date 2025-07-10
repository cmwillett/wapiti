/**
 * Production Edge Function Test
 * Test if the Supabase Edge Function is working in production
 */

window.testProductionEdgeFunction = async function() {
    console.log('🔧 Testing Production Edge Function');
    console.log('=' .repeat(50));
    
    try {
        // Get the Supabase URL from window.supabase or ask user to provide
        let supabaseUrl, supabaseAnonKey;
        
        if (window.tempSupabaseConfig) {
            supabaseUrl = window.tempSupabaseConfig.url;
            supabaseAnonKey = window.tempSupabaseConfig.key;
        } else if (window.supabase && window.supabase.supabaseUrl && window.supabase.supabaseKey) {
            supabaseUrl = window.supabase.supabaseUrl;
            supabaseAnonKey = window.supabase.supabaseKey;
        } else {
            console.log('ℹ️ Cannot auto-detect Supabase config');
            console.log('💡 Please run: window.setSupabaseConfig("YOUR_URL", "YOUR_ANON_KEY")');
            console.log('💡 Or check if window.supabase is available');
            return;
        }
        
        console.log('📡 Supabase URL:', supabaseUrl);
        console.log('🔑 Anon Key available:', supabaseAnonKey ? 'Yes' : 'No');
        
        // Test Edge Function endpoint
        const edgeFunctionUrl = `${supabaseUrl}/functions/v1/check-reminders`;
        console.log('🎯 Testing Edge Function:', edgeFunctionUrl);
        
        const response = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ test: true })
        });
        
        console.log('📈 Response status:', response.status);
        console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
            const result = await response.text();
            console.log('✅ Edge Function response:', result);
        } else {
            const error = await response.text();
            console.log('❌ Edge Function error:', error);
        }
        
    } catch (error) {
        console.log('❌ Edge Function test failed:', error);
    }
    
    console.log('\n🔍 Additional Checks:');
    console.log('1. Verify Edge Function is deployed in Supabase dashboard');
    console.log('2. Check environment variables in Supabase Edge Function settings');
    console.log('3. Verify VAPID keys and Twilio credentials are set');
    console.log('4. Check GitHub Actions is running successfully');
};

// Also test push subscription
window.testProductionPushSubscription = async function() {
    console.log('📱 Testing Production Push Subscription');
    console.log('=' .repeat(50));
    
    try {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            const registration = await navigator.serviceWorker.ready;
            console.log('✅ Service Worker ready');
            
            const vapidPublicKey = window.tempVapidKey || window.vapidKey || null;
            if (!vapidPublicKey) {
                console.log('❌ VAPID public key missing');
                console.log('💡 Please run: window.tempVapidKey = "YOUR_VAPID_PUBLIC_KEY"');
                return;
            }
            
            console.log('🔑 VAPID key available:', vapidPublicKey ? 'Yes' : 'No');
            
            // Try to get existing subscription
            let subscription = await registration.pushManager.getSubscription();
            
            if (!subscription) {
                console.log('📝 Creating new push subscription...');
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: vapidPublicKey
                });
            }
            
            console.log('✅ Push subscription obtained');
            console.log('📡 Endpoint:', subscription.endpoint);
            
            // Test saving to Supabase
            if (window.supabase) {
                const { data: { user } } = await window.supabase.auth.getUser();
                if (user) {
                    const { error } = await window.supabase
                        .from('push_subscriptions')
                        .upsert({
                            user_id: user.id,
                            endpoint: subscription.endpoint,
                            p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
                            auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')))),
                            created_at: new Date().toISOString()
                        });
                    
                    if (error) {
                        console.log('❌ Error saving push subscription:', error);
                    } else {
                        console.log('✅ Push subscription saved to database');
                    }
                }
            }
            
        } else {
            console.log('❌ Push notifications not supported');
        }
    } catch (error) {
        console.log('❌ Push subscription test failed:', error);
    }
};

console.log('🔧 Production test scripts loaded.');
console.log('💡 Run testProductionEdgeFunction() to test backend');
console.log('💡 Run testProductionPushSubscription() to test push setup');

// Auto-run tests
setTimeout(() => {
    console.log('🔄 Running production tests...');
    testProductionEdgeFunction();
    setTimeout(() => {
        testProductionPushSubscription();
    }, 3000);
}, 1000);

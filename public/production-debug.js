/**
 * Production Notification Debugging Script
 * Run this in the production environment to diagnose notification issues
 */

window.productionNotificationDebug = async function() {
    console.log('🔍 Production Notification Debug Started');
    console.log('=' .repeat(60));
    
    // Basic environment check
    console.log('\n1️⃣ Environment Check:');
    console.log('   URL:', window.location.href);
    console.log('   Protocol:', window.location.protocol);
    console.log('   HTTPS:', window.location.protocol === 'https:');
    console.log('   User Agent:', navigator.userAgent);
    
    // Notification API check
    console.log('\n2️⃣ Notification API:');
    console.log('   Notification supported:', 'Notification' in window);
    console.log('   Permission:', Notification.permission);
    console.log('   Service Worker supported:', 'serviceWorker' in navigator);
    console.log('   Push Manager supported:', 'PushManager' in window);
    
    // Environment variables check
    console.log('\n3️⃣ Environment Variables:');
    console.log('   VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing');
    console.log('   VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
    console.log('   VITE_VAPID_PUBLIC_KEY:', import.meta.env.VITE_VAPID_PUBLIC_KEY ? '✅ Set' : '❌ Missing');
    
    // Service Worker check
    console.log('\n4️⃣ Service Worker Status:');
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                console.log('   ✅ Service Worker registered');
                console.log('   Scope:', registration.scope);
                console.log('   State:', registration.active?.state);
                console.log('   Update found:', registration.waiting ? 'Yes' : 'No');
            } else {
                console.log('   ❌ Service Worker not registered');
            }
        } catch (error) {
            console.log('   ❌ Service Worker error:', error);
        }
    }
    
    // Supabase connection check
    console.log('\n5️⃣ Supabase Connection:');
    try {
        // Check if supabase is accessible
        if (window.supabase) {
            const { data: { user } } = await window.supabase.auth.getUser();
            console.log('   ✅ Supabase client available');
            console.log('   User authenticated:', user ? 'Yes' : 'No');
            if (user) {
                console.log('   User ID:', user.id);
            }
        } else {
            console.log('   ❌ Supabase client not found');
        }
    } catch (error) {
        console.log('   ❌ Supabase error:', error);
    }
    
    // Browser reminder checker status
    console.log('\n6️⃣ Browser Reminder Checker:');
    if (window.browserReminderChecker) {
        console.log('   ✅ Browser reminder checker available');
        console.log('   Interval active:', window.browserReminderChecker.checkInterval ? 'Yes' : 'No');
    } else {
        console.log('   ❌ Browser reminder checker not found');
    }
    
    // Test basic notification
    console.log('\n7️⃣ Testing Basic Notification:');
    if (Notification.permission === 'granted') {
        try {
            const testNotification = new Notification('Production Test', {
                body: 'Testing notifications in production environment',
                icon: '/favicon.svg'
            });
            
            testNotification.onshow = () => {
                console.log('   ✅ Basic notification shown');
            };
            
            testNotification.onerror = (error) => {
                console.log('   ❌ Basic notification error:', error);
            };
            
            // Auto-close after 3 seconds
            setTimeout(() => {
                testNotification.close();
            }, 3000);
            
        } catch (error) {
            console.log('   ❌ Error creating notification:', error);
        }
    } else {
        console.log('   ⚠️ Need to request notification permission first');
        try {
            const permission = await Notification.requestPermission();
            console.log('   New permission:', permission);
        } catch (error) {
            console.log('   ❌ Permission request error:', error);
        }
    }
    
    // Check for tasks with reminders
    console.log('\n8️⃣ Checking for Existing Reminders:');
    try {
        if (window.supabase) {
            const { data: { user } } = await window.supabase.auth.getUser();
            if (user) {
                const { data: tasks, error } = await window.supabase
                    .from('tasks')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('reminder_sent', false)
                    .eq('completed', false)
                    .not('reminder_time', 'is', null);
                
                if (error) {
                    console.log('   ❌ Error fetching tasks:', error);
                } else {
                    console.log(`   📋 Found ${tasks?.length || 0} tasks with reminders`);
                    if (tasks && tasks.length > 0) {
                        tasks.forEach(task => {
                            const reminderTime = new Date(task.reminder_time);
                            const now = new Date();
                            const isPast = reminderTime <= now;
                            console.log(`   - "${task.text}" reminder at ${reminderTime.toLocaleString()} ${isPast ? '(PAST DUE)' : '(FUTURE)'}`);
                        });
                    }
                }
            }
        }
    } catch (error) {
        console.log('   ❌ Error checking reminders:', error);
    }
    
    console.log('\n9️⃣ Recommended Actions:');
    console.log('   1. Check if HTTPS is enabled (required for notifications)');
    console.log('   2. Verify environment variables are set in production');
    console.log('   3. Check browser console for any JavaScript errors');
    console.log('   4. Verify Supabase Edge Function is deployed and working');
    console.log('   5. Test creating a new reminder to see if the flow works');
    
    console.log('\n=' .repeat(60));
    console.log('🎯 Debug complete. Check the logs above for issues.');
};

// Auto-run debug
console.log('🔍 Production Debug Script loaded.');
console.log('💡 Running automatic debug in 2 seconds...');
console.log('💡 Or run productionNotificationDebug() manually.');

setTimeout(() => {
    productionNotificationDebug();
}, 2000);

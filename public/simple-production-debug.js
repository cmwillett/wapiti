/**
 * Simple Production Debug - Browser Compatible
 * No import.meta dependencies
 */

window.simpleProductionDebug = function() {
    console.log('🔍 Simple Production Debug');
    console.log('=' .repeat(40));
    
    // Basic checks
    console.log('\n1️⃣ Basic Environment:');
    console.log('   URL:', window.location.href);
    console.log('   HTTPS:', window.location.protocol === 'https:');
    console.log('   Notifications:', 'Notification' in window);
    console.log('   Permission:', Notification.permission);
    console.log('   Service Worker:', 'serviceWorker' in navigator);
    
    // Framework checks
    console.log('\n2️⃣ App Components:');
    console.log('   Supabase client:', window.supabase ? '✅' : '❌');
    console.log('   Reminder checker:', window.browserReminderChecker ? '✅' : '❌');
    console.log('   Notification service:', window.notificationService ? '✅' : '❌');
    
    // Test basic notification
    console.log('\n3️⃣ Testing notification...');
    if (Notification.permission === 'granted') {
        try {
            const notification = new Notification('Production Debug Test', {
                body: 'If you see this, basic notifications work!',
                icon: '/favicon.svg'
            });
            console.log('   ✅ Notification created successfully');
            setTimeout(() => notification.close(), 3000);
        } catch (error) {
            console.log('   ❌ Notification error:', error);
        }
    } else {
        console.log('   ⚠️ Need notification permission');
        Notification.requestPermission().then(permission => {
            console.log('   New permission:', permission);
        });
    }
    
    // Service worker check
    console.log('\n4️⃣ Service Worker:');
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(registration => {
            if (registration) {
                console.log('   ✅ Registered');
                console.log('   Scope:', registration.scope);
                console.log('   State:', registration.active?.state);
            } else {
                console.log('   ❌ Not registered');
            }
        });
    }
    
    console.log('\n💡 Next steps:');
    console.log('   1. If Supabase is missing, check environment variables');
    console.log('   2. If notification test fails, check HTTPS and permissions');
    console.log('   3. Try creating a task with a reminder');
    console.log('   4. Check browser console for any errors');
};

// Manual config helpers
window.manualSupabaseTest = function(url, anonKey) {
    console.log('🧪 Manual Supabase Test');
    const edgeUrl = `${url}/functions/v1/check-reminders`;
    
    fetch(edgeUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${anonKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: true })
    })
    .then(response => {
        console.log('   Status:', response.status);
        return response.text();
    })
    .then(result => {
        console.log('   ✅ Edge Function response:', result);
    })
    .catch(error => {
        console.log('   ❌ Edge Function error:', error);
    });
};

window.manualNotificationTest = function() {
    console.log('🔔 Manual Notification Test');
    
    if (Notification.permission !== 'granted') {
        console.log('Requesting permission...');
        Notification.requestPermission().then(permission => {
            console.log('Permission:', permission);
            if (permission === 'granted') {
                showTestNotification();
            }
        });
    } else {
        showTestNotification();
    }
    
    function showTestNotification() {
        const notification = new Notification('Manual Test', {
            body: 'This is a manual notification test',
            icon: '/favicon.svg',
            requireInteraction: true
        });
        
        notification.onclick = () => {
            console.log('✅ Notification clicked!');
            notification.close();
        };
        
        notification.onshow = () => {
            console.log('✅ Notification shown');
        };
        
        notification.onerror = (error) => {
            console.log('❌ Notification error:', error);
        };
    }
};

console.log('🔧 Simple debug loaded. Run simpleProductionDebug()');

// Auto-run
setTimeout(() => {
    simpleProductionDebug();
}, 1000);

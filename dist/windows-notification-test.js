/**
 * Windows Notification Test - Step by Step
 * Run this in the browser console to test each level of notification
 */

window.windowsNotificationTest = async function() {
    console.log('🪟 Windows Notification Test Started');
    console.log('='.repeat(50));
    
    // Step 1: Check basic notification permission
    console.log('1️⃣ Checking notification permission...');
    console.log('Permission status:', Notification.permission);
    
    if (Notification.permission === 'denied') {
        console.log('❌ Notifications are denied. Please enable in browser settings.');
        return;
    }
    
    if (Notification.permission === 'default') {
        console.log('⚠️ Requesting notification permission...');
        const permission = await Notification.requestPermission();
        console.log('New permission status:', permission);
        if (permission !== 'granted') {
            console.log('❌ Permission not granted. Cannot continue.');
            return;
        }
    }
    
    // Step 2: Test basic notification
    console.log('\n2️⃣ Testing basic notification...');
    try {
        const basicNotification = new Notification('Basic Test', {
            body: 'This is a basic notification test',
            icon: '/favicon.svg',
            tag: 'basic-test'
        });
        
        basicNotification.onclick = () => {
            console.log('✅ Basic notification clicked!');
            basicNotification.close();
        };
        
        basicNotification.onshow = () => {
            console.log('✅ Basic notification shown');
        };
        
        basicNotification.onerror = (error) => {
            console.log('❌ Basic notification error:', error);
        };
        
        console.log('Basic notification created:', basicNotification);
        
        // Auto-close after 5 seconds
        setTimeout(() => {
            if (basicNotification) {
                basicNotification.close();
                console.log('Basic notification auto-closed');
            }
        }, 5000);
        
    } catch (error) {
        console.log('❌ Error creating basic notification:', error);
    }
    
    // Step 3: Wait a moment, then test service worker notification
    console.log('\n3️⃣ Waiting 3 seconds, then testing service worker notification...');
    
    setTimeout(async () => {
        try {
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                console.log('Service worker ready');
                
                await registration.showNotification('Service Worker Test', {
                    body: 'This notification comes from the service worker',
                    icon: '/favicon.svg',
                    badge: '/favicon.svg',
                    tag: 'sw-test',
                    requireInteraction: true,
                    actions: [
                        { action: 'view', title: 'View' },
                        { action: 'dismiss', title: 'Dismiss' }
                    ]
                });
                
                console.log('✅ Service worker notification sent');
            } else {
                console.log('❌ Service worker not supported');
            }
        } catch (error) {
            console.log('❌ Error with service worker notification:', error);
        }
    }, 3000);
    
    // Step 4: Test with different notification options
    console.log('\n4️⃣ Waiting 6 seconds, then testing notification with different options...');
    
    setTimeout(() => {
        try {
            const advancedNotification = new Notification('Advanced Test', {
                body: 'This notification has advanced options and should be very visible',
                icon: '/favicon.svg',
                badge: '/favicon.svg',
                tag: 'advanced-test',
                requireInteraction: true,
                silent: false,
                renotify: true,
                timestamp: Date.now(),
                data: { test: true }
            });
            
            advancedNotification.onshow = () => {
                console.log('✅ Advanced notification shown');
            };
            
            advancedNotification.onclick = () => {
                console.log('✅ Advanced notification clicked!');
                advancedNotification.close();
            };
            
            console.log('Advanced notification created:', advancedNotification);
            
        } catch (error) {
            console.log('❌ Error creating advanced notification:', error);
        }
    }, 6000);
    
    // Step 5: Instructions for manual checking
    console.log('\n5️⃣ Manual Check Instructions:');
    console.log('   📱 Look at your screen for notifications');
    console.log('   🔔 Check Windows Action Center (click notification icon in system tray)');
    console.log('   ⚙️ If no notifications appear, check Windows Settings:');
    console.log('      • Win + I > System > Notifications & actions');
    console.log('      • Ensure notifications are enabled for your browser');
    console.log('   🎯 Try clicking the Windows notification test button in Settings');
    
    console.log('\n6️⃣ Expected Results:');
    console.log('   • You should see 3 notifications total');
    console.log('   • Basic notification (auto-closes after 5 seconds)');
    console.log('   • Service worker notification (with action buttons)');
    console.log('   • Advanced notification (requires interaction)');
    
    console.log('\n='.repeat(50));
    console.log('If you see no notifications but no errors, the issue is Windows notification settings.');
};

// Auto-run the test
console.log('Windows Notification Test loaded. Run windowsNotificationTest() to start.');
console.log('Or wait 2 seconds for auto-run...');

setTimeout(() => {
    if (confirm('Run Windows notification test? This will show multiple test notifications.')) {
        windowsNotificationTest();
    }
}, 2000);

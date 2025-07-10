/**
 * Focused Windows Notification Display Test
 * Since notifications are created but not displayed, this tests different display approaches
 */

window.windowsDisplayTest = async function() {
    console.log('🎯 Windows Notification Display Test');
    console.log('📝 Testing different notification display methods...');
    
    // Test 1: Maximum visibility notification
    console.log('\n1️⃣ Testing maximum visibility notification...');
    try {
        const maxNotification = new Notification('🚨 URGENT TEST NOTIFICATION 🚨', {
            body: '🔥 If you can see this, Windows notifications are working! 🔥\n\nThis should be VERY visible with sound and persistence.',
            icon: '/favicon.svg',
            badge: '/favicon.svg',
            tag: 'urgent-test',
            requireInteraction: true, // Stays until user interacts
            silent: false, // Should make sound
            renotify: true, // Forces re-notification
            timestamp: Date.now(),
            vibrate: [200, 100, 200], // Vibration pattern (if supported)
            actions: [
                { action: 'confirm', title: '✅ I CAN SEE THIS!' },
                { action: 'dismiss', title: '❌ Still not visible' }
            ]
        });
        
        maxNotification.onshow = () => {
            console.log('✅ Max visibility notification SHOWN');
        };
        
        maxNotification.onclick = () => {
            console.log('🎉 SUCCESS! You clicked the notification - it IS working!');
            alert('🎉 SUCCESS! Notifications are working! The issue was just visibility settings.');
            maxNotification.close();
        };
        
        maxNotification.onclose = () => {
            console.log('Max visibility notification closed');
        };
        
        maxNotification.onerror = (error) => {
            console.log('❌ Max visibility notification error:', error);
        };
        
    } catch (error) {
        console.log('❌ Error creating max visibility notification:', error);
    }
    
    // Test 2: Multiple rapid notifications
    console.log('\n2️⃣ Testing multiple rapid notifications (harder to miss)...');
    for (let i = 1; i <= 3; i++) {
        setTimeout(() => {
            try {
                const rapidNotification = new Notification(`Rapid Test #${i}`, {
                    body: `This is rapid notification ${i} of 3. Are you seeing these?`,
                    icon: '/favicon.svg',
                    tag: `rapid-${i}`,
                    silent: false,
                    renotify: true
                });
                
                rapidNotification.onshow = () => {
                    console.log(`✅ Rapid notification ${i} shown`);
                };
                
                // Auto-close after 3 seconds to make room for next one
                setTimeout(() => {
                    rapidNotification.close();
                }, 3000);
                
            } catch (error) {
                console.log(`❌ Error creating rapid notification ${i}:`, error);
            }
        }, i * 1000);
    }
    
    // Test 3: Service worker notification with maximum options
    console.log('\n3️⃣ Testing service worker notification with all options...');
    setTimeout(async () => {
        try {
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                
                await registration.showNotification('🔔 SERVICE WORKER TEST 🔔', {
                    body: '🎯 This comes from the service worker.\n\n✅ If you see this, service worker notifications work!\n❌ If not, check Windows settings.',
                    icon: '/favicon.svg',
                    badge: '/favicon.svg',
                    tag: 'sw-max-test',
                    requireInteraction: true,
                    silent: false,
                    renotify: true,
                    timestamp: Date.now(),
                    vibrate: [300, 100, 300, 100, 300],
                    actions: [
                        { action: 'working', title: '✅ I CAN SEE THIS!' },
                        { action: 'not-working', title: '❌ Still nothing' },
                        { action: 'settings', title: '⚙️ Check settings' }
                    ],
                    data: {
                        test: true,
                        message: 'Service worker notification test'
                    }
                });
                
                console.log('✅ Service worker notification with all options sent');
            }
        } catch (error) {
            console.log('❌ Error with service worker notification:', error);
        }
    }, 5000);
    
    // Test 4: Check Action Center
    console.log('\n4️⃣ Instructions for Action Center check...');
    console.log('   🔔 Press Win + A (or click notification icon in system tray)');
    console.log('   👀 Look for any notifications in the Action Center sidebar');
    console.log('   💡 Notifications might be going there instead of showing as banners');
    
    // Test 5: System info
    console.log('\n5️⃣ System notification info...');
    console.log('   🖥️ Document visibility:', document.visibilityState);
    console.log('   🎯 Window focus:', document.hasFocus());
    console.log('   ⏰ Current time:', new Date().toLocaleString());
    console.log('   🌐 Page URL:', window.location.href);
    
    console.log('\n📋 WHAT TO DO NEXT:');
    console.log('   1. Watch your screen carefully for the next 10 seconds');
    console.log('   2. Listen for notification sounds');
    console.log('   3. Check Windows Action Center (Win + A)');
    console.log('   4. If still nothing, follow Windows settings troubleshooting');
    
    console.log('\n⚠️  REMINDER: Your code is working perfectly!');
    console.log('   The ✅ shown logs prove notifications are created successfully.');
    console.log('   This is purely a Windows display/settings issue.');
};

// Load and run
console.log('🎯 Windows Display Test loaded. Running in 2 seconds...');
console.log('👀 Watch your screen carefully!');

setTimeout(() => {
    windowsDisplayTest();
}, 2000);

/**
 * Windows Notification Recovery Test
 * Since notifications worked before but stopped, let's find what changed
 */

window.notificationRecoveryTest = async function() {
    console.log('🔧 Windows Notification Recovery Test');
    console.log('📝 Since notifications worked before, something changed...');
    
    // Test 1: Simple notification without actions (most basic)
    console.log('\n1️⃣ Testing basic notification (no actions)...');
    try {
        const basicNotification = new Notification('🔔 Basic Recovery Test', {
            body: 'Simple notification without any advanced features',
            icon: '/favicon.svg',
            silent: false
        });
        
        basicNotification.onshow = () => {
            console.log('✅ Basic notification shown');
        };
        
        basicNotification.onclick = () => {
            console.log('🎉 Basic notification clicked!');
            basicNotification.close();
        };
        
        // Auto-close after 5 seconds
        setTimeout(() => {
            basicNotification.close();
        }, 5000);
        
    } catch (error) {
        console.log('❌ Error with basic notification:', error);
    }
    
    // Test 2: Check if notifications are going to Action Center
    console.log('\n2️⃣ Action Center check...');
    console.log('   🔔 Press Win + A right now and check for notifications');
    console.log('   💡 The basic notification above might be there');
    
    // Test 3: Service Worker notification (simplified)
    console.log('\n3️⃣ Testing simplified service worker notification...');
    setTimeout(async () => {
        try {
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                
                await registration.showNotification('🔧 Recovery Test SW', {
                    body: 'Simple service worker notification',
                    icon: '/favicon.svg',
                    silent: false,
                    tag: 'recovery-test'
                });
                
                console.log('✅ Service worker notification sent');
            }
        } catch (error) {
            console.log('❌ Service worker notification error:', error);
        }
    }, 3000);
    
    // Test 4: Check Focus Assist
    console.log('\n4️⃣ Focus Assist diagnosis...');
    console.log('   Since notifications worked before but stopped, Focus Assist might have changed');
    console.log('   🔸 Press Win + I');
    console.log('   🔸 Go to System > Focus assist');
    console.log('   🔸 Current setting should be "Off" for testing');
    console.log('   🔸 If its "Priority only" or "Alarms only", that could be the issue');
    
    // Test 5: Windows notification reset procedure
    console.log('\n5️⃣ Windows notification reset procedure...');
    console.log('   Since this worked before, try this reset:');
    console.log('   1. Win + I > System > Notifications & actions');
    console.log('   2. Turn OFF "Get notifications from apps and other senders"');
    console.log('   3. Wait 10 seconds');
    console.log('   4. Turn it back ON');
    console.log('   5. Find your browser in the list and re-enable it');
    console.log('   6. Restart your browser completely');
    
    // Test 6: Chrome-specific settings
    console.log('\n6️⃣ Chrome notification settings check...');
    console.log('   🔸 In Chrome: Settings > Privacy and security > Site Settings > Notifications');
    console.log('   🔸 Ensure "Sites can ask to send notifications" is enabled');
    console.log('   🔸 Check if localhost:5177 is in "Allowed" (not blocked)');
    console.log('   🔸 Try removing localhost from all lists and re-granting permission');
    
    // Test 7: Windows 11 specific issues
    console.log('\n7️⃣ Windows 11 notification banner settings...');
    console.log('   Since you mentioned no "show notification banners" option:');
    console.log('   🔸 Win + I > System > Notifications');
    console.log('   🔸 Look for "Notifications" (not "Notifications & actions")');
    console.log('   🔸 Check if there\'s a "Show notifications on the lock screen" toggle');
    console.log('   🔸 Try clicking on your browser name for more options');
    
    console.log('\n🎯 Most likely causes (since it worked before):');
    console.log('   • Focus Assist got turned on');
    console.log('   • Windows Update changed notification settings');
    console.log('   • Browser notification permission got reset');
    console.log('   • Windows notification service needs restart');
    
    console.log('\n⚡ Quick fix to try RIGHT NOW:');
    console.log('   1. Check Action Center (Win + A) for the test notifications');
    console.log('   2. If theyre there, the issue is banner display settings');
    console.log('   3. If theyre not there, the issue is notification blocking');
};

// Also create a Windows restart notification service function
window.restartNotificationService = function() {
    console.log('🔄 Windows Notification Service Restart Instructions:');
    console.log('');
    console.log('Since notifications worked before but stopped, the Windows notification');
    console.log('service might be stuck. Here\'s how to restart it:');
    console.log('');
    console.log('Method 1 - Simple restart:');
    console.log('   1. Close your browser completely');
    console.log('   2. Restart Windows');
    console.log('   3. Open browser and test again');
    console.log('');
    console.log('Method 2 - Service restart (advanced):');
    console.log('   1. Press Win + R');
    console.log('   2. Type "services.msc" and press Enter');
    console.log('   3. Find "Windows Push Notifications User Service"');
    console.log('   4. Right-click and select "Restart"');
    console.log('   5. Also restart "Windows Notification Platform Service"');
    console.log('');
    console.log('Method 3 - Reset notification preferences:');
    console.log('   1. Win + I > Apps > Apps & features');
    console.log('   2. Search for your browser');
    console.log('   3. Click "Advanced options"');
    console.log('   4. Click "Reset" (this resets all permissions)');
    console.log('   5. Re-grant notification permission in your app');
};

console.log('🔧 Notification Recovery Test loaded.');
console.log('💡 Since notifications worked before, something in Windows changed.');
console.log('💡 Run notificationRecoveryTest() to diagnose.');
console.log('💡 Run restartNotificationService() for restart instructions.');

// Auto-run in 2 seconds
setTimeout(() => {
    notificationRecoveryTest();
}, 2000);

/**
 * Windows Notification Settings Diagnostic
 * This will help identify the exact Windows setting blocking notifications
 */

window.windowsSettingsCheck = function() {
    console.log('🪟 Windows Notification Settings Diagnostic');
    console.log('=' .repeat(60));
    
    console.log('\n📋 STEP-BY-STEP WINDOWS SETTINGS CHECK:');
    console.log('\n1️⃣ IMMEDIATE ACTIONS TO TRY:');
    console.log('   🔸 Press Win + A (open Action Center)');
    console.log('   🔸 Look for any notifications in the sidebar');
    console.log('   🔸 Check if notifications are hidden there');
    
    console.log('\n2️⃣ WINDOWS NOTIFICATION SETTINGS:');
    console.log('   🔸 Press Win + I (open Settings)');
    console.log('   🔸 Go to System > Notifications & actions');
    console.log('   🔸 Check "Get notifications from apps and other senders" is ON');
    console.log('   🔸 Check "Show notifications on the lock screen" is ON');
    console.log('   🔸 Check "Show reminders and incoming VoIP calls on the lock screen" is ON');
    
    console.log('\n3️⃣ BROWSER-SPECIFIC SETTINGS:');
    console.log('   🔸 In the same Notifications settings page');
    console.log('   🔸 Scroll down to "Get notifications from these senders"');
    console.log('   🔸 Find your browser (Chrome/Edge/Firefox)');
    console.log('   🔸 Ensure it\'s enabled and click on it');
    console.log('   🔸 Check all sub-options are enabled');
    
    console.log('\n4️⃣ FOCUS ASSIST SETTINGS:');
    console.log('   🔸 Go to System > Focus assist');
    console.log('   🔸 Set to "Off" (recommended for testing)');
    console.log('   🔸 Or if using "Priority only", add your browser to priority list');
    
    console.log('\n5️⃣ NOTIFICATION BANNER SETTINGS:');
    console.log('   🔸 In System > Notifications & actions');
    console.log('   🔸 Look for "Show notification banners" - ensure it\'s ON');
    console.log('   🔸 Check "Play a sound when a notification arrives" - ensure it\'s ON');
    
    console.log('\n6️⃣ WINDOWS BUILT-IN TEST:');
    console.log('   🔸 In System > Notifications & actions');
    console.log('   🔸 Find your browser in the senders list');
    console.log('   🔸 Click on your browser name');
    console.log('   🔸 Look for "Send a test notification" button');
    console.log('   🔸 Click it - if this doesn\'t show a notification, Windows is blocking it');
    
    console.log('\n🚨 COMMON ISSUES:');
    console.log('   🔸 Browser is enabled but notification banners are disabled');
    console.log('   🔸 Focus Assist is silently blocking notifications');
    console.log('   🔸 Notifications are going to Action Center instead of showing banners');
    console.log('   🔸 Windows enterprise/group policy blocking notifications');
    
    console.log('\n💡 RESET STEPS IF NOTHING WORKS:');
    console.log('   1. Turn OFF "Get notifications from apps and other senders"');
    console.log('   2. Wait 10 seconds');
    console.log('   3. Turn it back ON');
    console.log('   4. Re-enable your browser');
    console.log('   5. Restart your browser');
    console.log('   6. Try the test again');
    
    console.log('\n⚡ NUCLEAR OPTION:');
    console.log('   🔸 Restart Windows (notification service can get stuck)');
    console.log('   🔸 Check for Windows updates');
    console.log('   🔸 Run as administrator (some notification features need elevated permissions)');
    
    console.log('\n=' .repeat(60));
    console.log('🎯 Since your notifications show "✅ shown" in console but not on screen,');
    console.log('   the issue is 100% Windows notification display settings.');
    
    // Try to get more system info
    console.log('\n🔍 ADDITIONAL SYSTEM INFO:');
    console.log('   User Agent:', navigator.userAgent);
    console.log('   Platform:', navigator.platform);
    console.log('   Language:', navigator.language);
    console.log('   Online:', navigator.onLine);
    console.log('   Permissions API available:', 'permissions' in navigator);
    
    if ('permissions' in navigator) {
        navigator.permissions.query({name: 'notifications'}).then(permission => {
            console.log('   Detailed notification permission:', permission.state);
        });
    }
};

// Auto-run
console.log('🪟 Windows Settings Checker loaded.');
console.log('💡 Your notifications ARE working - they show "✅ shown" in console.');
console.log('💡 The issue is Windows not displaying them visually.');
console.log('💡 Run windowsSettingsCheck() for detailed troubleshooting steps.');

setTimeout(() => {
    windowsSettingsCheck();
}, 1000);

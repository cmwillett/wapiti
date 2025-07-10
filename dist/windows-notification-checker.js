// Windows Notification Settings Checker
// This script helps diagnose Windows-specific notification issues

window.checkWindowsNotifications = async function() {
  console.log('🔍 Windows Notification Settings Checker');
  console.log('==========================================');
  
  // 1. Check basic notification support
  console.log('\n1️⃣ Basic Notification Support:');
  console.log('   Notification API:', 'Notification' in window ? '✅ Available' : '❌ Not available');
  console.log('   Permission:', Notification.permission);
  
  // 2. Check browser-specific settings
  console.log('\n2️⃣ Browser Information:');
  console.log('   User Agent:', navigator.userAgent);
  console.log('   Is Chrome:', navigator.userAgent.includes('Chrome'));
  console.log('   Is Edge:', navigator.userAgent.includes('Edg'));
  
  // 3. Check page state
  console.log('\n3️⃣ Page State:');
  console.log('   Page Visible:', !document.hidden);
  console.log('   Page Focused:', document.hasFocus());
  console.log('   URL:', window.location.href);
  console.log('   Protocol:', window.location.protocol);
  
  // 4. Test notification with explicit user interaction
  console.log('\n4️⃣ Interactive Notification Test:');
  console.log('   Click OK in the next alert, then we\'ll test a notification...');
  
  // Force user interaction
  alert('Click OK to test notification (this ensures user interaction)');
  
  try {
    const notification = new Notification('Windows Test Notification', {
      body: 'If you see this, Windows notifications are working!',
      icon: '/favicon.ico',
      tag: 'windows-test',
      requireInteraction: true,
      silent: false
    });
    
    console.log('   ✅ Notification created successfully');
    
    notification.onclick = () => {
      console.log('   ✅ Notification clicked!');
      notification.close();
    };
    
    notification.onshow = () => {
      console.log('   ✅ Notification shown!');
    };
    
    notification.onerror = (error) => {
      console.log('   ❌ Notification error:', error);
    };
    
    notification.onclose = () => {
      console.log('   ℹ️ Notification closed');
    };
    
    // Auto-close after 10 seconds
    setTimeout(() => {
      if (notification) {
        notification.close();
      }
    }, 10000);
    
  } catch (error) {
    console.log('   ❌ Error creating notification:', error);
  }
  
  // 5. Windows-specific troubleshooting guide
  console.log('\n5️⃣ Windows Troubleshooting Steps:');
  console.log('   If you did NOT see the notification above, try these steps:');
  console.log('   ');
  console.log('   📱 Step 1: Windows Settings');
  console.log('      • Press Win + I');
  console.log('      • Go to System > Notifications & actions');
  console.log('      • Ensure "Get notifications from apps and other senders" is ON');
  console.log('   ');
  console.log('   🌐 Step 2: Browser Settings');
  console.log('      • Look for a notification icon in the address bar');
  console.log('      • Click it and select "Always allow notifications"');
  console.log('      • In Chrome: Settings > Privacy > Site Settings > Notifications');
  console.log('      • Ensure this site is set to "Allow"');
  console.log('   ');
  console.log('   🔕 Step 3: Focus Assist');
  console.log('      • Press Win + U');
  console.log('      • Go to Focus assist');
  console.log('      • Set to "Off" or "Priority only"');
  console.log('      • Check "Alarms only" is not selected');
  console.log('   ');
  console.log('   🔄 Step 4: Test Again');
  console.log('      • After making changes, refresh this page');
  console.log('      • Run this test again');
  console.log('   ');
  console.log('   🆘 Step 5: Alternative Test');
  console.log('      • Try opening a new tab to youtube.com');
  console.log('      • See if you get notification permission prompts there');
  console.log('      • This tests if notifications work globally');
  
  // 6. Registry check suggestion (for advanced users)
  console.log('\n6️⃣ Advanced Troubleshooting (Optional):');
  console.log('   If notifications still don\'t work, Windows registry might be involved:');
  console.log('   • This requires advanced technical knowledge');
  console.log('   • Consider asking a technical person to help');
  console.log('   • Or try using the app in a different browser (Edge/Firefox)');
  
  return 'Check completed. See console output above.';
};

// Auto-run check
console.log('Windows Notification Checker loaded!');
console.log('Run: checkWindowsNotifications()');

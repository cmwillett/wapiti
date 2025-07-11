// Device Registration Cleanup Tool
// This script helps clean up duplicate device registrations and provides detailed diagnostics

console.log('🧹 Device Registration Cleanup Tool');
console.log('====================================');

// Wait for supabase to be available
if (typeof supabase === 'undefined') {
  console.error('❌ Supabase not available. Make sure you are running this in the browser console on the app page.');
} else if (typeof window.notificationService === 'undefined') {
  console.error('❌ NotificationService not available. Make sure you are running this in the browser console on the app page.');
} else {
  console.log('✅ All dependencies available');
  
  // Run cleanup and diagnostics
  (async function() {
    try {
      console.log('\n📊 Getting current device registration summary...');
      const summary = await window.notificationService.getDeviceRegistrationSummary();
      
      if (summary.error) {
        console.error('❌ Error getting summary:', summary.error);
        return;
      }
      
      console.log('Current registration summary:');
      console.log(`  Total subscriptions: ${summary.totalSubscriptions}`);
      console.log(`  Unique endpoints: ${summary.uniqueEndpoints}`);
      console.log(`  Duplicate endpoints: ${summary.duplicateEndpoints}`);
      
      if (summary.devices.length > 0) {
        console.log('\n📱 Registered devices:');
        summary.devices.forEach((device, index) => {
          console.log(`  ${index + 1}. ${device.deviceName} (${device.created})`);
          console.log(`     Endpoint: ${device.endpoint}`);
        });
      }
      
      if (summary.duplicateEndpoints > 0) {
        console.log(`\n🚨 Found ${summary.duplicateEndpoints} duplicate endpoints!`);
        console.log('🧹 Starting cleanup...');
        
        const cleanupResult = await window.notificationService.cleanupDeviceRegistrations();
        
        if (cleanupResult) {
          console.log('\n✅ Cleanup completed:');
          console.log(`  Subscriptions before: ${cleanupResult.totalBefore}`);
          console.log(`  Subscriptions deleted: ${cleanupResult.deletedCount}`);
          console.log(`  Subscriptions after: ${cleanupResult.totalAfter}`);
          
          if (cleanupResult.deletedCount > 0) {
            console.log('\n📊 Getting updated summary...');
            const updatedSummary = await window.notificationService.getDeviceRegistrationSummary();
            console.log('Updated summary:');
            console.log(`  Total subscriptions: ${updatedSummary.totalSubscriptions}`);
            console.log(`  Unique endpoints: ${updatedSummary.uniqueEndpoints}`);
            console.log(`  Duplicate endpoints: ${updatedSummary.duplicateEndpoints}`);
          }
        }
      } else {
        console.log('\n✅ No duplicates found - registration is clean!');
      }
      
      console.log('\n🔧 Testing notification service registration logic...');
      
      // Check current browser push subscription
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const currentSub = await registration.pushManager.getSubscription();
        
        if (currentSub) {
          console.log('✅ Browser has active push subscription:', currentSub.endpoint.substring(0, 50) + '...');
          
          // Validate it's in database
          const isValid = await window.notificationService.validateExistingSubscription(currentSub);
          console.log(`${isValid ? '✅' : '❌'} Subscription is ${isValid ? 'valid' : 'invalid'} in database`);
        } else {
          console.log('ℹ️ No active browser push subscription found');
        }
      }
      
      console.log('\n✅ Cleanup and diagnostics complete!');
      console.log('\n💡 Tips:');
      console.log('  - Refresh the page to test new registration logic');
      console.log('  - The app should now reuse existing subscriptions instead of creating duplicates');
      console.log('  - Run this script again after page refresh to verify no new duplicates are created');
      
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  })();
}

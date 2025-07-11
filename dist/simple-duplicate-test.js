// Simple Device Registration Test (No Database Writes)
// This script tests ONLY the device registration duplication fix without triggering RLS errors

console.log('🧪 Simple Device Registration Duplicate Prevention Test');
console.log('========================================================');

async function testDeviceRegistrationOnly() {
  // Check if dependencies are available
  if (typeof supabase === 'undefined') {
    console.error('❌ Supabase not available');
    console.log('💡 Make sure you are running this on the app page');
    return;
  }
  
  if (typeof window.notificationService === 'undefined') {
    console.error('❌ NotificationService not available');
    console.log('💡 Make sure you are running this on the app page');
    return;
  }
  
  console.log('✅ Dependencies available');
  
  try {
    // Step 1: Get initial registration count
    console.log('\n📊 Step 1: Getting initial registration count...');
    const initialSummary = await window.notificationService.getDeviceRegistrationSummary();
    
    if (initialSummary.error) {
      console.error('❌ Error getting summary:', initialSummary.error);
      return;
    }
    
    console.log(`Initial subscriptions: ${initialSummary.totalSubscriptions}`);
    console.log(`Unique endpoints: ${initialSummary.uniqueEndpoints}`);
    console.log(`Duplicate endpoints: ${initialSummary.duplicateEndpoints}`);
    
    // Step 2: Check current browser subscription
    console.log('\n🔍 Step 2: Checking current browser subscription...');
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const currentSub = await registration.pushManager.getSubscription();
      
      if (currentSub) {
        console.log('✅ Browser has active push subscription');
        console.log('Endpoint:', currentSub.endpoint.substring(0, 50) + '...');
        
        // Validate it's in database
        try {
          const isValid = await window.notificationService.validateExistingSubscription(currentSub);
          console.log(`${isValid ? '✅' : '❌'} Subscription is ${isValid ? 'valid' : 'invalid'} in database`);
        } catch (validationError) {
          console.error('❌ Error validating subscription:', validationError);
        }
      } else {
        console.log('ℹ️ No active browser push subscription found');
      }
    }
    
    // Step 3: Test the subscription reuse logic
    console.log('\n🔄 Step 3: Testing subscription reuse logic...');
    console.log('Attempting to register push subscription...');
    
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      
      try {
        const newSub = await window.notificationService.subscribeToPush(registration);
        
        if (newSub) {
          console.log('✅ Subscribe operation completed');
          console.log('Result endpoint:', newSub.endpoint.substring(0, 50) + '...');
        } else {
          console.log('ℹ️ No subscription returned (might be expected if reusing existing)');
        }
      } catch (subscribeError) {
        console.error('❌ Error during subscription:', subscribeError);
      }
    }
    
    // Step 4: Check if any new duplicates were created
    console.log('\n📊 Step 4: Checking for new duplicates...');
    const finalSummary = await window.notificationService.getDeviceRegistrationSummary();
    
    if (finalSummary.error) {
      console.error('❌ Error getting final summary:', finalSummary.error);
      return;
    }
    
    console.log(`Final subscriptions: ${finalSummary.totalSubscriptions}`);
    console.log(`Unique endpoints: ${finalSummary.uniqueEndpoints}`);
    console.log(`Duplicate endpoints: ${finalSummary.duplicateEndpoints}`);
    
    // Analysis
    const subscriptionDiff = finalSummary.totalSubscriptions - initialSummary.totalSubscriptions;
    
    console.log('\n📈 Analysis:');
    if (subscriptionDiff === 0) {
      console.log('🎉 SUCCESS: No new duplicate subscriptions created!');
      console.log('✅ The fix is working correctly - existing subscription was reused');
    } else if (subscriptionDiff === 1 && initialSummary.totalSubscriptions === 0) {
      console.log('🎉 SUCCESS: First subscription created (expected for new device)');
    } else {
      console.log(`❌ CONCERN: ${subscriptionDiff} new subscriptions created`);
      console.log('This might indicate the fix needs adjustment');
    }
    
    if (finalSummary.duplicateEndpoints > initialSummary.duplicateEndpoints) {
      console.log('❌ WARNING: New duplicate endpoints detected!');
    } else if (finalSummary.duplicateEndpoints === 0) {
      console.log('✅ Perfect: No duplicate endpoints detected');
    }
    
    // Show current permission status
    console.log('\n🔔 Notification Permission Status:');
    if ('Notification' in window) {
      console.log(`Permission: ${Notification.permission}`);
    }
    
    console.log('\n💡 Next steps to fully test the fix:');
    console.log('1. Refresh this page several times');
    console.log('2. Run this test again after each refresh');
    console.log('3. Verify subscription count stays the same');
    console.log('4. The console should show "Existing subscription is valid, reusing it"');
    
    // Summary
    const isDuplicationFixed = subscriptionDiff === 0 && finalSummary.duplicateEndpoints === 0;
    console.log(`\n🎯 DUPLICATION FIX STATUS: ${isDuplicationFixed ? '✅ WORKING' : '❌ NEEDS ATTENTION'}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('- Make sure you are logged into the app');
    console.log('- Check that notification permissions are granted');
    console.log('- Try refreshing the page and running again');
  }
}

// Auto-run the test
console.log('🚀 Starting test in 2 seconds...');
setTimeout(testDeviceRegistrationOnly, 2000);

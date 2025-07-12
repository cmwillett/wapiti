// Simple Real FCM Test - Works without authentication
// This tests the exact flow that should work in production

console.log('🎯 Simple FCM Test: Testing the exact production flow...');

async function simpleRealFCMTest() {
  try {
    console.log('\n=== 🎯 SIMPLE REAL FCM TEST ===\n');
    
    // First, make sure we have notification permission and service worker
    console.log('1️⃣ Checking prerequisites...');
    if (Notification.permission !== 'granted') {
      console.error('❌ Need notification permission first');
      return;
    }
    
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) {
      console.error('❌ Service worker not active');
      return;
    }
    
    console.log('✅ Prerequisites met');
    
    // Test 1: Create a reminder that should trigger in 15 seconds
    console.log('\n2️⃣ Creating a real reminder (if auth available)...');
    
    // Try to get auth info from the global supabase client
    let authToken = null;
    let userId = null;
    
    if (window.supabase && window.supabase.auth) {
      try {
        const { data: { session } } = await window.supabase.auth.getSession();
        if (session) {
          authToken = session.access_token;
          userId = session.user.id;
          console.log('✅ Found auth session:', { userId: userId.substring(0, 8) + '...' });
        }
      } catch (error) {
        console.log('⚠️ No auth session available:', error.message);
      }
    }
    
    if (authToken && userId) {
      // Create a test reminder
      const testTime = new Date();
      testTime.setSeconds(testTime.getSeconds() + 15); // 15 seconds from now
      
      console.log(`🕐 Creating reminder for: ${testTime.toLocaleTimeString()}`);
      
      try {
        const { data, error } = await window.supabase
          .from('tasks')
          .insert([
            {
              text: `🧪 Real FCM Test - ${new Date().toLocaleTimeString()}`,
              reminder_time: testTime.toISOString(),
              completed: false,
              user_id: userId
            }
          ])
          .select();
        
        if (error) {
          console.error('❌ Failed to create test reminder:', error);
        } else {
          console.log('✅ Test reminder created:', data[0]);
          console.log('🎯 This should trigger a REAL FCM notification in ~15 seconds!');
          
          // Set up a listener for the next 30 seconds
          const startTime = Date.now();
          const checkInterval = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;
            if (elapsed > 30) {
              clearInterval(checkInterval);
              console.log('⏰ 30 seconds elapsed - if no notification appeared, there\'s an issue');
            } else {
              console.log(`⏱️ Waiting for notification... ${Math.round(15 - elapsed)}s remaining`);
            }
          }, 3000);
        }
      } catch (error) {
        console.error('❌ Database error:', error);
      }
    } else {
      console.log('⚠️ No authentication - will test FCM format simulation instead');
    }
    
    // Test 2: Simulate exact FCM push formats
    console.log('\n3️⃣ Testing FCM format handling...');
    
    const fcmTests = [
      {
        name: 'FCM Data-Only (Real Format)',
        data: {
          data: {
            title: '🧪 FCM Data Test',
            body: 'This mimics exactly how FCM sends data-only notifications',
            taskId: '999',
            action: 'task-reminder'
          }
        }
      },
      {
        name: 'FCM Notification + Data (Real Format)',
        data: {
          notification: {
            title: '🧪 FCM Notification Test',
            body: 'This mimics exactly how FCM sends notification + data'
          },
          data: {
            taskId: '998',
            action: 'task-reminder'
          }
        }
      }
    ];
    
    for (const test of fcmTests) {
      console.log(`\n   Testing: ${test.name}`);
      
      // Send exactly as FCM would
      navigator.serviceWorker.controller?.postMessage({
        type: 'simulate-real-push',
        pushData: JSON.stringify(test.data)
      });
      
      console.log(`   ✅ ${test.name} sent`);
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Test 3: Test the generic fallback
    console.log('\n4️⃣ Testing fallback notification...');
    
    navigator.serviceWorker.controller?.postMessage({
      type: 'simulate-real-push',
      pushData: '{}'  // Empty data should trigger fallback
    });
    
    console.log('✅ Fallback test sent');
    
    console.log('\n🎯 Simple FCM Test Complete!');
    console.log('Expected results:');
    console.log('  📱 FCM Data Test notification');
    console.log('  📱 FCM Notification Test notification'); 
    console.log('  📱 Generic fallback notification');
    if (authToken) {
      console.log('  📱 Real reminder notification (in ~15 seconds)');
    }
    
  } catch (error) {
    console.error('❌ Simple FCM test failed:', error);
  }
}

// Auto-run the test
simpleRealFCMTest();

// Expose for manual testing
window.simpleRealFCMTest = simpleRealFCMTest;

console.log('\n🎮 Manual test function available:');
console.log('   - window.simpleRealFCMTest() - Re-run simple FCM test');

// Direct FCM Test - Run this directly in console
// This is the simplified test without needing a separate file

console.log('🎯 Direct FCM Test: Testing the exact production flow...');

async function directFCMTest() {
  try {
    console.log('\n=== 🎯 DIRECT FCM TEST ===\n');
    
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
              text: `🧪 Direct FCM Test - ${new Date().toLocaleTimeString()}`,
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
          
          // Set up a countdown
          let countdown = 15;
          const countdownInterval = setInterval(() => {
            console.log(`⏱️ Real FCM notification expected in ${countdown}s...`);
            countdown--;
            if (countdown < 0) {
              clearInterval(countdownInterval);
              console.log('⏰ 15 seconds elapsed - check if notification appeared!');
            }
          }, 1000);
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
    
    console.log('\n🎯 Direct FCM Test Complete!');
    console.log('Expected results:');
    console.log('  📱 3 test notifications should have appeared');
    if (authToken) {
      console.log('  📱 1 real reminder notification (in ~15 seconds)');
      console.log('  🔍 If real reminder doesn\'t appear, the issue is in the Edge Function cron job');
    }
    
  } catch (error) {
    console.error('❌ Direct FCM test failed:', error);
  }
}

// Run the test immediately
directFCMTest();

// Also expose globally for re-running
window.directFCMTest = directFCMTest;

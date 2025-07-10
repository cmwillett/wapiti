// Test script to manually trigger the Edge Function and see detailed logs
console.log('🧪 Testing Edge Function with real reminder...');

async function testEdgeFunction() {
  try {
    // Import the supabase client from the module
    const { supabase } = await import('/src/supabaseClient.js');
    
    // Get the auth token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('Not authenticated');
      return;
    }

    const token = session.access_token;
    console.log('✅ Got auth token');

    // Call the Edge Function
    const edgeFunctionUrl = 'https://ekzxhzjfigbffbhtxzow.supabase.co/functions/v1/check-reminders';
    
    console.log('📡 Calling Edge Function:', edgeFunctionUrl);
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    console.log('📋 Edge Function Response:', result);

    if (result.success) {
      console.log(`✅ Processed ${result.processedCount} reminders`);
      if (result.notifications && result.notifications.length > 0) {
        console.log('📬 Notifications sent:');
        result.notifications.forEach(notif => {
          console.log(`  - Task ${notif.taskId}: "${notif.taskText}" (${notif.method})`);
          console.log(`    Result:`, notif.result);
        });
      } else {
        console.log('ℹ️ No notifications were sent');
      }
    } else {
      console.error('❌ Edge Function failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Error testing Edge Function:', error);
  }
}

// Run the test
testEdgeFunction();

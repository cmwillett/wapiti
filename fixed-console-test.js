// Fixed test script - paste this directly into the browser console
(async function testEdgeFunction() {
  try {
    console.log('🧪 Testing Edge Function with real reminder...');
    
    // Get the correct auth token from localStorage
    const authData = JSON.parse(localStorage.getItem('sb-uiczcbezwwfhvahfdxax-auth-token'));
    const token = authData?.access_token;
    
    if (!token) {
      console.error('❌ No access token found in auth data:', authData);
      return;
    }
    
    console.log('✅ Got auth token from localStorage');

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
        
        console.log('🔔 A push notification should have been sent! Check for SW: logs in console and watch for the notification popup.');
      } else {
        console.log('ℹ️ No notifications were sent');
        console.log('💡 This means either:');
        console.log('   - No reminders are due right now');
        console.log('   - Your reminder time hasn\'t passed yet');
        console.log('   - The reminder was already marked as sent');
      }
    } else {
      console.error('❌ Edge Function failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Error testing Edge Function:', error);
  }
})();

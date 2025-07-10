// Paste this directly into the browser console to test the Edge Function
(async function testEdgeFunction() {
  try {
    console.log('🧪 Testing Edge Function with real reminder...');
    
    // First, let's check if we're authenticated
    const authCheck = await fetch('/src/supabaseClient.js');
    console.log('Auth check response:', authCheck.status);
    
    // Try to get session from localStorage (common pattern in Supabase apps)
    const localStorageKeys = Object.keys(localStorage);
    const supabaseKey = localStorageKeys.find(key => key.includes('supabase.auth.token'));
    
    if (!supabaseKey) {
      console.error('❌ No Supabase auth token found in localStorage');
      console.log('Available localStorage keys:', localStorageKeys);
      return;
    }
    
    const authData = JSON.parse(localStorage.getItem(supabaseKey));
    const token = authData?.access_token;
    
    if (!token) {
      console.error('❌ No access token found');
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
      } else {
        console.log('ℹ️ No notifications were sent (no due reminders found)');
      }
    } else {
      console.error('❌ Edge Function failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Error testing Edge Function:', error);
  }
})();

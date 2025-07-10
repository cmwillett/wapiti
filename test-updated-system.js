// Test the updated notification system - paste into browser console
(async function testUpdatedSystem() {
  try {
    console.log('🧪 Testing updated notification system...');
    
    // Step 1: Create a fresh reminder
    const authData = JSON.parse(localStorage.getItem('sb-uiczcbezwwfhvahfdxax-auth-token'));
    const token = authData?.access_token;
    
    if (!token) {
      console.error('❌ No auth token found');
      return;
    }

    // Get user info
    const userResponse = await fetch('https://uiczcbezwwfhvahfdxax.supabase.co/auth/v1/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpY3pjYmV6d3dmaHZhaGZkeGF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwODc0MDMsImV4cCI6MjA2NzY2MzQwM30.kz3eYFhmLAMgI1PKFkxzHqYgfMkj0env7-BYy_RQ4Rk'
      }
    });
    const user = await userResponse.json();

    // Create a reminder that's 10 seconds ago (definitely due)
    const reminderTime = new Date(Date.now() - 10 * 1000).toISOString();
    
    console.log('📅 Creating fresh reminder for:', reminderTime);

    // Create new task
    const taskResponse = await fetch('https://uiczcbezwwfhvahfdxax.supabase.co/rest/v1/tasks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpY3pjYmV6d3dmaHZhaGZkeGF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwODc0MDMsImV4cCI6MjA2NzY2MzQwM30.kz3eYFhmLAMgI1PKFkxzHqYgfMkj0env7-BYy_RQ4Rk',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        text: 'UPDATED SYSTEM TEST - Should Show Correct Text',
        completed: false,
        reminder_sent: false,
        reminder_time: reminderTime,
        user_id: user.id,
        list_id: 1
      })
    });

    if (!taskResponse.ok) {
      console.error('❌ Failed to create task:', await taskResponse.text());
      return;
    }

    const newTask = await taskResponse.json();
    console.log('✅ Created task:', newTask[0]);

    // Step 2: Wait a moment for the task to be saved
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Trigger the Edge Function
    console.log('🚀 Triggering Edge Function...');
    
    const edgeResponse = await fetch('https://uiczcbezwwfhvahfdxax.supabase.co/functions/v1/check-reminders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await edgeResponse.json();
    console.log('📋 Edge Function Response:', result);

    if (result.success && result.processedCount > 0) {
      console.log('🎉 SUCCESS! Edge Function processed reminders:');
      result.notifications.forEach(notif => {
        console.log(`  - Task ${notif.taskId}: "${notif.taskText}"`);
        console.log(`    Method: ${notif.method}, Success: ${notif.result?.success}`);
      });
      console.log('');
      console.log('🔔 Check for push notification with "UPDATED SYSTEM TEST - Should Show Correct Text"!');
      console.log('👀 Watch console for "SW:" logs to see what the service worker does.');
    } else {
      console.log('⚠️ Edge Function did not process reminders:', result);
    }

  } catch (error) {
    console.error('❌ Error testing updated system:', error);
  }
})();

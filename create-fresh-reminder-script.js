// Create a fresh reminder with current time for testing - paste into browser console
(async function createFreshReminder() {
  try {
    console.log('🆕 Creating fresh reminder for Edge Function testing...');
    
    // Get auth token
    const authData = JSON.parse(localStorage.getItem('sb-uiczcbezwwfhvahfdxax-auth-token'));
    const token = authData?.access_token;
    
    if (!token) {
      console.error('❌ No auth token found');
      return;
    }

    // Get current user ID
    const userResponse = await fetch('https://uiczcbezwwfhvahfdxax.supabase.co/auth/v1/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpY3pjYmV6d3dmaHZhaGZkeGF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwODc0MDMsImV4cCI6MjA2NzY2MzQwM30.kz3eYFhmLAMgI1PKFkxzHqYgfMkj0env7-BYy_RQ4Rk'
      }
    });
    const user = await userResponse.json();

    // Create a reminder time that's 30 seconds ago (so it's definitely due)
    const reminderTime = new Date(Date.now() - 30 * 1000).toISOString();

    console.log('📅 Creating reminder for:', reminderTime);
    console.log('🕐 Current time:', new Date().toISOString());

    // Create new task with fresh reminder
    const taskResponse = await fetch('https://uiczcbezwwfhvahfdxax.supabase.co/rest/v1/tasks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpY3pjYmV6d3dmaHZhaGZkeGF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwODc0MDMsImV4cCI6MjA2NzY2MzQwM30.kz3eYFhmLAMgI1PKFkxzHqYgfMkj0env7-BYy_RQ4Rk',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        text: 'Edge Function Test - Fresh Reminder',
        completed: false,
        reminder_sent: false,
        reminder_time: reminderTime,
        user_id: user.id,
        list_id: 1 // Assuming list 1 exists
      })
    });

    if (taskResponse.ok) {
      const newTask = await taskResponse.json();
      console.log('✅ Successfully created fresh task:', newTask);
      console.log('📝 Task text: "Edge Function Test - Fresh Reminder"');
      console.log('⏰ Reminder time:', reminderTime, '(30 seconds ago)');
      console.log('🔧 reminder_sent: false, completed: false');
      console.log('');
      console.log('🧪 Now run the Edge Function test - it should find this reminder!');
    } else {
      console.error('❌ Failed to create task:', await taskResponse.text());
    }

  } catch (error) {
    console.error('❌ Error creating fresh reminder:', error);
  }
})();

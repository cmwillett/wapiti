// Reset a reminder for testing - paste into browser console
(async function resetReminder() {
  try {
    console.log('🔄 Resetting reminder for testing...');
    
    // Get auth token
    const authData = JSON.parse(localStorage.getItem('sb-uiczcbezwwfhvahfdxax-auth-token'));
    const token = authData?.access_token;
    
    if (!token) {
      console.error('❌ No auth token found');
      return;
    }

    // Reset Task 13 "Reminder with time in past" - set reminder_sent back to false
    const taskId = 13;
    const response = await fetch(`https://uiczcbezwwfhvahfdxax.supabase.co/rest/v1/tasks?id=eq.${taskId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpY3pjYmV6d3dmaHZhaGZkeGF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwODc0MDMsImV4cCI6MjA2NzY2MzQwM30.kz3eYFhmLAMgI1PKFkxzHqYgfMkj0env7-BYy_RQ4Rk',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reminder_sent: false,
        completed: false  // Also mark as not completed so it's eligible
      })
    });

    if (response.ok) {
      console.log('✅ Successfully reset Task 13 reminder');
      console.log('📝 Task: "Reminder with time in past"');
      console.log('⏰ Reminder time: 2025-07-10T16:04:56.267+00:00 (already past)');
      console.log('🔄 Now set to: reminder_sent=false, completed=false');
      console.log('');
      console.log('🧪 Now you can run the Edge Function test again to see if it picks up this reminder!');
    } else {
      console.error('❌ Failed to reset reminder:', await response.text());
    }

  } catch (error) {
    console.error('❌ Error resetting reminder:', error);
  }
})();

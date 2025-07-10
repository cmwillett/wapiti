// Check current reminders in database - paste into browser console
(async function checkReminders() {
  try {
    console.log('🔍 Checking current reminders in database...');
    
    // Get auth token
    const authData = JSON.parse(localStorage.getItem('sb-uiczcbezwwfhvahfdxax-auth-token'));
    const token = authData?.access_token;
    
    if (!token) {
      console.error('❌ No auth token found');
      return;
    }

    // Check what tasks exist with reminders
    const response = await fetch('https://uiczcbezwwfhvahfdxax.supabase.co/rest/v1/tasks?select=*', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpY3pjYmV6d3dmaHZhaGZkeGF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwODc0MDMsImV4cCI6MjA2NzY2MzQwM30.kz3eYFhmLAMgI1PKFkxzHqYgfMkj0env7-BYy_RQ4Rk'
      }
    });

    const tasks = await response.json();
    console.log('📋 All tasks:', tasks);

    const now = new Date();
    console.log('🕐 Current time:', now.toISOString());

    // Show tasks with reminders
    const tasksWithReminders = tasks.filter(task => task.reminder_time);
    console.log('⏰ Tasks with reminders:');
    tasksWithReminders.forEach(task => {
      const reminderTime = new Date(task.reminder_time);
      const isPast = reminderTime <= now;
      console.log(`  - Task ${task.id}: "${task.text}"`);
      console.log(`    Reminder: ${task.reminder_time} (${isPast ? 'PAST' : 'FUTURE'})`);
      console.log(`    Sent: ${task.reminder_sent}, Completed: ${task.completed}`);
    });

    // Show what the Edge Function should find
    const dueReminders = tasksWithReminders.filter(task => 
      !task.reminder_sent && 
      !task.completed && 
      new Date(task.reminder_time) <= now
    );
    
    console.log(`🎯 Due reminders that should be found: ${dueReminders.length}`);
    dueReminders.forEach(task => {
      console.log(`  - "${task.text}" (ID: ${task.id})`);
    });

  } catch (error) {
    console.error('❌ Error checking reminders:', error);
  }
})();

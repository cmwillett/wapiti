// Diagnostic script to check all reminders and their status
console.log('=== Reminder Diagnostic ===');

window.diagnoseReminders = async function() {
  try {
    if (!window.supabase) {
      console.error('❌ Supabase not available');
      return;
    }

    // Get current user
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) {
      console.error('❌ User not authenticated');
      return;
    }

    console.log('✅ User ID:', user.id);
    console.log('⏰ Current time:', new Date().toLocaleString());
    
    // Get ALL tasks with reminders (including sent ones)
    const { data: allTasks, error } = await window.supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .not('reminder_time', 'is', null)
      .order('reminder_time', { ascending: false });

    if (error) {
      console.error('❌ Error fetching tasks:', error);
      return;
    }

    console.log('');
    console.log('📋 All your tasks with reminders:');
    
    if (!allTasks || allTasks.length === 0) {
      console.log('   No tasks with reminders found');
      return;
    }

    const now = new Date();
    
    allTasks.forEach((task, index) => {
      const reminderTime = new Date(task.reminder_time);
      const timeDiff = now.getTime() - reminderTime.getTime();
      const minutesDiff = Math.round(timeDiff / 60000);
      
      let status = '';
      if (task.completed) {
        status = '✅ Completed';
      } else if (task.reminder_sent) {
        status = '📤 Reminder Sent';
      } else if (reminderTime <= now) {
        status = '⏰ DUE NOW (not sent!)';
      } else {
        status = `⏳ Future (in ${-minutesDiff} min)`;
      }
      
      console.log(`   ${index + 1}. "${task.text}"`);
      console.log(`      📅 Due: ${reminderTime.toLocaleString()}`);
      console.log(`      ⏱️  ${minutesDiff >= 0 ? `${minutesDiff} min ago` : `in ${-minutesDiff} min`}`);
      console.log(`      📊 Status: ${status}`);
      console.log(`      🆔 ID: ${task.id}`);
      console.log('');
    });

    // Check for any overdue reminders that weren't sent
    const overdueUnsent = allTasks.filter(task => {
      const reminderTime = new Date(task.reminder_time);
      return reminderTime <= now && !task.reminder_sent && !task.completed;
    });

    if (overdueUnsent.length > 0) {
      console.log('🚨 Found overdue reminders that were never sent:');
      overdueUnsent.forEach(task => {
        const reminderTime = new Date(task.reminder_time);
        const minutesAgo = Math.round((now.getTime() - reminderTime.getTime()) / 60000);
        console.log(`   • "${task.text}" (due ${minutesAgo} min ago)`);
      });
      
      console.log('');
      console.log('🔧 To manually trigger these reminders:');
      console.log('   window.triggerOverdueReminders()');
    }

    // Check recent Edge Function calls
    console.log('');
    console.log('🔍 To manually test Edge Function:');
    console.log('   window.testEdgeFunction()');
    
  } catch (error) {
    console.error('❌ Diagnostic error:', error);
  }
};

// Function to manually trigger overdue reminders
window.triggerOverdueReminders = async function() {
  if (!window.browserReminderChecker) {
    console.error('❌ Browser reminder checker not available');
    return;
  }
  
  console.log('🔄 Manually triggering browser reminder checker...');
  await window.browserReminderChecker.checkReminders();
  console.log('✅ Done. Check notifications!');
};

// Function to manually test Edge Function
window.testEdgeFunction = async function() {
  try {
    console.log('🚀 Manually calling Edge Function...');
    
    // Get auth token from Supabase
    if (!window.supabase) {
      console.error('❌ Supabase not available');
      return;
    }
    
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session) {
      console.error('❌ No active session. Please log in.');
      return;
    }
    
    const response = await fetch('https://uiczcbezwwfhvahfdxax.supabase.co/functions/v1/check-reminders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      }
    });
    
    const result = await response.json();
    console.log('📨 Edge Function response:', result);
    
    if (response.ok) {
      if (result.notifications && result.notifications.length > 0) {
        console.log('📱 Notifications sent:');
        result.notifications.forEach(notif => {
          console.log(`   • Task: "${notif.taskText}"`);
          console.log(`     Method: ${notif.method || 'unknown'}`);
          console.log(`     Success: ${notif.result?.success || false}`);
          if (notif.result?.error) {
            console.log(`     Error: ${notif.result.error}`);
          }
        });
      } else {
        console.log('📭 No reminders found to process');
      }
    } else {
      console.error('❌ Edge Function failed:', result);
    }
    
  } catch (error) {
    console.error('❌ Edge Function test error:', error);
  }
};

console.log('🚀 Ready!');
console.log('   window.diagnoseReminders() - Check all your reminders');
console.log('   window.triggerOverdueReminders() - Manually trigger overdue');
console.log('   window.testEdgeFunction() - Test Edge Function');

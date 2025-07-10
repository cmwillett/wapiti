// Create a test reminder and reset its status so Edge Function can process it
console.log('=== Edge Function Test Reminder ===');

window.createEdgeFunctionTest = async function() {
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

    console.log('📝 Creating test reminder for Edge Function...');
    
    // Create a reminder 30 seconds in the past (so Edge Function will pick it up)
    const reminderTime = new Date(Date.now() - 30 * 1000); // 30 seconds ago
    const taskText = `Edge Function Test - ${new Date().toLocaleTimeString()}`;
    
    const { data: task, error } = await window.supabase
      .from('tasks')
      .insert({
        text: taskText,
        completed: false,
        reminder_time: reminderTime.toISOString(),
        reminder_sent: false, // Important: not sent yet
        user_id: user.id,
        list_id: null,
        notes: 'Test reminder for Edge Function processing'
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating test task:', error);
      return;
    }
    
    console.log('✅ Created test task:', task);
    console.log('⏰ Reminder time (30 sec ago):', new Date(task.reminder_time).toLocaleString());
    console.log('📤 Reminder sent status:', task.reminder_sent);
    
    console.log('');
    console.log('🎯 Now test the Edge Function:');
    console.log('   window.testEdgeFunction()');
    console.log('');
    console.log('💡 The Edge Function should:');
    console.log('   1. Find this overdue reminder');
    console.log('   2. Send a push notification');
    console.log('   3. Mark it as sent in the database');
    
    return task;
    
  } catch (error) {
    console.error('❌ Error creating Edge Function test:', error);
  }
};

// Reset a reminder to test again
window.resetReminderForTesting = async function(taskId) {
  try {
    if (!window.supabase) {
      console.error('❌ Supabase not available');
      return;
    }

    console.log(`🔄 Resetting reminder ${taskId} for testing...`);
    
    const { data: task, error } = await window.supabase
      .from('tasks')
      .update({ 
        reminder_sent: false,
        reminder_time: new Date(Date.now() - 30 * 1000).toISOString() // 30 seconds ago
      })
      .eq('id', taskId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error resetting task:', error);
      return;
    }
    
    console.log('✅ Reset task:', task);
    console.log('🎯 Now run: window.testEdgeFunction()');
    
    return task;
    
  } catch (error) {
    console.error('❌ Error resetting reminder:', error);
  }
};

console.log('🚀 Ready!');
console.log('   window.createEdgeFunctionTest() - Create test reminder for Edge Function');
console.log('   window.resetReminderForTesting(taskId) - Reset a reminder for testing');

// Create test reminder for both devices
async function createTestReminder() {
  try {
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) {
      console.error('❌ Not authenticated');
      return;
    }

    // Create test reminder 1 minute from now
    const now = new Date();
    const reminderTime = new Date(now.getTime() + 60000); // 1 minute

    const { data: task, error } = await window.supabase
      .from('tasks')
      .insert({
        text: 'Multi-device test reminder',
        user_id: user.id,
        completed: false,
        reminder_sent: false,
        reminder_time: reminderTime.toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to create test reminder:', error);
      return;
    }

    console.log('✅ Test reminder created!');
    console.log(`📅 Will fire at: ${reminderTime.toLocaleString()}`);
    console.log(`⏰ In about 1 minute`);
    console.log(`📱 Both desktop and mobile should receive the notification`);

    return task;
  } catch (error) {
    console.error('❌ Test creation error:', error);
  }
}

// Run the test
createTestReminder();

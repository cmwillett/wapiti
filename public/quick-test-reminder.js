// Quick Test Reminder Creator
// Run this to quickly create test reminders for multi-device testing

console.log('⏰ Quick Test Reminder Creator');

async function createTestReminder(minutesFromNow = 1, taskText = null) {
  try {
    // Wait for supabase to be available
    if (typeof window.supabase === 'undefined') {
      console.log('⏳ Waiting for supabase to load...');
      await new Promise(resolve => {
        const checkSupabase = () => {
          if (typeof window.supabase !== 'undefined') {
            resolve();
          } else {
            setTimeout(checkSupabase, 100);
          }
        };
        checkSupabase();
      });
    }

    const supabase = window.supabase;
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Not authenticated. Please log in first.');
      return;
    }

    // Calculate reminder time
    const reminderTime = new Date(Date.now() + (minutesFromNow * 60 * 1000));
    const defaultText = `Multi-device test: ${new Date().toLocaleTimeString()}`;
    const finalTaskText = taskText || defaultText;

    console.log(`📝 Creating test reminder:`);
    console.log(`   📄 Task: "${finalTaskText}"`);
    console.log(`   ⏰ Reminder: ${reminderTime.toLocaleString()}`);
    console.log(`   🕒 In ${minutesFromNow} minute(s) from now`);

    // Create the task with reminder
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        text: finalTaskText,
        completed: false,
        reminder_time: reminderTime.toISOString(),
        reminder_sent: false,
        list_id: null // Will use default list
      })
      .select()
      .single();

    if (taskError) {
      console.error('❌ Error creating test task:', taskError);
      return { success: false, error: taskError.message };
    }

    console.log('✅ Test reminder created successfully!');
    console.log(`   🆔 Task ID: ${task.id}`);
    console.log(`   ⏰ Will trigger at: ${reminderTime.toLocaleString()}`);

    // Check how many devices will receive this notification
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('device_name')
      .eq('user_id', user.id);

    const deviceCount = subscriptions?.length || 0;
    console.log(`📱 Will notify ${deviceCount} registered device(s):`);
    subscriptions?.forEach((sub, i) => {
      console.log(`   ${i + 1}. ${sub.device_name}`);
    });

    console.log('\n📋 Next steps:');
    console.log('1. 🔒 Close or background the app on ALL your devices');
    console.log(`2. ⏱️ Wait ${minutesFromNow} minute(s)`);
    console.log('3. 📱 Check that notifications appear on all devices');
    console.log('4. 🔍 Check Supabase Edge Function logs for delivery details');

    return {
      success: true,
      taskId: task.id,
      taskText: finalTaskText,
      reminderTime: reminderTime.toISOString(),
      minutesFromNow,
      deviceCount,
      devices: subscriptions?.map(s => s.device_name) || []
    };

  } catch (error) {
    console.error('❌ Error creating test reminder:', error);
    return { success: false, error: error.message };
  }
}

// Create quick test functions for different timing
window.createTestReminder = createTestReminder;

// Quick shortcuts
window.testIn1Min = () => createTestReminder(1, 'Quick 1-minute test');
window.testIn2Min = () => createTestReminder(2, 'Quick 2-minute test');
window.testIn5Min = () => createTestReminder(5, 'Quick 5-minute test');

// Custom test with specific text
window.customTest = (minutes, text) => createTestReminder(minutes, text);

console.log('\n💡 Available commands:');
console.log('   createTestReminder(minutes, text) - Create custom test reminder');
console.log('   testIn1Min() - Quick 1-minute test');
console.log('   testIn2Min() - Quick 2-minute test');
console.log('   testIn5Min() - Quick 5-minute test');
console.log('   customTest(minutes, "your text") - Custom test with your text');

console.log('\n📝 Example usage:');
console.log('   testIn1Min() // Quick test in 1 minute');
console.log('   customTest(3, "Meeting reminder") // Custom 3-minute test');

// Auto-run a quick test
console.log('\n🚀 Ready to test! Try: testIn1Min()');

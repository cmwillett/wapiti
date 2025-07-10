// Test script to check if the pending-reminders endpoint works
async function testPendingReminders() {
  try {
    console.log('Testing pending reminders endpoint...');
    
    // Get the current session
    const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('No active session:', sessionError);
      return;
    }
    
    console.log('Found active session for user:', session.user.id);
    
    // Test the pending reminders endpoint
    const response = await fetch(`${window.supabase.supabaseUrl}/functions/v1/check-reminders/pending-reminders`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('Pending reminders response:', data);
    
    if (data.tasks && data.tasks.length > 0) {
      console.log('Found pending tasks:');
      data.tasks.forEach(task => {
        console.log(`- Task ${task.id}: "${task.text}" (due: ${task.reminder_time})`);
      });
    } else {
      console.log('No pending reminders found');
    }
    
  } catch (error) {
    console.error('Error testing pending reminders:', error);
  }
}

// Also test if we can access the Supabase client
console.log('Supabase client available:', !!window.supabase);
console.log('Supabase URL:', window.supabase?.supabaseUrl);

// Run the test
testPendingReminders();

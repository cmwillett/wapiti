/**
 * Production Reminder Flow Debug
 * Specifically debug the reminder creation and checking flow
 */

window.debugReminderFlow = async function() {
    console.log('🔍 Debugging Reminder Flow');
    console.log('=' .repeat(50));
    
    // Check if user is authenticated
    console.log('\n1️⃣ User Authentication:');
    try {
        if (window.supabase) {
            const { data: { user }, error } = await window.supabase.auth.getUser();
            if (error) {
                console.log('   ❌ Auth error:', error);
                return;
            }
            if (user) {
                console.log('   ✅ User authenticated');
                console.log('   User ID:', user.id);
            } else {
                console.log('   ❌ No user found - please log in');
                return;
            }
        } else {
            console.log('   ❌ Supabase not available');
            return;
        }
    } catch (error) {
        console.log('   ❌ Error checking user:', error);
        return;
    }
    
    // Check for existing tasks with reminders
    console.log('\n2️⃣ Checking Existing Tasks:');
    try {
        const { data: { user } } = await window.supabase.auth.getUser();
        const { data: tasks, error } = await window.supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .not('reminder_time', 'is', null);
            
        if (error) {
            console.log('   ❌ Error fetching tasks:', error);
        } else {
            console.log(`   📋 Found ${tasks?.length || 0} tasks with reminders`);
            if (tasks && tasks.length > 0) {
                tasks.forEach((task, index) => {
                    const reminderTime = new Date(task.reminder_time);
                    const now = new Date();
                    const isPast = reminderTime <= now;
                    const timeDiff = Math.round((reminderTime - now) / (1000 * 60)); // minutes
                    console.log(`   ${index + 1}. "${task.text}"`);
                    console.log(`      Reminder: ${reminderTime.toLocaleString()}`);
                    console.log(`      Status: ${task.completed ? 'Completed' : 'Active'}`);
                    console.log(`      Sent: ${task.reminder_sent ? 'Yes' : 'No'}`);
                    console.log(`      Due: ${isPast ? 'PAST DUE' : `in ${timeDiff} minutes`}`);
                });
            }
        }
    } catch (error) {
        console.log('   ❌ Error:', error);
    }
    
    // Check reminder checker status
    console.log('\n3️⃣ Reminder Checker Status:');
    if (window.browserReminderChecker) {
        console.log('   ✅ Browser reminder checker available');
        console.log('   Interval active:', window.browserReminderChecker.checkInterval ? 'Yes' : 'No');
        console.log('   Currently checking:', window.browserReminderChecker.isChecking ? 'Yes' : 'No');
    } else {
        console.log('   ❌ Browser reminder checker not found');
    }
    
    // Check notification service
    console.log('\n4️⃣ Notification Service Status:');
    if (window.notificationService) {
        console.log('   ✅ Notification service available');
        console.log('   Permission:', Notification.permission);
    } else {
        console.log('   ❌ Notification service not found');
    }
    
    // Test manual reminder check
    console.log('\n5️⃣ Manual Reminder Check:');
    if (window.browserReminderChecker) {
        console.log('   Running manual check...');
        try {
            await window.browserReminderChecker.checkReminders();
            console.log('   ✅ Manual check completed');
        } catch (error) {
            console.log('   ❌ Manual check failed:', error);
        }
    }
    
    console.log('\n💡 Recommendations:');
    console.log('   1. Create a task with reminder 2 minutes from now');
    console.log('   2. Watch console for "Checking for due reminders..." messages');
    console.log('   3. Check if notification appears when reminder time passes');
    console.log('   4. Verify reminder_sent status changes in database');
};

// Helper to create a test reminder
window.createTestReminder = async function(minutesFromNow = 2) {
    console.log(`🧪 Creating test reminder ${minutesFromNow} minutes from now...`);
    
    if (!window.supabase) {
        console.log('❌ Supabase not available');
        return;
    }
    
    try {
        const { data: { user } } = await window.supabase.auth.getUser();
        if (!user) {
            console.log('❌ User not authenticated');
            return;
        }
        
        const reminderTime = new Date();
        reminderTime.setMinutes(reminderTime.getMinutes() + minutesFromNow);
        
        // First check if lists table exists and get default list
        const { data: lists, error: listsError } = await window.supabase
            .from('lists')
            .select('*')
            .eq('user_id', user.id)
            .limit(1);
            
        let listId = null;
        if (!listsError && lists && lists.length > 0) {
            listId = lists[0].id;
        } else {
            // Create a default list
            const { data: newList, error: createListError } = await window.supabase
                .from('lists')
                .insert({
                    user_id: user.id,
                    name: 'Default List',
                    description: 'Default list for tasks'
                })
                .select()
                .single();
                
            if (createListError) {
                console.log('❌ Error creating list:', createListError);
                return;
            }
            listId = newList.id;
        }
        
        // Create test task
        const { data: task, error } = await window.supabase
            .from('tasks')
            .insert({
                user_id: user.id,
                list_id: listId,
                text: `Test reminder - ${new Date().toLocaleTimeString()}`,
                completed: false,
                reminder_time: reminderTime.toISOString(),
                reminder_sent: false
            })
            .select()
            .single();
            
        if (error) {
            console.log('❌ Error creating task:', error);
        } else {
            console.log('✅ Test task created:');
            console.log('   Task ID:', task.id);
            console.log('   Text:', task.text);
            console.log('   Reminder Time:', reminderTime.toLocaleString());
            console.log('   Wait for notification at that time...');
        }
        
    } catch (error) {
        console.log('❌ Error:', error);
    }
};

console.log('🔍 Reminder flow debug loaded.');
console.log('💡 Run debugReminderFlow() to diagnose issues');
console.log('💡 Run createTestReminder() to create a test reminder');

// Auto-run
setTimeout(() => {
    debugReminderFlow();
}, 1000);

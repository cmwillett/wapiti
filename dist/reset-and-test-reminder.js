/**
 * Reset and Test Fresh Reminder
 * Create a brand new reminder and test the complete flow
 */

window.resetAndTestReminder = async function() {
    console.log('🔄 Resetting and Testing Fresh Reminder');
    console.log('=' .repeat(50));
    
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
        
        // Step 1: Create a fresh reminder 1 minute from now
        console.log('\n1️⃣ Creating fresh test reminder...');
        const reminderTime = new Date();
        reminderTime.setMinutes(reminderTime.getMinutes() + 1);
        
        // Get or create default list
        let { data: lists } = await window.supabase
            .from('lists')
            .select('*')
            .eq('user_id', user.id)
            .limit(1);
            
        if (!lists || lists.length === 0) {
            const { data: newList } = await window.supabase
                .from('lists')
                .insert({
                    user_id: user.id,
                    name: 'Test List',
                    description: 'List for testing reminders'
                })
                .select()
                .single();
            lists = [newList];
        }
        
        // Create test task
        const taskText = `Fresh Test - ${new Date().toLocaleTimeString()}`;
        const { data: task, error } = await window.supabase
            .from('tasks')
            .insert({
                user_id: user.id,
                list_id: lists[0].id,
                text: taskText,
                completed: false,
                reminder_time: reminderTime.toISOString(),
                reminder_sent: false
            })
            .select()
            .single();
            
        if (error) {
            console.log('❌ Error creating task:', error);
            return;
        }
        
        console.log('✅ Fresh test task created:');
        console.log('   Task ID:', task.id);
        console.log('   Text:', taskText);
        console.log('   Reminder Time:', reminderTime.toLocaleString());
        console.log('   Reminder Sent:', task.reminder_sent);
        
        // Step 2: Check current system status
        console.log('\n2️⃣ System Status Check:');
        console.log('   Notification Service:', window.notificationService ? '✅ Available' : '❌ Missing');
        console.log('   Browser Reminder Checker:', window.browserReminderChecker ? '✅ Available' : '❌ Missing');
        console.log('   Notification Permission:', Notification.permission);
        
        // Step 3: Test notification service directly
        console.log('\n3️⃣ Testing Notification Service Directly:');
        if (window.notificationService) {
            try {
                await window.notificationService.showTaskReminder(task);
                console.log('✅ Direct notification service call succeeded');
            } catch (error) {
                console.log('❌ Direct notification service call failed:', error);
            }
        } else {
            console.log('❌ Cannot test - notification service not available');
        }
        
        // Step 4: Set up monitoring
        console.log('\n4️⃣ Setting up monitoring...');
        const startTime = Date.now();
        const targetTime = reminderTime.getTime();
        const timeUntil = Math.round((targetTime - startTime) / 1000);
        
        console.log(`⏰ Reminder scheduled for ${timeUntil} seconds from now`);
        console.log('👀 Watch for these logs:');
        console.log('   - "Checking for due reminders..." every minute');
        console.log('   - "📋 Attempting to show reminder for task:"');
        console.log('   - "✅ Notification service called successfully"');
        
        // Step 5: Monitor task status
        const checkTaskStatus = async () => {
            const { data: updatedTask } = await window.supabase
                .from('tasks')
                .select('*')
                .eq('id', task.id)
                .single();
                
            console.log(`📊 Task Status Update (${new Date().toLocaleTimeString()}):`);
            console.log('   Reminder Sent:', updatedTask.reminder_sent);
            console.log('   Time until reminder:', Math.round((targetTime - Date.now()) / 1000), 'seconds');
            
            if (updatedTask.reminder_sent) {
                console.log('🎉 SUCCESS! Reminder was processed');
                clearInterval(statusInterval);
            } else if (Date.now() > targetTime + 30000) { // 30 seconds past due
                console.log('⚠️ Reminder is overdue but not marked as sent');
                clearInterval(statusInterval);
            }
        };
        
        // Check status every 15 seconds
        const statusInterval = setInterval(checkTaskStatus, 15000);
        
        console.log('\n💡 Next Steps:');
        console.log('   1. Wait about 1 minute for the reminder');
        console.log('   2. Watch console logs for processing details');
        console.log('   3. Look for notification on screen');
        console.log('   4. Status will auto-update every 15 seconds');
        
        // Return the task for manual checking
        window.testTask = task;
        console.log('💾 Test task stored in window.testTask for manual inspection');
        
    } catch (error) {
        console.log('❌ Error in reset and test:', error);
    }
};

console.log('🔄 Reset and test script loaded.');
console.log('💡 Run resetAndTestReminder() to create a fresh test reminder');

// Auto-run if desired
setTimeout(() => {
    if (confirm('Create a fresh test reminder? This will create a new task with a 1-minute reminder.')) {
        resetAndTestReminder();
    }
}, 2000);

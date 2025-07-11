// Quick Database Table Verification
// Run this to verify your push_subscriptions table is set up correctly

console.log('🔍 Verifying database setup...');

async function verifyDatabaseSetup() {
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
    
    console.log('✅ Supabase loaded');
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('❌ Not authenticated. Please log in first.');
      return;
    }
    
    console.log(`✅ Authenticated as: ${user.email}`);
    
    // Test push_subscriptions table
    console.log('🔍 Testing push_subscriptions table...');
    const { data: pushSubs, error: pushError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id);
      
    if (pushError) {
      console.error('❌ push_subscriptions table error:', pushError);
      if (pushError.code === '42P01') {
        console.log('📋 Table does not exist. Please run the SQL to create it.');
      }
      return false;
    } else {
      console.log(`✅ push_subscriptions table OK (${pushSubs.length} records found)`);
    }
    
    // Test user_preferences table
    console.log('🔍 Testing user_preferences table...');
    const { data: userPrefs, error: prefsError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id);
      
    if (prefsError) {
      console.error('❌ user_preferences table error:', prefsError);
      return false;
    } else {
      console.log(`✅ user_preferences table OK (${userPrefs.length} records found)`);
    }
    
    // Test tasks table
    console.log('🔍 Testing tasks table...');
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);
      
    if (tasksError) {
      console.error('❌ tasks table error:', tasksError);
      return false;
    } else {
      console.log('✅ tasks table OK');
    }
    
    console.log('\n🎉 DATABASE SETUP VERIFICATION COMPLETE!');
    console.log('📱 All tables are ready for multi-device notifications');
    console.log('');
    console.log('🚀 Next steps:');
    console.log('1. Click "⚙️ Notification Settings" to register this device');
    console.log('2. Run checkDeviceRegistration() to verify registration');
    console.log('3. Run testIn1Min() to test notifications');
    
    return true;
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  }
}

// Auto-run verification
verifyDatabaseSetup();

// Make available globally
window.verifyDatabaseSetup = verifyDatabaseSetup;

console.log('💡 Run verifyDatabaseSetup() to check again');

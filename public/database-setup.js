// Database Setup Helper
// Run this to check and create the push_subscriptions table

console.log('🗄️ Database Setup Helper');

async function setupPushSubscriptionsTable() {
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
    
    console.log('🔍 Checking if push_subscriptions table exists...');
    
    // Test if table exists by trying to query it
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('id')
      .limit(1);

    if (error && error.code === '42P01') {
      console.log('❌ push_subscriptions table does not exist');
      console.log('');
      console.log('🔧 TO FIX THIS:');
      console.log('1. Go to your Supabase Dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the following SQL:');
      console.log('');
      console.log('-- CREATE PUSH SUBSCRIPTIONS TABLE');
      console.log('CREATE TABLE IF NOT EXISTS push_subscriptions (');
      console.log('  id BIGSERIAL PRIMARY KEY,');
      console.log('  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,');
      console.log('  endpoint TEXT NOT NULL,');
      console.log('  p256dh TEXT NOT NULL,');
      console.log('  auth TEXT NOT NULL,');
      console.log('  device_name TEXT NOT NULL,');
      console.log('  user_agent TEXT,');
      console.log('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
      console.log('  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
      console.log('  UNIQUE(user_id, endpoint)');
      console.log(');');
      console.log('');
      console.log('-- ENABLE ROW LEVEL SECURITY');
      console.log('ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;');
      console.log('');
      console.log('-- CREATE RLS POLICIES');
      console.log('CREATE POLICY "Users can manage their own push subscriptions"');
      console.log('  ON push_subscriptions');
      console.log('  FOR ALL');
      console.log('  USING (auth.uid() = user_id);');
      console.log('');
      console.log('-- CREATE INDEXES');
      console.log('CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);');
      console.log('CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);');
      console.log('');
      console.log('4. Click "Run" to execute the SQL');
      console.log('5. Refresh this page and try again');
      
      return { 
        exists: false, 
        error: 'Table does not exist - SQL provided above to create it' 
      };
      
    } else if (error) {
      console.error('❌ Other database error:', error);
      return { exists: false, error: error.message };
      
    } else {
      console.log('✅ push_subscriptions table exists and is accessible');
      
      // Count existing subscriptions
      const { count } = await supabase
        .from('push_subscriptions')
        .select('*', { count: 'exact', head: true });
      
      console.log(`📊 Total push subscriptions in database: ${count || 0}`);
      
      return { exists: true, count: count || 0 };
    }
    
  } catch (error) {
    console.error('❌ Setup check failed:', error);
    return { exists: false, error: error.message };
  }
}

async function checkUserPreferencesTable() {
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
    
    console.log('🔍 Checking user_preferences table...');
    
    const { data, error } = await supabase
      .from('user_preferences')
      .select('user_id')
      .limit(1);

    if (error && error.code === '42P01') {
      console.log('❌ user_preferences table does not exist');
      console.log('💡 Create it with this SQL:');
      console.log('');
      console.log('CREATE TABLE IF NOT EXISTS user_preferences (');
      console.log('  id BIGSERIAL PRIMARY KEY,');
      console.log('  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,');
      console.log('  notification_method TEXT DEFAULT \'push\' CHECK (notification_method IN (\'push\', \'sms\', \'email\', \'push_sms\')),');
      console.log('  phone_number TEXT,');
      console.log('  email TEXT,');
      console.log('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
      console.log('  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
      console.log('  UNIQUE(user_id)');
      console.log(');');
      console.log('');
      console.log('ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;');
      console.log('CREATE POLICY "Users can manage their own preferences" ON user_preferences FOR ALL USING (auth.uid() = user_id);');
      
      return false;
    } else {
      console.log('✅ user_preferences table exists');
      return true;
    }
  } catch (error) {
    console.error('❌ Error checking user_preferences table:', error);
    return false;
  }
}

// Run the setup check
console.log('🚀 Starting database setup check...');

Promise.all([
  setupPushSubscriptionsTable(),
  checkUserPreferencesTable()
]).then(([pushResult, prefsResult]) => {
  console.log('\n📋 SETUP SUMMARY:');
  console.log(`   📱 Push Subscriptions Table: ${pushResult.exists ? '✅ Ready' : '❌ Needs Setup'}`);
  console.log(`   ⚙️ User Preferences Table: ${prefsResult ? '✅ Ready' : '❌ Needs Setup'}`);
  
  if (pushResult.exists && prefsResult) {
    console.log('\n🎉 DATABASE IS READY FOR MULTI-DEVICE NOTIFICATIONS!');
    console.log('💡 You can now test with: checkDeviceRegistration()');
  } else {
    console.log('\n⚠️ Please create the missing tables using the SQL provided above');
    console.log('📖 Full setup guide: MULTI_DEVICE_TESTING_GUIDE.md');
  }
});

// Make function available globally
window.setupPushSubscriptionsTable = setupPushSubscriptionsTable;
window.checkUserPreferencesTable = checkUserPreferencesTable;

console.log('\n💡 Available commands:');
console.log('   setupPushSubscriptionsTable() - Check/setup push_subscriptions table');
console.log('   checkUserPreferencesTable() - Check user_preferences table');

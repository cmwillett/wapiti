// Mobile-friendly device cleanup and re-registration
console.log('📱 Mobile Device Cleanup Tool loaded');

// Create cleanup UI for mobile
function createMobileCleanupUI() {
  // Remove existing cleanup UI if present
  const existing = document.getElementById('mobile-cleanup');
  if (existing) {
    existing.remove();
  }

  // Create cleanup button
  const cleanupDiv = document.createElement('div');
  cleanupDiv.id = 'mobile-cleanup';
  cleanupDiv.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 10000;
    background: #ff6b6b;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    border: none;
    font-family: system-ui, -apple-system, sans-serif;
  `;
  cleanupDiv.textContent = '🔧 Fix Phone Notifications';
  
  // Add click handler
  cleanupDiv.onclick = async () => {
    try {
      cleanupDiv.textContent = '⏳ Fixing...';
      cleanupDiv.style.background = '#ffa500';
      
      const result = await cleanupAndReregisterMobile();
      
      if (result.success) {
        cleanupDiv.textContent = '✅ Fixed! Test now';
        cleanupDiv.style.background = '#28a745';
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
          cleanupDiv.style.display = 'none';
        }, 3000);
      } else {
        cleanupDiv.textContent = `❌ ${result.error}`;
        cleanupDiv.style.background = '#dc3545';
        cleanupDiv.style.fontSize = '12px';
        
        // Show error for longer on mobile
        setTimeout(() => {
          cleanupDiv.textContent = '🔧 Fix Phone Notifications';
          cleanupDiv.style.background = '#ff6b6b';
          cleanupDiv.style.fontSize = '14px';
        }, 5000);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      cleanupDiv.textContent = `❌ ${error.message || 'Unknown error'}`;
      cleanupDiv.style.background = '#dc3545';
      cleanupDiv.style.fontSize = '12px';
      
      // Show error for longer on mobile
      setTimeout(() => {
        cleanupDiv.textContent = '🔧 Fix Phone Notifications';
        cleanupDiv.style.background = '#ff6b6b';
        cleanupDiv.style.fontSize = '14px';
      }, 5000);
    }
  };
  
  document.body.appendChild(cleanupDiv);
  
  // Auto-hide if on desktop (has console)
  if (window.chrome && window.chrome.devtools) {
    setTimeout(() => {
      cleanupDiv.style.display = 'none';
    }, 5000);
  }
}

// Mobile cleanup function
async function cleanupAndReregisterMobile() {
  try {
    // Wait for services to be ready
    if (!window.supabase) {
      // Wait up to 5 seconds for supabase to load
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (window.supabase) break;
      }
      if (!window.supabase) {
        throw new Error('Supabase not loaded');
      }
    }

    const { data: { user }, error: userError } = await window.supabase.auth.getUser();
    if (userError) {
      throw new Error(`Auth error: ${userError.message}`);
    }
    if (!user) {
      throw new Error('Not authenticated');
    }

    console.log('🧹 Cleaning up invalid mobile tokens...');

    // Delete all push subscriptions for this user
    const { error: deleteError } = await window.supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      throw new Error(`Delete failed: ${deleteError.message}`);
    }

    console.log('✅ Old tokens deleted');

    // Wait for notification service to be ready
    if (!window.notificationService) {
      // Wait up to 3 seconds for notification service
      for (let i = 0; i < 6; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (window.notificationService) break;
      }
      if (!window.notificationService) {
        throw new Error('Notification service not ready');
      }
    }

    console.log('🔄 Re-initializing notifications...');
    await window.notificationService.initialize();
    console.log('✅ Mobile device re-registered!');

    // Verify registration
    const { data: newTokens } = await window.supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id);

    console.log(`📱 New tokens registered: ${newTokens?.length || 0}`);

    return { 
      success: true, 
      message: `${newTokens?.length || 0} devices registered` 
    };

  } catch (error) {
    console.error('❌ Mobile cleanup error:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error'
    };
  }
}

// Show cleanup UI
createMobileCleanupUI();

// Also add a test button
function createMobileTestUI() {
  const testDiv = document.createElement('div');
  testDiv.id = 'mobile-test';
  testDiv.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 20px;
    z-index: 10000;
    background: #28a745;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    border: none;
    font-family: system-ui, -apple-system, sans-serif;
  `;
  testDiv.textContent = '🧪 Test 1 Min';
  
  testDiv.onclick = async () => {
    try {
      testDiv.textContent = '⏳ Creating...';
      testDiv.style.background = '#ffa500';
      
      // Create test reminder
      const now = new Date();
      const reminderTime = new Date(now.getTime() + 60000); // 1 minute
      
      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: task, error } = await window.supabase
        .from('tasks')
        .insert({
          text: 'Mobile test reminder',
          user_id: user.id,
          completed: false,
          reminder_sent: false,
          reminder_time: reminderTime.toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      testDiv.textContent = '✅ Test created!';
      testDiv.style.background = '#28a745';
      
      setTimeout(() => {
        testDiv.textContent = '🧪 Test 1 Min';
      }, 2000);
      
    } catch (error) {
      console.error('Test error:', error);
      testDiv.textContent = '❌ Test failed';
      testDiv.style.background = '#dc3545';
      
      setTimeout(() => {
        testDiv.textContent = '🧪 Test 1 Min';
        testDiv.style.background = '#28a745';
      }, 2000);
    }
  };
  
  document.body.appendChild(testDiv);
}

createMobileTestUI();

console.log('📱 Mobile tools ready! Look for buttons in bottom-right corner.');

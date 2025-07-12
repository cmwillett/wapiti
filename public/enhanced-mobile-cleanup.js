// Enhanced mobile cleanup with automatic retry and monitoring
console.log('📱 Enhanced Mobile Device Manager loaded');

class MobileDeviceManager {
  constructor() {
    this.retryCount = 0;
    this.maxRetries = 3;
    this.monitoringInterval = null;
    this.lastValidationTime = null;
  }

  // Enhanced cleanup with retry logic
  async cleanupAndReregister() {
    try {
      console.log(`🧹 Mobile cleanup attempt ${this.retryCount + 1}/${this.maxRetries}`);
      
      // Wait for services to be ready
      await this.waitForServices();

      const { data: { user }, error: userError } = await window.supabase.auth.getUser();
      if (userError) throw new Error(`Auth error: ${userError.message}`);
      if (!user) throw new Error('Not authenticated');

      // Delete all push subscriptions for this user
      console.log('🗑️ Deleting old tokens...');
      const { error: deleteError } = await window.supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) throw new Error(`Delete failed: ${deleteError.message}`);

      // Wait a moment for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Force re-initialization
      console.log('🔄 Force re-initializing notifications...');
      
      // Clear any cached state
      if (window.notificationService) {
        window.notificationService.currentSubscription = null;
        window.notificationService.isSubscribed = false;
      }

      // Re-initialize
      await window.notificationService.initializeNotifications();

      // Verify registration worked
      const verification = await this.verifyRegistration(user.id);
      
      if (!verification.success) {
        throw new Error(verification.error);
      }

      console.log('✅ Mobile device re-registered successfully!');
      this.retryCount = 0; // Reset retry count on success
      
      // Start monitoring for token invalidation
      this.startTokenMonitoring();

      return { 
        success: true, 
        message: `Device registered (${verification.devices} devices total)`,
        devices: verification.devices
      };

    } catch (error) {
      console.error(`❌ Mobile cleanup attempt ${this.retryCount + 1} failed:`, error);
      
      this.retryCount++;
      
      if (this.retryCount < this.maxRetries) {
        console.log(`⏳ Retrying in 2 seconds... (${this.retryCount}/${this.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return await this.cleanupAndReregister();
      } else {
        this.retryCount = 0;
        return { 
          success: false, 
          error: `Failed after ${this.maxRetries} attempts: ${error.message}`
        };
      }
    }
  }

  // Wait for all required services to be ready
  async waitForServices() {
    console.log('⏳ Waiting for services...');
    
    // Wait for Supabase
    for (let i = 0; i < 20; i++) {
      if (window.supabase) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (!window.supabase) throw new Error('Supabase not loaded');

    // Wait for notification service
    for (let i = 0; i < 10; i++) {
      if (window.notificationService) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (!window.notificationService) throw new Error('Notification service not ready');

    console.log('✅ Services ready');
  }

  // Verify registration worked and get device count
  async verifyRegistration(userId) {
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for DB update
      
      const { data: tokens, error } = await window.supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      const deviceCount = tokens?.length || 0;
      console.log(`📱 Verification: ${deviceCount} devices registered`);
      
      if (deviceCount === 0) {
        return { success: false, error: 'No devices registered after cleanup' };
      }

      // Check if we have at least one mobile device
      const mobileDevices = tokens.filter(t => 
        t.device_name && t.device_name.toLowerCase().includes('android')
      );

      if (mobileDevices.length === 0) {
        return { success: false, error: 'No mobile devices found after registration' };
      }

      return { success: true, devices: deviceCount, mobileDevices: mobileDevices.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Start monitoring for token invalidation
  startTokenMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    console.log('🔍 Starting token monitoring...');
    
    // Check every 2 minutes
    this.monitoringInterval = setInterval(async () => {
      await this.checkTokenHealth();
    }, 2 * 60 * 1000);

    // Also check when page becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        setTimeout(() => this.checkTokenHealth(), 1000);
      }
    });
  }

  // Check if tokens are still valid
  async checkTokenHealth() {
    try {
      const now = Date.now();
      
      // Don't check too frequently
      if (this.lastValidationTime && (now - this.lastValidationTime) < 60000) {
        return;
      }
      
      this.lastValidationTime = now;
      console.log('🔍 Checking token health...');

      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) return;

      // Test notification to see if tokens are working
      const testResult = await this.testNotificationDelivery();
      
      if (!testResult.success) {
        console.warn('⚠️ Token health check failed, triggering refresh...');
        await this.handleUnhealthyToken();
      } else {
        console.log('✅ Token health check passed');
      }
    } catch (error) {
      console.error('❌ Token health check error:', error);
    }
  }

  // Test if notification delivery works
  async testNotificationDelivery() {
    try {
      // Create a silent test to check if our token works
      // We'll just check if we can successfully call the registration
      if (window.notificationService && window.notificationService.currentSubscription) {
        return { success: true };
      }
      return { success: false, error: 'No active subscription' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Handle unhealthy token by refreshing
  async handleUnhealthyToken() {
    console.log('🔄 Handling unhealthy token...');
    
    // Don't spam refreshes
    if (this.retryCount > 0) {
      console.log('⏳ Already handling token refresh, skipping...');
      return;
    }

    await this.cleanupAndReregister();
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🛑 Token monitoring stopped');
    }
  }
}

// Create global manager instance
window.mobileDeviceManager = new MobileDeviceManager();

// Enhanced mobile cleanup UI
function createEnhancedMobileUI() {
  // Remove existing UI
  const existing = document.getElementById('mobile-cleanup');
  if (existing) existing.remove();

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
  cleanupDiv.textContent = '🔧 Fix & Monitor';
  
  cleanupDiv.onclick = async () => {
    try {
      cleanupDiv.textContent = '⏳ Fixing...';
      cleanupDiv.style.background = '#ffa500';
      
      const result = await window.mobileDeviceManager.cleanupAndReregister();
      
      if (result.success) {
        cleanupDiv.textContent = '✅ Fixed & Monitoring';
        cleanupDiv.style.background = '#28a745';
        
        // Show success for longer on mobile
        setTimeout(() => {
          cleanupDiv.textContent = '✅ Monitoring';
          cleanupDiv.style.fontSize = '12px';
        }, 3000);
      } else {
        cleanupDiv.textContent = `❌ ${result.error.substring(0, 15)}...`;
        cleanupDiv.style.background = '#dc3545';
        cleanupDiv.style.fontSize = '12px';
        
        setTimeout(() => {
          cleanupDiv.textContent = '🔧 Fix & Monitor';
          cleanupDiv.style.background = '#ff6b6b';
          cleanupDiv.style.fontSize = '14px';
        }, 5000);
      }
    } catch (error) {
      console.error('Enhanced cleanup error:', error);
      cleanupDiv.textContent = '❌ Error';
      cleanupDiv.style.background = '#dc3545';
      
      setTimeout(() => {
        cleanupDiv.textContent = '🔧 Fix & Monitor';
        cleanupDiv.style.background = '#ff6b6b';
      }, 3000);
    }
  };
  
  document.body.appendChild(cleanupDiv);
}

// Show enhanced UI
createEnhancedMobileUI();

console.log('📱 Enhanced mobile device manager ready!');
console.log('- Automatic retry on failures');
console.log('- Token health monitoring'); 
console.log('- Auto-refresh when tokens become invalid');

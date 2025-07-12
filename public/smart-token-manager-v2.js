// Smart Token Refresh System - Phase 2
// Handles automatic token detection, refresh, deduplication, wake-up detection, and health monitoring

class SmartTokenManager {
  constructor() {
    this.isInitializing = false;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.deviceType = this.getDeviceType();
    this.deviceId = this.generateDeviceId();
    
    // Phase 2 additions
    this.healthCheckInterval = null;
    this.lastHealthCheck = null;
    this.lastWakeUp = Date.now();
    this.isVisible = !document.hidden;
    this.statusIndicator = null;
    
    // Bind methods for event listeners
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handlePageShow = this.handlePageShow.bind(this);
    this.handleFocus = this.handleFocus.bind(this);
  }

  getDeviceType() {
    const userAgent = navigator.userAgent;
    if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      return 'Mobile';
    }
    return 'Desktop';
  }

  generateDeviceId() {
    // Create a consistent device ID based on user agent and screen
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
    
    const fingerprint = canvas.toDataURL() + navigator.userAgent + screen.width + screen.height;
    return btoa(fingerprint).slice(0, 16);
  }

  async initialize() {
    if (this.isInitializing) return;
    
    console.log('🔄 SmartTokenManager: Initializing...');
    this.isInitializing = true;

    try {
      // Step 1: Check if we need authentication
      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) {
        console.log('⏭️ SmartTokenManager: Not authenticated, skipping');
        return;
      }

      // Step 2: Clean up any existing duplicates for this device
      await this.cleanupDuplicatesForThisDevice(user.id);

      // Step 3: Check if we have a valid subscription
      const hasValidSubscription = await this.checkCurrentSubscription();
      
      if (!hasValidSubscription) {
        console.log('🔧 SmartTokenManager: No valid subscription, creating new one...');
        await this.createFreshSubscription(user.id);
      } else {
        console.log('✅ SmartTokenManager: Valid subscription exists');
      }

      // Step 4: Verify registration in database
      await this.ensureDatabaseRegistration(user.id);

      // Phase 2: Setup lifecycle monitoring after successful initialization
      this.setupLifecycleListeners();
      this.startHealthMonitoring();
      this.createStatusIndicator();
      this.updateStatusIndicator();

      console.log('✅ SmartTokenManager: Initialization complete');

    } catch (error) {
      console.error('❌ SmartTokenManager: Initialization failed:', error);
      
      // Retry with exponential backoff
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        const delay = Math.pow(2, this.retryCount) * 1000; // 2s, 4s, 8s
        console.log(`🔄 SmartTokenManager: Retrying in ${delay}ms (attempt ${this.retryCount})`);
        
        setTimeout(() => {
          this.isInitializing = false;
          this.initialize();
        }, delay);
      }
    } finally {
      this.isInitializing = false;
    }
  }

  async cleanupDuplicatesForThisDevice(userId) {
    console.log('🧹 SmartTokenManager: Cleaning up duplicates for this device...');
    
    try {
      // Get all subscriptions for this user
      const { data: allTokens, error } = await window.supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by device type and device ID (if available)
      const thisDeviceTokens = allTokens.filter(token => {
        const tokenDeviceType = token.device_name?.includes('Mobile') ? 'Mobile' : 'Desktop';
        return tokenDeviceType === this.deviceType;
      });

      // If we have multiple tokens for this device type, keep only the newest
      if (thisDeviceTokens.length > 1) {
        const tokensToRemove = thisDeviceTokens.slice(1); // Remove all except the first (newest)
        
        console.log(`🗑️ SmartTokenManager: Removing ${tokensToRemove.length} duplicate(s) for ${this.deviceType}`);
        
        for (const token of tokensToRemove) {
          await window.supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', token.id);
        }
      }

    } catch (error) {
      console.error('❌ SmartTokenManager: Cleanup failed:', error);
      throw error;
    }
  }

  async checkCurrentSubscription() {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('⚠️ SmartTokenManager: Push not supported');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        console.log('❌ SmartTokenManager: No push subscription exists');
        return false;
      }

      // Try to extract the token from the endpoint to validate it's not malformed
      const endpoint = subscription.endpoint;
      if (!endpoint || !endpoint.includes('fcm')) {
        console.log('❌ SmartTokenManager: Invalid subscription endpoint');
        return false;
      }

      console.log('✅ SmartTokenManager: Valid subscription found');
      return true;

    } catch (error) {
      console.error('❌ SmartTokenManager: Subscription check failed:', error);
      return false;
    }
  }

  async createFreshSubscription(userId) {
    try {
      console.log('🔧 SmartTokenManager: Creating fresh subscription...');

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push notifications not supported');
      }

      const registration = await navigator.serviceWorker.ready;

      // Unsubscribe from any existing subscription
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        await existingSubscription.unsubscribe();
        console.log('🗑️ SmartTokenManager: Unsubscribed from existing subscription');
      }

      // Create new subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'BJPVlwpCxnv6hdAsbgspbI1xcE7_LwhJvDV2ibZ4alQ38WSzFzN6xf-QyYN2FUOP-miBMRTitIdVPSGb1mjYWZU'
      });

      console.log('✅ SmartTokenManager: Fresh subscription created');
      return subscription;

    } catch (error) {
      console.error('❌ SmartTokenManager: Failed to create subscription:', error);
      throw error;
    }
  }

  async ensureDatabaseRegistration(userId) {
    try {
      console.log('💾 SmartTokenManager: Ensuring database registration...');

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        throw new Error('No subscription available for database registration');
      }

      // Generate consistent device name
      const deviceName = `${this.deviceType} Smart (${this.deviceId})`;

      // Use upsert with endpoint as unique key to prevent duplicates
      const { error } = await window.supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')))),
          auth: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth')))),
          device_name: deviceName,
          device_id: this.deviceId,
          last_refreshed: new Date().toISOString()
        }, {
          onConflict: 'endpoint'
        });

      if (error) throw error;

      console.log(`✅ SmartTokenManager: Database registration complete for ${deviceName}`);

    } catch (error) {
      console.error('❌ SmartTokenManager: Database registration failed:', error);
      throw error;
    }
  }

  async getDeviceCount() {
    try {
      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) return 0;

      const { data: tokens, error } = await window.supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', user.id);

      if (error) throw error;
      return tokens?.length || 0;

    } catch (error) {
      console.error('❌ SmartTokenManager: Failed to get device count:', error);
      return 0;
    }
  }

  async forceRefresh() {
    console.log('🔄 SmartTokenManager: Force refresh requested...');
    this.retryCount = 0;
    this.isInitializing = false;
    await this.initialize();
    this.updateStatusIndicator();
    return { success: true, deviceCount: await this.getDeviceCount() };
  }

  // Cleanup method for removing event listeners
  destroy() {
    console.log('🧹 SmartTokenManager: Cleaning up...');
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('pageshow', this.handlePageShow);
    window.removeEventListener('focus', this.handleFocus);
    
    // Stop health monitoring
    this.stopHealthMonitoring();
    
    // Remove status indicator
    if (this.statusIndicator) {
      this.statusIndicator.remove();
      this.statusIndicator = null;
    }
    
    console.log('✅ SmartTokenManager: Cleanup complete');
  }

  // Phase 2: Wake-up detection and lifecycle management
  setupLifecycleListeners() {
    console.log('👂 SmartTokenManager: Setting up lifecycle listeners...');
    
    // Detect when page becomes visible (user returns to app)
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Detect when page is shown (back/forward navigation)
    window.addEventListener('pageshow', this.handlePageShow);
    
    // Detect when window gains focus
    window.addEventListener('focus', this.handleFocus);
    
    console.log('✅ SmartTokenManager: Lifecycle listeners active');
  }

  async handleVisibilityChange() {
    if (!document.hidden && !this.isVisible) {
      // Page became visible - user returned to app
      console.log('👀 SmartTokenManager: App became visible - checking tokens...');
      this.isVisible = true;
      this.lastWakeUp = Date.now();
      
      // Check if we need to refresh tokens after being away
      await this.checkAfterWakeUp();
    } else if (document.hidden) {
      this.isVisible = false;
    }
  }

  async handlePageShow(event) {
    if (event.persisted) {
      // Page was loaded from cache (back/forward button)
      console.log('🔄 SmartTokenManager: Page restored from cache - checking tokens...');
      this.lastWakeUp = Date.now();
      await this.checkAfterWakeUp();
    }
  }

  async handleFocus() {
    // Window gained focus
    const now = Date.now();
    const timeSinceLastWakeUp = now - this.lastWakeUp;
    
    // Only check if it's been more than 5 minutes since last wake-up
    if (timeSinceLastWakeUp > 5 * 60 * 1000) {
      console.log('🎯 SmartTokenManager: Window focused after long absence - checking tokens...');
      this.lastWakeUp = now;
      await this.checkAfterWakeUp();
    }
  }

  async checkAfterWakeUp() {
    try {
      // Check if we're still authenticated
      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) return;

      // Check token health
      const isHealthy = await this.checkTokenHealth();
      if (!isHealthy) {
        console.log('🔧 SmartTokenManager: Unhealthy tokens detected after wake-up, refreshing...');
        await this.initialize();
      } else {
        console.log('✅ SmartTokenManager: Tokens healthy after wake-up');
      }
      
      // Update status indicator
      this.updateStatusIndicator();
      
    } catch (error) {
      console.error('❌ SmartTokenManager: Wake-up check failed:', error);
    }
  }

  // Phase 2: Periodic health monitoring
  startHealthMonitoring() {
    // Stop any existing monitoring
    this.stopHealthMonitoring();
    
    console.log('💓 SmartTokenManager: Starting health monitoring (15min intervals)...');
    
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 15 * 60 * 1000); // Every 15 minutes
    
    // Also do an immediate health check
    setTimeout(() => this.performHealthCheck(), 5000);
  }

  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('🛑 SmartTokenManager: Health monitoring stopped');
    }
  }

  async performHealthCheck() {
    try {
      this.lastHealthCheck = Date.now();
      console.log('💓 SmartTokenManager: Performing health check...');
      
      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) return;

      const isHealthy = await this.checkTokenHealth();
      
      if (!isHealthy) {
        console.log('⚕️ SmartTokenManager: Health check failed, attempting recovery...');
        await this.initialize();
      } else {
        console.log('✅ SmartTokenManager: Health check passed');
      }
      
      this.updateStatusIndicator();
      
    } catch (error) {
      console.error('❌ SmartTokenManager: Health check error:', error);
      this.updateStatusIndicator('error');
    }
  }

  async checkTokenHealth() {
    try {
      // Check if we have a valid subscription
      const hasValidSubscription = await this.checkCurrentSubscription();
      if (!hasValidSubscription) return false;

      // Check if registration exists in database
      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) return false;

      const { data: tokens, error } = await window.supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      // Check if we have at least one token for this device type
      const thisDeviceTokens = tokens?.filter(token => {
        const tokenDeviceType = token.device_name?.includes('Mobile') ? 'Mobile' : 'Desktop';
        return tokenDeviceType === this.deviceType;
      });

      return thisDeviceTokens && thisDeviceTokens.length > 0;

    } catch (error) {
      console.error('❌ SmartTokenManager: Token health check failed:', error);
      return false;
    }
  }

  // Phase 2: Visual status indicator
  createStatusIndicator() {
    if (this.statusIndicator) return; // Already exists

    this.statusIndicator = document.createElement('div');
    this.statusIndicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 10000;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #95a5a6;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
      cursor: pointer;
      opacity: 0.7;
    `;
    
    this.statusIndicator.title = 'Push notification status';
    
    // Click to show details
    this.statusIndicator.onclick = () => this.showStatusDetails();
    
    document.body.appendChild(this.statusIndicator);
    console.log('📊 SmartTokenManager: Status indicator created');
  }

  updateStatusIndicator(status = null) {
    if (!this.statusIndicator) this.createStatusIndicator();
    
    let color, title;
    
    if (status === 'error') {
      color = '#e74c3c';
      title = 'Push notifications: Error';
    } else if (this.lastHealthCheck && (Date.now() - this.lastHealthCheck < 16 * 60 * 1000)) {
      // Health check within last 16 minutes
      color = '#27ae60';
      title = 'Push notifications: Healthy';
    } else {
      color = '#f39c12';
      title = 'Push notifications: Checking...';
    }
    
    this.statusIndicator.style.background = color;
    this.statusIndicator.title = title;
  }

  async showStatusDetails() {
    try {
      const deviceCount = await this.getDeviceCount();
      const isHealthy = await this.checkTokenHealth();
      const lastCheckAgo = this.lastHealthCheck 
        ? Math.round((Date.now() - this.lastHealthCheck) / 60000) 
        : 'Never';
      
      const message = `
🔔 Push Notification Status:
• Device: ${this.deviceType} (${this.deviceId})
• Registered devices: ${deviceCount}
• Token health: ${isHealthy ? 'Healthy ✅' : 'Unhealthy ❌'}
• Last check: ${lastCheckAgo === 'Never' ? 'Never' : lastCheckAgo + ' min ago'}
• Monitoring: ${this.healthCheckInterval ? 'Active 💓' : 'Inactive ⏸️'}
      `.trim();
      
      alert(message);
      
    } catch (error) {
      alert('❌ Error getting status details: ' + error.message);
    }
  }
}

// Global instance
window.smartTokenManager = new SmartTokenManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => window.smartTokenManager.initialize(), 1000);
  });
} else {
  setTimeout(() => window.smartTokenManager.initialize(), 1000);
}

console.log('🧠 SmartTokenManager Phase 2 loaded - will auto-initialize in 1 second');
console.log('📋 Features: Auto-refresh, Wake-up detection, Health monitoring, Status indicator');

// Phase 2: Add manual test button for development/debugging
function addManualTestButton() {
  // Only add in development or when explicitly requested
  if (window.location.hostname === 'localhost' || window.location.search.includes('debug=true')) {
    const button = document.createElement('button');
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 10000;
      background: #3498db;
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      font-family: system-ui, -apple-system, sans-serif;
    `;
    
    button.textContent = '🔄 Test Refresh';
    button.title = 'Manually test token refresh';
    
    button.onclick = async () => {
      button.textContent = '⏳ Testing...';
      button.disabled = true;
      
      try {
        const result = await window.smartTokenManager.forceRefresh();
        button.textContent = `✅ ${result.deviceCount} devices`;
        setTimeout(() => {
          button.textContent = '🔄 Test Refresh';
          button.disabled = false;
        }, 2000);
      } catch (error) {
        button.textContent = '❌ Failed';
        setTimeout(() => {
          button.textContent = '🔄 Test Refresh';
          button.disabled = false;
        }, 2000);
      }
    };
    
    document.body.appendChild(button);
    console.log('🧪 SmartTokenManager: Test button added (debug mode)');
  }
}

// Add test button after initialization
setTimeout(addManualTestButton, 2000);

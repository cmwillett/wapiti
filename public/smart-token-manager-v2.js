// Smart Token Refresh System - Phase 1
// Handles automatic token detection, refresh, and deduplication

class SmartTokenManager {
  constructor() {
    this.isInitializing = false;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.deviceType = this.getDeviceType();
    this.deviceId = this.generateDeviceId();
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
    return { success: true, deviceCount: await this.getDeviceCount() };
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

console.log('🧠 SmartTokenManager loaded - will auto-initialize in 1 second');

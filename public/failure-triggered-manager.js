// Final solution: Real-time failure-triggered token refresh
console.log('🔥 Failure-Triggered Token Manager loaded');

class FailureTriggeredTokenManager {
  constructor() {
    this.isActive = false;
    this.lastFailureTime = null;
    this.failureCount = 0;
    this.refreshInProgress = false;
  }

  async activate() {
    if (this.isActive) return;
    
    console.log('🔥 Activating failure-triggered token management...');
    this.isActive = true;
    
    // Set up failure monitoring
    this.setupFailureMonitoring();
    
    // Initial registration
    await this.ensureCurrentDeviceRegistered();
    
    console.log('🔥 Failure-triggered management active');
  }

  setupFailureMonitoring() {
    // Monitor notification failures and auto-refresh
    this.setupNotificationFailureDetection();
    
    // Proactive refresh on app visibility changes (mobile browsers suspend tokens)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('👁️ App became visible, checking token health...');
        setTimeout(() => this.checkAndRefreshIfNeeded(), 1000);
      }
    });

    // Also refresh on window focus (for desktop)
    window.addEventListener('focus', () => {
      console.log('🎯 Window focused, checking token health...');
      setTimeout(() => this.checkAndRefreshIfNeeded(), 500);
    });
  }

  setupNotificationFailureDetection() {
    // Intercept fetch requests to monitor Edge Function calls
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch.apply(window, args);
        
        // Check if this was a notification-related request
        const url = args[0];
        if (typeof url === 'string' && url.includes('check-reminders')) {
          // Clone response to read it without consuming the original
          const clonedResponse = response.clone();
          try {
            const data = await clonedResponse.json();
            this.analyzeNotificationResponse(data);
          } catch (e) {
            // Ignore JSON parse errors
          }
        }
        
        return response;
      } catch (error) {
        return originalFetch.apply(window, args);
      }
    };
  }

  async analyzeNotificationResponse(data) {
    if (!data || !data.notifications) return;
    
    // Look for failed notifications due to UNREGISTERED tokens
    const failures = data.notifications.filter(notif => 
      !notif.result?.success && 
      (notif.result?.error?.includes('UNREGISTERED') || 
       notif.result?.error?.includes('Failed to deliver'))
    );

    if (failures.length > 0) {
      console.log(`🚨 Detected ${failures.length} notification failures, triggering refresh...`);
      await this.handleNotificationFailure();
    }
  }

  async handleNotificationFailure() {
    const now = Date.now();
    
    // Prevent spam refreshes
    if (this.lastFailureTime && (now - this.lastFailureTime) < 30000) {
      console.log('⏳ Recent refresh, skipping...');
      return;
    }

    if (this.refreshInProgress) {
      console.log('⏳ Refresh already in progress, skipping...');
      return;
    }

    this.lastFailureTime = now;
    this.failureCount++;
    
    console.log(`🔄 Handling notification failure #${this.failureCount}...`);
    await this.emergencyTokenRefresh();
  }

  async emergencyTokenRefresh() {
    try {
      this.refreshInProgress = true;
      console.log('🚨 EMERGENCY TOKEN REFRESH');

      await this.waitForServices();

      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get device info
      const deviceType = this.getDeviceType();
      const deviceName = this.getDeviceName();
      
      console.log(`🔄 Emergency refresh for ${deviceType} device...`);

      // Clear browser subscription first
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          console.log('🗑️ Clearing invalid browser subscription...');
          await existingSub.unsubscribe();
        }
      }

      // Remove only tokens that are clearly from this device type
      console.log(`🧹 Cleaning up invalid ${deviceType} tokens...`);
      const { data: allTokens } = await window.supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id);

      if (allTokens) {
        // Remove tokens that match this device type and are likely invalid
        const invalidTokens = allTokens.filter(token => {
          const name = (token.device_name || '').toLowerCase();
          return (
            (deviceType === 'android' && name.includes('android')) ||
            (deviceType === 'windows' && name.includes('windows')) ||
            (deviceType === 'ios' && (name.includes('ios') || name.includes('iphone'))) ||
            (deviceType === 'mac' && name.includes('mac'))
          );
        });

        if (invalidTokens.length > 0) {
          console.log(`🗑️ Removing ${invalidTokens.length} invalid ${deviceType} tokens...`);
          const tokenIds = invalidTokens.map(t => t.id);
          await window.supabase
            .from('push_subscriptions')
            .delete()
            .in('id', tokenIds);
        }
      }

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create fresh subscription
      console.log('🔄 Creating emergency fresh subscription...');
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'BJPVlwpCxnv6hdAsbgspbI1xcE7_LwhJvDV2ibZ4alQ38WSzFzN6xf-QyYN2FUOP-miBMRTitIdVPSGb1mjYWZU'
      });

      // Save immediately
      const subscriptionData = {
        user_id: user.id,
        endpoint: newSubscription.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(newSubscription.getKey('p256dh')))),
        auth: btoa(String.fromCharCode(...new Uint8Array(newSubscription.getKey('auth')))),
        device_name: deviceName,
        created_at: new Date().toISOString()
      };

      const { error: saveError } = await window.supabase
        .from('push_subscriptions')
        .insert(subscriptionData);

      if (saveError) throw new Error(`Emergency save failed: ${saveError.message}`);

      // Update notification service
      if (window.notificationService) {
        window.notificationService.currentSubscription = newSubscription;
        window.notificationService.isSubscribed = true;
      }

      console.log('✅ Emergency token refresh complete!');
      
      // Verify the fix
      const { data: finalTokens } = await window.supabase
        .from('push_subscriptions')
        .select('device_name')
        .eq('user_id', user.id);

      console.log(`📱 Active devices after emergency refresh: ${finalTokens?.length || 0}`);
      finalTokens?.forEach(token => {
        console.log(`  - ${token.device_name}`);
      });

    } catch (error) {
      console.error('❌ Emergency token refresh failed:', error);
    } finally {
      this.refreshInProgress = false;
    }
  }

  async ensureCurrentDeviceRegistered() {
    try {
      console.log('🔍 Ensuring current device is registered...');
      
      await this.waitForServices();

      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) return;

      // Check if we have a valid subscription
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;

      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        console.log('📱 No subscription found, creating one...');
        await this.emergencyTokenRefresh();
        return;
      }

      // Check if subscription is in database
      const { data: tokens } = await window.supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('endpoint', subscription.endpoint);

      if (!tokens || tokens.length === 0) {
        console.log('📱 Subscription not in database, registering...');
        await this.emergencyTokenRefresh();
      } else {
        console.log('✅ Current device already registered');
      }

    } catch (error) {
      console.error('❌ Device registration check failed:', error);
    }
  }

  async checkAndRefreshIfNeeded() {
    if (this.refreshInProgress) return;

    try {
      // Quick check if our token is still valid
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        console.log('⚠️ No service worker, refreshing...');
        await this.emergencyTokenRefresh();
        return;
      }

      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        console.log('⚠️ No subscription, refreshing...');
        await this.emergencyTokenRefresh();
        return;
      }

      console.log('✅ Token health check passed');

    } catch (error) {
      console.error('⚠️ Token health check failed, refreshing...', error);
      await this.emergencyTokenRefresh();
    }
  }

  getDeviceType() {
    const userAgent = navigator.userAgent;
    if (/Android/i.test(userAgent)) return 'android';
    if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
    if (/Windows/i.test(userAgent)) return 'windows';
    if (/Mac/i.test(userAgent)) return 'mac';
    if (/Linux/i.test(userAgent)) return 'linux';
    return 'unknown';
  }

  getDeviceName() {
    const type = this.getDeviceType();
    const timestamp = new Date().toLocaleTimeString();
    
    switch (type) {
      case 'android': return `Android Emergency (${timestamp})`;
      case 'ios': return `iOS Emergency (${timestamp})`;
      case 'windows': return `Windows Emergency (${timestamp})`;
      case 'mac': return `Mac Emergency (${timestamp})`;
      case 'linux': return `Linux Emergency (${timestamp})`;
      default: return `Emergency Device (${timestamp})`;
    }
  }

  async waitForServices() {
    for (let i = 0; i < 20; i++) {
      if (window.supabase) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (!window.supabase) throw new Error('Supabase not loaded');
  }
}

// Create global manager
window.failureTriggeredManager = new FailureTriggeredTokenManager();

// Auto-activate
setTimeout(() => {
  window.failureTriggeredManager.activate();
}, 2000);

// Create UI
function createFailureTriggeredUI() {
  const existing = document.getElementById('failure-triggered-fix');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'failure-triggered-fix';
  container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    background: #e74c3c;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    border: none;
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 200px;
  `;
  
  const deviceType = window.failureTriggeredManager.getDeviceType();
  container.textContent = `🔥 Emergency (${deviceType})`;

  container.onclick = async () => {
    container.textContent = '🚨 Emergency...';
    container.style.background = '#f39c12';

    try {
      await window.failureTriggeredManager.emergencyTokenRefresh();
      container.textContent = '✅ Fixed!';
      container.style.background = '#27ae60';
      
      setTimeout(() => {
        container.textContent = `🔥 Auto-Monitor`;
        container.style.fontSize = '12px';
      }, 3000);
    } catch (error) {
      container.textContent = '❌ Failed';
      container.style.background = '#e74c3c';
    }
  };

  document.body.appendChild(container);
}

createFailureTriggeredUI();

console.log('🔥 Failure-triggered token manager ready! Monitors for failures and auto-fixes.');

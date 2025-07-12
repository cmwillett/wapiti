// Smart device-aware token manager that doesn't break other devices
console.log('🧠 Smart Token Manager loaded');

class SmartTokenManager {
  constructor() {
    this.deviceId = this.generateDeviceId();
    this.isRunning = false;
    this.refreshTimer = null;
  }

  // Generate consistent device ID based on browser characteristics
  generateDeviceId() {
    const userAgent = navigator.userAgent;
    const screenInfo = `${screen.width}x${screen.height}`;
    const platform = navigator.platform || 'unknown';
    const language = navigator.language || 'en';
    
    // Create a simple hash of device characteristics
    const deviceString = `${userAgent}-${screenInfo}-${platform}-${language}`;
    let hash = 0;
    for (let i = 0; i < deviceString.length; i++) {
      const char = deviceString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    const deviceId = Math.abs(hash).toString(36);
    console.log(`🔍 Device ID: ${deviceId} (${this.getDeviceType()})`);
    return deviceId;
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
      case 'android': return `Android Device (${timestamp})`;
      case 'ios': return `iOS Device (${timestamp})`;
      case 'windows': return `Windows Desktop (${timestamp})`;
      case 'mac': return `Mac Desktop (${timestamp})`;
      case 'linux': return `Linux Desktop (${timestamp})`;
      default: return `Unknown Device (${timestamp})`;
    }
  }

  async start() {
    if (this.isRunning) {
      console.log('🧠 Smart token manager already running');
      return;
    }

    console.log('🧠 Starting smart token management...');
    this.isRunning = true;

    // Initial registration for this device only
    await this.refreshThisDeviceToken();

    // Set up appropriate refresh schedule based on device type
    this.scheduleRefresh();

    console.log('🧠 Smart token management active');
  }

  async refreshThisDeviceToken() {
    try {
      console.log(`🔄 Refreshing token for device ${this.deviceId}...`);

      // Wait for services
      await this.waitForServices();

      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Step 1: Find and remove ONLY this device's old tokens
      console.log('🔍 Finding existing tokens for this device...');
      
      // Get current subscription to identify our endpoint
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) throw new Error('No service worker registration');

      const currentSub = await registration.pushManager.getSubscription();
      let currentEndpoint = null;
      
      if (currentSub) {
        currentEndpoint = currentSub.endpoint;
        console.log(`🔍 Current endpoint: ...${currentEndpoint.slice(-30)}`);
      }

      // Get all tokens for this user
      const { data: allTokens } = await window.supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id);

      console.log(`📱 Found ${allTokens?.length || 0} total tokens for user`);

      // Identify tokens that belong to this device
      const deviceTokens = [];
      const otherTokens = [];

      if (allTokens) {
        allTokens.forEach(token => {
          const isThisDevice = (
            (currentEndpoint && token.endpoint === currentEndpoint) ||
            (token.device_name && token.device_name.includes(this.getDeviceType())) ||
            this.isLikelyThisDevice(token)
          );

          if (isThisDevice) {
            deviceTokens.push(token);
          } else {
            otherTokens.push(token);
          }
        });
      }

      console.log(`🔍 This device tokens: ${deviceTokens.length}, Other device tokens: ${otherTokens.length}`);

      // Step 2: Remove ONLY this device's old tokens
      if (deviceTokens.length > 0) {
        console.log(`🗑️ Removing ${deviceTokens.length} old tokens for this device...`);
        const tokenIds = deviceTokens.map(t => t.id);
        
        await window.supabase
          .from('push_subscriptions')
          .delete()
          .in('id', tokenIds);

        console.log('✅ Old device tokens removed, other devices preserved');
      }

      // Step 3: Clear browser subscription
      if (currentSub) {
        console.log('🗑️ Clearing browser subscription...');
        await currentSub.unsubscribe();
      }

      // Step 4: Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Step 5: Create fresh subscription for this device
      console.log('🔄 Creating fresh subscription for this device...');
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'BJPVlwpCxnv6hdAsbgspbI1xcE7_LwhJvDV2ibZ4alQ38WSzFzN6xf-QyYN2FUOP-miBMRTitIdVPSGb1mjYWZU'
      });

      // Step 6: Save new token
      const subscriptionData = {
        user_id: user.id,
        endpoint: newSubscription.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(newSubscription.getKey('p256dh')))),
        auth: btoa(String.fromCharCode(...new Uint8Array(newSubscription.getKey('auth')))),
        device_name: this.getDeviceName(),
        created_at: new Date().toISOString()
      };

      const { error: saveError } = await window.supabase
        .from('push_subscriptions')
        .insert(subscriptionData);

      if (saveError) throw new Error(`Save failed: ${saveError.message}`);

      // Step 7: Update notification service
      if (window.notificationService) {
        window.notificationService.currentSubscription = newSubscription;
        window.notificationService.isSubscribed = true;
      }

      // Step 8: Verify results
      const { data: finalTokens } = await window.supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id);

      console.log(`✅ Token refresh complete! Total devices: ${finalTokens?.length || 0}`);
      finalTokens?.forEach((token, i) => {
        console.log(`  Device ${i + 1}: ${token.device_name} (...${token.endpoint.slice(-20)})`);
      });

      return { success: true, totalDevices: finalTokens?.length || 0 };

    } catch (error) {
      console.error(`❌ Smart token refresh failed:`, error);
      return { success: false, error: error.message };
    }
  }

  // Heuristic to identify if a token likely belongs to this device
  isLikelyThisDevice(token) {
    const deviceType = this.getDeviceType();
    const tokenName = (token.device_name || '').toLowerCase();
    
    // Check if device name matches our type
    if (deviceType === 'android' && tokenName.includes('android')) return true;
    if (deviceType === 'windows' && tokenName.includes('windows')) return true;
    if (deviceType === 'mac' && tokenName.includes('mac')) return true;
    if (deviceType === 'ios' && (tokenName.includes('ios') || tokenName.includes('iphone') || tokenName.includes('ipad'))) return true;
    
    // Check if it's the only token of this type (likely this device)
    return false;
  }

  scheduleRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // Mobile devices: refresh every 5 minutes
    // Desktop devices: refresh every 15 minutes
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const refreshInterval = isMobile ? 5 * 60 * 1000 : 15 * 60 * 1000;

    this.refreshTimer = setTimeout(async () => {
      if (this.isRunning) {
        console.log(`⏰ Scheduled refresh for ${this.getDeviceType()} device...`);
        await this.refreshThisDeviceToken();
        this.scheduleRefresh();
      }
    }, refreshInterval);

    console.log(`⏰ Next refresh in ${refreshInterval / 60000} minutes (${isMobile ? 'mobile' : 'desktop'} schedule)`);
  }

  async waitForServices() {
    // Wait for Supabase
    for (let i = 0; i < 20; i++) {
      if (window.supabase) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (!window.supabase) throw new Error('Supabase not loaded');
  }

  stop() {
    console.log('🛑 Stopping smart token management');
    this.isRunning = false;
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  // Manual refresh for testing
  async forceRefresh() {
    console.log('🔄 Force refreshing this device token...');
    return await this.refreshThisDeviceToken();
  }
}

// Create global manager
window.smartTokenManager = new SmartTokenManager();

// Create device-aware UI
function createSmartTokenUI() {
  const existing = document.getElementById('smart-token-fix');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'smart-token-fix';
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 10000;
    background: #9b59b6;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    border: none;
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 300px;
  `;
  
  const deviceType = window.smartTokenManager.getDeviceType();
  container.textContent = `🧠 Smart Fix (${deviceType})`;

  container.onclick = async () => {
    container.textContent = '🔄 Fixing...';
    container.style.background = '#f39c12';

    try {
      const result = await window.smartTokenManager.refreshThisDeviceToken();
      
      if (result.success) {
        container.textContent = `✅ Fixed! (${result.totalDevices} total)`;
        container.style.background = '#27ae60';
        
        // Start auto-refresh
        window.smartTokenManager.start();
        
        setTimeout(() => {
          container.textContent = `🧠 Auto-refresh (${deviceType})`;
          container.style.fontSize = '12px';
        }, 3000);
      } else {
        container.textContent = '❌ Failed';
        container.style.background = '#e74c3c';
        
        setTimeout(() => {
          container.textContent = `🧠 Smart Fix (${deviceType})`;
        }, 3000);
      }
    } catch (error) {
      container.textContent = '❌ Error';
      container.style.background = '#e74c3c';
      
      setTimeout(() => {
        container.textContent = `🧠 Smart Fix (${deviceType})`;
      }, 3000);
    }
  };

  document.body.appendChild(container);
}

// Show UI
createSmartTokenUI();

console.log('🧠 Smart token manager ready!');

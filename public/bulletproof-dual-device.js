// Bulletproof dual-device notification system
console.log('🛡️ Bulletproof Dual-Device Manager loaded');

class BulletproofDualDeviceManager {
  constructor() {
    this.isActive = false;
    this.mobileRefreshTimer = null;
    this.desktopRefreshTimer = null;
    this.lastMobileRefresh = null;
    this.lastDesktopRefresh = null;
    this.deviceType = this.getDeviceType();
  }

  async activate() {
    if (this.isActive) return;
    
    console.log('🛡️ Activating bulletproof dual-device management...');
    this.isActive = true;

    // Immediate registration for this device
    await this.ensureThisDeviceRegistered();

    // Start aggressive monitoring
    this.startAggressiveMonitoring();

    console.log('🛡️ Bulletproof dual-device management active');
  }

  async ensureThisDeviceRegistered() {
    try {
      console.log(`🔧 Ensuring ${this.deviceType} device is registered...`);

      await this.waitForServices();

      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Always refresh this device's token to ensure it's valid
      await this.refreshThisDeviceOnly(user.id);

      console.log(`✅ ${this.deviceType} device registration ensured`);

    } catch (error) {
      console.error(`❌ Failed to ensure ${this.deviceType} device registration:`, error);
    }
  }

  async refreshThisDeviceOnly(userId) {
    try {
      console.log(`🔄 Refreshing ONLY ${this.deviceType} device...`);

      // Get current device info
      const deviceName = this.getDeviceName();
      
      // Get all current tokens to preserve other devices
      const { data: allTokens } = await window.supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

      console.log(`📱 Found ${allTokens?.length || 0} total tokens before refresh`);

      // Identify and remove ONLY this device's tokens
      if (allTokens && allTokens.length > 0) {
        const thisDeviceTokens = allTokens.filter(token => 
          this.isThisDeviceToken(token)
        );

        const otherDeviceTokens = allTokens.filter(token => 
          !this.isThisDeviceToken(token)
        );

        console.log(`🔍 This device tokens: ${thisDeviceTokens.length}, Other device tokens: ${otherDeviceTokens.length}`);

        // Only remove this device's tokens
        if (thisDeviceTokens.length > 0) {
          const tokenIds = thisDeviceTokens.map(t => t.id);
          await window.supabase
            .from('push_subscriptions')
            .delete()
            .in('id', tokenIds);
          
          console.log(`🗑️ Removed ${thisDeviceTokens.length} old tokens for ${this.deviceType}`);
        }

        // Log preserved tokens
        if (otherDeviceTokens.length > 0) {
          console.log(`✅ Preserved ${otherDeviceTokens.length} tokens for other devices:`);
          otherDeviceTokens.forEach(token => {
            console.log(`  - ${token.device_name} (...${token.endpoint.slice(-20)})`);
          });
        }
      }

      // Clear browser subscription for this device
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          await existingSub.unsubscribe();
          console.log(`🗑️ Cleared ${this.deviceType} browser subscription`);
        }
      }

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create fresh subscription for this device
      console.log(`🔄 Creating fresh ${this.deviceType} subscription...`);
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'BJPVlwpCxnv6hdAsbgspbI1xcE7_LwhJvDV2ibZ4alQ38WSzFzN6xf-QyYN2FUOP-miBMRTitIdVPSGb1mjYWZU'
      });

      // Save new subscription
      const subscriptionData = {
        user_id: userId,
        endpoint: newSubscription.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(newSubscription.getKey('p256dh')))),
        auth: btoa(String.fromCharCode(...new Uint8Array(newSubscription.getKey('auth')))),
        device_name: deviceName,
        created_at: new Date().toISOString()
      };

      const { error: saveError } = await window.supabase
        .from('push_subscriptions')
        .insert(subscriptionData);

      if (saveError) throw new Error(`Save failed: ${saveError.message}`);

      // Update notification service
      if (window.notificationService) {
        window.notificationService.currentSubscription = newSubscription;
        window.notificationService.isSubscribed = true;
      }

      // Verify final state
      const { data: finalTokens } = await window.supabase
        .from('push_subscriptions')
        .select('device_name, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      console.log(`✅ ${this.deviceType} refresh complete! Total devices: ${finalTokens?.length || 0}`);
      finalTokens?.forEach((token, i) => {
        console.log(`  Device ${i + 1}: ${token.device_name} (${new Date(token.created_at).toLocaleTimeString()})`);
      });

      // Update last refresh time
      if (this.deviceType === 'android' || this.deviceType === 'ios') {
        this.lastMobileRefresh = Date.now();
      } else {
        this.lastDesktopRefresh = Date.now();
      }

      return { success: true, totalDevices: finalTokens?.length || 0 };

    } catch (error) {
      console.error(`❌ ${this.deviceType} refresh failed:`, error);
      return { success: false, error: error.message };
    }
  }

  isThisDeviceToken(token) {
    const tokenName = (token.device_name || '').toLowerCase();
    const deviceType = this.deviceType;

    // Match by device type
    if (deviceType === 'android' && (tokenName.includes('android') || tokenName.includes('mobile'))) return true;
    if (deviceType === 'ios' && (tokenName.includes('ios') || tokenName.includes('iphone') || tokenName.includes('ipad'))) return true;
    if (deviceType === 'windows' && tokenName.includes('windows')) return true;
    if (deviceType === 'mac' && tokenName.includes('mac')) return true;
    if (deviceType === 'linux' && tokenName.includes('linux')) return true;

    return false;
  }

  startAggressiveMonitoring() {
    // Mobile devices: refresh every 2 minutes
    // Desktop devices: refresh every 10 minutes
    const isMobile = this.deviceType === 'android' || this.deviceType === 'ios';
    const refreshInterval = isMobile ? 2 * 60 * 1000 : 10 * 60 * 1000;

    console.log(`⏰ Starting ${isMobile ? 'mobile' : 'desktop'} refresh every ${refreshInterval / 60000} minutes`);

    const refreshTimer = setInterval(async () => {
      if (this.isActive) {
        console.log(`⏰ Scheduled ${this.deviceType} refresh...`);
        const { data: { user } } = await window.supabase.auth.getUser();
        if (user) {
          await this.refreshThisDeviceOnly(user.id);
        }
      }
    }, refreshInterval);

    // Store timer reference
    if (isMobile) {
      this.mobileRefreshTimer = refreshTimer;
    } else {
      this.desktopRefreshTimer = refreshTimer;
    }

    // Also refresh on visibility/focus changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.scheduleImediateRefresh();
      }
    });

    window.addEventListener('focus', () => {
      this.scheduleImediateRefresh();
    });
  }

  async scheduleImediateRefresh() {
    const now = Date.now();
    const lastRefresh = this.deviceType === 'android' || this.deviceType === 'ios' 
      ? this.lastMobileRefresh 
      : this.lastDesktopRefresh;

    // Only refresh if it's been more than 30 seconds since last refresh
    if (!lastRefresh || (now - lastRefresh) > 30000) {
      console.log(`👁️ ${this.deviceType} became active, refreshing...`);
      setTimeout(async () => {
        const { data: { user } } = await window.supabase.auth.getUser();
        if (user) {
          await this.refreshThisDeviceOnly(user.id);
        }
      }, 1000);
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
    const type = this.deviceType;
    const timestamp = new Date().toLocaleTimeString();
    
    switch (type) {
      case 'android': return `Android Bulletproof (${timestamp})`;
      case 'ios': return `iOS Bulletproof (${timestamp})`;
      case 'windows': return `Windows Bulletproof (${timestamp})`;
      case 'mac': return `Mac Bulletproof (${timestamp})`;
      case 'linux': return `Linux Bulletproof (${timestamp})`;
      default: return `Bulletproof Device (${timestamp})`;
    }
  }

  async waitForServices() {
    for (let i = 0; i < 20; i++) {
      if (window.supabase) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (!window.supabase) throw new Error('Supabase not loaded');
  }

  stop() {
    console.log('🛑 Stopping bulletproof dual-device management');
    this.isActive = false;
    if (this.mobileRefreshTimer) clearInterval(this.mobileRefreshTimer);
    if (this.desktopRefreshTimer) clearInterval(this.desktopRefreshTimer);
  }

  // Manual refresh for immediate use
  async forceRefresh() {
    console.log(`🔄 Force refreshing ${this.deviceType} device...`);
    const { data: { user } } = await window.supabase.auth.getUser();
    if (user) {
      return await this.refreshThisDeviceOnly(user.id);
    }
    return { success: false, error: 'Not authenticated' };
  }
}

// Create global manager
window.bulletproofManager = new BulletproofDualDeviceManager();

// Auto-activate after short delay
setTimeout(() => {
  window.bulletproofManager.activate();
}, 3000);

// Create UI
function createBulletproofUI() {
  const existing = document.getElementById('bulletproof-fix');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'bulletproof-fix';
  container.style.cssText = `
    position: fixed;
    top: 20px;
    left: 20px;
    z-index: 10000;
    background: #2c3e50;
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
  
  const deviceType = window.bulletproofManager.deviceType;
  container.textContent = `🛡️ Bulletproof (${deviceType})`;

  container.onclick = async () => {
    container.textContent = '🔄 Refreshing...';
    container.style.background = '#f39c12';

    try {
      const result = await window.bulletproofManager.forceRefresh();
      
      if (result.success) {
        container.textContent = `✅ Active (${result.totalDevices} total)`;
        container.style.background = '#27ae60';
        
        setTimeout(() => {
          container.textContent = `🛡️ Auto-refresh (${deviceType})`;
          container.style.fontSize = '12px';
        }, 3000);
      } else {
        container.textContent = '❌ Failed';
        container.style.background = '#e74c3c';
        
        setTimeout(() => {
          container.textContent = `🛡️ Bulletproof (${deviceType})`;
        }, 3000);
      }
    } catch (error) {
      container.textContent = '❌ Error';
      container.style.background = '#e74c3c';
    }
  };

  document.body.appendChild(container);
}

createBulletproofUI();

console.log('🛡️ Bulletproof dual-device manager ready! Preserves other devices while aggressively maintaining this one.');

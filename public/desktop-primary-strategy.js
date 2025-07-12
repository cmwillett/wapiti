// Desktop-primary notification strategy with mobile fallback
console.log('🖥️ Desktop-Primary Notification Strategy loaded');

class DesktopPrimaryNotificationManager {
  constructor() {
    this.isDesktop = this.isDesktopDevice();
    this.isMobile = !this.isDesktop;
    this.strategy = this.isDesktop ? 'maintain-stable' : 'aggressive-refresh';
  }

  isDesktopDevice() {
    const userAgent = navigator.userAgent;
    return /Windows|Mac|Linux/i.test(userAgent) && !/Android|iPhone|iPad|iPod/i.test(userAgent);
  }

  async activate() {
    console.log(`🚀 Activating ${this.strategy} strategy for ${this.isDesktop ? 'desktop' : 'mobile'} device`);
    
    if (this.isDesktop) {
      await this.activateDesktopStrategy();
    } else {
      await this.activateMobileStrategy();
    }
  }

  // Desktop strategy: Maintain one stable, long-lasting token
  async activateDesktopStrategy() {
    console.log('🖥️ Activating desktop stability strategy...');
    
    try {
      await this.waitForServices();
      
      // Only register desktop if not already registered
      const isRegistered = await this.checkDesktopRegistration();
      if (!isRegistered) {
        console.log('🔧 Registering desktop device...');
        await this.registerDesktopDevice();
      } else {
        console.log('✅ Desktop already registered');
      }
      
      // Set up gentle monitoring (every 30 minutes)
      this.setupDesktopMonitoring();
      
    } catch (error) {
      console.error('❌ Desktop strategy failed:', error);
    }
  }

  // Mobile strategy: Accept frequent failures, refresh aggressively  
  async activateMobileStrategy() {
    console.log('📱 Activating mobile aggressive refresh strategy...');
    
    try {
      await this.waitForServices();
      
      // Always refresh mobile token (they expire quickly anyway)
      await this.refreshMobileToken();
      
      // Set up aggressive monitoring (every 2 minutes)
      this.setupMobileMonitoring();
      
      // Monitor app lifecycle changes
      this.setupMobileLifecycleHandlers();
      
    } catch (error) {
      console.error('❌ Mobile strategy failed:', error);
    }
  }

  async checkDesktopRegistration() {
    try {
      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) return false;

      const { data: tokens } = await window.supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id);

      // Check if we have a desktop token
      const desktopTokens = tokens?.filter(token => {
        const name = (token.device_name || '').toLowerCase();
        return name.includes('windows') || name.includes('mac') || name.includes('linux') || name.includes('desktop');
      }) || [];

      console.log(`🖥️ Found ${desktopTokens.length} desktop tokens`);
      return desktopTokens.length > 0;

    } catch (error) {
      console.error('❌ Desktop registration check failed:', error);
      return false;
    }
  }

  async registerDesktopDevice() {
    try {
      console.log('🖥️ Registering stable desktop device...');

      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create subscription
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) throw new Error('No service worker');

      // Clear any existing subscription first
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        await existingSub.unsubscribe();
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'BJPVlwpCxnv6hdAsbgspbI1xcE7_LwhJvDV2ibZ4alQ38WSzFzN6xf-QyYN2FUOP-miBMRTitIdVPSGb1mjYWZU'
      });

      // Save with stable desktop naming
      const subscriptionData = {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
        auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')))),
        device_name: this.getStableDesktopName(),
        created_at: new Date().toISOString()
      };

      const { error } = await window.supabase
        .from('push_subscriptions')
        .insert(subscriptionData);

      if (error) throw error;

      console.log('✅ Desktop device registered successfully');

      // Update notification service
      if (window.notificationService) {
        window.notificationService.currentSubscription = subscription;
        window.notificationService.isSubscribed = true;
      }

    } catch (error) {
      console.error('❌ Desktop registration failed:', error);
      throw error;
    }
  }

  async refreshMobileToken() {
    try {
      console.log('📱 Refreshing mobile token (aggressive strategy)...');

      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Remove ALL existing mobile tokens for this user (mobile tokens are unreliable anyway)
      console.log('🧹 Clearing all mobile tokens...');
      const { data: allTokens } = await window.supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id);

      if (allTokens) {
        const mobileTokens = allTokens.filter(token => {
          const name = (token.device_name || '').toLowerCase();
          return name.includes('android') || name.includes('ios') || name.includes('mobile') || name.includes('iphone');
        });

        if (mobileTokens.length > 0) {
          const tokenIds = mobileTokens.map(t => t.id);
          await window.supabase
            .from('push_subscriptions')
            .delete()
            .in('id', tokenIds);
          console.log(`🗑️ Removed ${mobileTokens.length} old mobile tokens`);
        }
      }

      // Create fresh mobile subscription
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) throw new Error('No service worker');

      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        await existingSub.unsubscribe();
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'BJPVlwpCxnv6hdAsbgspbI1xcE7_LwhJvDV2ibZ4alQ38WSzFzN6xf-QyYN2FUOP-miBMRTitIdVPSGb1mjYWZU'
      });

      // Save new mobile token
      const subscriptionData = {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
        auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')))),
        device_name: this.getAggressiveMobileName(),
        created_at: new Date().toISOString()
      };

      const { error } = await window.supabase
        .from('push_subscriptions')
        .insert(subscriptionData);

      if (error) throw error;

      console.log('✅ Mobile token refreshed');

      // Update notification service
      if (window.notificationService) {
        window.notificationService.currentSubscription = subscription;
        window.notificationService.isSubscribed = true;
      }

    } catch (error) {
      console.error('❌ Mobile token refresh failed:', error);
      throw error;
    }
  }

  setupDesktopMonitoring() {
    console.log('🖥️ Setting up gentle desktop monitoring (30 min intervals)...');
    
    // Check desktop health every 30 minutes
    setInterval(async () => {
      console.log('🔍 Desktop health check...');
      const isRegistered = await this.checkDesktopRegistration();
      if (!isRegistered) {
        console.log('⚠️ Desktop registration lost, re-registering...');
        await this.registerDesktopDevice();
      }
    }, 30 * 60 * 1000);
  }

  setupMobileMonitoring() {
    console.log('📱 Setting up aggressive mobile monitoring (2 min intervals)...');
    
    // Refresh mobile token every 2 minutes
    setInterval(async () => {
      console.log('🔄 Aggressive mobile refresh...');
      await this.refreshMobileToken();
    }, 2 * 60 * 1000);
  }

  setupMobileLifecycleHandlers() {
    // Refresh on visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('👁️ Mobile app visible, refreshing token...');
        setTimeout(() => this.refreshMobileToken(), 1000);
      }
    });

    // Refresh on focus
    window.addEventListener('focus', () => {
      console.log('🎯 Mobile app focused, refreshing token...');
      setTimeout(() => this.refreshMobileToken(), 500);
    });
  }

  getStableDesktopName() {
    const platform = navigator.platform || 'Desktop';
    return `${platform} Desktop (Stable)`;
  }

  getAggressiveMobileName() {
    const userAgent = navigator.userAgent;
    const timestamp = new Date().toLocaleTimeString();
    
    if (/Android/i.test(userAgent)) {
      return `Android Mobile (${timestamp})`;
    } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
      return `iOS Mobile (${timestamp})`;
    } else {
      return `Mobile Device (${timestamp})`;
    }
  }

  async waitForServices() {
    for (let i = 0; i < 20; i++) {
      if (window.supabase) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (!window.supabase) throw new Error('Supabase not loaded');
  }

  // Manual trigger for testing
  async manualRefresh() {
    if (this.isDesktop) {
      await this.registerDesktopDevice();
    } else {
      await this.refreshMobileToken();
    }
  }
}

// Create global manager
window.desktopPrimaryManager = new DesktopPrimaryNotificationManager();

// Auto-activate after services load
setTimeout(() => {
  window.desktopPrimaryManager.activate();
}, 3000);

// Create strategy-specific UI
function createDesktopPrimaryUI() {
  const existing = document.getElementById('desktop-primary-manager');
  if (existing) existing.remove();

  const manager = window.desktopPrimaryManager;
  const container = document.createElement('div');
  container.id = 'desktop-primary-manager';
  container.style.cssText = `
    position: fixed;
    top: 20px;
    left: 20px;
    z-index: 10000;
    background: ${manager.isDesktop ? '#3498db' : '#e67e22'};
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
  
  container.textContent = manager.isDesktop ? '🖥️ Stable Desktop' : '📱 Aggressive Mobile';

  container.onclick = async () => {
    const originalText = container.textContent;
    container.textContent = '🔄 Refreshing...';
    container.style.background = '#f39c12';

    try {
      await manager.manualRefresh();
      container.textContent = '✅ Refreshed!';
      container.style.background = '#27ae60';
      
      setTimeout(() => {
        container.textContent = originalText;
        container.style.background = manager.isDesktop ? '#3498db' : '#e67e22';
      }, 3000);
    } catch (error) {
      container.textContent = '❌ Failed';
      container.style.background = '#e74c3c';
      
      setTimeout(() => {
        container.textContent = originalText;
        container.style.background = manager.isDesktop ? '#3498db' : '#e67e22';
      }, 3000);
    }
  };

  document.body.appendChild(container);
}

createDesktopPrimaryUI();

console.log(`🚀 Desktop-primary strategy loaded for ${window.desktopPrimaryManager.isDesktop ? 'desktop' : 'mobile'} device`);

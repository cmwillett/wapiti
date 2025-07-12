// Aggressive mobile token management for persistent mobile notifications
console.log('📱 Aggressive Mobile Token Manager loaded');

class AggressiveMobileTokenManager {
  constructor() {
    this.isRunning = false;
    this.refreshTimer = null;
    this.lastRefresh = null;
    this.consecutiveFailures = 0;
    this.maxFailures = 5;
  }

  async start() {
    if (this.isRunning) {
      console.log('📱 Token manager already running');
      return;
    }

    console.log('📱 Starting aggressive mobile token management...');
    this.isRunning = true;

    // Immediate cleanup and registration
    await this.fullTokenRefresh();

    // Set up aggressive refresh schedule
    this.scheduleNextRefresh();

    // Set up event listeners
    this.setupEventListeners();

    console.log('📱 Aggressive token management active');
  }

  async fullTokenRefresh() {
    try {
      console.log('🔄 Performing full token refresh...');

      // Wait for services
      await this.waitForServices();

      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Step 1: Clean up ALL tokens for this user
      console.log('🧹 Cleaning up all existing tokens...');
      await window.supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);

      // Step 2: Clear browser subscription
      console.log('🗑️ Clearing browser subscription...');
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          await existingSub.unsubscribe();
        }
      }

      // Step 3: Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 4: Create fresh subscription
      console.log('🔄 Creating fresh subscription...');
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'BJPVlwpCxnv6hdAsbgspbI1xcE7_LwhJvDV2ibZ4alQ38WSzFzN6xf-QyYN2FUOP-miBMRTitIdVPSGb1mjYWZU'
      });

      // Step 5: Save with mobile-optimized settings
      const subscriptionData = {
        user_id: user.id,
        endpoint: newSubscription.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(newSubscription.getKey('p256dh')))),
        auth: btoa(String.fromCharCode(...new Uint8Array(newSubscription.getKey('auth')))),
        device_name: this.getMobileDeviceName(),
        created_at: new Date().toISOString()
      };

      const { error: saveError } = await window.supabase
        .from('push_subscriptions')
        .insert(subscriptionData);

      if (saveError) throw new Error(`Save failed: ${saveError.message}`);

      // Step 6: Update notification service
      if (window.notificationService) {
        window.notificationService.currentSubscription = newSubscription;
        window.notificationService.isSubscribed = true;
      }

      this.lastRefresh = Date.now();
      this.consecutiveFailures = 0;
      console.log('✅ Full token refresh completed successfully');

      return { success: true };

    } catch (error) {
      this.consecutiveFailures++;
      console.error(`❌ Token refresh failed (${this.consecutiveFailures}/${this.maxFailures}):`, error);
      
      if (this.consecutiveFailures >= this.maxFailures) {
        console.error('❌ Too many consecutive failures, stopping token manager');
        this.stop();
      }

      return { success: false, error: error.message };
    }
  }

  getMobileDeviceName() {
    const userAgent = navigator.userAgent;
    if (/Android/i.test(userAgent)) {
      return `Android Mobile (${new Date().toLocaleTimeString()})`;
    } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
      return `iOS Mobile (${new Date().toLocaleTimeString()})`;
    } else {
      return `Mobile Device (${new Date().toLocaleTimeString()})`;
    }
  }

  scheduleNextRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // Refresh every 3 minutes for mobile devices
    const refreshInterval = 3 * 60 * 1000;

    this.refreshTimer = setTimeout(async () => {
      if (this.isRunning) {
        console.log('⏰ Scheduled mobile token refresh...');
        await this.fullTokenRefresh();
        this.scheduleNextRefresh();
      }
    }, refreshInterval);

    console.log(`⏰ Next mobile token refresh in ${refreshInterval / 60000} minutes`);
  }

  setupEventListeners() {
    // Refresh when app becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isRunning) {
        const timeSinceRefresh = Date.now() - (this.lastRefresh || 0);
        if (timeSinceRefresh > 60000) { // Only if it's been more than 1 minute
          console.log('👁️ App became visible, refreshing token...');
          setTimeout(() => this.fullTokenRefresh(), 1000);
        }
      }
    });

    // Refresh on focus
    window.addEventListener('focus', () => {
      if (this.isRunning) {
        const timeSinceRefresh = Date.now() - (this.lastRefresh || 0);
        if (timeSinceRefresh > 30000) { // Only if it's been more than 30 seconds
          console.log('🎯 Window focused, refreshing token...');
          setTimeout(() => this.fullTokenRefresh(), 500);
        }
      }
    });

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'PUSH_SUBSCRIPTION_CHANGE') {
          console.log('📡 Push subscription changed, refreshing...');
          this.fullTokenRefresh();
        }
      });
    }
  }

  async waitForServices() {
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
    // Don't require notification service, we'll manage subscriptions ourselves
  }

  stop() {
    console.log('🛑 Stopping aggressive mobile token management');
    this.isRunning = false;
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  // Manual refresh for testing
  async forceRefresh() {
    console.log('🔄 Force refreshing mobile token...');
    return await this.fullTokenRefresh();
  }
}

// Create global manager
window.aggressiveMobileTokenManager = new AggressiveMobileTokenManager();

// Auto-start if on mobile
if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
  console.log('📱 Mobile device detected, auto-starting aggressive token management...');
  
  // Start after a brief delay to let everything load
  setTimeout(() => {
    window.aggressiveMobileTokenManager.start();
  }, 3000);
}

// Create enhanced UI
function createAggressiveMobileUI() {
  const existing = document.getElementById('aggressive-mobile-fix');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'aggressive-mobile-fix';
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
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
    max-width: 300px;
  `;
  container.textContent = '🚀 Aggressive Fix';

  container.onclick = async () => {
    container.textContent = '🔄 Starting...';
    container.style.background = '#f39c12';

    try {
      await window.aggressiveMobileTokenManager.start();
      container.textContent = '🚀 Running!';
      container.style.background = '#27ae60';
      
      // Show status
      setTimeout(() => {
        container.textContent = '🔄 Auto-Refreshing';
        container.style.fontSize = '12px';
      }, 2000);
    } catch (error) {
      container.textContent = '❌ Failed';
      container.style.background = '#e74c3c';
      
      setTimeout(() => {
        container.textContent = '🚀 Aggressive Fix';
      }, 3000);
    }
  };

  document.body.appendChild(container);
}

// Show UI on mobile
if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
  createAggressiveMobileUI();
}

console.log('📱 Aggressive mobile token manager ready!');

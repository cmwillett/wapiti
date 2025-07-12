// Mobile Push Notification Diagnostic Tool
console.log('📱 Mobile diagnostic tool loaded');

function createMobileDiagnostic() {
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    right: 20px;
    z-index: 10001;
    background: #1a1a1a;
    color: #00ff00;
    padding: 16px;
    border-radius: 8px;
    font-size: 12px;
    font-family: 'Courier New', monospace;
    max-height: 300px;
    overflow-y: auto;
    border: 2px solid #333;
  `;
  
  container.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 12px; color: #ffff00;">
      🔍 Mobile Push Diagnostic Console
    </div>
    <button id="run-diagnostic" style="
      background: #ff6b35; 
      color: white; 
      border: none; 
      padding: 8px 12px; 
      border-radius: 4px; 
      cursor: pointer; 
      margin: 4px; 
      font-size: 12px;
    ">🧪 Run Full Diagnostic</button>
    <button id="test-permissions" style="
      background: #4ecdc4; 
      color: white; 
      border: none; 
      padding: 8px 12px; 
      border-radius: 4px; 
      cursor: pointer; 
      margin: 4px; 
      font-size: 12px;
    ">🔐 Test Permissions</button>
    <div id="diagnostic-output" style="
      margin-top: 12px; 
      padding: 8px; 
      background: #000; 
      border-radius: 4px; 
      font-size: 11px;
      min-height: 100px;
      white-space: pre-wrap;
      border: 1px solid #333;
    ">Ready to diagnose mobile push issues...</div>
  `;

  function log(message, color = '#00ff00') {
    const output = container.querySelector('#diagnostic-output');
    const timestamp = new Date().toLocaleTimeString();
    output.innerHTML += `<span style="color: ${color}">[${timestamp}] ${message}</span>\n`;
    output.scrollTop = output.scrollHeight;
    console.log(`📱 ${message}`);
  }

  // Test permissions
  container.querySelector('#test-permissions').onclick = async () => {
    log('🔐 Testing notification permissions...', '#4ecdc4');
    
    try {
      // Check current permission
      log(`Current permission: ${Notification.permission}`, '#ffff00');
      
      if (Notification.permission === 'default') {
        log('Requesting notification permission...', '#ff6b35');
        const permission = await Notification.requestPermission();
        log(`Permission result: ${permission}`, permission === 'granted' ? '#00ff00' : '#ff0000');
      }
      
      // Check service worker support
      if ('serviceWorker' in navigator) {
        log('✅ Service Worker supported', '#00ff00');
        
        const registration = await navigator.serviceWorker.ready;
        log(`✅ Service Worker registered: ${registration.scope}`, '#00ff00');
        
        if ('PushManager' in window) {
          log('✅ Push Manager supported', '#00ff00');
        } else {
          log('❌ Push Manager NOT supported', '#ff0000');
        }
      } else {
        log('❌ Service Worker NOT supported', '#ff0000');
      }
      
    } catch (error) {
      log(`❌ Permission test failed: ${error.message}`, '#ff0000');
    }
  };

  // Full diagnostic
  container.querySelector('#run-diagnostic').onclick = async () => {
    log('🧪 Starting full mobile diagnostic...', '#ff6b35');
    log('='.repeat(50), '#333');
    
    try {
      // User agent info
      log(`User Agent: ${navigator.userAgent}`, '#ffff00');
      
      // Check if mobile
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      log(`Detected as mobile: ${isMobile}`, isMobile ? '#00ff00' : '#ff6b35');
      
      // Check authentication
      const { data: { user } } = await window.supabase.auth.getUser();
      log(`User authenticated: ${!!user}`, user ? '#00ff00' : '#ff0000');
      
      if (!user) {
        log('❌ Not authenticated - stopping diagnostic', '#ff0000');
        return;
      }
      
      // Test subscription creation
      log('📡 Testing push subscription creation...', '#4ecdc4');
      
      const registration = await navigator.serviceWorker.ready;
      log('✅ Service worker ready', '#00ff00');
      
      // Try to create subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'BJPVlwpCxnv6hdAsbgspbI1xcE7_LwhJvDV2ibZ4alQ38WSzFzN6xf-QyYN2FUOP-miBMRTitIdVPSGb1mjYWZU'
      });
      
      log('✅ Push subscription created successfully!', '#00ff00');
      log(`Endpoint: ${subscription.endpoint.substring(0, 50)}...`, '#ffff00');
      
      // Test database save
      log('💾 Testing database save...', '#4ecdc4');
      
      const { error } = await window.supabase
        .from('push_subscriptions')
        .insert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')))),
          auth: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth')))),
          device_name: `Mobile Diagnostic (${new Date().toLocaleTimeString()})`
        });
        
      if (error) {
        log(`❌ Database save failed: ${error.message}`, '#ff0000');
      } else {
        log('✅ Database save successful!', '#00ff00');
      }
      
      // Check current registrations
      const { data: tokens } = await window.supabase
        .from('push_subscriptions')
        .select('device_name, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      log(`📊 Current registrations: ${tokens?.length || 0}`, '#ffff00');
      tokens?.forEach(token => {
        log(`  - ${token.device_name}`, '#cccccc');
      });
      
      log('='.repeat(50), '#333');
      log('✅ Mobile diagnostic complete!', '#00ff00');
      
    } catch (error) {
      log(`❌ Diagnostic failed: ${error.message}`, '#ff0000');
      log(`Stack: ${error.stack}`, '#666');
    }
  };

  document.body.appendChild(container);
}

// Only show on mobile
const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
if (isMobile) {
  createMobileDiagnostic();
  console.log('📱 Mobile diagnostic UI created');
}

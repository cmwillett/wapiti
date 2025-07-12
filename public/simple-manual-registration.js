// Simple manual device registration - no automatic scripts
console.log('🔧 Simple manual registration loaded');

function createSimpleRegistrationUI() {
  // Create a simple, clean UI
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    top: 20px;
    left: 20px;
    z-index: 10000;
    background: white;
    color: black;
    padding: 16px;
    border-radius: 8px;
    font-size: 14px;
    font-family: system-ui, -apple-system, sans-serif;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    border: 2px solid #ddd;
    max-width: 300px;
  `;
  
  const deviceType = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
    ? 'Mobile' 
    : 'Desktop';
  
  container.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 12px;">
      📱 ${deviceType} Device Registration
    </div>
    <button id="wipe-all" style="
      background: #e74c3c; 
      color: white; 
      border: none; 
      padding: 8px 12px; 
      border-radius: 4px; 
      cursor: pointer; 
      margin: 4px; 
      font-size: 12px;
    ">🗑️ Wipe All</button>
    <button id="register-this" style="
      background: #27ae60; 
      color: white; 
      border: none; 
      padding: 8px 12px; 
      border-radius: 4px; 
      cursor: pointer; 
      margin: 4px; 
      font-size: 12px;
    ">✅ Register This</button>
    <button id="check-devices" style="
      background: #3498db; 
      color: white; 
      border: none; 
      padding: 8px 12px; 
      border-radius: 4px; 
      cursor: pointer; 
      margin: 4px; 
      font-size: 12px;
    ">📊 Check Count</button>
    <div id="status" style="
      margin-top: 12px; 
      padding: 8px; 
      background: #f8f9fa; 
      border-radius: 4px; 
      font-size: 12px;
      min-height: 20px;
    ">Ready</div>
  `;

  function updateStatus(message, color = '#333') {
    const status = container.querySelector('#status');
    status.textContent = message;
    status.style.color = color;
  }

  // Wipe all devices
  container.querySelector('#wipe-all').onclick = async () => {
    try {
      updateStatus('Wiping all devices...', '#e74c3c');
      
      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) {
        updateStatus('❌ Not logged in', '#e74c3c');
        return;
      }

      // Delete all
      await window.supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);

      updateStatus('✅ All devices wiped', '#27ae60');
    } catch (error) {
      updateStatus(`❌ Error: ${error.message}`, '#e74c3c');
    }
  };

  // Register this device
  container.querySelector('#register-this').onclick = async () => {
    try {
      updateStatus('Registering this device...', '#f39c12');
      
      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) {
        updateStatus('❌ Not logged in', '#e74c3c');
        return;
      }

      // Unsubscribe existing
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        if (existing) await existing.unsubscribe();

        // Create new
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: 'BJPVlwpCxnv6hdAsbgspbI1xcE7_LwhJvDV2ibZ4alQ38WSzFzN6xf-QyYN2FUOP-miBMRTitIdVPSGb1mjYWZU'
        });

// Save (upsert to avoid duplicate key errors)
await window.supabase
  .from('push_subscriptions')
  .upsert({
    user_id: user.id,
    endpoint: subscription.endpoint,
    p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')))),
    auth: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth')))),
    device_name: `${deviceType} Manual (${new Date().toLocaleTimeString()})`
  }, { onConflict: ['user_id', 'endpoint'] });

        updateStatus(`✅ ${deviceType} registered`, '#27ae60');
      }
    } catch (error) {
      updateStatus(`❌ Error: ${error.message}`, '#e74c3c');
    }
  };

  // Check device count
  container.querySelector('#check-devices').onclick = async () => {
    try {
      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) {
        updateStatus('❌ Not logged in', '#e74c3c');
        return;
      }

      const { data: tokens } = await window.supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id);

      const count = tokens?.length || 0;
      if (count === 0) {
        updateStatus('📱 0 devices registered', '#e74c3c');
      } else if (count === 1) {
        updateStatus('📱 1 device registered', '#f39c12');
      } else if (count === 2) {
        updateStatus('📱 2 devices registered ✅', '#27ae60');
      } else {
        updateStatus(`📱 ${count} devices (too many!)`, '#e74c3c');
      }
    } catch (error) {
      updateStatus(`❌ Error: ${error.message}`, '#e74c3c');
    }
  };

  document.body.appendChild(container);
}

// Create the UI
createSimpleRegistrationUI();

console.log('🔧 Manual registration UI created');
console.log('📝 Instructions:');
console.log('1. Click "🗑️ Wipe All" on BOTH devices');
console.log('2. Click "✅ Register This" on desktop');
console.log('3. Click "✅ Register This" on mobile');
console.log('4. Click "📊 Check Count" should show 2 devices');
console.log('5. Test notifications');

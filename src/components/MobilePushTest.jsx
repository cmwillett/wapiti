import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function MobilePushTest({ onClose }) {
  const [status, setStatus] = useState({ message: 'Ready to test mobile push notifications', type: 'info' });
  const [log, setLog] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    initializeDeviceInfo();
  }, []);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setLog(prev => [...prev, logEntry]);
    console.log(message);
  };

  const setStatusMessage = (message, type = 'info') => {
    setStatus({ message, type });
  };

  const initializeDeviceInfo = () => {
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      online: navigator.onLine,
      serviceWorker: 'serviceWorker' in navigator,
      pushManager: 'PushManager' in window,
      notifications: 'Notification' in window,
      permission: 'Notification' in window ? Notification.permission : 'not supported'
    };
    
    setDeviceInfo(info);
    addLog(`Device initialized: ${JSON.stringify(info, null, 2)}`);
  };

  const requestNotificationPermission = async () => {
    try {
      setIsLoading(true);
      addLog('Requesting notification permission...');
      setStatusMessage('Requesting notification permission...', 'info');
      
      if (!('Notification' in window)) {
        throw new Error('This browser does not support notifications');
      }

      if (typeof window.notificationService !== 'undefined') {
        const result = await window.notificationService.requestPermission();
        addLog(`Permission result: ${result}`);
        setStatusMessage(`Permission: ${result}`, result === 'granted' ? 'success' : 'error');
        
        if (result === 'granted') {
          try {
            const subscription = await window.notificationService.subscribeToPush();
            addLog(`Push subscription successful: ${JSON.stringify(subscription, null, 2)}`);
            setStatusMessage('✅ Push notifications enabled!', 'success');
          } catch (subError) {
            addLog(`Push subscription failed: ${subError.message}`);
            setStatusMessage(`Push subscription failed: ${subError.message}`, 'error');
          }
        }
      } else {
        const permission = await Notification.requestPermission();
        addLog(`Permission result: ${permission}`);
        setStatusMessage(`Permission: ${permission}`, permission === 'granted' ? 'success' : 'error');
      }
      
      initializeDeviceInfo(); // Refresh device info
    } catch (error) {
      addLog(`Error requesting permission: ${error.message}`);
      setStatusMessage(`Error: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const checkRegisteredDevices = async () => {
    try {
      setIsLoading(true);
      addLog('Checking registered devices...');
      setStatusMessage('Checking registered devices...', 'info');

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Not authenticated. Please log in first.');
      }

      addLog(`Authenticated as user: ${user.id}`);

      const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id);

      if (subError) {
        throw new Error(`Database error: ${subError.message}`);
      }

      addLog(`Found ${subscriptions.length} registered device(s):`);
      subscriptions.forEach((sub, index) => {
        addLog(`  Device ${index + 1}: ${sub.device_name} (${sub.endpoint.substring(0, 50)}...)`);
      });

      setStatusMessage(`✅ Found ${subscriptions.length} registered device(s)`, 'success');
    } catch (error) {
      addLog(`Error checking devices: ${error.message}`);
      setStatusMessage(`Error: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const runMobileTest = async () => {
    try {
      setIsLoading(true);
      addLog('🧪 Starting mobile push notification test...');
      setStatusMessage('Creating test reminder...', 'info');

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Not authenticated. Please log in first.');
      }

      addLog(`✅ Authenticated as user: ${user.id}`);

      if (Notification.permission !== 'granted') {
        setStatusMessage('⚠️ Notification permission not granted. Click "Request Permission" first.', 'warning');
        setIsLoading(false);
        return;
      }

      // Create test reminder for 60 seconds from now
      const reminderTime = new Date(Date.now() + 60 * 1000);
      const testTaskText = `Mobile test: ${new Date().toLocaleTimeString()}`;

      addLog(`Creating test task: "${testTaskText}"`);
      addLog(`Reminder time: ${reminderTime.toISOString()}`);

      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          text: testTaskText,
          completed: false,
          reminder_time: reminderTime.toISOString(),
          reminder_sent: false,
          list_id: null
        })
        .select()
        .single();

      if (taskError) {
        throw new Error(`Failed to create task: ${taskError.message}`);
      }

      addLog(`✅ Test task created with ID: ${task.id}`);
      setStatusMessage('✅ Test reminder created! Close the app and wait for notification.', 'success');
      
      // Start countdown
      let seconds = 60;
      setCountdown(seconds);
      const countdownInterval = setInterval(() => {
        seconds--;
        if (seconds <= 0) {
          clearInterval(countdownInterval);
          setCountdown(null);
          setStatusMessage('⏰ Notification should arrive now! Check your notification area.', 'warning');
          return;
        }
        setCountdown(seconds);
      }, 1000);

    } catch (error) {
      addLog(`❌ Test failed: ${error.message}`);
      setStatusMessage(`Error: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusClass = () => {
    const baseClass = "p-4 rounded-lg mb-4 font-medium";
    switch (status.type) {
      case 'success': return `${baseClass} bg-green-100 text-green-800 border border-green-200`;
      case 'error': return `${baseClass} bg-red-100 text-red-800 border border-red-200`;
      case 'warning': return `${baseClass} bg-yellow-100 text-yellow-800 border border-yellow-200`;
      default: return `${baseClass} bg-blue-100 text-blue-800 border border-blue-200`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto relative border-2 border-green-500">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-red-600 text-2xl font-bold bg-gray-100 hover:bg-red-100 rounded-full w-8 h-8 flex items-center justify-center shadow-lg"
        >
          ×
        </button>

        <h2 className="text-2xl font-bold text-center mb-6">📱 Mobile Push Test</h2>

        <div className="bg-gray-50 p-3 rounded-lg mb-4 text-sm">
          <strong>Device Info:</strong><br />
          Platform: {deviceInfo.platform}<br />
          Online: {deviceInfo.online ? '✅' : '❌'}<br />
          Service Worker: {deviceInfo.serviceWorker ? '✅' : '❌'}<br />
          Push Manager: {deviceInfo.pushManager ? '✅' : '❌'}<br />
          Notifications: {deviceInfo.notifications ? '✅' : '❌'}<br />
          Permission: {deviceInfo.permission}
        </div>

        <div className={getStatusClass()}>
          {status.message}
        </div>

        {countdown && (
          <div className="text-center text-2xl font-bold text-blue-600 mb-4">
            ⏰ Notification in: {countdown}s
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={requestNotificationPermission}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            🔔 Request Notification Permission
          </button>

          <button
            onClick={checkRegisteredDevices}
            disabled={isLoading}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            📱 Check Registered Devices
          </button>

          <button
            onClick={runMobileTest}
            disabled={isLoading}
            className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            🧪 Test Mobile Push Notifications
          </button>
        </div>

        <div className="mt-4 p-3 bg-gray-100 rounded-lg text-sm">
          <strong>📋 Instructions:</strong><br />
          1. Click "Request Notification Permission" first<br />
          2. Click "Test Mobile Push Notifications"<br />
          3. <strong>Close this app</strong> or switch to another app<br />
          4. Wait for the notification (about 1 minute)<br />
          5. You should get a push notification even with the app closed!
        </div>

        {log.length > 0 && (
          <div className="mt-4">
            <strong className="block mb-2">Debug Log:</strong>
            <div className="bg-gray-800 text-green-400 p-3 rounded-lg max-h-40 overflow-y-auto font-mono text-xs">
              {log.map((entry, index) => (
                <div key={index}>{entry}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

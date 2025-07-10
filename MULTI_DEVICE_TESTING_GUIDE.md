# Multi-Device Notification Testing Guide

This guide will help you test push notifications across multiple devices to ensure the system works reliably for users with phones, tablets, desktops, etc.

## Testing Strategy

### Phase 1: Register Multiple Devices

1. **Desktop/Laptop (Chrome)**
   - Open https://cmwillett.github.io/wapiti/
   - Log in with your test account
   - Click "⚙️ Notification Settings"
   - Enable push notifications when prompted
   - Verify registration in console: `window.testMultiDeviceNotifications()`

2. **Mobile Phone (Chrome/Safari)**
   - Open same URL on your phone
   - Log in with the SAME account
   - Enable push notifications
   - Add to Home Screen (for PWA testing)
   - Test using the mobile test modal: "📱 Test Mobile Push Notifications"

3. **Tablet or Second Device**
   - Repeat the process on any additional devices
   - Use the same login credentials

### Phase 2: Verify Device Registration

Run this in any device's browser console:

```javascript
// Check how many devices are registered
const { data: { user } } = await supabase.auth.getUser();
const { data: subscriptions } = await supabase
  .from('push_subscriptions')
  .select('*')
  .eq('user_id', user.id);

console.log(`Found ${subscriptions.length} registered devices:`);
subscriptions.forEach((sub, i) => {
  console.log(`Device ${i+1}: ${sub.device_name} (${sub.created_at})`);
  console.log(`  Endpoint: ${sub.endpoint.substring(0, 50)}...`);
});
```

### Phase 3: Test Multi-Device Notifications

#### Option A: Use Built-in Test (Recommended)

1. On any device, open browser console and run:
```javascript
window.testMultiDeviceNotifications()
```

2. This will:
   - Create a test reminder for 1 minute from now
   - Show you how many devices are registered
   - Test the notification system end-to-end

3. **Important:** Close or background the app on ALL devices after running the test

4. Wait 1 minute and check that notifications appear on ALL registered devices

#### Option B: Manual Test with Real Reminder

1. On any device, create a task with a reminder:
   - Add a new task
   - Set reminder for 2-3 minutes from now
   - Save the task

2. Close the app on ALL devices

3. Wait for the reminder time and verify notifications arrive on all devices

### Phase 4: Verify Notification Delivery

#### Check Supabase Logs
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to: Project → Edge Functions → check-reminders → Logs
3. Look for entries showing:
   ```
   Found X push subscription(s) for user [user-id]
   Sending push to device: [device-name]
   Push notifications sent to X/Y devices
   ```

#### Check Browser Console
On any device, check notification service logs:
```javascript
// Check notification service status
console.log('Service available:', typeof notificationService !== 'undefined');
console.log('Permission:', Notification.permission);
console.log('SW registration:', await navigator.serviceWorker.ready);
```

## Expected Behavior

### ✅ Success Indicators
- Each device shows as separate entry in `push_subscriptions` table
- Edge Function logs show "Found X push subscription(s)" matching your device count
- Notifications appear on ALL registered devices simultaneously
- Service worker logs show notification received and displayed

### ❌ Troubleshooting

**No notifications received:**
1. Check notification permission: `Notification.permission` should be "granted"
2. Verify service worker: `navigator.serviceWorker.ready` should resolve
3. Check Edge Function logs for errors
4. Run `window.debugSupabase()` to test database connectivity

**Notifications on some devices only:**
1. Check which devices are registered in database
2. Look for failed push delivery in Edge Function logs
3. Verify network connectivity on missing devices
4. Try re-registering push notifications on affected devices

**Notifications not appearing when app is closed:**
1. Ensure service worker is properly registered
2. Check that PWA is installed (for mobile)
3. Verify browser supports background push notifications
4. Test with different browsers (Chrome works best)

## Test Scenarios

### Scenario 1: Basic Multi-Device
- 2-3 devices registered
- Create reminder, close all apps
- Verify all devices receive notification

### Scenario 2: Mixed Device Types
- Desktop + Mobile + Tablet
- Test different browsers (Chrome, Safari, Firefox)
- Verify PWA vs browser notifications

### Scenario 3: Device Registration/Unregistration
- Register device A, create reminder, get notification
- Clear browser data on device A (unregisters it)
- Create another reminder
- Verify device A no longer gets notifications, other devices still do

### Scenario 4: Network Resilience
- Create reminder while device is online
- Turn off WiFi/cellular on one device
- When reminder fires, verify other devices still receive notifications
- When offline device comes back online, verify it doesn't get old notifications

## Production Testing Checklist

- [ ] Desktop Chrome notifications work
- [ ] Mobile Chrome notifications work (PWA and browser)
- [ ] Mobile Safari notifications work (if supported)
- [ ] Multiple devices receive same notification simultaneously
- [ ] Edge Function logs show successful multi-device delivery
- [ ] Notifications work when app is completely closed
- [ ] Device registration persists across browser sessions
- [ ] Failed device delivery doesn't prevent other devices from receiving notifications

## Quick Test Commands

```javascript
// Quick multi-device test
await window.testMultiDeviceNotifications()

// Check registered devices
const devices = await window.supabase.from('push_subscriptions').select('*')
console.log('Devices:', devices.data?.length)

// Manual notification test
await window.notificationService.showNotification('Test', { body: 'Manual test notification' })

// Check pending reminders
const pending = await fetch('/api/check-reminders/pending-reminders').then(r => r.json())
console.log('Pending reminders:', pending)
```

## Support for Different Platforms

| Platform | Browser | Push Support | PWA Support | Background Notifications |
|----------|---------|--------------|-------------|-------------------------|
| Android | Chrome | ✅ Full | ✅ Yes | ✅ Yes |
| Android | Firefox | ✅ Full | ⚠️ Limited | ✅ Yes |
| iOS | Safari | ⚠️ iOS 16.4+ | ✅ Yes | ⚠️ Limited |
| iOS | Chrome | ❌ No | ❌ No | ❌ No |
| Desktop | Chrome | ✅ Full | ✅ Yes | ✅ Yes |
| Desktop | Firefox | ✅ Full | ⚠️ Limited | ✅ Yes |
| Desktop | Safari | ⚠️ Limited | ❌ No | ⚠️ Limited |

**Notes:**
- iOS Chrome/Firefox use Safari engine, so push notifications don't work
- iOS Safari push notifications require iOS 16.4+ and explicit PWA installation
- Desktop browsers generally have excellent push notification support
- PWA installation improves reliability and background notification delivery

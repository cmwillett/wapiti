# Windows Notification Troubleshooting Guide

## Current Issue
Your notification code is working perfectly - all APIs return success and notifications are created without errors. However, you're not seeing the notifications on screen. This is a **Windows notification settings issue**, not a code problem.

## Quick Fix Checklist

### 1. Windows Notification Settings
1. Press `Win + I` to open Windows Settings
2. Go to **System** > **Notifications & actions**
3. Ensure **"Get notifications from apps and other senders"** is **ON**
4. Scroll down to **"Get notifications from these senders"**
5. Find your browser (Chrome/Edge/Firefox) and ensure it's **enabled**
6. Click on your browser name for more options and ensure all toggles are **ON**

### 2. Focus Assist (Do Not Disturb)
1. In Windows Settings, go to **System** > **Focus assist**
2. Set it to **"Off"** (or **"Priority only"** if you prefer)
3. If using "Priority only", click **"Customize priority list"**
4. Add your browser to **"Priority senders"**

### 3. Browser Notification Settings
1. In Chrome: Go to **Settings** > **Privacy and security** > **Site settings** > **Notifications**
2. Ensure **"Sites can ask to send notifications"** is enabled
3. Check if `localhost:5173` is in the **"Allowed"** section
4. If it's in "Blocked", move it to "Allowed"

### 4. Windows Action Center
1. Click the **notification bell icon** in the system tray (bottom-right corner)
2. Check if notifications are hidden there
3. Look for **"Manage notifications"** button and click it
4. Ensure notifications are enabled

## Step-by-Step Test

1. **Load the test script**:
   ```
   Open your app in the browser
   Open Developer Console (F12)
   Paste and run: 
   ```
   ```javascript
   const script = document.createElement('script');
   script.src = '/windows-notification-test.js';
   document.head.appendChild(script);
   ```

2. **Run the test**:
   ```javascript
   windowsNotificationTest()
   ```

3. **Expected behavior**:
   - You should see 3 different notifications
   - If you see console logs but no visual notifications, it's a Windows settings issue

## Common Issues & Solutions

### Issue 1: "Permission granted but no notifications"
**Cause**: Windows has notifications disabled for your browser
**Solution**: Check Windows Settings > System > Notifications > [Your Browser]

### Issue 2: "Notifications work in other apps but not browser"
**Cause**: Browser-specific notification blocking in Windows
**Solution**: Reset browser notification permissions in Windows Settings

### Issue 3: "Focus Assist is interfering"
**Cause**: Windows Do Not Disturb mode is blocking notifications
**Solution**: Turn off Focus Assist or add browser to priority list

### Issue 4: "Notifications only appear in Action Center"
**Cause**: Windows is set to not show notification banners
**Solution**: In Windows Settings > Notifications, ensure "Show notification banners" is ON

## Nuclear Option: Reset Everything

If nothing works, try this complete reset:

1. **In Windows Settings**:
   - Go to System > Notifications
   - Turn OFF "Get notifications from apps and other senders"
   - Wait 10 seconds
   - Turn it back ON
   - Re-enable your browser

2. **In Browser**:
   - Go to Site Settings > Notifications
   - Remove localhost:5173 from all lists
   - Refresh your app
   - Re-grant notification permission

3. **Test with Windows built-in test**:
   - In Windows Settings > System > Notifications
   - Find your browser in the list
   - Click "Send a test notification"
   - If this doesn't work, it's definitely a Windows settings issue

## Additional Debug Information

Your notification system has these components working correctly:
- ✅ Browser Notification API
- ✅ Service Worker registration
- ✅ Push subscription creation
- ✅ IndexedDB storage
- ✅ Supabase Edge Function
- ✅ Push message delivery
- ✅ Notification creation (code-level)

The only missing piece is Windows actually displaying the notifications to you.

## Contact Support

If none of these solutions work, the issue might be:
1. Windows enterprise policies blocking notifications
2. Third-party security software interfering
3. Windows notification service corrupted (requires Windows restart)

Try restarting Windows as a last resort, as the notification service sometimes gets stuck.

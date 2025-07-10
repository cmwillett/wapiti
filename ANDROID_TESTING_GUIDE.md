# 📱 Android PWA Testing Guide

## 🚀 **Testing Your Reminder System on Android**

Your notification system is designed to work on both desktop and mobile. Here's how to test it on your Android phone:

## 📋 **Step 1: Access Your App on Android**

### **Option A: Local Network (Recommended for Testing)**
1. **Find your computer's IP address:**
   - On Windows: Open Command Prompt and run `ipconfig`
   - Look for your IPv4 Address (usually something like `192.168.1.xxx`)

2. **Make sure your dev server is accessible:**
   - Your Vite dev server should be running on `http://localhost:5177`
   - Access it from Android using: `http://[YOUR_IP]:5177`
   - Example: `http://192.168.1.100:5177`

### **Option B: Deploy to Vercel/Netlify (For Full Testing)**
If you want to test the full PWA experience, deploy your app to a public URL.

## 📋 **Step 2: Install as PWA on Android**

1. **Open in Chrome on Android:**
   - Navigate to your app URL
   - Chrome should show "Add to Home Screen" prompt
   - Or tap the menu (⋮) and select "Add to Home screen"

2. **Install the PWA:**
   - Tap "Add" when prompted
   - Your app will be installed like a native app
   - It will appear in your app drawer with its own icon

## 📋 **Step 3: Test Notifications**

### **Grant Permissions:**
1. When you first open the app, grant notification permission
2. Android will ask for notification access - tap "Allow"

### **Test Browser Notifications (App Open):**
1. Create a task with a reminder for 2 minutes from now
2. Keep the app open and wait
3. You should see a notification when the reminder triggers

### **Test Push Notifications (App Closed):**
1. Create a task with a reminder for 2 minutes from now
2. Close the app completely (not just minimize)
3. Wait for the reminder time
4. You should receive a push notification even with the app closed

## 📋 **Step 4: Verify PWA Features**

### **Offline Functionality:**
1. Turn off WiFi/mobile data
2. Open your PWA from the home screen
3. It should still load (basic functionality)
4. Service worker should handle offline reminders from IndexedDB

### **Background Notifications:**
1. Create reminders and close the app
2. Use other apps or lock your phone
3. Notifications should still arrive at the scheduled time

## 🔧 **Android-Specific Settings to Check**

### **Chrome Settings:**
- Open Chrome → Settings → Site Settings → Notifications
- Ensure notifications are enabled for your domain

### **Android System Settings:**
- Settings → Apps → [Your PWA Name] → Notifications
- Ensure all notification categories are enabled

### **Battery Optimization:**
- Settings → Battery → Battery Optimization
- Find your PWA and set to "Not Optimized"
- This prevents Android from killing the service worker

## 🧪 **Testing Checklist**

- [ ] App loads on Android Chrome
- [ ] PWA installs successfully  
- [ ] Notification permission granted
- [ ] Browser notifications work (app open)
- [ ] Push notifications work (app closed)
- [ ] Notifications appear in Android notification shade
- [ ] Notification actions work (View, Dismiss)
- [ ] App works offline
- [ ] Service worker handles background notifications

## 🐛 **Common Android Issues & Solutions**

### **Issue: No notifications when app is closed**
**Solution:** Check battery optimization settings - Android aggressively kills background processes

### **Issue: PWA doesn't install**
**Solution:** Ensure you have a valid web app manifest and service worker

### **Issue: Notifications don't show**
**Solution:** Check Android notification settings for your PWA

### **Issue: Service worker not working**
**Solution:** Android Chrome might need "Background sync" enabled

## 📊 **Android Testing Script**

Once your app is loaded on Android, run this in the mobile Chrome DevTools:

```javascript
// Test Android notification compatibility
console.log('🤖 Android PWA Test');
console.log('Notification support:', 'Notification' in window);
console.log('Service Worker support:', 'serviceWorker' in navigator);
console.log('Push support:', 'PushManager' in window);
console.log('Permission:', Notification.permission);

// Test notification
if (Notification.permission === 'granted') {
    new Notification('Android Test', {
        body: 'Your PWA notifications work on Android!',
        icon: '/favicon.svg'
    });
}
```

## 🎯 **Expected Results**

If everything is working correctly:
- ✅ App installs as PWA
- ✅ Notifications work when app is open
- ✅ Push notifications work when app is closed
- ✅ Notifications appear in Android notification shade
- ✅ Tapping notifications opens your PWA
- ✅ Service worker handles offline scenarios

## 🚀 **Next Steps After Android Testing**

1. **Test notification actions** (View, Dismiss buttons)
2. **Test with different reminder times** (immediate, 5 minutes, 1 hour)
3. **Test offline functionality** (airplane mode)
4. **Test battery optimization scenarios**
5. **Consider push notification icons and styling for mobile**

Your system should work excellently on Android since it's built with modern web standards and follows PWA best practices!

---

*💡 Tip: Android Chrome DevTools can be accessed by connecting your phone to your computer and using chrome://inspect*

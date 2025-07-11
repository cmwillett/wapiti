# Device Registration Cleanup Guide

## Problem Fixed

Previously, the notification service was creating a new push subscription every time the app loaded or refreshed, leading to dozens of duplicate device registrations per user in the database. This has been fixed with the following improvements:

## Changes Made

### 1. Smart Subscription Reuse
- The app now checks if a valid push subscription already exists before creating a new one
- Existing subscriptions are validated against the database
- Only creates new subscriptions when necessary

### 2. Duplicate Prevention
- Modified the save logic to check for existing subscriptions before inserting
- Uses INSERT instead of UPSERT to prevent unnecessary database operations
- Added better logging to track subscription creation

### 3. Cleanup Tools
Added two new cleanup methods to the notification service:

#### `cleanupDeviceRegistrations()`
- Automatically removes duplicate subscriptions for the current user
- Keeps the most recent subscription for each unique endpoint
- Returns summary of cleanup actions

#### `getDeviceRegistrationSummary()`
- Provides detailed information about current device registrations
- Shows total subscriptions, unique endpoints, and duplicate count
- Lists all registered devices with creation dates

## How to Use

### Browser Console Cleanup
1. Open the app in your browser
2. Open Developer Tools (F12)
3. Go to Console tab
4. Load the cleanup script:
   ```javascript
   // Load the cleanup script
   const script = document.createElement('script');
   script.src = '/cleanup-device-registrations.js';
   document.head.appendChild(script);
   ```

### Manual API Usage
```javascript
// Check current registration status
const summary = await window.notificationService.getDeviceRegistrationSummary();
console.log(summary);

// Clean up duplicates
const cleanupResult = await window.notificationService.cleanupDeviceRegistrations();
console.log(cleanupResult);
```

## Testing the Fix

1. **Before cleanup**: Check how many duplicate registrations exist
2. **Run cleanup**: Use the cleanup script or manual API calls
3. **Refresh the page**: Verify no new duplicates are created
4. **Multiple refreshes**: Confirm the fix by refreshing several times

## Expected Behavior After Fix

- **First visit**: Creates one push subscription per device/browser
- **Subsequent visits**: Reuses existing subscription, no duplicates created
- **Different browsers**: Each browser gets its own subscription (expected)
- **Different devices**: Each device gets its own subscription (expected)

## Monitoring

You can monitor device registrations using:

```javascript
// Quick check
window.notificationService.getDeviceRegistrationSummary().then(console.log);

// Detailed device list
window.supabase
  .from('push_subscriptions')
  .select('*')
  .then(result => console.log('All subscriptions:', result.data));
```

## Database Structure

The `push_subscriptions` table has a unique constraint on `(user_id, endpoint)` which prevents database-level duplicates, but the application logic now prevents unnecessary subscription creation attempts.

## Notes

- Cleanup is safe and only affects the current authenticated user
- The most recent subscription for each endpoint is always preserved
- Old subscriptions are automatically cleaned up during the process
- This fix applies to both desktop and mobile PWA installations

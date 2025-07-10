# Edge Function Deployment Guide - UPDATED FOR MULTI-DEVICE SUPPORT

## IMPORTANT: Updated Edge Function Code Required

The Edge Function has been updated to support **multi-device push notifications**. You MUST deploy this updated version to enable notifications on all user devices (desktop, mobile, etc.).

## Step 1: Copy the Updated Edge Function Code

1. Go to your Supabase Dashboard: https://app.supabase.com/project/[your-project-id]
2. Navigate to **Edge Functions** in the left sidebar
3. Find your existing `check-reminders` function and click **Edit**
4. **DELETE ALL** existing code in the editor (all 647 lines)
5. **COPY AND PASTE** the complete UPDATED code from `supabase\functions\check-reminders\index.ts`

## Step 2: Deploy the Function

1. After pasting the updated code, click **Save** 
2. Then click **Deploy** to make it live
3. Wait for the deployment to complete (should take 30-60 seconds)

## Step 3: Verify the Deployment

### Test via Browser Console
1. Open your app in the browser
2. Press F12 to open developer tools
3. Go to the Console tab
4. Run this command:
```javascript
// Test the Edge Function
fetch('https://[your-project-id].supabase.co/functions/v1/check-reminders', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabase.auth.session()?.access_token}`,
    'Content-Type': 'application/json'
  }
}).then(r => r.json()).then(console.log)
```

## Step 4: Test Mobile Push Notifications

1. **On your mobile device** (Android PWA):
   - Open the app in Chrome
   - Create a new task with a reminder set for 1-2 minutes in the future
   - Leave the app (put it in background or close Chrome)
   - Wait for the reminder time - you should receive a push notification

2. **Check the logs**:
   - In Supabase Dashboard, go to **Edge Functions** → **check-reminders** → **Logs**
   - You should see logs showing push notifications being sent to multiple devices

## What This Update Does

The updated Edge Function now provides:

✅ **Multi-device support**: Queries ALL push subscriptions for each user from `push_subscriptions` table  
✅ **Sends to all devices**: Each user gets notifications on ALL their registered devices (desktop, mobile, etc.)  
✅ **Better logging**: Detailed logs showing delivery status per device  
✅ **Error handling**: Graceful handling of failed devices while continuing to others  
✅ **Status reporting**: Shows success rate (e.g., "Push notifications sent to 2/3 devices")  
✅ **FCM compatibility**: Enhanced Android/Chrome push notification support with multiple fallback formats  

## Expected Behavior After Deployment

When a reminder is due, the Edge Function will:
1. Find all push subscriptions for the user in the `push_subscriptions` table
2. Send push notifications to ALL registered devices concurrently
3. Log detailed results for each device (success/failure)
4. Report overall success rate (e.g., "2/3 devices successful")
5. Mark the reminder as sent regardless of individual device failures

## Troubleshooting Mobile Notifications

If notifications still don't work on mobile:

1. **Check Edge Function logs** in Supabase Dashboard → Edge Functions → check-reminders → Logs

2. **Verify push subscription registration** on mobile:
   ```javascript
   // Check if mobile device is registered
   supabase.from('push_subscriptions').select('*').then(console.log)
   ```

3. **Test notification service** on mobile:
   ```javascript
   // Test notification registration on mobile
   notificationService.requestPermission().then(console.log)
   ```

4. **Check service worker** status:
   ```javascript
   // Verify service worker is active
   navigator.serviceWorker.ready.then(reg => console.log('SW ready:', reg))
   ```

## Key Debugging Commands for Mobile

Run these in your mobile browser console (Chrome dev tools):

```javascript
// 1. Check if push subscriptions exist for your user
supabase.from('push_subscriptions').select('*').then(console.log)

// 2. Test notification permission
console.log('Notification permission:', Notification.permission)

// 3. Test service worker and push subscription
navigator.serviceWorker.ready.then(reg => {
  console.log('Service worker ready:', reg)
  return reg.pushManager.getSubscription()
}).then(sub => console.log('Push subscription:', sub))

// 4. Manual push subscription test
notificationService.requestPermission().then(result => {
  console.log('Permission result:', result)
  if (result === 'granted') {
    notificationService.subscribeToPush().then(console.log)
  }
})
```

## Next Steps

1. **Deploy the updated Edge Function** using the steps above
2. **Test on mobile device** (Android PWA) by creating a reminder  
3. **Verify multi-device notifications** work (create reminder on one device, get notified on all)
4. **Check Supabase logs** for detailed delivery status per device
5. **Monitor push subscription table** to ensure devices are properly registered

The system should now provide reliable multi-device notifications for all users!

---

## Alternative: External Cron Service Setup

If you prefer external scheduling, you can use services like GitHub Actions:

### GitHub Actions (Recommended)

Create `.github/workflows/reminder-cron.yml`:

```yaml
name: Reminder Checker
on:
  schedule:
    # Run every minute
    - cron: '* * * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  check-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Call Reminder Function
        run: |
          curl -X POST \\
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \\
            -H "Content-Type: application/json" \\
            "https://${{ secrets.SUPABASE_PROJECT_REF }}.supabase.co/functions/v1/check-reminders"
```

Add these secrets to your GitHub repository:
- `SUPABASE_PROJECT_REF`: Your Supabase project reference
- `SUPABASE_ANON_KEY`: Your Supabase anon key

### Alternative: Cron-job.org

1. Go to [cron-job.org](https://cron-job.org)
2. Create a free account
3. Set up a job to call your Edge Function URL every minute
4. URL: `https://[your-project-ref].supabase.co/functions/v1/check-reminders`
5. Method: POST
6. Schedule: Every minute (`* * * * *`)

### Alternative: EasyCron

1. Go to [easycron.com](https://www.easycron.com)
2. Create a free account (allows up to 100 jobs per month)
3. Create a new cron job:
   - URL: `https://[your-project-ref].supabase.co/functions/v1/check-reminders`
   - Schedule: Every minute
   - HTTP Method: POST

## Option 3: Local CLI Installation (if needed later)

If you want to try the CLI again later:

### Windows (PowerShell as Administrator)
```powershell
Set-ExecutionPolicy RemoteSigned -scope CurrentUser
iwr -useb get.scoop.sh | iex
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Or download directly:
```bash
curl -o supabase.exe -L "https://github.com/supabase/cli/releases/latest/download/supabase_windows_amd64.exe"
chmod +x supabase.exe
```

## Testing Your Deployment

### 1. Test the Edge Function directly:
```bash
curl -X POST \\
  -H "Authorization: Bearer YOUR_ANON_KEY" \\
  -H "Content-Type: application/json" \\
  "https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-reminders"
```

### 2. Create a test reminder:
1. Open your app
2. Create a task with a reminder 1-2 minutes in the future
3. Wait and check if the notification triggers

### 3. Monitor function logs:
- In Supabase Dashboard → Edge Functions → check-reminders → Logs

## Production Considerations

1. **Rate Limiting**: The free tier allows 500,000 Edge Function invocations per month
2. **Monitoring**: Set up alerts for function failures
3. **Backup**: Consider multiple cron services for redundancy
4. **Security**: Use proper authentication headers if needed

## Next Steps

1. Deploy the Edge Function using Option 1
2. Set up automated calling using Option 2
3. Test with real reminders
4. Configure SMS/email services as needed
5. Monitor and optimize performance

## Troubleshooting

- If reminders aren't working, check the Edge Function logs
- Verify that your database policies allow the service role to update tasks
- Test with a longer time window if you're having timing issues
- Check that user preferences are properly saved

# Edge Function Update Instructions

## Step 1: Generate VAPID Keys

First, you need to generate VAPID keys for web push authentication. Run this in your terminal:

```bash
cd c:/Dev/Wapiti
node generate-vapid-keys.js
```

This will output your VAPID public and private keys.

## Step 2: Set Environment Variables in Supabase

1. Go to your Supabase dashboard
2. Navigate to Project Settings > Environment variables
3. Add these three environment variables:
   - `VAPID_PUBLIC_KEY`: (from step 1)
   - `VAPID_PRIVATE_KEY`: (from step 1)  
   - `VAPID_SUBJECT`: `mailto:your-email@example.com` (replace with your email)

## Step 3: Update the Edge Function

1. Go to your Supabase dashboard
2. Navigate to Database > Functions (Edge Functions)
3. Find the `check-reminders` function
4. Click "Edit Function"
5. Replace the entire code with the contents of `edge-function-fixed-code.ts`
6. Click "Save" or "Deploy"

## Step 4: Update Frontend VAPID Key

Update your frontend code to use the new VAPID public key:

1. Open `src/services/notificationService.js`
2. Replace the `applicationServerKey` with your new VAPID public key

## Key Changes in the Fixed Edge Function

1. **Proper Web Push Protocol**: Uses the `web-push` library instead of direct FCM POST requests
2. **VAPID Authentication**: Properly configures VAPID keys for authentication
3. **Multi-Device Support**: Sends notifications to all registered devices for a user
4. **Better Error Handling**: Catches and logs errors for each device separately
5. **Detailed Logging**: Comprehensive logging for debugging

## Testing

After updating:

1. Test with the multi-device notification script: `test-multidevice-notifications.js`
2. Check the Edge Function logs in Supabase dashboard for any errors
3. Verify notifications are received on all registered devices

## Troubleshooting

- If you see "VAPID keys not configured" errors, check the environment variables
- If notifications still fail, check the browser console for service worker errors
- Check Supabase logs for detailed error messages

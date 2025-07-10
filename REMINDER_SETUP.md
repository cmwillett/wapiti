# Reminder System Setup and Deployment Guide

This guide explains how to set up the complete reminder system that works even when the app is closed.

## Architecture Overview

The system consists of:
1. **Frontend React App** - Manages tasks, notes, and reminders
2. **Supabase Database** - Stores all data (lists, tasks, reminders, user preferences)
3. **Supabase Edge Function** - Checks for due reminders and sends notifications
4. **Cron Job** - Calls the Edge Function every minute to check reminders
5. **Notification Services** - Push notifications, SMS (Twilio), and Email

## Setup Instructions

### 1. Supabase Setup

First, make sure your Supabase database has the required tables by running the SQL in `supabase-schema.sql`.

### 2. Deploy Edge Function

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy the edge function
supabase functions deploy check-reminders
```

### 3. Set Environment Variables

In your Supabase project dashboard, go to Settings > Edge Functions and add these environment variables:

```
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TWILIO_ACCOUNT_SID=your-twilio-account-sid (optional, for SMS)
TWILIO_AUTH_TOKEN=your-twilio-auth-token (optional, for SMS)
TWILIO_PHONE_NUMBER=your-twilio-phone-number (optional, for SMS)
```

### 4. Set Up Cron Job

You have several options for calling the Edge Function every minute:

#### Option A: GitHub Actions (Recommended)

Create `.github/workflows/reminder-cron.yml`:

```yaml
name: Check Reminders
on:
  schedule:
    - cron: '* * * * *' # Every minute
  workflow_dispatch: # Allow manual trigger

jobs:
  check-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Call Reminder Function
        run: |
          curl -X POST "https://your-project-ref.supabase.co/functions/v1/check-reminders" \
               -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
               -H "Content-Type: application/json"
```

Add `SUPABASE_ANON_KEY` to your GitHub repository secrets.

#### Option B: EasyCron or Similar Service

1. Sign up for a cron service like EasyCron.com
2. Create a new cron job that runs every minute
3. Set the URL to: `https://your-project-ref.supabase.co/functions/v1/check-reminders`
4. Add headers:
   - `Authorization: Bearer your-supabase-anon-key`
   - `Content-Type: application/json`

#### Option C: Server Cron Job

If you have your own server, add this to your crontab:

```bash
# Check reminders every minute
* * * * * curl -X POST "https://your-project-ref.supabase.co/functions/v1/check-reminders" -H "Authorization: Bearer your-supabase-anon-key" -H "Content-Type: application/json"
```

### 5. Configure Notifications

#### Push Notifications
- Users need to allow notifications in their browser
- The app automatically requests permission and registers for push notifications

#### SMS (Optional)
1. Sign up for Twilio
2. Get a phone number and API credentials
3. Add the credentials to your Supabase Edge Function environment variables
4. Users can enter their phone number in preferences

#### Email (Optional)
- Implement using SendGrid, Resend, or another email service
- Add the service credentials to your Edge Function environment variables

### 6. Testing

1. Create a task with a reminder set for 1-2 minutes in the future
2. Close the browser completely
3. Wait for the reminder time
4. You should receive a notification (push, SMS, or email depending on your settings)

### 7. Production Considerations

1. **VAPID Keys**: Generate proper VAPID keys for push notifications:
   ```bash
   npx web-push generate-vapid-keys
   ```

2. **Rate Limiting**: Consider adding rate limiting to prevent spam

3. **Error Handling**: Monitor your Edge Function logs for errors

4. **Scaling**: For high-volume usage, consider using a dedicated queue system

## How It Works

1. **User sets reminder**: Frontend saves reminder to Supabase with `reminder_sent: false`
2. **Cron job runs**: Every minute, calls the Edge Function
3. **Edge Function checks**: Finds all due reminders that haven't been sent
4. **Notification sent**: Based on user preferences (push/SMS/email)
5. **Reminder marked as sent**: Prevents duplicate notifications

## Troubleshooting

- **Notifications not working**: Check browser permissions and console errors
- **Edge Function errors**: Check Supabase function logs
- **Cron not running**: Verify your cron service is active
- **SMS not sending**: Check Twilio credentials and phone number format

## Files Modified/Created

- `src/app.jsx` - Integrated Supabase and notifications
- `src/components/TaskList.jsx` - Uses Supabase for all operations
- `src/components/ListSidebar.jsx` - Uses Supabase for list operations
- `src/components/UserPreferences.jsx` - New component for notification settings
- `src/services/supabaseService.js` - Complete Supabase integration
- `src/services/notificationService.js` - Enhanced notification handling
- `public/sw.js` - Improved service worker for push notifications
- `supabase/functions/check-reminders/index.ts` - Edge Function for reminder checking
- `supabase/config.toml` - Supabase configuration

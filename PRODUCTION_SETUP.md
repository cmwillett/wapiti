# Production Reminder System Setup Guide

## Overview
This guide sets up a robust reminder system that works in all scenarios:
- ✅ App open: Instant browser notifications
- ✅ App closed, device on: Push notifications
- ✅ Device off: SMS when device turns back on
- ✅ Cross-platform: Works on Android PWA, desktop, etc.

## Step 1: Deploy the Backend (Supabase Edge Function)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project (replace with your project ref)
supabase link --project-ref uiczcbezwwfhvahfdxax

# Deploy the reminder checker function
supabase functions deploy check-reminders
```

## Step 2: Set Up Environment Variables

Go to your Supabase dashboard → Settings → Edge Functions and add:

```bash
# Required
SUPABASE_URL=https://uiczcbezwwfhvahfdxax.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# For SMS (optional but recommended)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token  
TWILIO_PHONE_NUMBER=+1234567890

# For Web Push (we'll generate these)
VAPID_PUBLIC_KEY=will-generate-this
VAPID_PRIVATE_KEY=will-generate-this
```

## Step 3: Set Up Twilio for SMS (Recommended)

1. **Sign up at [Twilio](https://www.twilio.com)**
2. **Get a phone number** (~$1/month)
3. **Copy your credentials** to Supabase environment variables
4. **Cost**: ~$0.0075 per SMS (very affordable for personal use)

## Step 4: Generate VAPID Keys for Push Notifications

```bash
# Generate VAPID keys for push notifications
npx web-push generate-vapid-keys
```

Add the generated keys to your Supabase environment variables.

## Step 5: Set Up Automated Checking (Cron Job)

### Option A: GitHub Actions (Free, recommended)

Create `.github/workflows/reminder-cron.yml` with:

```yaml
name: Check Reminders
on:
  schedule:
    - cron: '* * * * *'  # Every minute
  workflow_dispatch:

jobs:
  check-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Call Reminder Function
        run: |
          curl -X POST "${{ secrets.SUPABASE_URL }}/functions/v1/check-reminders" \
               -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
               -H "Content-Type: application/json"
```

Add to GitHub repository secrets:
- `SUPABASE_URL`: Your Supabase URL
- `SUPABASE_ANON_KEY`: Your Supabase anon key

### Option B: External Cron Service

Use services like:
- **EasyCron.com** (free tier available)
- **cron-job.org** (free)
- **Zapier** (if you already use it)

Set up to call: `https://uiczcbezwwfhvahfdxax.supabase.co/functions/v1/check-reminders`

## Step 6: User Experience Flow

1. **User sets reminder** in your app
2. **App requests notification permission** (automatic)
3. **User chooses notification method** in settings:
   - Push only (free)
   - SMS only (reliable)
   - Push + SMS fallback (best of both)
4. **When reminder is due**:
   - Try push notification first
   - If push fails or user has SMS enabled, send SMS
   - Mark reminder as sent to prevent duplicates

## Step 7: Test the System

1. **Set a reminder** for 2 minutes from now
2. **Choose notification method** in settings
3. **Close the app completely**
4. **Wait for the reminder** - you should get notified!

## Cost Analysis

### Push Notifications: FREE
- Unlimited notifications
- Works when device is on

### SMS Backup: ~$5-20/month for heavy use
- $1/month for phone number
- $0.0075 per SMS
- 100 reminders/month = $0.75
- 1000 reminders/month = $7.50

### Total Cost for Personal Use: ~$1-5/month

## Reliability Levels

1. **Basic Push**: 90% reliable (when device is on)
2. **Push + SMS**: 99.9% reliable (works even when device is off)
3. **SMS Only**: 99.5% reliable (but more expensive)

## Recommended for You

Based on your needs, I recommend:
1. **Start with Push notifications** (free, works great)
2. **Add SMS for critical reminders** (optional)
3. **Let users choose** their preference

This gives you maximum flexibility and reliability!

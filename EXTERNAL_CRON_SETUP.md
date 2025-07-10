# 🚀 Reliable External Cron Setup

Since GitHub Actions can be unreliable for frequent schedules, let's set up a dedicated external cron service.

## Option 1: Cron-job.org (Recommended - Free & Reliable)

### Step 1: Sign Up
1. Go to [https://cron-job.org](https://cron-job.org)
2. Click "Sign up for free"
3. Create your account

### Step 2: Create Cron Job
1. Click "Create cronjob"
2. **Title:** `Wapiti Reminder Checker`
3. **URL:** `https://uiczcbezwwfhvahfdxax.supabase.co/functions/v1/check-reminders`
4. **Schedule:** 
   - **Minutes:** `*` (every minute)
   - **Hours:** `*` (every hour)
   - **Days:** `*` (every day)
   - **Months:** `*` (every month)
   - **Weekdays:** `*` (every day of week)
5. **HTTP Method:** `POST`
6. **Headers:** 
   - **Name:** `Authorization`
   - **Value:** `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpY3pjYmV6d3dmaHZhaGZkeGF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwODc0MDMsImV4cCI6MjA2NzY2MzQwM30.kz3eYFhmLAMgI1PKFkxzHqYgfMkj0env7-BYy_RQ4Rk`
7. **Content-Type:** `application/json`
8. Click "Create cronjob"

### Step 3: Test & Monitor
- The service will show execution history
- Should see `{"success":true,"processedCount":X,"notifications":[]}` responses
- Much more reliable than GitHub Actions!

## Option 2: UptimeRobot (Also Free)

### Alternative Setup:
1. Go to [https://uptimerobot.com](https://uptimerobot.com)
2. Sign up for free account
3. Create "HTTP(s)" monitor:
   - **URL:** `https://uiczcbezwwfhvahfdxax.supabase.co/functions/v1/check-reminders`
   - **Monitoring Interval:** 1 minute
   - **HTTP Method:** POST
   - **Custom HTTP Headers:** `Authorization: Bearer [your-anon-key]`

## Option 3: EasyCron

### Setup:
1. Go to [https://www.easycron.com](https://www.easycron.com)
2. Free account allows 100 executions/month
3. Create cron job with same URL and headers

## Why External Services Are Better

✅ **More Reliable** - Dedicated cron infrastructure  
✅ **True Every Minute** - No throttling  
✅ **Better Monitoring** - Execution history and alerts  
✅ **Free Options** - Multiple free tiers available  
✅ **No GitHub Limits** - Independent of GitHub Actions quotas  

## Quick Test

To test your cron service is working, create a reminder for 2-3 minutes from now and watch the execution logs in your chosen service!

## Recommended: Use Both

Keep GitHub Actions as backup (every 5 minutes) and add external service (every minute) for maximum reliability!

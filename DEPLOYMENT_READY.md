# 🚀 Reminder System Deployment Guide

Your Wapiti reminder system is now ready for production deployment! Here's your complete deployment checklist and next steps.

## ✅ What's Ready

### 1. Database Schema
- ✅ Lists, tasks, and user_preferences tables
- ✅ Row Level Security (RLS) policies
- ✅ Support for push_sms (hybrid) notification method
- ✅ Proper indexes for performance

### 2. Edge Function
- ✅ `check-reminders` function with full notification logic
- ✅ Push, SMS, email, and hybrid (push_sms) support
- ✅ Twilio integration for SMS
- ✅ Proper error handling and logging

### 3. Frontend
- ✅ Complete React app with reminder functionality
- ✅ Browser-based reminder checking (while app is open)
- ✅ User preferences UI with all notification methods
- ✅ Service worker for push notifications

### 4. Automation
- ✅ GitHub Actions workflow for cron job
- ✅ Alternative cron service configurations

## 🎯 Next Steps (Choose Your Deployment Path)

### Option A: Manual Deployment (Recommended for First Time)

#### 1. Deploy Edge Function via Supabase Dashboard
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project → Edge Functions → "New Function"
3. Name: `check-reminders`
4. Copy/paste content from `supabase/functions/check-reminders/index.ts`
5. Click "Deploy Function"

#### 2. Update Database Schema
Run these SQL scripts in your Supabase SQL Editor:
1. First: `additional-tables.sql` (if not already done)
2. Then: `update-notification-method-push-sms.sql` (to add hybrid option)

#### 3. Configure Environment Variables
In Supabase Dashboard → Settings → Environment Variables:
```
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token  
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

#### 4. Set Up Cron Job
**GitHub Actions (Recommended):**
1. Push your code to GitHub
2. Add repository secrets:
   - `SUPABASE_PROJECT_REF`: your-project-ref
   - `SUPABASE_ANON_KEY`: your-anon-key
3. The workflow in `.github/workflows/check-reminders.yml` will run automatically

**Alternative Services:**
- [cron-job.org](https://cron-job.org) - Free, easy setup
- [EasyCron](https://www.easycron.com) - 100 free jobs/month
- Call: `https://your-project-ref.supabase.co/functions/v1/check-reminders` every minute

### Option B: CLI Deployment (If CLI Works)

If you get the Supabase CLI working:
```bash
# Deploy function
supabase functions deploy check-reminders

# Set environment variables
supabase secrets set TWILIO_ACCOUNT_SID=your_account_sid
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token
supabase secrets set TWILIO_PHONE_NUMBER=your_phone_number
```

## 🧪 Testing Your Deployment

### 1. Test Edge Function Directly
```bash
curl -X POST \\
  -H "Authorization: Bearer YOUR_ANON_KEY" \\
  -H "Content-Type: application/json" \\
  "https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-reminders"
```

### 2. Test End-to-End Reminders
1. Open your app
2. Create a task with a reminder 2 minutes in the future
3. Set your notification preferences (push, SMS, or hybrid)
4. Wait for the reminder to trigger
5. Check Edge Function logs in Supabase Dashboard

### 3. Monitor Function Logs
- Supabase Dashboard → Edge Functions → check-reminders → Logs
- Look for successful notifications and any errors

## 📱 Notification Setup

### Push Notifications (Web)
- ✅ Already configured in your service worker
- Works automatically when users allow notifications

### SMS Notifications (Twilio)
1. Sign up at [Twilio](https://www.twilio.com)
2. Get a phone number
3. Add credentials to Supabase environment variables
4. Test with a user who has SMS preference and phone number

### Hybrid (push_sms)
- ✅ Tries push first, falls back to SMS if push fails
- Perfect for reliability - users get notified either way

## 🔧 Production Considerations

### Performance
- Free tier: 500,000 Edge Function invocations/month
- Each minute = 1 invocation (1,440/day, ~44,000/month)
- Plenty of headroom for a personal/small team app

### Reliability
- Consider setting up multiple cron services as backup
- Monitor function logs for failures
- Set up alerts for critical errors

### Security
- RLS policies protect user data
- No authentication required for the Edge Function (it runs with service role)
- Twilio credentials are securely stored in environment variables

### Scaling
- For higher usage, consider upgrading Supabase plan
- Can optimize by batching notifications or running less frequently

## 🚨 Troubleshooting

### Common Issues
1. **Reminders not sending**: Check Edge Function logs
2. **Function not running**: Verify cron job setup and secrets
3. **SMS not working**: Verify Twilio credentials and phone number format
4. **Push not working**: Check service worker registration and permissions

### Debug Commands
```bash
# Test function manually
curl -X POST "https://your-project-ref.supabase.co/functions/v1/check-reminders"

# Check if tables exist
# Run in Supabase SQL Editor:
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

## 🎉 You're Done!

Once deployed:
1. ✅ Reminders work even when app is closed
2. ✅ Multiple notification methods available
3. ✅ Reliable background processing
4. ✅ Production-ready scalability

Your reminder system is now enterprise-grade! 🚀

## 📞 Need Help?

Check the deployment guides:
- `EDGE_FUNCTION_DEPLOYMENT.md` - Detailed deployment instructions
- `PRODUCTION_SETUP.md` - Full production setup guide
- Edge Function logs in Supabase Dashboard for debugging

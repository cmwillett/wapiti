# Twilio Setup Guide for SMS Notifications

## 1. Sign Up for Twilio (if you want SMS support)

1. Go to [https://www.twilio.com](https://www.twilio.com)
2. Sign up for a free account
3. Complete phone verification
4. Get your trial credits ($15 free)

## 2. Get Your Credentials

In your Twilio Console:
1. **Account SID** - Found on the main dashboard
2. **Auth Token** - Found on the main dashboard (click "Show" to reveal)
3. **Phone Number** - Go to Phone Numbers → Manage → Active numbers

## 3. Add to Supabase

In your Supabase Dashboard, environment variables for Edge Functions are set in one of these locations:

**Option A: Edge Functions → Secrets (Recommended)**
1. Go to **Edge Functions** in the left sidebar
2. Click on **Settings** or **Secrets** (may be a gear icon)
3. Add your secrets:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_PHONE_NUMBER=+1234567890
   ```

**Option B: Project Settings → API**
1. Go to **Settings** → **API** in the left sidebar
2. Look for **Project Settings** or **Environment Variables** section
3. Add the same variables

**Option C: If using Supabase CLI later**
```bash
supabase secrets set TWILIO_ACCOUNT_SID=your_account_sid
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token
supabase secrets set TWILIO_PHONE_NUMBER=your_phone_number
```

**Important Notes:**
- Phone number must include country code (e.g., +1 for US)
- Trial accounts can only send to verified numbers
- Production accounts can send to any number

## 4. Test SMS (Optional)

You can test SMS by:
1. Adding your phone number to user preferences
2. Setting notification method to "sms" or "push_sms"
3. Creating a test reminder

## Skip SMS for Now?

If you want to deploy without SMS:
- Skip the Twilio setup
- Users can still use push notifications
- You can add SMS later by just adding the environment variables

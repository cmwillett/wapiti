# Edge Function Deployment Guide

Since the Supabase CLI installation is encountering issues, here are alternative methods to deploy your reminder system.

## Option 1: Manual Deployment via Supabase Dashboard

### Step 1: Deploy the Edge Function manually

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to "Edge Functions" in the left sidebar
4. Click "New Function"
5. Name it `check-reminders`
6. Copy and paste the entire content from `supabase/functions/check-reminders/index.ts`
7. Click "Deploy Function"

### Step 2: Configure Environment Variables

In your Supabase Dashboard:
1. Go to Settings → Environment Variables
2. Add these variables (if using SMS notifications):
   - `TWILIO_ACCOUNT_SID`: Your Twilio Account SID
   - `TWILIO_AUTH_TOKEN`: Your Twilio Auth Token  
   - `TWILIO_PHONE_NUMBER`: Your Twilio phone number

### Step 3: Test the Function

Once deployed, you can test it by calling:
```
POST https://[your-project-ref].supabase.co/functions/v1/check-reminders
```

## Option 2: External Cron Service Setup

Since you have the Edge Function ready, you can use external services to call it regularly:

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

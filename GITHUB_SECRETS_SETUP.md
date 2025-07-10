# GitHub Repository Secrets Setup Guide

## Step 1: Get Your Supabase Project Details

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy these values:

### Required Secrets:
- **Project Reference ID**: Found in the URL or "Reference ID" field
- **Anon Key**: The "anon public" key from the API settings

## Step 2: Add Secrets to GitHub

1. Go to your GitHub repository: https://github.com/YOUR_USERNAME/YOUR_REPO_NAME
2. Click **Settings** (repository settings, not your account)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret** for each:

### Add These Secrets:

**Name:** `SUPABASE_PROJECT_REF`  
**Value:** `your-project-reference-id` (e.g., `abcdefghijklmnop`)

**Name:** `SUPABASE_ANON_KEY`  
**Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (your full anon key)

## Step 3: Test the Workflow

1. Go to your GitHub repo → **Actions** tab
2. Click on **Reminder Checker** workflow
3. Click **Run workflow** → **Run workflow** (to test manually)
4. Watch the logs to see if it works

## Step 4: Verify Automatic Execution

- The workflow will run every minute automatically
- Check the **Actions** tab to see execution history
- Each run should show "✅ Reminder check completed successfully"

## Troubleshooting

If you see errors:
1. **403 Forbidden**: Check your anon key is correct
2. **404 Not Found**: Check your project reference ID
3. **Function not found**: Make sure you deployed the Edge Function first

## Alternative: Use cron-job.org Instead

If GitHub Actions doesn't work for you:

1. Go to [cron-job.org](https://cron-job.org)
2. Create account and new cron job
3. URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-reminders`
4. Schedule: Every minute (`* * * * *`)
5. Method: POST
6. Headers: `Authorization: Bearer YOUR_ANON_KEY`

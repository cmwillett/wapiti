#!/bin/bash

echo "🚀 Deploying FCM V1 Edge Function..."

# Check if we're in the right directory
if [ ! -f "supabase/functions/check-reminders/index.ts" ]; then
    echo "❌ Error: Please run this script from the root of your Wapiti project"
    exit 1
fi

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    if [ -f "./supabase.exe" ]; then
        echo "✅ Using local supabase.exe"
        SUPABASE_CMD="./supabase.exe"
    else
        echo "❌ Error: Supabase CLI not found. Please install it or ensure supabase.exe is in the project root"
        exit 1
    fi
else
    SUPABASE_CMD="supabase"
fi

echo "📦 Deploying Edge Function with FCM V1 API support..."

# Deploy the function
$SUPABASE_CMD functions deploy check-reminders

if [ $? -eq 0 ]; then
    echo "✅ Edge Function deployed successfully!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Set up your Firebase service account in Supabase Dashboard"
    echo "2. Add the following environment variables:"
    echo "   - FIREBASE_SERVICE_ACCOUNT_KEY"
    echo "   - FIREBASE_PROJECT_ID"
    echo "3. Test your notifications using the test scripts"
    echo ""
    echo "🔗 Supabase Dashboard: https://supabase.com/dashboard"
    echo "📚 Setup Guide: See FCM_V1_SETUP_GUIDE.md"
else
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi

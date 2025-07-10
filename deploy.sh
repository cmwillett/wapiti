#!/bin/bash

# Deployment script for the Wapiti reminder system

echo "🚀 Deploying Wapiti Reminder System..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if we're linked to a Supabase project
if [ ! -f ".supabase/config.toml" ]; then
    echo "❌ Not linked to a Supabase project. Please run:"
    echo "supabase link --project-ref YOUR_PROJECT_REF"
    exit 1
fi

# Deploy the database schema
echo "📊 Deploying database schema..."
supabase db push

# Deploy edge functions
echo "⚡ Deploying edge functions..."
supabase functions deploy check-reminders

# Build the React app
echo "🏗️ Building React app..."
npm run build

echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Set up environment variables in Supabase dashboard"
echo "2. Configure cron job to call the edge function every minute"
echo "3. Test notifications by creating a reminder"
echo ""
echo "See REMINDER_SETUP.md for detailed instructions."

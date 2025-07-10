#!/bin/bash

# Test your Supabase Edge Function
# Replace these values with your actual Supabase details

echo "🧪 Testing Supabase Edge Function..."
echo "================================================"

# You need to replace these with your actual values:
PROJECT_REF="your-project-ref-here"  # e.g., "abcdefghijklmnop"
ANON_KEY="your-anon-key-here"       # Your full anon key

# Test URL
URL="https://${PROJECT_REF}.supabase.co/functions/v1/check-reminders"

echo "📍 Testing URL: $URL"
echo "🔑 Using anon key: ${ANON_KEY:0:20}..."
echo ""

# Make the request
echo "🚀 Making request..."
response=$(curl -s -w "%{http_code}" -X POST \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  "$URL")

# Parse response
http_code=$(echo "$response" | tail -c 4)
body=$(echo "$response" | head -c -4)

echo "📊 HTTP Status: $http_code"
echo "📝 Response Body:"
echo "$body" | jq . 2>/dev/null || echo "$body"

# Check result
if [ "$http_code" = "200" ]; then
    echo ""
    echo "✅ SUCCESS! Your Edge Function is working!"
    echo "🎉 You can now set up the GitHub Actions workflow."
else
    echo ""
    echo "❌ ERROR: Function returned status $http_code"
    echo "🔧 Check your Edge Function deployment and try again."
fi

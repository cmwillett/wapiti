@echo off
REM Test your Supabase Edge Function
REM Replace these values with your actual Supabase details

echo 🧪 Testing Supabase Edge Function...
echo ================================================

REM You need to replace these with your actual values:
set PROJECT_REF=uiczcbezwwfhvahfdxax
set ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpY3pjYmV6d3dmaHZhaGZkeGF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwODc0MDMsImV4cCI6MjA2NzY2MzQwM30.kz3eYFhmLAMgI1PKFkxzHqYgfMkj0env7-BYy_RQ4Rk

REM Test URL
set URL=https://%PROJECT_REF%.supabase.co/functions/v1/check-reminders

echo 📍 Testing URL: %URL%
echo 🔑 Using anon key: %ANON_KEY:~0,20%...
echo.

echo 🚀 Making request...
curl -X POST -H "Authorization: Bearer %ANON_KEY%" -H "Content-Type: application/json" "%URL%"

echo.
echo ✅ If you see JSON response above, your Edge Function is working!
echo 🎉 You can now set up the GitHub Actions workflow.

pause

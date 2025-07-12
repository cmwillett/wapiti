@echo off
echo 🚀 Deploying FCM V1 Edge Function...

REM Check if we're in the right directory
if not exist "supabase\functions\check-reminders\index.ts" (
    echo ❌ Error: Please run this script from the root of your Wapiti project
    exit /b 1
)

REM Check if supabase CLI is available
where supabase >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if exist "supabase.exe" (
        echo ✅ Using local supabase.exe
        set SUPABASE_CMD=supabase.exe
    ) else (
        echo ❌ Error: Supabase CLI not found. Please install it or ensure supabase.exe is in the project root
        exit /b 1
    )
) else (
    set SUPABASE_CMD=supabase
)

echo 📦 Deploying Edge Function with FCM V1 API support...

REM Deploy the function
%SUPABASE_CMD% functions deploy check-reminders

if %ERRORLEVEL% EQU 0 (
    echo ✅ Edge Function deployed successfully!
    echo.
    echo 📝 Next steps:
    echo 1. Set up your Firebase service account in Supabase Dashboard
    echo 2. Add the following environment variables:
    echo    - FIREBASE_SERVICE_ACCOUNT_KEY
    echo    - FIREBASE_PROJECT_ID
    echo 3. Test your notifications using the test scripts
    echo.
    echo 🔗 Supabase Dashboard: https://supabase.com/dashboard
    echo 📚 Setup Guide: See FCM_V1_SETUP_GUIDE.md
) else (
    echo ❌ Deployment failed. Please check the error messages above.
    exit /b 1
)

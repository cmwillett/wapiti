# FCM V1 API Setup Guide

Since Firebase has deprecated the legacy server key API for new projects, we need to set up the FCM V1 API using OAuth2 authentication with service accounts.

## Step 1: Create a Firebase Service Account

1. Go to your Firebase Console: https://console.firebase.google.com/
2. Select your project
3. Click the gear icon (Project Settings) in the left sidebar
4. Go to the "Service accounts" tab
5. Click "Generate new private key"
6. Download the JSON file (this contains your service account credentials)
7. **Keep this file secure - it contains sensitive credentials**

## Step 2: Set Up Environment Variables in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to Settings → Edge Functions
4. Add the following environment variables:

### Required Environment Variables:

```
FIREBASE_SERVICE_ACCOUNT_KEY=<paste-the-entire-json-content-here>
FIREBASE_PROJECT_ID=<your-firebase-project-id>
```

**Important Notes:**
- For `FIREBASE_SERVICE_ACCOUNT_KEY`: Copy and paste the ENTIRE contents of the JSON file you downloaded
- For `FIREBASE_PROJECT_ID`: This is usually found in the JSON file as "project_id" field
- Make sure there are no extra spaces or line breaks when pasting

### Example of what the JSON looks like:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-...@your-project-id.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

## Step 3: Deploy the FCM V1 Edge Function

The FCM V1 Edge Function is already prepared in your project. We need to replace your current edge function with the new version.

1. Copy the FCM V1 function to your Supabase functions directory
2. Deploy the updated function
3. Test the new implementation

## Step 4: Test the Setup

After deployment, you can test the new FCM V1 implementation using the existing test scripts in your project.

## Benefits of FCM V1 API

- ✅ More secure (OAuth2 instead of static keys)
- ✅ Better error handling and responses
- ✅ Future-proof (won't be deprecated)
- ✅ More granular permissions
- ✅ Better debugging information

## Troubleshooting

If you encounter issues:

1. **Invalid credentials**: Double-check that the entire JSON was copied correctly
2. **Missing project ID**: Ensure FIREBASE_PROJECT_ID matches your project
3. **Permission errors**: Make sure the service account has FCM permissions
4. **Token errors**: The function automatically handles OAuth2 token refresh

## Next Steps

1. Complete the environment variable setup in Supabase
2. Deploy the new edge function
3. Test notifications on all your devices
4. Monitor the edge function logs for any issues

Would you like me to proceed with updating your edge function to use the FCM V1 API?

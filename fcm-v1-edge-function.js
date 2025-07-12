// Edge Function using FCM V1 API (OAuth2 + Service Account)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Handle different endpoints
    if (url.pathname.endsWith('/test-push')) {
      return await handleTestPush(req);
    }
    if (url.pathname.endsWith('/pending-reminders')) {
      return await handlePendingReminders(req);
    }
    // Default: check reminders
    return await handleCheckReminders(req);
  } catch (error) {
    console.error('Edge Function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function handleCheckReminders(req) {
  console.log('🔍 Starting reminder check...');
  
  // Get Supabase client
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '', 
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  
  const now = new Date();
  console.log(`Current time: ${now.toISOString()}`);
  
  // Look for reminders that are due now or overdue
  // Allow 5 minutes in the future for clock differences
  const futureBuffer = new Date(now.getTime() + 5 * 60 * 1000);
  console.log(`Checking for reminders due before: ${futureBuffer.toISOString()}`);

  try {
    // Look for reminders that are due now or overdue
    const { data: dueTasks, error: tasksError } = await supabaseClient
      .from('tasks')
      .select(`
        id,
        text,
        reminder_time,
        reminder_sent,
        completed,
        user_id
      `)
      .eq('reminder_sent', false)
      .eq('completed', false)
      .not('reminder_time', 'is', null)
      .lte('reminder_time', futureBuffer.toISOString());

    if (tasksError) {
      throw tasksError;
    }

    console.log(`Found ${dueTasks?.length || 0} due reminders`);

    if (!dueTasks || dueTasks.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        processedCount: 0,
        message: 'No due reminders found',
        notifications: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Group tasks by user for batch processing
    const tasksByUser = dueTasks.reduce((acc, task) => {
      if (!acc[task.user_id]) {
        acc[task.user_id] = [];
      }
      acc[task.user_id].push(task);
      return acc;
    }, {});

    console.log(`Processing reminders for ${Object.keys(tasksByUser).length} users`);

    const allNotifications = [];
    let processedCount = 0;

    // Process each user's reminders
    for (const [userId, userTasks] of Object.entries(tasksByUser)) {
      console.log(`Processing ${userTasks.length} reminders for user ${userId}`);

      try {
        // Get user preferences
        const { data: userPrefs, error: prefsError } = await supabaseClient
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (prefsError && prefsError.code !== 'PGRST116') {
          console.error(`Error fetching preferences for user ${userId}:`, prefsError);
          continue;
        }

        // Default to push notifications if no preferences
        const preferences = userPrefs || {
          user_id: userId,
          notification_method: 'push'
        };

        console.log(`User ${userId} notification method: ${preferences.notification_method}`);

        // Process each task for this user
        for (const task of userTasks) {
          console.log(`Processing reminder for task ${task.id}: "${task.text}"`);

          try {
            // Send notification based on user preference
            const notificationResult = await sendNotification(task, preferences, supabaseClient);
            
            allNotifications.push({
              taskId: task.id,
              taskText: task.text,
              userId: userId,
              method: preferences.notification_method,
              result: notificationResult
            });

            // Mark as sent if successful
            if (notificationResult.success) {
              const { error: updateError } = await supabaseClient
                .from('tasks')
                .update({ reminder_sent: true })
                .eq('id', task.id);

              if (updateError) {
                console.error(`Failed to mark task ${task.id} as sent:`, updateError);
              } else {
                console.log(`✅ Marked task ${task.id} as notification sent`);
                processedCount++;
              }
            } else {
              console.error(`❌ Failed to send notification for task ${task.id}:`, notificationResult.error);
            }

          } catch (taskError) {
            console.error(`Error processing task ${task.id}:`, taskError);
            allNotifications.push({
              taskId: task.id,
              taskText: task.text,
              userId: userId,
              method: preferences.notification_method,
              result: { success: false, error: taskError.message }
            });
          }
        }

      } catch (userError) {
        console.error(`Error processing user ${userId}:`, userError);
      }
    }

    console.log(`✅ Reminder check complete. Processed ${processedCount} notifications.`);

    return new Response(JSON.stringify({
      success: true,
      processedCount,
      notifications: allNotifications,
      timestamp: now.toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in reminder check:', error);
    throw error;
  }
}

async function sendNotification(task, preferences, supabaseClient) {
  console.log(`Sending ${preferences.notification_method} notification for task ${task.id}`);
  
  switch (preferences.notification_method) {
    case 'push':
      return await sendPushNotification(task, preferences.user_id, supabaseClient);
    case 'sms':
      if (!preferences.phone_number) {
        console.log('SMS requested but no phone number available, falling back to push');
        return await sendPushNotification(task, preferences.user_id, supabaseClient);
      }
      return await sendSMSNotification(task, preferences.phone_number, supabaseClient);
    case 'email':
      if (!preferences.email) {
        console.log('Email requested but no email available, falling back to push');
        return await sendPushNotification(task, preferences.user_id, supabaseClient);
      }
      return await sendEmailNotification(task, preferences.email, supabaseClient);
    case 'push_sms':
      const pushResult = await sendPushNotification(task, preferences.user_id, supabaseClient);
      if (pushResult.success) {
        return pushResult;
      }
      // Fallback to SMS if push fails
      if (preferences.phone_number) {
        const smsResult = await sendSMSNotification(task, preferences.phone_number, supabaseClient);
        return { ...smsResult, fallback: pushResult };
      }
      return pushResult;
    default:
      return await sendPushNotification(task, preferences.user_id, supabaseClient);
  }
}

async function sendPushNotification(task, userId, supabaseClient) {
  console.log(`📱 Sending push notification for task ${task.id} to user ${userId}`);

  try {
    // Get all push subscriptions for this user (multi-device support)
    const { data: subscriptions, error: subError } = await supabaseClient
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (subError) {
      console.error('Error fetching push subscriptions:', subError);
      return { success: false, method: 'push', error: subError.message };
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for user');
      return { success: false, method: 'push', error: 'No push subscriptions found' };
    }

    console.log(`Found ${subscriptions.length} push subscription(s) for user ${userId}`);

    // Send to all devices
    const results = [];
    for (const subscription of subscriptions) {
      try {
        console.log(`Sending to device: ${subscription.device_name || 'Unknown device'}`);
        const fcmResult = await sendFCMV1Notification(subscription, task);
        results.push(fcmResult);
        
        if (fcmResult.success) {
          // Update last_used timestamp
          await supabaseClient
            .from('push_subscriptions')
            .update({ last_used: new Date().toISOString() })
            .eq('id', subscription.id);
        }
      } catch (deviceError) {
        console.error(`Failed to send to device ${subscription.id}:`, deviceError);
        results.push({ success: false, error: deviceError.message });
      }
    }

    // Consider successful if at least one device got the notification
    const successCount = results.filter(r => r.success).length;
    const success = successCount > 0;

    console.log(`Push notification result: ${successCount}/${results.length} devices succeeded`);

    return {
      success,
      method: 'push',
      messageId: success ? `${successCount}/${results.length} devices` : undefined,
      error: success ? undefined : 'Failed to deliver to any device'
    };

  } catch (error) {
    console.error('Error in push notification:', error);
    return { success: false, method: 'push', error: error.message };
  }
}

// Get OAuth2 access token for FCM V1 API
async function getAccessToken() {
  try {
    // Get service account key from environment variable
    const serviceAccountKey = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY');
    
    if (!serviceAccountKey) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is required');
    }

    const serviceAccount = JSON.parse(serviceAccountKey);
    
    // Create JWT for Google OAuth2
    const now = Math.floor(Date.now() / 1000);
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };
    
    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600
    };

    // Create unsigned token
    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const unsignedToken = `${headerB64}.${payloadB64}`;

    // Sign the token with the private key
    const privateKey = await importPrivateKey(serviceAccount.private_key);
    const signature = await signJWT(unsignedToken, privateKey);
    const jwt = `${unsignedToken}.${signature}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Failed to get access token: ${tokenResponse.status} ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;

  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

// Helper function to import private key
async function importPrivateKey(privateKeyPem) {
  // Remove PEM header/footer and whitespace
  const pemContents = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');

  // Convert base64 to ArrayBuffer
  const keyData = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  // Import the key
  return await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  );
}

// Helper function to sign JWT
async function signJWT(data, privateKey) {
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    encoder.encode(data)
  );

  // Convert to base64url
  const signatureArray = new Uint8Array(signature);
  const signatureB64 = btoa(String.fromCharCode(...signatureArray))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return signatureB64;
}

// Extract registration token from FCM endpoint
function extractRegistrationToken(endpoint) {
  // FCM endpoints look like: https://fcm.googleapis.com/fcm/send/REGISTRATION_TOKEN
  const match = endpoint.match(/\/fcm\/send\/(.+)$/);
  return match ? match[1] : null;
}

// Send notification using FCM V1 API
async function sendFCMV1Notification(subscription, task) {
  try {
    console.log(`Sending FCM V1 notification for task ${task.id}`);
    
    // Get access token
    const accessToken = await getAccessToken();
    
    // Extract registration token from endpoint
    const registrationToken = extractRegistrationToken(subscription.endpoint);
    if (!registrationToken) {
      throw new Error('Could not extract registration token from endpoint');
    }

    // Get Firebase project ID
    const projectId = Deno.env.get('FIREBASE_PROJECT_ID');
    if (!projectId) {
      throw new Error('FIREBASE_PROJECT_ID environment variable is required');
    }

    // Create FCM V1 payload
    const message = {
      message: {
        token: registrationToken,
        notification: {
          title: '📝 Task Reminder',
          body: `Don't forget: ${task.text}`
        },
        data: {
          taskId: task.id.toString(),
          action: 'task-reminder'
        },
        webpush: {
          headers: {
            'TTL': '86400'
          },
          notification: {
            title: '📝 Task Reminder',
            body: `Don't forget: ${task.text}`,
            icon: '/icons/icon-192x192.png',
            badge: '/favicon.svg',
            tag: `task-${task.id}`,
            requireInteraction: true,
            data: {
              taskId: task.id.toString(),
              action: 'task-reminder'
            }
          }
        }
      }
    };

    console.log('FCM V1 payload:', JSON.stringify(message, null, 2));

    // Send to FCM V1 API
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(message)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ FCM V1 notification sent successfully:', result);
      return { success: true, messageId: result.name };
    } else {
      const errorText = await response.text();
      console.error('❌ FCM V1 notification failed:', response.status, response.statusText, errorText);
      return { success: false, error: `FCM V1 error: ${response.status} ${response.statusText}` };
    }

  } catch (error) {
    console.error('FCM V1 notification error:', error);
    return { success: false, error: error.message };
  }
}

async function sendSMSNotification(task, phoneNumber, supabaseClient) {
  console.log(`📱 SMS notifications not implemented yet for task ${task.id}`);
  // Placeholder for SMS implementation
  return { success: false, method: 'sms', error: 'SMS notifications not implemented yet' };
}

async function sendEmailNotification(task, email, supabaseClient) {
  console.log(`📧 Email notifications not implemented yet for task ${task.id}`);
  // Placeholder for email implementation
  return { success: false, method: 'email', error: 'Email notifications not implemented yet' };
}

async function handleTestPush(req) {
  console.log('🧪 Test push endpoint called');
  try {
    const body = await req.json();
    console.log('Test push request body:', body);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Test push endpoint called',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Test push error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function handlePendingReminders(req) {
  console.log('📋 Pending reminders endpoint called');
  try {
    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const now = new Date();
    const futureBuffer = new Date(now.getTime() + 5 * 60 * 1000);

    // Get pending reminders
    const { data: tasks, error } = await supabaseClient
      .from('tasks')
      .select('id, text, reminder_time, user_id')
      .eq('reminder_sent', false)
      .eq('completed', false)
      .not('reminder_time', 'is', null)
      .lte('reminder_time', futureBuffer.toISOString())
      .limit(10);

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({
      success: true,
      tasks: tasks || [],
      timestamp: now.toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Pending reminders error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

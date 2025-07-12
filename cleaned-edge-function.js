// Edge Function to check for due reminders and send notifications
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
        const fcmResult = await sendFCMNotification(subscription, task);
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

// Hybrid sendFCMNotification function that works for both desktop and mobile
async function sendFCMNotification(subscription, task) {
  try {
    console.log(`Sending notification for task ${task.id}`);
    console.log('Subscription data:', JSON.stringify(subscription, null, 2));

    // Use the flat structure from your database
    const endpoint = subscription.endpoint;
    const p256dh = subscription.p256dh;
    const auth = subscription.auth;

    if (!endpoint) {
      console.error('Subscription structure:', subscription);
      throw new Error('Invalid subscription: missing endpoint');
    }

    console.log(`Endpoint: ${endpoint.substring(0, 50)}...`);

    // Detect if this is a mobile device based on user_agent or device_name
    const isMobile = (subscription.user_agent && (
      subscription.user_agent.includes('Mobile') || 
      subscription.user_agent.includes('Android') || 
      subscription.user_agent.includes('iPhone')
    )) || (subscription.device_name && subscription.device_name.includes('Android'));

    console.log(`Device type: ${isMobile ? 'Mobile' : 'Desktop'}`);

    // Create push payload
    const payload = JSON.stringify({
      title: '📝 Task Reminder',
      body: `Don't forget: ${task.text}`,
      data: {
        taskId: task.id.toString(),
        action: 'task-reminder',
        icon: '/icons/icon-192x192.png',
        badge: '/favicon.svg',
        tag: `task-${task.id}`,
        requireInteraction: true
      }
    });

    console.log('Push payload:', payload);

    if (isMobile) {
      // For mobile devices: Use simple FCM format (what was working)
      return await sendMobileNotification(endpoint, payload);
    } else {
      // For desktop: Try multiple approaches
      return await sendDesktopNotification(endpoint, p256dh, auth, payload);
    }

  } catch (error) {
    console.error('Notification error:', error);
    return { success: false, error: error.message };
  }
}

// Universal notification function - works for both mobile and desktop FCM endpoints
async function sendMobileNotification(endpoint, payload) {
  console.log('📱 Sending FCM notification (works for both mobile and desktop)');
  
  try {
    // Get FCM server key from environment
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');
    
    if (!fcmServerKey) {
      return { 
        success: false, 
        error: `FCM_SERVER_KEY environment variable required. All your devices use FCM endpoints which need Firebase authentication.` 
      };
    }

    // Debug: Log key info (but not the full key for security)
    console.log(`FCM server key present: ${fcmServerKey ? 'Yes' : 'No'}`);
    console.log(`FCM server key length: ${fcmServerKey ? fcmServerKey.length : 0}`);
    console.log(`FCM server key starts with: ${fcmServerKey ? fcmServerKey.substring(0, 10) + '...' : 'N/A'}`);

    // Send with FCM server key (works for both mobile and desktop FCM endpoints)
    console.log('Using FCM server key for notification');
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `key=${fcmServerKey}`,
      'TTL': '86400'
    };
    
    console.log('Request headers:', JSON.stringify({
      'Content-Type': headers['Content-Type'],
      'Authorization': `key=${fcmServerKey.substring(0, 10)}...`,
      'TTL': headers['TTL']
    }));

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: payload
    });

    if (response.ok) {
      console.log('✅ FCM notification sent successfully');
      return { success: true, messageId: `fcm-${Date.now()}` };
    } else {
      console.error('❌ FCM notification failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      
      // Additional debugging for 401 errors
      if (response.status === 401) {
        console.error('🔍 401 Debugging info:');
        console.error('- FCM key exists:', !!fcmServerKey);
        console.error('- FCM key length:', fcmServerKey?.length);
        console.error('- Authorization header being sent:', `key=${fcmServerKey?.substring(0, 10)}...`);
        console.error('- Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));
      }
      
      return { success: false, error: `FCM push error: ${response.status} ${response.statusText}` };
    }
  } catch (error) {
    console.error('FCM notification error:', error);
    return { success: false, error: error.message };
  }
}

// Desktop notification - now also uses FCM since all your endpoints are FCM
async function sendDesktopNotification(endpoint, p256dh, auth, payload) {
  console.log('🖥️ Sending desktop FCM notification');
  
  // Since your desktop endpoints are also FCM, use the same FCM approach
  return await sendMobileNotification(endpoint, payload);
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

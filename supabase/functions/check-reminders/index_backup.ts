// Edge Function to check for due reminders and send notifications
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Global Deno type declaration for environment access
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Task {
  id: number;
  text: string;
  reminder_time: string;
  reminder_sent: boolean;
  completed: boolean;
  user_id: string;
}

interface UserPreferences {
  user_id: string;
  notification_method: 'push' | 'sms' | 'email' | 'push_sms';
  phone_number?: string;
  email?: string;
  push_subscription?: any;
}

interface NotificationResult {
  success: boolean;
  method?: string;
  error?: string;
  messageId?: string;
  fallback?: NotificationResult;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    
    // Handle different endpoints
    if (url.pathname.endsWith('/pending-reminders')) {
      return await handlePendingReminders(req)
    } else {
      return await handleCheckReminders(req)
    }
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

// Handle fetching pending reminders for service worker
async function handlePendingReminders(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Authorization required' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
    )
  }

  // Create Supabase client with user auth
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: authHeader },
      },
    }
  )

  // Get current user
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Invalid authentication' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
    )
  }

  // Get pending reminders for this user
  const now = new Date().toISOString()
  const { data: pendingTasks, error: tasksError } = await supabaseClient
    .from('tasks')
    .select('id, text, reminder_time')
    .eq('user_id', user.id)
    .eq('completed', false)
    .eq('reminder_sent', false)
    .not('reminder_time', 'is', null)
    .lte('reminder_time', now)

  if (tasksError) {
    console.error('Error fetching pending tasks:', tasksError)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch pending tasks' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }

  return new Response(
    JSON.stringify({ tasks: pendingTasks || [] }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  )
}

// Handle the main reminder checking process
async function handleCheckReminders(req: Request) {
  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get current time with a small buffer (check for reminders due in the last 2 minutes)
    const now = new Date();
    const checkTime = new Date(now.getTime() - 2 * 60 * 1000); // 2 minutes ago

    // Find all tasks with due reminders that haven't been sent
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
      .lte('reminder_time', now.toISOString())
      .gte('reminder_time', checkTime.toISOString())

    if (tasksError) {
      throw tasksError
    }

    console.log(`Found ${dueTasks?.length || 0} due reminders`)

    const notifications: Array<{
      taskId: number;
      taskText: string;
      userId: string;
      method?: string;
      result?: NotificationResult;
      error?: string;
    }> = []

    // Process each due task
    for (const task of dueTasks || []) {
      try {
        // Get user preferences
        console.log(`Looking up preferences for user: ${task.user_id}`);
        const { data: userPrefs, error: prefsError } = await supabaseClient
          .from('user_preferences')
          .select('*')
          .eq('user_id', task.user_id)
          .single()

        console.log('Preferences query result:', { userPrefs, prefsError });

        if (prefsError && prefsError.code !== 'PGRST116') {
          console.error('Error fetching user preferences:', prefsError)
          continue
        }

        if (!userPrefs) {
          console.log(`No preferences found for user ${task.user_id}`)
          continue
        }

        // Default to push notifications if no preferences
        const notificationMethod = userPrefs?.notification_method || 'push'
        console.log(`Using notification method: ${notificationMethod} for user ${task.user_id}`)

        // Send notification based on user preference
        let notificationResult: NotificationResult = { success: false, error: 'Unknown error' }
        
        if (notificationMethod === 'push' && userPrefs?.push_subscription) {
          notificationResult = await sendPushNotification(task, userPrefs.push_subscription)
        } else if (notificationMethod === 'sms' && userPrefs?.phone_number) {
          notificationResult = await sendSMSNotification(task, userPrefs.phone_number)
        } else if (notificationMethod === 'email' && userPrefs?.email) {
          notificationResult = await sendEmailNotification(task, userPrefs.email)
        } else if (notificationMethod === 'push_sms') {
          // Hybrid: Try push first, fallback to SMS
          if (userPrefs?.push_subscription) {
            notificationResult = await sendPushNotification(task, userPrefs.push_subscription)
            // If push fails and SMS is available, try SMS
            if (!notificationResult.success && userPrefs?.phone_number) {
              console.log(`Push notification failed for task ${task.id}, trying SMS fallback`)
              const smsResult = await sendSMSNotification(task, userPrefs.phone_number)
              notificationResult = {
                success: smsResult.success,
                method: 'push_sms',
                error: notificationResult.error,
                fallback: smsResult
              }
            }
          } else if (userPrefs?.phone_number) {
            // No push subscription, use SMS directly
            notificationResult = await sendSMSNotification(task, userPrefs.phone_number)
          } else {
            notificationResult = { success: false, error: 'No push subscription or phone number available for push_sms method' }
          }
        } else {
          // Fallback to push if configured, otherwise log
          if (userPrefs?.push_subscription) {
            notificationResult = await sendPushNotification(task, userPrefs.push_subscription)
          } else {
            console.log(`No notification method available for user ${task.user_id}`)
            notificationResult = { success: false, error: 'No notification method available' }
          }
        }

        // Mark reminder as sent regardless of notification success
        const { error: updateError } = await supabaseClient
          .from('tasks')
          .update({ reminder_sent: true })
          .eq('id', task.id)

        if (updateError) {
          console.error('Error updating reminder_sent status:', updateError)
        }

        notifications.push({
          taskId: task.id,
          taskText: task.text,
          userId: task.user_id,
          method: notificationMethod,
          result: notificationResult
        })

      } catch (error) {
        console.error(`Error processing task ${task.id}:`, error)
        notifications.push({
          taskId: task.id,
          taskText: task.text,
          userId: task.user_id,
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processedCount: dueTasks?.length || 0,
        notifications 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
}

// Push notification sender
async function sendPushNotification(task: Task, subscription: any): Promise<NotificationResult> {
  try {
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    
    if (!vapidPrivateKey || !vapidPublicKey) {
      throw new Error('VAPID keys not configured')
    }

    const payload = JSON.stringify({
      title: '📝 Task Reminder',
      body: `Don't forget: ${task.text}`,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: `task-${task.id}`,
      data: {
        taskId: task.id,
        action: 'task-reminder'
      },
      actions: [
        { action: 'complete', title: 'Mark Complete' },
        { action: 'snooze', title: 'Snooze 15 min' }
      ]
    })

    // Parse the subscription object if it's a string
    let parsedSubscription = subscription
    if (typeof subscription === 'string') {
      parsedSubscription = JSON.parse(subscription)
    }

    // Send push notification using Web Push Protocol
    await sendWebPush(parsedSubscription, payload, vapidPrivateKey, vapidPublicKey)
    
    console.log(`Push notification sent for task ${task.id}`)
    return { success: true, method: 'push' }
  } catch (error) {
    console.error('Push notification error:', error)
    return { success: false, error: error.message }
  }
}

// Web Push Protocol implementation with FCM compatibility
async function sendWebPush(subscription: any, payload: string, privateKey: string, publicKey: string) {
  const endpoint = subscription.endpoint
  
  if (!endpoint) {
    throw new Error('Invalid subscription: missing endpoint')
  }

  // Extract audience from endpoint
  const urlParts = new URL(endpoint)
  const audience = `${urlParts.protocol}//${urlParts.host}`

  // Create proper VAPID JWT
  const vapidJWT = await createVapidJWT(audience, privateKey, publicKey)

  console.log(`Sending push to endpoint: ${endpoint}`)
  console.log(`Audience: ${audience}`)
  console.log(`Payload: ${payload}`)
  
  // For FCM (Google Chrome), use data-less push
  if (endpoint.includes('fcm.googleapis.com')) {
      console.log('Detected FCM endpoint, using data-less push approach')
      
      const headers = {
        'Authorization': `vapid t=${vapidJWT}, k=${publicKey}`,
        'TTL': '86400'
      }
      
      console.log('Sending FCM data-less push (service worker will fetch task details)')
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers
      })
      
      if (response.ok) {
        console.log('FCM data-less push sent successfully')
        return response
      }
      
      const errorText = await response.text()
      console.error(`FCM push failed: ${response.status} - ${errorText}`)
      throw new Error(`FCM push failed: ${response.status} - ${errorText}`)
      
  } else {
    // For other push services, use standard approach
    const headers = {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
      'Authorization': `vapid t=${vapidJWT}, k=${publicKey}`
    }
    
    const payloadBuffer = new TextEncoder().encode(payload)
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: payloadBuffer
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Push service error response: ${errorText}`)
      throw new Error(`Push service responded with ${response.status}: ${response.statusText}`)
    }

    console.log('Push notification sent successfully')
    return response
  }
}

// Create proper VAPID JWT token
async function createVapidJWT(audience: string, privateKeyBase64: string, publicKeyBase64: string): Promise<string> {
  // JWT Header
  const header = {
    typ: 'JWT',
    alg: 'ES256'
  }

  // JWT Payload
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 hours from now
    sub: 'mailto:your-email@example.com' // You can change this to your email
  }

  // Encode header and payload
  const encodedHeader = base64urlEscape(btoa(JSON.stringify(header)))
  const encodedPayload = base64urlEscape(btoa(JSON.stringify(payload)))
  
  const unsignedToken = `${encodedHeader}.${encodedPayload}`
  
  // Convert private key from base64url to ArrayBuffer
  const privateKeyBuffer = base64urlToArrayBuffer(privateKeyBase64)
  
  // Import the private key for signing
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBuffer,
    {
      name: 'ECDSA',
      namedCurve: 'P-256'
    },
    false,
    ['sign']
  )

  // Sign the token
  const signature = await crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: 'SHA-256'
    },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  )

  // Encode signature
  const encodedSignature = base64urlEscape(arrayBufferToBase64(signature))
  
  return `${unsignedToken}.${encodedSignature}`
}

// Helper functions for base64url encoding
function base64urlEscape(str: string): string {
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function base64urlToArrayBuffer(base64url: string): ArrayBuffer {
  // Add padding if needed
  const padding = '='.repeat((4 - base64url.length % 4) % 4)
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/')
  
  const binary = atob(base64)
  const buffer = new ArrayBuffer(binary.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i)
  }
  return buffer
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// SMS notification sender using Twilio
async function sendSMSNotification(task: Task, phoneNumber: string): Promise<NotificationResult> {
  try {
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error('Twilio credentials not configured')
    }

    const message = `📝 Task Reminder: Don't forget - ${task.text}`

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: twilioPhoneNumber,
          To: phoneNumber,
          Body: message,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Twilio API error: ${errorText}`)
    }

    const result = await response.json()
    console.log(`SMS sent for task ${task.id}:`, result.sid)
    
    return { success: true, method: 'sms', messageId: result.sid }
  } catch (error) {
    console.error('SMS notification error:', error)
    return { success: false, error: error.message }
  }
}

// Email notification sender
async function sendEmailNotification(task: Task, email: string): Promise<NotificationResult> {
  try {
    // You could use SendGrid, Resend, or another email service
    // For now, we'll just log it
    const subject = '📝 Task Reminder'
    const message = `Don't forget: ${task.text}`
    
    console.log(`Would send email to ${email} for task ${task.id}: ${subject} - ${message}`)
    
    return { success: true, method: 'email' }
  } catch (error) {
    console.error('Email notification error:', error)
    return { success: false, error: error.message }
  }
}

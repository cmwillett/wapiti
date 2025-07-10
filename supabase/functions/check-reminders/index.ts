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
        const { data: userPrefs, error: prefsError } = await supabaseClient
          .from('user_preferences')
          .select('*')
          .eq('user_id', task.user_id)
          .single()

        if (prefsError && prefsError.code !== 'PGRST116') {
          console.error('Error fetching user preferences:', prefsError)
          continue
        }

        // Default to push notifications if no preferences
        const notificationMethod = userPrefs?.notification_method || 'push'

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
})

// Push notification sender
async function sendPushNotification(task: Task, subscription: any): Promise<NotificationResult> {
  try {
    // This would typically use web-push library or similar service
    // For now, we'll simulate the call
    const payload = JSON.stringify({
      title: '📝 Task Reminder',
      body: `Don't forget: ${task.text}`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
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

    // In a real implementation, you'd use the Web Push Protocol
    // For development, we'll just log it
    console.log(`Would send push notification for task ${task.id}:`, payload)
    
    return { success: true, method: 'push' }
  } catch (error) {
    console.error('Push notification error:', error)
    return { success: false, error: error.message }
  }
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

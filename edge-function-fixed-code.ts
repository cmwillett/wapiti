// CORRECTED Edge Function code for check-reminders
// This needs to be manually copied into the Supabase dashboard
// at: Project Settings > Edge Functions > check-reminders > Edit Function

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🔔 Edge Function: check-reminders started')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('✅ Supabase client initialized')

    // Get current time
    const now = new Date()
    const nowISO = now.toISOString()
    console.log(`🕐 Current time: ${nowISO}`)

    // Query for due reminders
    const { data: dueReminders, error: reminderError } = await supabase
      .from('tasks')
      .select(`
        id,
        text,
        reminder_time,
        user_id,
        list_id
      `)
      .not('reminder_time', 'is', null)
      .lte('reminder_time', nowISO)
      .eq('completed', false)

    if (reminderError) {
      console.error('❌ Error fetching reminders:', reminderError)
      throw reminderError
    }

    console.log(`📋 Found ${dueReminders?.length || 0} due reminders`)

    if (!dueReminders || dueReminders.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          processedCount: 0,
          message: 'No due reminders found' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const notifications = []

    // Process each reminder
    for (const reminder of dueReminders) {
      console.log(`🔔 Processing reminder for task ${reminder.id}: "${reminder.text}"`)

      try {
        // Get all push subscriptions for this user
        const { data: subscriptions, error: subError } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', reminder.user_id)

        if (subError) {
          console.error(`❌ Error fetching subscriptions for user ${reminder.user_id}:`, subError)
          continue
        }

        if (!subscriptions || subscriptions.length === 0) {
          console.log(`ℹ️ No push subscriptions found for user ${reminder.user_id}`)
          continue
        }

        console.log(`📱 Found ${subscriptions.length} device(s) for user ${reminder.user_id}`)

        // Send notification to each device using proper web push protocol
        for (const subscription of subscriptions) {
          console.log(`📤 Sending notification to device: ${subscription.device_name || 'Unknown'}`)
          
          try {
            // Use the web-push library for proper VAPID authentication
            const webpush = await import('https://esm.sh/web-push@3.6.6')
            
            // Set VAPID details (you need to set these environment variables in Supabase)
            const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
            const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
            const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:your-email@example.com'

            if (!vapidPublicKey || !vapidPrivateKey) {
              console.error('❌ VAPID keys not configured in environment variables')
              throw new Error('VAPID keys not configured')
            }

            webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

            // Prepare the push subscription object
            const pushSubscription = {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth
              }
            }

            // Prepare notification payload
            const payload = JSON.stringify({
              title: '⏰ Reminder',
              body: reminder.text,
              icon: '/icon-192x192.png',
              badge: '/icon-192x192.png',
              tag: `reminder-${reminder.id}`,
              data: {
                taskId: reminder.id,
                listId: reminder.list_id,
                url: '/'
              }
            })

            console.log(`📡 Sending web push with payload:`, payload)

            // Send the notification using proper web push protocol
            const result = await webpush.sendNotification(pushSubscription, payload)
            
            console.log(`✅ Notification sent successfully to ${subscription.device_name || 'Unknown'}:`, result)

            notifications.push({
              taskId: reminder.id,
              taskText: reminder.text,
              method: 'push',
              deviceName: subscription.device_name || 'Unknown',
              result: 'success'
            })

          } catch (pushError) {
            console.error(`❌ Failed to send push notification to ${subscription.device_name || 'Unknown'}:`, pushError)
            
            notifications.push({
              taskId: reminder.id,
              taskText: reminder.text,
              method: 'push',
              deviceName: subscription.device_name || 'Unknown',
              result: 'failed',
              error: pushError.message
            })
          }
        }

        // Clear the reminder_time after processing
        const { error: updateError } = await supabase
          .from('tasks')
          .update({ reminder_time: null })
          .eq('id', reminder.id)

        if (updateError) {
          console.error(`❌ Error clearing reminder for task ${reminder.id}:`, updateError)
        } else {
          console.log(`✅ Cleared reminder for task ${reminder.id}`)
        }

      } catch (error) {
        console.error(`❌ Error processing reminder ${reminder.id}:`, error)
      }
    }

    console.log(`✅ Processed ${dueReminders.length} reminders, sent ${notifications.length} notifications`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        processedCount: dueReminders.length,
        notifications: notifications
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Edge Function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

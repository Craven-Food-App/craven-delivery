// Edge Function: send-customer-notification
// Sends notifications to customers while respecting their notification preferences.
// Checks user_notification_preferences before delivering push/SMS.
//
// Categories: order_updates, store_offers, craven_specials, suggestions, reminders, app_updates
//
// Usage:
//   POST /send-customer-notification
//   Body: {
//     customer_id: string,       // Required: target customer's user_id
//     category: string,          // Required: one of the category IDs above
//     title: string,             // Required: notification title
//     body: string,              // Required: notification body text
//     data?: object,             // Optional: extra payload (order_id, etc.)
//     force?: boolean            // Optional: bypass preference check (critical alerts only)
//   }

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";

const VALID_CATEGORIES = [
  'order_updates',
  'store_offers',
  'craven_specials',
  'suggestions',
  'reminders',
  'app_updates',
];

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { customer_id, category, title, body, data, force } = await req.json();

    // ── Validate inputs ────────────────────────────────────────────────
    if (!customer_id || !category || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: customer_id, category, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return new Response(
        JSON.stringify({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Check user notification preferences ────────────────────────────
    let pushEnabled = true;  // Default to enabled if no preference saved
    let smsEnabled = false;

    if (!force) {
      const { data: pref, error: prefError } = await supabase
        .from('user_notification_preferences')
        .select('push_enabled, sms_enabled')
        .eq('user_id', customer_id)
        .eq('category', category)
        .maybeSingle();

      if (prefError) {
        console.error('Error fetching preference:', prefError);
      }

      if (pref) {
        pushEnabled = pref.push_enabled;
        smsEnabled = pref.sms_enabled;
      }
    }

    const results: { push: string; sms: string; in_app: string } = {
      push: 'skipped',
      sms: 'skipped',
      in_app: 'skipped'
    };

    // ── Always create in-app notification record ───────────────────────
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: customer_id,
        title,
        message: body,
        type: category,
        data: data || {},
        is_read: false
      });

    if (notifError) {
      console.error('Failed to create in-app notification:', notifError);
      results.in_app = 'failed';
    } else {
      results.in_app = 'sent';
    }

    // ── Send push notification if enabled ──────────────────────────────
    if (pushEnabled || force) {
      // Get customer's active push subscriptions
      const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh_key, auth_key, is_native, push_token, device_type')
        .eq('user_id', customer_id)
        .eq('is_active', true);

      if (subError) {
        console.error('Error fetching push subscriptions:', subError);
        results.push = 'error';
      } else if (!subscriptions || subscriptions.length === 0) {
        console.log(`No active push subscriptions for customer ${customer_id}`);
        results.push = 'no_subscription';
      } else {
        let successCount = 0;
        let failCount = 0;

        for (const sub of subscriptions) {
          try {
            if (sub.is_native && sub.push_token) {
              // Native push (FCM/APNS) — send via Firebase/APNS gateway
              // In production, this would call FCM HTTP v1 API or APNS
              const fcmKey = Deno.env.get('FCM_SERVER_KEY');
              if (fcmKey) {
                const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `key=${fcmKey}`
                  },
                  body: JSON.stringify({
                    to: sub.push_token,
                    notification: {
                      title,
                      body,
                      icon: '/crave-c-logo.png',
                      click_action: data?.click_action || 'OPEN_APP'
                    },
                    data: {
                      ...data,
                      category,
                      notification_type: 'customer'
                    }
                  })
                });

                if (fcmResponse.ok) {
                  successCount++;
                } else {
                  const errText = await fcmResponse.text();
                  console.error(`FCM send failed for ${sub.endpoint}:`, errText);
                  failCount++;

                  // Mark subscription inactive if token is invalid
                  if (fcmResponse.status === 404 || fcmResponse.status === 410) {
                    await supabase
                      .from('push_subscriptions')
                      .update({ is_active: false })
                      .eq('endpoint', sub.endpoint)
                      .eq('user_id', customer_id);
                  }
                }
              } else {
                console.warn('FCM_SERVER_KEY not configured, native push skipped');
                failCount++;
              }
            } else {
              // Web push via Web Push API endpoint
              const payload = JSON.stringify({
                title,
                body,
                data: { ...data, category },
                icon: '/crave-c-logo.png',
                badge: '/crave-c-logo.png',
                vibrate: [200, 100, 200],
                tag: data?.order_id || category,
              });

              const response = await fetch(sub.endpoint, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'TTL': '86400',
                },
                body: payload,
              });

              if (response.ok) {
                successCount++;
              } else {
                failCount++;
                // Mark inactive if subscription is gone
                if (response.status === 410 || response.status === 404) {
                  await supabase
                    .from('push_subscriptions')
                    .update({ is_active: false })
                    .eq('endpoint', sub.endpoint)
                    .eq('user_id', customer_id);
                }
              }
            }
          } catch (pushErr) {
            console.error('Push delivery error:', pushErr);
            failCount++;
          }
        }

        results.push = successCount > 0
          ? `sent:${successCount}${failCount > 0 ? `,failed:${failCount}` : ''}`
          : 'failed';
      }
    }

    // ── Send SMS if enabled (order_updates only) ───────────────────────
    if (smsEnabled && category === 'order_updates') {
      try {
        // Get customer's phone number from profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('phone')
          .eq('id', customer_id)
          .maybeSingle();

        if (profile?.phone) {
          // Send SMS via Twilio or your SMS provider
          const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
          const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
          const twilioFrom = Deno.env.get('TWILIO_PHONE_NUMBER');

          if (twilioSid && twilioToken && twilioFrom) {
            const smsBody = `${title}: ${body}`;
            const formData = new URLSearchParams();
            formData.append('To', profile.phone);
            formData.append('From', twilioFrom);
            formData.append('Body', smsBody.substring(0, 1600)); // Twilio limit

            const smsResponse = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'Authorization': `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`
                },
                body: formData.toString()
              }
            );

            if (smsResponse.ok) {
              results.sms = 'sent';
            } else {
              const errText = await smsResponse.text();
              console.error('SMS send failed:', errText);
              results.sms = 'failed';
            }
          } else {
            console.warn('Twilio credentials not configured, SMS skipped');
            results.sms = 'not_configured';
          }
        } else {
          results.sms = 'no_phone';
        }
      } catch (smsErr) {
        console.error('SMS delivery error:', smsErr);
        results.sms = 'error';
      }
    }

    // ── Log notification dispatch ──────────────────────────────────────
    console.log(`Notification dispatched to customer ${customer_id}:`, {
      category,
      title,
      results
    });

    return new Response(
      JSON.stringify({
        success: true,
        customer_id,
        category,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('send-customer-notification error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


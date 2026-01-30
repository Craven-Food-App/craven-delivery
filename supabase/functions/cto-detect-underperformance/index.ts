import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

import { getCorsHeaders } from '../_shared/cors.ts';
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    console.log('🔍 Detecting underperformance...');

    // Get performance thresholds (with defaults if table doesn't exist)
    let velocityMin = 10;
    let prExpectedPerWeek = 2;
    let ticketDelayDays = 3;
    let overloadTicketCount = 5;

    try {
      const { data: thresholds, error: thresholdsError } = await supabaseAdmin
        .from('cto_performance_thresholds')
        .select('*')
        .eq('is_active', true);

      if (!thresholdsError && thresholds) {
        const thresholdMap = new Map(thresholds.map(t => [t.threshold_type, t.threshold_value]));
        velocityMin = thresholdMap.get('velocity_min') || 10;
        prExpectedPerWeek = thresholdMap.get('pr_expected_per_week') || 2;
        ticketDelayDays = thresholdMap.get('ticket_delay_days') || 3;
        overloadTicketCount = thresholdMap.get('overload_ticket_count') || 5;
      } else {
        console.warn('cto_performance_thresholds table not found, using default values');
      }
    } catch (error) {
      console.warn('Could not fetch performance thresholds, using defaults:', error);
    }

    // Get all active developers (without problematic join)
    const { data: developers, error: devError } = await supabaseAdmin
      .from('cto_developers')
      .select('*');

    if (devError) {
      console.error('Error fetching developers:', devError);
      // Return success but with 0 alerts if developers can't be fetched
      // This prevents 500 errors when table doesn't exist
      return new Response(
        JSON.stringify({ 
          success: true, 
          alerts_detected: 0,
          alerts_created: 0,
          emails_sent: 0,
          message: 'No developers found or table not accessible',
          alerts: []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user profiles separately if needed
    const userIds = (developers || []).map((dev: any) => dev.user_id).filter(Boolean);
    let userProfilesMap: Record<string, any> = {};
    
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('user_profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);
      
      if (profiles) {
        profiles.forEach((profile: any) => {
          userProfilesMap[profile.user_id] = profile;
        });
      }
    }

    const alerts: any[] = [];
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (const dev of developers || []) {
      const devId = dev.user_id;
      const profile = userProfilesMap[devId];

      // 1. Check velocity (from current sprint)
      const { data: activeSprint } = await supabaseAdmin
        .from('cto_sprints')
        .select('id')
        .eq('status', 'active')
        .single();

      if (activeSprint) {
        const { data: tickets } = await supabaseAdmin
          .from('cto_sprint_tickets')
          .select('story_points, status')
          .eq('sprint_id', activeSprint.id)
          .eq('assigned_to', devId);

        const completedPoints = tickets?.filter(t => t.status === 'done').reduce((sum, t) => sum + (t.story_points || 0), 0) || 0;
        const totalPoints = tickets?.reduce((sum, t) => sum + (t.story_points || 0), 0) || 0;
        const velocity = completedPoints;

        if (velocity < velocityMin && totalPoints > 0) {
          alerts.push({
            developer_id: devId,
            alert_type: 'low_velocity',
            severity: velocity < velocityMin * 0.5 ? 'critical' : 'high',
            title: `Low Sprint Velocity: ${velocity} points (threshold: ${velocityMin})`,
            description: `${profile?.full_name || devId} has completed only ${velocity} story points this sprint, below the minimum threshold of ${velocityMin}.`,
            metrics: { velocity, threshold: velocityMin, total_points: totalPoints },
            threshold_value: velocityMin,
            actual_value: velocity,
          });
        }
      }

      // 2. Check missed PRs (code reviews in last week)
      const { data: recentPRs } = await supabaseAdmin
        .from('cto_code_reviews')
        .select('id, status, created_at')
        .eq('author_id', devId)
        .gte('created_at', oneWeekAgo.toISOString());

      const prCount = recentPRs?.length || 0;
      if (prCount < prExpectedPerWeek) {
        alerts.push({
          developer_id: devId,
          alert_type: 'missed_pr',
          severity: prCount === 0 ? 'high' : 'medium',
          title: `Low PR Activity: ${prCount} PRs this week (expected: ${prExpectedPerWeek})`,
          description: `${profile?.full_name || devId} has created only ${prCount} pull request(s) in the last week, below the expected ${prExpectedPerWeek}.`,
          metrics: { pr_count: prCount, threshold: prExpectedPerWeek },
          threshold_value: prExpectedPerWeek,
          actual_value: prCount,
        });
      }

      // 3. Check delayed tickets
      const { data: delayedTickets } = await supabaseAdmin
        .from('cto_sprint_tickets')
        .select('id, ticket_number, title, created_at, status, estimated_hours')
        .eq('assigned_to', devId)
        .in('status', ['todo', 'in_progress', 'review', 'testing']);

      for (const ticket of delayedTickets || []) {
        const ticketAge = Math.floor((now.getTime() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60 * 24));
        if (ticketAge > ticketDelayDays) {
          alerts.push({
            developer_id: devId,
            alert_type: 'delayed_ticket',
            severity: ticketAge > ticketDelayDays * 2 ? 'critical' : 'high',
            title: `Delayed Ticket: ${ticket.ticket_number} (${ticketAge} days old)`,
            description: `Ticket "${ticket.title}" assigned to ${profile?.full_name || devId} has been in ${ticket.status} status for ${ticketAge} days, exceeding the ${ticketDelayDays}-day threshold.`,
            metrics: { ticket_id: ticket.id, ticket_number: ticket.ticket_number, days_delayed: ticketAge },
            threshold_value: ticketDelayDays,
            actual_value: ticketAge,
          });
        }
      }

      // 4. Check overload (too many active tickets)
      const { data: activeTickets } = await supabaseAdmin
        .from('cto_sprint_tickets')
        .select('id')
        .eq('assigned_to', devId)
        .in('status', ['todo', 'in_progress', 'review', 'testing', 'blocked']);

      const activeCount = activeTickets?.length || 0;
      if (activeCount > overloadTicketCount) {
        alerts.push({
          developer_id: devId,
          alert_type: 'overloaded',
          severity: activeCount > overloadTicketCount * 1.5 ? 'critical' : 'high',
          title: `Developer Overloaded: ${activeCount} active tickets (threshold: ${overloadTicketCount})`,
          description: `${profile?.full_name || devId} has ${activeCount} active tickets, exceeding the recommended maximum of ${overloadTicketCount}. Consider redistributing tasks.`,
          metrics: { active_tickets: activeCount, threshold: overloadTicketCount },
          threshold_value: overloadTicketCount,
          actual_value: activeCount,
        });
      }
    }

    // Insert alerts (avoid duplicates by checking existing active alerts)
    const insertedAlerts: any[] = [];
    for (const alert of alerts) {
      const { data: existing } = await supabaseAdmin
        .from('cto_performance_alerts')
        .select('id')
        .eq('developer_id', alert.developer_id)
        .eq('alert_type', alert.alert_type)
        .eq('status', 'active')
        .maybeSingle();

      if (!existing) {
        const { data: newAlert, error: insertError } = await supabaseAdmin
          .from('cto_performance_alerts')
          .insert(alert)
          .select()
          .single();

        if (!insertError && newAlert) {
          insertedAlerts.push(newAlert);
        }
      }
    }

    // Send emails for new alerts
    const emailResults = [];
    for (const alert of insertedAlerts) {
      try {
        // Get developer email from user_profiles map
        const devProfile = userProfilesMap[alert.developer_id];
        const devEmail = devProfile?.email;

        if (devEmail) {
          // Get CTO email (fetch separately to avoid join issues)
          const { data: cto } = await supabaseAdmin
            .from('exec_users')
            .select('user_id')
            .eq('role', 'cto')
            .single();

          let ctoEmail = 'cto@cravenusa.com';
          if (cto?.user_id) {
            const { data: ctoProfile } = await supabaseAdmin
              .from('user_profiles')
              .select('email')
              .eq('user_id', cto.user_id)
              .single();
            ctoEmail = ctoProfile?.email || 'cto@cravenusa.com';
          }

          // Send email via Resend
          const resendApiKey = Deno.env.get('RESEND_API_KEY');
          if (resendApiKey) {
            const emailResponse = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendApiKey}`,
              },
              body: JSON.stringify({
                from: 'CTO Portal <noreply@cravenusa.com>',
                to: [devEmail, ctoEmail],
                subject: `⚠️ Performance Alert: ${alert.title}`,
                html: `
                  <h2>Performance Alert</h2>
                  <p><strong>Type:</strong> ${alert.alert_type.replace('_', ' ').toUpperCase()}</p>
                  <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
                  <p><strong>Developer:</strong> ${devProfile?.full_name || devEmail}</p>
                  <p><strong>Description:</strong> ${alert.description}</p>
                  <p><strong>Metrics:</strong></p>
                  <pre>${JSON.stringify(alert.metrics, null, 2)}</pre>
                  <p>Please review and take appropriate action.</p>
                `,
              }),
            });

            if (emailResponse.ok) {
              await supabaseAdmin
                .from('cto_performance_alerts')
                .update({ email_sent: true, email_sent_at: new Date().toISOString() })
                .eq('id', alert.id);

              emailResults.push({ alert_id: alert.id, status: 'sent' });
            }
          }
        }
      } catch (emailError) {
        console.error('Error sending email for alert:', emailError);
        emailResults.push({ alert_id: alert.id, status: 'failed', error: (emailError as Error).message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        alerts_detected: alerts.length,
        alerts_created: insertedAlerts.length,
        emails_sent: emailResults.filter(r => r.status === 'sent').length,
        alerts: insertedAlerts,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error detecting underperformance:', error);
    // Return success with error message to prevent 500 errors
    // Frontend can handle this gracefully
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Internal server error',
        alerts_detected: 0,
        alerts_created: 0,
        emails_sent: 0,
        alerts: []
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});



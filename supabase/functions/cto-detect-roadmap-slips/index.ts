import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    console.log('⚠️ Detecting roadmap slips...');

    const now = new Date();
    const alerts: any[] = [];

    // Get all active initiatives
    const { data: initiatives, error: initError } = await supabaseAdmin
      .from('cto_roadmap_initiatives')
      .select('*')
      .in('status', ['in-progress', 'planned'])
      .not('target_end_date', 'is', null);

    if (initError) throw initError;

    for (const initiative of initiatives || []) {
      const targetDate = new Date(initiative.target_end_date);
      const daysUntilTarget = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const daysBehind = daysUntilTarget < 0 ? Math.abs(daysUntilTarget) : 0;

      // Calculate expected progress based on time elapsed
      if (initiative.start_date) {
        const startDate = new Date(initiative.start_date);
        const totalDays = Math.ceil((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysElapsed = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const expectedProgress = totalDays > 0 ? Math.round((daysElapsed / totalDays) * 100) : 0;
        const actualProgress = initiative.progress_percentage || 0;
        const progressGap = expectedProgress - actualProgress;

        // Determine health score
        let healthScore = 'on_track';
        let severity = 'low';

        if (initiative.status === 'blocked') {
          healthScore = 'blocked';
        } else if (daysBehind > 7 || progressGap > 20) {
          healthScore = 'off_track';
          severity = daysBehind > 14 || progressGap > 40 ? 'critical' : 'high';
        } else if (daysBehind > 3 || progressGap > 10) {
          healthScore = 'at_risk';
          severity = 'medium';
        }

        // Update health score
        await supabaseAdmin
          .from('cto_roadmap_initiatives')
          .update({
            health_score: healthScore,
            days_behind_schedule: daysBehind,
            slip_detected_at: (daysBehind > 0 || progressGap > 10) ? now.toISOString() : null,
          })
          .eq('id', initiative.id);

        // Create alert if slipping
        if (daysBehind > 0 || progressGap > 10) {
          // Check if alert already exists
          const { data: existingAlert } = await supabaseAdmin
            .from('cto_roadmap_slip_alerts')
            .select('id')
            .eq('initiative_id', initiative.id)
            .eq('resolved', false)
            .maybeSingle();

          if (!existingAlert) {
            const alertMessage = daysBehind > 0
              ? `Initiative "${initiative.title}" is ${daysBehind} day(s) behind schedule (target: ${targetDate.toLocaleDateString()})`
              : `Initiative "${initiative.title}" is behind expected progress (${actualProgress}% vs ${expectedProgress}% expected)`;

            const { data: newAlert, error: alertError } = await supabaseAdmin
              .from('cto_roadmap_slip_alerts')
              .insert({
                initiative_id: initiative.id,
                days_behind: daysBehind,
                severity,
                alert_message: alertMessage,
              })
              .select()
              .single();

            if (!alertError && newAlert) {
              alerts.push(newAlert);

              // Send escalation email to CTO if not already sent
              if (!initiative.escalation_sent && (severity === 'high' || severity === 'critical')) {
                const { data: cto } = await supabaseAdmin
                  .from('exec_users')
                  .select('user_profiles:user_id (email)')
                  .eq('role', 'cto')
                  .single();

                const ctoProfile = Array.isArray(cto?.user_profiles) ? cto.user_profiles[0] : cto?.user_profiles;
                const ctoEmail = ctoProfile?.email || 'cto@cravenusa.com';

                const resendApiKey = Deno.env.get('RESEND_API_KEY');
                if (resendApiKey) {
                  await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${resendApiKey}`,
                    },
                    body: JSON.stringify({
                      from: 'CTO Portal <noreply@cravenusa.com>',
                      to: ctoEmail,
                      subject: `🚨 Roadmap Alert: ${initiative.title} is ${severity === 'critical' ? 'CRITICALLY' : ''} Behind Schedule`,
                      html: `
                        <h2>Roadmap Initiative Slip Detected</h2>
                        <p><strong>Initiative:</strong> ${initiative.title}</p>
                        <p><strong>Severity:</strong> ${severity.toUpperCase()}</p>
                        <p><strong>Days Behind:</strong> ${daysBehind}</p>
                        <p><strong>Progress Gap:</strong> ${progressGap}% (${actualProgress}% actual vs ${expectedProgress}% expected)</p>
                        <p><strong>Target Date:</strong> ${targetDate.toLocaleDateString()}</p>
                        <p><strong>Health Score:</strong> ${healthScore.replace('_', ' ').toUpperCase()}</p>
                        <p>Please review and take appropriate action.</p>
                      `,
                    }),
                  });

                  await supabaseAdmin
                    .from('cto_roadmap_initiatives')
                    .update({
                      escalation_sent: true,
                      escalation_sent_at: now.toISOString(),
                    })
                    .eq('id', initiative.id);
                }
              }
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        alerts_created: alerts.length,
        alerts,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error detecting roadmap slips:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});



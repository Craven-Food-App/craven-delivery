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

    console.log('📊 Running workforce planning analysis...');

    // Get active sprint
    const { data: activeSprint, error: sprintError } = await supabaseAdmin
      .from('cto_sprints')
      .select('*')
      .eq('status', 'active')
      .single();

    if (sprintError && sprintError.code !== 'PGRST116') throw sprintError;

    if (!activeSprint) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active sprint found',
          prediction: null 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all tickets in active sprint
    const { data: tickets, error: ticketsError } = await supabaseAdmin
      .from('cto_sprint_tickets')
      .select('*')
      .eq('sprint_id', activeSprint.id);

    if (ticketsError) throw ticketsError;

    // Calculate current progress
    const totalPoints = tickets?.reduce((sum, t) => sum + (t.story_points || 0), 0) || 0;
    const completedPoints = tickets?.filter(t => t.status === 'done').reduce((sum, t) => sum + (t.story_points || 0), 0) || 0;
    const inProgressPoints = tickets?.filter(t => ['in_progress', 'review', 'testing'].includes(t.status)).reduce((sum, t) => sum + (t.story_points || 0), 0) || 0;
    const remainingPoints = totalPoints - completedPoints;

    // Calculate sprint progress percentage
    const sprintStart = new Date(activeSprint.start_date);
    const sprintEnd = new Date(activeSprint.end_date);
    const now = new Date();
    const totalDays = Math.ceil((sprintEnd.getTime() - sprintStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.max(0, Math.ceil((now.getTime() - sprintStart.getTime()) / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.max(0, totalDays - daysElapsed);
    const progressPercentage = totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0;

    // Calculate velocity (points per day)
    const currentVelocity = daysElapsed > 0 ? completedPoints / daysElapsed : 0;
    const requiredVelocity = daysRemaining > 0 ? remainingPoints / daysRemaining : 0;

    // Predict burn rate and completion
    const predictedBurnRate = currentVelocity || (totalPoints / totalDays); // points per day
    const predictedDaysToComplete = remainingPoints > 0 && predictedBurnRate > 0 
      ? Math.ceil(remainingPoints / predictedBurnRate) 
      : daysRemaining;
    const predictedCompletionDate = new Date(now.getTime() + predictedDaysToComplete * 24 * 60 * 60 * 1000);

    // Detect staffing gaps
    const velocityGap = requiredVelocity - currentVelocity;
    const staffingGapDetected = velocityGap > 2; // If we need >2 points/day more than current
    const recommendedHiringCount = staffingGapDetected ? Math.ceil(velocityGap / 5) : 0; // Assume 5 points/day per dev

    // Determine recommended roles based on ticket types
    const ticketTypes = tickets?.map(t => t.ticket_type) || [];
    const needsBackend = ticketTypes.filter(t => ['backend', 'api', 'database'].includes(t)).length > ticketTypes.length * 0.4;
    const needsFrontend = ticketTypes.filter(t => ['frontend', 'ui', 'mobile'].includes(t)).length > ticketTypes.length * 0.4;
    const recommendedRoles: string[] = [];
    if (needsBackend) recommendedRoles.push('Backend Engineer');
    if (needsFrontend) recommendedRoles.push('Frontend Engineer');
    if (!needsBackend && !needsFrontend) recommendedRoles.push('Full Stack Engineer');

    // Calculate confidence score (based on data quality)
    let confidenceScore = 70; // Base confidence
    if (daysElapsed >= 3) confidenceScore += 10; // More data = higher confidence
    if (tickets && tickets.length >= 10) confidenceScore += 10;
    if (completedPoints > 0) confidenceScore += 10;
    confidenceScore = Math.min(100, confidenceScore);

    // Create prediction record
    const { data: prediction, error: predError } = await supabaseAdmin
      .from('cto_workforce_predictions')
      .upsert({
        prediction_date: new Date().toISOString().split('T')[0],
        sprint_id: activeSprint.id,
        predicted_burn_rate: predictedBurnRate,
        predicted_completion_date: predictedCompletionDate.toISOString().split('T')[0],
        staffing_gap_detected: staffingGapDetected,
        recommended_hiring_count: recommendedHiringCount,
        recommended_roles: recommendedRoles,
        confidence_score: confidenceScore,
        reasoning: `Current velocity: ${currentVelocity.toFixed(2)} points/day. Required: ${requiredVelocity.toFixed(2)} points/day. Gap: ${velocityGap.toFixed(2)} points/day. ${daysRemaining} days remaining.`,
      }, {
        onConflict: 'prediction_date,sprint_id',
      })
      .select()
      .single();

    if (predError) throw predError;

    return new Response(
      JSON.stringify({
        success: true,
        prediction: {
          ...prediction,
          current_velocity: currentVelocity,
          required_velocity: requiredVelocity,
          velocity_gap: velocityGap,
          progress_percentage: progressPercentage,
          days_remaining: daysRemaining,
          total_points: totalPoints,
          completed_points: completedPoints,
          remaining_points: remainingPoints,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in workforce planning:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});



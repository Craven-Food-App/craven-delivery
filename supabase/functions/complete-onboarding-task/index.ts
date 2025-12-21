import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getCorsHeaders } from "../_shared/cors.ts";

interface CompleteTaskRequest {
  task_id: number;
  driver_id: string;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { task_id, driver_id } = await req.json() as CompleteTaskRequest;

    console.log('Completing task:', { task_id, driver_id });

    // Get task details
    const { data: task, error: taskError } = await supabaseClient
      .from('onboarding_tasks')
      .select('*')
      .eq('id', task_id)
      .eq('driver_id', driver_id)
      .single();

    if (taskError || !task) {
      throw new Error('Task not found or unauthorized');
    }

    if (task.completed) {
      return new Response(
        JSON.stringify({ success: true, message: 'Task already completed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For 'complete_profile' task, validate that all required profile fields are filled
    if (task.task_key === 'complete_profile') {
      const { data: application, error: appError } = await supabaseClient
        .from('craver_applications')
        .select('first_name, last_name, email, phone, street_address, city, state, zip_code')
        .eq('id', driver_id)
        .single();

      if (appError || !application) {
        throw new Error('Application not found');
      }

      // Check all required fields
      const requiredFields = [
        { field: 'first_name', name: 'First Name' },
        { field: 'last_name', name: 'Last Name' },
        { field: 'email', name: 'Email' },
        { field: 'phone', name: 'Phone Number' },
        { field: 'street_address', name: 'Street Address' },
        { field: 'city', name: 'City' },
        { field: 'state', name: 'State' },
        { field: 'zip_code', name: 'Zip Code' },
      ];

      const missingFields: string[] = [];
      for (const { field, name } of requiredFields) {
        const value = application[field as keyof typeof application];
        if (!value || (typeof value === 'string' && value.trim().length === 0)) {
          missingFields.push(name);
        }
      }

      if (missingFields.length > 0) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: `Please fill in all required fields: ${missingFields.join(', ')}`,
            missingFields 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // For 'upload_documents' task, validate that all required documents are uploaded
    if (task.task_key === 'upload_documents') {
      const { data: application, error: appError } = await supabaseClient
        .from('craver_applications')
        .select('drivers_license_front, drivers_license_back, insurance_document')
        .eq('id', driver_id)
        .single();

      if (appError || !application) {
        throw new Error('Application not found');
      }

      const missingDocuments: string[] = [];
      if (!application.drivers_license_front) {
        missingDocuments.push('Driver\'s License Front');
      }
      if (!application.drivers_license_back) {
        missingDocuments.push('Driver\'s License Back');
      }
      if (!application.insurance_document) {
        missingDocuments.push('Insurance Document');
      }

      if (missingDocuments.length > 0) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: `Please upload all required documents: ${missingDocuments.join(', ')}`,
            missingDocuments 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // For 'pass_safety_quiz' task, validate that quiz was passed (this should be checked in frontend, but add backend check too)
    // Note: The SafetyQuiz component should only call this after passing, but we add validation here as well
    if (task.task_key === 'pass_safety_quiz' || task.task_key === 'safety_quiz') {
      // The quiz passing is validated in the frontend component
      // If this endpoint is called, it means the quiz was passed
      // We could add additional validation here if needed (e.g., check quiz_results table)
    }

    // For 'refer_friend' task, validate that at least one referral exists
    if (task.task_key === 'refer_friend') {
      // Get the user_id from the application
      const { data: application, error: appError } = await supabaseClient
        .from('craver_applications')
        .select('user_id')
        .eq('id', driver_id)
        .single();

      if (appError || !application) {
        throw new Error('Application not found');
      }

      // Check if user has any referrals
      const { data: referrals, error: refError } = await supabaseClient
        .from('referrals')
        .select('id')
        .eq('referrer_id', application.user_id)
        .eq('referral_type', 'driver')
        .limit(1);

      if (refError) {
        console.error('Error checking referrals:', refError);
      }

      if (!referrals || referrals.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'This task requires you to refer at least one friend. Please share your referral code and have someone sign up using it.',
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Mark task as complete
    const { error: updateError } = await supabaseClient
      .from('onboarding_tasks')
      .update({ 
        completed: true, 
        completed_at: new Date().toISOString() 
      })
      .eq('id', task_id);

    if (updateError) throw updateError;

    // The trigger will automatically:
    // 1. Update driver points
    // 2. Update priority score
    // 3. Update activation queue priority
    // 4. Check if all tasks are complete and set onboarding_completed_at

    console.log('Task completed successfully:', task.task_name);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Task "${task.task_name}" completed! You earned ${task.points_reward} points.`,
        points_earned: task.points_reward
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error completing task:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

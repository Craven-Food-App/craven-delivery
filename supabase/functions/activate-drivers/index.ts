import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActivateDriversRequest {
  driver_ids: string[]; // Array of craver_application IDs
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { driver_ids } = await req.json() as ActivateDriversRequest;

    console.log('Activating drivers:', driver_ids);

    const results = [];

    for (const driverId of driver_ids) {
      try {
        // Get the application with user_id
        const { data: application, error: appError } = await supabaseClient
          .from('craver_applications')
          .select('user_id, first_name, last_name, email, vehicle_type, vehicle_make, vehicle_model, vehicle_year, license_plate')
          .eq('id', driverId)
          .single();

        if (appError || !application) {
          console.error('Error getting application:', appError);
          results.push({ driver_id: driverId, success: false, error: 'Application not found' });
          continue;
        }

        // Update craver_applications to 'approved' status
        const { error: updateError } = await supabaseClient
          .from('craver_applications')
          .update({
            status: 'approved',
            background_check: true,
            background_check_approved_at: new Date().toISOString()
          })
          .eq('id', driverId);

        if (updateError) {
          console.error('Error updating application:', updateError);
          results.push({ driver_id: driverId, success: false, error: updateError.message });
          continue;
        }

        // Generate or get password for the user
        let presetPassword: string | null = null;
        
        // Generate a random password
        const generatePassword = () => {
          const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
          const lowercase = 'abcdefghijkmnpqrstuvwxyz';
          const numbers = '23456789';
          const specialChars = '!@#$%&*';
          
          const getRandomChar = (chars: string) => chars[Math.floor(Math.random() * chars.length)];
          const getRandomString = (length: number, chars: string) => {
            return Array.from({ length }, () => getRandomChar(chars)).join('');
          };
          
          const part1 = getRandomString(4, uppercase + lowercase);
          const num1 = getRandomString(3, numbers);
          const special = getRandomChar(specialChars);
          const part2 = getRandomString(3, uppercase + lowercase);
          const num2 = getRandomString(2, numbers);
          
          return `${part1}${num1}${special}${part2}${num2}`;
        };
        
        try {
          // Check if user has an auth account
          const { data: authUsers, error: authListError } = await supabaseClient.auth.admin.listUsers();
          
          let userExists = false;
          let userId: string | null = null;
          
          if (!authListError && authUsers) {
            const existingUser = authUsers.users.find(u => u.email === application.email);
            if (existingUser) {
              userExists = true;
              userId = existingUser.id;
            }
          }
          
          presetPassword = generatePassword();
          
          if (userExists && userId) {
            // Update existing user's password
            const { error: updatePasswordError } = await supabaseClient.auth.admin.updateUserById(
              userId,
              { password: presetPassword }
            );
            
            if (updatePasswordError) {
              console.error('Error updating user password:', updatePasswordError);
            } else {
              console.log('Password updated for existing user:', application.email);
            }
            
            // Mark user as needing password reset
            await supabaseClient
              .from('user_profiles')
              .update({ needs_password_reset: true })
              .eq('user_id', userId);
          } else {
            // Create new auth account
            const { data: newUser, error: signUpError } = await supabaseClient.auth.admin.createUser({
              email: application.email,
              password: presetPassword,
              email_confirm: true,
              user_metadata: {
                first_name: application.first_name,
                last_name: application.last_name,
                user_type: 'driver'
              }
            });
            
            if (signUpError) {
              console.error('Error creating auth account:', signUpError);
            } else if (newUser.user) {
              console.log('Auth account created for:', application.email);
              userId = newUser.user.id;
              
              // Ensure user profile exists and mark for password reset
              await supabaseClient
                .from('user_profiles')
                .upsert({
                  user_id: newUser.user.id,
                  email: application.email,
                  role: 'driver',
                  needs_password_reset: true
                }, { onConflict: 'user_id' });
            }
          }
        } catch (passwordError) {
          console.error('Error managing user password:', passwordError);
          // Continue anyway, we'll still send the email
        }

        // Send approval email
        let emailSent = false;
        let emailError: string | null = null;
        
        try {
          const emailResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-approval-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              driverName: `${application.first_name} ${application.last_name}`,
              driverEmail: application.email,
              applicationId: driverId,
              presetPassword: presetPassword,
            }),
          });

          const emailData = await emailResponse.json();
          
          if (!emailResponse.ok) {
            console.error('Email sending failed:', emailData);
            emailError = emailData.error || 'Email sending failed';
          } else {
            console.log('Email sent successfully to:', application.email);
            emailSent = true;
          }
        } catch (emailErr) {
          console.error('Email sending error:', emailErr);
          emailError = emailErr instanceof Error ? emailErr.message : 'Unknown error';
        }

        // Remove from activation_queue
        await supabaseClient
          .from('activation_queue')
          .delete()
          .eq('driver_id', driverId);

        results.push({ 
          driver_id: driverId, 
          success: true, 
          email: application.email,
          name: `${application.first_name} ${application.last_name}`,
          email_sent: emailSent,
          email_error: emailError
        });

        console.log('Driver activated successfully:', application.email);
      } catch (error) {
        console.error('Error processing driver:', driverId, error);
        results.push({ driver_id: driverId, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        activated_count: successCount,
        total: driver_ids.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error activating drivers:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

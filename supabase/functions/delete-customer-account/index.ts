import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // First, verify the user with their token
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) {
      console.error('User verification failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    const userEmail = user.email;
    console.log(`Processing account deletion for user: ${userId} (${userEmail})`);

    // Use service role client to delete user data
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Delete related data in proper order (respecting foreign keys)
    // Note: Some tables may not exist or may have cascading deletes, so we catch errors
    
    const tablesToClean = [
      { table: 'customer_favorites', column: 'customer_id' },
      { table: 'delivery_addresses', column: 'user_id' },
      { table: 'payment_methods', column: 'user_id' },
      { table: 'customer_notifications', column: 'user_id' },
      { table: 'customer_credits', column: 'user_id' },
      { table: 'referral_codes', column: 'user_id' },
      { table: 'referral_uses', column: 'referred_user_id' },
      { table: 'cravemore_subscriptions', column: 'user_id' },
      { table: 'user_profiles', column: 'user_id' },
    ];

    for (const { table, column } of tablesToClean) {
      try {
        const { error } = await adminClient
          .from(table)
          .delete()
          .eq(column, userId);
        
        if (error) {
          console.log(`Note: Could not delete from ${table}: ${error.message}`);
        } else {
          console.log(`Deleted user data from ${table}`);
        }
      } catch (err) {
        console.log(`Skipping ${table}: table may not exist`);
      }
    }

    // Mark orders as belonging to deleted user (don't delete for business records)
    try {
      const { error: orderError } = await adminClient
        .from('orders')
        .update({ 
          customer_id: null,
          delivery_notes: `[DELETED USER: ${userEmail}]`
        })
        .eq('customer_id', userId);
      
      if (orderError) {
        console.log(`Note: Could not update orders: ${orderError.message}`);
      } else {
        console.log('Updated orders to remove user reference');
      }
    } catch (err) {
      console.log('Skipping orders update');
    }

    // Create audit log entry before deletion
    try {
      await adminClient
        .from('audit_logs')
        .insert({
          operation: 'DELETE',
          table_name: 'auth.users',
          details: { 
            action: 'customer_account_deletion',
            user_email: userEmail,
            deleted_at: new Date().toISOString()
          },
          user_id: userId,
          timestamp: new Date().toISOString()
        });
    } catch (err) {
      console.log('Could not create audit log');
    }

    // Finally, delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting auth user:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete account. Please contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully deleted account for user: ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Your account has been permanently deleted.' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Account deletion error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

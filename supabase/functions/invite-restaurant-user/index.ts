import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from "https://esm.sh/resend@4.0.0"
import { getCorsHeaders } from "../_shared/cors.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      throw new Error('Unauthorized')
    }

    const { restaurantId, email, role, firstName, lastName } = await req.json()

    // Verify user owns the restaurant
    const { data: restaurant } = await supabaseClient
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .eq('owner_id', user.id)
      .single()

    if (!restaurant) {
      throw new Error('Restaurant not found or unauthorized')
    }

    // Create user invitation
    const { data: invitation, error: inviteError } = await supabaseClient
      .from('restaurant_users')
      .insert({
        restaurant_id: restaurantId,
        email: email,
        role: role,
        first_name: firstName,
        last_name: lastName,
        invited_by: user.id,
        status: 'pending'
      })
      .select()
      .single()

    if (inviteError) throw inviteError

    // Send invitation email
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
    
    await resend.emails.send({
      from: Deno.env.get('RESEND_FROM_EMAIL') || 'Crave\'N <onboarding@resend.dev>',
      to: [email],
      subject: `You've been invited to join ${restaurant.name} on Crave'N`,
      html: `
        <h1>You've been invited!</h1>
        <p>Hi ${firstName || 'there'},</p>
        <p>You've been invited to join <strong>${restaurant.name}</strong> on Crave'N as a ${role}.</p>
        <p>Click the link below to accept your invitation:</p>
        <a href="${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${invitation.id}&type=invite">Accept Invitation</a>
        <p>Best regards,<br>The Crave'N Team</p>
      `,
    })

    return new Response(
      JSON.stringify({ success: true, invitation }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error inviting user:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
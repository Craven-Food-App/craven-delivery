import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, email } = await req.json();

    if (!phone || !email) {
      return new Response(
        JSON.stringify({ error: "Phone and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Generate 5-digit verification code
    const code = Math.floor(10000 + Math.random() * 90000).toString();

    // Clean up old verifications for this phone/email or expired ones
    const now = new Date().toISOString();
    await supabase
      .from("phone_verifications")
      .delete()
      .or(`phone.eq.${phone},expires_at.lt.${now}`);

    // Insert new verification code
    const { error: insertError } = await supabase
      .from("phone_verifications")
      .insert({
        phone,
        email,
        code,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      });

    if (insertError) {
      throw insertError;
    }

    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    // For now, we'll log the code. In production, send via SMS
    console.log(`Verification code for ${phone}: ${code}`);
    
    // In development, return the code for testing. Remove in production!
    const isDevelopment = Deno.env.get("ENVIRONMENT") === "development" || !Deno.env.get("TWILIO_ACCOUNT_SID");
    
    // In production, uncomment and configure:
    if (!isDevelopment && Deno.env.get("TWILIO_ACCOUNT_SID")) {
      /*
      const twilio = await import("https://esm.sh/twilio@4.19.0");
      const client = twilio.default(
        Deno.env.get("TWILIO_ACCOUNT_SID"),
        Deno.env.get("TWILIO_AUTH_TOKEN")
      );
      
      await client.messages.create({
        body: `Your Crave'n verification code is: ${code}`,
        from: Deno.env.get("TWILIO_PHONE_NUMBER"),
        to: phone,
      });
      */
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Verification code sent",
        // Only return code in development for testing
        ...(isDevelopment && { code })
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending verification code:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send verification code" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


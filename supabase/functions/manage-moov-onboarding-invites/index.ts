import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  listMoovOnboardingInvites,
  getMoovOnboardingInvite,
  revokeMoovOnboardingInvite,
  getMoovConfig,
} from "../_shared/moov.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const code = pathParts[pathParts.length - 1] || url.searchParams.get("code");

    const moovConfig = getMoovConfig();

    // Handle different HTTP methods
    if (req.method === "GET") {
      if (code && code !== "invites") {
        // Get specific invite by code
        const invite = await getMoovOnboardingInvite(code, moovConfig);
        return new Response(JSON.stringify(invite), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } else {
        // List all invites
        const invites = await listMoovOnboardingInvites(moovConfig);
        return new Response(JSON.stringify({ invites }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    } else if (req.method === "DELETE") {
      if (!code || code === "invites") {
        return new Response(
          JSON.stringify({ error: "Invite code is required for deletion" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      // Revoke the invite
      await revokeMoovOnboardingInvite(code, moovConfig);

      // Update database if this invite is associated with a restaurant
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("moov_onboarding_invite_code", code)
        .maybeSingle();

      if (restaurant) {
        await supabase
          .from("restaurants")
          .update({
            moov_onboarding_invite_code: null,
            moov_onboarding_status: "revoked",
            updated_at: new Date().toISOString(),
          })
          .eq("id", restaurant.id);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Invite revoked" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 405,
        }
      );
    }
  } catch (error) {
    console.error("Error managing Moov onboarding invites:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});


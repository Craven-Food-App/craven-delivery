import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getGoogleWorkspaceConfig, sendGoogleWorkspaceEmail } from "../_shared/googleWorkspaceEmail.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

type SendIboePayload = {
  to: string;
  subject: string;
  html: string;
  metadata?: Record<string, unknown>;
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: SendIboePayload = await req.json();

    if (!payload?.to || !payload?.subject || !payload?.html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config = await getGoogleWorkspaceConfig();
    const fromEmail = config.treasuryFrom ?? config.defaultFrom ?? "Crave'n Treasury <treasury@cravenusa.com>";

    const metadataHeaders = payload.metadata
      ? Object.fromEntries(
        Object.entries(payload.metadata).map(([key, value]) => [`X-Craven-Meta-${key}`, String(value ?? '')]),
      )
      : undefined;

    const response = await sendGoogleWorkspaceEmail({
      from: fromEmail,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      headers: metadataHeaders,
    });

    return new Response(
      JSON.stringify({ success: true, id: response.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Unhandled error sending IBOE:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

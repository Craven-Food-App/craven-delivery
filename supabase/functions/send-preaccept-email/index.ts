// @ts-nocheck
// Pre-acceptance notification email placeholder.
// In production, integrate with your SMTP/Send provider.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  try {
    const { candidateEmail, candidateName, namedEmail, roleAlias, position } = await req.json();
    console.log('send-preaccept-email', { candidateEmail, candidateName, namedEmail, roleAlias, position });
    // TODO: send via provider
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'bad_request' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
});



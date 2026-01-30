// @ts-nocheck
// Scaffold for Microsoft Graph delta sync jobs (pull new/changed messages)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  try {
    const { mailbox } = await req.json();
    if (!mailbox) return new Response('Bad Request', { status: 400 });
    // TODO: Use client credentials to call Graph /users/{mailbox}/messages/delta
    // Map to local MessageCenter tables
    return new Response(JSON.stringify({ ok: true, mailbox }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'bad_request' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
});



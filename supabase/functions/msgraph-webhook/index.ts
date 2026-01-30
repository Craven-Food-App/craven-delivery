// @ts-nocheck
// Microsoft Graph change notification webhook (validation + notifications)
// Expects GET validation with `validationToken`, and POST notifications payloads

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  const { method } = req;
  const url = new URL(req.url);

  // Validation handshake
  const validationToken = url.searchParams.get("validationToken");
  if (method === "GET" && validationToken) {
    return new Response(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  if (method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const body = await req.json();
    // Basic schema: value: [ { resource, subscriptionId, changeType, ... } ]
    const notifications = Array.isArray(body?.value) ? body.value : [];
    // For now, just log; in production, enqueue jobs to fetch deltas via Graph
    console.log("Graph notifications received", notifications.length);
    return new Response(JSON.stringify({ ok: true }), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error", e);
    return new Response(JSON.stringify({ error: "bad_request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});



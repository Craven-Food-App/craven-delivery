import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });
  }

  const url = new URL(req.url);
  const to = url.searchParams.get("to");
  const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER") ?? "";

  if (!to?.trim()) {
    const errXml = '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Missing number.</Say><Hangup/></Response>';
    return new Response(errXml, { status: 200, headers: { "Content-Type": "text/xml" } });
  }

  const toEsc = escapeXml(to.trim());
  const fromEsc = escapeXml(fromNumber);
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${fromEsc}" timeout="30">${toEsc}</Dial>
  <Say>The other party could not be reached. Goodbye.</Say>
  <Hangup/>
</Response>`;

  return new Response(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
});

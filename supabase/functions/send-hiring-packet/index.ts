// @ts-nocheck
// Generate and send hiring packet links; store status records
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { getCorsHeaders } from "../_shared/cors.ts";

interface HiringPacketRequest {
  candidateEmail: string;
  candidateName: string;
  state: string; // e.g., OH
  packetType: 'employee' | 'contractor' | 'executive' | string;
  docs: Array<{ label: string; required?: boolean; url?: string } | string>;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateEmail, candidateName, state, packetType, docs }: HiringPacketRequest = await req.json();

    if (!candidateEmail || !candidateName) {
      throw new Error("Missing candidateEmail or candidateName");
    }

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Crave'N <onboarding@resend.dev>";

    const normalizedDocs = (docs || []).map((d: any) => {
      if (typeof d === 'string') return { label: d, required: true };
      return { label: d.label, required: !!d.required, url: d.url };
    });

    const docsList = normalizedDocs.map((d) => `
      <li style="margin: 6px 0;">
        ${d.required ? "<strong>[Required]</strong>" : "[Optional]"} ${d.label}
        ${d.url ? ` — <a href="${d.url}" target="_blank">Download</a>` : ""}
      </li>
    `).join("");

    const subject = `Your ${packetType === 'executive' ? 'Executive ' : ''}Hiring Packet`;

    await resend.emails.send({
      from: fromEmail,
      to: [candidateEmail],
      subject,
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: -apple-system, Segoe UI, Roboto, Arial; background: #f8fafc; padding: 24px;">
            <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); overflow: hidden;">
              <div style="background: linear-gradient(135deg, #ff6b00 0%, #ff8c00 100%); color: #fff; padding: 24px;">
                <h1 style="margin:0; font-size: 22px;">Welcome, ${candidateName}!</h1>
                <div style="opacity: 0.9; font-size: 14px; margin-top: 8px;">${packetType.toUpperCase()} — ${state}</div>
              </div>
              <div style="padding: 24px; color: #0f172a;">
                <p style="margin-top:0;">Please review the following documents and complete any required items:</p>
                <ul style="padding-left: 18px;">${docsList}</ul>
                <p>If you have questions, reply to this email.</p>
              </div>
              <div style="padding: 16px 24px; background: #f1f5f9; color: #334155; font-size: 12px;">Crave'N • Hiring & Onboarding</div>
            </div>
          </body>
        </html>
      `,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("send-hiring-packet error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});



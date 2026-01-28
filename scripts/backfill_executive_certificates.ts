import { createClient } from "@supabase/supabase-js";

/**
 * Backfill script:
 * Regenerates existing executive share_certificates using the updated
 * stock_certificate template via the governance-generate-certificate
 * Edge Function.
 *
 * Usage (from project root, with env set):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   npx ts-node scripts/backfill_executive_certificates.ts
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  process.exit(1);
}

async function main() {
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Fetch all issued share_certificates that have a recipient_user_id
  const { data: certs, error } = await sb
    .from("share_certificates")
    .select(
      "id, recipient_user_id, shares_amount, share_class, resolution_id, appointment_id, certificate_number, status",
    )
    .eq("status", "issued");

  if (error) {
    console.error("Error loading share_certificates:", error);
    process.exit(1);
  }

  if (!certs || certs.length === 0) {
    console.log("No issued share_certificates found for backfill.");
    return;
  }

  console.log(`Backfilling ${certs.length} executive certificates...`);

  for (const cert of certs) {
    if (!cert.recipient_user_id || !cert.shares_amount) {
      console.warn(
        "Skipping certificate without recipient_user_id or shares_amount:",
        cert.id,
      );
      continue;
    }

    console.log(`Regenerating certificate ${cert.id} (${cert.certificate_number})`);

    const { data, error: fnError } = await sb.functions.invoke(
      "governance-generate-certificate",
      {
        body: {
          recipient_user_id: cert.recipient_user_id,
          shares_amount: cert.shares_amount,
          share_class: cert.share_class || "Common",
          resolution_id: cert.resolution_id,
          appointment_id: cert.appointment_id,
          certificate_id: cert.id,
          certificate_number: cert.certificate_number,
        },
      },
    );

    if (fnError || (data && data.error)) {
      console.error(
        "  ❌ Error regenerating certificate",
        cert.id,
        fnError || data?.error,
      );
    } else {
      console.log("  ✅ Regenerated certificate", cert.id);
    }
  }

  console.log("Executive certificate backfill complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});



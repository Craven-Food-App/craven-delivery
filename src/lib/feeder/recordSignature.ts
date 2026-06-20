import { supabase } from "@/integrations/supabase/client";
import {
  FEEDER_AGREEMENTS,
  FEEDER_AGREEMENT_VERSION,
  ESIGN_CONSENT_STATEMENT,
  FeederAgreementKey,
} from "./agreements";

export interface ESignCapture {
  typedName: string;
  agreed: boolean;
}

async function getClientIP(): Promise<string | null> {
  try {
    const r = await fetch("https://api.ipify.org?format=json");
    const j = await r.json();
    return j?.ip || null;
  } catch {
    return null;
  }
}

/**
 * Insert a fully E-SIGN-compliant signature row into `driver_signatures`.
 * Captures typed name, consent text, the full document text the feeder
 * agreed to, the agreement version, and audit metadata (IP, UA, timestamp).
 */
export async function recordFeederSignature(params: {
  driverId: string;
  agreementKey: FeederAgreementKey;
  capture: ESignCapture;
  extraMetadata?: Record<string, unknown>;
}): Promise<{ id?: string; error?: string }> {
  const { driverId, agreementKey, capture, extraMetadata } = params;
  const def = FEEDER_AGREEMENTS[agreementKey];
  if (!capture.typedName?.trim() || !capture.agreed) {
    return { error: "Type your full legal name and confirm consent before signing." };
  }

  const ip = await getClientIP();
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;
  const signedAt = new Date().toISOString();

  const payload = {
    driver_id: driverId,
    agreement_type: def.type,
    agreement_version: FEEDER_AGREEMENT_VERSION,
    typed_name: capture.typedName.trim(),
    consent_statement: ESIGN_CONSENT_STATEMENT,
    document_text: def.text,
    ip_address: ip,
    user_agent: ua,
    signed_at: signedAt,
    metadata: {
      title: def.title,
      esign_act: "15 U.S.C. § 7001 et seq.",
      captured_at: signedAt,
      ...(extraMetadata || {}),
    },
  };

  // @ts-ignore — driver_signatures schema includes consent_statement/document_text/metadata
  const { data, error } = await supabase
    .from("driver_signatures")
    .insert(payload)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("recordFeederSignature failed:", error);
    return { error: error.message };
  }
  return { id: data?.id };
}

export interface FeederSignatureRow {
  id: string;
  agreement_type: string;
  agreement_version: string | null;
  typed_name: string | null;
  consent_statement: string | null;
  document_text: string | null;
  ip_address: string | null;
  user_agent: string | null;
  signed_at: string;
  metadata: any;
}

export async function loadFeederSignatures(driverId: string): Promise<FeederSignatureRow[]> {
  // @ts-ignore
  const { data, error } = await supabase
    .from("driver_signatures")
    .select(
      "id, agreement_type, agreement_version, typed_name, consent_statement, document_text, ip_address, user_agent, signed_at, metadata"
    )
    .eq("driver_id", driverId)
    .order("signed_at", { ascending: true });
  if (error) {
    console.error("loadFeederSignatures failed:", error);
    return [];
  }
  // Keep only most-recent per agreement_type
  const byType = new Map<string, FeederSignatureRow>();
  for (const row of (data || []) as FeederSignatureRow[]) {
    const existing = byType.get(row.agreement_type);
    if (!existing || new Date(row.signed_at) > new Date(existing.signed_at)) {
      byType.set(row.agreement_type, row);
    }
  }
  return Array.from(byType.values());
}
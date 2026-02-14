import { supabase } from "@/integrations/supabase/client";

export type CfoGateCode =
  | "G1_FINANCIAL_SNAPSHOT"
  | "G2_RUNWAY_SURVIVAL"
  | "G3_RISK_DISCLOSURE"
  | "G4_FUNDBILITY_READINESS"
  | "G5_EXEC_BRIEFING";

export interface CfoGate {
  id: string;
  evaluation_id: string;
  gate_code: CfoGateCode;
  gate_order: number;
  due_date: string;
  status: string;
  auto_fail_reason?: string | null;
  ceo_decision?: string | null;
}

export interface CfoEvaluation {
  id: string;
  cfo_user_id: string;
  ceo_user_id: string;
  status: string;
  evaluation_start_date: string;
  evaluation_end_date: string;
  outcome?: string | null;
  fail_count: number;
  gates?: CfoGate[];
  is_test: boolean;
}

export async function fetchActiveCfoEvaluationForCurrentUser(): Promise<CfoEvaluation | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data, error } = await supabase
    .from("cfo_evaluations")
    .select("*, gates:cfo_evaluation_gates(*)")
    .eq("cfo_user_id", user.id)
    .eq("is_test", false)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return (data as any) ?? null;
}

export async function fetchActiveCfoEvaluationForCeo(): Promise<CfoEvaluation | null> {
  const { data, error } = await supabase
    .from("cfo_evaluations")
    .select("*, gates:cfo_evaluation_gates(*)")
    .eq("is_test", false)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return (data as any) ?? null;
}

export async function fetchActiveTestCfoEvaluationForCurrentUser(): Promise<CfoEvaluation | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data, error } = await supabase
    .from("cfo_evaluations")
    .select("*, gates:cfo_evaluation_gates(*)")
    .eq("cfo_user_id", user.id)
    .eq("is_test", true)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return (data as any) ?? null;
}

export async function startCfoEvaluation(): Promise<string> {
  const { data: cfoExec, error: execError } = await supabase
    .from("exec_users")
    .select("user_id")
    .eq("role", "cfo")
    .maybeSingle();
  if (execError) throw execError;
  if (!cfoExec?.user_id) throw new Error("No CFO exec user found to evaluate.");

  const { data, error } = await supabase.rpc("start_cfo_evaluation_prefunding", {
    p_cfo_user_id: cfoExec.user_id,
  });
  if (error) throw error;
  return data as string;
}

export async function startTestCfoEvaluationForCurrentUser(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data, error } = await supabase.rpc("start_cfo_test_evaluation_prefunding", {
    p_cfo_user_id: user.id,
  });
  if (error) throw error;
  return data as string;
}

export async function submitCfoGatePayload(
  gateId: string,
  code: CfoGateCode,
  payload: any
) {
  // Minimal per-gate validation
  if (code === "G1_FINANCIAL_SNAPSHOT") {
    if (
      !payload.cash_on_hand ||
      !payload.monthly_burn ||
      !payload.known_liabilities ||
      !payload.payment_processors ||
      !payload.money_movers_map ||
      !payload.attestation_checked
    ) {
      throw new Error("All Gate 1 fields and attestation are required.");
    }
  }

  if (code === "G2_RUNWAY_SURVIVAL") {
    if (
      !payload.survival_plan_90d ||
      !payload.mandatory_expenses ||
      !payload.immediate_freezes ||
      !payload.emergency_triggers ||
      !payload.founder_exposure
    ) {
      throw new Error("All Gate 2 fields are required.");
    }
  }

  if (code === "G3_RISK_DISCLOSURE") {
    if (
      !payload.tax_risks ||
      !payload.payroll_exposure ||
      !payload.equity_promises ||
      !payload.regulatory_flags ||
      !payload.founder_personal_risk ||
      !payload.audit_tomorrow_answer
    ) {
      throw new Error("All Gate 3 fields are required.");
    }
  }

  if (code === "G4_FUNDBILITY_READINESS") {
    if (
      !payload.cap_table_current ||
      !payload.cap_table_post_raise_example ||
      !payload.instrument_recommendation ||
      !payload.valuation_logic ||
      !payload.use_of_funds ||
      !payload.investor_risk_faq
    ) {
      throw new Error("All Gate 4 fields are required.");
    }
  }

  if (code === "G5_EXEC_BRIEFING") {
    if (
      !payload.briefing_format ||
      !payload.whats_broken ||
      !payload.whats_risky ||
      !payload.must_implement_controls ||
      !payload.needs_from_ceo ||
      !payload.next_90_days_financial
    ) {
      throw new Error("All Gate 5 fields are required.");
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error: insertError } = await supabase
    .from("cfo_evaluation_submissions")
    .insert({
      gate_id: gateId,
      submitted_by: user.id,
      payload,
    });
  if (insertError) throw insertError;

  const { error: updateError } = await supabase
    .from("cfo_evaluation_gates")
    .update({ status: "submitted" })
    .eq("id", gateId)
    .in("status", ["open", "submitted"]);
  if (updateError) throw updateError;
}

export async function ceoReviewCfoGate(
  gateId: string,
  decision: "pass" | "fail" | "conditional_pass",
  comment?: string
) {
  const status = decision === "fail" ? "failed" : "passed";

  const { error } = await supabase
    .from("cfo_evaluation_gates")
    .update({
      status,
      ceo_decision: decision,
      ceo_decided_at: new Date().toISOString(),
    })
    .eq("id", gateId);
  if (error) throw error;

  if (comment) {
    await supabase.from("cfo_evaluation_events").insert({
      gate_id: gateId,
      event_type: "CEO_DECISION",
      details: { decision, comment },
    });
  }
}



import { supabase } from "@/integrations/supabase/client";

export type CtoGateCode =
  | "GATE_1_ARCHITECTURE"
  | "GATE_2_SECURITY"
  | "GATE_3_EXECUTION"
  | "GATE_4_LEADERSHIP"
  | "GATE_5_CEO_BRIEFING";

export interface CtoGate {
  id: string;
  evaluation_id: string;
  gate_code: CtoGateCode;
  gate_order: number;
  due_date: string;
  status: string;
  auto_fail_reason?: string | null;
  ceo_decision?: string | null;
}

export interface CtoEvaluation {
  id: string;
  cto_user_id: string;
  ceo_user_id: string;
  status: string;
  evaluation_start_date: string;
  evaluation_end_date: string;
  outcome?: string | null;
  fail_count: number;
  gates?: CtoGate[];
}

export async function fetchActiveCtoEvaluationForCurrentUser(): Promise<CtoEvaluation | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data, error } = await supabase
    .from("cto_evaluations")
    .select("*, gates:cto_evaluation_gates(*)")
    .eq("cto_user_id", user.id)
    .eq("is_test", false)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return (data as any) ?? null;
}

export async function fetchActiveCtoEvaluationForCeo(): Promise<CtoEvaluation | null> {
  // CEO view: find active evaluation for any CTO (assumes 1 CTO)
  const { data, error } = await supabase
    .from("cto_evaluations")
    .select("*, gates:cto_evaluation_gates(*)")
    .eq("is_test", false)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return (data as any) ?? null;
}

// Test evaluations are always scoped to the current user and marked is_test = true
export async function fetchActiveTestCtoEvaluationForCurrentUser(): Promise<CtoEvaluation | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data, error } = await supabase
    .from("cto_evaluations")
    .select("*, gates:cto_evaluation_gates(*)")
    .eq("cto_user_id", user.id)
    .eq("is_test", true)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return (data as any) ?? null;
}

export async function startCtoEvaluation(): Promise<string> {
  // CEO helper: find CTO user id and call RPC
  const { data: ctoExec, error: execError } = await supabase
    .from("exec_users")
    .select("user_id")
    .eq("role", "cto")
    .maybeSingle();
  if (execError) throw execError;
  if (!ctoExec?.user_id) {
    throw new Error("No CTO exec user found to evaluate.");
  }

  const { data, error } = await supabase.rpc("start_cto_evaluation", {
    p_cto_user_id: ctoExec.user_id,
  });
  if (error) throw error;
  return data as string;
}

export async function startTestCtoEvaluationForCurrentUser(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data, error } = await supabase.rpc("start_cto_test_evaluation", {
    p_cto_user_id: user.id,
  });
  if (error) throw error;
  return data as string;
}

// ---------- Gate submissions ----------

export async function submitGatePayload(gateId: string, code: CtoGateCode, payload: any) {
  // Per-gate validation
  if (code === "GATE_1_ARCHITECTURE") {
    const coverage = payload?.coverage || {};
    const requiredKeys = [
      "frontend_portals",
      "backend_services",
      "auth_and_roles",
      "data_model",
      "payments_stripe",
      "realtime_systems",
      "mobile_strategy",
      "scaling_and_envs",
    ];
    if (
      !payload.architecture_doc_path ||
      !payload.diagram_path ||
      !payload.rationale ||
      !requiredKeys.every((k) => coverage[k])
    ) {
      throw new Error("All Gate 1 fields and coverage items must be completed.");
    }
  }

  if (code === "GATE_2_SECURITY") {
    if (
      !payload.rbac_matrix ||
      !payload.github_permissions ||
      !payload.secrets_strategy ||
      !payload.incident_response_plan ||
      !payload.rogue_dev_answer
    ) {
      throw new Error("All Gate 2 fields must be completed.");
    }
  }

  if (code === "GATE_3_EXECUTION") {
    if (
      !payload.issue_type ||
      !payload.root_cause ||
      !payload.commit_reference ||
      !payload.before_state ||
      !payload.after_state ||
      !payload.prevention_controls
    ) {
      throw new Error("All Gate 3 fields must be completed.");
    }
  }

  if (code === "GATE_4_LEADERSHIP") {
    if (
      !payload.roadmap_30_60_90 ||
      !payload.boundaries ||
      !payload.hiring_vs_automation ||
      !payload.tech_debt_register
    ) {
      throw new Error("All Gate 4 fields must be completed.");
    }
  }

  if (code === "GATE_5_CEO_BRIEFING") {
    if (
      !payload.briefing_format ||
      !payload.whats_broken ||
      !payload.whats_risky ||
      !payload.whats_working ||
      !payload.needs_from_ceo ||
      !payload.plan_90_days
    ) {
      throw new Error("All Gate 5 fields must be completed.");
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error: insertError } = await supabase
    .from("cto_evaluation_submissions")
    .insert({
      gate_id: gateId,
      submitted_by: user.id,
      payload,
    });
  if (insertError) throw insertError;

  // Move gate along the workflow
  const { error: updateError } = await supabase
    .from("cto_evaluation_gates")
    .update({ status: "submitted" })
    .eq("id", gateId)
    .in("status", ["open", "submitted"]);
  if (updateError) throw updateError;
}

export async function fetchGateSubmissions(gateId: string) {
  const { data, error } = await supabase
    .from("cto_evaluation_submissions")
    .select("*")
    .eq("gate_id", gateId)
    .order("submitted_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function ceoReviewGate(
  gateId: string,
  decision: "pass" | "fail" | "conditional_pass",
  comment?: string
) {
  const status = decision === "fail" ? "failed" : "passed";

  const { error } = await supabase
    .from("cto_evaluation_gates")
    .update({
      status,
      ceo_decision: decision,
      ceo_decided_at: new Date().toISOString(),
    })
    .eq("id", gateId);
  if (error) throw error;

  if (comment) {
    await supabase.from("cto_evaluation_events").insert({
      gate_id: gateId,
      event_type: "CEO_DECISION",
      details: { decision, comment },
    });
  }
}



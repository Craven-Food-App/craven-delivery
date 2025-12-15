import React, { useMemo, useState } from "react";
import { Card, Group, Text, Button, Badge, Progress, Stack, Textarea, Tabs, TextInput, Checkbox } from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconClock, IconShield } from "@tabler/icons-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CfoGateCode,
  fetchActiveCfoEvaluationForCurrentUser,
  fetchActiveCfoEvaluationForCeo,
  fetchActiveTestCfoEvaluationForCurrentUser,
  startCfoEvaluation,
  startTestCfoEvaluationForCurrentUser,
  submitCfoGatePayload,
  ceoReviewCfoGate,
} from "@/lib/cfoEvaluation";

type Mode = "cfo" | "ceo";

interface Props {
  mode: Mode;
  test?: boolean;
}

const gateLabels: Record<CfoGateCode, string> = {
  G1_FINANCIAL_SNAPSHOT: "Gate 1: Financial Reality Snapshot",
  G2_RUNWAY_SURVIVAL: "Gate 2: Runway & Survival Plan",
  G3_RISK_DISCLOSURE: "Gate 3: Risk & Exposure Disclosure",
  G4_FUNDBILITY_READINESS: "Gate 4: Fundability Readiness",
  G5_EXEC_BRIEFING: "Gate 5: Executive Judgment Briefing",
};

const CfoEvaluationGatePanel: React.FC<Props> = ({ mode, test }) => {
  const qc = useQueryClient();
  const [ceoComment, setCeoComment] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [gateForm, setGateForm] = useState<Record<string, any>>({});

  const evalQuery = useQuery({
    queryKey: ["cfo-eval", mode, test ? "test" : "real"],
    queryFn: () => {
      if (test) {
        return fetchActiveTestCfoEvaluationForCurrentUser();
      }
      return mode === "ceo"
        ? fetchActiveCfoEvaluationForCeo()
        : fetchActiveCfoEvaluationForCurrentUser();
    },
  });

  const startMutation = useMutation({
    mutationFn: () => (test ? startTestCfoEvaluationForCurrentUser() : startCfoEvaluation()),
    onSuccess: () => {
      setActionError(null);
      qc.invalidateQueries({ queryKey: ["cfo-eval"] });
    },
    onError: (err: any) => {
      console.error("Error starting CFO evaluation:", err);
      setActionError(err?.message || "Failed to start CFO evaluation gate.");
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (args: { gateId: string; code: CfoGateCode; payload: any }) =>
      submitCfoGatePayload(args.gateId, args.code, args.payload),
    onSuccess: () => {
      setActionError(null);
      qc.invalidateQueries({ queryKey: ["cfo-eval"] });
    },
    onError: (err: any) => {
      console.error("Error submitting CFO gate:", err);
      setActionError(err?.message || "Failed to submit gate.");
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (args: { gateId: string; decision: "pass" | "fail" | "conditional_pass" }) =>
      ceoReviewCfoGate(args.gateId, args.decision, ceoComment),
    onSuccess: () => {
      setActionError(null);
      qc.invalidateQueries({ queryKey: ["cfo-eval"] });
    },
    onError: (err: any) => {
      console.error("Error recording CEO decision:", err);
      setActionError(err?.message || "Failed to record CEO decision.");
    },
  });

  const evaluation = evalQuery.data;
  const gates = (evaluation?.gates ?? []).sort(
    (a: any, b: any) => a.gate_order - b.gate_order
  );

  const activeGate = useMemo(
    () => gates.find((g: any) => !["passed", "failed", "auto_failed"].includes(g.status)),
    [gates]
  );

  const updateGateField = (gateId: string, field: string, value: any) => {
    setGateForm((prev) => ({
      ...prev,
      [gateId]: {
        ...(prev[gateId] || {}),
        [field]: value,
      },
    }));
  };

  const handleSubmitGate = (gate: any) => {
    const form = gateForm[gate.id] || {};
    submitMutation.mutate({
      gateId: gate.id,
      code: gate.gate_code as CfoGateCode,
      payload: form,
    });
  };

  if (evalQuery.isLoading) {
    return <Card withBorder padding="lg">Loading CFO Evaluation Gate…</Card>;
  }

  if (!evaluation && mode === "cfo") {
    return (
      <Card withBorder padding="lg">
        <Group justify="space-between">
          <Group>
            <IconShield size={18} />
            <Text fw={600}>CFO Evaluation Gate</Text>
          </Group>
        </Group>
        <Text size="sm" c="dimmed" mt="xs">
          No active evaluation gate is currently running. This can only be initiated by the CEO.
        </Text>
      </Card>
    );
  }

  if (!evaluation && mode === "ceo") {
    return (
      <Card withBorder padding="lg">
        <Group justify="space-between">
          <Group>
            <IconAlertTriangle size={18} color="#f97316" />
            <Text fw={600}>CFO Evaluation Gate</Text>
          </Group>
        </Group>
        <Text size="sm" c="dimmed" mt="xs">
          No active CFO evaluation. Initiating one starts a 14-day non-bypassable capability
          evaluation.
        </Text>
        {actionError && (
          <Text size="xs" c="red" mt="xs">
            {actionError}
          </Text>
        )}
        <Button
          mt="md"
          color="red"
          loading={startMutation.isLoading}
          onClick={() => startMutation.mutate()}
        >
          Initiate CFO Evaluation Gate
        </Button>
      </Card>
    );
  }

  const start = evaluation!.evaluation_start_date;
  const end = evaluation!.evaluation_end_date;
  const today = new Date().toISOString().slice(0, 10);
  const totalDays =
    (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24);
  const elapsedDays =
    (new Date(today).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24);
  const progressPct = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

  const renderGateForm = (gate: any) => {
    const disabled = gate.status !== "open" && gate.status !== "submitted";
    const form = gateForm[gate.id] || {};

    if (gate.gate_code === "G1_FINANCIAL_SNAPSHOT") {
      return (
        <Stack gap="sm" mt="md">
          <TextInput
            label="Cash on hand (actual)"
            disabled={disabled}
            value={form.cash_on_hand || ""}
            onChange={(e) => updateGateField(gate.id, "cash_on_hand", e.currentTarget.value)}
          />
          <TextInput
            label="Monthly burn"
            disabled={disabled}
            value={form.monthly_burn || ""}
            onChange={(e) => updateGateField(gate.id, "monthly_burn", e.currentTarget.value)}
          />
          <Textarea
            label="Known liabilities (vendors, contractors, deferred comp)"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.known_liabilities || ""}
            onChange={(e) =>
              updateGateField(gate.id, "known_liabilities", e.currentTarget.value)
            }
          />
          <Textarea
            label="Active payment processors (Stripe, etc.)"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.payment_processors || ""}
            onChange={(e) =>
              updateGateField(gate.id, "payment_processors", e.currentTarget.value)
            }
          />
          <Textarea
            label="Who can move money and how (authority map)"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.money_movers_map || ""}
            onChange={(e) =>
              updateGateField(gate.id, "money_movers_map", e.currentTarget.value)
            }
          />
          <Checkbox
            mt="sm"
            label='“I can state with confidence where the company’s money is, how it moves, and who controls it.”'
            disabled={disabled}
            checked={!!form.attestation_checked}
            onChange={(e) =>
              updateGateField(gate.id, "attestation_checked", e.currentTarget.checked)
            }
          />
          {!disabled && (
            <Button
              mt="md"
              onClick={() => handleSubmitGate(gate)}
              loading={submitMutation.isLoading}
            >
              Submit Gate 1
            </Button>
          )}
        </Stack>
      );
    }

    if (gate.gate_code === "G2_RUNWAY_SURVIVAL") {
      return (
        <Stack gap="sm" mt="md">
          <Textarea
            label="90-day survival plan (assuming no funding)"
            disabled={disabled}
            autosize
            minRows={3}
            value={form.survival_plan_90d || ""}
            onChange={(e) =>
              updateGateField(gate.id, "survival_plan_90d", e.currentTarget.value)
            }
          />
          <Textarea
            label="Mandatory expenses"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.mandatory_expenses || ""}
            onChange={(e) =>
              updateGateField(gate.id, "mandatory_expenses", e.currentTarget.value)
            }
          />
          <Textarea
            label="What freezes immediately"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.immediate_freezes || ""}
            onChange={(e) =>
              updateGateField(gate.id, "immediate_freezes", e.currentTarget.value)
            }
          />
          <Textarea
            label="Emergency control triggers"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.emergency_triggers || ""}
            onChange={(e) =>
              updateGateField(gate.id, "emergency_triggers", e.currentTarget.value)
            }
          />
          <Textarea
            label="Founder cash exposure"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.founder_exposure || ""}
            onChange={(e) =>
              updateGateField(gate.id, "founder_exposure", e.currentTarget.value)
            }
          />
          {!disabled && (
            <Button
              mt="md"
              onClick={() => handleSubmitGate(gate)}
              loading={submitMutation.isLoading}
            >
              Submit Gate 2
            </Button>
          )}
        </Stack>
      );
    }

    if (gate.gate_code === "G3_RISK_DISCLOSURE") {
      return (
        <Stack gap="sm" mt="md">
          <Textarea
            label="Tax risks"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.tax_risks || ""}
            onChange={(e) => updateGateField(gate.id, "tax_risks", e.currentTarget.value)}
          />
          <Textarea
            label="Payroll / contractor exposure"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.payroll_exposure || ""}
            onChange={(e) =>
              updateGateField(gate.id, "payroll_exposure", e.currentTarget.value)
            }
          />
          <Textarea
            label="Equity promises & deferred salary obligations"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.equity_promises || ""}
            onChange={(e) =>
              updateGateField(gate.id, "equity_promises", e.currentTarget.value)
            }
          />
          <Textarea
            label="Regulatory or legal red flags"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.regulatory_flags || ""}
            onChange={(e) =>
              updateGateField(gate.id, "regulatory_flags", e.currentTarget.value)
            }
          />
          <Textarea
            label="What could personally expose the founder"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.founder_personal_risk || ""}
            onChange={(e) =>
              updateGateField(gate.id, "founder_personal_risk", e.currentTarget.value)
            }
          />
          <Textarea
            label='“If we were audited tomorrow, here is exactly where we are exposed.”'
            disabled={disabled}
            autosize
            minRows={3}
            value={form.audit_tomorrow_answer || ""}
            onChange={(e) =>
              updateGateField(gate.id, "audit_tomorrow_answer", e.currentTarget.value)
            }
          />
          {!disabled && (
            <Button
              mt="md"
              onClick={() => handleSubmitGate(gate)}
              loading={submitMutation.isLoading}
            >
              Submit Gate 3
            </Button>
          )}
        </Stack>
      );
    }

    if (gate.gate_code === "G4_FUNDBILITY_READINESS") {
      return (
        <Stack gap="sm" mt="md">
          <Textarea
            label="Clean cap table (current)"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.cap_table_current || ""}
            onChange={(e) =>
              updateGateField(gate.id, "cap_table_current", e.currentTarget.value)
            }
          />
          <Textarea
            label="Cap table post-raise (example)"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.cap_table_post_raise_example || ""}
            onChange={(e) =>
              updateGateField(gate.id, "cap_table_post_raise_example", e.currentTarget.value)
            }
          />
          <Textarea
            label="SAFE vs note vs equity recommendation"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.instrument_recommendation || ""}
            onChange={(e) =>
              updateGateField(gate.id, "instrument_recommendation", e.currentTarget.value)
            }
          />
          <Textarea
            label="Valuation logic (simple, defensible)"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.valuation_logic || ""}
            onChange={(e) =>
              updateGateField(gate.id, "valuation_logic", e.currentTarget.value)
            }
          />
          <Textarea
            label="Use-of-funds outline"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.use_of_funds || ""}
            onChange={(e) =>
              updateGateField(gate.id, "use_of_funds", e.currentTarget.value)
            }
          />
          <Textarea
            label="Investor FAQ risk list"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.investor_risk_faq || ""}
            onChange={(e) =>
              updateGateField(gate.id, "investor_risk_faq", e.currentTarget.value)
            }
          />
          {!disabled && (
            <Button
              mt="md"
              onClick={() => handleSubmitGate(gate)}
              loading={submitMutation.isLoading}
            >
              Submit Gate 4
            </Button>
          )}
        </Stack>
      );
    }

    if (gate.gate_code === "G5_EXEC_BRIEFING") {
      return (
        <Stack gap="sm" mt="md">
          <TextInput
            label="Briefing format (memo or recorded)"
            disabled={disabled}
            value={form.briefing_format || ""}
            onChange={(e) =>
              updateGateField(gate.id, "briefing_format", e.currentTarget.value)
            }
          />
          <Textarea
            label="What’s financially broken"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.whats_broken || ""}
            onChange={(e) =>
              updateGateField(gate.id, "whats_broken", e.currentTarget.value)
            }
          />
          <Textarea
            label="What’s risky right now"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.whats_risky || ""}
            onChange={(e) =>
              updateGateField(gate.id, "whats_risky", e.currentTarget.value)
            }
          />
          <Textarea
            label="What controls must be implemented next"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.must_implement_controls || ""}
            onChange={(e) =>
              updateGateField(gate.id, "must_implement_controls", e.currentTarget.value)
            }
          />
          <Textarea
            label="What the CFO needs from the CEO"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.needs_from_ceo || ""}
            onChange={(e) =>
              updateGateField(gate.id, "needs_from_ceo", e.currentTarget.value)
            }
          />
          <Textarea
            label="What happens financially over the next 90 days"
            disabled={disabled}
            autosize
            minRows={3}
            value={form.next_90_days_financial || ""}
            onChange={(e) =>
              updateGateField(gate.id, "next_90_days_financial", e.currentTarget.value)
            }
          />
          {!disabled && (
            <Button
              mt="md"
              onClick={() => handleSubmitGate(gate)}
              loading={submitMutation.isLoading}
            >
              Submit Gate 5
            </Button>
          )}
        </Stack>
      );
    }

    return (
      <Text size="sm" c="dimmed" mt="sm">
        Gate-specific form not implemented.
      </Text>
    );
  };

  return (
    <Card withBorder padding="lg">
      <Group justify="space-between" align="flex-start">
        <Group>
          <IconShield size={18} />
          <div>
            <Text fw={600}>CFO Evaluation Gate</Text>
            <Text size="xs" c="dimmed">
              {start} → {end} • Status: {evaluation!.status}
            </Text>
          </div>
        </Group>
        <Badge color={evaluation!.fail_count > 0 ? "red" : "green"}>
          {evaluation!.fail_count} failed gate
          {evaluation!.fail_count === 1 ? "" : "s"}
        </Badge>
      </Group>

      <Group mt="md" align="center" gap="sm">
        <IconClock size={16} />
        <Text size="sm">
          {Math.max(0, Math.round(totalDays - elapsedDays))} days remaining
        </Text>
      </Group>
      <Progress value={progressPct} mt={4} />

      <Tabs mt="lg" defaultValue={activeGate?.gate_code || gates[0]?.gate_code}>
        <Tabs.List>
          {gates.map((g: any) => (
            <Tabs.Tab key={g.id} value={g.gate_code}>
              {gateLabels[g.gate_code as CfoGateCode]}{" "}
              {["passed"].includes(g.status) && (
                <IconCheck size={14} color="#16a34a" style={{ marginLeft: 4 }} />
              )}
              {["failed", "auto_failed"].includes(g.status) && (
                <IconAlertTriangle size={14} color="#dc2626" style={{ marginLeft: 4 }} />
              )}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        {gates.map((g: any) => (
          <Tabs.Panel key={g.id} value={g.gate_code} pt="md">
            <Text size="sm" c="dimmed">
              Due by {g.due_date} • Current status: {g.status}
            </Text>

            {mode === "cfo" && renderGateForm(g)}

            {mode === "ceo" && (
              <Stack gap="sm" mt="md">
                <Text fw={500}>CEO Decision</Text>
                <Textarea
                  label="CEO commentary (logged for board record)"
                  autosize
                  minRows={2}
                  value={ceoComment}
                  onChange={(e) => setCeoComment(e.currentTarget.value)}
                />
                <Group>
                  <Button
                    color="red"
                    leftSection={<IconAlertTriangle size={16} />}
                    loading={reviewMutation.isLoading}
                    onClick={() =>
                      reviewMutation.mutate({ gateId: g.id, decision: "fail" })
                    }
                  >
                    Fail Gate
                  </Button>
                  <Button
                    variant="outline"
                    loading={reviewMutation.isLoading}
                    onClick={() =>
                      reviewMutation.mutate({
                        gateId: g.id,
                        decision: "conditional_pass",
                      })
                    }
                  >
                    Conditional Pass
                  </Button>
                  <Button
                    color="green"
                    leftSection={<IconCheck size={16} />}
                    loading={reviewMutation.isLoading}
                    onClick={() =>
                      reviewMutation.mutate({ gateId: g.id, decision: "pass" })
                    }
                  >
                    Pass Gate
                  </Button>
                </Group>
              </Stack>
            )}
          </Tabs.Panel>
        ))}
      </Tabs>
    </Card>
  );
};

export default CfoEvaluationGatePanel;



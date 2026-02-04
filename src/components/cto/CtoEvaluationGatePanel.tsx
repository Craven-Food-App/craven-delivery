// @ts-nocheck
import React, { useMemo, useState } from "react";
import { Card, Group, Text, Button, Badge, Progress, Stack, Textarea, Tabs, Checkbox, Select } from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconClock, IconShield, IconFileText } from "@tabler/icons-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CtoGateCode,
  fetchActiveCtoEvaluationForCurrentUser,
  fetchActiveCtoEvaluationForCeo,
  fetchActiveTestCtoEvaluationForCurrentUser,
  startCtoEvaluation,
  startTestCtoEvaluationForCurrentUser,
  submitGatePayload,
  fetchGateSubmissions,
  ceoReviewGate,
} from "@/lib/ctoEvaluation";

type Mode = "cto" | "ceo";

interface Props {
  mode: Mode;
  /**
   * When true, uses test evaluations (is_test = true) scoped to the current user.
   * This is intended for the Testing Portal and must not affect real CTO evaluations.
   */
  test?: boolean;
}

const gateLabels: Record<CtoGateCode, string> = {
  GATE_1_ARCHITECTURE: "Gate 1: Architecture Ownership",
  GATE_2_SECURITY: "Gate 2: Security & Blast Radius",
  GATE_3_EXECUTION: "Gate 3: Execution Under Constraint",
  GATE_4_LEADERSHIP: "Gate 4: Leadership & Leverage",
  GATE_5_CEO_BRIEFING: "Gate 5: CEO Briefing",
};

const CtoEvaluationGatePanel: React.FC<Props> = ({ mode, test }) => {
  const qc = useQueryClient();
  const [ceoComment, setCeoComment] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [gateForm, setGateForm] = useState<Record<string, any>>({});

  const evalQuery = useQuery({
    queryKey: ["cto-eval", mode, test ? "test" : "real"],
    queryFn: () => {
      if (test) {
        // Test harness always uses current user & is_test = true
        return fetchActiveTestCtoEvaluationForCurrentUser();
      }
      return mode === "ceo"
        ? fetchActiveCtoEvaluationForCeo()
        : fetchActiveCtoEvaluationForCurrentUser();
    },
  });

  const startMutation = useMutation({
    mutationFn: () => (test ? startTestCtoEvaluationForCurrentUser() : startCtoEvaluation()),
    onSuccess: () => {
      setActionError(null);
      qc.invalidateQueries({ queryKey: ["cto-eval"] });
    },
    onError: (err: any) => {
      console.error("Error starting CTO evaluation:", err);
      setActionError(err?.message || "Failed to start evaluation gate.");
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (args: { gateId: string; code: CtoGateCode; payload: any }) =>
      submitGatePayload(args.gateId, args.code, args.payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cto-eval"] }),
  });

  const reviewMutation = useMutation({
    mutationFn: async (args: { gateId: string; decision: "pass" | "fail" | "conditional_pass" }) =>
      ceoReviewGate(args.gateId, args.decision, ceoComment),
    onSuccess: () => {
      setActionError(null);
      qc.invalidateQueries({ queryKey: ["cto-eval"] });
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

  if (evalQuery.isLoading) {
    return <Card withBorder padding="lg">Loading CTO Evaluation Gate…</Card>;
  }

  if (!evaluation && mode === "cto") {
    return (
      <Card withBorder padding="lg">
        <Group justify="space-between">
          <Group>
            <IconShield size={18} />
            <Text fw={600}>CTO Evaluation Gate</Text>
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
            <Text fw={600}>CTO Evaluation Gate</Text>
          </Group>
        </Group>
        <Text size="sm" c="dimmed" mt="xs">
          No active CTO evaluation. Initiating one starts a 14-day non-bypassable performance gate.
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
          Initiate CTO Evaluation Gate
        </Button>
      </Card>
    );
  }

  if (!evaluation) {
    return <Card withBorder padding="lg">No evaluation data available.</Card>;
  }

  const start = evaluation.evaluation_start_date;
  const end = evaluation.evaluation_end_date;
  const today = new Date().toISOString().slice(0, 10);
  const totalDays =
    (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24);
  const elapsedDays =
    (new Date(today).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24);
  const progressPct = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

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
      code: gate.gate_code as CtoGateCode,
      payload: form,
    });
  };

  const renderGateForm = (gate: any) => {
    const disabled = gate.status !== "open" && gate.status !== "submitted";
    const form = gateForm[gate.id] || {};

    if (gate.gate_code === "GATE_1_ARCHITECTURE") {
      return (
        <Stack gap="sm" mt="md">
          <Text fw={500}>CTO Submission</Text>
          <Textarea
            label="Architecture document path"
            placeholder="e.g. governance/cto-eval/arch-docs/arch-v1.pdf"
            disabled={disabled}
            autosize
            minRows={1}
            value={form.architecture_doc_path || ""}
            onChange={(e) =>
              updateGateField(gate.id, "architecture_doc_path", e.currentTarget.value)
            }
          />
          <Textarea
            label="System diagram path"
            placeholder="e.g. governance/cto-eval/diagrams/system-arch.png"
            disabled={disabled}
            autosize
            minRows={1}
            value={form.diagram_path || ""}
            onChange={(e) =>
              updateGateField(gate.id, "diagram_path", e.currentTarget.value)
            }
          />
          <Textarea
            label="Architecture rationale"
            placeholder="Explain how the architecture fits Crave’n’s portals, scale, and execution strategy."
            disabled={disabled}
            autosize
            minRows={3}
            value={form.rationale || ""}
            onChange={(e) => updateGateField(gate.id, "rationale", e.currentTarget.value)}
          />
          <Text size="sm" fw={500}>
            Coverage (all required)
          </Text>
          <Stack gap={4}>
            {["frontend_portals","backend_services","auth_and_roles","data_model","payments_stripe","realtime_systems","mobile_strategy","scaling_and_envs"].map(
              (key) => (
                <Checkbox
                  key={key}
                  label={key.replace(/_/g, " ")}
                  disabled={disabled}
                  checked={!!form.coverage?.[key]}
                  onChange={(e) => {
                    const coverage = { ...(form.coverage || {}) };
                    coverage[key] = e.currentTarget.checked;
                    updateGateField(gate.id, "coverage", coverage);
                  }}
                />
              )
            )}
          </Stack>
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

    if (gate.gate_code === "GATE_2_SECURITY") {
      return (
        <Stack gap="sm" mt="md">
          <Textarea
            label="RBAC matrix"
            placeholder="Describe or link to the RBAC matrix."
            disabled={disabled}
            autosize
            minRows={2}
            value={form.rbac_matrix || ""}
            onChange={(e) => updateGateField(gate.id, "rbac_matrix", e.currentTarget.value)}
          />
          <Textarea
            label="GitHub permission strategy"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.github_permissions || ""}
            onChange={(e) =>
              updateGateField(gate.id, "github_permissions", e.currentTarget.value)
            }
          />
          <Textarea
            label="Secrets handling strategy"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.secrets_strategy || ""}
            onChange={(e) =>
              updateGateField(gate.id, "secrets_strategy", e.currentTarget.value)
            }
          />
          <Textarea
            label="Incident response plan"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.incident_response_plan || ""}
            onChange={(e) =>
              updateGateField(gate.id, "incident_response_plan", e.currentTarget.value)
            }
          />
          <Textarea
            label={`"Rogue dev" blast radius answer`}
            placeholder='Answer the question: "If a junior dev goes rogue tonight, what is the maximum damage they can cause?"'
            disabled={disabled}
            autosize
            minRows={3}
            value={form.rogue_dev_answer || ""}
            onChange={(e) =>
              updateGateField(gate.id, "rogue_dev_answer", e.currentTarget.value)
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

    if (gate.gate_code === "GATE_3_EXECUTION") {
      return (
        <Stack gap="sm" mt="md">
          <Select
            label="Issue type"
            placeholder="Select the primary issue you resolved"
            disabled={disabled}
            data={[
              { value: "broken_deployment", label: "Broken deployment" },
              { value: "auth_flaw", label: "Auth flaw" },
              { value: "performance_issue", label: "Performance issue" },
              { value: "infra_instability", label: "Infrastructure instability" },
              { value: "env_misconfig", label: "Environment misconfiguration" },
            ]}
            value={form.issue_type || null}
            onChange={(value) => updateGateField(gate.id, "issue_type", value)}
          />
          <Textarea
            label="Root cause analysis"
            disabled={disabled}
            autosize
            minRows={3}
            value={form.root_cause || ""}
            onChange={(e) => updateGateField(gate.id, "root_cause", e.currentTarget.value)}
          />
          <Textarea
            label="Commit hash or deployment reference"
            disabled={disabled}
            autosize
            minRows={1}
            value={form.commit_reference || ""}
            onChange={(e) =>
              updateGateField(gate.id, "commit_reference", e.currentTarget.value)
            }
          />
          <Textarea
            label="Before state"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.before_state || ""}
            onChange={(e) =>
              updateGateField(gate.id, "before_state", e.currentTarget.value)
            }
          />
          <Textarea
            label="After state"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.after_state || ""}
            onChange={(e) => updateGateField(gate.id, "after_state", e.currentTarget.value)}
          />
          <Textarea
            label="Prevention controls"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.prevention_controls || ""}
            onChange={(e) =>
              updateGateField(gate.id, "prevention_controls", e.currentTarget.value)
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

    if (gate.gate_code === "GATE_4_LEADERSHIP") {
      return (
        <Stack gap="sm" mt="md">
          <Textarea
            label="30-60-90 day roadmap"
            disabled={disabled}
            autosize
            minRows={3}
            value={form.roadmap_30_60_90 || ""}
            onChange={(e) =>
              updateGateField(gate.id, "roadmap_30_60_90", e.currentTarget.value)
            }
          />
          <Textarea
            label="CTO responsibility boundaries"
            disabled={disabled}
            autosize
            minRows={3}
            value={form.boundaries || ""}
            onChange={(e) => updateGateField(gate.id, "boundaries", e.currentTarget.value)}
          />
          <Textarea
            label="Hiring vs automation plan"
            disabled={disabled}
            autosize
            minRows={3}
            value={form.hiring_vs_automation || ""}
            onChange={(e) =>
              updateGateField(gate.id, "hiring_vs_automation", e.currentTarget.value)
            }
          />
          <Textarea
            label="Tech debt register (with priorities)"
            disabled={disabled}
            autosize
            minRows={3}
            value={form.tech_debt_register || ""}
            onChange={(e) =>
              updateGateField(gate.id, "tech_debt_register", e.currentTarget.value)
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

    if (gate.gate_code === "GATE_5_CEO_BRIEFING") {
      return (
        <Stack gap="sm" mt="md">
          <Select
            label="Briefing format"
            placeholder="Select format"
            disabled={disabled}
            data={[
              { value: "live", label: "Live presentation" },
              { value: "recorded", label: "Recorded briefing + memo" },
            ]}
            value={form.briefing_format || null}
            onChange={(value) => updateGateField(gate.id, "briefing_format", value)}
          />
          <Textarea
            label="What’s broken"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.whats_broken || ""}
            onChange={(e) =>
              updateGateField(gate.id, "whats_broken", e.currentTarget.value)
            }
          />
          <Textarea
            label="What’s risky"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.whats_risky || ""}
            onChange={(e) => updateGateField(gate.id, "whats_risky", e.currentTarget.value)}
          />
          <Textarea
            label="What’s working"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.whats_working || ""}
            onChange={(e) =>
              updateGateField(gate.id, "whats_working", e.currentTarget.value)
            }
          />
          <Textarea
            label="What’s needed from CEO"
            disabled={disabled}
            autosize
            minRows={2}
            value={form.needs_from_ceo || ""}
            onChange={(e) =>
              updateGateField(gate.id, "needs_from_ceo", e.currentTarget.value)
            }
          />
          <Textarea
            label="90-day forward plan"
            disabled={disabled}
            autosize
            minRows={3}
            value={form.plan_90_days || ""}
            onChange={(e) =>
              updateGateField(gate.id, "plan_90_days", e.currentTarget.value)
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
        Gate-specific form components should be implemented here (see ctoEvaluation.ts
        payload contract for required fields).
      </Text>
    );
  };

  return (
    <Card withBorder padding="lg">
      <Group justify="space-between" align="flex-start">
        <Group>
          <IconShield size={18} />
          <div>
            <Text fw={600}>CTO Evaluation Gate</Text>
            <Text size="xs" c="dimmed">
              {start} → {end} • Status: {evaluation.status}
            </Text>
          </div>
        </Group>
        <Badge color={evaluation.fail_count > 0 ? "red" : "green"}>
          {evaluation.fail_count} failed gate
          {evaluation.fail_count === 1 ? "" : "s"}
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
              {gateLabels[g.gate_code as CtoGateCode]}{" "}
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

            {mode === "cto" && renderGateForm(g)}

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
                    leftSection={<IconFileText size={16} />}
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

export default CtoEvaluationGatePanel;



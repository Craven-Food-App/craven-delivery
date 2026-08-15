import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Box,
  Button,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Switch,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import {
  Bell,
  ExternalLink,
  LogOut,
  Plus,
  RefreshCw,
  Truck,
  Wifi,
  WifiOff,
} from "lucide-react";
import { notifications } from "@mantine/notifications";
import { supabase } from "@root/integrations/supabase/client";
import { CXPostJobForm } from "@root/components/cx/CXPostJobForm";
import { CXJobDetailModal } from "@root/components/cx/CXJobDetailModal";
import cxLogo from "@root/assets/cx-logo.png";
import { resolveCourierRestaurant } from "@tablet/resolveCourierRestaurant";

type OpsTab = "active" | "post" | "alerts";

type CxJob = {
  id: string;
  status: string;
  job_type: string;
  created_at: string;
  total_charge_cents?: number;
  driver_payout_offer_cents?: number;
  platform_base_cents?: number;
  driver_id?: string | null;
  cx_job_stops?: Array<{
    sequence: number;
    stop_type: string;
    address: string;
    contact_name?: string;
  }>;
};

type OpsAlert = {
  id: string;
  title: string;
  message: string;
  level: "info" | "warning" | "critical" | "success";
  at: string;
};

const BOARD_COLUMNS: Array<{ id: string; label: string; statuses: string[] }> = [
  { id: "open", label: "Open", statuses: ["draft", "posted", "offered"] },
  {
    id: "assigned",
    label: "Assigned",
    statuses: ["accepted", "en_route_pickup"],
  },
  {
    id: "in_progress",
    label: "In progress",
    statuses: ["picked_up", "en_route_dropoff"],
  },
  {
    id: "done",
    label: "Completed",
    statuses: ["delivered", "cancelled", "failed"],
  },
];

function columnForStatus(status: string): string {
  const col = BOARD_COLUMNS.find((c) => c.statuses.includes(status));
  return col?.id ?? "open";
}

function formatMoney(cents?: number) {
  return `$${((cents || 0) / 100).toFixed(2)}`;
}

function JobCard({
  job,
  onOpen,
}: {
  job: CxJob;
  onOpen: (job: CxJob) => void;
}) {
  const stops = [...(job.cx_job_stops ?? [])].sort((a, b) => a.sequence - b.sequence);
  const pickup = stops.find((s) => s.stop_type === "pickup");
  const dropoff = stops.filter((s) => s.stop_type === "dropoff").pop();

  return (
    <button
      type="button"
      className="cx-job-card"
      onClick={() => onOpen(job)}
      style={{ width: "100%", textAlign: "left", cursor: "pointer", color: "inherit" }}
    >
      <Group justify="space-between" gap="xs" wrap="nowrap">
        <Badge color="orange" variant="filled" size="sm">
          {(job.job_type || "job").replace(/_/g, " ")}
        </Badge>
        <Text size="sm" fw={700} style={{ fontVariantNumeric: "tabular-nums" }}>
          {formatMoney(job.total_charge_cents)}
        </Text>
      </Group>
      <Text size="xs" c="dimmed" mt={6} lineClamp={1}>
        {pickup?.address || "—"} → {dropoff?.address || "—"}
      </Text>
      <Group gap="xs" mt={6}>
        <Badge variant="light" color="gray" size="xs">
          {(job.status || "").replace(/_/g, " ")}
        </Badge>
        <Text size="xs" c="dimmed" style={{ fontVariantNumeric: "tabular-nums" }}>
          Driver {formatMoney(job.driver_payout_offer_cents)}
        </Text>
      </Group>
    </button>
  );
}

export default function CXOpsWorkspace() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<OpsTab>("active");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState("Operator");
  const [restaurant, setRestaurant] = useState<Record<string, unknown> | null>(null);
  const [jobs, setJobs] = useState<CxJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<CxJob | null>(null);
  const [connected, setConnected] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [alerts, setAlerts] = useState<OpsAlert[]>([]);
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);
  const knownJobIds = useRef<Set<string>>(new Set());
  const bootstrapped = useRef(false);

  const billingActive = useMemo(() => {
    const s = restaurant?.cx_subscription_status;
    return s === "active" || s === "trialing";
  }, [restaurant]);

  const playAlertSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audio = alertAudioRef.current;
      if (audio) {
        audio.currentTime = 0;
        void audio.play();
        return;
      }
    } catch {
      /* fall through */
    }
    try {
      const Ctx = (window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as
        | typeof AudioContext
        | undefined;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
      setTimeout(() => void ctx.close(), 300);
    } catch {
      /* ignore */
    }
  }, [soundEnabled]);

  const pushAlert = useCallback(
    (alert: Omit<OpsAlert, "id" | "at"> & { id?: string }, playSound = false) => {
      const entry: OpsAlert = {
        id: alert.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: alert.title,
        message: alert.message,
        level: alert.level,
        at: new Date().toISOString(),
      };
      setAlerts((prev) => [entry, ...prev].slice(0, 40));
      if (playSound) playAlertSound();
    },
    [playAlertSound]
  );

  const loadJobs = useCallback(
    async (restaurantId: string, opts?: { quiet?: boolean }) => {
      if (!opts?.quiet) setRefreshing(true);
      const { data, error } = await supabase
        .from("cx_jobs")
        .select("*, cx_job_stops(*)")
        .eq("courier_restaurant_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(120);

      if (error) {
        notifications.show({
          title: "Could not load jobs",
          message: error.message,
          color: "red",
        });
      } else {
        const list = (data || []) as CxJob[];
        if (bootstrapped.current) {
          for (const job of list) {
            if (!knownJobIds.current.has(job.id)) {
              pushAlert(
                {
                  title: "New job on the board",
                  message: `${(job.job_type || "job").replace(/_/g, " ")} · ${formatMoney(job.total_charge_cents)}`,
                  level: "success",
                },
                true
              );
            }
          }
        }
        knownJobIds.current = new Set(list.map((j) => j.id));
        bootstrapped.current = true;
        setJobs(list);
      }
      setRefreshing(false);
    },
    [pushAlert]
  );

  useEffect(() => {
    const a = new Audio("/craven-notification.wav");
    a.preload = "auto";
    alertAudioRef.current = a;
    const unlockAudio = () => {
      try {
        if (alertAudioRef.current) {
          const prev = alertAudioRef.current.volume;
          alertAudioRef.current.volume = 0;
          const p = alertAudioRef.current.play();
          Promise.resolve(p)
            .then(() => {
              if (!alertAudioRef.current) return;
              alertAudioRef.current.pause();
              alertAudioRef.current.currentTime = 0;
              alertAudioRef.current.volume = prev;
            })
            .catch(() => {
              if (alertAudioRef.current) alertAudioRef.current.volume = prev;
            });
        }
      } catch {
        /* ignore */
      }
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
    return () => {
      alertAudioRef.current = null;
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/restaurant/auth", { replace: true });
        return;
      }

      const resolved = await resolveCourierRestaurant(user.id);
      if (!resolved.ok) {
        notifications.show({
          title: "Not a CX account",
          message: resolved.error,
          color: "red",
        });
        await supabase.auth.signOut({ scope: "global" }).catch(() => {});
        navigate("/restaurant/auth", { replace: true });
        return;
      }

      if (cancelled) return;

      setUserId(user.id);
      setUserName(
        (user.user_metadata as { full_name?: string })?.full_name ||
          user.email?.split("@")[0] ||
          "Operator"
      );
      setRestaurant(resolved.restaurant);
      const restaurantId = String(resolved.restaurant.id);
      await loadJobs(restaurantId);
      setLoading(false);

      channel = supabase
        .channel(`cx-ops-${restaurantId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "cx_jobs",
            filter: `courier_restaurant_id=eq.${restaurantId}`,
          },
          (payload) => {
            setConnected(true);
            if (payload.eventType === "INSERT") {
              const row = payload.new as CxJob;
              pushAlert(
                {
                  title: "New job posted",
                  message: `${(row.job_type || "job").replace(/_/g, " ")} · ${formatMoney(row.total_charge_cents)}`,
                  level: "success",
                },
                true
              );
            } else if (payload.eventType === "UPDATE") {
              const row = payload.new as CxJob;
              const prev = payload.old as { status?: string };
              if (row.status && row.status !== prev?.status) {
                const isIssue = row.status === "failed" || row.status === "cancelled";
                pushAlert(
                  {
                    title: isIssue ? "Job needs attention" : "Job status updated",
                    message: `Status → ${(row.status || "").replace(/_/g, " ")}`,
                    level: isIssue ? "critical" : "info",
                  },
                  isIssue
                );
              }
            }
            void loadJobs(restaurantId, { quiet: true });
          }
        )
        .subscribe((status) => {
          setConnected(status === "SUBSCRIBED");
        });
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [navigate, loadJobs, pushAlert]);

  const jobsByColumn = useMemo(() => {
    const map: Record<string, CxJob[]> = {
      open: [],
      assigned: [],
      in_progress: [],
      done: [],
    };
    for (const job of jobs) {
      const col = columnForStatus(job.status || "posted");
      (map[col] || map.open).push(job);
    }
    return map;
  }, [jobs]);

  const onLogout = async () => {
    await supabase.auth.signOut({ scope: "global" }).catch(() => {});
    navigate("/restaurant/auth", { replace: true });
  };

  if (loading || !restaurant) {
    return (
      <Box
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
        }}
      >
        <Loader color="orange" />
      </Box>
    );
  }

  const restaurantName =
    String(restaurant.name || restaurant.business_name || "CX Courier");

  return (
    <Box className="cx-ops-shell" style={{ background: "#0f172a", color: "#f8fafc" }}>
      <Group justify="space-between" align="center" mb="md" wrap="wrap">
        <Group gap="sm">
          <img
            src={cxLogo}
            alt="Crave'n CX"
            width={36}
            height={36}
            style={{ objectFit: "contain" }}
          />
          <Stack gap={0}>
            <Title order={4} c="white" style={{ lineHeight: 1.2 }}>
              Crave'n CX Ops
            </Title>
            <Text size="xs" c="dimmed">
              {restaurantName} · {userName}
            </Text>
          </Stack>
        </Group>

        <Group gap="sm">
          <Group gap={6}>
            {connected ? (
              <Wifi size={16} color="#22c55e" />
            ) : (
              <WifiOff size={16} color="#f97316" />
            )}
            <Text size="xs" c="dimmed">
              {connected ? "Live" : "Reconnecting"}
            </Text>
          </Group>
          <Group gap={6}>
            <Bell size={16} color="#94a3b8" />
            <Switch
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.currentTarget.checked)}
              color="orange"
              size="sm"
              label={<Text size="xs">Sound</Text>}
            />
          </Group>
          <Button
            variant="subtle"
            color="gray"
            size="compact-sm"
            leftSection={<RefreshCw size={14} />}
            loading={refreshing}
            onClick={() => loadJobs(String(restaurant.id))}
          >
            Refresh
          </Button>
          <Button
            variant="light"
            color="orange"
            size="compact-sm"
            leftSection={<ExternalLink size={14} />}
            onClick={() => navigate("/merchant-portal")}
          >
            Full portal
          </Button>
          <Button
            variant="subtle"
            color="gray"
            size="compact-sm"
            leftSection={<LogOut size={14} />}
            onClick={onLogout}
          >
            Log out
          </Button>
        </Group>
      </Group>

      {!billingActive && (
        <Box
          mb="md"
          p="sm"
          style={{
            borderRadius: 12,
            border: "1px solid #f97316",
            background: "rgba(249,115,22,0.12)",
          }}
        >
          <Group justify="space-between" align="center" wrap="wrap">
            <Text size="sm" c="orange.2">
              Billing is inactive. Posting jobs is locked until your CX subscription is active or
              trialing.
            </Text>
            <Button size="xs" color="orange" onClick={() => navigate("/merchant-portal")}>
              Open billing in portal
            </Button>
          </Group>
        </Box>
      )}

      <Tabs
        value={tab}
        onChange={(v) => setTab((v as OpsTab) || "active")}
        color="orange"
        variant="pills"
      >
        <Tabs.List mb="md">
          <Tabs.Tab value="active" leftSection={<Truck size={16} />}>
            Active
            <Badge ml={8} size="sm" variant="filled" color="dark">
              {jobs.filter((j) => !["delivered", "cancelled", "failed"].includes(j.status)).length}
            </Badge>
          </Tabs.Tab>
          <Tabs.Tab value="post" leftSection={<Plus size={16} />} disabled={!billingActive}>
            Post job
          </Tabs.Tab>
          <Tabs.Tab value="alerts" leftSection={<Bell size={16} />}>
            Alerts
            {alerts.length > 0 && (
              <Badge ml={8} size="sm" color="orange" variant="filled">
                {alerts.length}
              </Badge>
            )}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="active">
          <Group align="flex-start" gap="sm" grow preventGrowOverflow={false} wrap="nowrap">
            {BOARD_COLUMNS.map((col) => (
              <Box key={col.id} className="cx-board-col">
                <Group justify="space-between" mb={8}>
                  <Text size="sm" fw={700} c="gray.2">
                    {col.label}
                  </Text>
                  <Badge size="sm" variant="outline" color="gray">
                    {jobsByColumn[col.id]?.length || 0}
                  </Badge>
                </Group>
                <ScrollArea h="calc(100vh - 220px)" offsetScrollbars>
                  {(jobsByColumn[col.id] || []).length === 0 ? (
                    <Text size="xs" c="dimmed" py="md" ta="center">
                      Empty
                    </Text>
                  ) : (
                    (jobsByColumn[col.id] || []).map((job) => (
                      <JobCard key={job.id} job={job} onOpen={setSelectedJob} />
                    ))
                  )}
                </ScrollArea>
              </Box>
            ))}
          </Group>
        </Tabs.Panel>

        <Tabs.Panel value="post">
          {billingActive ? (
            <Box
              p="md"
              style={{
                borderRadius: 14,
                border: "1px solid #334155",
                background: "#1e293b",
                maxWidth: 720,
              }}
            >
              <Text fw={700} mb="sm" c="white">
                Post a courier job
              </Text>
              <CXPostJobForm
                restaurant={restaurant}
                userId={userId}
                onPosted={() => {
                  void loadJobs(String(restaurant.id));
                  setTab("active");
                  pushAlert(
                    {
                      title: "Job posted",
                      message: "Your job is on the Active board.",
                      level: "success",
                    },
                    true
                  );
                }}
              />
            </Box>
          ) : (
            <Text c="dimmed">Activate billing in the full portal to post jobs.</Text>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="alerts">
          <Box
            p="md"
            style={{
              borderRadius: 14,
              border: "1px solid #334155",
              background: "#1e293b",
              maxWidth: 640,
            }}
          >
            {alerts.length === 0 ? (
              <Text size="sm" c="dimmed">
                No alerts yet. New jobs and status changes appear here.
              </Text>
            ) : (
              <Stack gap="sm">
                {alerts.map((a) => (
                  <Box
                    key={a.id}
                    p="sm"
                    style={{
                      borderRadius: 10,
                      border: "1px solid #334155",
                      background: "#0f172a",
                    }}
                  >
                    <Group justify="space-between" align="flex-start">
                      <Stack gap={2}>
                        <Text size="sm" fw={700} c="white">
                          {a.title}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {a.message}
                        </Text>
                      </Stack>
                      <Badge
                        size="xs"
                        color={
                          a.level === "critical"
                            ? "red"
                            : a.level === "warning"
                              ? "yellow"
                              : a.level === "success"
                                ? "green"
                                : "gray"
                        }
                      >
                        {a.level}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed" mt={6}>
                      {new Date(a.at).toLocaleString()}
                    </Text>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Tabs.Panel>
      </Tabs>

      <CXJobDetailModal
        job={selectedJob}
        open={!!selectedJob}
        onOpenChange={(open) => {
          if (!open) setSelectedJob(null);
        }}
      />
    </Box>
  );
}

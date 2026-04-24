import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  Modal,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
  Textarea,
  Title
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconBell,
  IconClipboardList,
  IconClock,
  IconHelpCircle,
  IconLogout,
  IconMapPin,
  IconPackage,
  IconPrinter,
  IconRefresh,
  IconTruck,
  IconUser,
  IconWifi
} from "@tabler/icons-react";
import { supabase } from "@root/integrations/supabase/client";
import { useRestaurantSelector } from "@root/hooks/useRestaurantSelector";

type LiveTab = "new" | "preparing" | "ready" | "completed" | "issues";

type LiveOrder = {
  id: string;
  order_number: string | null;
  customer_name: string | null;
  order_status: string | null;
  created_at: string | null;
  total_cents: number;
  driver_id: string | null;
  accepted_at: string | null;
  driver_arrived_at: string | null;
  pickup_parking_spot: string | null;
  delivery_method: string | null;
  delivery_address: unknown;
  pickup_address?: unknown;
  estimated_delivery_time: string | null;
  order_items: Array<{
    id: string;
    quantity: number;
    price_cents: number;
    special_instructions: string | null;
    name: string;
  }>;
};

type AssignmentRow = {
  id: string;
  order_id: string;
  driver_id: string;
  status: string;
  expires_at: string;
};

type OpsAlert = {
  id: string;
  title: string;
  message: string;
  level: "info" | "warning" | "critical" | "success";
  orderId?: string;
  createdAt: number;
};

const STATUS_UI: Record<string, { tab: LiveTab; label: string; color: string }> = {
  pending: { tab: "new", label: "Needs confirmation", color: "orange" },
  confirmed: { tab: "preparing", label: "Preparing", color: "blue" },
  preparing: { tab: "preparing", label: "Preparing", color: "blue" },
  ready: { tab: "ready", label: "Ready", color: "teal" },
  out_for_delivery: { tab: "completed", label: "Out for delivery", color: "grape" },
  picked_up: { tab: "completed", label: "Picked up", color: "grape" },
  delivered: { tab: "completed", label: "Completed", color: "green" },
  cancelled: { tab: "issues", label: "Issue / cancelled", color: "red" }
};

const formatTime = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value))
    : "--";

const formatMoney = (cents: number) => `$${(Number(cents || 0) / 100).toFixed(2)}`;
const toNum = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const haversineMiles = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function LiveOrdersWorkspace() {
  const navigate = useNavigate();
  const { selectedRestaurant, loading } = useRestaurantSelector();
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [activeTab, setActiveTab] = useState<LiveTab>("new");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [assignmentsByOrder, setAssignmentsByOrder] = useState<Record<string, AssignmentRow[]>>({});
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState<"connected" | "connecting" | "disconnected">("connecting");
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueType, setIssueType] = useState<string>("item_unavailable");
  const [issueNotes, setIssueNotes] = useState("");
  const [prepMinutes, setPrepMinutes] = useState<number>(20);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrValue, setQrValue] = useState("");
  const [driverDistanceByOrder, setDriverDistanceByOrder] = useState<Record<string, number>>({});
  const [opsAlerts, setOpsAlerts] = useState<OpsAlert[]>([]);
  const lastPendingCount = useRef(0);
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);
  const recentNewOrderIdsRef = useRef<Set<string>>(new Set());
  const visibleOrderIdsRef = useRef<Set<string>>(new Set());
  const arrivedNotifiedRef = useRef<Set<string>>(new Set());
  const approachingNotifiedRef = useRef<Set<string>>(new Set());
  const spotNotifiedRef = useRef<Set<string>>(new Set());

  const storeLabel = useMemo(() => {
    if (!selectedRestaurant) return "No store selected";
    return selectedRestaurant.name || "Store";
  }, [selectedRestaurant]);
  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) ?? orders[0] ?? null,
    [orders, selectedOrderId]
  );

  const printReceipt = (order: LiveOrder) => {
    const orderNo = order.order_number || order.id.slice(-4).toUpperCase();
    const merchantName = selectedRestaurant?.name || "Merchant";
    const merchantAddress = (selectedRestaurant as any)?.address || "Address unavailable";
    const merchantPhone = (selectedRestaurant as any)?.phone || "Phone unavailable";
    const nowText = new Date().toLocaleString();
    const createdText = formatTime(order.created_at);
    const itemsTotal = order.order_items.reduce((sum, i) => sum + i.price_cents * i.quantity, 0);
    const taxEstimate = Math.max(0, order.total_cents - itemsTotal);
    const rows = order.order_items
      .map(
        (item) => `
          <div class="line item">
            <div class="left">${item.quantity}x ${item.name}</div>
            <div class="right">${formatMoney(item.price_cents * item.quantity)}</div>
          </div>
          ${
            item.special_instructions
              ? `<div class="line note"><div class="left">  - ${item.special_instructions}</div><div></div></div>`
              : ""
          }
        `
      )
      .join("");
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Crave'n Receipt ${orderNo}</title>
        <style>
          @page { size: 80mm auto; margin: 6mm; }
          body { font-family: "Courier New", monospace; margin: 0; color: #111; }
          .ticket { width: 72mm; margin: 0 auto; }
          .center { text-align: center; }
          .logo { max-width: 120px; max-height: 52px; object-fit: contain; margin: 0 auto 6px; display: block; }
          .brand { font-weight: 800; font-size: 18px; margin-bottom: 3px; }
          .sub { font-size: 12px; line-height: 1.35; }
          .craven { margin-top: 6px; font-size: 12px; font-weight: 700; color: #c2410c; }
          hr { border: none; border-top: 1px dashed #888; margin: 8px 0; }
          .line { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; font-size: 12px; line-height: 1.35; }
          .item .left { font-weight: 700; }
          .note { color: #444; font-size: 11px; margin-bottom: 4px; }
          .totals .line { margin: 2px 0; }
          .grand { font-weight: 800; font-size: 14px; margin-top: 6px; }
          .footer { margin-top: 8px; font-size: 11px; text-align: center; color: #555; }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="center">
            ${selectedRestaurant && (selectedRestaurant as any).logo_url ? `<img class="logo" src="${(selectedRestaurant as any).logo_url}" alt="${merchantName}" />` : ""}
            <div class="brand">${merchantName}</div>
            <div class="sub">${merchantAddress}</div>
            <div class="sub">${merchantPhone}</div>
            <div class="craven">ORDER PLACED VIA CRAVE'N</div>
          </div>
          <hr />
          <div class="line"><div>Order #</div><div>${orderNo}</div></div>
          <div class="line"><div>Status</div><div>${(order.order_status || "pending").replace(/_/g, " ")}</div></div>
          <div class="line"><div>Customer</div><div>${order.customer_name || "Customer"}</div></div>
          <div class="line"><div>Type</div><div>${order.delivery_method || "delivery"}</div></div>
          <div class="line"><div>Placed</div><div>${createdText}</div></div>
          <div class="line"><div>Printed</div><div>${nowText}</div></div>
          <hr />
          ${rows}
          <hr />
          <div class="totals">
            <div class="line"><div>Subtotal</div><div>${formatMoney(itemsTotal)}</div></div>
            <div class="line"><div>Tax/Fees</div><div>${formatMoney(taxEstimate)}</div></div>
            <div class="line grand"><div>TOTAL</div><div>${formatMoney(order.total_cents)}</div></div>
          </div>
          <hr />
          <div class="footer">
            Crave'n merchant operations receipt<br />
            Keep this ticket with the handoff.
          </div>
        </div>
        <script>
          window.onload = () => {
            window.print();
            setTimeout(() => window.close(), 250);
          };
        </script>
      </body>
      </html>
    `;
    const w = window.open("", "_blank", "noopener,noreferrer,width=420,height=900");
    if (!w) {
      pushOpsAlert({
        title: "Print blocked",
        message: "Please allow popups to print receipts.",
        level: "critical",
        orderId: order.id
      });
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const pushOpsAlert = (
    alert: Omit<OpsAlert, "id" | "createdAt">,
    dedupeKey?: string
  ) => {
    setOpsAlerts((prev) => {
      if (dedupeKey) {
        const exists = prev.some((a) => `${a.level}|${a.title}|${a.orderId || ""}|${a.message}` === dedupeKey);
        if (exists) return prev;
      }
      const next: OpsAlert = {
        ...alert,
        id: crypto.randomUUID(),
        createdAt: Date.now()
      };
      return [next, ...prev].slice(0, 30);
    });
  };

  const fetchOrders = async () => {
    if (!selectedRestaurant?.id) return;
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, customer_name, order_status, created_at, total_cents, driver_id, accepted_at, driver_arrived_at, pickup_parking_spot, delivery_method, delivery_address, pickup_address, estimated_delivery_time"
        )
        .eq("restaurant_id", selectedRestaurant.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;

      const rows = (data || []) as LiveOrder[];
      const hydrated = await Promise.all(
        rows.map(async (order) => {
          const { data: items } = await supabase
            .from("order_items")
            .select("id, quantity, price_cents, special_instructions, menu_items(name)")
            .eq("order_id", order.id);
          const mappedItems =
            items?.map((item: any) => ({
              id: item.id,
              quantity: item.quantity,
              price_cents: item.price_cents,
              special_instructions: item.special_instructions ?? null,
              name: item.menu_items?.name || "Item"
            })) || [];
          return { ...order, order_items: mappedItems };
        })
      );
      setOrders(hydrated);
      visibleOrderIdsRef.current = new Set(hydrated.map((o) => o.id));
      const ids = hydrated.map((o) => o.id);
      if (ids.length > 0) {
        const { data: assignments } = await supabase
          .from("order_assignments")
          .select("id, order_id, driver_id, status, expires_at")
          .in("order_id", ids)
          .order("created_at", { ascending: false });
        const grouped: Record<string, AssignmentRow[]> = {};
        (assignments || []).forEach((a: any) => {
          if (!grouped[a.order_id]) grouped[a.order_id] = [];
          grouped[a.order_id].push(a as AssignmentRow);
        });
        setAssignmentsByOrder(grouped);
      } else {
        setAssignmentsByOrder({});
      }
      if (!selectedOrderId && hydrated.length > 0) setSelectedOrderId(hydrated[0].id);
    } catch (err: unknown) {
      pushOpsAlert({
        title: "Live Orders sync error",
        message: err instanceof Error ? err.message : "Unknown error while loading orders.",
        level: "critical"
      });
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    const a = new Audio("/craven-notification.wav");
    a.preload = "auto";
    alertAudioRef.current = a;

    const unlockAudio = () => {
      audioUnlockedRef.current = true;
      // Try a silent warm-up so subsequent plays are instant.
      try {
        if (alertAudioRef.current) {
          const prev = alertAudioRef.current.volume;
          alertAudioRef.current.volume = 0;
          const p = alertAudioRef.current.play();
          if (p && typeof p.then === "function") {
            p.then(() => {
              if (!alertAudioRef.current) return;
              alertAudioRef.current.pause();
              alertAudioRef.current.currentTime = 0;
              alertAudioRef.current.volume = prev;
            }).catch(() => {
              if (alertAudioRef.current) alertAudioRef.current.volume = prev;
            });
          } else {
            alertAudioRef.current.pause();
            alertAudioRef.current.currentTime = 0;
            alertAudioRef.current.volume = prev;
          }
        }
      } catch {}
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

  const playNewOrderAlert = () => {
    if (!soundEnabled) return;
    // Primary path: app notification sound asset
    try {
      const audio = alertAudioRef.current;
      if (audio) {
        audio.currentTime = 0;
        void audio.play();
        return;
      }
    } catch {}
    // Fallback: immediate WebAudio beep for autoplay-restricted contexts
    try {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {}
  };

  useEffect(() => {
    if (!selectedRestaurant?.id) return;
    void fetchOrders();
    setRealtimeStatus("connecting");
    const ordersChannel = supabase
      .channel(`live-orders-${selectedRestaurant.id}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${selectedRestaurant.id}` },
        (payload: any) => {
          if (payload?.eventType === "INSERT") {
            const oid = String(payload?.new?.id || "");
            if (oid && !recentNewOrderIdsRef.current.has(oid)) {
              recentNewOrderIdsRef.current.add(oid);
              // keep set bounded
              if (recentNewOrderIdsRef.current.size > 300) {
                const trimmed = Array.from(recentNewOrderIdsRef.current).slice(-200);
                recentNewOrderIdsRef.current = new Set(trimmed);
              }
              // fire immediately on realtime event (no fetch delay)
              playNewOrderAlert();
            }
          }
          void fetchOrders();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRealtimeStatus("connected");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setRealtimeStatus("disconnected");
      });
    const assignmentsChannel = supabase
      .channel(`live-order-assignments-${selectedRestaurant.id}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "order_assignments" },
        async (payload: any) => {
          const changedOrderId = payload?.new?.order_id || payload?.old?.order_id;
          if (!changedOrderId) return;
          // only react to assignments for currently visible restaurant orders
          if (!visibleOrderIdsRef.current.has(changedOrderId)) return;
          const { data: assignments } = await supabase
            .from("order_assignments")
            .select("id, order_id, driver_id, status, expires_at")
            .eq("order_id", changedOrderId)
            .order("created_at", { ascending: false });
          setAssignmentsByOrder((prev) => ({
            ...prev,
            [changedOrderId]: (assignments || []) as AssignmentRow[]
          }));
          // assignment changes can also imply driver assignment/acceptance state
          void fetchOrders();
        }
      )
      .subscribe();
    return () => {
      ordersChannel.unsubscribe();
      assignmentsChannel.unsubscribe();
    };
  }, [selectedRestaurant?.id]);

  const counts = useMemo(() => {
    const c = { new: 0, preparing: 0, ready: 0, completed: 0, issues: 0 };
    orders.forEach((order) => {
      const key = STATUS_UI[order.order_status || "pending"]?.tab || "new";
      c[key] += 1;
    });
    return c;
  }, [orders]);

  useEffect(() => {
    const pending = counts.new;
    if (pending > lastPendingCount.current && soundEnabled) {
      playNewOrderAlert();
      pushOpsAlert({
        title: "New order received",
        message: `${pending} order${pending > 1 ? "s" : ""} need confirmation.`,
        level: "warning"
      }, `warning|new-order||${pending}`);
    }
    lastPendingCount.current = pending;
  }, [counts.new, soundEnabled]);

  const filteredOrders = useMemo(
    () => orders.filter((o) => (STATUS_UI[o.order_status || "pending"]?.tab || "new") === activeTab),
    [orders, activeTab]
  );

  const isCurbsideOrder = (order: LiveOrder) =>
    Boolean(order.pickup_parking_spot) ||
    String(order.delivery_method || "").toLowerCase().includes("curbside");

  const getWaitMinutes = (order: LiveOrder): number => {
    if (!order.driver_arrived_at) return 0;
    const ms = Date.now() - new Date(order.driver_arrived_at).getTime();
    return Math.max(0, Math.floor(ms / 60000));
  };

  const isPostPickupState = (order: LiveOrder) =>
    order.order_status === "picked_up" ||
    order.order_status === "out_for_delivery" ||
    order.order_status === "delivered";

  const getWaitBlinkStyle = (order: LiveOrder): React.CSSProperties => {
    if (isPostPickupState(order)) return {};
    const wait = getWaitMinutes(order);
    if (!order.driver_arrived_at) return {};
    if (wait >= 5) {
      return { animation: "live-orders-blink-fast 0.5s infinite", background: "#e03131", color: "#fff" };
    }
    return { animation: "live-orders-blink 1.5s infinite", background: "#ff922b", color: "#fff" };
  };

  const getFeederStatus = (order: LiveOrder): string => {
    const assignments = assignmentsByOrder[order.id] || [];
    const accepted = assignments.find((a) => a.status === "accepted");
    const pending = assignments.find((a) => a.status === "pending");
    if (order.order_status === "delivered") return "Picked up & completed";
    if (order.order_status === "out_for_delivery") return "In route to customer";
    if (order.order_status === "picked_up") return "In route to customer";
    if (order.driver_arrived_at) return "Feeder arrived";
    if (order.pickup_parking_spot) return `At curbside spot ${order.pickup_parking_spot}`;
    if (order.driver_id || accepted) return "Feeder assigned";
    if (pending) return "Searching for feeder";
    if (order.order_status === "ready") return "Waiting for feeder";
    return "Searching for feeder";
  };

  useEffect(() => {
    // Arrival + parking alerts
    for (const order of orders) {
      if (order.driver_arrived_at && !arrivedNotifiedRef.current.has(order.id)) {
        arrivedNotifiedRef.current.add(order.id);
        pushOpsAlert({
          title: isCurbsideOrder(order) ? "Feeder has arrived (curbside)" : "Feeder has arrived",
          message: isCurbsideOrder(order)
            ? order.pickup_parking_spot
              ? `Driver is at curbside spot ${order.pickup_parking_spot}.`
              : "Driver is outside for curbside pickup."
            : "Driver is at your store.",
          level: "warning",
          orderId: order.id
        }, `warning|arrived|${order.id}|${order.pickup_parking_spot || ""}`);
      }
      if (order.pickup_parking_spot) {
        const spotKey = `${order.id}:${order.pickup_parking_spot}`;
        if (spotNotifiedRef.current.has(spotKey)) continue;
        spotNotifiedRef.current.add(spotKey);
        pushOpsAlert({
          title: "Retail spot selected",
          message: `Feeder parked at spot ${order.pickup_parking_spot}.`,
          level: "info",
          orderId: order.id
        }, `info|spot|${spotKey}`);
      }
    }
  }, [orders]);

  useEffect(() => {
    if (!selectedRestaurant?.id) return;
    const channel = supabase
      .channel(`live-driver-locations-${selectedRestaurant.id}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "driver_locations" },
        async (payload: any) => {
          const row = payload?.new as { user_id?: string; lat?: number; lng?: number } | undefined;
          if (!row?.user_id || typeof row.lat !== "number" || typeof row.lng !== "number") return;
          const targetOrders = orders.filter((o) => o.driver_id === row.user_id && !o.driver_arrived_at);
          if (targetOrders.length === 0) return;
          const nextDist: Record<string, number> = {};
          for (const order of targetOrders) {
            const p = (order.pickup_address || {}) as Record<string, unknown>;
            const plat = toNum(p.latitude);
            const plng = toNum(p.longitude);
            if (plat == null || plng == null) continue;
            const miles = haversineMiles(row.lat, row.lng, plat, plng);
            nextDist[order.id] = miles;
            // in-store approaching alert at <= 1 mile
            if (!isCurbsideOrder(order) && miles <= 1 && !approachingNotifiedRef.current.has(order.id)) {
              approachingNotifiedRef.current.add(order.id);
              pushOpsAlert({
                title: "Driver is approaching",
                message: "Feeder is within 1 mile of your store.",
                level: "info",
                orderId: order.id
              }, `info|approaching|${order.id}|1mile`);
            }
          }
          if (Object.keys(nextDist).length > 0) {
            setDriverDistanceByOrder((prev) => ({ ...prev, ...nextDist }));
          }
        }
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [selectedRestaurant?.id, orders]);

  const updateOrder = async (orderId: string, patch: Record<string, unknown>) => {
    const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
    if (error) {
      pushOpsAlert({
        title: "Order update failed",
        message: error.message,
        level: "critical",
        orderId
      });
      return false;
    }
    await fetchOrders();
    return true;
  };

  const confirmOrder = async () => {
    if (!selectedOrder) return;
    const eta = new Date(Date.now() + prepMinutes * 60 * 1000).toISOString();
    await updateOrder(selectedOrder.id, {
      order_status: "preparing",
      accepted_at: new Date().toISOString(),
      estimated_delivery_time: eta
    });
  };

  const markReady = async () => {
    if (!selectedOrder) return;
    await updateOrder(selectedOrder.id, { order_status: "ready" });
  };

  const addPrepTime = async (minutes: number) => {
    if (!selectedOrder) return;
    const base = selectedOrder.estimated_delivery_time ? new Date(selectedOrder.estimated_delivery_time).getTime() : Date.now();
    const eta = new Date(base + minutes * 60 * 1000).toISOString();
    await updateOrder(selectedOrder.id, { estimated_delivery_time: eta });
  };

  const submitIssue = async () => {
    if (!selectedOrder) return;
    const ok = await updateOrder(selectedOrder.id, { order_status: "cancelled" });
    if (!ok) return;
    pushOpsAlert({
      title: "Issue reported",
      message: issueNotes.trim()
        ? `${issueType.replace(/_/g, " ")}: ${issueNotes.trim()}`
        : issueType.replace(/_/g, " "),
      level: "warning",
      orderId: selectedOrder.id
    });
    setIssueOpen(false);
    setIssueNotes("");
  };

  if (loading) {
    return (
      <Box style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Stack align="center" gap="sm">
          <Loader color="orange" />
          <Text size="sm" c="dimmed">
            Loading Live Orders...
          </Text>
        </Stack>
      </Box>
    );
  }

  if (!selectedRestaurant) {
    return (
      <Box className="live-orders-shell">
        <Stack gap="md">
          <Title order={2}>Crave'n Live Orders</Title>
          <Text c="dimmed">No restaurant is linked to this account yet.</Text>
          <Button color="orange" onClick={() => navigate("/restaurant/register")}>
            Register Restaurant
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box className="live-orders-shell">
      <Group align="stretch" gap={0} style={{ minHeight: "100vh" }}>
        <Box
          w={104}
          style={{
            borderRight: "1px solid #eceef2",
            background: "#fff",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "16px 8px"
          }}
        >
          <Stack gap="xl" align="center">
            <Title order={2} c="orange.6">
              Crave'n
            </Title>
            <ActionIcon variant="subtle" color="gray" size="xl">
              <IconHelpCircle size={20} />
            </ActionIcon>
          </Stack>
          <Stack gap="md" align="center">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="xl"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/restaurant/auth", { replace: true });
              }}
            >
              <IconLogout size={20} />
            </ActionIcon>
            <Text size="xs" c="dimmed">
              Logout
            </Text>
          </Stack>
        </Box>

        <Box style={{ flex: 1, background: "#f8f9fb" }}>
          <Group justify="space-between" px="md" py="sm" style={{ borderBottom: "1px solid #eceef2", background: "#fff" }}>
            <Group gap="md">
              <Title order={2}>Live Orders</Title>
              <Text c="dimmed">{storeLabel}</Text>
              <Text c="dimmed">{new Date().toLocaleString()}</Text>
              <Badge leftSection={<IconWifi size={12} />} color={realtimeStatus === "connected" ? "teal" : "gray"} variant="light">
                {realtimeStatus}
              </Badge>
            </Group>
            <Group gap="sm">
              <Group gap={6}>
                <IconBell size={16} />
                <Text size="sm">Sound Alerts</Text>
                <Switch checked={soundEnabled} onChange={(e) => setSoundEnabled(e.currentTarget.checked)} color="orange" />
              </Group>
              <ActionIcon variant="light" color="orange" onClick={() => void fetchOrders()}>
                <IconRefresh size={18} />
              </ActionIcon>
            </Group>
          </Group>

          <Group align="stretch" gap={0}>
            <Box style={{ flex: 1, padding: 16 }}>
              {counts.new > 0 && (
                <Card withBorder radius="md" mb="md" style={{ background: "#fff4e6", borderColor: "#ffd8a8" }}>
                  <Group justify="space-between">
                    <Group gap="xs">
                      <IconAlertTriangle size={16} color="#f76707" />
                      <Text fw={700} c="orange.8">
                        {counts.new} new order{counts.new > 1 ? "s" : ""} need confirmation
                      </Text>
                    </Group>
                  </Group>
                </Card>
              )}

              {opsAlerts.length > 0 && (
                <Card withBorder radius="md" mb="md" style={{ background: "#fff" }}>
                  <Group justify="space-between" mb={8}>
                    <Text fw={700}>Operational Alerts</Text>
                    <Button
                      size="xs"
                      variant="subtle"
                      color="gray"
                      onClick={() => setOpsAlerts([])}
                    >
                      Clear all
                    </Button>
                  </Group>
                  <Stack gap={8}>
                    {opsAlerts.slice(0, 5).map((a) => {
                      const styleMap: Record<OpsAlert["level"], { bg: string; border: string; text: string }> = {
                        info: { bg: "#eff6ff", border: "#bfdbfe", text: "#1e3a8a" },
                        warning: { bg: "#fff7ed", border: "#fed7aa", text: "#9a3412" },
                        critical: { bg: "#fef2f2", border: "#fecaca", text: "#991b1b" },
                        success: { bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46" }
                      };
                      const s = styleMap[a.level];
                      return (
                        <Group
                          key={a.id}
                          justify="space-between"
                          align="start"
                          style={{
                            background: s.bg,
                            border: `1px solid ${s.border}`,
                            borderRadius: 8,
                            padding: "8px 10px"
                          }}
                        >
                          <Box style={{ flex: 1, minWidth: 0 }}>
                            <Text fw={700} size="sm" c={s.text}>
                              {a.title}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {a.message}
                            </Text>
                          </Box>
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="gray"
                            onClick={() => setOpsAlerts((prev) => prev.filter((x) => x.id !== a.id))}
                          >
                            ×
                          </ActionIcon>
                        </Group>
                      );
                    })}
                  </Stack>
                </Card>
              )}

              <Tabs value={activeTab} onChange={(v) => setActiveTab((v as LiveTab) || "new")} color="orange">
                <Tabs.List>
                  <Tabs.Tab value="new">New {counts.new > 0 ? `(${counts.new})` : ""}</Tabs.Tab>
                  <Tabs.Tab value="preparing">Preparing {counts.preparing > 0 ? `(${counts.preparing})` : ""}</Tabs.Tab>
                  <Tabs.Tab value="ready">Ready {counts.ready > 0 ? `(${counts.ready})` : ""}</Tabs.Tab>
                  <Tabs.Tab value="completed">Completed {counts.completed > 0 ? `(${counts.completed})` : ""}</Tabs.Tab>
                  <Tabs.Tab value="issues">Issues {counts.issues > 0 ? `(${counts.issues})` : ""}</Tabs.Tab>
                </Tabs.List>
              </Tabs>

              {loadingOrders ? (
                <Box py="xl" style={{ textAlign: "center" }}>
                  <Loader color="orange" />
                </Box>
              ) : filteredOrders.length === 0 ? (
                <Card withBorder radius="md" mt="md">
                  <Text c="dimmed">No orders in this queue.</Text>
                </Card>
              ) : (
                <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="md" mt="md">
                  {filteredOrders.map((order) => {
                    const selected = selectedOrder?.id === order.id;
                    const statusUi = STATUS_UI[order.order_status || "pending"] || STATUS_UI.pending;
                    const itemPreview = order.order_items
                      .slice(0, 2)
                      .map((i) => `${i.quantity}x ${i.name}`)
                      .join(", ");
                    const waitMinutes = getWaitMinutes(order);
                    const postPickup = isPostPickupState(order);
                    return (
                      <Card
                        key={order.id}
                        withBorder
                        radius="md"
                        p="md"
                        onClick={() => setSelectedOrderId(order.id)}
                        style={{
                          cursor: "pointer",
                          borderColor: selected ? "#ff922b" : "#e9ecef",
                          boxShadow: selected ? "0 0 0 1px #ff922b inset" : "none"
                        }}
                      >
                        <Group justify="space-between" align="start">
                          <Title order={2}>#{order.order_number || order.id.slice(-4)}</Title>
                          <Text size="xs" c="dimmed">
                            {formatTime(order.created_at)}
                          </Text>
                        </Group>
                        <Text fw={700} mt={4}>
                          {order.customer_name || "Customer"}
                        </Text>
                        <Group gap={6} mt={4}>
                          <IconTruck size={14} color="#f76707" />
                          <Text size="sm" c="dimmed">
                            {order.delivery_method || "Delivery"}
                          </Text>
                        </Group>
                        <Divider my="sm" />
                        <Group justify="space-between">
                          <Group gap={6}>
                            <IconClock size={15} />
                            <Text size="sm">Prep Time</Text>
                          </Group>
                          <Text fw={700}>{order.estimated_delivery_time ? `${Math.max(0, Math.round((new Date(order.estimated_delivery_time).getTime() - Date.now()) / 60000))} min` : "--"}</Text>
                        </Group>
                        <Group gap={6} mt={4}>
                          <IconPackage size={15} />
                          <Text size="sm" lineClamp={2}>
                            {itemPreview || "Items pending"}
                          </Text>
                        </Group>
                        <Badge mt="md" color={statusUi.color} variant="light" size="lg" fullWidth>
                          {statusUi.label}
                        </Badge>
                        {order.driver_arrived_at && !postPickup && (
                          <Badge mt={8} fullWidth style={getWaitBlinkStyle(order)}>
                            Driver waiting {waitMinutes} min
                          </Badge>
                        )}
                        {order.driver_arrived_at && postPickup && (
                          <Badge mt={8} fullWidth color="gray" variant="light">
                            Waited: {waitMinutes} min
                          </Badge>
                        )}
                        {order.pickup_parking_spot && (
                          <Badge mt={8} color="teal" variant={postPickup ? "light" : "filled"} fullWidth>
                            {postPickup ? `Reserved spot: ${order.pickup_parking_spot}` : `Spot ${order.pickup_parking_spot}`}
                          </Badge>
                        )}
                        <Text size="xs" c="dimmed" mt={8}>
                          {getFeederStatus(order)}
                        </Text>
                      </Card>
                    );
                  })}
                </SimpleGrid>
              )}
            </Box>

            <Box
              w={360}
              style={{
                borderLeft: "1px solid #eceef2",
                background: "#fff",
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column"
              }}
            >
              <ScrollArea style={{ height: "100vh" }} p="md">
                {!selectedOrder ? (
                  <Text c="dimmed">Select an order to view details.</Text>
                ) : (
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Title order={2}>Order #{selectedOrder.order_number || selectedOrder.id.slice(-4)}</Title>
                      <Badge color={(STATUS_UI[selectedOrder.order_status || "pending"] || STATUS_UI.pending).color}>
                        {(STATUS_UI[selectedOrder.order_status || "pending"] || STATUS_UI.pending).label}
                      </Badge>
                    </Group>
                    <Group gap={6}>
                      <IconUser size={15} />
                      <Text>{selectedOrder.customer_name || "Customer"}</Text>
                    </Group>
                    <Group gap={6}>
                      <IconMapPin size={15} />
                      <Text size="sm" c="dimmed">
                        {typeof selectedOrder.delivery_address === "string" ? selectedOrder.delivery_address : "Delivery address on file"}
                      </Text>
                    </Group>
                    <Divider />
                    <Text fw={700}>Items</Text>
                    {selectedOrder.order_items.map((item) => (
                      <Group key={item.id} justify="space-between" align="start">
                        <Box style={{ flex: 1 }}>
                          <Text fw={600}>
                            {item.quantity}x {item.name}
                          </Text>
                          {item.special_instructions && (
                            <Text size="xs" c="dimmed">
                              {item.special_instructions}
                            </Text>
                          )}
                        </Box>
                        <Text>{formatMoney(item.price_cents * item.quantity)}</Text>
                      </Group>
                    ))}
                    <Divider />
                    <Text fw={700}>Prep Time</Text>
                    <Group gap={6}>
                      {[10, 15, 20, 25, 30].map((m) => (
                        <Button
                          key={m}
                          variant={prepMinutes === m ? "filled" : "light"}
                          color="orange"
                          onClick={() => setPrepMinutes(m)}
                          size="xs"
                        >
                          {m}
                        </Button>
                      ))}
                    </Group>
                    <Group grow>
                      <Button variant="light" leftSection={<IconClock size={15} />} onClick={() => void addPrepTime(5)}>
                        Add 5 min
                      </Button>
                      <Button
                        variant="light"
                        leftSection={<IconPrinter size={15} />}
                        onClick={() => selectedOrder && printReceipt(selectedOrder)}
                      >
                        Print
                      </Button>
                    </Group>
                    <Button variant="light" color="red" leftSection={<IconAlertTriangle size={15} />} onClick={() => setIssueOpen(true)}>
                      Report Issue
                    </Button>
                    {(selectedOrder.order_status === "pending" || !selectedOrder.order_status) && (
                      <Button color="orange" size="lg" onClick={() => void confirmOrder()}>
                        Confirm Order
                      </Button>
                    )}
                    {(selectedOrder.order_status === "confirmed" || selectedOrder.order_status === "preparing") && (
                      <Button color="orange" size="lg" onClick={() => void markReady()}>
                        Ready for Pickup
                      </Button>
                    )}
                    <Card withBorder>
                      <Text fw={700}>Feeder Status</Text>
                      <Text size="sm" c="dimmed">
                        {getFeederStatus(selectedOrder)}
                      </Text>
                      {selectedOrder.driver_arrived_at && !isPostPickupState(selectedOrder) && (
                        <Text size="sm" fw={700} c="red" mt={6}>
                          Waiting {getWaitMinutes(selectedOrder)} min
                        </Text>
                      )}
                      {selectedOrder.driver_arrived_at && isPostPickupState(selectedOrder) && (
                        <Text size="sm" fw={700} c="dark" mt={6}>
                          Waited: {getWaitMinutes(selectedOrder)} min
                        </Text>
                      )}
                      {selectedOrder.pickup_parking_spot && (
                        <Text size="sm" fw={700} c="teal" mt={6}>
                          Reserved spot: {selectedOrder.pickup_parking_spot}
                        </Text>
                      )}
                      {!isCurbsideOrder(selectedOrder) && driverDistanceByOrder[selectedOrder.id] != null && !selectedOrder.driver_arrived_at && (
                        <Text size="sm" c="blue" mt={6}>
                          Approaching: {driverDistanceByOrder[selectedOrder.id].toFixed(2)} mi
                        </Text>
                      )}
                    </Card>
                    <Button variant="light" leftSection={<IconClipboardList size={15} />} onClick={() => setQrOpen(true)}>
                      Scan feeder QR to verify pickup
                    </Button>
                    <Text fw={700}>Total: {formatMoney(selectedOrder.total_cents)}</Text>
                  </Stack>
                )}
              </ScrollArea>
            </Box>
          </Group>
        </Box>
      </Group>

      <Modal opened={issueOpen} onClose={() => setIssueOpen(false)} title="Report order issue" centered>
        <Stack>
          <Select
            label="Issue type"
            value={issueType}
            onChange={(v) => setIssueType(v || "item_unavailable")}
            data={[
              { value: "item_unavailable", label: "Item unavailable" },
              { value: "store_busy", label: "Store too busy" },
              { value: "need_more_prep", label: "Need more prep time" },
              { value: "customer_note_issue", label: "Customer note issue" },
              { value: "cancel_request", label: "Order needs cancellation" },
              { value: "feeder_not_arrived", label: "Feeder not arrived" },
              { value: "wrong_or_missing_item", label: "Wrong / missing item" }
            ]}
          />
          <Textarea
            label="Notes"
            placeholder="Add concise details for support and operations."
            value={issueNotes}
            onChange={(e) => setIssueNotes(e.currentTarget.value)}
            minRows={3}
          />
          <Button color="orange" onClick={() => void submitIssue()}>
            Submit issue
          </Button>
        </Stack>
      </Modal>
      <Modal opened={qrOpen} onClose={() => setQrOpen(false)} title="Verify feeder QR" centered>
        <Stack>
          <Text size="sm" c="dimmed">
            Scan or enter feeder QR code. This verifies correct vehicle handoff and activates pickup.
          </Text>
          <TextInput
            label="Feeder QR code"
            placeholder="Paste scanned QR value"
            value={qrValue}
            onChange={(e) => setQrValue(e.currentTarget.value)}
          />
          <Button
            color="orange"
            onClick={async () => {
              if (!selectedOrder) return;
              if (!qrValue.trim()) {
                pushOpsAlert({
                  title: "QR required",
                  message: "Scan or enter the feeder QR first.",
                  level: "critical",
                  orderId: selectedOrder.id
                });
                return;
              }
              // QR here verifies feeder identity / vehicle only; it does NOT mark picked up.
              pushOpsAlert({
                title: "Feeder verified",
                message: "Feeder and vehicle verified. Order remains in current state until feeder completes pickup.",
                level: "success",
                orderId: selectedOrder.id
              });
              setQrOpen(false);
              setQrValue("");
            }}
          >
            Verify and Activate Pickup
          </Button>
        </Stack>
      </Modal>
      <style>{`
        @keyframes live-orders-blink {
          0%, 50%, 100% { opacity: 1; }
          25%, 75% { opacity: 0.45; }
        }
        @keyframes live-orders-blink-fast {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.18; }
        }
      `}</style>
    </Box>
  );
}

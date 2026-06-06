import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Modal,
  Group,
  Loader,
  ScrollArea,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Textarea,
  Select,
  UnstyledButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconBell,
  IconClock,
  IconPackage,
  IconRefresh,
  IconWifi,
  IconCar,
  IconUser,
  IconMapPin,
  IconCheck,
  IconFlag,
} from "@tabler/icons-react";
import { supabase } from "@/integrations/supabase/client";
import { logOrderEvent } from "@/lib/orderTracking";
import {
  type KanbanColumn,
  type LiveOrder,
  type LiveOrderDriver,
  formatMoney,
  formatTime,
  getKanbanColumn,
  isRunningBehind,
  minutesSince,
  formatCustomerNameForMerchant,
  formatCustomerAreaForMerchant,
} from "./liveOrderUtils";
import "./merchant-live-orders.css";
import { MerchantSupportThread } from "./MerchantSupportThread";

const ACTIVE_STATUSES = new Set(["pending", "confirmed", "preparing", "ready", "picked_up", "out_for_delivery"]);

const COLUMN_META: Record<
  KanbanColumn,
  {
    title: string;
    subtitle: string;
    empty: string;
    accent: string;
    tint: string;
    headerBg: string;
    headerFg: string;
    actionLabel: string;
    statusLabel: string;
  }
> = {
  new: {
    title: "New",
    subtitle: "Awaiting confirm",
    empty: "No orders waiting for confirmation",
    accent: "#ef4444",
    tint: "rgba(239,68,68,0.06)",
    headerBg: "#1f7a3a",
    headerFg: "#ffffff",
    actionLabel: "Confirm order",
    statusLabel: "New",
  },
  preparing: {
    title: "Preparing",
    subtitle: "In kitchen",
    empty: "Nothing cooking right now",
    accent: "#f97316",
    tint: "rgba(249,115,22,0.06)",
    headerBg: "#1f4e8a",
    headerFg: "#ffffff",
    actionLabel: "Ready for pickup",
    statusLabel: "In progress",
  },
  ready: {
    title: "Ready",
    subtitle: "Awaiting pickup",
    empty: "No orders ready yet",
    accent: "#16a34a",
    tint: "rgba(34,197,94,0.06)",
    headerBg: "#6b2150",
    headerFg: "#ffffff",
    actionLabel: "Mark picked up",
    statusLabel: "Ready / handoff",
  },
};

const NEW_ORDER_SOUND_VOLUME = 1;

const pillButtonStyle: CSSProperties = {
  background: "rgba(255,255,255,0.18)",
  color: "#fff",
  borderRadius: 999,
  width: 44,
  height: 32,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  fontSize: 14,
};

interface MerchantLiveOrdersProps {
  restaurantId: string;
  restaurantName?: string;
  playSoundForNewOrders?: boolean;
}

export function MerchantLiveOrders({
  restaurantId,
  restaurantName,
  playSoundForNewOrders = true,
}: MerchantLiveOrdersProps) {
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(playSoundForNewOrders);
  const [realtimeStatus, setRealtimeStatus] = useState<"connected" | "connecting" | "disconnected">(
    "connecting"
  );
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [prepMinutes, setPrepMinutes] = useState(20);
  const [urgentBannerOrderId, setUrgentBannerOrderId] = useState<string | null>(null);
  const [reportIssueOpen, setReportIssueOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportNotes, setReportNotes] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [pickupConfirming, setPickupConfirming] = useState(false);

  const alertAudioRef = useRef<HTMLAudioElement | null>(null);
  const recentNewOrderIdsRef = useRef<Set<string>>(new Set());
  const repeatAlertIntervalRef = useRef<number | null>(null);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  );

  const playLoudNewOrderAlert = useCallback(() => {
    if (!soundEnabled) return;

    const playOnce = () => {
      try {
        const audio = alertAudioRef.current;
        if (audio) {
          audio.volume = NEW_ORDER_SOUND_VOLUME;
          audio.currentTime = 0;
          void audio.play().catch(() => {});
          return;
        }
      } catch {
        // fall through
      }
      try {
        const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as
          | typeof AudioContext
          | undefined;
        if (!Ctx) return;
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.28);
      } catch {
        // ignore
      }
    };

    playOnce();
    window.setTimeout(playOnce, 450);
    window.setTimeout(playOnce, 900);
  }, [soundEnabled]);

  const hydrateOrderItems = async (orderId: string) => {
    const { data: items } = await supabase
      .from("order_items")
      .select("id, order_id, quantity, price_cents, special_instructions, menu_items(name)")
      .eq("order_id", orderId);

    const normalized = (items || []).map((item: Record<string, unknown>) => ({
      id: String(item.id),
      quantity: Number(item.quantity),
      price_cents: Number(item.price_cents),
      special_instructions: (item.special_instructions as string | null) ?? null,
      name: (item.menu_items as { name?: string } | null)?.name || "Item",
    }));

    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, order_items: normalized } : order))
    );
  };

  const upsertOrderFromRealtime = (row: Partial<LiveOrder> & { id: string }) => {
    setOrders((prev) => {
      const idx = prev.findIndex((o) => o.id === row.id);
      if (idx === -1) {
        const nextOrder: LiveOrder = {
          id: row.id,
          order_number: row.order_number ?? null,
          customer_name: row.customer_name ?? null,
          order_status: row.order_status ?? "pending",
          created_at: row.created_at ?? new Date().toISOString(),
          total_cents: Number(row.total_cents ?? 0),
          accepted_at: row.accepted_at ?? null,
          driver_arrived_at: row.driver_arrived_at ?? null,
          pickup_parking_spot: row.pickup_parking_spot ?? null,
          delivery_method: row.delivery_method ?? null,
          delivery_address: row.delivery_address ?? null,
          estimated_delivery_time: row.estimated_delivery_time ?? null,
          special_instructions: row.special_instructions ?? null,
          driver_id: row.driver_id ?? null,
          accepted_driver_id: row.accepted_driver_id ?? null,
          pickup_code: row.pickup_code ?? null,
          pickup_confirmed_at: row.pickup_confirmed_at ?? null,
          feeder_offer_accepted_at: row.feeder_offer_accepted_at ?? null,
          customer_phone: row.customer_phone ?? null,
          driver: null,
          order_items: [],
        };
        return [nextOrder, ...prev];
      }
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...row, total_cents: Number(row.total_cents ?? copy[idx].total_cents ?? 0) };
      return copy;
    });
    const driverId = (row.driver_id ?? row.accepted_driver_id) as string | undefined;
    if (driverId) void hydrateDriver(row.id, driverId);
  };

  const hydrateDriver = useCallback(async (orderId: string, driverUserId: string) => {
    try {
      // driver_id on orders references auth user id (same as driver_profiles.user_id)
      const { data: dp } = await supabase
        .from("driver_profiles")
        .select("id, user_id, status, vehicle_make, vehicle_model, vehicle_year, license_plate")
        .eq("user_id", driverUserId)
        .maybeSingle();
      const { data: up } = await supabase
        .from("user_profiles")
        .select("full_name, phone, avatar_url")
        .eq("user_id", driverUserId)
        .maybeSingle();
      const driver: LiveOrderDriver = {
        id: (dp?.id as string) || driverUserId,
        user_id: driverUserId,
        full_name: (up?.full_name as string | null) ?? null,
        phone: (up?.phone as string | null) ?? null,
        avatar_url: (up?.avatar_url as string | null) ?? null,
        vehicle_make: (dp?.vehicle_make as string | null) ?? null,
        vehicle_model: (dp?.vehicle_model as string | null) ?? null,
        license_plate: (dp?.license_plate as string | null) ?? null,
        status: (dp?.status as string | null) ?? null,
      };
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, driver } : o)));
    } catch {
      // ignore
    }
  }, []);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, customer_name, customer_phone, order_status, created_at, total_cents, accepted_at, driver_arrived_at, pickup_parking_spot, delivery_method, delivery_address, estimated_delivery_time, driver_id, accepted_driver_id, pickup_code, pickup_confirmed_at, feeder_offer_accepted_at"
        )
        .eq("restaurant_id", restaurantId)
        .in("order_status", Array.from(ACTIVE_STATUSES))
        .order("created_at", { ascending: false })
        .limit(80);

      if (error) throw error;

      const rows = (data || []) as unknown as LiveOrder[];
      const orderIds = rows.map((r) => r.id);
      let itemsByOrder: Record<string, LiveOrder["order_items"]> = {};

      if (orderIds.length > 0) {
        const { data: allItems } = await supabase
          .from("order_items")
          .select("id, order_id, quantity, price_cents, special_instructions, menu_items(name)")
          .in("order_id", orderIds);

        (allItems || []).forEach((item: Record<string, unknown>) => {
          const orderId = String(item.order_id);
          if (!itemsByOrder[orderId]) itemsByOrder[orderId] = [];
          itemsByOrder[orderId].push({
            id: String(item.id),
            quantity: Number(item.quantity),
            price_cents: Number(item.price_cents),
            special_instructions: (item.special_instructions as string | null) ?? null,
            name: (item.menu_items as { name?: string } | null)?.name || "Item",
          });
        });
      }

      // Fetch driver info for any orders that have a driver assigned
      const driverUserIds = Array.from(
        new Set(
          rows
            .map((r) => (r.driver_id || r.accepted_driver_id) as string | null)
            .filter((v): v is string => !!v),
        ),
      );
      const driverByUserId: Record<string, LiveOrderDriver> = {};
      if (driverUserIds.length > 0) {
        const [{ data: dps }, { data: ups }] = await Promise.all([
          supabase
            .from("driver_profiles")
            .select("id, user_id, status, vehicle_make, vehicle_model, license_plate")
            .in("user_id", driverUserIds),
          supabase
            .from("user_profiles")
            .select("user_id, full_name, phone, avatar_url")
            .in("user_id", driverUserIds),
        ]);
        const upMap: Record<string, { full_name?: string | null; phone?: string | null; avatar_url?: string | null }> = {};
        (ups || []).forEach((u: Record<string, unknown>) => {
          upMap[String(u.user_id)] = u as never;
        });
        (dps || []).forEach((d: Record<string, unknown>) => {
          const uid = String(d.user_id);
          const u = upMap[uid] || {};
          driverByUserId[uid] = {
            id: String(d.id),
            user_id: uid,
            full_name: (u.full_name as string | null) ?? null,
            phone: (u.phone as string | null) ?? null,
            avatar_url: (u.avatar_url as string | null) ?? null,
            vehicle_make: (d.vehicle_make as string | null) ?? null,
            vehicle_model: (d.vehicle_model as string | null) ?? null,
            license_plate: (d.license_plate as string | null) ?? null,
            status: (d.status as string | null) ?? null,
          };
        });
      }

      setOrders(
        rows.map((order) => {
          const dUid = (order.driver_id || order.accepted_driver_id) as string | null;
          return {
            ...order,
            order_items: itemsByOrder[order.id] || [],
            driver: dUid ? driverByUserId[dUid] || null : null,
          };
        })
      );
    } catch (err: unknown) {
      notifications.show({
        title: "Could not load live orders",
        message: err instanceof Error ? err.message : "Unknown error",
        color: "red",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    const audio = new Audio("/craven-notification.wav");
    audio.preload = "auto";
    alertAudioRef.current = audio;

    const unlock = () => {
      try {
        if (!alertAudioRef.current) return;
        const prev = alertAudioRef.current.volume;
        alertAudioRef.current.volume = 0;
        const p = alertAudioRef.current.play();
        if (p && typeof p.then === "function") {
          p.then(() => {
            alertAudioRef.current?.pause();
            if (alertAudioRef.current) {
              alertAudioRef.current.currentTime = 0;
              alertAudioRef.current.volume = prev;
            }
          }).catch(() => {
            if (alertAudioRef.current) alertAudioRef.current.volume = prev;
          });
        }
      } catch {
        // ignore
      }
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    return () => {
      alertAudioRef.current = null;
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    void fetchOrders();
    setRealtimeStatus("connecting");

    const channel = supabase
      .channel(`merchant-live-orders-${restaurantId}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` },
        (payload: {
          eventType?: string;
          new?: Partial<LiveOrder> & { id: string; order_status?: string };
          old?: { id?: string; order_status?: string };
        }) => {
          if (payload.eventType === "INSERT" && payload.new?.id) {
            const status = payload.new.order_status || "pending";
            if (!ACTIVE_STATUSES.has(status)) return;

            upsertOrderFromRealtime(payload.new);
            void hydrateOrderItems(payload.new.id);

            const oid = String(payload.new.id);
            if (!recentNewOrderIdsRef.current.has(oid)) {
              recentNewOrderIdsRef.current.add(oid);
              playLoudNewOrderAlert();
              setUrgentBannerOrderId(oid);
              window.setTimeout(() => {
                setUrgentBannerOrderId((prev) => (prev === oid ? null : prev));
              }, 15000);
            }
          }

          if (payload.eventType === "UPDATE" && payload.new?.id) {
            const status = payload.new.order_status || "";
            if (!ACTIVE_STATUSES.has(status)) {
              setOrders((prev) => prev.filter((o) => o.id !== payload.new!.id));
              return;
            }
            upsertOrderFromRealtime(payload.new);
          }

          if (payload.eventType === "DELETE" && payload.old?.id) {
            setOrders((prev) => prev.filter((o) => o.id !== payload.old!.id));
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRealtimeStatus("connected");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setRealtimeStatus("disconnected");
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [restaurantId, fetchOrders, playLoudNewOrderAlert]);

  useEffect(() => {
    if (realtimeStatus !== "disconnected") return;
    const interval = window.setInterval(() => void fetchOrders(true), 15000);
    return () => window.clearInterval(interval);
  }, [realtimeStatus, fetchOrders]);

  const pendingCount = useMemo(
    () => orders.filter((o) => (o.order_status || "pending") === "pending").length,
    [orders]
  );

  useEffect(() => {
    if (repeatAlertIntervalRef.current != null) {
      window.clearInterval(repeatAlertIntervalRef.current);
      repeatAlertIntervalRef.current = null;
    }

    if (pendingCount === 0 || !soundEnabled) return;

    repeatAlertIntervalRef.current = window.setInterval(() => {
      playLoudNewOrderAlert();
    }, 12000);

    return () => {
      if (repeatAlertIntervalRef.current != null) {
        window.clearInterval(repeatAlertIntervalRef.current);
      }
    };
  }, [pendingCount, soundEnabled, playLoudNewOrderAlert]);

  const ordersByColumn = useMemo(() => {
    const grouped: Record<KanbanColumn, LiveOrder[]> = { new: [], preparing: [], ready: [] };
    for (const order of orders) {
      const col = getKanbanColumn(order.order_status);
      if (col) grouped[col].push(order);
    }
    return grouped;
  }, [orders]);

  const updateOrder = async (orderId: string, patch: Record<string, unknown>) => {
    const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
    if (error) {
      notifications.show({ title: "Update failed", message: error.message, color: "red" });
      return false;
    }
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? ({ ...o, ...patch } as LiveOrder) : o))
    );
    return true;
  };

  const confirmOrder = async (order: LiveOrder) => {
    const eta = new Date(Date.now() + prepMinutes * 60 * 1000).toISOString();
    const ok = await updateOrder(order.id, {
      order_status: "preparing",
      accepted_at: new Date().toISOString(),
      estimated_delivery_time: eta,
    });
    if (ok) {
      setUrgentBannerOrderId((prev) => (prev === order.id ? null : prev));
      notifications.show({ title: "Order confirmed", message: `Prep time set to ${prepMinutes} min`, color: "green" });
    }
  };

  const markReady = async (order: LiveOrder) => {
    const ok = await updateOrder(order.id, { order_status: "ready" });
    if (ok) {
      notifications.show({ title: "Order ready", message: "Marked ready for pickup", color: "green" });
      setSelectedOrderId(null);
    }
  };

  const confirmMerchantPickup = async (order: LiveOrder) => {
    setPickupConfirming(true);
    try {
      const now = new Date().toISOString();
      const ok = await updateOrder(order.id, {
        order_status: "picked_up",
        pickup_confirmed_at: order.pickup_confirmed_at || now,
      } as Record<string, unknown>);
      if (ok) {
        await logOrderEvent({
          orderId: order.id,
          eventType: "order_picked_up",
          actorRole: "merchant",
          notes: "Merchant confirmed Feeder pickup",
          metadata: {
            assigned_driver_id: order.driver_id || order.accepted_driver_id || null,
            driver_name: order.driver?.full_name || null,
          },
        });
        notifications.show({
          title: "Pickup confirmed",
          message: "Order marked as picked up by Feeder",
          color: "green",
        });
        setSelectedOrderId(null);
      }
    } finally {
      setPickupConfirming(false);
    }
  };

  const submitPickupIssue = async (order: LiveOrder) => {
    if (!reportReason) {
      notifications.show({ title: "Pick a reason", message: "Select a reason for the report", color: "orange" });
      return;
    }
    setReportSubmitting(true);
    try {
      // Log forensic event
      await logOrderEvent({
        orderId: order.id,
        eventType: "support_action",
        actorRole: "merchant",
        notes: reportNotes || `Merchant reported pickup issue: ${reportReason}`,
        metadata: {
          report_type: "pickup_issue",
          reason: reportReason,
          assigned_driver_id: order.driver_id || order.accepted_driver_id || null,
          driver_name: order.driver?.full_name || null,
          reported_at: new Date().toISOString(),
        },
      });

      // Open / append to a support thread so customer service is notified
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const subject = `Pickup issue · #${order.order_number || order.id.slice(-6).toUpperCase()}`;
        const body =
          `Merchant report — ${reportReason}\n` +
          (reportNotes ? `Notes: ${reportNotes}\n` : "") +
          `Assigned feeder: ${order.driver?.full_name || "(unknown)"}`;

        const { data: existing } = await (supabase as any)
          .from("order_support_threads")
          .select("id")
          .eq("order_id", order.id)
          .eq("channel", "message")
          .maybeSingle();

        let threadId: string | null = existing?.id ?? null;
        if (!threadId) {
          const { data: created } = await (supabase as any)
            .from("order_support_threads")
            .insert({
              order_id: order.id,
              restaurant_id: restaurantId,
              channel: "message",
              subject,
              priority: reportReason === "stolen" ? "urgent" : "high",
              created_by: user?.id ?? null,
            })
            .select("id")
            .maybeSingle();
          threadId = created?.id ?? null;
        }

        if (threadId) {
          await (supabase as any).from("order_support_messages").insert({
            thread_id: threadId,
            sender_user_id: user?.id ?? null,
            sender_role: "merchant",
            body,
            metadata: { report_type: "pickup_issue", reason: reportReason },
          });
        }
      } catch (err) {
        console.warn("[merchant] support thread create failed", err);
      }

      notifications.show({
        title: "Report sent to Crave'N support",
        message: "Customer service has been notified and will investigate.",
        color: "orange",
      });
      setReportIssueOpen(false);
      setReportReason(null);
      setReportNotes("");
    } finally {
      setReportSubmitting(false);
    }
  };

  const renderOrderCard = (order: LiveOrder, column: KanbanColumn) => {
    const meta = COLUMN_META[column];
    const behind = isRunningBehind(order);
    const itemCount = order.order_items.reduce((sum, i) => sum + i.quantity, 0);
    const status = order.order_status || "pending";
    const orderRef = order.order_number || order.id.slice(-6).toUpperCase();

    // Time meta shown in the colored header (right side)
    let timeLabel: string | null = null;
    let timeCaption: string | null = null;
    if (column === "new") {
      timeLabel = `${prepMinutes}m`;
      timeCaption = "Prep time";
    } else if (column === "preparing") {
      if (order.estimated_delivery_time) {
        const diffMin = Math.round(
          (new Date(order.estimated_delivery_time).getTime() - Date.now()) / 60000
        );
        timeLabel = diffMin >= 0 ? `${diffMin}m` : `${Math.abs(diffMin)}m`;
        timeCaption = diffMin >= 0 ? "Ready in" : "Overdue";
      } else {
        timeLabel = `${minutesSince(order.accepted_at || order.created_at)}m`;
        timeCaption = "In kitchen";
      }
    } else if (column === "ready") {
      timeLabel = order.pickup_confirmed_at
        ? `${minutesSince(order.pickup_confirmed_at)}m`
        : order.driver_arrived_at
          ? `${minutesSince(order.driver_arrived_at)}m`
          : formatTime(order.estimated_delivery_time || order.created_at);
      timeCaption = order.pickup_confirmed_at
        ? "Handoff done"
        : order.driver_arrived_at
          ? "Driver waiting"
          : "Pickup";
    }

    const itemsPreview = order.order_items.slice(0, 4);
    const moreCount = Math.max(0, order.order_items.length - itemsPreview.length);

    const headerBg = behind ? "#b42318" : meta.headerBg;
    const statusText = behind ? "Behind" : order.pickup_confirmed_at ? "Handoff verified" : meta.statusLabel;

    const handlePrimaryAction = async (e: MouseEvent) => {
      e.stopPropagation();
      if (column === "new") await confirmOrder(order);
      else if (column === "preparing") await markReady(order);
      else setSelectedOrderId(order.id);
    };

    return (
      <Card
        key={order.id}
        withBorder
        radius="md"
        p={0}
        onClick={() => setSelectedOrderId(order.id)}
        className={behind ? "merchant-live-order-card merchant-live-order-card--behind" : undefined}
        style={{
          cursor: "pointer",
          background: "#fff",
          fontVariantNumeric: "tabular-nums",
          overflow: "hidden",
          borderColor: behind ? "#fecaca" : "#e5e7eb",
          boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
        }}
      >
        {/* Colored header strip — matches DoorDash tablet card */}
        <Box style={{ background: headerBg, color: meta.headerFg, padding: "10px 12px" }}>
          <Group justify="space-between" align="flex-start" wrap="nowrap" gap={8}>
            <Box style={{ minWidth: 0, flex: 1 }}>
              <Group gap={6} wrap="nowrap">
                <Text size="xs" fw={600} style={{ opacity: 0.85, letterSpacing: "0.02em" }}>
                  {statusText}
                </Text>
                <Text size="xs" style={{ opacity: 0.6 }}>·</Text>
                <Text size="xs" style={{ opacity: 0.7, fontFamily: "ui-monospace, monospace" }}>
                  #{orderRef}
                </Text>
              </Group>
              <Text
                fw={700}
                size="lg"
                style={{ color: meta.headerFg, letterSpacing: "-0.01em", lineHeight: 1.15 }}
                lineClamp={1}
              >
                {formatCustomerNameForMerchant(order.customer_name)}
              </Text>
            </Box>
            {timeLabel && (
              <Box style={{ textAlign: "right" }}>
                {timeCaption && (
                  <Text size="xs" style={{ opacity: 0.8, lineHeight: 1.1 }}>
                    {timeCaption}
                  </Text>
                )}
                <Text fw={700} size="lg" style={{ color: meta.headerFg, lineHeight: 1.15 }}>
                  {timeLabel}
                </Text>
              </Box>
            )}
          </Group>
        </Box>

        {/* Body — item list, mimics DoorDash row layout */}
        <Box p={12}>
          {itemsPreview.length === 0 ? (
            <Text size="xs" c="dimmed">
              {itemCount} item{itemCount === 1 ? "" : "s"} · {formatMoney(order.total_cents)}
            </Text>
          ) : (
            <Stack gap={6}>
              {itemsPreview.map((item) => (
                <Group key={item.id} justify="space-between" wrap="nowrap" gap={8} align="flex-start">
                  <Group gap={8} wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                    <Text fw={700} size="sm" style={{ width: 16, color: "#111827" }}>
                      {item.quantity}
                    </Text>
                    <Box style={{ minWidth: 0, flex: 1 }}>
                      <Text size="sm" fw={500} lineClamp={1} style={{ color: "#111827" }}>
                        {item.name}
                      </Text>
                      {item.special_instructions && (
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {item.special_instructions}
                        </Text>
                      )}
                    </Box>
                  </Group>
                  <Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                    {formatMoney(item.price_cents * item.quantity)}
                  </Text>
                </Group>
              ))}
              {moreCount > 0 && (
                <Text size="xs" c="dimmed">
                  +{moreCount} more item{moreCount === 1 ? "" : "s"}
                </Text>
              )}
            </Stack>
          )}

          <Group justify="space-between" mt={10} gap={6} wrap="nowrap">
            <Text size="xs" c="dimmed" lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
              {itemCount} item{itemCount === 1 ? "" : "s"} · {formatMoney(order.total_cents)}
            </Text>
            {order.delivery_method && (
              <Text size="xs" c="dimmed" tt="capitalize" style={{ whiteSpace: "nowrap" }}>
                {order.delivery_method}
              </Text>
            )}
          </Group>

          {(order.driver || order.driver_id || order.accepted_driver_id) && (
            <Box
              mt={10}
              p={8}
              style={{
                background: order.driver_arrived_at ? "#ecfdf5" : "#eff6ff",
                border: `1px solid ${order.driver_arrived_at ? "#a7f3d0" : "#bfdbfe"}`,
                borderRadius: 8,
              }}
            >
              <Group justify="space-between" gap={6} wrap="nowrap" align="flex-start">
                <Group gap={6} wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                  <IconCar size={14} color={order.driver_arrived_at ? "#047857" : "#1d4ed8"} />
                  <Box style={{ minWidth: 0 }}>
                    <Text size="xs" fw={700} lineClamp={1} c={order.driver_arrived_at ? "teal.8" : "blue.8"}>
                      {order.driver?.full_name || "Feeder assigned"}
                      {order.driver_arrived_at ? " · Arrived" : " · En route"}
                    </Text>
                    {(order.driver?.vehicle_make || order.driver?.license_plate) && (
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {[order.driver?.vehicle_make, order.driver?.vehicle_model].filter(Boolean).join(" ")}
                        {order.driver?.license_plate ? ` · ${order.driver.license_plate}` : ""}
                      </Text>
                    )}
                  </Box>
                </Group>
                <Stack gap={2} align="flex-end" style={{ flexShrink: 0 }}>
                  {order.pickup_confirmed_at && (
                    <Badge size="sm" color="teal" variant="filled" radius="sm">
                      Code verified
                    </Badge>
                  )}
                  {order.pickup_parking_spot && (
                    <Badge size="sm" color="orange" variant="filled" radius="sm">
                      Spot {order.pickup_parking_spot}
                    </Badge>
                  )}
                  {order.pickup_code && (
                    <Text size="xs" fw={700} ff="monospace" c="dark.6">
                      Code {order.pickup_code}
                    </Text>
                  )}
                </Stack>
              </Group>
            </Box>
          )}
        </Box>

        {/* Primary action button — DoorDash-style full-width CTA */}
        <Box px={12} pb={12}>
          <Button
            fullWidth
            radius="md"
            size="sm"
            color="orange"
            variant="filled"
            onClick={handlePrimaryAction}
            styles={{
              root: {
                fontWeight: 700,
                height: 38,
              },
            }}
          >
            {status === "ready" && order.driver_arrived_at
              ? "Hand to driver"
              : meta.actionLabel}
          </Button>
        </Box>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box py="xl" style={{ textAlign: "center" }}>
        <Loader color="orange" />
        <Text size="sm" c="dimmed" mt="sm">
          Loading live orders…
        </Text>
      </Box>
    );
  }

  return (
    <Stack gap="xs" style={{ fontVariantNumeric: "tabular-nums" }}>
      <Group
        justify="space-between"
        align="center"
        wrap="nowrap"
        gap="sm"
        style={{
          padding: "8px 12px",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
        }}
      >
        <Group gap="md" wrap="nowrap" style={{ minWidth: 0 }}>
          <Box>
            <Text fw={700} size="sm" style={{ letterSpacing: "-0.01em", lineHeight: 1.1 }}>
              Live Orders
            </Text>
            <Text size="xs" c="dimmed" lineClamp={1}>
              {restaurantName || "Kitchen board"}
            </Text>
          </Box>
          <Box style={{ width: 1, height: 28, background: "#e5e7eb" }} />
          <Group gap="lg" wrap="nowrap">
            <Box>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600} style={{ fontSize: 10, letterSpacing: "0.04em" }}>
                Pending
              </Text>
              <Text fw={700} size="md" c={pendingCount > 0 ? "red" : undefined}>
                {pendingCount}
              </Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600} style={{ fontSize: 10, letterSpacing: "0.04em" }}>
                Active
              </Text>
              <Text fw={700} size="md">{orders.length}</Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600} style={{ fontSize: 10, letterSpacing: "0.04em" }}>
                Behind
              </Text>
              <Text fw={700} size="md" c={orders.some(isRunningBehind) ? "red" : undefined}>
                {orders.filter(isRunningBehind).length}
              </Text>
            </Box>
          </Group>
        </Group>
        <Group gap={6} wrap="nowrap">
          <Badge
            leftSection={<IconWifi size={11} />}
            color={realtimeStatus === "connected" ? "teal" : realtimeStatus === "connecting" ? "gray" : "red"}
            variant="light"
            size="sm"
            radius="sm"
          >
            {realtimeStatus}
          </Badge>
          <Group gap={4} wrap="nowrap">
            <IconBell size={14} />
            <Switch
              size="xs"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.currentTarget.checked)}
              color="orange"
            />
          </Group>
          <Button
            variant="light"
            color="orange"
            size="compact-xs"
            leftSection={<IconRefresh size={12} />}
            loading={refreshing}
            onClick={() => void fetchOrders(true)}
          >
            Refresh
          </Button>
        </Group>
      </Group>

      {urgentBannerOrderId && (
        <Card
          withBorder
          radius="md"
          className="merchant-live-banner-pulse"
          style={{
            background: "linear-gradient(90deg, #ff6b00 0%, #ff3d00 100%)",
            borderColor: "#ff922b",
          }}
        >
          <Group justify="space-between">
            <Group gap="xs">
              <IconAlertTriangle size={22} color="#fff" />
              <Text fw={900} c="white" size="lg">
                NEW ORDER — CONFIRM NOW
              </Text>
            </Group>
            <Badge color="dark" variant="filled">
              LIVE
            </Badge>
          </Group>
        </Card>
      )}

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xs">
        {(Object.keys(COLUMN_META) as KanbanColumn[]).map((column) => {
          const meta = COLUMN_META[column];
          const columnOrders = ordersByColumn[column];
          return (
            <Card
              key={column}
              withBorder
              radius="sm"
              p={0}
              style={{
                background: "#f8fafc",
                minHeight: 280,
                borderTop: `2px solid ${meta.accent}`,
                overflow: "hidden",
              }}
            >
              <Group
                justify="space-between"
                align="center"
                wrap="nowrap"
                px="xs"
                py={6}
                style={{
                  background: "#fff",
                  borderBottom: "1px solid #e5e7eb",
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                }}
              >
                <Group gap={6} wrap="nowrap">
                  <Box style={{ width: 6, height: 6, borderRadius: 999, background: meta.accent }} />
                  <Text fw={700} size="xs" tt="uppercase" style={{ letterSpacing: "0.04em" }}>
                    {meta.title}
                  </Text>
                  <Text size="xs" c="dimmed">
                    · {meta.subtitle}
                  </Text>
                </Group>
                <Badge color="gray" variant="filled" size="sm" radius="sm" style={{ background: meta.accent }}>
                  {columnOrders.length}
                </Badge>
              </Group>
              <ScrollArea h={620} offsetScrollbars type="auto">
                <Stack gap={10} p={10}>
                  {columnOrders.length === 0 ? (
                    <Text size="xs" c="dimmed" py="lg" ta="center">
                      {meta.empty}
                    </Text>
                  ) : (
                    columnOrders.map((o) => renderOrderCard(o, column))
                  )}
                </Stack>
              </ScrollArea>
            </Card>
          );
        })}
      </SimpleGrid>

      <Modal
        opened={selectedOrder != null}
        onClose={() => setSelectedOrderId(null)}
        size="1280px"
        padding={0}
        radius="lg"
        withCloseButton={false}
        centered
        overlayProps={{ backgroundOpacity: 0.55, blur: 2 }}
        styles={{
          body: { padding: 0 },
          content: { overflow: "hidden", maxHeight: "92vh" },
          inner: { padding: 16 },
        }}
      >
        {selectedOrder && (() => {
          const status = (selectedOrder.order_status || "pending") as string;
          const column: KanbanColumn = getKanbanColumn(status) ?? "preparing";
          const meta = COLUMN_META[column];
          const behind = isRunningBehind(selectedOrder);
          const headerBg = behind ? "#b91c1c" : meta.headerBg;
          const etaMin = selectedOrder.estimated_delivery_time
            ? Math.max(0, Math.round((new Date(selectedOrder.estimated_delivery_time).getTime() - Date.now()) / 60000))
            : null;
          const orderNo = selectedOrder.order_number || selectedOrder.id.slice(-6).toUpperCase();
          const itemCount = selectedOrder.order_items.reduce((s, i) => s + i.quantity, 0);
          const deliveryMethod = (selectedOrder.delivery_method || "delivery").toString();
          const pickupTime = selectedOrder.estimated_delivery_time
            ? formatTime(selectedOrder.estimated_delivery_time)
            : "—";
          const placedTime = formatTime(selectedOrder.created_at);
          const acceptedTime = selectedOrder.accepted_at ? formatTime(selectedOrder.accepted_at) : null;
          const driverArrivedTime = selectedOrder.driver_arrived_at
            ? formatTime(selectedOrder.driver_arrived_at)
            : null;
          const handoffVerifiedTime = selectedOrder.pickup_confirmed_at
            ? formatTime(selectedOrder.pickup_confirmed_at)
            : null;
          const ageMin = minutesSince(selectedOrder.created_at);
          const subtotalCents = selectedOrder.order_items.reduce(
            (s, i) => s + i.price_cents * i.quantity,
            0,
          );
          const feesCents = Math.max(0, (selectedOrder.total_cents || 0) - subtotalCents);
          // Privacy: merchants never see street address — only city/state/zip.
          const addressLine = formatCustomerAreaForMerchant(selectedOrder.delivery_address);
          return (
            <Box style={{ background: "#f1f5f9", fontVariantNumeric: "tabular-nums" }}>
              {/* Colored status header */}
              <Box
                style={{
                  background: headerBg,
                  color: "#fff",
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <UnstyledButton
                  onClick={() => setSelectedOrderId(null)}
                  aria-label="Close"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.18)",
                    color: "#fff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  ×
                </UnstyledButton>
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Text size="xs" fw={600} style={{ opacity: 0.9, letterSpacing: "0.04em" }}>
                    {behind
                      ? "BEHIND"
                      : selectedOrder.pickup_confirmed_at
                        ? "HANDOFF VERIFIED"
                        : meta.statusLabel.toUpperCase()} · #{orderNo}
                  </Text>
                  <Text fw={700} size="xl" style={{ lineHeight: 1.15, marginTop: 2 }}>
                    {formatCustomerNameForMerchant(selectedOrder.customer_name)}
                  </Text>
                </Box>
                {status !== "pending" && (
                  <Group gap={8} wrap="nowrap">
                    <UnstyledButton
                      onClick={async () => {
                        const base = selectedOrder.estimated_delivery_time
                          ? new Date(selectedOrder.estimated_delivery_time).getTime()
                          : Date.now();
                        const next = new Date(Math.max(Date.now(), base - 5 * 60 * 1000)).toISOString();
                        await updateOrder(selectedOrder.id, { estimated_delivery_time: next });
                      }}
                      style={pillButtonStyle}
                      title="Subtract 5 minutes"
                    >
                      −5
                    </UnstyledButton>
                    <Box style={{ textAlign: "center", padding: "0 4px" }}>
                      <Text size="xs" style={{ opacity: 0.85 }}>
                        Ready in
                      </Text>
                      <Text fw={700} size="lg" style={{ lineHeight: 1 }}>
                        {etaMin != null ? `${etaMin}m` : "—"}
                      </Text>
                    </Box>
                    <UnstyledButton
                      onClick={async () => {
                        const base = selectedOrder.estimated_delivery_time
                          ? new Date(selectedOrder.estimated_delivery_time).getTime()
                          : Date.now();
                        await updateOrder(selectedOrder.id, {
                          estimated_delivery_time: new Date(base + 5 * 60 * 1000).toISOString(),
                        });
                      }}
                      style={pillButtonStyle}
                      title="Add 5 minutes"
                    >
                      +5
                    </UnstyledButton>
                  </Group>
                )}
              </Box>

              {/* Body: two-column layout */}
              <Box
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) 340px",
                  gap: 16,
                  padding: 16,
                  background: "#f1f5f9",
                }}
              >
                {/* Items list */}
                <Box
                  style={{
                    background: "#fff",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    display: "flex",
                    flexDirection: "column",
                    maxHeight: "62vh",
                  }}
                >
                  <Box style={{ flex: 1, overflowY: "auto" }}>
                  {selectedOrder.order_items.map((item, idx) => {
                    const mods = (item.special_instructions || "")
                      .split(/\n|,/)
                      .map((s) => s.trim())
                      .filter(Boolean);
                    return (
                      <Box
                        key={item.id}
                        style={{
                          padding: "14px 18px",
                          borderTop: idx === 0 ? "none" : "1px solid #f1f5f9",
                        }}
                      >
                        <Group justify="space-between" align="flex-start" wrap="nowrap">
                          <Group gap={14} align="flex-start" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                            <Text fw={700} size="md" style={{ width: 18 }}>
                              {item.quantity}
                            </Text>
                            <Text fw={600} size="md" style={{ flex: 1 }}>
                              {item.name}
                            </Text>
                          </Group>
                          <Group gap={14} wrap="nowrap">
                            <Text fw={600} size="md">
                              {formatMoney(item.price_cents * item.quantity)}
                            </Text>
                            <Text size="sm" c="dimmed">
                              Edit
                            </Text>
                          </Group>
                        </Group>
                        {mods.length > 0 && (
                          <Stack gap={4} mt={8} pl={32}>
                            {mods.map((m, i) => (
                              <Group key={i} justify="space-between" wrap="nowrap">
                                <Text size="sm" c="dimmed">
                                  {m}
                                </Text>
                                <Text size="sm" c="dimmed">
                                  Edit
                                </Text>
                              </Group>
                            ))}
                          </Stack>
                        )}
                      </Box>
                    );
                  })}
                  </Box>
                  {/* Totals */}
                  <Box style={{ borderTop: "1px solid #e5e7eb", padding: "12px 18px", background: "#f8fafc" }}>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Subtotal</Text>
                      <Text size="sm" fw={600}>{formatMoney(subtotalCents)}</Text>
                    </Group>
                    {feesCents > 0 && (
                      <Group justify="space-between" mt={4}>
                        <Text size="sm" c="dimmed">Fees, tax & tip</Text>
                        <Text size="sm" fw={600}>{formatMoney(feesCents)}</Text>
                      </Group>
                    )}
                    <Group justify="space-between" mt={6}>
                      <Text size="md" fw={700}>Total</Text>
                      <Text size="md" fw={700}>{formatMoney(selectedOrder.total_cents)}</Text>
                    </Group>
                  </Box>
                </Box>

                {/* Info side panel */}
                <Stack gap={12} style={{ maxHeight: "62vh", overflowY: "auto" }}>
                  <Box
                    style={{
                      background: "#fff",
                      borderRadius: 10,
                      border: "1px solid #e5e7eb",
                      padding: 14,
                    }}
                  >
                    <Stack gap={10}>
                      <Group gap={10} wrap="nowrap">
                        <IconClock size={16} color="#475569" />
                        <Text size="sm">Pickup at {pickupTime}</Text>
                      </Group>
                      <Group gap={10} wrap="nowrap">
                        <IconPackage size={16} color="#475569" />
                        <Text size="sm">
                          {itemCount} {itemCount === 1 ? "item" : "items"} · {formatMoney(selectedOrder.total_cents)}
                        </Text>
                      </Group>
                      <Group gap={10} wrap="nowrap">
                        <IconBell size={16} color="#475569" />
                        <Text size="sm" style={{ textTransform: "capitalize" }}>
                          {deliveryMethod}
                        </Text>
                      </Group>
                    </Stack>
                  </Box>

                  {/* Timeline */}
                  <Box style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 14 }}>
                    <Text size="xs" c="dimmed" fw={700} style={{ letterSpacing: "0.04em" }}>
                      TIMELINE
                    </Text>
                    <Stack gap={6} mt={8}>
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">Placed</Text>
                        <Text size="sm" fw={600}>{placedTime} · {ageMin}m ago</Text>
                      </Group>
                      {acceptedTime && (
                        <Group justify="space-between">
                          <Text size="sm" c="dimmed">Confirmed</Text>
                          <Text size="sm" fw={600}>{acceptedTime}</Text>
                        </Group>
                      )}
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">Ready by</Text>
                        <Text size="sm" fw={600}>{pickupTime}{etaMin != null ? ` · in ${etaMin}m` : ""}</Text>
                      </Group>
                      {driverArrivedTime && (
                        <Group justify="space-between">
                          <Text size="sm" c="orange.7">Driver arrived</Text>
                          <Text size="sm" fw={700} c="orange.7">{driverArrivedTime}</Text>
                        </Group>
                      )}
                      {handoffVerifiedTime && (
                        <Group justify="space-between">
                          <Text size="sm" c="teal.7">Handoff code verified</Text>
                          <Text size="sm" fw={700} c="teal.7">{handoffVerifiedTime}</Text>
                        </Group>
                      )}
                    </Stack>
                  </Box>

                  {/* Order ID & parking */}
                  <Box style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 14 }}>
                    <Stack gap={8}>
                      <Group justify="space-between">
                        <Text size="xs" c="dimmed" fw={700} style={{ letterSpacing: "0.04em" }}>ORDER ID</Text>
                        <Text size="sm" fw={700}>#{orderNo}</Text>
                      </Group>
                      {selectedOrder.pickup_parking_spot && (
                        <Group justify="space-between">
                          <Text size="xs" c="dimmed" fw={700} style={{ letterSpacing: "0.04em" }}>PARKING</Text>
                          <Text size="sm" fw={700}>{selectedOrder.pickup_parking_spot}</Text>
                        </Group>
                      )}
                      {selectedOrder.pickup_code && (
                        <Group justify="space-between" align="flex-start">
                          <Box>
                            <Text size="xs" c="dimmed" fw={700} style={{ letterSpacing: "0.04em" }}>HANDOFF CODE</Text>
                            {selectedOrder.pickup_confirmed_at && (
                              <Text size="xs" c="teal.7" fw={700} mt={2}>Merchant / support verified</Text>
                            )}
                          </Box>
                          <Box style={{ textAlign: "right" }}>
                            <Text size="md" fw={800} ff="monospace" c={selectedOrder.pickup_confirmed_at ? "teal.7" : "orange.7"}>
                              {selectedOrder.pickup_code}
                            </Text>
                            {handoffVerifiedTime && (
                              <Text size="xs" c="dimmed" mt={2}>{handoffVerifiedTime}</Text>
                            )}
                          </Box>
                        </Group>
                      )}
                    </Stack>
                  </Box>

                  {/* Feeder / Driver */}
                  {(selectedOrder.driver || selectedOrder.driver_id || selectedOrder.accepted_driver_id) && (
                    <Box
                      style={{
                        background: "#fff",
                        borderRadius: 10,
                        border: `1px solid ${selectedOrder.driver_arrived_at ? "#a7f3d0" : "#e5e7eb"}`,
                        padding: 14,
                      }}
                    >
                      <Group justify="space-between" mb={6}>
                        <Text size="xs" c="dimmed" fw={700} style={{ letterSpacing: "0.04em" }}>
                          FEEDER
                        </Text>
                        <Badge
                          size="sm"
                          color={selectedOrder.pickup_confirmed_at ? "teal" : selectedOrder.driver_arrived_at ? "teal" : "blue"}
                          variant="filled"
                        >
                          {selectedOrder.pickup_confirmed_at
                            ? "Handoff verified"
                            : selectedOrder.driver_arrived_at
                              ? "At store"
                              : "En route"}
                        </Badge>
                      </Group>
                      <Group gap={10} wrap="nowrap" align="flex-start">
                        <Box
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: "50%",
                            background: "#f1f5f9",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                            flexShrink: 0,
                          }}
                        >
                          {selectedOrder.driver?.avatar_url ? (
                            <img
                              src={selectedOrder.driver.avatar_url}
                              alt=""
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <IconUser size={20} color="#475569" />
                          )}
                        </Box>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Text fw={700} size="sm" lineClamp={1}>
                            {selectedOrder.driver?.full_name || "Feeder assigned"}
                          </Text>
                          {selectedOrder.driver?.phone && (
                            <Text size="xs" c="dimmed">{selectedOrder.driver.phone}</Text>
                          )}
                          {(selectedOrder.driver?.vehicle_make || selectedOrder.driver?.vehicle_model) && (
                            <Group gap={4} mt={2} wrap="nowrap">
                              <IconCar size={12} color="#64748b" />
                              <Text size="xs" c="dimmed" lineClamp={1}>
                                {[selectedOrder.driver?.vehicle_make, selectedOrder.driver?.vehicle_model].filter(Boolean).join(" ")}
                                {selectedOrder.driver?.license_plate ? ` · ${selectedOrder.driver.license_plate}` : ""}
                              </Text>
                            </Group>
                          )}
                        </Box>
                      </Group>
                      <Stack gap={4} mt={10}>
                        {selectedOrder.feeder_offer_accepted_at && (
                          <Group justify="space-between">
                            <Text size="xs" c="dimmed">Accepted</Text>
                            <Text size="xs" fw={600}>{formatTime(selectedOrder.feeder_offer_accepted_at)}</Text>
                          </Group>
                        )}
                        {selectedOrder.driver_arrived_at && (
                          <Group justify="space-between">
                            <Text size="xs" c="dimmed">Arrived at store</Text>
                            <Text size="xs" fw={700} c="teal.7">
                              {formatTime(selectedOrder.driver_arrived_at)} · {minutesSince(selectedOrder.driver_arrived_at)}m ago
                            </Text>
                          </Group>
                        )}
                        {selectedOrder.pickup_parking_spot && (
                          <Group justify="space-between">
                            <Text size="xs" c="dimmed">Parking spot</Text>
                            <Badge size="sm" color="orange" variant="filled">
                              <Group gap={4} wrap="nowrap">
                                <IconMapPin size={10} />
                                {selectedOrder.pickup_parking_spot}
                              </Group>
                            </Badge>
                          </Group>
                        )}
                        {selectedOrder.pickup_confirmed_at && (
                          <Group justify="space-between" align="flex-start">
                            <Box>
                              <Text size="xs" c="dimmed">Handoff to feeder</Text>
                              <Text size="xs" c="dimmed">Merchant / customer service scanned code</Text>
                            </Box>
                            <Text size="xs" fw={700} c="teal.7">{formatTime(selectedOrder.pickup_confirmed_at)}</Text>
                          </Group>
                        )}
                      </Stack>
                    </Box>
                  )}

                  <Box
                    style={{
                      background: "#fff",
                      borderRadius: 10,
                      border: "1px solid #e5e7eb",
                      padding: 14,
                    }}
                  >
                    <Text size="xs" c="dimmed" fw={600} style={{ letterSpacing: "0.04em" }}>
                      CUSTOMER
                    </Text>
                    <Text fw={700} size="md" mt={4}>
                      {formatCustomerNameForMerchant(selectedOrder.customer_name)}
                    </Text>
                    {addressLine && (
                      <Text size="sm" c="dimmed" mt={4}>
                        {addressLine}
                      </Text>
                    )}
                    <Text size="xs" c="dimmed" mt={6} style={{ fontStyle: "italic" }}>
                      Customer privacy: full name, street address, and phone are hidden. All contact is brokered through Crave'N customer service.
                    </Text>
                    <MerchantSupportThread
                      orderId={selectedOrder.id}
                      orderNumber={selectedOrder.order_number}
                      restaurantId={restaurantId}
                      customerUserId={(selectedOrder as any).customer_id ?? null}
                    />
                  </Box>

                  {selectedOrder.special_instructions && (
                    <Box
                      style={{
                        background: "#fff7ed",
                        borderRadius: 10,
                        border: "1px solid #fed7aa",
                        padding: 14,
                      }}
                    >
                      <Text size="xs" fw={700} c="orange.7" style={{ letterSpacing: "0.04em" }}>
                        ORDER NOTES
                      </Text>
                      <Text size="sm" mt={4}>
                        {selectedOrder.special_instructions}
                      </Text>
                    </Box>
                  )}
                </Stack>
              </Box>

              {/* Footer action bar */}
              <Box
                style={{
                  borderTop: "1px solid #e5e7eb",
                  background: "#fff",
                  padding: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                {status === "pending" && (
                  <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
                    {[10, 15, 20, 25, 30, 45].map((m) => (
                      <Button
                        key={m}
                        size="compact-sm"
                        variant={prepMinutes === m ? "filled" : "light"}
                        color="orange"
                        onClick={() => setPrepMinutes(m)}
                      >
                        {m}m
                      </Button>
                    ))}
                  </Group>
                )}
                <Box style={{ flex: 1 }} />
                {status === "pending" && (
                  <Button
                    size="lg"
                    color="orange"
                    onClick={() => void confirmOrder(selectedOrder)}
                    style={{ minWidth: 200, fontWeight: 700 }}
                  >
                    Confirm order
                  </Button>
                )}
                {(status === "confirmed" || status === "preparing") && (
                  <Button
                    size="lg"
                    color="orange"
                    onClick={() => void markReady(selectedOrder)}
                    style={{ minWidth: 240, fontWeight: 700 }}
                  >
                    Mark ready for pickup
                  </Button>
                )}
                {status === "ready" && (
                  <Group gap={8} wrap="nowrap">
                    <Button
                      size="lg"
                      color="red"
                      variant="outline"
                      leftSection={<IconFlag size={16} />}
                      onClick={() => setReportIssueOpen(true)}
                      style={{ fontWeight: 700 }}
                    >
                      Report issue
                    </Button>
                    <Button
                      size="lg"
                      color="orange"
                      leftSection={<IconCheck size={18} />}
                      loading={pickupConfirming}
                      onClick={() => void confirmMerchantPickup(selectedOrder)}
                      style={{ minWidth: 260, fontWeight: 700 }}
                    >
                      Confirm Feeder pickup
                    </Button>
                  </Group>
                )}
                {status === "picked_up" && (
                  <Badge color="teal" size="lg" variant="filled">
                    Pickup confirmed by merchant
                  </Badge>
                )}
              </Box>
              {behind && (
                <Box style={{ background: "#fef2f2", padding: "8px 16px", borderTop: "1px solid #fecaca" }}>
                  <Group gap={8}>
                    <IconAlertTriangle size={14} color="#b91c1c" />
                    <Text size="xs" fw={600} c="red.7">
                      Running behind — prioritize this order
                    </Text>
                  </Group>
                </Box>
              )}
            </Box>
          );
        })()}
      </Modal>

      <Modal
        opened={reportIssueOpen}
        onClose={() => {
          if (reportSubmitting) return;
          setReportIssueOpen(false);
          setReportReason(null);
          setReportNotes("");
        }}
        title={<Text fw={800}>Report a pickup issue</Text>}
        centered
        size="md"
        radius="lg"
      >
        {selectedOrder && (
          <Stack gap="sm">
            <Text size="sm" c="dimmed">
              This sends a high-priority alert to Crave'N customer service for order{" "}
              <b>#{selectedOrder.order_number || selectedOrder.id.slice(-6).toUpperCase()}</b>.
              The reported event is logged in the order forensics record.
            </Text>
            <Select
              label="What happened?"
              placeholder="Select a reason"
              value={reportReason}
              onChange={setReportReason}
              data={[
                { value: "wrong_feeder", label: "Picked up by a different person (not the assigned Feeder)" },
                { value: "no_id_match", label: "Person could not verify identity / handoff code" },
                { value: "stolen", label: "Order was taken without authorization (possible theft)" },
                { value: "missing", label: "Order is missing — staff cannot locate it" },
                { value: "feeder_no_show", label: "Assigned Feeder never arrived" },
                { value: "damaged_before_pickup", label: "Order was damaged before pickup" },
                { value: "other", label: "Other — see notes" },
              ]}
              required
            />
            <Textarea
              label="Notes for Crave'N support"
              placeholder="Describe what you saw, names, timing, vehicle details, anything helpful..."
              autosize
              minRows={3}
              maxRows={6}
              value={reportNotes}
              onChange={(e) => setReportNotes(e.currentTarget.value)}
            />
            <Group justify="flex-end" mt="xs">
              <Button
                variant="subtle"
                color="gray"
                onClick={() => {
                  setReportIssueOpen(false);
                  setReportReason(null);
                  setReportNotes("");
                }}
                disabled={reportSubmitting}
              >
                Cancel
              </Button>
              <Button
                color="red"
                leftSection={<IconAlertTriangle size={16} />}
                loading={reportSubmitting}
                onClick={() => void submitPickupIssue(selectedOrder)}
              >
                Send report
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}

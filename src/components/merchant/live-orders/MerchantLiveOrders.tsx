import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Drawer,
  Group,
  Loader,
  ScrollArea,
  SimpleGrid,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconBell,
  IconClock,
  IconPackage,
  IconRefresh,
  IconWifi,
} from "@tabler/icons-react";
import { supabase } from "@/integrations/supabase/client";
import {
  type KanbanColumn,
  type LiveOrder,
  formatMoney,
  formatTime,
  getCardFlashVariant,
  getKanbanColumn,
  isRunningBehind,
  minutesSince,
} from "./liveOrderUtils";
import "./merchant-live-orders.css";

const ACTIVE_STATUSES = new Set(["pending", "confirmed", "preparing", "ready"]);

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
    statusLabel: "Ready",
  },
};

const NEW_ORDER_SOUND_VOLUME = 1;

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
          order_items: [],
        };
        return [nextOrder, ...prev];
      }
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...row, total_cents: Number(row.total_cents ?? copy[idx].total_cents ?? 0) };
      return copy;
    });
  };

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, customer_name, order_status, created_at, total_cents, accepted_at, driver_arrived_at, pickup_parking_spot, delivery_method, delivery_address, estimated_delivery_time"
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

      setOrders(
        rows.map((order) => ({
          ...order,
          order_items: itemsByOrder[order.id] || [],
        }))
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

  const renderOrderCard = (order: LiveOrder) => {
    const flash = getCardFlashVariant(order);
    const behind = isRunningBehind(order);
    const itemCount = order.order_items.reduce((sum, i) => sum + i.quantity, 0);
    const status = order.order_status || "pending";
    const ageMin = minutesSince(order.created_at);
    let etaLabel: string | null = null;
    if (order.estimated_delivery_time) {
      const diffMs = new Date(order.estimated_delivery_time).getTime() - Date.now();
      const diffMin = Math.round(diffMs / 60000);
      etaLabel = diffMin >= 0 ? `${diffMin}m left` : `${Math.abs(diffMin)}m over`;
    }

    return (
      <Card
        key={order.id}
        withBorder
        radius="sm"
        p={8}
        className={`merchant-live-order-card merchant-live-order-card--${flash}`}
        onClick={() => setSelectedOrderId(order.id)}
        style={{
          cursor: "pointer",
          background: "#fff",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <Group justify="space-between" align="center" wrap="nowrap" gap={6}>
          <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
            <Text fw={700} size="sm" style={{ letterSpacing: "-0.01em" }}>
              #{order.order_number || order.id.slice(-4).toUpperCase()}
            </Text>
            <Text size="xs" c="dimmed">·</Text>
            <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
              {ageMin}m ago
            </Text>
          </Group>
          <Text fw={700} size="sm" style={{ whiteSpace: "nowrap" }}>
            {formatMoney(order.total_cents)}
          </Text>
        </Group>
        <Group justify="space-between" wrap="nowrap" mt={2} gap={6}>
          <Text size="xs" c="dimmed" lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
            {order.customer_name || "Customer"} · {itemCount} item{itemCount === 1 ? "" : "s"}
          </Text>
          {etaLabel && (status === "preparing" || status === "confirmed") && (
            <Text size="xs" fw={600} c={behind ? "red" : "dimmed"} style={{ whiteSpace: "nowrap" }}>
              {etaLabel}
            </Text>
          )}
        </Group>
        {(behind || order.driver_arrived_at) && (
          <Group gap={4} mt={6} wrap="nowrap">
            {order.driver_arrived_at && (
              <Badge color="red" variant="filled" size="xs" radius="sm">
                Driver {minutesSince(order.driver_arrived_at)}m
              </Badge>
            )}
            {behind && !order.driver_arrived_at && (
              <Badge color="red" variant="filled" size="xs" radius="sm">
                Behind
              </Badge>
            )}
          </Group>
        )}
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
                background: meta.tint,
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
              <ScrollArea h={460} offsetScrollbars type="auto">
                <Stack gap={6} p={6}>
                  {columnOrders.length === 0 ? (
                    <Text size="xs" c="dimmed" py="lg" ta="center">
                      {meta.empty}
                    </Text>
                  ) : (
                    columnOrders.map(renderOrderCard)
                  )}
                </Stack>
              </ScrollArea>
            </Card>
          );
        })}
      </SimpleGrid>

      <Drawer
        opened={selectedOrder != null}
        onClose={() => setSelectedOrderId(null)}
        position="right"
        size="md"
        title={
          selectedOrder ? (
            <Text fw={700}>Order #{selectedOrder.order_number || selectedOrder.id.slice(-4)}</Text>
          ) : null
        }
      >
        {selectedOrder && (
          <Stack gap="md">
            <Group gap="xs">
              <IconPackage size={18} />
              <Text fw={600}>{selectedOrder.customer_name || "Customer"}</Text>
            </Group>
            <Text size="sm" c="dimmed">
              Placed {formatTime(selectedOrder.created_at)} · {formatMoney(selectedOrder.total_cents)}
            </Text>
            {isRunningBehind(selectedOrder) && (
              <Badge color="red" variant="filled" leftSection={<IconAlertTriangle size={14} />}>
                Running behind — prioritize this order
              </Badge>
            )}

            <Text fw={700} size="sm">
              Items
            </Text>
            {selectedOrder.order_items.map((item) => (
              <Group key={item.id} justify="space-between" align="flex-start">
                <Box style={{ flex: 1 }}>
                  <Text size="sm" fw={600}>
                    {item.quantity}× {item.name}
                  </Text>
                  {item.special_instructions && (
                    <Text size="xs" c="dimmed">
                      {item.special_instructions}
                    </Text>
                  )}
                </Box>
                <Text size="sm">{formatMoney(item.price_cents * item.quantity)}</Text>
              </Group>
            ))}

            {selectedOrder.special_instructions && (
              <Card withBorder p="sm" bg="orange.0">
                <Text size="xs" fw={600}>
                  Order notes
                </Text>
                <Text size="sm">{selectedOrder.special_instructions}</Text>
              </Card>
            )}

            {(selectedOrder.order_status === "pending" || !selectedOrder.order_status) && (
              <>
                <Text fw={700} size="sm">
                  Prep time
                </Text>
                <Group gap={6}>
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
                <Button color="orange" size="lg" fullWidth onClick={() => void confirmOrder(selectedOrder)}>
                  Confirm order
                </Button>
              </>
            )}

            {(selectedOrder.order_status === "confirmed" || selectedOrder.order_status === "preparing") && (
              <>
                <Button
                  variant="light"
                  leftSection={<IconClock size={16} />}
                  onClick={async () => {
                    const base = selectedOrder.estimated_delivery_time
                      ? new Date(selectedOrder.estimated_delivery_time).getTime()
                      : Date.now();
                    await updateOrder(selectedOrder.id, {
                      estimated_delivery_time: new Date(base + 5 * 60 * 1000).toISOString(),
                    });
                    notifications.show({ title: "+5 min", message: "Prep time extended", color: "blue" });
                  }}
                >
                  Add 5 minutes
                </Button>
                <Button color="orange" size="lg" fullWidth onClick={() => void markReady(selectedOrder)}>
                  Mark ready for pickup
                </Button>
              </>
            )}

            {selectedOrder.order_status === "ready" && (
              <Badge color="green" size="lg" variant="light" fullWidth>
                Waiting for Feeder pickup
              </Badge>
            )}
          </Stack>
        )}
      </Drawer>
    </Stack>
  );
}

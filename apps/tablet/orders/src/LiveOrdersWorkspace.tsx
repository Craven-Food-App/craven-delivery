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
  Textarea,
  Title
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
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
  delivery_method: string | null;
  delivery_address: unknown;
  estimated_delivery_time: string | null;
  order_items: Array<{
    id: string;
    quantity: number;
    price_cents: number;
    special_instructions: string | null;
    name: string;
  }>;
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

export default function LiveOrdersWorkspace() {
  const navigate = useNavigate();
  const { selectedRestaurant, loading } = useRestaurantSelector();
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [activeTab, setActiveTab] = useState<LiveTab>("new");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState<"connected" | "connecting" | "disconnected">("connecting");
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueType, setIssueType] = useState<string>("item_unavailable");
  const [issueNotes, setIssueNotes] = useState("");
  const [prepMinutes, setPrepMinutes] = useState<number>(20);
  const lastPendingCount = useRef(0);
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);

  const storeLabel = useMemo(() => {
    if (!selectedRestaurant) return "No store selected";
    return selectedRestaurant.name || "Store";
  }, [selectedRestaurant]);
  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) ?? orders[0] ?? null,
    [orders, selectedOrderId]
  );

  const fetchOrders = async () => {
    if (!selectedRestaurant?.id) return;
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, customer_name, order_status, created_at, total_cents, delivery_method, delivery_address, estimated_delivery_time"
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
      if (!selectedOrderId && hydrated.length > 0) setSelectedOrderId(hydrated[0].id);
    } catch (err: unknown) {
      notifications.show({
        title: "Could not load orders",
        message: err instanceof Error ? err.message : "Unknown error",
        color: "red"
      });
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    alertAudioRef.current = new Audio("/craven-notification.wav");
    return () => {
      alertAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!selectedRestaurant?.id) return;
    void fetchOrders();
    setRealtimeStatus("connecting");
    const channel = supabase
      .channel(`live-orders-${selectedRestaurant.id}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${selectedRestaurant.id}` },
        () => {
          void fetchOrders();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRealtimeStatus("connected");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setRealtimeStatus("disconnected");
      });
    return () => {
      channel.unsubscribe();
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
      try {
        alertAudioRef.current?.play().catch(() => {});
      } catch {}
      notifications.show({
        title: "New order received",
        message: `${pending} order${pending > 1 ? "s" : ""} need confirmation.`,
        color: "orange"
      });
    }
    lastPendingCount.current = pending;
  }, [counts.new, soundEnabled]);

  const filteredOrders = useMemo(
    () => orders.filter((o) => (STATUS_UI[o.order_status || "pending"]?.tab || "new") === activeTab),
    [orders, activeTab]
  );

  const updateOrder = async (orderId: string, patch: Record<string, unknown>) => {
    const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
    if (error) {
      notifications.show({ title: "Update failed", message: error.message, color: "red" });
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
    notifications.show({
      title: "Issue reported",
      message: issueNotes.trim()
        ? `${issueType.replace(/_/g, " ")}: ${issueNotes.trim()}`
        : issueType.replace(/_/g, " "),
      color: "orange"
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
                      <Button variant="light" leftSection={<IconPrinter size={15} />} onClick={() => window.print()}>
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
                        {selectedOrder.order_status === "ready" ? "Waiting for feeder pickup." : "Searching for feeder..."}
                      </Text>
                    </Card>
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
    </Box>
  );
}

// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Group, ScrollArea, Stack, Text, Textarea, Badge, Loader } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconPhone, IconMessage, IconUserPlus, IconSend } from "@tabler/icons-react";
import { supabase } from "@/integrations/supabase/client";

type Channel = "call" | "message";

interface Props {
  orderId: string;
  orderNumber: string | null;
  restaurantId: string;
  customerUserId?: string | null;
}

interface ThreadRow {
  id: string;
  channel: Channel;
  customer_included: boolean;
  status: string;
  created_at: string;
}

interface MessageRow {
  id: string;
  thread_id: string;
  sender_role: "merchant" | "support" | "customer" | "system";
  body: string;
  created_at: string;
}

const ROLE_LABEL: Record<MessageRow["sender_role"], { label: string; color: string; bg: string }> = {
  merchant: { label: "You (merchant)", color: "#9a3412", bg: "#fff7ed" },
  support: { label: "Crave'N support", color: "#1e40af", bg: "#eff6ff" },
  customer: { label: "Customer", color: "#065f46", bg: "#ecfdf5" },
  system: { label: "System", color: "#374151", bg: "#f3f4f6" },
};

export function MerchantSupportThread({ orderId, orderNumber, restaurantId, customerUserId }: Props) {
  const [channel, setChannel] = useState<Channel>("message");
  const [thread, setThread] = useState<ThreadRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const loadThread = useCallback(
    async (ch: Channel) => {
      setLoading(true);
      const { data: existing } = await supabase
        .from("order_support_threads")
        .select("id, channel, customer_included, status, created_at")
        .eq("order_id", orderId)
        .eq("channel", ch)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      let row = existing as ThreadRow | null;
      if (row) {
        const { data: msgs } = await supabase
          .from("order_support_messages")
          .select("id, thread_id, sender_role, body, created_at")
          .eq("thread_id", row.id)
          .order("created_at", { ascending: true });
        setMessages((msgs as MessageRow[]) || []);
      } else {
        setMessages([]);
      }
      setThread(row);
      setLoading(false);
    },
    [orderId]
  );

  useEffect(() => {
    loadThread(channel);
  }, [channel, loadThread]);

  // Realtime subscription for the current thread
  useEffect(() => {
    if (!thread?.id) return;
    const ch = supabase
      .channel(`ost-${thread.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_support_messages", filter: `thread_id=eq.${thread.id}` },
        (payload) => {
          setMessages((prev) =>
            prev.some((m) => m.id === (payload.new as MessageRow).id) ? prev : [...prev, payload.new as MessageRow]
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "order_support_threads", filter: `id=eq.${thread.id}` },
        (payload) => setThread(payload.new as ThreadRow)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [thread?.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  const ensureThread = useCallback(async (): Promise<ThreadRow | null> => {
    if (thread) return thread;
    const { data, error } = await supabase
      .from("order_support_threads")
      .insert({
        order_id: orderId,
        restaurant_id: restaurantId,
        customer_user_id: customerUserId ?? null,
        channel,
        created_by: userId,
      })
      .select("id, channel, customer_included, status, created_at")
      .single();
    if (error) {
      notifications.show({ color: "red", title: "Couldn't start conversation", message: error.message });
      return null;
    }
    const created = data as ThreadRow;
    setThread(created);
    return created;
  }, [thread, orderId, restaurantId, customerUserId, channel, userId]);

  const sendMessage = useCallback(
    async (body: string, kickoff?: boolean) => {
      const text = body.trim();
      if (!text) return;
      setSending(true);
      const t = await ensureThread();
      if (!t) {
        setSending(false);
        return;
      }
      const { error } = await supabase.from("order_support_messages").insert({
        thread_id: t.id,
        sender_role: "merchant",
        sender_user_id: userId,
        body: text,
      });
      setSending(false);
      if (error) {
        notifications.show({ color: "red", title: "Message failed", message: error.message });
        return;
      }
      if (!kickoff) setDraft("");
    },
    [ensureThread, userId]
  );

  const requestCustomerLoopIn = useCallback(async () => {
    const t = await ensureThread();
    if (!t) return;
    await supabase.from("order_support_messages").insert({
      thread_id: t.id,
      sender_role: "merchant",
      sender_user_id: userId,
      body: "Please loop the customer into this conversation when appropriate.",
    });
    notifications.show({
      color: "orange",
      title: "Loop-in requested",
      message: "Crave'N support has been asked to bring the customer into this thread.",
    });
  }, [ensureThread, userId]);

  const startCallRequest = useCallback(async () => {
    setChannel("call");
    const t = await ensureThread();
    if (!t) return;
    await supabase.from("order_support_messages").insert({
      thread_id: t.id,
      sender_role: "merchant",
      sender_user_id: userId,
      body: `Requesting a Crave'N agent to call the customer on our behalf for order #${orderNumber ?? orderId.slice(0, 6)}.`,
    });
  }, [ensureThread, userId, orderNumber, orderId]);

  const tabBtn = (ch: Channel, label: string, Icon: React.ComponentType<{ size?: number }>) => (
    <Button
      variant={channel === ch ? "filled" : "light"}
      color="orange"
      size="xs"
      leftSection={<Icon size={14} />}
      onClick={() => setChannel(ch)}
    >
      {label}
    </Button>
  );

  return (
    <Box
      style={{
        background: "#fff",
        borderRadius: 10,
        border: "1px solid #e5e7eb",
        padding: 12,
        marginTop: 10,
      }}
    >
      <Group justify="space-between" align="center" mb={8}>
        <Group gap={6}>
          {tabBtn("message", "Message CS", IconMessage)}
          {tabBtn("call", "Request call", IconPhone)}
        </Group>
        {thread?.customer_included ? (
          <Badge color="teal" variant="light" size="sm">
            Customer included
          </Badge>
        ) : (
          <Button
            variant="subtle"
            color="orange"
            size="xs"
            leftSection={<IconUserPlus size={14} />}
            onClick={requestCustomerLoopIn}
          >
            Ask CS to loop in customer
          </Button>
        )}
      </Group>

      <Text size="xs" c="dimmed" mb={6}>
        Private thread between you and Crave'N customer service. The customer is only added if support loops them in.
      </Text>

      <Box
        ref={scrollRef as any}
        style={{
          maxHeight: 220,
          overflowY: "auto",
          background: "#f9fafb",
          border: "1px solid #f3f4f6",
          borderRadius: 8,
          padding: 8,
          marginBottom: 8,
        }}
      >
        {loading ? (
          <Group justify="center" py={20}><Loader size="sm" color="orange" /></Group>
        ) : messages.length === 0 ? (
          <Text size="xs" c="dimmed" ta="center" py={16}>
            No messages yet. {channel === "call"
              ? "Send a note describing why you need a Crave'N agent to call the customer."
              : "Start the conversation with Crave'N support below."}
          </Text>
        ) : (
          <Stack gap={6}>
            {messages.map((m) => {
              const meta = ROLE_LABEL[m.sender_role];
              return (
                <Box
                  key={m.id}
                  style={{
                    background: meta.bg,
                    borderRadius: 6,
                    padding: "6px 8px",
                    borderLeft: `3px solid ${meta.color}`,
                  }}
                >
                  <Group justify="space-between" gap={6}>
                    <Text size="xs" fw={700} style={{ color: meta.color }}>
                      {meta.label}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </Text>
                  </Group>
                  <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>{m.body}</Text>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>

      {channel === "call" && messages.length === 0 && (
        <Button color="orange" size="xs" fullWidth mb={8} onClick={startCallRequest} loading={sending}>
          Request Crave'N to call the customer
        </Button>
      )}

      <Group align="flex-end" gap={6}>
        <Textarea
          autosize
          minRows={1}
          maxRows={4}
          placeholder={
            channel === "call"
              ? "Add context for the call (reason, urgency, what to say)…"
              : "Message Crave'N customer service…"
          }
          value={draft}
          onChange={(e) => setDraft(e.currentTarget.value)}
          style={{ flex: 1 }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              sendMessage(draft);
            }
          }}
        />
        <Button
          color="orange"
          size="sm"
          leftSection={<IconSend size={14} />}
          loading={sending}
          onClick={() => sendMessage(draft)}
          disabled={!draft.trim()}
        >
          Send
        </Button>
      </Group>
    </Box>
  );
}

export default MerchantSupportThread;
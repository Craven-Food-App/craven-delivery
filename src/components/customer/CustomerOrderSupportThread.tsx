// @ts-nocheck
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Phone, Send, Loader2 } from "lucide-react";

type Role = "merchant" | "support" | "customer" | "driver" | "system";

interface Props {
  orderId: string;
}

const ROLE: Record<Role, { label: string; cls: string }> = {
  support:  { label: "Crave'N support", cls: "bg-blue-50 border-l-2 border-blue-500 text-blue-900" },
  customer: { label: "You",             cls: "bg-orange-50 border-l-2 border-orange-500 text-orange-900" },
  merchant: { label: "Restaurant",      cls: "bg-amber-50 border-l-2 border-amber-500 text-amber-900" },
  driver:   { label: "Your Feeder",     cls: "bg-purple-50 border-l-2 border-purple-500 text-purple-900" },
  system:   { label: "System",          cls: "bg-gray-50 border-l-2 border-gray-400 text-gray-700" },
};

export default function CustomerOrderSupportThread({ orderId }: Props) {
  const [thread, setThread] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null)); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    // Pick the most recent message-channel thread for this order that the customer is included in
    const { data: t } = await supabase
      .from("order_support_threads")
      .select("id, customer_included, status, channel, customer_user_id")
      .eq("order_id", orderId)
      .eq("customer_included", true)
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setThread(t ?? null);
    if (t) {
      const { data: msgs } = await supabase
        .from("order_support_messages")
        .select("id, sender_role, body, created_at")
        .eq("thread_id", (t as any).id)
        .order("created_at", { ascending: true });
      setMessages(msgs || []);
      await supabase.rpc("mark_support_thread_read", { _thread_id: (t as any).id, _role: "customer" });
    } else {
      setMessages([]);
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel(`customer-thread-${orderId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_support_threads", filter: `order_id=eq.${orderId}` }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_support_messages" }, (p) => {
        const row: any = p.new;
        if (thread && row.thread_id === thread.id) {
          setMessages((prev) => prev.some((m: any) => m.id === row.id) ? prev : [...prev, row]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orderId, thread?.id, load]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages.length]);

  const ensureThread = useCallback(async () => {
    if (thread) return thread;
    // Customer can't create one directly — they must request CS contact. Create a new thread tagged customer-initiated.
    const { data, error } = await supabase
      .from("order_support_threads")
      .insert({
        order_id: orderId,
        restaurant_id: null,
        customer_user_id: me,
        channel: "message",
        customer_included: true,
        created_by: me,
        subject: "Customer-initiated request",
      })
      .select("id, customer_included, status, channel, customer_user_id")
      .single();
    if (error) return null;
    setThread(data);
    return data;
  }, [thread, orderId, me]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    const t = await ensureThread();
    if (!t) { setSending(false); return; }
    await supabase.from("order_support_messages").insert({
      thread_id: (t as any).id,
      sender_role: "customer",
      sender_user_id: me,
      body: text,
    });
    setSending(false);
    setDraft("");
  }, [draft, ensureThread, me]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-orange-600" />
        <h3 className="font-semibold text-gray-900">Need help with this order?</h3>
      </div>
      <p className="mb-3 text-xs text-gray-600">
        Message Crave'N customer service. The restaurant and your Feeder are never given your phone number or full address.
      </p>

      <div ref={scrollRef} className="mb-3 max-h-56 space-y-2 overflow-y-auto rounded-md bg-gray-50 p-2">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-gray-400" /></div>
        ) : messages.length === 0 ? (
          <p className="py-4 text-center text-xs text-gray-500">No messages yet. Start the conversation below.</p>
        ) : (
          messages.map((m: any) => {
            const meta = ROLE[m.sender_role as Role];
            return (
              <div key={m.id} className={`rounded-md px-2.5 py-1.5 ${meta.cls}`}>
                <div className="mb-0.5 flex justify-between text-[10px] font-semibold uppercase">
                  <span>{meta.label}</span>
                  <span className="opacity-70">{new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{m.body}</p>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          placeholder="Message Crave'N support…"
          className="flex-1 resize-none rounded-md border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-orange-500"
        />
        <button
          onClick={send}
          disabled={!draft.trim() || sending}
          className="inline-flex items-center gap-1 rounded-md bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send
        </button>
      </div>
    </div>
  );
}
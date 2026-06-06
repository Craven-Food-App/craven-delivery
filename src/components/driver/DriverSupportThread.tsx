// @ts-nocheck
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Send, Loader2, HelpCircle } from "lucide-react";
import { QUICK_REPLIES } from "@/components/support/supportQuickReplies";

type Role = "merchant" | "support" | "customer" | "driver" | "system";

interface Props {
  orderId: string;
  restaurantId?: string | null;
}

const ROLE: Record<Role, { label: string; cls: string }> = {
  support:  { label: "Crave'N support", cls: "bg-blue-50 border-l-2 border-blue-500 text-blue-900" },
  driver:   { label: "You",             cls: "bg-orange-50 border-l-2 border-orange-500 text-orange-900" },
  merchant: { label: "Restaurant",      cls: "bg-amber-50 border-l-2 border-amber-500 text-amber-900" },
  customer: { label: "Customer",        cls: "bg-emerald-50 border-l-2 border-emerald-500 text-emerald-900" },
  system:   { label: "System",          cls: "bg-gray-50 border-l-2 border-gray-400 text-gray-700" },
};

export default function DriverSupportThread({ orderId, restaurantId }: Props) {
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
    const { data: t } = await supabase
      .from("order_support_threads")
      .select("id, driver_included, status, channel, driver_id")
      .eq("order_id", orderId)
      .eq("driver_included", true)
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
      await supabase.rpc("mark_support_thread_read", { _thread_id: (t as any).id, _role: "driver" });
    } else {
      setMessages([]);
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel(`driver-thread-${orderId}`)
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
    const { data, error } = await supabase
      .from("order_support_threads")
      .insert({
        order_id: orderId,
        restaurant_id: restaurantId ?? null,
        driver_id: me,
        driver_included: true,
        channel: "message",
        created_by: me,
        subject: "Feeder-initiated request",
      })
      .select("id, driver_included, status, channel, driver_id")
      .single();
    if (error) return null;
    setThread(data);
    return data;
  }, [thread, orderId, restaurantId, me]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    const t = await ensureThread();
    if (!t) { setSending(false); return; }
    await supabase.from("order_support_messages").insert({
      thread_id: (t as any).id,
      sender_role: "driver",
      sender_user_id: me,
      body: text,
    });
    setSending(false);
    setDraft("");
  }, [draft, ensureThread, me]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <HelpCircle className="h-4 w-4 text-orange-600" />
        <h3 className="text-sm font-semibold text-gray-900">Need help on this delivery?</h3>
      </div>
      <p className="mb-2 text-[11px] text-gray-600">
        Private chat with Crave'N support. Customer and merchant only see what support relays.
      </p>

      <div ref={scrollRef} className="mb-2 max-h-48 space-y-1.5 overflow-y-auto rounded-md bg-gray-50 p-2">
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-gray-400" /></div>
        ) : messages.length === 0 ? (
          <p className="py-3 text-center text-[11px] text-gray-500">No messages yet. Send your question below.</p>
        ) : (
          messages.map((m: any) => {
            const meta = ROLE[m.sender_role as Role];
            return (
              <div key={m.id} className={`rounded px-2 py-1 ${meta.cls}`}>
                <div className="mb-0.5 flex justify-between text-[9px] font-semibold uppercase">
                  <span>{meta.label}</span>
                  <span className="opacity-70">{new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                </div>
                <p className="whitespace-pre-wrap text-xs">{m.body}</p>
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
          placeholder="Message support…"
          className="flex-1 resize-none rounded-md border border-gray-200 px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-orange-500"
        />
        <button
          onClick={send}
          disabled={!draft.trim() || sending}
          className="inline-flex items-center gap-1 rounded-md bg-orange-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Send
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {QUICK_REPLIES.driver.map((q) => (
          <button
            key={q.label}
            onClick={() => setDraft(q.body)}
            title={q.body}
            className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700 hover:bg-orange-100"
          >
            {q.label}
          </button>
        ))}
      </div>
    </div>
  );
}
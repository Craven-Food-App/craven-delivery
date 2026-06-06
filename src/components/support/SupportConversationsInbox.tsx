// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageSquare,
  Phone,
  Search,
  Send,
  UserPlus,
  Store,
  Bike,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { QUICK_REPLIES, SUPPORT_DEPARTMENTS } from "./supportQuickReplies";
import SupportOrderActionsPanel from "./SupportOrderActionsPanel";

type Channel = "call" | "message";
type Role = "merchant" | "support" | "customer" | "driver" | "system";
type ScopeFilter = "all" | "unread" | "open" | "resolved";
type PartyFilter = "all" | "merchant" | "customer" | "driver";

interface ThreadRow {
  id: string;
  order_id: string;
  restaurant_id: string | null;
  customer_user_id: string | null;
  driver_id: string | null;
  channel: Channel;
  customer_included: boolean;
  driver_included: boolean;
  status: string;
  priority: string;
  subject: string | null;
  last_message_at: string;
  created_at: string;
  unread_for_support: number;
}

interface MessageRow {
  id: string;
  thread_id: string;
  sender_role: Role;
  body: string;
  created_at: string;
}

interface ContextInfo {
  orderNumber: string | null;
  restaurantName: string | null;
  customerName: string | null;
  driverName: string | null;
}

const ROLE_STYLE: Record<Role, { label: string; cls: string }> = {
  merchant: { label: "Merchant", cls: "bg-orange-50 border-l-2 border-orange-500 text-orange-900" },
  support:  { label: "Crave'N CS", cls: "bg-blue-50 border-l-2 border-blue-500 text-blue-900" },
  customer: { label: "Customer",  cls: "bg-emerald-50 border-l-2 border-emerald-500 text-emerald-900" },
  driver:   { label: "Feeder",    cls: "bg-purple-50 border-l-2 border-purple-500 text-purple-900" },
  system:   { label: "System",    cls: "bg-gray-50 border-l-2 border-gray-400 text-gray-700" },
};

function relTime(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function SupportConversationsInbox() {
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [ctx, setCtx] = useState<ContextInfo>({ orderNumber: null, restaurantName: null, customerName: null, driverName: null });
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [scope, setScope] = useState<ScopeFilter>("all");
  const [party, setParty] = useState<PartyFilter>("all");
  const [search, setSearch] = useState("");
  const [matchedThreadIds, setMatchedThreadIds] = useState<Set<string> | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const loadThreads = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("order_support_threads")
      .select("id, order_id, restaurant_id, customer_user_id, driver_id, channel, customer_included, driver_included, status, priority, subject, last_message_at, created_at, unread_for_support")
      .order("last_message_at", { ascending: false })
      .limit(200);
    setThreads((data as ThreadRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  // Full-text lookup across message bodies (kicks in when search has 3+ chars)
  useEffect(() => {
    const q = search.trim();
    if (q.length < 3) { setMatchedThreadIds(null); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("order_support_messages")
        .select("thread_id")
        .ilike("body", `%${q}%`)
        .limit(500);
      if (!cancelled) {
        setMatchedThreadIds(new Set(((data as any[]) || []).map((r) => r.thread_id)));
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [search]);

  // Realtime: any change to threads or messages refreshes inbox / active thread
  useEffect(() => {
    const ch = supabase
      .channel("support-inbox-global")
      .on("postgres_changes", { event: "*", schema: "public", table: "order_support_threads" }, () => loadThreads())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_support_messages" }, (payload) => {
        const row = payload.new as MessageRow;
        if (activeId && row.thread_id === activeId) {
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        }
        loadThreads();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeId, loadThreads]);

  // Load active conversation
  useEffect(() => {
    if (!activeId) { setMessages([]); setCtx({ orderNumber: null, restaurantName: null, customerName: null, driverName: null }); return; }
    (async () => {
      const [{ data: msgs }, threadRow] = await Promise.all([
        supabase.from("order_support_messages").select("id, thread_id, sender_role, body, created_at").eq("thread_id", activeId).order("created_at", { ascending: true }),
        Promise.resolve(threads.find((t) => t.id === activeId) ?? null),
      ]);
      setMessages((msgs as MessageRow[]) || []);
      if (threadRow) {
        const [orderRes, restRes, customerRes, driverRes] = await Promise.all([
          supabase.from("orders").select("order_number").eq("id", threadRow.order_id).maybeSingle(),
          threadRow.restaurant_id ? supabase.from("restaurants").select("name").eq("id", threadRow.restaurant_id).maybeSingle() : Promise.resolve({ data: null } as any),
          threadRow.customer_user_id ? supabase.from("profiles").select("first_name, last_name").eq("id", threadRow.customer_user_id).maybeSingle() : Promise.resolve({ data: null } as any),
          threadRow.driver_id ? supabase.from("driver_profiles").select("first_name, last_name").eq("user_id", threadRow.driver_id).maybeSingle() : Promise.resolve({ data: null } as any),
        ]);
        setCtx({
          orderNumber: (orderRes as any)?.data?.order_number ?? null,
          restaurantName: (restRes as any)?.data?.name ?? null,
          customerName: customerRes?.data ? `${(customerRes as any).data.first_name ?? ""} ${((customerRes as any).data.last_name ?? "").charAt(0)}.`.trim() : null,
          driverName: driverRes?.data ? `${(driverRes as any).data.first_name ?? ""} ${(driverRes as any).data.last_name ?? ""}`.trim() : null,
        });
      }
      // mark read for support
      await supabase.rpc("mark_support_thread_read", { _thread_id: activeId, _role: "support" });
    })();
  }, [activeId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  const visible = useMemo(() => {
    return threads.filter((t) => {
      if (scope === "unread" && t.unread_for_support === 0) return false;
      if (scope === "open" && t.status !== "open" && t.status !== "active") return false;
      if (scope === "resolved" && t.status !== "resolved" && t.status !== "closed") return false;
      if (party === "merchant" && !t.restaurant_id) return false;
      if (party === "customer" && !t.customer_user_id) return false;
      if (party === "driver" && !t.driver_id) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hitsMeta =
          (t.subject ?? "").toLowerCase().includes(q) ||
          t.order_id.toLowerCase().includes(q);
        const hitsBody = matchedThreadIds?.has(t.id) ?? false;
        if (!hitsMeta && !hitsBody) return false;
      }
      return true;
    });
  }, [threads, scope, party, search, matchedThreadIds]);

  const totalUnread = useMemo(() => threads.reduce((s, t) => s + (t.unread_for_support || 0), 0), [threads]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || !activeId) return;
    setSending(true);
    const { error } = await supabase.from("order_support_messages").insert({
      thread_id: activeId,
      sender_role: "support",
      sender_user_id: me,
      body: text,
    });
    setSending(false);
    if (!error) setDraft("");
  }, [draft, activeId, me]);

  const toggleCustomerLoopIn = useCallback(async () => {
    if (!activeId) return;
    const cur = threads.find((t) => t.id === activeId);
    if (!cur) return;
    const next = !cur.customer_included;
    await supabase.from("order_support_threads").update({ customer_included: next }).eq("id", activeId);
    await supabase.from("order_support_messages").insert({
      thread_id: activeId,
      sender_role: "system",
      body: next ? "Customer has been added to this conversation." : "Customer has been removed from this conversation.",
    });
  }, [activeId, threads]);

  const toggleDriverLoopIn = useCallback(async () => {
    if (!activeId) return;
    const cur = threads.find((t) => t.id === activeId);
    if (!cur || !cur.driver_id) return;
    const next = !cur.driver_included;
    await supabase.from("order_support_threads").update({ driver_included: next }).eq("id", activeId);
    await supabase.from("order_support_messages").insert({
      thread_id: activeId,
      sender_role: "system",
      body: next ? "Feeder has been added to this conversation." : "Feeder has been removed from this conversation.",
    });
  }, [activeId, threads]);

  const resolveThread = useCallback(async () => {
    if (!activeId) return;
    await supabase.from("order_support_threads").update({ status: "resolved" }).eq("id", activeId);
    await supabase.from("order_support_messages").insert({
      thread_id: activeId,
      sender_role: "system",
      body: "Conversation marked resolved by Crave'N support.",
    });
  }, [activeId]);

  const routeToDepartment = useCallback(async (deptId: string, deptLabel: string) => {
    if (!activeId) return;
    const cur = threads.find((t) => t.id === activeId);
    const nextSubject = `[${deptLabel}] ${(cur?.subject ?? "").replace(/^\[[^\]]+\]\s*/, "")}`.trim();
    await supabase.from("order_support_threads").update({
      subject: nextSubject,
      priority: deptId === "safety" ? "urgent" : (cur?.priority ?? "normal"),
    }).eq("id", activeId);
    await supabase.from("order_support_messages").insert({
      thread_id: activeId,
      sender_role: "system",
      body: `Conversation routed to ${deptLabel}.`,
    });
  }, [activeId, threads]);

  const sendCanned = useCallback(async (text: string) => {
    if (!activeId || !text) return;
    await supabase.from("order_support_messages").insert({
      thread_id: activeId,
      sender_role: "support",
      sender_user_id: me,
      body: text,
    });
  }, [activeId, me]);

  const active = threads.find((t) => t.id === activeId);

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[560px] overflow-hidden rounded-lg border border-border bg-card">
      {/* List */}
      <aside className="flex w-[340px] flex-col border-r border-border bg-muted/30">
        <div className="border-b border-border p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-semibold">Live Conversations</span>
            </div>
            {totalUnread > 0 && (
              <span className="rounded-full bg-orange-600 px-2 py-0.5 text-[10px] font-bold text-white">{totalUnread} new</span>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order #, subject, or message text"
              className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-2 text-xs outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <div className="mt-2 flex gap-1">
            {(["all", "unread", "open", "resolved"] as ScopeFilter[]).map((s) => (
              <button key={s} onClick={() => setScope(s)} className={`flex-1 rounded-md px-1.5 py-1 text-[10px] font-medium capitalize ${scope === s ? "bg-orange-600 text-white" : "bg-background text-muted-foreground hover:text-foreground"}`}>{s}</button>
            ))}
          </div>
          <div className="mt-1 flex gap-1">
            {(["all", "merchant", "customer", "driver"] as PartyFilter[]).map((p) => (
              <button key={p} onClick={() => setParty(p)} className={`flex-1 rounded-md px-1.5 py-1 text-[10px] font-medium capitalize ${party === p ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:text-foreground"}`}>{p}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : visible.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-muted-foreground">No conversations match these filters.</div>
          ) : (
            visible.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={`flex w-full flex-col gap-1 border-b border-border/60 px-3 py-2.5 text-left transition-colors hover:bg-accent/40 ${activeId === t.id ? "bg-accent/60" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold">
                    {t.channel === "call" ? <Phone className="h-3 w-3 text-orange-600" /> : <MessageSquare className="h-3 w-3 text-blue-600" />}
                    Order #{t.order_id.slice(0, 6)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{relTime(t.last_message_at)}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  {t.restaurant_id && <span className="inline-flex items-center gap-0.5"><Store className="h-2.5 w-2.5" />Merchant</span>}
                  {t.customer_included && <span className="inline-flex items-center gap-0.5"><User className="h-2.5 w-2.5" />Customer</span>}
                  {t.driver_id && <span className="inline-flex items-center gap-0.5"><Bike className="h-2.5 w-2.5" />Feeder</span>}
                  <span className={`ml-auto rounded px-1 py-px text-[9px] font-semibold uppercase ${t.status === "resolved" || t.status === "closed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{t.status}</span>
                </div>
                {t.unread_for_support > 0 && (
                  <span className="self-start rounded-full bg-orange-600 px-1.5 py-0.5 text-[9px] font-bold text-white">{t.unread_for_support} unread</span>
                )}
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Conversation */}
      <section className="flex flex-1 flex-col">
        {!active ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a conversation to start responding.
          </div>
        ) : (
          <>
            <header className="flex items-start justify-between gap-4 border-b border-border bg-background px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {active.channel === "call" ? <Phone className="h-4 w-4 text-orange-600" /> : <MessageSquare className="h-4 w-4 text-blue-600" />}
                  <h2 className="truncate text-sm font-semibold">
                    Order #{ctx.orderNumber ?? active.order_id.slice(0, 8)} · {active.channel === "call" ? "Call request" : "Message thread"}
                  </h2>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  {ctx.restaurantName && <span className="inline-flex items-center gap-1"><Store className="h-3 w-3" />{ctx.restaurantName}</span>}
                  {ctx.customerName && <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{ctx.customerName}</span>}
                  {ctx.driverName && <span className="inline-flex items-center gap-1"><Bike className="h-3 w-3" />{ctx.driverName}</span>}
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />Opened {new Date(active.created_at).toLocaleString()}</span>
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                {active.customer_user_id && (
                  <button onClick={toggleCustomerLoopIn} className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium ${active.customer_included ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}>
                    <UserPlus className="h-3 w-3" />{active.customer_included ? "Customer in" : "Loop in customer"}
                  </button>
                )}
                {active.driver_id && (
                  <button onClick={toggleDriverLoopIn} className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium ${active.driver_included ? "border-purple-200 bg-purple-50 text-purple-700" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}>
                    <Bike className="h-3 w-3" />{active.driver_included ? "Feeder in" : "Loop in feeder"}
                  </button>
                )}
                {active.status !== "resolved" && active.status !== "closed" && (
                  <button onClick={resolveThread} className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100">
                    <CheckCircle2 className="h-3 w-3" />Mark resolved
                  </button>
                )}
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-muted/20 p-4">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  No messages yet in this thread.
                </div>
              ) : (
                messages.map((m) => {
                  const meta = ROLE_STYLE[m.sender_role];
                  return (
                    <div key={m.id} className={`rounded-md px-3 py-2 ${meta.cls}`}>
                      <div className="mb-0.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide">
                        <span>{meta.label}</span>
                        <span className="opacity-70">{new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                    </div>
                  );
                })
              )}
            </div>

            <footer className="border-t border-border bg-background p-3">
              {/* Department routing */}
              <div className="mb-2 flex flex-wrap items-center gap-1">
                <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Route to:</span>
                {SUPPORT_DEPARTMENTS.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => routeToDepartment(d.id, d.label)}
                    title={d.description}
                    className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-foreground hover:bg-accent"
                    style={{ borderColor: d.color, color: d.color }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              {/* Quick replies */}
              <div className="mb-2 flex flex-wrap items-center gap-1">
                <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Quick reply:</span>
                {QUICK_REPLIES.support.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => sendCanned(q.body)}
                    title={q.body}
                    className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700 hover:bg-orange-100"
                  >
                    {q.label}
                  </button>
                ))}
                <button
                  onClick={() => setDraft(QUICK_REPLIES.support[0].body)}
                  className="ml-1 rounded-full border border-dashed border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                >
                  Edit before send →
                </button>
              </div>
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
                  }}
                  rows={2}
                  placeholder={`Reply as Crave'N CS to ${ctx.restaurantName ?? "this thread"}…`}
                  className="flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-500"
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
              <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><AlertCircle className="h-3 w-3" />Reply is private to selected parties only.</span>
                <span>⌘/Ctrl + Enter to send</span>
              </div>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
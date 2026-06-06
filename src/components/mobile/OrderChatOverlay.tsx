/**
 * Full-screen feeder ↔ customer chat overlay.
 *
 * Writes to the unified `order_support_threads` / `order_support_messages`
 * tables (channel = 'message', driver_included + customer_included), so every
 * conversation between a feeder and a customer is automatically:
 *   • Visible to Crave'N support inside the Support Conversations inbox.
 *   • Visible in the Order Forensics viewer transcript section for an order.
 *   • Retained under the same RLS the support hub uses (admins + parties).
 */
// @ts-nocheck
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Text, Loader } from '@mantine/core';
import { IconX, IconSend } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';

const ROLE_STYLES: Record<string, { label: string; cls: string; align: string }> = {
  driver:   { label: 'You',              cls: 'bg-orange-500 text-white',         align: 'flex-end'   },
  customer: { label: 'Customer',         cls: 'bg-emerald-50 text-emerald-900',   align: 'flex-start' },
  support:  { label: "Crave'N support",  cls: 'bg-blue-50 text-blue-900',         align: 'flex-start' },
  merchant: { label: 'Restaurant',       cls: 'bg-amber-50 text-amber-900',       align: 'flex-start' },
  system:   { label: 'System',           cls: 'bg-gray-100 text-gray-700',        align: 'center'     },
};

const QUICK_REPLIES = [
  "I'm on my way!",
  "I'm here — heading to your door.",
  "Pulling up now.",
  "Could you confirm your address?",
  "I'll leave it at the door.",
];

export interface OrderChatOverlayProps {
  orderId: string;
  /** If not provided, fetched from orders.customer_id for this order. */
  customerId?: string | null;
  onClose: () => void;
}

export const OrderChatOverlay: React.FC<OrderChatOverlayProps> = ({
  orderId,
  customerId: customerIdProp,
  onClose,
}) => {
  const [thread, setThread] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState('');
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to message the customer.');
        setLoading(false);
        return;
      }

      // Find or create the unified customer thread for this order. We use the
      // 'message' channel + customer_included + driver_included so the same
      // thread is shared by customer ↔ feeder ↔ Crave'N support.
      let { data: t } = await (supabase as any)
        .from('order_support_threads')
        .select('id, driver_included, customer_included, status, channel')
        .eq('order_id', orderId)
        .eq('customer_included', true)
        .order('last_message_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!t) {
        let custId = customerIdProp;
        let restId: string | null = null;
        const { data: orderRow } = await (supabase as any)
          .from('orders')
          .select('customer_id, restaurant_id')
          .eq('id', orderId)
          .maybeSingle();
        if (custId == null) custId = orderRow?.customer_id ?? null;
        restId = orderRow?.restaurant_id ?? null;
        const { data: created, error: insErr } = await (supabase as any)
          .from('order_support_threads')
          .insert({
            order_id: orderId,
            restaurant_id: restId,
            customer_user_id: custId ?? null,
            driver_id: user.id,
            channel: 'message',
            customer_included: true,
            driver_included: true,
            status: 'open',
            created_by: user.id,
            subject: 'Feeder ↔ customer order chat',
          })
          .select('id, driver_included, customer_included, status, channel')
          .maybeSingle();
        if (insErr) {
          console.error('[OrderChatOverlay] thread insert failed', insErr);
          setError(`Could not start chat: ${insErr.message || 'unknown error'}`);
          setLoading(false);
          return;
        }
        t = created;
      } else if (!(t as any).driver_included) {
        // Ensure the feeder is added to an existing thread (e.g. customer ↔ support)
        await (supabase as any)
          .from('order_support_threads')
          .update({ driver_included: true, driver_id: user.id })
          .eq('id', (t as any).id);
      }
      setThread(t);

      if (t) {
        const { data: msgs } = await (supabase as any)
          .from('order_support_messages')
          .select('id, sender_role, sender_user_id, body, created_at')
          .eq('thread_id', (t as any).id)
          .order('created_at', { ascending: true });
        setMessages(msgs || []);
        try {
          await (supabase as any).rpc('mark_support_thread_read', { _thread_id: (t as any).id, _role: 'driver' });
        } catch {}
      }
    } catch (e) {
      setError('Something went wrong loading the chat.');
    } finally {
      setLoading(false);
    }
  }, [orderId, customerIdProp]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!thread?.id) return;
    const ch = (supabase as any)
      .channel(`order-chat-${orderId}-${thread.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_support_messages', filter: `thread_id=eq.${thread.id}` },
        (p: any) => {
          const row = p.new;
          setMessages((prev) => (prev.some((m: any) => m.id === row.id) ? prev : [...prev, row]));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orderId, thread?.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  const send = useCallback(async (text: string) => {
    const body = text.trim();
    if (!body || !thread?.id || !me) return;
    setSending(true);
    try {
      await (supabase as any).from('order_support_messages').insert({
        thread_id: thread.id,
        sender_role: 'driver',
        sender_user_id: me,
        body,
      });
      await (supabase as any)
        .from('order_support_threads')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', thread.id);
      setDraft('');
    } catch {
      setError('Could not send message.');
    } finally {
      setSending(false);
    }
  }, [thread?.id, me]);

  if (loading) {
    return (
      <Box style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#1a1a1a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <button type="button" onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 20, border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Close">
          <IconX size={20} />
        </button>
        <Loader color="orange" size="md" />
        <Text c="white" mt="md" size="sm">Loading chat…</Text>
      </Box>
    );
  }

  return (
    <Box style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#fff', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box style={{ flexShrink: 0, padding: '12px 16px', paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>
        <div>
          <Text size="sm" fw={700}>Message customer</Text>
          <Text size="xs" c="dimmed">Crave'N support can review this chat for safety.</Text>
        </div>
        <button type="button" onClick={onClose} style={{ width: 36, height: 36, borderRadius: 18, border: 'none', background: 'rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Close">
          <IconX size={18} />
        </button>
      </Box>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px', background: '#fafafa' }}>
        {error && (
          <div style={{ textAlign: 'center', color: '#b91c1c', padding: 8 }}>{error}</div>
        )}
        {messages.length === 0 && !error && (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: 24, fontSize: 13 }}>
            No messages yet. Use a quick reply below or send the customer an update.
          </div>
        )}
        {messages.map((m: any) => {
          const isMine = m.sender_user_id === me;
          const style = ROLE_STYLES[m.sender_role] || ROLE_STYLES.system;
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : (style.align === 'center' ? 'center' : 'flex-start'), marginBottom: 8 }}>
              <div style={{ maxWidth: '80%' }}>
                {!isMine && style.align !== 'center' && (
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{style.label}</div>
                )}
                <div className={style.cls} style={{ padding: '8px 12px', borderRadius: 16, fontSize: 14, whiteSpace: 'pre-wrap' }}>
                  {m.body}
                </div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2, textAlign: isMine ? 'right' : 'left' }}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick replies */}
      <div style={{ flexShrink: 0, padding: '8px 12px 4px', display: 'flex', gap: 6, overflowX: 'auto', background: '#fff', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        {QUICK_REPLIES.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => send(q)}
            disabled={sending || !thread}
            style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 999, border: '1px solid #f26419', background: '#fff', color: '#f26419', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(draft); }}
        style={{ flexShrink: 0, padding: '8px 12px', paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))', display: 'flex', gap: 8, background: '#fff', borderTop: '1px solid rgba(0,0,0,0.06)' }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message to the customer…"
          disabled={sending || !thread}
          style={{ flex: 1, padding: '10px 14px', borderRadius: 999, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none' }}
        />
        <button
          type="submit"
          disabled={sending || !draft.trim() || !thread}
          style={{ width: 44, height: 44, borderRadius: 22, border: 'none', background: '#f26419', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !draft.trim() || sending ? 0.5 : 1 }}
          aria-label="Send"
        >
          <IconSend size={18} />
        </button>
      </form>
    </Box>
  );
};

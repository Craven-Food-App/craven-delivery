/**
 * Full-screen overlay that finds or creates the customer_driver chat for an order
 * and shows ChatInterface. All messages are stored in chat_messages.
 *
 * Record retention: Customer service and security can look up these conversations
 * (via chat_conversations + chat_messages, filtered by order_id) for safety,
 * training, verification of order history, and proof in disputes (e.g. driver vs
 * customer claims). RLS allows admins (user_roles) to SELECT conversations and messages.
 */
import React, { useState, useEffect } from 'react';
import { Box, Text, Loader } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import ChatInterface from '@/components/chat/ChatInterface';

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
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Please log in to message the customer.');
          setLoading(false);
          return;
        }

        let customerId = customerIdProp;
        if (customerId == null && orderId) {
          const { data: orderRow } = await supabase
            .from('orders')
            .select('customer_id')
            .eq('id', orderId)
            .maybeSingle();
          customerId = orderRow?.customer_id ?? null;
        }

        let { data: conv } = await supabase
          .from('chat_conversations')
          .select('id')
          .eq('order_id', orderId)
          .eq('type', 'customer_driver')
          .maybeSingle();

        if (!conv) {
          const { data: newConv, error: insertErr } = await supabase
            .from('chat_conversations')
            .insert({
              type: 'customer_driver',
              order_id: orderId,
              driver_id: user.id,
              customer_id: customerId ?? null,
              status: 'active',
            })
            .select('id')
            .single();

          if (insertErr) {
            setError('Could not start chat. Try again.');
            setLoading(false);
            return;
          }
          conv = newConv;
        }

        if (!cancelled) {
          setConversationId(conv.id);
        }
      } catch (e) {
        if (!cancelled) setError('Something went wrong.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();
    return () => { cancelled = true; };
  }, [orderId, customerIdProp]);

  if (loading) {
    return (
      <Box
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          background: '#1a1a1a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 40,
            height: 40,
            borderRadius: 20,
            border: 'none',
            background: 'rgba(255,255,255,0.1)',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Close"
        >
          <IconX size={20} />
        </button>
        <Loader color="orange" size="md" />
        <Text c="white" mt="md" size="sm">Loading chat…</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          background: '#1a1a1a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 40,
            height: 40,
            borderRadius: 20,
            border: 'none',
            background: 'rgba(255,255,255,0.1)',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Close"
        >
          <IconX size={20} />
        </button>
        <Text c="white" size="sm" ta="center">{error}</Text>
        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 16,
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            background: '#f26419',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </Box>
    );
  }

  if (!conversationId) return null;

  return (
    <Box
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        style={{
          flexShrink: 0,
          padding: '12px 16px',
          paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fff',
        }}
      >
        <Text size="sm" fw={600}>Message customer</Text>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            border: 'none',
            background: 'rgba(0,0,0,0.06)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Close"
        >
          <IconX size={18} />
        </button>
      </Box>
      <Box style={{ flex: 1, minHeight: 0 }}>
        <ChatInterface
          conversationId={conversationId}
          conversationType="customer_driver"
          currentUserType="driver"
          onClose={onClose}
        />
      </Box>
    </Box>
  );
};

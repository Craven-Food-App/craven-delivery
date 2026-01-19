import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ChatInterface from '@/components/chat/ChatInterface';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageCircle, Truck } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Box,
  Text,
  Group,
  Card,
  Stack,
  Badge,
  Loader,
  Center,
} from '@mantine/core';

const CustomerSupportChat: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [chatType, setChatType] = useState<'customer_support' | 'customer_driver'>('customer_support');
  const [showDriverChat, setShowDriverChat] = useState(false);

  useEffect(() => {
    const conversationIdParam = searchParams.get('conversationId');
    const orderIdParam = searchParams.get('orderId');
    const typeParam = searchParams.get('type') as 'support' | 'driver';

    if (conversationIdParam) {
      setConversationId(conversationIdParam);
      setLoading(false);
    } else {
      // Check for active order if orderId is provided
      if (orderIdParam && typeParam === 'driver') {
        fetchActiveOrder(orderIdParam);
        setChatType('customer_driver');
        setShowDriverChat(true);
      } else {
        // Create or get existing support conversation
        initializeSupportChat();
      }
    }
  }, [searchParams]);

  const fetchActiveOrder = async (orderId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/account');
        return;
      }

      const { data: order, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          order_status,
          driver_id,
          restaurant:restaurants(id, name)
        `)
        .eq('id', orderId)
        .eq('customer_id', user.id)
        .single();

      if (error) throw error;

      if (order && !['delivered', 'cancelled'].includes(order.order_status)) {
        setActiveOrder(order);
        // Get or create driver conversation
        await initializeDriverChat(orderId, order.driver_id);
      } else {
        toast({
          title: "No Active Order",
          description: "This order is no longer active. You can contact support instead.",
          variant: "default"
        });
        setChatType('customer_support');
        setShowDriverChat(false);
        initializeSupportChat();
      }
    } catch (error: any) {
      console.error('Error fetching order:', error);
      toast({
        title: "Error",
        description: "Failed to load order information",
        variant: "destructive"
      });
      setChatType('customer_support');
      initializeSupportChat();
    } finally {
      setLoading(false);
    }
  };

  const initializeDriverChat = async (orderId: string, driverId: string | null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (!driverId) {
        toast({
          title: "No Driver Assigned",
          description: "Your order doesn't have a driver yet. Contact support for assistance.",
          variant: "default"
        });
        setChatType('customer_support');
        setShowDriverChat(false);
        initializeSupportChat();
        return;
      }

      // Check for existing conversation
      const { data: existing } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('type', 'customer_driver')
        .eq('order_id', orderId)
        .eq('customer_id', user.id)
        .eq('driver_id', driverId)
        .maybeSingle();

      if (existing) {
        setConversationId(existing.id);
        setLoading(false);
        return;
      }

      // Create new driver conversation
      const { data: newConversation, error } = await supabase
        .from('chat_conversations')
        .insert({
          type: 'customer_driver',
          customer_id: user.id,
          driver_id: driverId,
          order_id: orderId,
          status: 'active',
          priority: 'normal',
          subject: `Order #${orderId.substring(0, 8)}`
        })
        .select()
        .single();

      if (error) throw error;

      setConversationId(newConversation.id);
    } catch (error: any) {
      console.error('Error initializing driver chat:', error);
      toast({
        title: "Error",
        description: "Failed to start driver chat. Contacting support instead.",
        variant: "destructive"
      });
      setChatType('customer_support');
      setShowDriverChat(false);
      initializeSupportChat();
    } finally {
      setLoading(false);
    }
  };

  const initializeSupportChat = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/account');
        return;
      }

      // Check for existing active support conversation
      const { data: existing } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('type', 'customer_support')
        .eq('customer_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        setConversationId(existing.id);
        setLoading(false);
        return;
      }

      // Create new support conversation
      const { data: newConversation, error } = await supabase
        .from('chat_conversations')
        .insert({
          type: 'customer_support',
          customer_id: user.id,
          status: 'active',
          priority: 'normal',
          subject: 'Customer Support Request'
        })
        .select()
        .single();

      if (error) throw error;

      setConversationId(newConversation.id);

      // Send welcome message
      await supabase
        .from('chat_messages')
        .insert({
          conversation_id: newConversation.id,
          sender_id: null,
          sender_type: 'admin',
          message_type: 'system',
          content: 'Hello! How can we help you today?',
          is_read: false
        });
    } catch (error: any) {
      console.error('Error initializing support chat:', error);
      toast({
        title: "Error",
        description: "Failed to start chat. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const switchToSupport = () => {
    setChatType('customer_support');
    setShowDriverChat(false);
    setActiveOrder(null);
    initializeSupportChat();
  };

  if (loading) {
    return (
      <Box style={{ minHeight: '100vh', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack align="center" gap="md">
          <Loader size="lg" color="orange" />
          <Text c="gray">Loading chat...</Text>
        </Stack>
      </Box>
    );
  }

  return (
    <Box style={{ 
      minHeight: '100vh', 
      backgroundColor: 'white', 
      display: 'flex', 
      flexDirection: 'column', 
      padding: 0, 
      margin: 0,
      paddingTop: 'env(safe-area-inset-top, 0px)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Chat Interface - Full Screen */}
      {conversationId ? (
        <Box style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: '100vh', 
          width: '100%',
          overflow: 'hidden',
        }}>
          <ChatInterface
            conversationId={conversationId}
            conversationType={chatType}
            currentUserType="customer"
            onClose={() => navigate(-1)}
          />
        </Box>
      ) : (
        <Box style={{ minHeight: '100vh', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Stack align="center" gap="md">
            <Loader size="lg" color="orange" />
            <Text c="gray">Starting chat...</Text>
          </Stack>
        </Box>
      )}
      
      {/* White Bar at Bottom */}
      <Box
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          backgroundColor: '#ffffff',
          height: '30px',
          zIndex: 1000,
          borderTop: '1px solid #e5e7eb',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      />
    </Box>
  );
};

export default CustomerSupportChat;


import React, { useState, useRef, useEffect } from 'react';
import { Phone, Clock, Navigation, Home, Check, CheckCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  id: string;
  sender: 'customer' | 'driver';
  text: string;
  timestamp: Date;
  delivered: boolean;
  read: boolean;
}

interface OrderDetails {
  orderId: string;
  restaurant: string;
  customer: string;
  customerPhone: string;
  address: string;
  eta: string;
  items: number;
}

const CravenAppComm = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [orderStatus, setOrderStatus] = useState<string>('');
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch active order and initialize chat
  useEffect(() => {
    const initializeChat = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Please log in to use chat');
          setLoading(false);
          return;
        }

        // Get active delivery/order for the driver
        // First try to get from order_assignments with accepted status
        let activeOrder: any = null;
        
        const { data: assignment } = await supabase
          .from('order_assignments')
          .select(`
            order_id,
            orders (
              id,
              order_number,
              customer_id,
              restaurant_name,
              pickup_address,
              dropoff_address,
              status,
              customer_name,
              customer_phone,
              estimated_delivery_time,
              items
            )
          `)
          .eq('driver_id', user.id)
          .eq('status', 'accepted')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (assignment) {
          activeOrder = assignment;
        } else {
          // Fallback: check orders table directly for assigned orders
          const { data: directOrder } = await supabase
            .from('orders')
            .select('*')
            .eq('assigned_craver_id', user.id)
            .in('status', ['assigned', 'picked_up', 'in_transit'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (directOrder) {
            activeOrder = { order_id: directOrder.id, orders: directOrder };
          }
        }

        if (!activeOrder || !activeOrder.orders) {
          // No active order - show empty state or message
          setOrderDetails(null);
          setLoading(false);
          return;
        }

        const order = activeOrder.orders as any;
        const customerId = order.customer_id;

        // Get customer info
        let customerName = order.customer_name || 'Customer';
        let customerPhone = order.customer_phone || '';

        if (customerId && !customerName) {
          // @ts-ignore - Type compatibility
          const { data: customerProfile } = await supabase
            .from('customer_profiles')
            .select('full_name, phone')
            .eq('user_id', customerId)
            .maybeSingle();
          
          if (customerProfile) {
            // @ts-ignore
            customerName = customerProfile.full_name || customerName;
            // @ts-ignore
            customerPhone = customerProfile.phone || customerPhone;
          }
        }

        // Format address
        const formatAddress = (addr: any) => {
          if (typeof addr === 'string') return addr;
          if (addr?.address) {
            return `${addr.address}${addr.city ? `, ${addr.city}` : ''}${addr.state ? ` ${addr.state}` : ''}`;
          }
          return 'Address not available';
        };

        const dropoffAddress = formatAddress(order.dropoff_address);
        
        // Calculate ETA
        const calculateETA = () => {
          if (order.estimated_delivery_time) {
            const deliveryTime = new Date(order.estimated_delivery_time);
            const now = new Date();
            const diffMinutes = Math.max(0, Math.ceil((deliveryTime.getTime() - now.getTime()) / 60000));
            return diffMinutes > 0 ? `${diffMinutes} mins` : 'Arriving soon';
          }
          return 'Calculating...';
        };

        setOrderDetails({
          orderId: `#${order.order_number || order.id.slice(0, 8)}`,
          restaurant: order.restaurant_name || 'Restaurant',
          customer: customerName,
          customerPhone: customerPhone,
          address: dropoffAddress,
          eta: calculateETA(),
          items: Array.isArray(order.items) ? order.items.length : 1
        });

        // Determine order status
        const status = order.status || 'pending';
        if (status === 'picked_up' || status === 'in_transit') {
          setOrderStatus('picked_up');
        } else {
          setOrderStatus('waiting');
        }

        // Find or create conversation
        let { data: conversation } = await supabase
          .from('chat_conversations')
          .select('id')
          .eq('order_id', order.id)
          .eq('type', 'customer_driver')
          .maybeSingle();

        if (!conversation) {
          // Create new conversation
          const { data: newConversation, error: convError } = await supabase
            .from('chat_conversations')
            .insert({
              type: 'customer_driver',
              order_id: order.id,
              driver_id: user.id,
              customer_id: customerId,
              status: 'active'
            })
            .select('id')
            .single();

          if (convError) {
            console.error('Error creating conversation:', convError);
            toast.error('Failed to initialize chat');
            setLoading(false);
            return;
          }

          conversation = newConversation;
        }

        setConversationId(conversation.id);

        // Load existing messages
        const { data: existingMessages, error: messagesError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: true });

        if (messagesError) {
          console.error('Error loading messages:', messagesError);
        } else if (existingMessages) {
          const formattedMessages: Message[] = existingMessages.map((msg: any) => ({
            id: msg.id,
            sender: msg.sender_type === 'driver' ? 'driver' : 'customer',
            text: msg.content,
            timestamp: new Date(msg.created_at),
            delivered: true,
            read: msg.is_read || false
          }));
          setMessages(formattedMessages);
        }

        // Set up real-time subscription
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
        }

        const channel = supabase
          .channel(`chat_messages_${conversation.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'chat_messages',
              filter: `conversation_id=eq.${conversation.id}`
            },
            (payload) => {
              const newMsg = payload.new as any;
              const message: Message = {
                id: newMsg.id,
                sender: newMsg.sender_type === 'driver' ? 'driver' : 'customer',
                text: newMsg.content,
                timestamp: new Date(newMsg.created_at),
                delivered: true,
                read: newMsg.is_read || false
              };
              
              setMessages(prev => {
                // Avoid duplicates
                if (prev.some(m => m.id === message.id)) return prev;
                return [...prev, message];
              });
            }
          )
          .subscribe();

        channelRef.current = channel;

        setLoading(false);
      } catch (error: any) {
        console.error('Error initializing chat:', error);
        toast.error('Failed to load chat');
        setLoading(false);
      }
    };

    initializeChat();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const handleCallCustomer = () => {
    if (orderDetails?.customerPhone) {
      window.location.href = `tel:${orderDetails.customerPhone}`;
    } else {
      toast.error('Customer phone number not available');
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !conversationId) return;

    const messageText = inputText.trim();
    setInputText('');
    setShowQuickReplies(false);
    inputRef.current?.focus();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to send messages');
        return;
      }

      // Optimistically add message
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        sender: 'driver',
        text: messageText,
        timestamp: new Date(),
        delivered: false,
        read: false
      };
      setMessages(prev => [...prev, tempMessage]);

      // Save to database
      const { data: savedMessage, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          sender_type: 'driver',
          content: messageText,
          message_type: 'text'
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
        // Remove temp message on error
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
        return;
      }

      // Replace temp message with real one
      setMessages(prev => prev.map(m => 
        m.id === tempMessage.id 
          ? {
              id: savedMessage.id,
              sender: 'driver',
              text: savedMessage.content,
              timestamp: new Date(savedMessage.created_at),
              delivered: true,
              read: false
            }
          : m
      ));

      // Update conversation updated_at
      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleQuickReply = async (text: string) => {
    if (!conversationId) return;

    setShowQuickReplies(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to send messages');
        return;
      }

      // Optimistically add message
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        sender: 'driver',
        text: text,
        timestamp: new Date(),
        delivered: false,
        read: false
      };
      setMessages(prev => [...prev, tempMessage]);

      // Save to database
      const { data: savedMessage, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          sender_type: 'driver',
          content: text,
          message_type: 'text'
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending quick reply:', error);
        toast.error('Failed to send message');
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
        return;
      }

      // Replace temp message with real one
      setMessages(prev => prev.map(m => 
        m.id === tempMessage.id 
          ? {
              id: savedMessage.id,
              sender: 'driver',
              text: savedMessage.content,
              timestamp: new Date(savedMessage.created_at),
              delivered: true,
              read: false
            }
          : m
      ));

      // Update conversation
      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

    } catch (error: any) {
      console.error('Error sending quick reply:', error);
      toast.error('Failed to send message');
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const quickReplies = [
    { text: "On my way!", icon: <Navigation size={16} /> },
    { text: "Arriving in 5 minutes", icon: <Clock size={16} /> },
    { text: "At the door", icon: <Home size={16} /> }
  ];

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh', 
        backgroundColor: '#f8f9fa',
        maxWidth: '448px',
        margin: '0 auto',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
          <div style={{ fontSize: '16px', fontWeight: 500 }}>Loading chat...</div>
        </div>
      </div>
    );
  }

  if (!orderDetails) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh', 
        backgroundColor: '#f8f9fa',
        maxWidth: '448px',
        margin: '0 auto',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px'
      }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
          <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#212529' }}>No Active Order</div>
          <div style={{ fontSize: '14px', color: '#666' }}>Start a delivery to chat with customers</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100dvh', // Use dynamic viewport height for mobile
      background: 'linear-gradient(to bottom, #f8f9fa 0%, #e9ecef 100%)',
      maxWidth: '448px',
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Glassmorphic Header */}
      <div style={{
        background: 'linear-gradient(135deg, #fa5252 0%, #e03131 100%)',
        color: 'white',
        padding: '20px 16px',
        boxShadow: '0 8px 32px rgba(224, 49, 49, 0.3)',
        backdropFilter: 'blur(10px)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
          pointerEvents: 'none'
        }}></div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '16px',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: '18px', display: 'block' }}>
                {orderDetails.customer}
              </span>
              <span style={{ fontSize: '12px', opacity: 0.9 }}>Customer</span>
            </div>
          </div>
          <button 
            onClick={handleCallCustomer}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Phone size={22} />
          </button>
        </div>
        
        <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', zIndex: 1 }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            background: 'rgba(255,255,255,0.15)',
            padding: '8px 12px',
            borderRadius: '20px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            width: 'fit-content'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#51cf66',
              borderRadius: '50%',
              animation: 'pulse 2s infinite',
              boxShadow: '0 0 8px rgba(81, 207, 102, 0.8)'
            }}></div>
            <span style={{ fontWeight: 600, fontSize: '12px' }}>
              {orderStatus === 'picked_up' ? 'Order Picked Up - Delivering' : 'Waiting at Restaurant'}
            </span>
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            paddingLeft: '4px'
          }}>
            <Clock size={14} />
            <span style={{ fontWeight: 500 }}>ETA: {orderDetails.eta}</span>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '20px 16px',
        paddingBottom: '80px', // Add padding to prevent messages from being hidden behind input
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        background: 'transparent',
        minHeight: 0 // Allow flex shrinking
      }}>
        {messages.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            color: '#666',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
            <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px', color: '#212529' }}>Start the conversation</div>
            <div style={{ fontSize: '14px' }}>Send a message to {orderDetails.customer}</div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={message.id}
            style={{
              display: 'flex',
              justifyContent: message.sender === 'driver' ? 'flex-end' : 'flex-start',
              animation: 'slideIn 0.3s ease-out',
              animationDelay: `${index * 0.05}s`,
              animationFillMode: 'both'
            }}
          >
            <div style={{
              maxWidth: '80%',
              borderRadius: '18px',
              padding: '12px 16px',
              background: message.sender === 'driver' 
                ? 'linear-gradient(135deg, #fa5252 0%, #e03131 100%)' 
                : 'white',
              color: message.sender === 'driver' ? 'white' : '#212529',
              borderBottomRightRadius: message.sender === 'driver' ? '4px' : '18px',
              borderBottomLeftRadius: message.sender === 'driver' ? '18px' : '4px',
              boxShadow: message.sender === 'customer' 
                ? '0 2px 12px rgba(0,0,0,0.08)' 
                : '0 4px 16px rgba(224, 49, 49, 0.3)',
              position: 'relative'
            }}>
              <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.5', fontWeight: 400 }}>
                {message.text}
              </p>
              <div style={{
                margin: '6px 0 0 0',
                fontSize: '11px',
                opacity: 0.75,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                justifyContent: message.sender === 'driver' ? 'flex-end' : 'flex-start'
              }}>
                <span>{formatTime(message.timestamp)}</span>
                {message.sender === 'driver' && (
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    {message.read ? (
                      <CheckCheck size={14} style={{ color: '#51cf66' }} />
                    ) : message.delivered ? (
                      <CheckCheck size={14} />
                    ) : (
                      <Check size={14} />
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-start',
            animation: 'slideIn 0.3s ease-out'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '18px',
              padding: '12px 16px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              display: 'flex',
              gap: '4px',
              alignItems: 'center'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#adb5bd',
                animation: 'typingDot 1.4s infinite'
              }}></div>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#adb5bd',
                animation: 'typingDot 1.4s infinite 0.2s'
              }}></div>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#adb5bd',
                animation: 'typingDot 1.4s infinite 0.4s'
              }}></div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Quick Replies */}
      {showQuickReplies && messages.length === 0 && (
        <div style={{
          padding: '0 16px 12px 16px',
          background: 'transparent'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {quickReplies.map((reply, index) => (
              <button
                key={index}
                onClick={() => handleQuickReply(reply.text)}
                style={{
                  background: 'linear-gradient(135deg, #fd8c3c 0%, #fd7e14 100%)',
                  border: 'none',
                  color: 'white',
                  fontSize: '14px',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontWeight: 600,
                  textAlign: 'left',
                  boxShadow: '0 4px 16px rgba(253, 126, 20, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(253, 126, 20, 0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(253, 126, 20, 0.35)';
                }}
              >
                {reply.icon}
                <span>{reply.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modern Message Input - Always Visible */}
      <div style={{
        background: 'white',
        padding: '16px',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        position: 'sticky',
        bottom: 0,
        zIndex: 10
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          background: '#f8f9fa',
          borderRadius: '24px',
          padding: '4px 4px 4px 18px',
          border: '2px solid transparent',
          transition: 'all 0.3s ease',
          minHeight: '48px'
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#fd7e14';
          e.currentTarget.style.background = 'white';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'transparent';
          e.currentTarget.style.background = '#f8f9fa';
        }}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={conversationId ? "Type a message..." : "Loading chat..."}
            disabled={!conversationId}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              fontSize: '15px',
              outline: 'none',
              color: '#212529',
              minWidth: 0,
              width: '100%'
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || !conversationId}
            style={{
              padding: '12px',
              borderRadius: '50%',
              border: 'none',
              background: inputText.trim() && conversationId
                ? 'linear-gradient(135deg, #fa5252 0%, #e03131 100%)' 
                : '#e9ecef',
              color: inputText.trim() && conversationId ? 'white' : '#adb5bd',
              cursor: inputText.trim() && conversationId ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              boxShadow: inputText.trim() && conversationId ? '0 4px 12px rgba(224, 49, 49, 0.3)' : 'none',
              transform: 'rotate(0deg)'
            }}
            onMouseEnter={(e) => {
              if (inputText.trim() && conversationId) {
                e.currentTarget.style.transform = 'rotate(-15deg) scale(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'rotate(0deg) scale(1)';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.95); }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
};

export default CravenAppComm;

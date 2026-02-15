import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import { useKeyboardAware, useScrollToInput } from '@/hooks/useKeyboardAware';

// ─── TYPES ──────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  content: string;
  sender_type: 'driver' | 'admin' | 'ai' | 'system';
  sender_id: string | null;
  created_at: string;
  is_read: boolean;
  message_type: 'text' | 'image' | 'file' | 'location' | 'system';
}

interface Conversation {
  id: string;
  type: 'driver_support';
  status: 'active' | 'closed' | 'archived';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  subject: string;
  driver_id: string;
  admin_id: string | null;
  created_at: string;
  updated_at: string;
}

interface DriverSupportChatProps {
  onBack: () => void;
}

// ─── COLORS ─────────────────────────────────────────────────────────────────
const C = {
  orange: '#E8622A',
  text: '#1A1A1A',
  textLight: '#666666',
  muted: '#999999',
  border: '#E5E5E5',
  bg: '#F9F9F9',
  white: '#FFFFFF',
  green: '#2E7D32',
  greenBg: '#E8F5E9',
  blue: '#1976D2',
  blueBg: '#E3F2FD',
} as const;

// ─── COMPONENT ──────────────────────────────────────────────────────────────
const DriverSupportChat: React.FC<DriverSupportChatProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const keyboardState = useKeyboardAware();
  const { scrollToInput } = useScrollToInput();

  // ─── INITIALIZE CHAT ──────────────────────────────────────────────────────
  useEffect(() => {
    initializeChat();
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const initializeChat = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        notifications.show({
          title: 'Error',
          message: 'You must be logged in to access support',
          color: 'red',
        });
        onBack();
        return;
      }

      // Check for existing active driver support conversation
      const { data: existing } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('type', 'driver_support')
        .eq('driver_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        setConversation(existing as Conversation);
        await loadMessages(existing.id);
        subscribeToMessages(existing.id);
      } else {
        // Create new driver support conversation
        const { data: newConv, error } = await supabase
          .from('chat_conversations')
          .insert({
            type: 'driver_support',
            driver_id: user.id,
            status: 'active',
            priority: 'normal',
            subject: 'Driver Support Request'
          })
          .select()
          .single();

        if (error) throw error;

        setConversation(newConv as Conversation);

        // Send welcome message
        await supabase
          .from('chat_messages')
          .insert({
            conversation_id: newConv.id,
            sender_id: null,
            sender_type: 'system',
            message_type: 'system',
            content: '👋 Welcome to Crave\'n Driver Support! How can we help you today?',
            is_read: false
          });

        await loadMessages(newConv.id);
        subscribeToMessages(newConv.id);
      }
    } catch (error: any) {
      console.error('Error initializing chat:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to start chat. Please try again.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  // ─── LOAD MESSAGES ────────────────────────────────────────────────────────
  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data as Message[]);
    setTimeout(() => scrollToBottom(), 100);
  };

  // ─── SUBSCRIBE TO MESSAGES ────────────────────────────────────────────────
  const subscribeToMessages = (conversationId: string) => {
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          setTimeout(() => scrollToBottom(), 100);
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  // ─── SEND MESSAGE ─────────────────────────────────────────────────────────
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversation || sending) return;

    try {
      setSending(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          sender_type: 'driver',
          message_type: 'text',
          content: newMessage.trim(),
          is_read: false
        });

      if (error) throw error;

      // Update conversation timestamp
      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversation.id);

      setNewMessage('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to send message',
        color: 'red',
      });
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ─── RENDER MESSAGE ───────────────────────────────────────────────────────
  const renderMessage = (msg: Message) => {
    const isDriver = msg.sender_type === 'driver';
    const isSystem = msg.sender_type === 'system';
    const time = new Date(msg.created_at).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    if (isSystem) {
      return (
        <div key={msg.id} style={{ padding: '12px 16px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: '6px 12px',
            fontSize: 11,
            color: C.textLight,
            maxWidth: '80%',
          }}>
            {msg.content}
          </div>
        </div>
      );
    }

    return (
      <div
        key={msg.id}
        style={{
          display: 'flex',
          justifyContent: isDriver ? 'flex-end' : 'flex-start',
          padding: '4px 16px',
        }}
      >
        <div style={{ maxWidth: '75%' }}>
          {!isDriver && (
            <div style={{
              fontSize: 10,
              color: C.muted,
              marginBottom: 4,
              marginLeft: 12,
              fontWeight: 600,
            }}>
              {msg.sender_type === 'admin' ? 'Support Agent' : msg.sender_type === 'ai' ? 'AI Assistant' : 'System'}
            </div>
          )}
          <div
            style={{
              background: isDriver ? C.orange : C.white,
              color: isDriver ? C.white : C.text,
              padding: '10px 14px',
              borderRadius: isDriver ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              border: isDriver ? 'none' : `1px solid ${C.border}`,
              fontSize: 13,
              lineHeight: 1.5,
              wordWrap: 'break-word',
            }}
          >
            {msg.content}
          </div>
          <div style={{
            fontSize: 9,
            color: C.muted,
            marginTop: 4,
            marginLeft: isDriver ? 0 : 12,
            marginRight: isDriver ? 12 : 0,
            textAlign: isDriver ? 'right' : 'left',
          }}>
            {time}
          </div>
        </div>
      </div>
    );
  };

  // ─── HANDLE INPUT FOCUS (keyboard awareness) ───────────────────────────────
  const handleInputFocus = () => {
    if (inputRef.current) {
      scrollToInput(inputRef.current);
    }
  };

  // ─── LOADING STATE ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        width: '100%',
        background: C.white,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 40,
              height: 40,
              border: `3px solid ${C.border}`,
              borderTop: `3px solid ${C.orange}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 12px',
            }} />
            <div style={{ fontSize: 13, color: C.textLight }}>Loading chat...</div>
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // ─── MAIN RENDER ──────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100dvh',
      width: '100%',
      background: C.white,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        background: C.white,
        borderBottom: `1px solid ${C.border}`,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            padding: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15,18 9,12 15,6" />
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
            Driver Support
          </div>
          <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>
            We typically respond within a few minutes
          </div>
        </div>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: C.green,
          flexShrink: 0,
        }} />
      </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            background: C.white,
            paddingTop: 12,
            // Adjust for keyboard - single paddingBottom value
            paddingBottom: keyboardState.isOpen ? `${keyboardState.height}px` : 12,
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {messages.map(renderMessage)}
        </div>

        {/* Input */}
        <div style={{
          background: C.white,
          borderTop: `1px solid ${C.border}`,
          padding: '12px 16px',
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-end',
          }}>
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={handleInputFocus}
              placeholder="Type your message..."
              disabled={sending}
              style={{
                flex: 1,
                border: `1px solid ${C.border}`,
                borderRadius: 20,
                padding: '10px 16px',
                fontSize: 13,
                fontFamily: 'inherit',
                resize: 'none',
                minHeight: 40,
                maxHeight: 120,
                outline: 'none',
                background: C.white,
                color: C.text,
              }}
              rows={1}
            />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            style={{
              background: newMessage.trim() && !sending ? C.orange : C.bg,
              color: newMessage.trim() && !sending ? C.white : C.muted,
              border: 'none',
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: newMessage.trim() && !sending ? 'pointer' : 'not-allowed',
              flexShrink: 0,
              transition: 'all 0.2s ease',
            }}
          >
            {sending ? (
              <div style={{
                width: 16,
                height: 16,
                border: `2px solid ${C.white}`,
                borderTop: `2px solid transparent`,
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite',
              }} />
            ) : (
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22,2 15,22 11,13 2,9" />
              </svg>
            )}
            </button>
          </div>
        </div>
    </div>
  );
};

export default DriverSupportChat;


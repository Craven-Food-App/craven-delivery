import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, Headphones, MoreVertical, Paperclip, Smile, Phone, Video, Archive, Flag, Clock, Check, CheckCheck, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Message {
  id: string;
  content: string;
  sender_type: 'customer' | 'driver' | 'admin' | 'ai';
  created_at: string;
  sender_id?: string;
  is_read?: boolean;
  message_type?: 'text' | 'image' | 'file' | 'location' | 'system';
  metadata?: any;
}

interface Conversation {
  id: string;
  type: 'customer_driver' | 'customer_support' | 'driver_support';
  status: 'active' | 'closed' | 'archived';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  subject?: string;
}

interface ChatInterfaceProps {
  conversationId?: string;
  conversationType: 'customer_driver' | 'customer_support' | 'driver_support';
  currentUserType: 'customer' | 'driver' | 'admin';
  onClose?: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  conversationId,
  conversationType,
  currentUserType,
  onClose
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      // Broadcast typing status
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: { user: currentUserType, conversationId }
        });
      }
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'stop_typing',
          payload: { user: currentUserType, conversationId }
        });
      }
    }, 1000);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Check URL for conversation ID first
    const urlParams = new URLSearchParams(window.location.search);
    const urlConversationId = urlParams.get('chat');
    
    if (conversationId || urlConversationId) {
      // Load and subscribe using provided or URL conversationId
      loadConversationById(conversationId || urlConversationId!);
    } else if (!initializedRef.current && conversationType.includes('support')) {
      // Create a new support conversation once
      initializedRef.current = true;
      createSupportConversation();
    }
  }, [conversationId, conversationType]);


  const loadConversationById = async (id: string) => {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error loading conversation:', error);
      return;
    }

    setConversation(data as Conversation);
    // After setting, load messages and subscribe
    await loadMessagesById(id);
    subscribeToMessagesById(id);
  };

  const loadMessagesById = async (id: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data as Message[]);
  };

  const subscribeToMessagesById = (id: string) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`chat_messages_${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          console.log('New message received via subscription:', newMessage);
          
          // Only add message if it's not a temporary optimistic message
          setMessages(prev => {
            const hasMessage = prev.some(msg => msg.id === newMessage.id);
            if (hasMessage) return prev;
            
            // Remove any temporary messages from the same sender if this is the real message
            const filteredPrev = prev.filter(msg => 
              !msg.id.startsWith('temp-') || 
              msg.sender_type !== newMessage.sender_type ||
              Math.abs(new Date(msg.created_at).getTime() - new Date(newMessage.created_at).getTime()) > 5000
            );
            
            return [...filteredPrev, newMessage];
          });
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status, 'for conversation:', id);
      });

    channelRef.current = channel;
  };
  const createSupportConversation = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const conversationData = {
      type: conversationType,
      status: 'active' as const,
      priority: 'normal' as const,
      subject: conversationType === 'customer_support' ? 'Customer Support Request' : 'Driver Support Request',
      ...(currentUserType === 'customer' && { customer_id: user.id }),
      ...(currentUserType === 'driver' && { driver_id: user.id }),
    };

    const { data, error } = await supabase
      .from('chat_conversations')
      .insert(conversationData)
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive",
      });
      return;
    }

    setConversation(data as Conversation);
    window.history.replaceState(null, '', `?chat=${data.id}`);
    // Load messages and subscribe after creating conversation
    await loadMessagesById(data.id);
    subscribeToMessagesById(data.id);
  };

  const loadMessages = async () => {
    if (!conversationId) return;

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
  };

  const subscribeToMessages = () => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat_messages_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversation || sendingMessage) return;

    const messageContent = newMessage.trim();
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      sender_type: currentUserType,
      created_at: new Date().toISOString(),
      sender_id: undefined,
      is_read: false
    };
    
    // Optimistically add message to UI
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    setSendingMessage(true);
    setLoading(true);

    console.log('Sending message:', messageContent, 'to conversation:', conversation.id);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create the message
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          sender_type: currentUserType,
          content: messageContent,
          message_type: 'text'
        });

      if (error) throw error;

      // Check if user is asking for representative and escalate
      const needsRepresentative = messageContent.toLowerCase().includes('representative') || 
                                 messageContent.toLowerCase().includes('human') ||
                                 messageContent.toLowerCase().includes('agent') ||
                                 messageContent.toLowerCase().includes('speak to someone') ||
                                 messageContent.toLowerCase().includes('talk to someone');

      if (needsRepresentative && conversationType === 'customer_support') {
        await supabase
          .from('chat_conversations')
          .update({ 
            priority: 'high',
            status: 'active',
            subject: 'Customer requesting representative - URGENT'
          })
          .eq('id', conversation.id);

        // Add escalation message
        await supabase
          .from('chat_messages')
          .insert({
            conversation_id: conversation.id,
            sender_type: 'ai',
            content: 'Your request has been escalated to our support team. A representative will assist you shortly.',
            message_type: 'text'
          });

        toast({
          title: "Escalated to representative",
          description: "Your request has been escalated to a human representative. They will respond shortly.",
        });
      }

      // Trigger AI response for support conversations (unless escalated)
      if (conversationType === 'customer_support' && currentUserType === 'customer' && !needsRepresentative) {
        try {
          console.log('Calling AI chat support function...');
          const { data: functionResponse, error: functionError } = await supabase.functions.invoke('ai-chat-support', {
            body: {
              message: messageContent,
              conversationId: conversation.id,
              userId: user.id
            }
          });
          
          if (functionError) {
            console.error('AI function error:', functionError);
          } else {
            console.log('AI function response:', functionResponse);
          }
        } catch (aiError) {
          console.error('AI response error:', aiError);
          // Show fallback message if AI fails
          setTimeout(async () => {
            await supabase
              .from('chat_messages')
              .insert({
                conversation_id: conversation.id,
                sender_id: null,
                sender_type: 'ai',
                content: "I'm having trouble processing your request right now. Please try again or ask to speak to a representative for immediate assistance.",
                message_type: 'text'
              });
          }, 1000);
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setSendingMessage(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getSenderIcon = (senderType: string) => {
    switch (senderType) {
      case 'ai':
        return <Bot className="h-4 w-4" />;
      case 'admin':
        return <Headphones className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getSenderName = (senderType: string) => {
    switch (senderType) {
      case 'ai':
        return 'Crave\'n Assistant';
      case 'admin':
        return 'Support Agent';
      case 'customer':
        return 'Customer';
      case 'driver':
        return 'Driver';
      default:
        return 'User';
    }
  };

  const getMessageStatus = (message: Message) => {
    if (message.sender_type !== currentUserType) return null;
    
    if (sendingMessage && message.id.startsWith('temp-')) {
      return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
    }
    
    if (message.is_read) {
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    }
    
    return <Check className="h-3 w-3 text-muted-foreground" />;
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        console.log('Cleaning up chat subscription');
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  if (!conversation) {
    return (
      <Card className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Starting conversation...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Modern Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            {getSenderIcon(conversationType.includes('support') ? 'admin' : 'customer')}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{conversation.subject || 'Chat Support'}</h3>
            <div className="flex items-center gap-2 text-sm text-blue-100">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Online</span>
              {conversation.priority !== 'normal' && (
                <Badge variant={conversation.priority === 'urgent' ? 'destructive' : 'default'} className="text-xs">
                  {conversation.priority.toUpperCase()}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
            <Video className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Archive className="h-4 w-4 mr-2" />
                Archive Chat
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Flag className="h-4 w-4 mr-2" />
                Flag Conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20">
              ✕
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 bg-gray-50">
        <div className="p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.sender_type === currentUserType ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className={`${
                  message.sender_type === currentUserType 
                    ? 'bg-blue-500 text-white' 
                    : message.sender_type === 'ai'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-500 text-white'
                }`}>
                  {getSenderIcon(message.sender_type)}
                </AvatarFallback>
              </Avatar>
              <div className={`max-w-[70%] ${message.sender_type === currentUserType ? 'flex flex-col items-end' : ''}`}>
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    message.sender_type === currentUserType
                      ? 'bg-blue-500 text-white rounded-br-md'
                      : message.sender_type === 'ai'
                      ? 'bg-white border border-purple-200 text-gray-800 rounded-bl-md'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                <div className={`flex items-center gap-1 mt-1 text-xs text-gray-500 ${
                  message.sender_type === currentUserType ? 'flex-row-reverse' : ''
                }`}>
                  <span>{formatMessageTime(message.created_at)}</span>
                  {getMessageStatus(message)}
                </div>
              </div>
            </div>
          ))}
          
          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gray-500 text-white">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-1">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-xs text-gray-500 ml-2">typing...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Enhanced Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={loading || conversation.status !== 'active'}
              className="pr-20 rounded-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="h-6 w-6 p-0 hover:bg-gray-100"
              >
                <Smile className="h-4 w-4 text-gray-500" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-gray-100"
              >
                <Paperclip className="h-4 w-4 text-gray-500" />
              </Button>
            </div>
          </div>
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() || loading || conversation.status !== 'active' || sendingMessage}
            className="rounded-full bg-blue-500 hover:bg-blue-600 text-white px-6"
          >
            {sendingMessage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
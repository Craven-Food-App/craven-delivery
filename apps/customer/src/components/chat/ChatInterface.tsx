import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, Headphones, MoreVertical, Paperclip, Phone, Archive, Flag, Clock, Check, CheckCheck, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  image_url?: string;
}

interface Conversation {
  id: string;
  type: 'customer_driver' | 'customer_support' | 'driver_support';
  status: 'active' | 'closed' | 'archived';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  subject?: string;
  driver_id?: string;
  order_id?: string;
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
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    
    // Fetch phone number based on conversation type
    await fetchPhoneNumber(data as Conversation);
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
    
    // Fetch phone number based on conversation type
    await fetchPhoneNumber(data as Conversation);
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
      return <CheckCheck className="h-3 w-3" style={{ color: '#ff6b35' }} />;
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

  const fetchPhoneNumber = async (conv: Conversation) => {
    try {
      if (conv.type === 'customer_support') {
        // Customer service phone number - use environment variable or default
        const supportPhone = import.meta.env.VITE_CUSTOMER_SERVICE_PHONE || '1-800-CRAVEN';
        setPhoneNumber(supportPhone);
      } else if (conv.type === 'customer_driver' && conv.driver_id) {
        // Get driver phone from user_profiles
        const { data: userProfile, error } = await supabase
          .from('user_profiles')
          .select('phone')
          .eq('user_id', conv.driver_id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching driver phone:', error);
        } else if (userProfile?.phone) {
          setPhoneNumber(userProfile.phone);
        }
      }
    } catch (error) {
      console.error('Error fetching phone number:', error);
    }
  };

  const handleCall = () => {
    if (!phoneNumber) {
      toast({
        title: "Phone number unavailable",
        description: "Phone number is not available for this contact.",
        variant: "destructive",
      });
      return;
    }

    // Use tel: protocol to initiate phone call
    window.location.href = `tel:${phoneNumber}`;
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversation) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);
    setSendingMessage(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create unique filename
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `chat/${conversation.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase Storage (using chat-images bucket or create if needed)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (uploadError) {
        // If bucket doesn't exist, try creating message with base64 or show error
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chat-images')
        .getPublicUrl(uploadData.path);

      const imageUrl = urlData.publicUrl;

      // Create message with image
      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          sender_type: currentUserType,
          content: '📷 Photo',
          message_type: 'image',
          metadata: { image_url: imageUrl, file_name: file.name }
        });

      if (messageError) throw messageError;

      toast({
        title: "Photo sent",
        description: "Your photo has been sent successfully.",
      });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
      setSendingMessage(false);
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
      <div className="flex items-center justify-center" style={{ minHeight: '100vh', width: '100%' }}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: '#ff6b35' }} />
          <p className="text-gray-600">Starting conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Modern Header */}
      <div className="flex items-center justify-between p-4 text-white" style={{ background: 'linear-gradient(to right, #ff6b35, #b91c1c)', flexShrink: 0 }}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {onClose && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose} 
              className="text-white hover:bg-white/20 flex-shrink-0"
              style={{ padding: '8px' }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
            {getSenderIcon(conversationType.includes('support') ? 'admin' : 'customer')}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{conversation.subject || (conversationType === 'customer_driver' ? 'Chat with Driver' : 'Customer Support')}</h3>
            <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
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
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-white/20"
            onClick={handleCall}
            disabled={!phoneNumber}
          >
            <Phone className="h-4 w-4" />
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
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 bg-gray-50" style={{ flex: 1, minHeight: 0 }}>
        <div className="p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.sender_type === currentUserType ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback 
                  className="text-white"
                  style={{
                    backgroundColor: message.sender_type === currentUserType 
                      ? '#ff6b35' 
                      : message.sender_type === 'ai'
                      ? '#8b5cf6'
                      : '#6b7280'
                  }}
                >
                  {getSenderIcon(message.sender_type)}
                </AvatarFallback>
              </Avatar>
              <div className={`max-w-[70%] ${message.sender_type === currentUserType ? 'flex flex-col items-end' : ''}`}>
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    message.sender_type === currentUserType
                      ? 'text-white rounded-br-md'
                      : message.sender_type === 'ai'
                      ? 'bg-white border border-purple-200 text-gray-800 rounded-bl-md'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                  }`}
                  style={message.sender_type === currentUserType ? {
                    background: 'linear-gradient(to right, #ff6b35, #b91c1c)'
                  } : {}}
                >
                  {message.message_type === 'image' && (message.metadata?.image_url || message.image_url) ? (
                    <div className="space-y-2">
                      <img
                        src={message.metadata?.image_url || message.image_url}
                        alt="Shared photo"
                        className="max-w-full rounded-lg"
                        style={{ maxWidth: '300px', maxHeight: '400px', objectFit: 'contain' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      {message.content && message.content !== '📷 Photo' && (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
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
      <div className="p-4 bg-white border-t border-gray-200" style={{ flexShrink: 0, paddingBottom: `calc(1rem + env(safe-area-inset-bottom, 0px))` }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageSelect}
          style={{ display: 'none' }}
        />
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
              disabled={loading || conversation.status !== 'active' || uploadingImage}
              className="pr-20 rounded-full border-gray-300"
              style={{
                focusBorderColor: '#ff6b35',
                focusRingColor: '#ff6b35'
              }}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-gray-100"
                onClick={handleAttachmentClick}
                disabled={uploadingImage || conversation.status !== 'active'}
              >
                <Paperclip className="h-4 w-4 text-gray-500" />
              </Button>
            </div>
          </div>
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() || loading || conversation.status !== 'active' || sendingMessage || uploadingImage}
            className="rounded-full text-white px-6"
            style={{
              background: 'linear-gradient(to right, #ff6b35, #b91c1c)',
              border: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(to right, #ea580c, #991b1b)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(to right, #ff6b35, #b91c1c)';
            }}
          >
            {(sendingMessage || uploadingImage) ? (
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
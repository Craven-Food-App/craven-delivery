import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageCircle,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  MoreVertical,
  User,
  TrendingUp,
  Zap,
  Star,
  Phone,
  Power,
  PowerOff
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Chat {
  id: string;
  driver_id: string;
  agent_id: string | null;
  category: string;
  subject: string | null;
  status: 'open' | 'in_progress' | 'resolved' | 'escalated';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  first_response_time_seconds: number | null;
  resolution_time_seconds: number | null;
  agent_response_count: number;
  driver_response_count: number;
  satisfaction_rating: number | null;
  last_message_at: string;
  created_at: string;
  driver_profiles?: {
    full_name: string;
    phone: string;
  };
}

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_type: 'driver' | 'agent' | 'system';
  message_text: string;
  message_type: string;
  created_at: string;
  is_read: boolean;
}

interface QuickResponse {
  id: string;
  category: string;
  button_text: string;
  auto_message: string;
}

interface SessionStats {
  chatsHandled: number;
  avgResponseTime: number;
  satisfactionRating: number;
  activeChats: number;
}

export const DriverSupportDashboard = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [quickResponses, setQuickResponses] = useState<QuickResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isOnline, setIsOnline] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    chatsHandled: 0,
    avgResponseTime: 0,
    satisfactionRating: 5.0,
    activeChats: 0,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchChats();
    fetchQuickResponses();
    fetchSessionStats();
    setupRealtimeSubscription();

    // Setup notification sound
    audioRef.current = new Audio('/craven-notification.wav');
  }, []);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
      setupMessageSubscription(selectedChat.id);
    }
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChats = async () => {
    try {
      setLoading(true);
      
      console.log('Fetching driver support chats...');
      
      // Fetch chats first - cast to any to handle type mismatch
      const { data: chatsData, error: chatsError } = await supabase
        .from('driver_support_chats')
        .select('*')
        .order('last_message_at', { ascending: false }) as any;

      if (chatsError) {
        console.error('Error fetching chats:', chatsError);
        throw chatsError;
      }

      // If there are chats, fetch the driver profiles separately
      if (chatsData && chatsData.length > 0) {
        const driverIds = [...new Set(chatsData.map(chat => chat.driver_id))];
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, phone')
          .in('user_id', driverIds as string[]);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          // Continue without profiles rather than failing completely
        }

        // Create a map of driver profiles
        const profilesMap = new Map(
          (profilesData || []).map(profile => [profile.user_id, profile])
        );

        // Combine chats with driver profiles
        const transformedData = chatsData.map(chat => ({
          ...chat,
          driver_profiles: profilesMap.get(chat.driver_id) ? {
            full_name: profilesMap.get(chat.driver_id)?.full_name || 'Unknown Driver',
            phone: profilesMap.get(chat.driver_id)?.phone || ''
          } : {
            full_name: 'Unknown Driver',
            phone: ''
          }
        }));

        console.log('Transformed chats:', transformedData.length, 'chats found');
        setChats(transformedData);
      } else {
        console.log('No chats found');
        setChats([]);
      }
    } catch (error: any) {
      console.error('Error fetching chats:', error);
      toast.error(`Failed to load chats: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      const { data, error } = await supabase
        .from('driver_support_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true }) as any;

      if (error) throw error;
      setMessages((data as any) || []);

      // Mark messages as read
      await supabase
        .from('driver_support_messages')
        .update({ is_read: true })
        .eq('chat_id', chatId)
        .eq('sender_type', 'driver') as any;
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const fetchQuickResponses = async () => {
    try {
      const { data } = await supabase
        .from('chat_quick_responses')
        .select('*')
        .eq('is_active', true)
        .order('priority') as any;

      setQuickResponses((data as any) || []);
    } catch (error) {
      console.error('Error fetching quick responses:', error);
    }
  };

  const fetchSessionStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get chats handled today
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data: todayChats } = await supabase
        .from('driver_support_chats')
        .select('*')
        .eq('agent_id', user.id)
        .gte('created_at', startOfDay.toISOString()) as any;

      const { data: activeChats } = await supabase
        .from('driver_support_chats')
        .select('*')
        .eq('agent_id', user.id)
        .in('status', ['open', 'in_progress']) as any;

      const chatsHandled = todayChats?.length || 0;
      const avgResponseTime = todayChats?.reduce((acc, chat) => acc + (chat.first_response_time_seconds || 0), 0) / (chatsHandled || 1);
      const ratings = todayChats?.filter(c => c.satisfaction_rating).map(c => c.satisfaction_rating);
      const satisfactionRating = ratings?.length ? ratings.reduce((a, b) => a! + b!, 0)! / ratings.length : 5.0;

      setSessionStats({
        chatsHandled,
        avgResponseTime: Math.round(avgResponseTime),
        satisfactionRating: Number(satisfactionRating.toFixed(2)),
        activeChats: activeChats?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching session stats:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('driver-support-chats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_support_chats',
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            fetchChats();
            
            // Play notification sound for new chats
            if (payload.eventType === 'INSERT' && isOnline) {
              audioRef.current?.play().catch(() => {});
              toast.info('New driver support request', {
                description: 'A driver needs assistance',
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const setupMessageSubscription = (chatId: string) => {
    const channel = supabase
      .channel(`messages-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'driver_support_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => [...prev, newMessage]);
          
          // Play sound for driver messages
          if (newMessage.sender_type === 'driver' && isOnline) {
            audioRef.current?.play().catch(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async (text?: string) => {
    if (!selectedChat) return;
    const messageToSend = text || messageText.trim();
    if (!messageToSend) return;

    try {
      setSending(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Send message
      const { error: messageError } = await supabase
        .from('driver_support_messages')
        .insert({
          chat_id: selectedChat.id,
          sender_id: user.id,
          sender_type: 'agent',
          message_text: messageToSend,
          message_type: 'text',
        });

      if (messageError) throw messageError;

      // Update chat status and assign agent if not assigned
      const updates: any = {
        last_message_at: new Date().toISOString(),
        agent_response_count: selectedChat.agent_response_count + 1,
      };

      if (!selectedChat.agent_id) {
        updates.agent_id = user.id;
        updates.status = 'in_progress';
      }

      if (selectedChat.agent_response_count === 0 && selectedChat.created_at) {
        const responseTime = Math.floor((Date.now() - new Date(selectedChat.created_at).getTime()) / 1000);
        updates.first_response_time_seconds = responseTime;
      }

      const { error: updateError } = await supabase
        .from('driver_support_chats')
        .update(updates)
        .eq('id', selectedChat.id);

      if (updateError) throw updateError;

      setMessageText('');
      fetchChats();
      fetchSessionStats();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleQuickResponse = (response: QuickResponse) => {
    handleSendMessage(response.auto_message);
  };

  const handleClaimChat = async (chat: Chat) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('driver_support_chats')
        .update({
          agent_id: user.id,
          status: 'in_progress',
        })
        .eq('id', chat.id);

      if (error) throw error;

      toast.success('Chat claimed');
      setSelectedChat({ ...chat, agent_id: user.id, status: 'in_progress' });
      fetchChats();
      fetchSessionStats();
    } catch (error: any) {
      console.error('Error claiming chat:', error);
      toast.error('Failed to claim chat');
    }
  };

  const handleResolveChat = async () => {
    if (!selectedChat) return;

    try {
      const resolutionTime = Math.floor((Date.now() - new Date(selectedChat.created_at).getTime()) / 1000);

      const { error } = await supabase
        .from('driver_support_chats')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolution_time_seconds: resolutionTime,
        })
        .eq('id', selectedChat.id);

      if (error) throw error;

      toast.success('Chat resolved');
      setSelectedChat(null);
      fetchChats();
      fetchSessionStats();
    } catch (error: any) {
      console.error('Error resolving chat:', error);
      toast.error('Failed to resolve chat');
    }
  };

  const handleToggleOnline = () => {
    setIsOnline(!isOnline);
    toast.success(isOnline ? 'You are now offline' : 'You are now online');
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'order': return '📦';
      case 'earnings': return '💰';
      case 'app': return '🚗';
      case 'navigation': return '🗺️';
      case 'ratings': return '⭐';
      case 'general': return '📞';
      default: return '💬';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-300';
      case 'escalated': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'normal': return 'bg-blue-500';
      case 'low': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredChats = chats.filter(chat => {
    const matchesSearch = searchTerm === '' || 
      chat.driver_profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chat.subject?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || chat.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || chat.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const openChats = chats.filter(c => c.status === 'open').length;
  const inProgressChats = chats.filter(c => c.status === 'in_progress').length;

  return (
    <div className="h-[calc(100vh-200px)] flex gap-6">
      {/* Left Sidebar - Chat List */}
      <div className="w-96 flex flex-col gap-4">
        {/* Agent Status Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isOnline ? 'bg-gradient-to-br from-orange-500 to-red-500' : 'bg-gray-400'}`}>
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                </div>
                <div>
                  <p className="font-semibold">Support Agent</p>
                  <p className="text-sm text-gray-600">{isOnline ? 'Online' : 'Offline'}</p>
                </div>
              </div>
              <Button
                variant={isOnline ? 'destructive' : 'default'}
                size="sm"
                onClick={handleToggleOnline}
                className={isOnline ? '' : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'}
              >
                {isOnline ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
              </Button>
            </div>

            {/* Session Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{sessionStats.chatsHandled}</p>
                <p className="text-xs text-gray-600">Handled Today</p>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{sessionStats.activeChats}</p>
                <p className="text-xs text-gray-600">Active Chats</p>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-green-50 to-teal-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{sessionStats.avgResponseTime}s</p>
                <p className="text-xs text-gray-600">Avg Response</p>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg">
                <div className="flex items-center justify-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  <p className="text-2xl font-bold text-yellow-600">{sessionStats.satisfactionRating}</p>
                </div>
                <p className="text-xs text-gray-600">Satisfaction</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search chats..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status ({chats.length})</SelectItem>
                <SelectItem value="open">Open ({openChats})</SelectItem>
                <SelectItem value="in_progress">In Progress ({inProgressChats})</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="order">📦 Order Issues</SelectItem>
                <SelectItem value="earnings">💰 Earnings</SelectItem>
                <SelectItem value="app">🚗 App Issues</SelectItem>
                <SelectItem value="navigation">🗺️ Navigation</SelectItem>
                <SelectItem value="ratings">⭐ Ratings</SelectItem>
                <SelectItem value="general">📞 General</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Chat List */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Active Chats ({filteredChats.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-600px)]">
              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="animate-pulse">Loading chats...</div>
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No chats found</p>
                </div>
              ) : (
                filteredChats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedChat?.id === chat.id ? 'bg-orange-50 border-l-4 border-l-orange-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-semibold">
                          {chat.driver_profiles?.full_name?.charAt(0) || 'D'}
                        </div>
                        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getPriorityColor(chat.priority)}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-sm truncate">
                            {chat.driver_profiles?.full_name || 'Unknown Driver'}
                          </p>
                          <span className="text-xs text-gray-500">{formatTime(chat.last_message_at)}</span>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{getCategoryIcon(chat.category)}</span>
                          <Badge className={`text-xs ${getStatusColor(chat.status)}`}>
                            {chat.status.replace('_', ' ')}
                          </Badge>
                        </div>

                        <p className="text-xs text-gray-600 truncate">
                          {chat.subject || `${chat.category} support request`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Chat Interface */}
      <Card className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold text-lg">
                    {selectedChat.driver_profiles?.full_name?.charAt(0) || 'D'}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{selectedChat.driver_profiles?.full_name || 'Unknown Driver'}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xl">{getCategoryIcon(selectedChat.category)}</span>
                      <Badge className={`text-xs ${getStatusColor(selectedChat.status)}`}>
                        {selectedChat.status.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {selectedChat.driver_profiles?.phone}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedChat.status !== 'resolved' && (
                    <Button
                      onClick={handleResolveChat}
                      variant="outline"
                      size="sm"
                      className="border-green-500 text-green-600 hover:bg-green-50"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Resolve
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    <Phone className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Messages */}
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_type === 'driver' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                        message.sender_type === 'driver'
                          ? 'bg-white border border-gray-200 shadow-sm'
                          : 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.message_text}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.sender_type === 'driver' ? 'text-gray-500' : 'text-white/80'
                        }`}
                      >
                        {new Date(message.created_at).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Quick Responses */}
            {quickResponses.length > 0 && selectedChat.status !== 'resolved' && (
              <div className="px-6 py-3 border-t bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-semibold text-gray-700">Quick Responses</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {quickResponses
                    .filter(r => r.category === selectedChat.category || r.category === 'general')
                    .slice(0, 4)
                    .map((response) => (
                      <Button
                        key={response.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickResponse(response)}
                        className="text-xs"
                      >
                        {response.button_text}
                      </Button>
                    ))}
                </div>
              </div>
            )}

            {/* Message Input */}
            {selectedChat.status !== 'resolved' && (
              <div className="p-6 border-t bg-white">
                {!selectedChat.agent_id ? (
                  <Button
                    onClick={() => handleClaimChat(selectedChat)}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  >
                    Claim This Chat
                  </Button>
                ) : (
                  <div className="flex gap-3">
                    <Textarea
                      placeholder="Type your message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      rows={3}
                      className="resize-none"
                    />
                    <Button
                      onClick={() => handleSendMessage()}
                      disabled={sending || !messageText.trim()}
                      className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <MessageCircle className="h-20 w-20 mx-auto mb-4 opacity-20" />
              <h3 className="text-xl font-semibold mb-2">Select a Chat</h3>
              <p className="text-sm">Choose a conversation to start helping drivers</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};


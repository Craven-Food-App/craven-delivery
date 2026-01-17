import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import ChatInterface from '../chat/ChatInterface';
import { MessageCircle, Search, Filter, Clock, Users, AlertTriangle, TrendingUp, BarChart3, Phone, Video, Archive, Flag, MoreVertical, Star, Eye, MessageSquare, Zap } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Conversation {
  id: string;
  type: 'customer_driver' | 'customer_support' | 'driver_support';
  status: 'active' | 'closed' | 'archived';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  subject?: string;
  created_at: string;
  updated_at: string;
  customer_id?: string;
  driver_id?: string;
  admin_id?: string;
  message_count?: number;
  last_message?: string;
  last_message_time?: string;
  response_time?: number;
  satisfaction_rating?: number;
}

interface ChatAnalytics {
  totalConversations: number;
  activeConversations: number;
  avgResponseTime: number;
  satisfactionScore: number;
  conversationsByType: Record<string, number>;
  conversationsByPriority: Record<string, number>;
}

const ChatPortal: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<ChatAnalytics | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'analytics'>('list');
  const { toast } = useToast();

  useEffect(() => {
    loadConversations();
    loadAnalytics();
    subscribeToConversations();
  }, []);

  const loadConversations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } else {
      setConversations((data || []) as Conversation[]);
    }
    setLoading(false);
  };

  const loadAnalytics = async () => {
    try {
      // Calculate analytics from conversations
      const totalConversations = conversations.length;
      const activeConversations = conversations.filter(c => c.status === 'active').length;
      
      // Calculate average response time (mock data for now)
      const avgResponseTime = 2.5; // minutes
      
      // Calculate satisfaction score (mock data for now)
      const satisfactionScore = 4.2; // out of 5
      
      // Group by type
      const conversationsByType = conversations.reduce((acc, conv) => {
        acc[conv.type] = (acc[conv.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Group by priority
      const conversationsByPriority = conversations.reduce((acc, conv) => {
        acc[conv.priority] = (acc[conv.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      setAnalytics({
        totalConversations,
        activeConversations,
        avgResponseTime,
        satisfactionScore,
        conversationsByType,
        conversationsByPriority
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const subscribeToConversations = () => {
    const channel = supabase
      .channel('admin_chat_conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_conversations',
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const assignToSelf = async (conversationId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('chat_conversations')
      .update({ 
        admin_id: user.id,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (error) {
      console.error('Error assigning conversation:', error);
      toast({
        title: "Error",
        description: "Failed to assign conversation",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Conversation assigned to you",
      });
      loadConversations();
    }
  };

  const updateConversationStatus = async (conversationId: string, status: 'active' | 'closed' | 'archived') => {
    const { error } = await supabase
      .from('chat_conversations')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (error) {
      console.error('Error updating conversation status:', error);
      toast({
        title: "Error",
        description: "Failed to update conversation status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Conversation marked as ${status}`,
      });
      loadConversations();
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesFilter = filter === 'all' || conv.status === filter || conv.type === filter;
    const matchesSearch = search === '' || 
      (conv.subject?.toLowerCase().includes(search.toLowerCase())) ||
      conv.id.toLowerCase().includes(search.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'customer_support':
        return 'bg-blue-100 text-blue-800';
      case 'driver_support':
        return 'bg-green-100 text-green-800';
      case 'customer_driver':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (selectedConversation) {
    return (
      <div className="h-full">
        <div className="mb-4">
          <Button 
            variant="outline" 
            onClick={() => setSelectedConversation(null)}
          >
            ← Back to Chat Portal
          </Button>
        </div>
        <ChatInterface
          conversationId={selectedConversation}
          conversationType="customer_support"
          currentUserType="admin"
        />
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 rounded-xl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chat Management</h1>
            <p className="text-gray-600">Manage customer support conversations</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              onClick={() => setViewMode('list')}
              className="flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Conversations
            </Button>
            <Button
              variant={viewMode === 'analytics' ? 'default' : 'outline'}
              onClick={() => setViewMode('analytics')}
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
          </div>
        </div>
      </div>

      {viewMode === 'analytics' && analytics ? (
        <div className="p-6">
          {/* Analytics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Conversations</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.totalConversations}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Conversations</p>
                  <p className="text-2xl font-bold text-green-600">{analytics.activeConversations}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Zap className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                  <p className="text-2xl font-bold text-orange-600">{analytics.avgResponseTime}m</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Satisfaction Score</p>
                  <p className="text-2xl font-bold text-purple-600">{analytics.satisfactionScore}/5</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Star className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Conversations by Type</h3>
              <div className="space-y-3">
                {Object.entries(analytics.conversationsByType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{type.replace('_', ' ')}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${(count / analytics.totalConversations) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Conversations by Priority</h3>
              <div className="space-y-3">
                {Object.entries(analytics.conversationsByPriority).map(([priority, count]) => (
                  <div key={priority} className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{priority}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            priority === 'urgent' ? 'bg-red-500' :
                            priority === 'high' ? 'bg-orange-500' :
                            priority === 'normal' ? 'bg-blue-500' : 'bg-gray-500'
                          }`}
                          style={{ width: `${(count / analytics.totalConversations) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <div className="p-6">
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Conversations</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conversations List */}
          <div className="space-y-4">
            {filteredConversations.map((conversation) => (
              <Card key={conversation.id} className="hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-blue-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          <MessageCircle className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{conversation.subject || 'Chat Conversation'}</h3>
                          <Badge className={getTypeColor(conversation.type)}>
                            {conversation.type.replace('_', ' ')}
                          </Badge>
                          <Badge className={getPriorityColor(conversation.priority)}>
                            {conversation.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {new Date(conversation.updated_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4" />
                            {conversation.message_count || 0} messages
                          </span>
                          {conversation.satisfaction_rating && (
                            <span className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500" />
                              {conversation.satisfaction_rating}/5
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => assignToSelf(conversation.id)}>
                            <Users className="h-4 w-4 mr-2" />
                            Assign to Me
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Flag className="h-4 w-4 mr-2" />
                            Flag
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        onClick={() => setSelectedConversation(conversation.id)}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Chat
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPortal;
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { MessageSquare, Clock, CheckCircle, XCircle, AlertTriangle, User, Search, Filter, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Ticket {
  id: string;
  ticket_number: string;
  customer_id: string;
  subject: string;
  description: string;
  category: 'order_issue' | 'account' | 'payment' | 'technical' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  customer_email?: string;
  customer_name?: string;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_type: 'customer' | 'admin';
  sender_id: string;
  message: string;
  created_at: string;
}

export const SupportTickets: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [messages, setMessages] = useState<Record<string, TicketMessage[]>>({});
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchTickets();
    subscribeToTickets();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      fetchTicketMessages(selectedTicket.id);
    }
  }, [selectedTicket]);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch customer details separately (without email since we don't have admin API)
      const formattedTickets = await Promise.all(
        (data || []).map(async (ticket: any) => {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('full_name')
            .eq('user_id', ticket.customer_id)
            .maybeSingle();
          
          return {
            ...ticket,
            customer_email: ticket.customer_id.substring(0, 8) + '...', // Show partial ID
            customer_name: profile?.full_name || 'Customer'
          };
        })
      );

      setTickets(formattedTickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: 'Error loading tickets',
        description: 'Failed to load support tickets',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(prev => ({ ...prev, [ticketId]: data || [] }));
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const subscribeToTickets = () => {
    const channel = supabase
      .channel('tickets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets'
        },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      
      if (newStatus === 'resolved' || newStatus === 'closed') {
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Status updated',
        description: `Ticket status changed to ${newStatus}`
      });

      fetchTickets();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error updating status',
        description: 'Failed to update ticket status',
        variant: 'destructive'
      });
    }
  };

  const handleSendMessage = async (ticketId: string) => {
    if (!newMessage.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          sender_type: 'admin',
          sender_id: user.id,
          message: newMessage.trim()
        });

      if (error) throw error;

      // Update ticket status to in_progress if it was open
      if (selectedTicket?.status === 'open') {
        await handleUpdateStatus(ticketId, 'in_progress');
      }

      setNewMessage('');
      fetchTicketMessages(ticketId);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error sending message',
        description: 'Failed to send message',
        variant: 'destructive'
      });
    }
  };

  const handleAssignToSelf = async (ticketId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('support_tickets')
        .update({
          assigned_to: user.id,
          status: 'in_progress'
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Ticket assigned',
        description: 'Ticket has been assigned to you'
      });

      fetchTickets();
    } catch (error) {
      console.error('Error assigning ticket:', error);
      toast({
        title: 'Error assigning ticket',
        description: 'Failed to assign ticket',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      open: { variant: 'destructive', icon: AlertTriangle },
      in_progress: { variant: 'default', icon: Clock },
      waiting_customer: { variant: 'secondary', icon: MessageSquare },
      resolved: { variant: 'default', icon: CheckCircle },
      closed: { variant: 'outline', icon: XCircle }
    };

    const config = variants[status] || variants.open;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={colors[priority] || colors.medium}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = searchTerm === '' ||
      ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.customer_email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || ticket.priority === filterPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const openTickets = tickets.filter(t => t.status === 'open');
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress');
  const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');
  const urgentTickets = tickets.filter(t => t.priority === 'urgent' && t.status !== 'resolved' && t.status !== 'closed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold">Support Tickets</h2>
        <p className="text-muted-foreground">Manage customer support requests and inquiries</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Open Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{openTickets.length}</div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{inProgressTickets.length}</div>
            <p className="text-xs text-muted-foreground">Being worked on</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{resolvedTickets.length}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Urgent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{urgentTickets.length}</div>
            <p className="text-xs text-muted-foreground">High priority</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="waiting_customer">Waiting Customer</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={fetchTickets} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {filteredTickets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No tickets found</p>
            </CardContent>
          </Card>
        ) : (
          filteredTickets.map((ticket) => (
            <Card key={ticket.id} className="border">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-muted-foreground">
                        #{ticket.ticket_number}
                      </span>
                      {getStatusBadge(ticket.status)}
                      {getPriorityBadge(ticket.priority)}
                      <Badge variant="outline">{ticket.category}</Badge>
                    </div>

                    <h4 className="font-semibold text-lg">{ticket.subject}</h4>

                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {ticket.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {ticket.customer_name || ticket.customer_email}
                      </div>
                      <div>
                        Created {format(new Date(ticket.created_at), 'MMM dd, yyyy')}
                      </div>
                    </div>
                  </div>

                  <div className="ml-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button onClick={() => setSelectedTicket(ticket)}>
                          View Ticket
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Ticket #{ticket.ticket_number}</DialogTitle>
                          <DialogDescription>{ticket.subject}</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6">
                          {/* Ticket Info */}
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Status</Label>
                                <div className="mt-1">{getStatusBadge(ticket.status)}</div>
                              </div>
                              <div>
                                <Label>Priority</Label>
                                <div className="mt-1">{getPriorityBadge(ticket.priority)}</div>
                              </div>
                              <div>
                                <Label>Customer</Label>
                                <p className="text-sm mt-1">{ticket.customer_name}</p>
                                <p className="text-xs text-muted-foreground">{ticket.customer_email}</p>
                              </div>
                              <div>
                                <Label>Category</Label>
                                <p className="text-sm mt-1 capitalize">{ticket.category.replace('_', ' ')}</p>
                              </div>
                            </div>

                            <div>
                              <Label>Description</Label>
                              <p className="text-sm mt-1">{ticket.description}</p>
                            </div>
                          </div>

                          {/* Messages */}
                          <div>
                            <Label>Conversation</Label>
                            <div className="mt-2 space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                              {(messages[ticket.id] || []).map((msg) => (
                                <div
                                  key={msg.id}
                                  className={`p-3 rounded-md ${
                                    msg.sender_type === 'admin'
                                      ? 'bg-blue-50 ml-8'
                                      : 'bg-gray-50 mr-8'
                                  }`}
                                >
                                  <div className="text-xs text-muted-foreground mb-1">
                                    {msg.sender_type === 'admin' ? 'Support Team' : 'Customer'} •{' '}
                                    {format(new Date(msg.created_at), 'PPp')}
                                  </div>
                                  <p className="text-sm">{msg.message}</p>
                                </div>
                              ))}
                            </div>

                            {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                              <div className="mt-2 space-y-2">
                                <Textarea
                                  placeholder="Type your response..."
                                  value={newMessage}
                                  onChange={(e) => setNewMessage(e.target.value)}
                                  rows={3}
                                />
                                <Button
                                  onClick={() => handleSendMessage(ticket.id)}
                                  className="w-full"
                                >
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Send Message
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-3">
                            {ticket.status === 'open' && !ticket.assigned_to && (
                              <Button
                                variant="outline"
                                onClick={() => handleAssignToSelf(ticket.id)}
                                className="flex-1"
                              >
                                Assign to Me
                              </Button>
                            )}
                            {ticket.status === 'in_progress' && (
                              <Button
                                variant="outline"
                                onClick={() => handleUpdateStatus(ticket.id, 'waiting_customer')}
                                className="flex-1"
                              >
                                Waiting for Customer
                              </Button>
                            )}
                            {(ticket.status === 'in_progress' || ticket.status === 'waiting_customer') && (
                              <Button
                                onClick={() => handleUpdateStatus(ticket.id, 'resolved')}
                                className="flex-1"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Mark as Resolved
                              </Button>
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default SupportTickets;

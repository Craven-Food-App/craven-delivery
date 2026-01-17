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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle, XCircle, Clock, MessageSquare, Image, FileText, User, Store, Car, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Dispute {
  id: string;
  order_id: string;
  dispute_type: 'order_issue' | 'delivery_issue' | 'payment_issue' | 'quality_issue' | 'missing_items' | 'wrong_order' | 'late_delivery' | 'other';
  reported_by: 'customer' | 'driver' | 'restaurant';
  reporter_id: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  resolution?: string;
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
  evidence?: any[];
  orders?: {
    order_number: string;
    customer_name: string;
    total_cents: number;
  };
}

interface DisputeMessage {
  id: string;
  dispute_id: string;
  sender_type: 'admin' | 'customer' | 'driver' | 'restaurant';
  sender_id: string;
  message: string;
  created_at: string;
}

export const DisputeResolution: React.FC = () => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [messages, setMessages] = useState<Record<string, DisputeMessage[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchDisputes();
    subscribeToDisputes();
  }, []);

  useEffect(() => {
    if (selectedDispute) {
      fetchDisputeMessages(selectedDispute.id);
    }
  }, [selectedDispute]);

  const fetchDisputes = async () => {
    try {
      const { data, error } = await supabase
        .from('disputes')
        .select(`
          *,
          orders (
            order_number,
            customer_name,
            total_cents
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDisputes(data || []);
    } catch (error) {
      console.error('Error fetching disputes:', error);
      toast({
        title: 'Error loading disputes',
        description: 'Failed to load dispute data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDisputeMessages = async (disputeId: string) => {
    try {
      const { data, error } = await supabase
        .from('dispute_messages')
        .select('*')
        .eq('dispute_id', disputeId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(prev => ({ ...prev, [disputeId]: data || [] }));
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const subscribeToDisputes = () => {
    const channel = supabase
      .channel('disputes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'disputes'
        },
        () => {
          fetchDisputes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleUpdateStatus = async (disputeId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('disputes')
        .update({ status: newStatus })
        .eq('id', disputeId);

      if (error) throw error;

      toast({
        title: 'Status updated',
        description: `Dispute status changed to ${newStatus}`
      });

      fetchDisputes();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error updating status',
        description: 'Failed to update dispute status',
        variant: 'destructive'
      });
    }
  };

  const handleResolveDispute = async (disputeId: string) => {
    if (!resolution.trim()) {
      toast({
        title: 'Resolution required',
        description: 'Please provide a resolution summary',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('disputes')
        .update({
          status: 'resolved',
          resolution: resolution.trim(),
          resolved_at: new Date().toISOString(),
          resolved_by: user.id
        })
        .eq('id', disputeId);

      if (error) throw error;

      // Create audit log
      await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        action: 'dispute_resolved',
        entity_type: 'dispute',
        entity_id: disputeId,
        details: { resolution: resolution.trim() }
      });

      toast({
        title: 'Dispute resolved',
        description: 'The dispute has been successfully resolved'
      });

      setSelectedDispute(null);
      setResolution('');
      fetchDisputes();
    } catch (error) {
      console.error('Error resolving dispute:', error);
      toast({
        title: 'Error resolving dispute',
        description: 'Failed to resolve the dispute',
        variant: 'destructive'
      });
    }
  };

  const handleSendMessage = async (disputeId: string) => {
    if (!newMessage.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('dispute_messages')
        .insert({
          dispute_id: disputeId,
          sender_type: 'admin',
          sender_id: user.id,
          message: newMessage.trim()
        });

      if (error) throw error;

      setNewMessage('');
      fetchDisputeMessages(disputeId);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error sending message',
        description: 'Failed to send message',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; color: string }> = {
      open: { variant: 'destructive', icon: AlertTriangle, color: 'text-red-600' },
      investigating: { variant: 'secondary', icon: Clock, color: 'text-yellow-600' },
      resolved: { variant: 'default', icon: CheckCircle, color: 'text-green-600' },
      closed: { variant: 'outline', icon: XCircle, color: 'text-gray-600' }
    };

    const config = variants[status] || variants.open;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
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

  const getReporterIcon = (reportedBy: string) => {
    const icons: Record<string, any> = {
      customer: User,
      driver: Car,
      restaurant: Store
    };

    const Icon = icons[reportedBy] || User;
    return <Icon className="h-4 w-4" />;
  };

  const filteredDisputes = disputes.filter(dispute => {
    const matchesSearch = searchTerm === '' || 
      dispute.orders?.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispute.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || dispute.status === filterStatus;
    const matchesType = filterType === 'all' || dispute.dispute_type === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const openDisputes = disputes.filter(d => d.status === 'open');
  const investigatingDisputes = disputes.filter(d => d.status === 'investigating');
  const resolvedDisputes = disputes.filter(d => d.status === 'resolved');
  const urgentDisputes = disputes.filter(d => d.priority === 'urgent' && d.status !== 'resolved');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold">Dispute Resolution</h2>
        <p className="text-muted-foreground">Manage and resolve customer, driver, and merchant disputes</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Open Disputes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{openDisputes.length}</div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Investigating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{investigatingDisputes.length}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
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
            <div className="text-2xl font-bold text-green-600">{resolvedDisputes.length}</div>
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
            <div className="text-2xl font-bold text-orange-600">{urgentDisputes.length}</div>
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
              placeholder="Search disputes..."
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
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="order_issue">Order Issue</SelectItem>
            <SelectItem value="delivery_issue">Delivery Issue</SelectItem>
            <SelectItem value="payment_issue">Payment Issue</SelectItem>
            <SelectItem value="quality_issue">Quality Issue</SelectItem>
            <SelectItem value="missing_items">Missing Items</SelectItem>
            <SelectItem value="wrong_order">Wrong Order</SelectItem>
            <SelectItem value="late_delivery">Late Delivery</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Disputes List */}
      <div className="space-y-4">
        {filteredDisputes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No disputes found</p>
            </CardContent>
          </Card>
        ) : (
          filteredDisputes.map((dispute) => (
            <Card key={dispute.id} className="border">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold">
                        Order #{dispute.orders?.order_number}
                      </h4>
                      {getStatusBadge(dispute.status)}
                      {getPriorityBadge(dispute.priority)}
                      <Badge variant="outline" className="flex items-center gap-1">
                        {getReporterIcon(dispute.reported_by)}
                        {dispute.reported_by.charAt(0).toUpperCase() + dispute.reported_by.slice(1)}
                      </Badge>
                    </div>

                    <div className="text-sm">
                      <span className="font-medium">Type:</span>
                      <span className="ml-2">
                        {dispute.dispute_type.split('_').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                      </span>
                    </div>

                    <div className="text-sm">
                      <span className="font-medium">Description:</span>
                      <p className="mt-1 text-muted-foreground">{dispute.description}</p>
                    </div>

                    {dispute.resolution && (
                      <div className="text-sm bg-green-50 border border-green-200 p-3 rounded-md">
                        <span className="font-medium text-green-800">Resolution:</span>
                        <p className="mt-1 text-green-700">{dispute.resolution}</p>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground">
                      Created {format(new Date(dispute.created_at), 'PPp')}
                    </div>
                  </div>

                  <div className="ml-4 flex flex-col gap-2">
                    {dispute.status !== 'resolved' && dispute.status !== 'closed' && (
                      <>
                        {dispute.status === 'open' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(dispute.id, 'investigating')}
                          >
                            Start Investigation
                          </Button>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              onClick={() => setSelectedDispute(dispute)}
                            >
                              {dispute.status === 'investigating' ? 'Resolve' : 'View Details'}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Dispute Details</DialogTitle>
                              <DialogDescription>
                                Order #{dispute.orders?.order_number} - {dispute.dispute_type}
                              </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6">
                              {/* Dispute Info */}
                              <div className="space-y-4">
                                <div>
                                  <Label>Description</Label>
                                  <p className="text-sm mt-1">{dispute.description}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Status</Label>
                                    <div className="mt-1">{getStatusBadge(dispute.status)}</div>
                                  </div>
                                  <div>
                                    <Label>Priority</Label>
                                    <div className="mt-1">{getPriorityBadge(dispute.priority)}</div>
                                  </div>
                                </div>
                              </div>

                              {/* Messages */}
                              <div>
                                <Label>Communication</Label>
                                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                                  {(messages[dispute.id] || []).map((msg) => (
                                    <div
                                      key={msg.id}
                                      className={`p-2 rounded-md ${
                                        msg.sender_type === 'admin'
                                          ? 'bg-blue-50 ml-8'
                                          : 'bg-gray-50 mr-8'
                                      }`}
                                    >
                                      <div className="text-xs text-muted-foreground mb-1">
                                        {msg.sender_type.charAt(0).toUpperCase() + msg.sender_type.slice(1)} •{' '}
                                        {format(new Date(msg.created_at), 'PPp')}
                                      </div>
                                      <p className="text-sm">{msg.message}</p>
                                    </div>
                                  ))}
                                </div>

                                <div className="mt-2 flex gap-2">
                                  <Input
                                    placeholder="Type a message..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage(dispute.id);
                                      }
                                    }}
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => handleSendMessage(dispute.id)}
                                  >
                                    <MessageSquare className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              {/* Resolution */}
                              {dispute.status !== 'resolved' && (
                                <div>
                                  <Label htmlFor="resolution">Resolution Summary</Label>
                                  <Textarea
                                    id="resolution"
                                    placeholder="Describe how this dispute was resolved..."
                                    value={resolution}
                                    onChange={(e) => setResolution(e.target.value)}
                                    rows={4}
                                  />
                                  <Button
                                    className="mt-3 w-full"
                                    onClick={() => handleResolveDispute(dispute.id)}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Mark as Resolved
                                  </Button>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </>
                    )}
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

export default DisputeResolution;

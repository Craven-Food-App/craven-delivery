/**
 * Push Notification Campaign Manager
 * Create, schedule, and track push notification campaigns
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Bell, Send, TrendingUp, Smartphone, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface PushCampaign {
  id: string;
  title: string;
  body: string;
  segmentId: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused';
  scheduledAt: string | null;
  sentCount: number;
  deliveryRate: number;
  clickRate: number;
  createdAt: string;
  data?: Record<string, any>;
}

const PushNotificationManager: React.FC = () => {
  const [campaigns, setCampaigns] = useState<PushCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    title: '',
    body: '',
    segmentId: 'all',
    scheduledAt: '',
    actionUrl: ''
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      // TODO: Create push_campaigns table
      // Mock data for now
      setCampaigns([
        {
          id: '1',
          title: 'New Restaurant Added!',
          body: 'Check out our newest restaurant partner',
          segmentId: 'all',
          status: 'sent',
          scheduledAt: null,
          sentCount: 8450,
          deliveryRate: 98.5,
          clickRate: 15.2,
          createdAt: new Date().toISOString()
        }
      ]);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.title || !newCampaign.body) return;

    const campaign: PushCampaign = {
      id: `push_${Date.now()}`,
      title: newCampaign.title,
      body: newCampaign.body,
      segmentId: newCampaign.segmentId,
      status: newCampaign.scheduledAt ? 'scheduled' : 'draft',
      scheduledAt: newCampaign.scheduledAt || null,
      sentCount: 0,
      deliveryRate: 0,
      clickRate: 0,
      createdAt: new Date().toISOString(),
      data: {
        url: newCampaign.actionUrl || '/'
      }
    };

    // TODO: Save to database
    setCampaigns([...campaigns, campaign]);
    setNewCampaign({ title: '', body: '', segmentId: 'all', scheduledAt: '', actionUrl: '' });
    setShowCreateModal(false);
  };

  const handleSendCampaign = async (campaign: PushCampaign) => {
    try {
      // Get all users in the segment
      let userIds: string[] = [];
      
      if (campaign.segmentId === 'all') {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id')
          .eq('role', 'customer');
        
        userIds = profiles?.map(p => p.user_id) || [];
      } else {
        // TODO: Get users from segment
        userIds = [];
      }

      // Send to each user via edge function
      const sendPromises = userIds.map(async (userId) => {
        const { error } = await supabase.functions.invoke('send-push-notification', {
          body: {
            userId,
            type: 'marketing_campaign',
            notification: {
              title: campaign.title,
              body: campaign.body,
              icon: '/logo.png',
              data: campaign.data || {}
            }
          }
        });
        
        if (error) {
          console.error(`Failed to send to user ${userId}:`, error);
        }
      });

      await Promise.all(sendPromises);
      
      // Update campaign status
      setCampaigns(prev => prev.map(c => 
        c.id === campaign.id 
          ? { ...c, status: 'sent' as const, sentCount: userIds.length }
          : c
      ));
    } catch (error) {
      console.error('Error sending campaign:', error);
    }
  };

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Push Notifications</h2>
          <p className="text-xs text-gray-500 mt-0.5">Create and send push notification campaigns</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} size="sm" className="h-7 px-2.5 text-xs bg-orange-500 hover:bg-orange-600">
          <Plus className="h-3 w-3 mr-1.5" />
          Create Campaign
        </Button>
      </div>

      {/* Compact Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Total Campaigns</p>
              <Bell className="h-3 w-3 text-orange-600" />
            </div>
            <p className="text-xl font-semibold text-gray-900 leading-tight">{campaigns.length}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Total Sent</p>
              <Send className="h-3 w-3 text-blue-600" />
            </div>
            <p className="text-xl font-semibold text-gray-900 leading-tight">
              {campaigns.reduce((sum, c) => sum + c.sentCount, 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Avg Delivery</p>
              <Smartphone className="h-3 w-3 text-green-600" />
            </div>
            <p className="text-xl font-semibold text-gray-900 leading-tight">
              {campaigns.length > 0
                ? (campaigns.reduce((sum, c) => sum + c.deliveryRate, 0) / campaigns.length).toFixed(1)
                : 0}%
            </p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Avg Click Rate</p>
              <TrendingUp className="h-3 w-3 text-purple-600" />
            </div>
            <p className="text-xl font-semibold text-gray-900 leading-tight">
              {campaigns.length > 0
                ? (campaigns.reduce((sum, c) => sum + c.clickRate, 0) / campaigns.length).toFixed(1)
                : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dense Campaigns Table */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="px-3 py-2 border-b border-gray-200 bg-[#fafbfc]">
          <CardTitle className="text-sm font-semibold">Campaigns</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Campaign</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Sent</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Delivery</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Click Rate</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2">
                      <div className="font-medium text-xs text-gray-900">{campaign.title}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{campaign.body}</div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge className={`text-[10px] px-1.5 py-0.5 font-medium border ${
                        campaign.status === 'sent' ? 'bg-green-50 text-green-700 border-green-200' :
                        campaign.status === 'scheduled' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        campaign.status === 'sending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>
                        {campaign.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-gray-700">{campaign.sentCount.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-xs font-semibold text-gray-900">{campaign.deliveryRate.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-right text-xs font-semibold text-gray-900">{campaign.clickRate.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-right">
                      {campaign.status === 'draft' && (
                        <Button size="sm" onClick={() => handleSendCampaign(campaign)} className="h-6 px-2 text-[10px] bg-orange-500 hover:bg-orange-600">
                          Send
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Campaign Modal - Compact */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Create Push Notification</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <div>
              <Label htmlFor="title" className="text-xs">Title *</Label>
              <Input
                id="title"
                value={newCampaign.title}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Notification title"
                className="mt-1 h-8 text-xs"
                maxLength={50}
              />
              <p className="text-[10px] text-gray-500 mt-0.5">{newCampaign.title.length}/50</p>
            </div>
            <div>
              <Label htmlFor="body" className="text-xs">Message *</Label>
              <Textarea
                id="body"
                value={newCampaign.body}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Notification message"
                className="mt-1 text-xs"
                rows={3}
                maxLength={150}
              />
              <p className="text-[10px] text-gray-500 mt-0.5">{newCampaign.body.length}/150</p>
            </div>
            <div>
              <Label htmlFor="segment" className="text-xs">Target Segment</Label>
              <Select
                value={newCampaign.segmentId}
                onValueChange={(value) => setNewCampaign(prev => ({ ...prev, segmentId: value }))}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="new_users">New Users</SelectItem>
                  <SelectItem value="active">Active Customers</SelectItem>
                  <SelectItem value="inactive">Inactive Customers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="actionUrl" className="text-xs">Action URL (when clicked)</Label>
              <Input
                id="actionUrl"
                value={newCampaign.actionUrl}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, actionUrl: e.target.value }))}
                placeholder="/restaurants or specific page"
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="scheduledAt" className="text-xs">Schedule (Optional)</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={newCampaign.scheduledAt}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, scheduledAt: e.target.value }))}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreateCampaign} size="sm" className="flex-1 h-8 text-xs bg-orange-500 hover:bg-orange-600">
                Create Campaign
              </Button>
              <Button variant="outline" onClick={() => setShowCreateModal(false)} size="sm" className="h-8 text-xs">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PushNotificationManager;

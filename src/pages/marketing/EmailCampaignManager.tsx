/**
 * Email Campaign Manager
 * Create, schedule, and track email marketing campaigns
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Mail, Send, Calendar, TrendingUp, Users, Eye } from 'lucide-react';
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

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  template: string;
  segmentId: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused';
  scheduledAt: string | null;
  sentCount: number;
  openRate: number;
  clickRate: number;
  createdAt: string;
}

const EmailCampaignManager: React.FC = () => {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    subject: '',
    template: '',
    segmentId: '',
    scheduledAt: ''
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      // TODO: Create email_campaigns table
      // Mock data for now
      setCampaigns([
        {
          id: '1',
          name: 'Welcome Email Series',
          subject: 'Welcome to Crave\'N Delivery!',
          template: 'welcome',
          segmentId: 'new_users',
          status: 'sent',
          scheduledAt: null,
          sentCount: 1250,
          openRate: 45.2,
          clickRate: 12.8,
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
    if (!newCampaign.name || !newCampaign.subject) return;

    const campaign: EmailCampaign = {
      id: `email_${Date.now()}`,
      name: newCampaign.name,
      subject: newCampaign.subject,
      template: newCampaign.template,
      segmentId: newCampaign.segmentId,
      status: newCampaign.scheduledAt ? 'scheduled' : 'draft',
      scheduledAt: newCampaign.scheduledAt || null,
      sentCount: 0,
      openRate: 0,
      clickRate: 0,
      createdAt: new Date().toISOString()
    };

    // TODO: Save to database
    setCampaigns([...campaigns, campaign]);
    setNewCampaign({ name: '', subject: '', template: '', segmentId: '', scheduledAt: '' });
    setShowCreateModal(false);
  };

  const handleSendCampaign = async (campaignId: string) => {
    // TODO: Integrate with send-customer-welcome-email or create send-email-campaign function
    console.log('Sending campaign:', campaignId);
  };

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Email Campaigns</h2>
          <p className="text-xs text-gray-500 mt-0.5">Create and manage email marketing campaigns</p>
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
              <Mail className="h-3 w-3 text-orange-600" />
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
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Avg Open Rate</p>
              <Eye className="h-3 w-3 text-green-600" />
            </div>
            <p className="text-xl font-semibold text-gray-900 leading-tight">
              {campaigns.length > 0
                ? (campaigns.reduce((sum, c) => sum + c.openRate, 0) / campaigns.length).toFixed(1)
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
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Campaign Name</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Subject</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Sent</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Open Rate</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Click Rate</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2">
                      <div className="font-medium text-xs text-gray-900">{campaign.name}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">{campaign.subject}</td>
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
                    <td className="px-3 py-2 text-right text-xs font-semibold text-gray-900">{campaign.openRate.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-right text-xs font-semibold text-gray-900">{campaign.clickRate.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setSelectedCampaign(campaign)} className="h-6 px-2 text-[10px]">
                          View
                        </Button>
                        {campaign.status === 'draft' && (
                          <Button size="sm" onClick={() => handleSendCampaign(campaign.id)} className="h-6 px-2 text-[10px] bg-orange-500 hover:bg-orange-600">
                            Send
                          </Button>
                        )}
                      </div>
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
            <DialogTitle className="text-base">Create Email Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <div>
              <Label htmlFor="campaignName" className="text-xs">Campaign Name *</Label>
              <Input
                id="campaignName"
                value={newCampaign.name}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Welcome Series"
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="subject" className="text-xs">Email Subject *</Label>
              <Input
                id="subject"
                value={newCampaign.subject}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Enter email subject line"
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="template" className="text-xs">Template</Label>
              <Select
                value={newCampaign.template}
                onValueChange={(value) => setNewCampaign(prev => ({ ...prev, template: value }))}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="welcome">Welcome Email</SelectItem>
                  <SelectItem value="promotional">Promotional</SelectItem>
                  <SelectItem value="newsletter">Newsletter</SelectItem>
                  <SelectItem value="abandoned_cart">Abandoned Cart</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="segment" className="text-xs">Target Segment</Label>
              <Select
                value={newCampaign.segmentId}
                onValueChange={(value) => setNewCampaign(prev => ({ ...prev, segmentId: value }))}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue placeholder="All customers" />
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

export default EmailCampaignManager;

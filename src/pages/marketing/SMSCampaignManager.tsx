/**
 * SMS Campaign Manager
 * Create and manage SMS marketing campaigns
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, MessageSquare, Send, TrendingUp, Phone } from 'lucide-react';
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

interface SMSCampaign {
  id: string;
  name: string;
  message: string;
  segmentId: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent';
  scheduledAt: string | null;
  sentCount: number;
  deliveryRate: number;
  createdAt: string;
}

const SMSCampaignManager: React.FC = () => {
  const [campaigns, setCampaigns] = useState<SMSCampaign[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    message: '',
    segmentId: 'all',
    scheduledAt: ''
  });

  const handleCreateCampaign = () => {
    if (!newCampaign.name || !newCampaign.message) return;

    const campaign: SMSCampaign = {
      id: `sms_${Date.now()}`,
      name: newCampaign.name,
      message: newCampaign.message,
      segmentId: newCampaign.segmentId,
      status: newCampaign.scheduledAt ? 'scheduled' : 'draft',
      scheduledAt: newCampaign.scheduledAt || null,
      sentCount: 0,
      deliveryRate: 0,
      createdAt: new Date().toISOString()
    };

    setCampaigns([...campaigns, campaign]);
    setNewCampaign({ name: '', message: '', segmentId: 'all', scheduledAt: '' });
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">SMS Campaigns</h2>
          <p className="text-xs text-gray-500 mt-0.5">Create and send SMS marketing messages</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} size="sm" className="h-7 px-2.5 text-xs bg-orange-500 hover:bg-orange-600">
          <Plus className="h-3 w-3 mr-1.5" />
          Create Campaign
        </Button>
      </div>

      {/* Compact Stats Cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Total Campaigns</p>
              <MessageSquare className="h-3 w-3 text-orange-600" />
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
              <Phone className="h-3 w-3 text-green-600" />
            </div>
            <p className="text-xl font-semibold text-gray-900 leading-tight">
              {campaigns.length > 0
                ? (campaigns.reduce((sum, c) => sum + c.deliveryRate, 0) / campaigns.length).toFixed(1)
                : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List or Empty State */}
      {campaigns.length === 0 ? (
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-10 w-10 mx-auto text-gray-400 mb-3" />
            <h3 className="text-sm font-semibold text-gray-900 mb-1">No SMS campaigns yet</h3>
            <p className="text-xs text-gray-600 mb-3">Create your first SMS campaign to reach customers directly</p>
            <Button onClick={() => setShowCreateModal(true)} size="sm" className="h-7 px-2.5 text-xs bg-orange-500 hover:bg-orange-600">
              <Plus className="h-3 w-3 mr-1.5" />
              Create Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
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
                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2">
                        <div className="font-medium text-xs text-gray-900">{campaign.name}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{campaign.message.substring(0, 50)}...</div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge className={`text-[10px] px-1.5 py-0.5 font-medium border ${
                          campaign.status === 'sent' ? 'bg-green-50 text-green-700 border-green-200' :
                          campaign.status === 'scheduled' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                          {campaign.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-gray-700">{campaign.sentCount.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-xs font-semibold text-gray-900">{campaign.deliveryRate.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-right">
                        <Button variant="outline" size="sm" className="h-6 px-2 text-[10px]">
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Campaign Modal - Compact */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-base">Create SMS Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <div>
              <Label htmlFor="smsName" className="text-xs">Campaign Name *</Label>
              <Input
                id="smsName"
                value={newCampaign.name}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="smsMessage" className="text-xs">Message * (160 chars max)</Label>
              <Textarea
                id="smsMessage"
                value={newCampaign.message}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, message: e.target.value }))}
                className="mt-1 text-xs"
                rows={3}
                maxLength={160}
              />
              <p className="text-[10px] text-gray-500 mt-0.5">{newCampaign.message.length}/160</p>
            </div>
            <div>
              <Label htmlFor="smsSegment" className="text-xs">Target Segment</Label>
              <Select
                value={newCampaign.segmentId}
                onValueChange={(value) => setNewCampaign(prev => ({ ...prev, segmentId: value }))}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="active">Active Customers</SelectItem>
                </SelectContent>
              </Select>
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

export default SMSCampaignManager;

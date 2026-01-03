/**
 * Campaign Automation
 * Create automated campaigns with triggers and schedules
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Zap, Calendar, Clock, Target, Mail } from 'lucide-react';
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

interface Automation {
  id: string;
  name: string;
  trigger: string;
  action: string;
  status: 'active' | 'paused';
  runsCount: number;
  createdAt: string;
}

const CampaignAutomation: React.FC = () => {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAutomation, setNewAutomation] = useState({
    name: '',
    trigger: '',
    action: '',
    segmentId: ''
  });

  const triggers = [
    { value: 'new_signup', label: 'New User Signup' },
    { value: 'first_order', label: 'First Order Placed' },
    { value: 'inactive_30', label: 'Inactive for 30 Days' },
    { value: 'abandoned_cart', label: 'Abandoned Cart' },
    { value: 'order_completed', label: 'Order Completed' },
    { value: 'birthday', label: 'Customer Birthday' },
    { value: 'holiday', label: 'Holiday' },
  ];

  const actions = [
    { value: 'send_email', label: 'Send Email' },
    { value: 'send_push', label: 'Send Push Notification' },
    { value: 'send_sms', label: 'Send SMS' },
    { value: 'apply_promo', label: 'Apply Promo Code' },
    { value: 'add_loyalty_points', label: 'Add Loyalty Points' },
  ];

  const handleCreateAutomation = () => {
    if (!newAutomation.name || !newAutomation.trigger || !newAutomation.action) return;

    const automation: Automation = {
      id: `auto_${Date.now()}`,
      name: newAutomation.name,
      trigger: newAutomation.trigger,
      action: newAutomation.action,
      status: 'active',
      runsCount: 0,
      createdAt: new Date().toISOString()
    };

    setAutomations([...automations, automation]);
    setNewAutomation({ name: '', trigger: '', action: '', segmentId: '' });
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Campaign Automation</h2>
          <p className="text-xs text-gray-500 mt-0.5">Create automated marketing campaigns with triggers</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} size="sm" className="h-7 px-2.5 text-xs bg-orange-500 hover:bg-orange-600">
          <Plus className="h-3 w-3 mr-1.5" />
          Create Automation
        </Button>
      </div>

      {/* Compact Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Active</p>
              <Zap className="h-3 w-3 text-orange-600" />
            </div>
            <p className="text-xl font-semibold text-gray-900 leading-tight">
              {automations.filter(a => a.status === 'active').length}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Total Runs</p>
              <Clock className="h-3 w-3 text-blue-600" />
            </div>
            <p className="text-xl font-semibold text-gray-900 leading-tight">
              {automations.reduce((sum, a) => sum + a.runsCount, 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Triggers</p>
              <Target className="h-3 w-3 text-green-600" />
            </div>
            <p className="text-xl font-semibold text-gray-900 leading-tight">{triggers.length}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Actions</p>
              <Mail className="h-3 w-3 text-purple-600" />
            </div>
            <p className="text-xl font-semibold text-gray-900 leading-tight">{actions.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Automations List - Dense */}
      {automations.length === 0 ? (
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-8 text-center">
            <Zap className="h-10 w-10 mx-auto text-gray-400 mb-3" />
            <h3 className="text-sm font-semibold text-gray-900 mb-1">No automations yet</h3>
            <p className="text-xs text-gray-600 mb-3">Create automated campaigns that trigger based on customer actions</p>
            <Button onClick={() => setShowCreateModal(true)} size="sm" className="h-7 px-2.5 text-xs bg-orange-500 hover:bg-orange-600">
              <Plus className="h-3 w-3 mr-1.5" />
              Create Automation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="px-3 py-2 border-b border-gray-200 bg-[#fafbfc]">
            <CardTitle className="text-sm font-semibold">Automations</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="space-y-2">
              {automations.map((automation) => (
                <div key={automation.id} className="flex items-center justify-between p-2.5 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 bg-orange-100 rounded-md flex items-center justify-center flex-shrink-0">
                      <Zap className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-xs text-gray-900 truncate">{automation.name}</h4>
                      <p className="text-[10px] text-gray-600 mt-0.5">
                        When: {triggers.find(t => t.value === automation.trigger)?.label || automation.trigger} → 
                        Action: {actions.find(a => a.value === automation.action)?.label || automation.action}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Runs: {automation.runsCount} | Created: {new Date(automation.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`text-[10px] px-1.5 py-0.5 font-medium border ${
                      automation.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}>
                      {automation.status}
                    </Badge>
                    <Button variant="outline" size="sm" className="h-6 px-2 text-[10px]">Edit</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Automation Modal - Compact */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Create Automation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <div>
              <Label htmlFor="autoName" className="text-xs">Automation Name *</Label>
              <Input
                id="autoName"
                value={newAutomation.name}
                onChange={(e) => setNewAutomation(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Welcome New Users"
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="trigger" className="text-xs">Trigger *</Label>
              <Select
                value={newAutomation.trigger}
                onValueChange={(value) => setNewAutomation(prev => ({ ...prev, trigger: value }))}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue placeholder="Select trigger" />
                </SelectTrigger>
                <SelectContent>
                  {triggers.map(trigger => (
                    <SelectItem key={trigger.value} value={trigger.value}>{trigger.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="action" className="text-xs">Action *</Label>
              <Select
                value={newAutomation.action}
                onValueChange={(value) => setNewAutomation(prev => ({ ...prev, action: value }))}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  {actions.map(action => (
                    <SelectItem key={action.value} value={action.value}>{action.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="segment" className="text-xs">Target Segment (Optional)</Label>
              <Select
                value={newAutomation.segmentId}
                onValueChange={(value) => setNewAutomation(prev => ({ ...prev, segmentId: value }))}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue placeholder="All customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="new">New Customers</SelectItem>
                  <SelectItem value="active">Active Customers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreateAutomation} size="sm" className="flex-1 h-8 text-xs bg-orange-500 hover:bg-orange-600">
                Create Automation
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

export default CampaignAutomation;

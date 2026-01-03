/**
 * Admin Roles & Permissions
 * Manage marketing team access control
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, UserPlus, Users, CheckCircle, XCircle } from 'lucide-react';
import { subDays } from 'date-fns';
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

interface Role {
  id: string;
  name: string;
  permissions: string[];
  memberCount: number;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  lastActive: string;
}

const AdminRolesPermissions: React.FC = () => {
  const [roles] = useState<Role[]>([
    {
      id: 'marketing_manager',
      name: 'Marketing Manager',
      permissions: ['all'],
      memberCount: 2
    },
    {
      id: 'analyst',
      name: 'Marketing Analyst',
      permissions: ['view', 'analytics', 'export'],
      memberCount: 3
    },
    {
      id: 'content_creator',
      name: 'Content Creator',
      permissions: ['create', 'edit', 'view'],
      memberCount: 5
    },
    {
      id: 'campaign_manager',
      name: 'Campaign Manager',
      permissions: ['create', 'edit', 'publish', 'view'],
      memberCount: 4
    }
  ]);

  const [teamMembers] = useState<TeamMember[]>([
    {
      id: '1',
      name: 'John Doe',
      email: 'john@craven.com',
      role: 'Marketing Manager',
      lastActive: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@craven.com',
      role: 'Marketing Analyst',
      lastActive: subDays(new Date(), 2).toISOString()
    }
  ]);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    role: ''
  });

  const permissions = [
    { id: 'view', label: 'View' },
    { id: 'create', label: 'Create' },
    { id: 'edit', label: 'Edit' },
    { id: 'publish', label: 'Publish' },
    { id: 'delete', label: 'Delete' },
    { id: 'analytics', label: 'View Analytics' },
    { id: 'export', label: 'Export Data' },
    { id: 'manage_users', label: 'Manage Users' },
    { id: 'all', label: 'Full Access' }
  ];

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Admin Roles & Permissions</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage marketing team access and permissions</p>
        </div>
        <Button onClick={() => setShowInviteModal(true)} size="sm" className="h-7 px-2.5 text-xs bg-orange-500 hover:bg-orange-600">
          <UserPlus className="h-3 w-3 mr-1.5" />
          Invite Member
        </Button>
      </div>

      {/* Compact Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Team Members</p>
              <Users className="h-3 w-3 text-orange-600" />
            </div>
            <p className="text-xl font-semibold text-gray-900 leading-tight">{teamMembers.length}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Roles</p>
              <Shield className="h-3 w-3 text-blue-600" />
            </div>
            <p className="text-xl font-semibold text-gray-900 leading-tight">{roles.length}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Active Users</p>
              <CheckCircle className="h-3 w-3 text-green-600" />
            </div>
            <p className="text-xl font-semibold text-green-600 leading-tight">
              {teamMembers.filter(m => new Date(m.lastActive) > subDays(new Date(), 7)).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Roles - Compact */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="px-3 py-2 border-b border-gray-200 bg-[#fafbfc]">
          <CardTitle className="text-sm font-semibold">Roles & Permissions</CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-2">
          {roles.map((role) => (
            <div key={role.id} className="p-2.5 border border-gray-200 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-xs text-gray-900">{role.name}</h4>
                  <p className="text-[10px] text-gray-600">{role.memberCount} members</p>
                </div>
                <Button variant="outline" size="sm" className="h-6 px-2 text-[10px]">Edit Role</Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {role.permissions.includes('all') ? (
                  <Badge variant="default" className="bg-orange-600 text-[10px] px-1.5 py-0.5">Full Access</Badge>
                ) : (
                  role.permissions.map(perm => (
                    <Badge key={perm} variant="secondary" className="text-[10px] px-1.5 py-0.5">
                      {permissions.find(p => p.id === perm)?.label || perm}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Team Members - Dense Table */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="px-3 py-2 border-b border-gray-200 bg-[#fafbfc]">
          <CardTitle className="text-sm font-semibold">Team Members</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Member</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Email</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Role</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Last Active</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {teamMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Users className="h-3 w-3 text-orange-600" />
                        </div>
                        <div className="font-medium text-xs text-gray-900">{member.name}</div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">{member.email}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">{member.role}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {new Date(member.lastActive).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="outline" size="sm" className="h-6 px-2 text-[10px]">Manage</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Invite Modal - Compact */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-base">Invite Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <div>
              <Label htmlFor="inviteEmail" className="text-xs">Email Address *</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteData.email}
                onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="user@example.com"
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="inviteRole" className="text-xs">Role *</Label>
              <Select
                value={inviteData.role}
                onValueChange={(value) => setInviteData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" className="flex-1 h-8 text-xs bg-orange-500 hover:bg-orange-600">
                Send Invitation
              </Button>
              <Button variant="outline" onClick={() => setShowInviteModal(false)} size="sm" className="h-8 text-xs">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRolesPermissions;

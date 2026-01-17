// @ts-nocheck
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Users, UserPlus, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RestaurantOnboardingData } from '../types';

interface AdminUser {
  id: string;
  email: string;
  full_name?: string;
  assigned_count: number;
  pending_count: number;
  completed_count: number;
}

interface TeamAssignmentProps {
  restaurants: RestaurantOnboardingData[];
  selectedRestaurant?: RestaurantOnboardingData;
  onAssignComplete?: () => void;
}

export function TeamAssignment({ 
  restaurants, 
  selectedRestaurant,
  onAssignComplete 
}: TeamAssignmentProps) {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, [restaurants]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);

      // Get all admin users (in real app, filter by role)
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, role')
        .eq('role', 'admin')
        .order('email');

      if (error) {
        console.error('Error fetching admins:', error);
        toast.error('Failed to load team members. Please check if the profiles table exists.');
        setAdmins([]);
        return;
      }

      // Calculate workload for each admin
      const adminsWithWorkload: AdminUser[] = (profiles || []).map((profile: any) => {
        const assigned = restaurants.filter(r => r.assigned_admin_id === profile.id);
        const pending = assigned.filter(r => !r.business_info_verified);
        const completed = assigned.filter(r => r.go_live_ready);

        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name || profile.email.split('@')[0],
          assigned_count: assigned.length,
          pending_count: pending.length,
          completed_count: completed.length,
        };
      });

      setAdmins(adminsWithWorkload);
    } catch (error) {
      console.error('Error in fetchAdmins:', error);
      toast.error('Failed to load team members');
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedRestaurant || !selectedAdmin) {
      toast.error('Please select an admin');
      return;
    }

    setIsAssigning(true);
    try {
      const { error } = await supabase
        .from('restaurant_onboarding')
        .update({ 
          assigned_admin_id: selectedAdmin,
          updated_at: new Date().toISOString()
        })
        .eq('restaurant_id', selectedRestaurant.restaurant_id);

      if (error) throw error;

      const assignedAdmin = admins.find(a => a.id === selectedAdmin);
      toast.success(`Assigned to ${assignedAdmin?.full_name || assignedAdmin?.email}!`);
      
      setShowAssignDialog(false);
      setSelectedAdmin('');
      
      if (onAssignComplete) {
        onAssignComplete();
      }
    } catch (error) {
      console.error('Error assigning restaurant:', error);
      toast.error('Failed to assign restaurant');
    } finally {
      setIsAssigning(false);
    }
  };

  const getInitials = (name: string, email: string): string => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const getWorkloadColor = (count: number): string => {
    if (count === 0) return 'bg-gray-100';
    if (count <= 5) return 'bg-green-100';
    if (count <= 10) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const totalAssigned = restaurants.filter(r => r.assigned_admin_id).length;
  const unassigned = restaurants.length - totalAssigned;

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold mb-2">Team Workload</h3>
            <p className="text-muted-foreground">
              Manage restaurant assignments across your team
            </p>
          </div>
          {selectedRestaurant && (
            <Button onClick={() => setShowAssignDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Assign Restaurant
            </Button>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Restaurants</p>
                  <p className="text-3xl font-bold">{restaurants.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Assigned</p>
                  <p className="text-3xl font-bold text-green-600">{totalAssigned}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Unassigned</p>
                  <p className="text-3xl font-bold text-orange-600">{unassigned}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Team Members</p>
                  <p className="text-3xl font-bold">{admins.length}</p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Workload Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <Clock className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Loading team members...</p>
            </div>
          ) : admins.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
              <p className="text-muted-foreground">No admin team members found</p>
            </div>
          ) : (
            admins.map((admin) => (
              <Card key={admin.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold">
                          {getInitials(admin.full_name || '', admin.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">
                          {admin.full_name || admin.email.split('@')[0]}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {admin.email}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Workload Overview */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total Assigned</span>
                      <Badge variant="secondary">{admin.assigned_count}</Badge>
                    </div>
                    <Progress 
                      value={(admin.assigned_count / restaurants.length) * 100} 
                      className="h-2"
                    />
                  </div>

                  {/* Status Breakdown */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-50 border border-yellow-200">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <div>
                        <p className="text-xs text-yellow-600 font-medium">Pending</p>
                        <p className="text-sm font-bold text-yellow-700">{admin.pending_count}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-xs text-green-600 font-medium">Done</p>
                        <p className="text-sm font-bold text-green-700">{admin.completed_count}</p>
                      </div>
                    </div>
                  </div>

                  {/* Workload Indicator */}
                  <div className="pt-2">
                    {admin.assigned_count === 0 && (
                      <Badge variant="outline" className="w-full justify-center">
                        Available
                      </Badge>
                    )}
                    {admin.assigned_count > 0 && admin.assigned_count <= 5 && (
                      <Badge variant="outline" className="w-full justify-center bg-green-50 text-green-700 border-green-300">
                        Light Load
                      </Badge>
                    )}
                    {admin.assigned_count > 5 && admin.assigned_count <= 10 && (
                      <Badge variant="outline" className="w-full justify-center bg-yellow-50 text-yellow-700 border-yellow-300">
                        Moderate Load
                      </Badge>
                    )}
                    {admin.assigned_count > 10 && (
                      <Badge variant="outline" className="w-full justify-center bg-red-50 text-red-700 border-red-300">
                        Heavy Load
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Assignment Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              Assign Restaurant
            </DialogTitle>
            <DialogDescription>
              {selectedRestaurant && (
                <span>
                  Assign <strong>{selectedRestaurant.restaurant.name}</strong> to a team member
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedRestaurant?.assigned_admin_id && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Currently assigned to:{' '}
                  <strong>
                    {admins.find(a => a.id === selectedRestaurant.assigned_admin_id)?.full_name ||
                     admins.find(a => a.id === selectedRestaurant.assigned_admin_id)?.email ||
                     'Unknown'}
                  </strong>
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="admin-select">Select Team Member</Label>
              <Select value={selectedAdmin} onValueChange={setSelectedAdmin}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an admin..." />
                </SelectTrigger>
                <SelectContent>
                  {admins.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{admin.full_name || admin.email}</span>
                        <Badge variant="secondary" className="ml-2">
                          {admin.assigned_count} assigned
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedAdmin && (
              <div className="p-3 bg-gray-50 border rounded-lg">
                {(() => {
                  const admin = admins.find(a => a.id === selectedAdmin);
                  if (!admin) return null;
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Current Workload:</span>
                        <Badge variant="secondary">{admin.assigned_count} restaurants</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Pending:</span>
                        <Badge variant="outline">{admin.pending_count}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Completed:</span>
                        <Badge variant="outline">{admin.completed_count}</Badge>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={isAssigning || !selectedAdmin}
            >
              {isAssigning ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { CheckCircle, Copy, MoreVertical, User, UserPlus, UserX } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { format } from 'date-fns';
import { debounce } from 'lodash';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from '@/integrations/supabase/client';

interface Customer {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string;
  phone: string;
  email?: string;
  account_status?: string;
  suspension_reason?: string;
  suspension_until?: string;
  created_at: string;
  updated_at: string;
  role: string;
  preferences: any;
  settings: any;
}

interface AuditLog {
  id: string;
  created_at: string;
  table_name: string;
  operation: string;
  user_id: string;
  timestamp: string;
  details: any;
}

export const CustomerManagement: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [accountStatusFilter, setAccountStatusFilter] = useState<string>('all');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSuspensionReason, setNewSuspensionReason] = useState('');
  const [newSuspensionUntil, setNewSuspensionUntil] = useState<Date | undefined>(undefined);
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: 'Error loading customers',
        description: 'Failed to load customer data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };

  const handleSearch = debounce((value: string) => {
    setSearchTerm(value);
  }, 300);

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = searchTerm === '' ||
      customer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = accountStatusFilter === 'all' || customer.account_status === accountStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = async (customerId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ account_status: newStatus })
        .eq('id', customerId);

      if (error) throw error;

      toast({
        title: 'Status updated',
        description: `Customer status changed to ${newStatus}`
      });

      fetchCustomers();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error updating status',
        description: 'Failed to update customer status',
        variant: 'destructive'
      });
    }
  };

  const handleSuspendAccount = async (customerId: string) => {
    if (!newSuspensionReason.trim()) {
      toast({
        title: 'Suspension reason required',
        description: 'Please provide a reason for suspending the account',
        variant: 'destructive'
      });
      return;
    }

    if (!newSuspensionUntil) {
      toast({
        title: 'Suspension end date required',
        description: 'Please provide a date until the account will be suspended',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_profiles')
        .update({
          account_status: 'suspended',
          suspension_reason: newSuspensionReason.trim(),
          suspension_until: newSuspensionUntil.toISOString(),
        })
        .eq('id', customerId);

      if (error) throw error;

      // Create audit log
      await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        user_id: customerId,
        action: 'account_suspended',
        entity_type: 'customer',
        entity_id: customerId,
        details: { reason: newSuspensionReason.trim(), until: newSuspensionUntil.toISOString() }
      });

      toast({
        title: 'Account suspended',
        description: 'The account has been successfully suspended'
      });

      setSelectedCustomer(null);
      setNewSuspensionReason('');
      setNewSuspensionUntil(undefined);
      setIsDialogOpen(false);
      fetchCustomers();
    } catch (error) {
      console.error('Error suspending account:', error);
      toast({
        title: 'Error suspending account',
        description: 'Failed to suspend the account',
        variant: 'destructive'
      });
    }
  };

  const handleUnsuspendAccount = async (customerId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_profiles')
        .update({
          account_status: 'active',
          suspension_reason: null,
          suspension_until: null,
        })
        .eq('id', customerId);

      if (error) throw error;

      // Create audit log
      await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        user_id: customerId,
        action: 'account_unsuspended',
        entity_type: 'customer',
        entity_id: customerId,
      });

      toast({
        title: 'Account unsuspended',
        description: 'The account has been successfully unsuspended'
      });

      setSelectedCustomer(null);
      fetchCustomers();
    } catch (error) {
      console.error('Error unsuspending account:', error);
      toast({
        title: 'Error unsuspending account',
        description: 'Failed to unsuspend the account',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customer Management</h1>
          <p className="text-gray-500">Manage your customers</p>
        </div>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" /> Add Customer
        </Button>
      </div>

      <div className="mb-4 flex items-center space-x-4">
        <Input
          type="search"
          placeholder="Search customers..."
          className="w-auto flex-1"
          onChange={(e) => handleSearch(e.target.value)}
        />
        <Select value={accountStatusFilter} onValueChange={setAccountStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>A list of your customers.</TableCaption>
            <TableHead>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No customers found.</TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Avatar>
                          <AvatarImage src={customer.avatar_url} />
                          <AvatarFallback>{customer.full_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span>{customer.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell>
                      <Badge variant={customer.account_status === 'active' ? 'default' : 'destructive'}>
                        {customer.account_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => {
                            setSelectedCustomer(customer);
                            fetchAuditLogs(customer.user_id);
                          }}>
                            <User className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {customer.account_status === 'active' ? (
                            <DropdownMenuItem onClick={() => {
                              setSelectedCustomer(customer);
                              setIsDialogOpen(true);
                            }}>
                              <UserX className="mr-2 h-4 w-4" /> Suspend Account
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleUnsuspendAccount(customer.id)}>
                              <CheckCircle className="mr-2 h-4 w-4" /> Unsuspend Account
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Customer Details Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>
              Information about the selected customer.
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
                <div className="flex items-center space-x-4 mb-4">
                  <Avatar>
                    <AvatarImage src={selectedCustomer.avatar_url} />
                    <AvatarFallback>{selectedCustomer.full_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-lg font-medium">{selectedCustomer.full_name}</p>
                    <p className="text-gray-500">{selectedCustomer.email}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <Label>Phone</Label>
                    <Input type="text" value={selectedCustomer.phone} readOnly />
                  </div>
                  <div>
                    <Label>Account Status</Label>
                    <Input type="text" value={selectedCustomer.account_status} readOnly />
                  </div>
                  {selectedCustomer.suspension_reason && (
                    <div>
                      <Label>Suspension Reason</Label>
                      <Textarea value={selectedCustomer.suspension_reason} readOnly />
                    </div>
                  )}
                  {selectedCustomer.suspension_until && (
                    <div>
                      <Label>Suspension Until</Label>
                      <Input type="text" value={format(new Date(selectedCustomer.suspension_until), 'PP')} readOnly />
                    </div>
                  )}
                  <div>
                    <Label>Role</Label>
                    <Input type="text" value={selectedCustomer.role} readOnly />
                  </div>
                  <div>
                    <Label>Created At</Label>
                    <Input type="text" value={format(new Date(selectedCustomer.created_at), 'PPp')} readOnly />
                  </div>
                  <div>
                    <Label>Updated At</Label>
                    <Input type="text" value={format(new Date(selectedCustomer.updated_at), 'PPp')} readOnly />
                  </div>
                </div>
              </div>

              {/* Audit Logs */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Audit Logs</h3>
                {auditLogs.length === 0 ? (
                  <p className="text-gray-500">No audit logs found for this customer.</p>
                ) : (
                  <div className="space-y-2">
                    {auditLogs.map(log => (
                      <Card key={log.id}>
                        <CardContent className="p-3">
                          <p className="text-sm font-medium">{log.action}</p>
                          <p className="text-xs text-gray-500">{format(new Date(log.created_at), 'PPp')}</p>
                          {log.details && (
                            <details className="mt-2">
                              <summary className="text-xs text-blue-500 hover:underline cursor-pointer">View Details</summary>
                              <pre className="text-xs bg-gray-100 p-2 rounded mt-1">{JSON.stringify(log.details, null, 2)}</pre>
                            </details>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Suspend Account Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={() => setIsDialogOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Suspend Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to suspend this account?
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="suspensionReason" className="text-right">
                Reason
              </Label>
              <Textarea
                id="suspensionReason"
                className="col-span-3"
                value={newSuspensionReason}
                onChange={(e) => setNewSuspensionReason(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="suspensionUntil" className="text-right">
                Until
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[240px] pl-3 text-left font-normal",
                      !newSuspensionUntil && "text-muted-foreground"
                    )}
                  >
                    {newSuspensionUntil ? format(newSuspensionUntil, "PP") : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center" side="bottom">
                  <Calendar
                    mode="single"
                    selected={newSuspensionUntil}
                    onSelect={setNewSuspensionUntil}
                    disabled={(date) =>
                      date < new Date()
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              if (selectedCustomer) {
                handleSuspendAccount(selectedCustomer.id);
              }
            }}>Suspend Account</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerManagement;

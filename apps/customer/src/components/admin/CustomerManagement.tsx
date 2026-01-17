// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
    <div className="container mx-auto py-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Customer Management</h1>
          <p className="text-xs text-muted-foreground">Manage your customers</p>
        </div>
        <Button size="sm" className="h-8 text-xs">
          <UserPlus className="mr-1.5 h-3 w-3" /> Add Customer
        </Button>
      </div>

      <div className="mb-3 flex items-center space-x-2">
        <Input
          type="search"
          placeholder="Search customers..."
          className="h-8 text-sm w-auto flex-1"
          onChange={(e) => handleSearch(e.target.value)}
        />
        <Select value={accountStatusFilter} onValueChange={setAccountStatusFilter}>
          <SelectTrigger className="h-8 text-sm w-[160px]">
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
        <CardHeader className="p-3">
          <CardTitle className="text-base">Customers</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <Table>
            <TableCaption className="text-xs">A list of your customers.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="h-8 py-2 px-3 text-xs">Name</TableHead>
                <TableHead className="h-8 py-2 px-3 text-xs">Email</TableHead>
                <TableHead className="h-8 py-2 px-3 text-xs">Phone</TableHead>
                <TableHead className="h-8 py-2 px-3 text-xs">Status</TableHead>
                <TableHead className="h-8 py-2 px-3 text-right text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-xs py-4">Loading...</TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-xs py-4">No customers found.</TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="py-2 px-3">
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={customer.avatar_url} />
                          <AvatarFallback className="text-xs">{customer.full_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{customer.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-3 text-xs">{customer.email}</TableCell>
                    <TableCell className="py-2 px-3 text-xs">{customer.phone}</TableCell>
                    <TableCell className="py-2 px-3">
                      <Badge variant={customer.account_status === 'active' ? 'default' : 'destructive'} className="text-xs">
                        {customer.account_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 px-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-7 w-7 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-3.5 w-3.5" />
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
        <DialogContent className="max-w-4xl p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg">Customer Details</DialogTitle>
            <DialogDescription className="text-xs">
              Information about the selected customer.
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Information */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Customer Information</h3>
                <div className="flex items-center space-x-2 mb-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedCustomer.avatar_url} />
                    <AvatarFallback className="text-xs">{selectedCustomer.full_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{selectedCustomer.full_name}</p>
                    <p className="text-xs text-muted-foreground">{selectedCustomer.email}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <Input className="h-8 text-sm" type="text" value={selectedCustomer.phone} readOnly />
                  </div>
                  <div>
                    <Label className="text-xs">Account Status</Label>
                    <Input className="h-8 text-sm" type="text" value={selectedCustomer.account_status} readOnly />
                  </div>
                  {selectedCustomer.suspension_reason && (
                    <div>
                      <Label className="text-xs">Suspension Reason</Label>
                      <Textarea className="text-sm min-h-[60px]" value={selectedCustomer.suspension_reason} readOnly />
                    </div>
                  )}
                  {selectedCustomer.suspension_until && (
                    <div>
                      <Label className="text-xs">Suspension Until</Label>
                      <Input className="h-8 text-sm" type="text" value={format(new Date(selectedCustomer.suspension_until), 'PP')} readOnly />
                    </div>
                  )}
                  <div>
                    <Label className="text-xs">Role</Label>
                    <Input className="h-8 text-sm" type="text" value={selectedCustomer.role} readOnly />
                  </div>
                  <div>
                    <Label className="text-xs">Created At</Label>
                    <Input className="h-8 text-sm" type="text" value={format(new Date(selectedCustomer.created_at), 'PPp')} readOnly />
                  </div>
                  <div>
                    <Label className="text-xs">Updated At</Label>
                    <Input className="h-8 text-sm" type="text" value={format(new Date(selectedCustomer.updated_at), 'PPp')} readOnly />
                  </div>
                </div>
              </div>

              {/* Audit Logs */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Audit Logs</h3>
                {auditLogs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No audit logs found for this customer.</p>
                ) : (
                  <div className="space-y-2">
                    {auditLogs.map(log => (
                      <Card key={log.id}>
                        <CardContent className="p-2">
                          <p className="text-xs font-medium">{log.action}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(log.created_at), 'PPp')}</p>
                          {log.details && (
                            <details className="mt-1.5">
                              <summary className="text-xs text-blue-500 hover:underline cursor-pointer">View Details</summary>
                              <pre className="text-xs bg-gray-100 p-1.5 rounded mt-1">{JSON.stringify(log.details, null, 2)}</pre>
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
        <DialogContent className="max-w-md p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg">Suspend Account</DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to suspend this account?
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-4 items-center gap-3">
              <Label htmlFor="suspensionReason" className="text-right text-xs">
                Reason
              </Label>
              <Textarea
                id="suspensionReason"
                className="col-span-3 text-sm min-h-[60px]"
                value={newSuspensionReason}
                onChange={(e) => setNewSuspensionReason(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label htmlFor="suspensionUntil" className="text-right text-xs">
                Until
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    size="sm"
                    className={cn(
                      "w-full h-8 text-sm pl-2 text-left font-normal",
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
          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="secondary" size="sm" className="h-8 text-xs" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => {
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

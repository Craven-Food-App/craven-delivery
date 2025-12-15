import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Copy, CheckCircle, XCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UserAccount {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  roles: string[];
  exec_user: boolean;
  portal_access: {
    executive: boolean;
    board: boolean;
    hub: boolean;
    company: boolean;
  };
}

const UserAccountManager: React.FC = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [newUser, setNewUser] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    generatePassword: true,
    portals: {
      executive: false,
      board: false,
      hub: false,
      company: false,
    },
    executiveRole: 'ceo' as 'ceo' | 'cfo' | 'coo' | 'cto' | 'board_member' | 'advisor',
    executiveTitle: '',
    executiveDepartment: '',
    hubPin: '',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const special = '!@#$%&*';
    let password = '';
    // Add 2 uppercase
    password += chars.charAt(Math.floor(Math.random() * 26));
    password += chars.charAt(Math.floor(Math.random() * 26));
    // Add 2 lowercase
    password += chars.charAt(26 + Math.floor(Math.random() * 26));
    password += chars.charAt(26 + Math.floor(Math.random() * 26));
    // Add 2 numbers
    password += chars.charAt(52 + Math.floor(Math.random() * 9));
    password += chars.charAt(52 + Math.floor(Math.random() * 9));
    // Add 1 special
    password += special.charAt(Math.floor(Math.random() * special.length));
    // Shuffle
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch executive users (no join since there's no FK relationship)
      const { data: execUsers, error: execError } = await supabase
        .from('exec_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (execError) {
        console.error('Error fetching exec users:', execError);
        toast({
          title: 'Error',
          description: `Failed to fetch executive users: ${execError.message}`,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (!execUsers || execUsers.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      // Get user IDs to fetch profiles separately
      const userIds = execUsers.map(eu => eu.user_id);

      // Fetch user profiles separately
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);

      // Create a map of user_id -> profile for quick lookup
      const profilesMap = new Map(
        (profilesData || []).map(p => [p.user_id, p])
      );

      // Get additional details for each executive user
      const usersWithDetails = await Promise.all(
        execUsers.map(async (execUser) => {
          const profile = profilesMap.get(execUser.user_id);

          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', execUser.user_id);

          const { data: employee } = await supabase
            .from('employees')
            .select('portal_access_granted, portal_pin')
            .eq('user_id', execUser.user_id)
            .maybeSingle();

          return {
            id: execUser.user_id,
            email: profile?.email || '',
            full_name: profile?.full_name || execUser.title || 'Unknown',
            created_at: execUser.created_at,
            roles: [...new Set([execUser.role, ...(roles?.map(r => r.role) || [])].filter(Boolean))],
            exec_user: true,
            portal_access: {
              executive: true,
              board: execUser.role === 'board_member',
              hub: employee?.portal_access_granted || false,
              company: roles?.some(r => r.role?.includes('CRAVEN')) || false,
            },
          };
        })
      );

      setUsers(usersWithDetails);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users. You may need admin privileges.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.firstName || !newUser.lastName) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (newUser.generatePassword && !newUser.password) {
      const tempPassword = generateTempPassword();
      setNewUser({ ...newUser, password: tempPassword });
      // Continue with creation
    }

    if (!newUser.password) {
      toast({
        title: 'Error',
        description: 'Password is required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Use fetch directly to get better error details
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error('Not authenticated. Please log in and try again.');
      }

      // Get Supabase URL from the client (it's stored in the client instance)
      // The URL is: https://xaxbucnjlrfkccsfiddq.supabase.co
      const supabaseUrl = 'https://xaxbucnjlrfkccsfiddq.supabase.co';
      const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhheGJ1Y25qbHJma2Njc2ZpZGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyODMyODAsImV4cCI6MjA3Mjg1OTI4MH0.3ETuLETgSEj6W8gYi7WAoUFDPNo4IwTjuSnVtt1BCFE';

      const response = await fetch(`${supabaseUrl}/functions/v1/create-user-with-portals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          password: newUser.password,
          portals: newUser.portals,
          executiveRole: newUser.executiveRole,
          executiveTitle: newUser.executiveTitle,
          executiveDepartment: newUser.executiveDepartment,
          hubPin: newUser.hubPin,
          hubAccess: newUser.portals.hub,
        }),
      });

      const responseData = await response.json();
      console.log('Function response:', { status: response.status, data: responseData });

      if (!response.ok) {
        // Extract error message from response
        const errorMessage = responseData?.error || responseData?.message || `HTTP ${response.status}: ${response.statusText}`;
        const errorDetails = responseData?.details ? ` Details: ${responseData.details}` : '';
        const errorCode = responseData?.code ? ` (Code: ${responseData.code})` : '';
        throw new Error(`${errorMessage}${errorDetails}${errorCode}`);
      }

      const data = responseData;

      if (data?.success) {
        setGeneratedPassword(data.tempPassword || newUser.password);
        setShowCreateDialog(false);
        setShowPasswordDialog(true);
        
        // Reset form
        setNewUser({
          email: '',
          firstName: '',
          lastName: '',
          password: '',
          generatePassword: true,
          portals: {
            executive: false,
            board: false,
            hub: false,
            company: false,
          },
          executiveRole: 'ceo',
          executiveTitle: '',
          executiveDepartment: '',
          hubPin: '',
        });

        toast({
          title: 'Success',
          description: 'User account created successfully',
        });

        fetchUsers();
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      console.error('Error details:', {
        message: error.message,
        error: error.error,
        data: error.data,
        context: error.context,
      });
      
      // Extract error message from various possible locations
      let errorMessage = 'Failed to create executive account';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error.error) {
        errorMessage = String(error.error);
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
    toast({
      title: 'Copied',
      description: 'Password copied to clipboard',
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Executive & Company Portal Access</CardTitle>
              <CardDescription>
                Create executive accounts with temporary passwords and grant access to company portals
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchUsers} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create Executive Account
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Executive Account</DialogTitle>
                    <DialogDescription>
                      Create an executive account with temporary password and grant access to company portals
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          value={newUser.firstName}
                          onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          value={newUser.lastName}
                          onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                          placeholder="Doe"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        placeholder="john.doe@company.com"
                      />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Checkbox
                          id="generatePassword"
                          checked={newUser.generatePassword}
                          onCheckedChange={(checked) =>
                            setNewUser({ ...newUser, generatePassword: checked as boolean })
                          }
                        />
                        <Label htmlFor="generatePassword">Generate Temporary Password</Label>
                      </div>
                      {!newUser.generatePassword && (
                        <Input
                          type="password"
                          value={newUser.password}
                          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                          placeholder="Enter password"
                        />
                      )}
                    </div>

                    <div className="border-t pt-4">
                      <Label className="text-base font-semibold">Company Portal Access</Label>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="portal-executive"
                            checked={newUser.portals.executive}
                            onCheckedChange={(checked) =>
                              setNewUser({
                                ...newUser,
                                portals: { ...newUser.portals, executive: checked as boolean },
                              })
                            }
                          />
                          <Label htmlFor="portal-executive">Executive Portal</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="portal-board"
                            checked={newUser.portals.board}
                            onCheckedChange={(checked) =>
                              setNewUser({
                                ...newUser,
                                portals: { ...newUser.portals, board: checked as boolean },
                              })
                            }
                          />
                          <Label htmlFor="portal-board">Board Portal</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="portal-hub"
                            checked={newUser.portals.hub}
                            onCheckedChange={(checked) =>
                              setNewUser({
                                ...newUser,
                                portals: { ...newUser.portals, hub: checked as boolean },
                              })
                            }
                          />
                          <Label htmlFor="portal-hub">Main Hub</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="portal-company"
                            checked={newUser.portals.company}
                            onCheckedChange={(checked) =>
                              setNewUser({
                                ...newUser,
                                portals: { ...newUser.portals, company: checked as boolean },
                              })
                            }
                          />
                          <Label htmlFor="portal-company">Company Portal</Label>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Select which company portals this executive should have access to
                      </p>
                    </div>

                    <div className="border-t pt-4 space-y-4">
                      <Label className="text-base font-semibold">Executive Details *</Label>
                      <p className="text-sm text-muted-foreground">
                        Required information for executive/board portal access
                      </p>
                        <div>
                          <Label htmlFor="executiveRole">Role</Label>
                          <Select
                            value={newUser.executiveRole}
                            onValueChange={(value: any) =>
                              setNewUser({ ...newUser, executiveRole: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ceo">CEO</SelectItem>
                              <SelectItem value="cfo">CFO</SelectItem>
                              <SelectItem value="coo">COO</SelectItem>
                              <SelectItem value="cto">CTO</SelectItem>
                              <SelectItem value="board_member">Board Member</SelectItem>
                              <SelectItem value="advisor">Advisor</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="executiveTitle">Title</Label>
                          <Input
                            id="executiveTitle"
                            value={newUser.executiveTitle}
                            onChange={(e) =>
                              setNewUser({ ...newUser, executiveTitle: e.target.value })
                            }
                            placeholder="Chief Executive Officer"
                          />
                        </div>
                        <div>
                          <Label htmlFor="executiveDepartment">Department</Label>
                          <Input
                            id="executiveDepartment"
                            value={newUser.executiveDepartment}
                            onChange={(e) =>
                              setNewUser({ ...newUser, executiveDepartment: e.target.value })
                            }
                            placeholder="Executive"
                          />
                        </div>
                      </div>

                    {newUser.portals.hub && (
                      <div className="border-t pt-4 space-y-4">
                        <Label className="text-base font-semibold">Hub Access Details</Label>
                        <div>
                          <Label htmlFor="hubPin">Portal PIN (4-6 digits)</Label>
                          <Input
                            id="hubPin"
                            value={newUser.hubPin}
                            onChange={(e) =>
                              setNewUser({ ...newUser, hubPin: e.target.value })
                            }
                            placeholder="1234"
                            maxLength={6}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateUser} disabled={loading}>
                        {loading ? 'Creating...' : 'Create Executive Account'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                  <TableRow>
                  <TableHead>Executive Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company Portals</TableHead>
                  <TableHead>Executive Role</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.portal_access.executive && (
                            <Badge variant="default">Executive</Badge>
                          )}
                          {user.portal_access.board && (
                            <Badge variant="secondary">Board</Badge>
                          )}
                          {user.portal_access.hub && (
                            <Badge variant="outline">Hub</Badge>
                          )}
                          {user.portal_access.company && (
                            <Badge>Company</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.filter(r => ['ceo', 'cfo', 'coo', 'cto', 'board_member', 'advisor'].includes(r)).map((role, idx) => (
                            <Badge key={`${user.id}-${role}-${idx}`} variant="outline">
                              {role.toUpperCase()}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString()
                          : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Password Display Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Account Created</DialogTitle>
            <DialogDescription>
              Save this temporary password. It will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertDescription>
              <div className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <p className="font-mono text-sm">{newUser.email}</p>
                </div>
                <div>
                  <Label>Temporary Password</Label>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-lg font-bold">{generatedPassword}</p>
                    <Button variant="outline" size="sm" onClick={copyPassword}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Share these credentials securely with the user. They should change their password
                  on first login.
                </p>
              </div>
            </AlertDescription>
          </Alert>
          <div className="flex justify-end">
            <Button onClick={() => setShowPasswordDialog(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserAccountManager;


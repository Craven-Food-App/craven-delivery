import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Shield,
  Users,
  Plus,
  Search,
  X,
  CheckCircle,
  AlertTriangle,
  User,
  Mail,
  Calendar,
  Key,
} from 'lucide-react';

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  user_email?: string;
}

// Required role states per spec
const REQUIRED_ROLE_STATES = [
  { 
    value: 'APPLIED', 
    label: 'Applied', 
    description: 'Initial application state',
    color: 'bg-gray-100 text-gray-700 border-gray-300'
  },
  { 
    value: 'INTERN_ACTIVE', 
    label: 'Intern Active', 
    description: 'Active intern in the program',
    color: 'bg-blue-100 text-blue-700 border-blue-300'
  },
  { 
    value: 'ACTING_EXECUTIVE', 
    label: 'Acting Executive', 
    description: 'Temporary executive role with limited authority',
    color: 'bg-purple-100 text-purple-700 border-purple-300'
  },
  { 
    value: 'EXECUTIVE_OFFICER', 
    label: 'Executive Officer', 
    description: 'Full executive with expanded permissions',
    color: 'bg-green-100 text-green-700 border-green-300'
  },
  { 
    value: 'EXITED', 
    label: 'Exited', 
    description: 'No longer in the program',
    color: 'bg-red-100 text-red-700 border-red-300'
  },
  { 
    value: 'REVOKED', 
    label: 'Revoked', 
    description: 'Authority revoked for cause',
    color: 'bg-red-100 text-red-700 border-red-300'
  },
];

// Intern program roles
const INTERN_PROGRAM_ROLES = [
  {
    value: 'INTERN',
    label: 'Intern',
    description: 'Portal user with read-only access to dashboards',
    permissions: ['View own progress', 'Complete assigned tests', 'View role track'],
  },
  {
    value: 'INTERN_MANAGER',
    label: 'Intern Manager',
    description: 'Manager for one or more interns',
    permissions: ['View assigned interns', 'Submit reviews', 'Assign tests', 'Recommend promotion'],
  },
  {
    value: 'INTERN_SPONSOR',
    label: 'Executive Sponsor',
    description: 'Executive sponsor for intern conversion',
    permissions: ['Approve conversions', 'Override reviews', 'View all sponsored interns'],
  },
  {
    value: 'INTERN_PROGRAM_ADMIN',
    label: 'Program Admin',
    description: 'Full program operations and admin access',
    permissions: ['Full access', 'Create/edit tests', 'Define rules', 'Enforcement actions', 'Audit log access'],
  },
];

const InternRolesPermissions: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignEmail, setAssignEmail] = useState('');
  const [assignRole, setAssignRole] = useState('INTERN');

  // Fetch user roles for intern program
  const { data: userRoles, isLoading } = useQuery({
    queryKey: ['intern-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .in('role', ['INTERN', 'INTERN_MANAGER', 'INTERN_SPONSOR', 'INTERN_PROGRAM_ADMIN'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as UserRole[];
    },
  });

  // Assign role mutation
  const assignMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      // Normalize email
      const normalizedEmail = email.trim().toLowerCase();

      // First, try to use current user if email matches
      let userId: string | null = null;
      if (currentUser.email?.toLowerCase() === normalizedEmail) {
        userId = currentUser.id;
      } else {
        // Look up user by email using database function (specifically for intern role assignment)
        const { data: userLookup, error: lookupError } = await supabase
          .rpc('lookup_user_for_intern_role', { p_email: normalizedEmail });

        if (lookupError) {
          console.error('Lookup error:', lookupError);
          throw new Error(`Failed to look up user: ${lookupError.message}`);
        }

        if (!userLookup || userLookup.length === 0 || !userLookup[0]?.user_id) {
          throw new Error(`User not found with email "${email}". The user must exist in auth.users, employees, or exec_users table. If this is an executive email, ensure the user account exists in Supabase Auth.`);
        }

        userId = userLookup[0].user_id;
      }

      if (!userId) {
        throw new Error(`Unable to find user_id for email "${email}". Please ensure the user account exists.`);
      }

      // Check if role already exists
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', role)
        .maybeSingle();

      if (existing) {
        throw new Error('User already has this role');
      }

      // Assign role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role,
        });

      if (error) throw error;

      // Log action
      await supabase.rpc('log_intern_program_action', {
        p_actor_id: currentUser.id,
        p_action: 'ASSIGN_ROLE',
        p_entity_type: 'user_role',
        p_entity_id: userId,
        p_affected_user_id: userId,
        p_reason: `Assigned role ${role} to user ${email}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intern-user-roles'] });
      setIsAssignModalOpen(false);
      setAssignEmail('');
      setAssignRole('INTERN');
    },
  });

  // Remove role mutation
  const removeMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      await supabase.rpc('log_intern_program_action', {
        p_actor_id: currentUser.id,
        p_action: 'REMOVE_ROLE',
        p_entity_type: 'user_role',
        p_entity_id: roleId,
        p_affected_user_id: null,
        p_reason: 'Removed role assignment',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intern-user-roles'] });
    },
  });

  const filteredRoles = (userRoles || []).filter((ur) => {
    if (selectedRole !== 'all' && ur.role !== selectedRole) return false;
    if (searchTerm && !ur.user_id?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getRoleInfo = (role: string) => {
    return INTERN_PROGRAM_ROLES.find((r) => r.value === role);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="text-gray-500 mt-1">
            Manage intern program roles. Permissions are bound to role state, not title text.
          </p>
        </div>
        <button
          onClick={() => setIsAssignModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Assign Role
        </button>
      </div>

      {/* Role States Reference */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-orange-500" />
          Required Role States
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {REQUIRED_ROLE_STATES.map((state) => (
            <div
              key={state.value}
              className={`p-3 rounded-lg border ${state.color}`}
            >
              <p className="font-medium text-sm">{state.label}</p>
              <p className="text-xs opacity-75 mt-0.5">{state.description}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Permissions must be bound to role state, not title text. Admin can override permissions in emergencies.
        </p>
      </div>

      {/* Program Roles Reference */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-orange-500" />
          Program Roles
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {INTERN_PROGRAM_ROLES.map((role) => (
            <div
              key={role.value}
              className="border border-gray-200 rounded-lg p-4 hover:border-orange-200 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{role.label}</h3>
                  <p className="text-sm text-gray-500">{role.description}</p>
                </div>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono">
                  {role.value}
                </span>
              </div>
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Permissions</p>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.map((perm) => (
                    <span key={perm} className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Role Assignments */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by user ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            >
              <option value="all">All Roles</option>
              {INTERN_PROGRAM_ROLES.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="p-4 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))
          ) : filteredRoles.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Role Assignments</h3>
              <p className="text-gray-500">Assign roles to users to manage program access.</p>
            </div>
          ) : (
            filteredRoles.map((ur) => {
              const roleInfo = getRoleInfo(ur.role);
              return (
                <div key={ur.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 font-mono text-sm">
                          {ur.user_id?.slice(0, 8)}...
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            ur.role === 'INTERN_PROGRAM_ADMIN' 
                              ? 'bg-red-100 text-red-700'
                              : ur.role === 'INTERN_SPONSOR'
                                ? 'bg-purple-100 text-purple-700'
                                : ur.role === 'INTERN_MANAGER'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                          }`}>
                            {roleInfo?.label || ur.role}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(ur.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to remove this role?')) {
                          removeMutation.mutate(ur.id);
                        }
                      }}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove Role"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-700">
          <strong>Access Control:</strong> The Intern Program Admin portal cannot be accessed by Interns, 
          Intern Managers, or Executive Sponsors. Only users with the INTERN_PROGRAM_ADMIN role have full access.
        </div>
      </div>

      {/* Assign Role Modal */}
      {isAssignModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsAssignModalOpen(false)} />
          <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[450px] bg-white rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Assign Role</h2>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                assignMutation.mutate({ email: assignEmail, role: assignRole });
              }}
              className="p-4 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={assignEmail}
                    onChange={(e) => setAssignEmail(e.target.value)}
                    required
                    placeholder="user@example.com"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select
                  value={assignRole}
                  onChange={(e) => setAssignRole(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  {INTERN_PROGRAM_ROLES.map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {getRoleInfo(assignRole)?.description}
                </p>
              </div>
              {assignMutation.isError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {(assignMutation.error as Error).message}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignMutation.isPending || !assignEmail}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {assignMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Assign Role
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default InternRolesPermissions;

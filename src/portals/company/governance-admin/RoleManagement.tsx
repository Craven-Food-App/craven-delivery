import React, { useState, useEffect } from 'react';
import {
  Table,
  Badge,
  Button,
  Stack,
  Group,
  Text,
  Select,
  Paper,
  ActionIcon,
  Tooltip,
  Loader,
  Center,
  Modal,
  TextInput,
  MultiSelect,
  Divider,
  Title,
  Alert,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { supabase } from '@/integrations/supabase/client';
import { IconTrash, IconPlus, IconSearch, IconUser, IconShield } from '@tabler/icons-react';
import { fetchUserRoles, canManageGovernance } from '@/lib/roles';

interface User {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

const CRAVEN_ROLES = [
  { value: 'CRAVEN_FOUNDER', label: 'Founder', color: 'red' },
  { value: 'CRAVEN_CORPORATE_SECRETARY', label: 'Corporate Secretary', color: 'blue' },
  { value: 'CRAVEN_BOARD_MEMBER', label: 'Board Member', color: 'violet' },
  { value: 'CRAVEN_EXECUTIVE', label: 'Executive', color: 'green' },
  { value: 'CRAVEN_CEO', label: 'CEO', color: 'orange' },
  { value: 'CRAVEN_CFO', label: 'CFO', color: 'cyan' },
  { value: 'CRAVEN_CTO', label: 'CTO', color: 'grape' },
  { value: 'CRAVEN_COO', label: 'COO', color: 'pink' },
  { value: 'CRAVEN_CXO', label: 'CXO', color: 'indigo' },
];

const RoleManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [currentUserRoles, setCurrentUserRoles] = useState<string[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRoles, setNewUserRoles] = useState<string[]>([]);
  const [addingUser, setAddingUser] = useState(false);

  useEffect(() => {
    checkPermissions();
    fetchUsers();
  }, []);

  const checkPermissions = async () => {
    const roles = await fetchUserRoles();
    setCanManage(canManageGovernance(roles));
    setCurrentUserRoles(roles);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Client-side code cannot access admin API, so fetch from user_roles and join with user_profiles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', CRAVEN_ROLES.map(r => r.value));

      if (rolesError) throw rolesError;

      // Get unique user IDs
      const userIds = [...new Set(rolesData?.map(r => r.user_id) || [])];
      
      if (userIds.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }
      
      // Fetch user profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, email, full_name, created_at')
        .in('user_id', userIds);

      if (profilesError) {
        console.warn('Error fetching user profiles, using fallback method:', profilesError);
        // Fallback: try to get user info from auth (limited info available)
        const usersData: User[] = [];
        for (const userId of userIds) {
          try {
            const { data: userData } = await supabase.auth.getUser(userId);
            if (userData?.user) {
              usersData.push({
                id: userData.user.id,
                email: userData.user.email || '',
                full_name: userData.user.user_metadata?.full_name,
                created_at: userData.user.created_at,
              });
            }
          } catch (err) {
            // Skip users we can't fetch
            console.warn(`Could not fetch user ${userId}:`, err);
          }
        }
        setUsers(usersData);
        loadUserRoles(usersData.map(u => u.id));
      } else {
        // Use profile data
        const usersData: User[] = (profilesData || []).map(profile => ({
          id: profile.user_id,
          email: profile.email || '',
          full_name: profile.full_name,
          created_at: profile.created_at || new Date().toISOString(),
        }));
        
        setUsers(usersData);
        loadUserRoles(usersData.map(u => u.id));
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load users. You may need admin privileges.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUserRoles = async (userIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds)
        .in('role', CRAVEN_ROLES.map(r => r.value));

      if (error) throw error;

      const rolesMap: Record<string, string[]> = {};
      data?.forEach((ur: { user_id: string; role: string }) => {
        if (!rolesMap[ur.user_id]) {
          rolesMap[ur.user_id] = [];
        }
        rolesMap[ur.user_id].push(ur.role);
      });

      setUserRoles(rolesMap);
    } catch (error: any) {
      console.error('Error loading user roles:', error);
    }
  };

  const handleOpenRoleModal = (user: User) => {
    setSelectedUser(user);
    setSelectedRoles(userRoles[user.id] || []);
    setRoleModalOpen(true);
  };

  const handleSaveRoles = async () => {
    if (!selectedUser) return;

    try {
      setSaving(true);

      // Get current roles for this user
      const currentRoles = userRoles[selectedUser.id] || [];

      // Determine roles to add and remove
      const rolesToAdd = selectedRoles.filter(r => !currentRoles.includes(r));
      const rolesToRemove = currentRoles.filter(r => !selectedRoles.includes(r));

      // Remove roles
      if (rolesToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', selectedUser.id)
          .in('role', rolesToRemove);

        if (deleteError) throw deleteError;
      }

      // Add new roles
      if (rolesToAdd.length > 0) {
        const rolesToInsert = rolesToAdd.map(role => ({
          user_id: selectedUser.id,
          role,
        }));

        const { error: insertError } = await supabase
          .from('user_roles')
          .insert(rolesToInsert);

        if (insertError) throw insertError;
      }

      // Update local state
      setUserRoles(prev => ({
        ...prev,
        [selectedUser.id]: selectedRoles,
      }));

      notifications.show({
        title: 'Success',
        message: `Roles updated for ${selectedUser.email}`,
        color: 'green',
      });

      setRoleModalOpen(false);
    } catch (error: any) {
      console.error('Error saving roles:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update roles',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRole = async (userId: string, role: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      setUserRoles(prev => ({
        ...prev,
        [userId]: (prev[userId] || []).filter(r => r !== role),
      }));

      notifications.show({
        title: 'Success',
        message: 'Role removed',
        color: 'green',
      });
    } catch (error: any) {
      console.error('Error removing role:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to remove role',
        color: 'red',
      });
    }
  };

  const handleAddUserRoles = async () => {
    if (!newUserEmail || newUserRoles.length === 0) return;

    try {
      setAddingUser(true);

      // Use database function to lookup user by email
      const { data: userData, error: lookupError } = await supabase
        .rpc('lookup_user_by_email', { p_email: newUserEmail });

      if (lookupError) {
        throw lookupError;
      }

      if (!userData || userData.length === 0 || !userData[0]?.user_id) {
        throw new Error(
          `User with email "${newUserEmail}" not found. ` +
          'Please ensure the user exists in the system and has logged in at least once.'
        );
      }

      const foundUser = userData[0];
      const userId = foundUser.user_id;
      const userName = foundUser.full_name;

      // Check if user already exists in our list
      const existingUser = users.find(u => u.id === userId);
      
      // Add roles (handle duplicates gracefully)
      const rolesToInsert = newUserRoles
        .filter(role => !userRoles[userId]?.includes(role)) // Only add roles they don't already have
        .map(role => ({
          user_id: userId,
          role,
        }));

      if (rolesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert(rolesToInsert);

        if (insertError) {
          // If some roles already exist, that's okay - just update our state
          if (insertError.code !== '23505') { // Not a unique constraint violation
            throw insertError;
          }
        }
      }

      // If user wasn't in our list, add them using the data from the lookup function
      if (!existingUser) {
        const newUser: User = {
          id: userId,
          email: foundUser.email || newUserEmail,
          full_name: userName || foundUser.full_name,
          created_at: foundUser.created_at || new Date().toISOString(),
        };
        setUsers(prev => [...prev, newUser]);
      }

      // Update roles state
      setUserRoles(prev => ({
        ...prev,
        [userId]: [...new Set([...(prev[userId] || []), ...newUserRoles])],
      }));

      notifications.show({
        title: 'Success',
        message: `Roles added to ${newUserEmail}`,
        color: 'green',
      });

      setAddUserModalOpen(false);
      setNewUserEmail('');
      setNewUserRoles([]);
    } catch (error: any) {
      console.error('Error adding user roles:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to add roles. User may not exist in exec_users table.',
        color: 'red',
      });
    } finally {
      setAddingUser(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    const roleInfo = CRAVEN_ROLES.find(r => r.value === role);
    return (
      <Badge key={role} color={roleInfo?.color || 'gray'} size="sm" mr={4}>
        {roleInfo?.label || role}
      </Badge>
    );
  };

  if (!canManage) {
    return (
      <Paper p="xl" radius="md" withBorder>
        <Alert color="red" title="Access Denied">
          You do not have permission to manage roles. Only Founders and Corporate Secretaries can access this page.
        </Alert>
      </Paper>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Title order={2}>Role Management</Title>
          <Text c="dimmed" size="sm">
            Manage user roles and access permissions for the Company Portal
          </Text>
        </div>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setAddUserModalOpen(true)}
        >
          Add User Roles
        </Button>
      </Group>

      <Paper p="md" radius="md" withBorder>
        <TextInput
          placeholder="Search by email or name..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          mb="md"
        />

        {loading ? (
          <Center p="xl">
            <Loader />
          </Center>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>User</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Roles</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredUsers.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={4}>
                    <Center p="xl">
                      <Text c="dimmed">No users found</Text>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : (
                filteredUsers.map((user) => (
                  <Table.Tr key={user.id}>
                    <Table.Td>
                      <Group gap="xs">
                        <IconUser size={16} />
                        <Text fw={500}>
                          {user.full_name || 'No name'}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{user.email}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        {(userRoles[user.id] || []).length === 0 ? (
                          <Text c="dimmed" size="sm">No roles</Text>
                        ) : (
                          (userRoles[user.id] || []).map(role => getRoleBadge(role))
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Tooltip label="Manage Roles">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            onClick={() => handleOpenRoleModal(user)}
                          >
                            <IconShield size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      <Modal
        opened={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title={`Manage Roles: ${selectedUser?.email}`}
        size="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Select the roles to assign to this user. Changes take effect immediately.
          </Text>

          <MultiSelect
            label="Roles"
            placeholder="Select roles"
            data={CRAVEN_ROLES.map(r => ({ value: r.value, label: r.label }))}
            value={selectedRoles}
            onChange={setSelectedRoles}
            searchable
          />

          <Divider />

          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setRoleModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRoles} loading={saving}>
              Save Changes
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={addUserModalOpen}
        onClose={() => {
          setAddUserModalOpen(false);
          setNewUserEmail('');
          setNewUserRoles([]);
        }}
        title="Add Roles to User"
        size="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Enter a user's email address to assign roles. The user must exist in the system (either in exec_users or auth.users).
          </Text>

          <TextInput
            label="Email Address"
            placeholder="user@example.com"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.currentTarget.value)}
            required
          />

          <MultiSelect
            label="Roles"
            placeholder="Select roles to assign"
            data={CRAVEN_ROLES.map(r => ({ value: r.value, label: r.label }))}
            value={newUserRoles}
            onChange={setNewUserRoles}
            searchable
            required
          />

          <Divider />

          <Group justify="flex-end">
            <Button
              variant="subtle"
              onClick={() => {
                setAddUserModalOpen(false);
                setNewUserEmail('');
                setNewUserRoles([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddUserRoles}
              loading={addingUser}
              disabled={!newUserEmail || newUserRoles.length === 0}
            >
              Add Roles
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default RoleManagement;


import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  TextInput,
  Select,
  Stack,
  Group,
  Text,
  Badge,
  ActionIcon,
  Tooltip,
  Title,
  Alert,
  Paper,
} from '@mantine/core';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconUserPlus,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useFinanceRBAC } from '@/hooks/useFinanceRBAC';
import { logFinanceAction } from '@/utils/financePermissions';
import dayjs from 'dayjs';

/**
 * Role Management Component
 * For CFO and System Admins to manage finance user roles and permissions
 */
export const RoleManagement: React.FC = () => {
  const { isCFO, hasFullAdmin, refreshRoles } = useFinanceRBAC();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isCFO || hasFullAdmin) {
      fetchData();
    }
  }, [isCFO, hasFullAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all finance roles
      const { data: rolesData } = await supabase
        .from('finance_roles')
        .select('*')
        .eq('is_active', true)
        .order('role_name');

      // Fetch all entities
      const { data: entitiesData } = await supabase
        .from('finance_entities')
        .select('*')
        .eq('is_active', true)
        .order('entity_name');

      // Fetch user role assignments with user details
      const { data: userRolesData } = await supabase
        .from('finance_user_roles')
        .select(`
          *,
          role:finance_roles(*)
        `)
        .order('created_at', { ascending: false });

      setRoles(rolesData || []);
      setEntities(entitiesData || []);
      setUserRoles(userRolesData || []);

      // Fetch users (you may want to create a users lookup table)
      // For now, we'll get user emails from auth.users via a function or direct query
    } catch (error) {
      console.error('Error fetching role data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async (values: any) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      if (editingRole) {
        // Update existing role
        const { error } = await supabase
          .from('finance_user_roles')
          .update({
            role_id: values.role_id,
            entity_id: values.entity_id || null,
            region_codes: values.region_codes || null,
            department_codes: values.department_codes || null,
            gl_account_ranges: values.gl_account_ranges || null,
            expiration_date: values.expiration_date || null,
            approval_status: 'pending', // Requires CFO approval for access changes
          })
          .eq('id', editingRole.id);

        if (error) throw error;

        await logFinanceAction(currentUser.id, {
          actionType: 'update',
          resourceType: 'finance_user_role',
          resourceId: editingRole.id,
          newValues: values,
          complianceTag: 'SOX',
          severity: 'critical',
        });
      } else {
        // Create new role assignment
        const { error } = await supabase
          .from('finance_user_roles')
          .insert({
            user_id: values.user_id,
            role_id: values.role_id,
            entity_id: values.entity_id || null,
            region_codes: values.region_codes || null,
            department_codes: values.department_codes || null,
            gl_account_ranges: values.gl_account_ranges || null,
            expiration_date: values.expiration_date || null,
            assigned_by: currentUser.id,
            approval_status: 'pending',
          });

        if (error) throw error;

        await logFinanceAction(currentUser.id, {
          actionType: 'create',
          resourceType: 'finance_user_role',
          newValues: values,
          complianceTag: 'SOX',
          severity: 'critical',
        });
      }

      setModalOpen(false);
      setEditingRole(null);
      fetchData();
    } catch (error: any) {
      console.error('Error assigning role:', error);
      alert(error.message || 'Failed to assign role');
    }
  };

  const handleApproveRole = async (userRoleId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('finance_user_roles')
        .update({
          approval_status: 'approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userRoleId);

      if (error) throw error;

      await logFinanceAction(user.id, {
        actionType: 'approve',
        resourceType: 'finance_user_role',
        resourceId: userRoleId,
        complianceTag: 'SOX',
        severity: 'critical',
      });

      fetchData();
    } catch (error) {
      console.error('Error approving role:', error);
    }
  };

  const handleRevokeRole = async (userRoleId: string) => {
    if (!confirm('Are you sure you want to revoke this role assignment?')) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('finance_user_roles')
        .delete()
        .eq('id', userRoleId);

      if (error) throw error;

      await logFinanceAction(user.id, {
        actionType: 'delete',
        resourceType: 'finance_user_role',
        resourceId: userRoleId,
        complianceTag: 'SOX',
        severity: 'critical',
      });

      fetchData();
    } catch (error) {
      console.error('Error revoking role:', error);
    }
  };

  if (!isCFO && !hasFullAdmin) {
    return (
      <Alert color="red" title="Access Denied">
        You do not have permission to manage roles. Only CFO and System Administrators can access this feature.
      </Alert>
    );
  }

  return (
    <Stack gap="lg" p="lg">
      <Group justify="space-between">
        <Title order={2}>Finance Role Management</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => {
            setEditingRole(null);
            setModalOpen(true);
          }}
        >
          Assign Role
        </Button>
      </Group>

      <Alert color="blue" title="Access Control">
        All role assignments require CFO approval before taking effect. This ensures proper segregation of duties.
      </Alert>

      <Card p="lg" withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>User</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Entity</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Expires</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {userRoles.map((userRole) => (
              <Table.Tr key={userRole.id}>
                <Table.Td>{userRole.user_id}</Table.Td>
                <Table.Td>
                  <Badge>{userRole.role?.role_name || 'Unknown'}</Badge>
                </Table.Td>
                <Table.Td>
                  {entities.find(e => e.id === userRole.entity_id)?.entity_name || 'All Entities'}
                </Table.Td>
                <Table.Td>
                  <Badge
                    color={
                      userRole.approval_status === 'approved' ? 'green' :
                      userRole.approval_status === 'pending' ? 'orange' : 'red'
                    }
                  >
                    {userRole.approval_status?.toUpperCase()}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  {userRole.expiration_date
                    ? dayjs(userRole.expiration_date).format('MMM D, YYYY')
                    : 'Permanent'}
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    {userRole.approval_status === 'pending' && (
                      <Tooltip label="Approve">
                        <ActionIcon
                          color="green"
                          variant="light"
                          onClick={() => handleApproveRole(userRole.id)}
                        >
                          <IconCheck size={16} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                    <Tooltip label="Edit">
                      <ActionIcon
                        variant="light"
                        onClick={() => {
                          setEditingRole(userRole);
                          setModalOpen(true);
                        }}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Revoke">
                      <ActionIcon
                        color="red"
                        variant="light"
                        onClick={() => handleRevokeRole(userRole.id)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      {/* Role Assignment Modal */}
      <Modal
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingRole(null);
        }}
        title={editingRole ? 'Edit Role Assignment' : 'Assign Finance Role'}
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            label="User ID"
            placeholder="Enter user UUID"
            required
            defaultValue={editingRole?.user_id || ''}
            disabled={!!editingRole}
          />
          <Select
            label="Role"
            data={roles.map(r => ({ value: r.id, label: r.role_name }))}
            required
            defaultValue={editingRole?.role_id || null}
          />
          <Select
            label="Entity (Optional - leave blank for all entities)"
            data={[
              { value: '', label: 'All Entities' },
              ...entities.map(e => ({ value: e.id, label: e.entity_name }))
            ]}
            defaultValue={editingRole?.entity_id || ''}
            clearable
          />
          <TextInput
            label="GL Account Ranges (Optional)"
            placeholder="e.g., 1000-1999, 2000-2999"
            defaultValue={editingRole?.gl_account_ranges?.join(', ') || ''}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {/* Handle form submission */}}>
              {editingRole ? 'Update' : 'Assign'} Role
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};


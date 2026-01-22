// Admin Page: Tester Enrollment Management
// View enrollments, select testers, view credit grants

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Stack,
  Group,
  Text,
  Title,
  Button,
  Table,
  Badge,
  Loader,
  Paper,
  ActionIcon,
  TextInput,
  Select,
  Alert,
  Modal,
} from '@mantine/core';
import { IconCheck, IconX, IconSearch, IconDeviceMobile, IconApple } from '@tabler/icons-react';
import { useToast } from '@/hooks/use-toast';

const TesterEnrollmentManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string | null>('all');
  const [statusFilter, setStatusFilter] = useState<string | null>('all');
  const [selectedCount, setSelectedCount] = useState(0);
  const [selectModalOpen, setSelectModalOpen] = useState(false);
  const [bulkSelectCount, setBulkSelectCount] = useState(10);

  useEffect(() => {
    fetchEnrollments();
  }, []);

  useEffect(() => {
    const count = enrollments.filter(e => e.is_selected_tester).length;
    setSelectedCount(count);
  }, [enrollments]);

  const fetchEnrollments = async () => {
    try {
      const { data, error } = await supabase
        .from('android_tester_enrollments')
        .select('*')
        .order('enrolled_at', { ascending: false });

      if (error) throw error;
      setEnrollments(data || []);
    } catch (error: any) {
      console.error('Error fetching enrollments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load enrollments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTesterSelection = async (enrollmentId: string, isSelected: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('android_tester_enrollments')
        .update({
          is_selected_tester: !isSelected,
          selected_at: !isSelected ? new Date().toISOString() : null,
          selected_by: !isSelected ? user?.id : null,
        })
        .eq('id', enrollmentId);

      if (error) throw error;

      await fetchEnrollments();

      toast({
        title: 'Success',
        description: isSelected ? 'Tester deselected' : 'Tester selected',
        variant: 'default',
      });
    } catch (error: any) {
      console.error('Error toggling selection:', error);
      toast({
        title: 'Error',
        description: 'Failed to update selection',
        variant: 'destructive',
      });
    }
  };

  const bulkSelectTesters = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const unselected = enrollments
        .filter(e => !e.is_selected_tester && selectedCount < 100)
        .slice(0, Math.min(bulkSelectCount, 100 - selectedCount));

      if (unselected.length === 0) {
        toast({
          title: 'No testers to select',
          description: 'All available slots are filled or no unselected enrollments',
          variant: 'default',
        });
        return;
      }

      for (const enrollment of unselected) {
        const { error } = await supabase
          .from('android_tester_enrollments')
          .update({
            is_selected_tester: true,
            selected_at: new Date().toISOString(),
            selected_by: user?.id,
          })
          .eq('id', enrollment.id);

        if (error) throw error;
      }

      await fetchEnrollments();
      setSelectModalOpen(false);

      toast({
        title: 'Success',
        description: `Selected ${unselected.length} testers`,
        variant: 'default',
      });
    } catch (error: any) {
      console.error('Error bulk selecting:', error);
      toast({
        title: 'Error',
        description: 'Failed to select testers',
        variant: 'destructive',
      });
    }
  };

  const filteredEnrollments = enrollments.filter(e => {
    const matchesSearch = 
      e.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = platformFilter === 'all' || e.platform === platformFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'selected' && e.is_selected_tester) ||
      (statusFilter === 'unselected' && !e.is_selected_tester);
    return matchesSearch && matchesPlatform && matchesStatus;
  });

  if (loading) {
    return (
      <Box p="xl">
        <Loader size="lg" />
      </Box>
    );
  }

  return (
    <Box p="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={2}>Tester Enrollment Management</Title>
          <Button onClick={() => navigate('/admin/promo')} variant="subtle">
            Back to Promo Management
          </Button>
        </Group>

        <Alert color="blue">
          <Text size="sm">
            <strong>Selected Testers:</strong> {selectedCount} / 100
            <br />
            Selected testers receive an additional $50 credit ($75 total) when they create an account.
          </Text>
        </Alert>

        <Group>
          <TextInput
            placeholder="Search by email or name..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="Platform"
            value={platformFilter}
            onChange={setPlatformFilter}
            data={[
              { value: 'all', label: 'All Platforms' },
              { value: 'android', label: 'Android' },
              { value: 'ios', label: 'iOS' },
            ]}
          />
          <Select
            placeholder="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            data={[
              { value: 'all', label: 'All' },
              { value: 'selected', label: 'Selected' },
              { value: 'unselected', label: 'Unselected' },
            ]}
          />
          {selectedCount < 100 && (
            <Button
              onClick={() => setSelectModalOpen(true)}
              disabled={selectedCount >= 100}
            >
              Bulk Select
            </Button>
          )}
        </Group>

        <Paper withBorder>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Email</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Platform</Table.Th>
                <Table.Th>Enrolled</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredEnrollments.map((enrollment) => (
                <Table.Tr key={enrollment.id}>
                  <Table.Td>{enrollment.email}</Table.Td>
                  <Table.Td>{enrollment.full_name}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      {enrollment.platform === 'android' ? (
                        <IconDeviceMobile size={16} />
                      ) : (
                        <IconApple size={16} />
                      )}
                      <Text size="sm" tt="capitalize">{enrollment.platform}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    {new Date(enrollment.enrolled_at).toLocaleDateString()}
                  </Table.Td>
                  <Table.Td>
                    {enrollment.is_selected_tester ? (
                      <Badge color="green">Selected</Badge>
                    ) : (
                      <Badge color="gray">Not Selected</Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      variant="subtle"
                      color={enrollment.is_selected_tester ? 'red' : 'green'}
                      onClick={() => toggleTesterSelection(enrollment.id, enrollment.is_selected_tester)}
                      disabled={!enrollment.is_selected_tester && selectedCount >= 100}
                    >
                      {enrollment.is_selected_tester ? <IconX size={16} /> : <IconCheck size={16} />}
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>

        <Modal
          opened={selectModalOpen}
          onClose={() => setSelectModalOpen(false)}
          title="Bulk Select Testers"
        >
          <Stack gap="md">
            <Text size="sm">
              Select the next {Math.min(bulkSelectCount, 100 - selectedCount)} unselected testers?
            </Text>
            <TextInput
              label="Number to select"
              type="number"
              value={bulkSelectCount}
              onChange={(e) => setBulkSelectCount(Math.min(parseInt(e.target.value) || 1, 100 - selectedCount))}
              min={1}
              max={100 - selectedCount}
            />
            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setSelectModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={bulkSelectTesters}>
                Select Testers
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Box>
  );
};

export default TesterEnrollmentManagement;


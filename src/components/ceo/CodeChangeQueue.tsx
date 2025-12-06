// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Button,
  Badge,
  Modal,
  Textarea,
  Group,
  Stack,
  Title,
  Text,
  Card,
  Box,
  Divider,
  Loader,
  ActionIcon,
  Table,
  ScrollArea,
  Pagination,
  Select,
  Code,
  Tabs,
} from '@mantine/core';
import {
  IconCheck,
  IconX,
  IconCode,
  IconFileText,
  IconGitBranch,
  IconUser,
  IconClock,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';
import { notifications } from '@mantine/notifications';
import type { CodeChangeRequest } from '@/types/tech-support';

export const CodeChangeQueue: React.FC = () => {
  const [requests, setRequests] = useState<CodeChangeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CodeChangeRequest | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  useEffect(() => {
    fetchRequests();
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('code-change-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'code_change_requests'
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('code_change_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Try to get user emails from employees table or user_profiles
      const userIds = new Set<string>();
      (data || []).forEach((req: any) => {
        if (req.developer_id) userIds.add(req.developer_id);
        if (req.reviewer_id) userIds.add(req.reviewer_id);
      });

      const userEmails: Record<string, string> = {};
      if (userIds.size > 0) {
        // Try employees table first
        const { data: employees } = await supabase
          .from('employees')
          .select('user_id, email, work_email')
          .in('user_id', Array.from(userIds));
        
        (employees || []).forEach((emp: any) => {
          userEmails[emp.user_id] = emp.email || emp.work_email || 'Unknown';
        });

        // Try user_profiles for remaining users
        const remainingIds = Array.from(userIds).filter(id => !userEmails[id]);
        if (remainingIds.length > 0) {
          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('user_id, full_name')
            .in('user_id', remainingIds);
          
          // For user_profiles, we don't have email, so we'll use the ID
          (profiles || []).forEach((profile: any) => {
            if (!userEmails[profile.user_id]) {
              userEmails[profile.user_id] = profile.full_name || profile.user_id.substring(0, 8) + '...';
            }
          });
        }
      }

      // Map user emails to requests
      const requestsWithEmails = (data || []).map((req: any) => ({
        ...req,
        developer: req.developer_id ? { email: userEmails[req.developer_id] || req.developer_id.substring(0, 8) + '...' } : null,
        reviewer: req.reviewer_id ? { email: userEmails[req.reviewer_id] || req.reviewer_id.substring(0, 8) + '...' } : null,
      }));

      setRequests(requestsWithEmails as CodeChangeRequest[]);
    } catch (error) {
      console.error('Error fetching code change requests:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load code change requests',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: CodeChangeRequest) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('code_change_requests')
        .update({
          status: 'approved',
          reviewer_id: user.id,
          review_notes: reviewNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (error) throw error;

      await supabase.rpc('log_ceo_action', {
        p_action_type: 'approved_code_change',
        p_action_category: 'technology',
        p_target_type: 'code_change_request',
        p_target_id: request.id,
        p_target_name: request.request_number,
        p_description: `Approved code change request ${request.request_number} for ${request.file_path} in ${request.repository}`,
        p_severity: 'high'
      }).catch(() => {
        // RPC might not exist, that's okay
      });

      notifications.show({
        title: 'Approval Granted',
        message: `Code change request ${request.request_number} has been approved`,
        color: 'green',
        icon: <IconCheck size={18} />,
      });
      setModalVisible(false);
      setReviewNotes('');
      fetchRequests();
    } catch (error: any) {
      console.error('Error approving:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to approve',
        color: 'red',
      });
    }
  };

  const handleDeny = async (request: CodeChangeRequest) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (!reviewNotes.trim()) {
        notifications.show({
          title: 'Review Notes Required',
          message: 'Please provide a reason for denying this request',
          color: 'orange',
        });
        return;
      }

      const { error } = await supabase
        .from('code_change_requests')
        .update({
          status: 'rejected',
          reviewer_id: user.id,
          review_notes: reviewNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (error) throw error;

      await supabase.rpc('log_ceo_action', {
        p_action_type: 'denied_code_change',
        p_action_category: 'technology',
        p_target_type: 'code_change_request',
        p_target_id: request.id,
        p_target_name: request.request_number,
        p_description: `Denied code change request ${request.request_number} for ${request.file_path} in ${request.repository}`,
        p_severity: 'high'
      }).catch(() => {
        // RPC might not exist, that's okay
      });

      notifications.show({
        title: 'Request Denied',
        message: `Code change request ${request.request_number} has been denied`,
        color: 'red',
        icon: <IconX size={18} />,
      });
      setModalVisible(false);
      setReviewNotes('');
      fetchRequests();
    } catch (error: any) {
      console.error('Error denying:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to deny',
        color: 'red',
      });
    }
  };

  const openReviewModal = (request: CodeChangeRequest) => {
    setSelectedRequest(request);
    setReviewNotes(request.review_notes || '');
    setModalVisible(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'yellow';
      case 'approved':
        return 'green';
      case 'rejected':
        return 'red';
      case 'merged':
        return 'blue';
      case 'needs_changes':
        return 'orange';
      default:
        return 'gray';
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const paginatedRequests = requests.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <Box p="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2} mb="xs">Code Change Queue</Title>
          <Text c="dimmed">
            Review and approve code changes submitted by developers
          </Text>
        </div>
        <Select
          value={statusFilter}
          onChange={(value) => setStatusFilter(value || 'all')}
          data={[
            { value: 'all', label: 'All Requests' },
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'merged', label: 'Merged' },
            { value: 'needs_changes', label: 'Needs Changes' },
          ]}
          style={{ width: 200 }}
        />
      </Group>

      {loading ? (
        <Loader size="lg" />
      ) : (
        <>
          <Card shadow="sm" p="lg" radius="md" withBorder mb="md">
            <Group justify="space-between">
              <Text fw={500}>Pending Review: {pendingCount}</Text>
              <Text size="sm" c="dimmed">
                Total Requests: {requests.length}
              </Text>
            </Group>
          </Card>

          <ScrollArea>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Request #</Table.Th>
                  <Table.Th>Developer</Table.Th>
                  <Table.Th>Repository</Table.Th>
                  <Table.Th>File</Table.Th>
                  <Table.Th>Branch</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Created</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {paginatedRequests.map((request) => (
                  <Table.Tr key={request.id}>
                    <Table.Td>
                      <Text fw={500}>{request.request_number}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <IconUser size={16} />
                        <Text size="sm">
                          {request.developer?.email || 'Unknown'}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light">{request.repository}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" style={{ maxWidth: 200 }} truncate>
                        {request.file_path}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <IconGitBranch size={14} />
                        <Text size="sm">{request.branch_name}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <IconClock size={14} />
                        <Text size="sm">
                          {dayjs(request.created_at).format('MMM D, YYYY')}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon
                          color="blue"
                          variant="light"
                          onClick={() => openReviewModal(request)}
                        >
                          <IconFileText size={16} />
                        </ActionIcon>
                        {request.status === 'pending' && (
                          <>
                            <ActionIcon
                              color="green"
                              variant="light"
                              onClick={() => openReviewModal(request)}
                              title="Approve"
                            >
                              <IconCheck size={16} />
                            </ActionIcon>
                            <ActionIcon
                              color="red"
                              variant="light"
                              onClick={() => openReviewModal(request)}
                              title="Deny"
                            >
                              <IconX size={16} />
                            </ActionIcon>
                          </>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>

          {requests.length > pageSize && (
            <Pagination
              value={currentPage}
              onChange={setCurrentPage}
              total={Math.ceil(requests.length / pageSize)}
              mt="md"
            />
          )}

          {requests.length === 0 && (
            <Card p="xl" mt="md">
              <Text ta="center" c="dimmed">
                No code change requests found
              </Text>
            </Card>
          )}
        </>
      )}

      {/* Review Modal */}
      <Modal
        opened={modalVisible}
        onClose={() => setModalVisible(false)}
        title={`Review Code Change: ${selectedRequest?.request_number}`}
        size="xl"
      >
        {selectedRequest && (
          <Stack gap="md">
            <div>
              <Text fw={500} mb="xs">Developer</Text>
              <Text>{selectedRequest.developer?.email || 'Unknown'}</Text>
            </div>
            <div>
              <Text fw={500} mb="xs">Repository</Text>
              <Badge>{selectedRequest.repository}</Badge>
            </div>
            <div>
              <Text fw={500} mb="xs">File Path</Text>
              <Text>{selectedRequest.file_path}</Text>
            </div>
            <div>
              <Text fw={500} mb="xs">Branch</Text>
              <Text>{selectedRequest.branch_name}</Text>
            </div>
            {selectedRequest.commit_message && (
              <div>
                <Text fw={500} mb="xs">Commit Message</Text>
                <Text>{selectedRequest.commit_message}</Text>
              </div>
            )}

            <Divider />

            <Tabs defaultValue="diff">
              <Tabs.List>
                <Tabs.Tab value="diff">Code Diff</Tabs.Tab>
                <Tabs.Tab value="new">New Content</Tabs.Tab>
                {selectedRequest.old_content && (
                  <Tabs.Tab value="old">Old Content</Tabs.Tab>
                )}
              </Tabs.List>

              <Tabs.Panel value="diff" pt="md">
                <ScrollArea h={400}>
                  <Code block style={{ fontSize: 12 }}>
                    {selectedRequest.old_content
                      ? `--- ${selectedRequest.file_path}\n+++ ${selectedRequest.file_path}\n${generateDiff(selectedRequest.old_content, selectedRequest.new_content)}`
                      : selectedRequest.new_content}
                  </Code>
                </ScrollArea>
              </Tabs.Panel>

              <Tabs.Panel value="new" pt="md">
                <ScrollArea h={400}>
                  <Code block style={{ fontSize: 12 }}>
                    {selectedRequest.new_content}
                  </Code>
                </ScrollArea>
              </Tabs.Panel>

              {selectedRequest.old_content && (
                <Tabs.Panel value="old" pt="md">
                  <ScrollArea h={400}>
                    <Code block style={{ fontSize: 12 }}>
                      {selectedRequest.old_content}
                    </Code>
                  </ScrollArea>
                </Tabs.Panel>
              )}
            </Tabs>

            <Divider />

            <Textarea
              label="Review Notes"
              placeholder="Add your review notes or reason for approval/denial..."
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              minRows={3}
            />

            <Group justify="flex-end" mt="md">
              <Button
                variant="outline"
                onClick={() => setModalVisible(false)}
              >
                Cancel
              </Button>
              <Button
                color="green"
                leftSection={<IconCheck size={16} />}
                onClick={() => handleApprove(selectedRequest)}
              >
                Approve
              </Button>
              <Button
                color="red"
                leftSection={<IconX size={16} />}
                onClick={() => handleDeny(selectedRequest)}
              >
                Deny
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Box>
  );
};

// Simple diff generator
function generateDiff(oldContent: string, newContent: string): string {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  let diff = '';
  
  // Simple line-by-line comparison
  const maxLines = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLines; i++) {
    if (i >= oldLines.length) {
      diff += `+${newLines[i]}\n`;
    } else if (i >= newLines.length) {
      diff += `-${oldLines[i]}\n`;
    } else if (oldLines[i] !== newLines[i]) {
      diff += `-${oldLines[i]}\n`;
      diff += `+${newLines[i]}\n`;
    } else {
      diff += ` ${oldLines[i]}\n`;
    }
  }
  
  return diff;
}


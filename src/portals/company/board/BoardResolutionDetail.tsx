import React, { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Stack,
  Card,
  Badge,
  Group,
  Button,
  Paper,
  Loader,
  Center,
  Divider,
  Table,
  Grid,
  Modal,
} from '@mantine/core';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import { useParams, useNavigate } from 'react-router-dom';
import { IconArrowLeft, IconCheck, IconX, IconPlayerPlay } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { canManageGovernance } from '@/lib/roles';

interface BoardResolution {
  id: string;
  resolution_number: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  meeting_date?: string;
  effective_date?: string;
  created_at: string;
}

interface Vote {
  id: string;
  vote: string;
  comment?: string;
  board_member: {
    full_name: string;
    email: string;
  };
  created_at: string;
}

const BoardResolutionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [resolution, setResolution] = useState<BoardResolution | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [adoptModalOpen, setAdoptModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchResolution();
      fetchVotes();
      checkPermissions();
    }
  }, [id]);

  const checkPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email === 'tstroman.ceo@cravenusa.com') {
        setCanManage(true);
        return;
      }
      const roles = await import('@/lib/roles').then(m => m.fetchUserRoles());
      setCanManage(canManageGovernance(roles));
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const fetchResolution = async () => {
    try {
      // Try governance_board_resolutions first
      let { data, error } = await supabase
        .from('governance_board_resolutions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      // If not found in governance_board_resolutions, try board_resolutions
      if (!data && !error) {
        const { data: boardRes, error: boardError } = await supabase
          .from('board_resolutions')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (boardError) throw boardError;
        
        if (boardRes) {
          // Transform board_resolutions format to match governance format
          data = {
            id: boardRes.id,
            resolution_number: boardRes.resolution_number,
            title: boardRes.resolution_title || `Removal of ${boardRes.subject_person_name} as ${boardRes.subject_position}`,
            description: boardRes.resolution_text,
            type: boardRes.resolution_type === 'removal' ? 'EXECUTIVE_REMOVAL' : boardRes.resolution_type?.toUpperCase() || 'OTHER',
            status: boardRes.status === 'pending' ? 'PENDING_VOTE' : boardRes.status === 'approved' ? 'ADOPTED' : boardRes.status === 'rejected' ? 'REJECTED' : boardRes.status?.toUpperCase() || 'DRAFT',
            created_by: boardRes.created_by,
            meeting_date: null,
            effective_date: boardRes.effective_date,
            created_at: boardRes.created_at,
          };
        }
      }

      if (error) throw error;
      
      if (!data) {
        throw new Error('Resolution not found');
      }
      
      setResolution(data);
    } catch (error: any) {
      console.error('Error fetching resolution:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load resolution',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchVotes = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('board_resolution_votes')
        .select(`
          *,
          board_member:board_members(full_name, email)
        `)
        .eq('resolution_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // @ts-ignore - Database query type compatibility
      setVotes(data || []);
    } catch (error: any) {
      console.error('Error fetching votes:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'gray';
      case 'PENDING_VOTE':
        return 'blue';
      case 'ADOPTED':
        return 'green';
      case 'EXECUTED':
        return 'green';
      case 'REJECTED':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getVoteColor = (vote: string) => {
    switch (vote) {
      case 'YES':
        return 'green';
      case 'NO':
        return 'red';
      case 'ABSTAIN':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const handleManualAdopt = async () => {
    if (!resolution) return;
    setProcessing(true);
    try {
      const { error } = await supabase.functions.invoke('governance-manual-adopt-resolution', {
        body: {
          resolution_id: resolution.id,
          action: 'ADOPT',
        },
      });

      if (error) throw error;

      notifications.show({
        title: 'Success',
        message: 'Resolution manually adopted',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      setAdoptModalOpen(false);
      fetchResolution();
      fetchVotes();
    } catch (error: any) {
      console.error('Error adopting resolution:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to adopt resolution',
        color: 'red',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleManualReject = async () => {
    if (!resolution) return;
    setProcessing(true);
    try {
      const { error } = await supabase.functions.invoke('governance-manual-adopt-resolution', {
        body: {
          resolution_id: resolution.id,
          action: 'REJECT',
        },
      });

      if (error) throw error;

      notifications.show({
        title: 'Success',
        message: 'Resolution manually rejected',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      setRejectModalOpen(false);
      fetchResolution();
      fetchVotes();
    } catch (error: any) {
      console.error('Error rejecting resolution:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to reject resolution',
        color: 'red',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleExecuteResolution = async () => {
    if (!resolution) return;
    setProcessing(true);
    try {
      const { error } = await supabase.functions.invoke('governance-execute-resolution', {
        body: {
          resolution_id: resolution.id,
        },
      });

      if (error) throw error;

      notifications.show({
        title: 'Success',
        message: 'Resolution executed successfully',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      fetchResolution();
      fetchVotes();
    } catch (error: any) {
      console.error('Error executing resolution:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to execute resolution',
        color: 'red',
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Center h={400}>
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }

  if (!resolution) {
    return (
      <Container size="xl" py="xl">
        <Paper p="xl" withBorder style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }}>
          <Center>
            <Text c="dimmed">Resolution not found</Text>
          </Center>
        </Paper>
      </Container>
    );
  }

  const voteCounts = {
    YES: votes.filter((v) => v.vote === 'YES').length,
    NO: votes.filter((v) => v.vote === 'NO').length,
    ABSTAIN: votes.filter((v) => v.vote === 'ABSTAIN').length,
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Group>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate('/company/board')}
          >
            Back to Board Dashboard
          </Button>
        </Group>

        <Card
          padding="lg"
          radius="md"
          withBorder
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
          }}
        >
          <Stack gap="md">
            <Group justify="space-between">
              <div>
                <Title order={2} c="dark" mb="xs">
                  {resolution.title}
                </Title>
                <Text c="dimmed">Resolution #{resolution.resolution_number}</Text>
              </div>
              <Badge color={getStatusColor(resolution.status)} size="lg" variant="light">
                {resolution.status}
              </Badge>
            </Group>

            <Divider />

            {resolution.description && (
              <div>
                <Text fw={500} c="dark" mb="xs">
                  Description
                </Text>
                <Text c="dimmed">{resolution.description}</Text>
              </div>
            )}

            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Text fw={500} c="dark" mb="xs">
                  Type
                </Text>
                <Badge variant="light">{resolution.type.replace('_', ' ')}</Badge>
              </Grid.Col>
              {resolution.meeting_date && (
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Text fw={500} c="dark" mb="xs">
                    Meeting Date
                  </Text>
                  <Text c="dimmed">
                    {dayjs(resolution.meeting_date).format('MMMM D, YYYY')}
                  </Text>
                </Grid.Col>
              )}
              {resolution.effective_date && (
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Text fw={500} c="dark" mb="xs">
                    Effective Date
                  </Text>
                  <Text c="dimmed">
                    {dayjs(resolution.effective_date).format('MMMM D, YYYY')}
                  </Text>
                </Grid.Col>
              )}
            </Grid>

            <Divider />

            {canManage && resolution.status === 'PENDING_VOTE' && (
              <Group mb="md">
                <Button
                  leftSection={<IconCheck size={16} />}
                  color="green"
                  onClick={() => setAdoptModalOpen(true)}
                >
                  Manually Adopt Resolution
                </Button>
                <Button
                  leftSection={<IconX size={16} />}
                  color="red"
                  variant="outline"
                  onClick={() => setRejectModalOpen(true)}
                >
                  Manually Reject Resolution
                </Button>
              </Group>
            )}

            {canManage && resolution.status === 'ADOPTED' && (
              <Group mb="md">
                <Button
                  leftSection={<IconPlayerPlay size={16} />}
                  color="blue"
                  onClick={handleExecuteResolution}
                  loading={processing}
                >
                  Execute Resolution
                </Button>
                <Text size="sm" c="dimmed">
                  Execute this resolution to complete the appointment process and send notifications
                </Text>
              </Group>
            )}

            <div>
              <Title order={3} c="dark" mb="md">
                Voting Results
              </Title>
              <Group mb="md">
                <Badge color="green" size="lg" variant="light">
                  Yes: {voteCounts.YES}
                </Badge>
                <Badge color="red" size="lg" variant="light">
                  No: {voteCounts.NO}
                </Badge>
                <Badge color="gray" size="lg" variant="light">
                  Abstain: {voteCounts.ABSTAIN}
                </Badge>
              </Group>

              {votes.length > 0 ? (
                <Paper withBorder style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th c="dimmed">Board Member</Table.Th>
                        <Table.Th c="dimmed">Vote</Table.Th>
                        <Table.Th c="dimmed">Comment</Table.Th>
                        <Table.Th c="dimmed">Date</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {votes.map((voteItem) => (
                        <Table.Tr key={voteItem.id}>
                          <Table.Td>
                            <Text c="dark">
                              {voteItem.board_member?.full_name || 'Unknown'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge color={getVoteColor(voteItem.vote)} variant="light">
                              {voteItem.vote}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text c="dimmed" size="sm">
                              {voteItem.comment || 'No comment'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text c="dimmed" size="sm">
                              {dayjs(voteItem.created_at).format('MMM D, YYYY HH:mm')}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Paper>
              ) : (
                <Text c="dimmed">No votes cast yet</Text>
              )}
            </div>
          </Stack>
        </Card>
      </Stack>

      {/* Manual Adopt Modal */}
      <Modal
        opened={adoptModalOpen}
        onClose={() => setAdoptModalOpen(false)}
        title="Manually Adopt Resolution"
        size="md"
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to manually adopt this resolution? This will immediately approve the resolution and finalize any associated appointments.
          </Text>
          {resolution?.type === 'EXECUTIVE_APPOINTMENT' && (
            <Paper p="md" withBorder style={{ backgroundColor: '#f9fafb' }}>
              <Text size="sm" c="dimmed">
                This will also approve the executive appointment and create a corporate officer record.
              </Text>
            </Paper>
          )}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setAdoptModalOpen(false)}>
              Cancel
            </Button>
            <Button color="green" onClick={handleManualAdopt} loading={processing}>
              Adopt Resolution
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Manual Reject Modal */}
      <Modal
        opened={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Manually Reject Resolution"
        size="md"
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to manually reject this resolution? This will immediately reject the resolution.
          </Text>
          {resolution?.type === 'EXECUTIVE_APPOINTMENT' && (
            <Paper p="md" withBorder style={{ backgroundColor: '#f9fafb' }}>
              <Text size="sm" c="dimmed">
                The associated executive appointment will remain in SENT_TO_BOARD status.
              </Text>
            </Paper>
          )}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleManualReject} loading={processing}>
              Reject Resolution
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
};

export default BoardResolutionDetail;

import React, { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Stack,
  Card,
  Table,
  Badge,
  Button,
  Group,
  Modal,
  Textarea,
  Select,
  Progress,
  Alert,
  Loader,
} from '@mantine/core';
import { IconCheckbox, IconCheck, IconX, IconMinus, IconAlertCircle } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';

interface Resolution {
  id: string;
  resolution_number: string;
  title: string;
  description: string;
  type: string;
  status: string;
  meeting_date: string;
  effective_date: string;
  created_at: string;
  votes?: {
    YES: number;
    NO: number;
    ABSTAIN: number;
  };
  total_board_members?: number;
  total_votes?: number;
}

const ResolutionVotingDashboard: React.FC = () => {
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [voteModalOpen, setVoteModalOpen] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState<Resolution | null>(null);
  const [vote, setVote] = useState<string>('');
  const [comment, setComment] = useState('');
  const [submittingVote, setSubmittingVote] = useState(false);

  useEffect(() => {
    loadResolutions();
  }, []);

  const loadResolutions = async () => {
    try {
      const { data, error } = await supabase
        .from('governance_board_resolutions')
        .select('*')
        .in('status', ['DRAFT', 'PENDING_VOTE', 'ADOPTED', 'REJECTED'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Load vote counts for each resolution
      const resolutionsWithVotes = await Promise.all(
        (data || []).map(async (resolution) => {
          const { data: votes } = await supabase
            .from('board_resolution_votes')
            .select('vote')
            .eq('resolution_id', resolution.id);

          const voteCounts = {
            YES: votes?.filter((v) => v.vote === 'YES').length || 0,
            NO: votes?.filter((v) => v.vote === 'NO').length || 0,
            ABSTAIN: votes?.filter((v) => v.vote === 'ABSTAIN').length || 0,
          };

          // @ts-ignore - Deep type instantiation
          const { count: totalBoardMembers } = await supabase
            .from('board_members')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Active');

          return {
            ...resolution,
            votes: voteCounts,
            total_board_members: totalBoardMembers || 0,
            total_votes: voteCounts.YES + voteCounts.NO + voteCounts.ABSTAIN,
          };
        })
      );

      setResolutions(resolutionsWithVotes);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load resolutions',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    if (!selectedResolution || !vote) return;

    setSubmittingVote(true);
    try {
      // Use fetch directly to get better error details
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/governance-cast-vote`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          },
          body: JSON.stringify({
            resolution_id: selectedResolution.id,
            vote,
            comment: comment || null,
          }),
        }
      );

      const responseData = await response.json();
      console.log('Vote submission response:', { status: response.status, data: responseData });

      if (!response.ok) {
        const errorMessage = responseData?.error || responseData?.message || `HTTP ${response.status}: Failed to submit vote`;
        throw new Error(errorMessage);
      }

      if (responseData?.error) {
        throw new Error(typeof responseData.error === 'string' ? responseData.error : responseData.error.message || 'Vote submission failed');
      }

      notifications.show({
        title: 'Success',
        message: 'Vote cast successfully',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      setVoteModalOpen(false);
      setVote('');
      setComment('');
      setSelectedResolution(null);
      loadResolutions();
    } catch (error: any) {
      console.error('Vote submission catch error:', error);
      const errorMessage = error?.message || error?.error || 'Failed to cast vote. Please try again.';
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setSubmittingVote(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ADOPTED':
        return 'green';
      case 'REJECTED':
        return 'red';
      case 'PENDING_VOTE':
        return 'yellow';
      case 'DRAFT':
        return 'gray';
      default:
        return 'blue';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ADOPTED':
        return 'Adopted';
      case 'REJECTED':
        return 'Rejected';
      case 'PENDING_VOTE':
        return 'Pending Vote';
      case 'DRAFT':
        return 'Draft';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Loader size="lg" />
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={2} c="dark" mb="xs">
            <IconCheckbox size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 12}} />
            Resolution Voting Dashboard
          </Title>
          <Text c="dimmed">
            View and vote on pending board resolutions.
          </Text>
        </div>

        <Card padding="lg" radius="md" withBorder>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Resolution #</Table.Th>
                <Table.Th>Title</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Votes</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {resolutions.map((resolution) => (
                <Table.Tr key={resolution.id}>
                  <Table.Td>{resolution.resolution_number}</Table.Td>
                  <Table.Td>
                    <Text fw={500}>{resolution.title}</Text>
                    {resolution.description && (
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {resolution.description}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light">{resolution.type}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={500} c={getStatusColor(resolution.status)}>
                      {getStatusLabel(resolution.status)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {resolution.votes && (
                      <Stack gap={4}>
                        <Text size="xs">
                          ✅ {resolution.votes.YES} | ❌ {resolution.votes.NO} | ⚪ {resolution.votes.ABSTAIN}
                        </Text>
                        {resolution.total_board_members && (
                          <Progress
                            value={(resolution.total_votes || 0) / resolution.total_board_members * 100}
                            size="xs"
                            color="blue"
                          />
                        )}
                      </Stack>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {resolution.status === 'PENDING_VOTE' && (
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => {
                          setSelectedResolution(resolution);
                          setVoteModalOpen(true);
                        }}
                      >
                        Vote
                      </Button>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          {resolutions.length === 0 && (
            <Alert icon={<IconAlertCircle size={16} />} title="No Resolutions" color="blue" mt="md">
              No resolutions found. Create a new resolution to get started.
            </Alert>
          )}
        </Card>

        <Modal
          opened={voteModalOpen}
          onClose={() => {
            setVoteModalOpen(false);
            setSelectedResolution(null);
            setVote('');
            setComment('');
          }}
          title={`Vote on ${selectedResolution?.resolution_number}`}
        >
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              {selectedResolution?.title}
            </Text>

            <Select
              label="Your Vote"
              placeholder="Select your vote"
              data={[
                { value: 'YES', label: 'Yes - Approve' },
                { value: 'NO', label: 'No - Reject' },
                { value: 'ABSTAIN', label: 'Abstain' },
              ]}
              value={vote}
              onChange={(value) => setVote(value || '')}
              required
            />

            <Textarea
              label="Comment (Optional)"
              placeholder="Add any comments about your vote..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              minRows={3}
            />

            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setVoteModalOpen(false);
                  setSelectedResolution(null);
                  setVote('');
                  setComment('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleVote}
                loading={submittingVote}
                disabled={!vote}
                leftSection={vote === 'YES' ? <IconCheck size={16} /> : vote === 'NO' ? <IconX size={16} /> : <IconMinus size={16} />}
              >
                Submit Vote
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
};

export default ResolutionVotingDashboard;


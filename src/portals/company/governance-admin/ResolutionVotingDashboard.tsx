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
import dayjs from 'dayjs';
import { notifications } from '@mantine/notifications';

const SUPABASE_FUNCTIONS_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://xaxbucnjlrfkccsfiddq.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhheGJ1Y25qbHJma2Njc2ZpZGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyODMyODAsImV4cCI6MjA3Mjg1OTI4MH0.3ETuLETgSEj6W8gYi7WAoUFDPNo4IwTjuSnVtt1BCFE';

console.log('📦 [VOTING] ResolutionVotingDashboard module loaded');

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
  governance_resolution_id?: string; // Store the governance resolution ID for voting
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
    console.log('🚀 [VOTING] Component mounted, loading resolutions...');
    loadResolutions();
  }, []);

  // Track state changes
  useEffect(() => {
    console.log('🔄 [VOTING] State changed - Resolutions:', resolutions.length, 'Loading:', loading);
  }, [resolutions, loading]);

  const loadResolutions = async () => {
    setLoading(true);
    try {
      console.log('🔍 [VOTING] Loading resolutions...');
      
      // Fetch from both tables to show all resolutions (no status filter - show all)
      const [governanceRes, boardRes] = await Promise.all([
        supabase
          .from('governance_board_resolutions')
          .select('*')
          .order('created_at', { ascending: false })
          .then(({ data, error }) => {
            if (error && error.code !== '42P01') {
              console.warn('❌ [VOTING] Error fetching governance_board_resolutions:', error);
            }
            console.log(`✅ [VOTING] Fetched ${data?.length || 0} governance resolutions`);
            return data || [];
          }),
        supabase
          .from('board_resolutions')
          .select('*')
          .order('created_at', { ascending: false })
          .then(({ data, error }) => {
            if (error && error.code !== '42P01') {
              console.warn('❌ [VOTING] Error fetching board_resolutions:', error);
            }
            console.log(`✅ [VOTING] Fetched ${data?.length || 0} board resolutions`);
            return data || [];
          }),
      ]);

      // Transform board_resolutions to match governance format
      const transformedBoardRes = (boardRes || []).map((br: any) => ({
        id: br.id,
        resolution_number: br.resolution_number,
        title: br.resolution_title || `Removal of ${br.subject_person_name} as ${br.subject_position}`,
        description: br.resolution_text,
        type: br.resolution_type === 'removal' ? 'EXECUTIVE_REMOVAL' : br.resolution_type?.toUpperCase() || 'OTHER',
        status: br.status === 'pending' ? 'PENDING_VOTE' : br.status === 'approved' ? 'ADOPTED' : br.status === 'rejected' ? 'REJECTED' : br.status?.toUpperCase() || 'DRAFT',
        created_by: br.created_by,
        meeting_date: null,
        effective_date: br.effective_date,
        created_at: br.created_at,
        updated_at: br.updated_at,
      }));

      // Combine and deduplicate by resolution_number
      // IMPORTANT: Prioritize governance_board_resolutions over board_resolutions
      // because votes must reference governance_board_resolutions.id
      const resolutionMap = new Map();
      
      // First, add all board_resolutions (they might have notes with governance_resolution_id)
      // But DON'T set governance_resolution_id yet - we'll look it up later
      transformedBoardRes.forEach((r: any) => {
        resolutionMap.set(r.resolution_number, {
          ...r,
          governance_resolution_id: undefined, // Will be set during vote lookup
        });
      });
      
      // Then, add governance resolutions (they will overwrite board_resolutions with same number)
      // This ensures we always use the governance resolution ID when available
      governanceRes.forEach((r: any) => {
        const existing = resolutionMap.get(r.resolution_number);
        if (existing) {
          // Merge: keep governance resolution but preserve any additional data from board_resolutions
          resolutionMap.set(r.resolution_number, {
            ...existing,
            ...r,
            id: r.id, // Always use governance resolution ID
            governance_resolution_id: r.id, // Explicitly set this
          });
        } else {
          resolutionMap.set(r.resolution_number, {
            ...r,
            governance_resolution_id: r.id, // Explicitly set this
          });
        }
      });
      
      const uniqueResolutions = Array.from(resolutionMap.values());

      // Merge duplicate "Removal of Justin Sweet" resolutions into a single entry
      const mergedBySubject = Object.values(
        uniqueResolutions.reduce((acc: Record<string, any>, r: any) => {
          const title = (r.title || '').toLowerCase();
          const isJustinRemoval =
            r.type === 'EXECUTIVE_REMOVAL' &&
            title.includes('removal of justin sweet');

          const key = isJustinRemoval ? 'JUSTIN_SWEET_EXECUTIVE_REMOVAL' : r.resolution_number;
          const existing = acc[key];

          if (!existing) {
            acc[key] = r;
          } else {
            const existingDate = dayjs(existing.created_at || existing.effective_date);
            const candidateDate = dayjs(r.created_at || r.effective_date);
            if (candidateDate.isAfter(existingDate)) {
              acc[key] = r;
            }
          }

          return acc;
        }, {})
      );
      
      console.log(`📋 [VOTING] Total unique resolutions: ${mergedBySubject.length}`);
      console.log(`📋 [VOTING] Resolutions:`, mergedBySubject.map(r => ({
        number: r.resolution_number,
        title: r.title,
        status: r.status,
        id: r.id,
        governance_resolution_id: r.governance_resolution_id
      })));
      
      // Show ALL resolutions - don't filter by status
      // Users should see all resolutions to understand what's been voted on
      const votableResolutions = mergedBySubject;
      
      console.log(`🗳️ [VOTING] Showing all ${votableResolutions.length} resolutions`);

      // Load vote counts for each resolution
      const resolutionsWithVotes = await Promise.all(
        votableResolutions.map(async (resolution) => {
          // Votes are stored in board_resolution_votes table, linked to governance_board_resolutions.id
          // We MUST find the governance_board_resolutions.id for voting to work
          let votes: any[] = [];
          let governanceResolutionId: string | null = null;
          
          // First, check if this resolution IS a governance_board_resolutions record
          const { data: govResCheck } = await supabase
            .from('governance_board_resolutions')
            .select('id')
            .eq('id', resolution.id)
            .maybeSingle();
          
          if (govResCheck) {
            // This is already a governance resolution, use its ID
            governanceResolutionId = resolution.id;
            console.log(`✅ [VOTING] Resolution ${resolution.resolution_number} is a governance resolution: ${governanceResolutionId}`);
          } else {
            // This is likely a board_resolutions record, find the governance resolution
            // Strategy 1: Look up by resolution_number first (most reliable)
            const { data: govRes } = await supabase
              .from('governance_board_resolutions')
              .select('id')
              .eq('resolution_number', resolution.resolution_number)
              .maybeSingle();
            
            if (govRes) {
              governanceResolutionId = govRes.id;
              console.log(`✅ [VOTING] Found governance resolution for ${resolution.resolution_number}: ${governanceResolutionId}`);
            } else {
              // Strategy 2: Check board_resolutions.notes for governance_resolution_id
              const { data: boardResData } = await supabase
                .from('board_resolutions')
                .select('id, notes')
                .eq('resolution_number', resolution.resolution_number)
                .maybeSingle();
              
              if (boardResData?.notes) {
                try {
                  const notes = typeof boardResData.notes === 'string' 
                    ? JSON.parse(boardResData.notes) 
                    : boardResData.notes;
                  if (notes.governance_resolution_id) {
                    // Verify the ID exists
                    const { data: verifyGovRes } = await supabase
                      .from('governance_board_resolutions')
                      .select('id')
                      .eq('id', notes.governance_resolution_id)
                      .maybeSingle();
                    
                    if (verifyGovRes) {
                      governanceResolutionId = notes.governance_resolution_id;
                      console.log(`✅ [VOTING] Found governance_resolution_id in notes for ${resolution.resolution_number}: ${governanceResolutionId}`);
                    } else {
                      console.warn(`⚠️ [VOTING] governance_resolution_id in notes for ${resolution.resolution_number} does not exist: ${notes.governance_resolution_id}`);
                    }
                  }
                } catch (e) {
                  console.warn(`⚠️ [VOTING] Failed to parse notes for resolution ${resolution.resolution_number}:`, e);
                }
              }
            }
            
            // Strategy 3: If still not found, this resolution might not have a governance record
            // Log a warning but continue - we'll handle this in handleVote
            if (!governanceResolutionId) {
              console.warn(`⚠️ [VOTING] No governance resolution found for ${resolution.resolution_number}. Resolution may need to be migrated.`);
            }
          }
          
          // Look up votes using the governance resolution ID (only if we found one)
          if (governanceResolutionId) {
            const { data: votesData } = await supabase
              .from('board_resolution_votes')
              .select('vote')
              .eq('resolution_id', governanceResolutionId);
            
            if (votesData) {
              votes = votesData;
            }
          }

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
            governance_resolution_id: governanceResolutionId || undefined, // Store for voting (null if not found)
          };
        })
      );

      console.log(`✅ [VOTING] Loaded ${resolutionsWithVotes.length} resolutions with vote data`);
      setResolutions(resolutionsWithVotes);
    } catch (error: any) {
      console.error('❌ [VOTING] Error loading resolutions:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load resolutions',
        color: 'red',
      });
      // Even on error, try to set empty array so UI doesn't hang
      setResolutions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    if (!selectedResolution || !vote) return;

    setSubmittingVote(true);
    try {
      console.log('🗳️ [VOTING] Starting vote submission for:', {
        resolution_number: selectedResolution.resolution_number,
        resolution_id: selectedResolution.id,
        governance_resolution_id: selectedResolution.governance_resolution_id,
      });

      // Use the governance resolution ID for voting (votes are linked to governance_board_resolutions)
      // If we don't have a governance_resolution_id, we need to find or create it
      let resolutionIdForVote = selectedResolution.governance_resolution_id;
      
      if (!resolutionIdForVote) {
        console.log('🔍 [VOTING] No governance_resolution_id found, looking up...');
        
        // Try to find the governance resolution by resolution_number
        const { data: govRes, error: govResError } = await supabase
          .from('governance_board_resolutions')
          .select('id')
          .eq('resolution_number', selectedResolution.resolution_number)
          .maybeSingle();
        
        if (govResError) {
          console.error('❌ [VOTING] Error looking up governance resolution:', govResError);
        }
        
        if (govRes) {
          resolutionIdForVote = govRes.id;
          console.log('✅ [VOTING] Found governance resolution by number:', resolutionIdForVote);
        } else {
          console.log('🔍 [VOTING] Not found by number, checking board_resolutions.notes...');
          
          // Check board_resolutions.notes for governance_resolution_id
          const { data: boardRes, error: boardResError } = await supabase
            .from('board_resolutions')
            .select('id, notes')
            .eq('resolution_number', selectedResolution.resolution_number)
            .maybeSingle();
          
          if (boardResError) {
            console.error('❌ [VOTING] Error looking up board resolution:', boardResError);
          }
          
          if (boardRes?.notes) {
            try {
              const notes = typeof boardRes.notes === 'string' 
                ? JSON.parse(boardRes.notes) 
                : boardRes.notes;
              if (notes.governance_resolution_id) {
                resolutionIdForVote = notes.governance_resolution_id;
                console.log('✅ [VOTING] Found governance_resolution_id in notes:', resolutionIdForVote);
              } else {
                console.log('⚠️ [VOTING] Notes found but no governance_resolution_id:', notes);
              }
            } catch (e) {
              console.error('❌ [VOTING] Failed to parse notes:', e);
            }
          } else {
            console.log('⚠️ [VOTING] No board_resolutions record or notes found');
          }
        }
        
        // Verify the ID exists before using it
        if (resolutionIdForVote) {
          const { data: verifyRes, error: verifyError } = await supabase
            .from('governance_board_resolutions')
            .select('id')
            .eq('id', resolutionIdForVote)
            .maybeSingle();
          
          if (verifyError || !verifyRes) {
            console.error('❌ [VOTING] Governance resolution ID does not exist:', resolutionIdForVote);
            resolutionIdForVote = null;
          } else {
            console.log('✅ [VOTING] Verified governance resolution ID exists:', resolutionIdForVote);
          }
        }
        
        if (!resolutionIdForVote) {
          const errorMsg = `Cannot vote on resolution ${selectedResolution.resolution_number}: No corresponding governance resolution found. The resolution may need to be migrated. Please contact an administrator.`;
          console.error('❌ [VOTING]', errorMsg);
          throw new Error(errorMsg);
        }
      } else {
        // Verify the existing ID exists
        const { data: verifyRes, error: verifyError } = await supabase
          .from('governance_board_resolutions')
          .select('id')
          .eq('id', resolutionIdForVote)
          .maybeSingle();
        
        if (verifyError || !verifyRes) {
          console.error('❌ [VOTING] Stored governance_resolution_id does not exist:', resolutionIdForVote);
          throw new Error(
            `Invalid resolution ID: ${resolutionIdForVote}. The governance resolution may have been deleted. Please refresh the page.`
          );
        }
        console.log('✅ [VOTING] Using stored governance_resolution_id:', resolutionIdForVote);
      }
      
      console.log('📤 [VOTING] Submitting vote with resolution_id:', resolutionIdForVote);
      
      // Use fetch directly to get better error details
      const response = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/functions/v1/governance-cast-vote`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            resolution_id: resolutionIdForVote,
            vote,
            comment: comment || null,
          }),
        }
      );

      const text = await response.text();
      let responseData: Record<string, unknown> = {};
      try {
        responseData = text ? JSON.parse(text) : {};
      } catch {
        if (text.trimStart().startsWith('<')) {
          throw new Error(
            'Vote service returned an invalid response. Please try again or contact support.'
          );
        }
        throw new Error('Invalid response from vote service.');
      }
      console.log('Vote submission response:', { status: response.status, data: responseData });

      if (!response.ok) {
        const errorMessage = responseData?.error || responseData?.message || `HTTP ${response.status}: Failed to submit vote`;
        throw new Error(errorMessage as string);
      }

      if (responseData?.error) {
        throw new Error(typeof responseData.error === 'string' ? responseData.error : (responseData.error as any)?.message || 'Vote submission failed');
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

  // Always log render
  console.log('🎨 [VOTING] Rendering component. Resolutions:', resolutions.length, 'Loading:', loading, 'State:', { 
    resolutionsCount: resolutions.length,
    loading,
    hasResolutions: resolutions.length > 0
  });

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack gap="md">
          <Title order={2}>Loading Resolutions...</Title>
          <Loader size="lg" />
          <Text size="sm" c="dimmed">Fetching resolution data...</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl" style={{ minHeight: '400px' }}>
      <Stack gap="xl">
        {/* Debug indicator - remove after fixing */}
        <Alert color="blue" title="Debug Info">
          <Text size="xs">
            Resolutions: {resolutions.length} | Loading: {loading ? 'Yes' : 'No'} | 
            Timestamp: {new Date().toLocaleTimeString()}
          </Text>
        </Alert>
        
        <div>
          <Title order={2} c="dark" mb="xs">
            <IconCheckbox size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 12}} />
            Resolution Voting Dashboard
          </Title>
          <Text c="dimmed">
            View and vote on pending board resolutions.
          </Text>
          <Text size="sm" c="dimmed" mt="xs">
            {resolutions.length > 0 
              ? `Showing ${resolutions.length} resolution${resolutions.length !== 1 ? 's' : ''}`
              : 'No resolutions found'}
          </Text>
        </div>

        <Card padding="lg" radius="md" withBorder>
          {resolutions.length === 0 ? (
            <Alert icon={<IconAlertCircle size={16} />} title="No Resolutions" color="blue">
              <Text size="sm" mb="xs">
                No resolutions found. Create a new resolution to get started.
              </Text>
              <Text size="xs" c="dimmed">
                Check the browser console for debugging information. Data was loaded: {loading ? 'Loading...' : 'Yes'}
              </Text>
            </Alert>
          ) : (
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
                      <Badge color={getStatusColor(resolution.status)} variant="light">
                        {getStatusLabel(resolution.status)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {resolution.votes ? (
                        <Stack gap={4}>
                          <Text size="xs">
                            ✅ {resolution.votes.YES} | ❌ {resolution.votes.NO} | ⚪ {resolution.votes.ABSTAIN}
                          </Text>
                          {resolution.total_board_members && resolution.total_board_members > 0 && (
                            <Progress
                              value={(resolution.total_votes || 0) / resolution.total_board_members * 100}
                              size="xs"
                              color="blue"
                            />
                          )}
                        </Stack>
                      ) : (
                        <Text size="xs" c="dimmed">No votes yet</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {resolution.status === 'PENDING_VOTE' || resolution.status === 'pending' ? (
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
                      ) : (
                        <Text size="xs" c="dimmed">Voting closed</Text>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
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


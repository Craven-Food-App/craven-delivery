// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
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
  Grid,
  Divider,
  Title,
  Box,
  Card,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { supabase } from '@/integrations/supabase/client';
import { 
  IconEye, 
  IconCheck, 
  IconX, 
  IconFileText, 
  IconCalendar, 
  IconTag, 
  IconCircleCheck, 
  IconClock, 
  IconPlayerPlay,
  IconInfoCircle,
  IconBuilding,
  IconUser,
  IconFilter,
  IconRefresh,
  IconLink,
  IconTrendingUp,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

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

const ResolutionList: React.FC = () => {
  const [resolutions, setResolutions] = useState<BoardResolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedResolution, setSelectedResolution] = useState<BoardResolution | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [adoptModalOpen, setAdoptModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchResolutions();
    checkPermissions();
  }, [statusFilter]);

  const checkPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email === 'tstroman.ceo@cravenusa.com') {
        setCanManage(true);
        return;
      }
      const { fetchUserRoles, canManageGovernance } = await import('@/lib/roles');
      const roles = await fetchUserRoles();
      setCanManage(canManageGovernance(roles));
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const fetchResolutions = async () => {
    setLoading(true);
    try {
      // Fetch from both tables to show all resolutions
      const [governanceRes, boardRes] = await Promise.all([
        supabase
        .from('governance_board_resolutions')
        .select('*')
          .order('created_at', { ascending: false })
          .then(({ data, error }) => {
            if (error && error.code !== '42P01') {
              console.warn('Error fetching governance_board_resolutions:', error);
            }
            return data || [];
          }),
        supabase
          .from('board_resolutions')
          .select('*')
          .order('created_at', { ascending: false })
          .then(({ data, error }) => {
            if (error && error.code !== '42P01') {
              console.warn('Error fetching board_resolutions:', error);
            }
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
        related_officer_id: null,
        metadata: br.notes ? (typeof br.notes === 'string' ? JSON.parse(br.notes) : br.notes) : {},
        created_at: br.created_at,
        updated_at: br.updated_at,
      }));

      // Combine and deduplicate by resolution_number
      const allResolutions = [...governanceRes, ...transformedBoardRes];
      const uniqueResolutions = Array.from(
        new Map(allResolutions.map((r: any) => [r.resolution_number, r])).values()
      );

      // Apply status filter
      let filtered = uniqueResolutions;
      if (statusFilter !== 'all') {
        filtered = uniqueResolutions.filter((r: any) => {
          const status = r.status?.toUpperCase();
          return status === statusFilter.toUpperCase() || 
                 (statusFilter === 'PENDING_VOTE' && status === 'PENDING') ||
                 (statusFilter === 'ADOPTED' && (status === 'APPROVED' || status === 'EXECUTED'));
        });
      }

      setResolutions(filtered.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    } catch (error: any) {
      console.error('Error fetching resolutions:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load resolutions',
        color: 'red',
      });
    } finally {
      setLoading(false);
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

  // Calculate statistics
  const stats = useMemo(() => {
    const total = resolutions.length;
    const pending = resolutions.filter(r => r.status === 'PENDING_VOTE').length;
    const adopted = resolutions.filter(r => r.status === 'ADOPTED' || r.status === 'EXECUTED').length;
    const rejected = resolutions.filter(r => r.status === 'REJECTED').length;
    const draft = resolutions.filter(r => r.status === 'DRAFT').length;
    
    return { total, pending, adopted, rejected, draft };
  }, [resolutions]);

  const handleMergeDuplicates = async () => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('🔍 [MERGE] Starting merge process. Total resolutions:', resolutions.length);

      // Extract person name and position from title for better matching
      // Examples:
      // "Appointment of Justin Sweet as CFO" -> { name: "Justin Sweet", position: "CFO" }
      // "Removal of Nathan Curry as Chief Technology Officer" -> { name: "Nathan Curry", position: "Chief Technology Officer" }
      const extractPersonAndPosition = (title: string): { name: string; position: string } | null => {
        const appointmentMatch = title.match(/appointment of (.+?) as (.+?)(?:\.|$)/i);
        if (appointmentMatch) {
          return { name: appointmentMatch[1].trim(), position: appointmentMatch[2].trim() };
        }
        const removalMatch = title.match(/removal of (.+?) as (.+?)(?:\.|$)/i);
        if (removalMatch) {
          return { name: removalMatch[1].trim(), position: removalMatch[2].trim() };
        }
        return null;
      };

      // Normalize name (remove middle initials, extra spaces, handle nicknames, etc.)
      const normalizeName = (name: string): string => {
        // Common nickname mappings
        const nicknameMap: Record<string, string> = {
          'nate': 'nathan',
          'nathan': 'nathan',
          'torrance': 'torrance',
          'torry': 'torrance',
          'justin': 'justin',
          'just': 'justin',
        };

        let normalized = name
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .replace(/\b[a-z]\b\.?\s*/g, '') // Remove single letter middle initials
          .trim();

        // Extract first name and check for nickname
        const firstName = normalized.split(' ')[0];
        if (nicknameMap[firstName]) {
          normalized = normalized.replace(new RegExp(`^${firstName}\\b`), nicknameMap[firstName]);
        }

        return normalized;
      };

      // Find duplicate resolutions by matching person name and position
      const duplicates = new Map<string, BoardResolution[]>();
      resolutions.forEach(r => {
        const personPos = extractPersonAndPosition(r.title);
        if (personPos) {
          // Create key from normalized name and position
          const key = `${normalizeName(personPos.name)}|${personPos.position.toLowerCase()}`;
          if (!duplicates.has(key)) {
            duplicates.set(key, []);
          }
          duplicates.get(key)!.push(r);
        } else {
          // Fallback to title matching if we can't extract person/position
          const key = r.title.toLowerCase().trim();
          if (!duplicates.has(key)) {
            duplicates.set(key, []);
          }
          duplicates.get(key)!.push(r);
        }
      });

      // Filter to only groups with duplicates
      const duplicateGroups = Array.from(duplicates.entries()).filter(([_, arr]) => arr.length > 1);
      console.log('🔍 [MERGE] Found duplicate groups:', duplicateGroups.length);
      duplicateGroups.forEach(([key, arr]) => {
        console.log(`  - Group "${key}": ${arr.map(r => r.resolution_number).join(', ')}`);
      });

      if (duplicateGroups.length === 0) {
        notifications.show({
          title: 'No Duplicates',
          message: 'No duplicate resolutions found to merge',
          color: 'blue',
        });
        return;
      }

      let mergedCount = 0;
      const errors: string[] = [];

      // Process each set of duplicates
      for (const [key, dupResolutions] of duplicateGroups) {
        console.log(`🔄 [MERGE] Processing ${dupResolutions.length} duplicates for: "${key}"`);

        // Sort by priority: 2025-XXXX format (without BR- prefix) is preferred over BR-2025-XXXX
        // Then by resolution number (higher = more recent), then by created_at
        dupResolutions.sort((a, b) => {
          const aIsBR = a.resolution_number.startsWith('BR-');
          const bIsBR = b.resolution_number.startsWith('BR-');
          
          // Prioritize non-BR resolutions (2025-XXXX format)
          if (aIsBR && !bIsBR) return 1; // b comes first
          if (!aIsBR && bIsBR) return -1; // a comes first
          
          // If both are same type, compare by number
          const aNum = parseInt(a.resolution_number.replace('BR-', '').split('-')[1] || '0');
          const bNum = parseInt(b.resolution_number.replace('BR-', '').split('-')[1] || '0');
          if (aNum !== bNum) return bNum - aNum; // Higher number first
          
          // Fallback to created_at
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        const keepResolution = dupResolutions[0]; // Keep the most recent (highest number)
        const deleteResolutions = dupResolutions.slice(1); // Delete the rest

        console.log(`  ✅ Keeping: ${keepResolution.resolution_number} (${keepResolution.id})`);
        console.log(`  🗑️ Deleting: ${deleteResolutions.map(r => r.resolution_number).join(', ')}`);

        // Get the resolution ID to keep (check both tables)
        let keepBoardResId: string | null = null;
        let keepGovResId: string | null = null;

        const { data: keepBoardRes } = await supabase
          .from('board_resolutions')
          .select('id')
          .eq('resolution_number', keepResolution.resolution_number)
          .maybeSingle();

        if (keepBoardRes) {
          keepBoardResId = keepBoardRes.id;
          console.log(`  ✅ Keep resolution found in board_resolutions: ${keepBoardResId}`);
        }

        const { data: keepGovRes } = await supabase
          .from('governance_board_resolutions')
          .select('id')
          .eq('resolution_number', keepResolution.resolution_number)
          .maybeSingle();

        if (keepGovRes) {
          keepGovResId = keepGovRes.id;
          console.log(`  ✅ Keep resolution found in governance_board_resolutions: ${keepGovResId}`);
        }

        // For each duplicate to delete:
        for (const dupResolution of deleteResolutions) {
          console.log(`  🔄 Processing duplicate: ${dupResolution.resolution_number}`);

          let deletedBoard = false;
          let deletedGov = false;

          // Use the database function to merge (bypasses RLS)
          const { data: mergeResult, error: mergeError } = await supabase.rpc(
            'merge_duplicate_resolutions',
            {
              p_keep_resolution_number: keepResolution.resolution_number,
              p_delete_resolution_number: dupResolution.resolution_number
            }
          );

          if (mergeError) {
            console.error(`  ❌ Error merging resolutions via RPC:`, mergeError);
            errors.push(`Error merging ${dupResolution.resolution_number}: ${mergeError.message}`);
          } else if (mergeResult && mergeResult.success) {
            mergedCount++;
            console.log(`  ✅ Successfully merged resolution ${dupResolution.resolution_number}`);
            console.log(`     - Workflows updated: ${mergeResult.workflows_updated || 0}`);
            console.log(`     - Board resolution deleted: ${mergeResult.board_resolution_deleted || false}`);
            console.log(`     - Governance resolution deleted: ${mergeResult.governance_resolution_deleted || false}`);
          } else {
            console.error(`  ❌ Merge failed for ${dupResolution.resolution_number}:`, mergeResult);
            errors.push(`Merge failed for ${dupResolution.resolution_number}: ${mergeResult?.error || 'Unknown error'}`);
          }
        }
      }

      console.log(`✅ [MERGE] Complete. Merged: ${mergedCount}, Errors: ${errors.length}`);

      if (errors.length > 0) {
        console.error('❌ [MERGE] Errors:', errors);
        notifications.show({
          title: 'Merge Completed with Errors',
          message: `Merged ${mergedCount} duplicate(s) but encountered ${errors.length} error(s). Check console for details.`,
          color: 'orange',
        });
      } else if (mergedCount > 0) {
        notifications.show({
          title: 'Success',
          message: `Successfully merged ${mergedCount} duplicate resolution(s)`,
          color: 'green',
        });
      }

      // Always refresh the list
      await fetchResolutions();
    } catch (error: any) {
      console.error('❌ [MERGE] Fatal error:', error);
      notifications.show({
        title: 'Error',
        message: `Failed to merge duplicates: ${error.message || 'Unknown error'}`,
        color: 'red',
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Center h={300}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Box p="md">
      <Stack gap="sm">
        {/* Enterprise Header Section */}
        <Paper p="md" withBorder style={{ backgroundColor: '#ffffff', borderLeft: '4px solid #228be6' }}>
          <Group justify="space-between" align="flex-start" mb="md">
            <Box>
              <Group gap="xs" mb="xs">
                <IconFileText size={28} color="#228be6" />
                <Title order={2} c="dark" fw={700}>
                  Governance Resolutions
                </Title>
              </Group>
              <Text size="sm" c="dimmed">
                Manage board resolutions, appointments, and corporate governance actions
              </Text>
            </Box>
            <Group gap="xs">
              <Tooltip label="Refresh">
                <ActionIcon
                  variant="light"
                  color="blue"
                  size="lg"
                  onClick={fetchResolutions}
                  loading={loading}
                >
                  <IconRefresh size={18} />
                </ActionIcon>
              </Tooltip>
              {resolutions.length > 0 && canManage && (
                <Tooltip label="Merge duplicate resolutions">
                  <Button
                    variant="light"
                    color="orange"
                    size="sm"
                    leftSection={<IconLink size={16} />}
                    onClick={handleMergeDuplicates}
                    loading={processing}
                  >
                    Merge Duplicates
                  </Button>
                </Tooltip>
              )}
            </Group>
          </Group>

          {/* Statistics Cards - Compact */}
          <Grid gutter="xs">
            <Grid.Col span={{ base: 6, sm: 3, md: 2.4 }}>
              <Card p="xs" withBorder style={{ backgroundColor: '#f8f9fa' }}>
                <Group gap="xs" justify="space-between">
                  <Group gap={4}>
                    <IconFileText size={14} color="#495057" />
                    <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                      Total
                    </Text>
                  </Group>
                  <Text fw={700} size="lg" c="dark">
                    {stats.total}
                  </Text>
                </Group>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3, md: 2.4 }}>
              <Card p="xs" withBorder style={{ backgroundColor: '#e3f2fd', borderLeft: '3px solid #2196f3' }}>
                <Group gap="xs" justify="space-between">
                  <Group gap={4}>
                    <IconClock size={14} color="#2196f3" />
                    <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                      Pending
                    </Text>
                  </Group>
                  <Text fw={700} size="lg" c="dark">
                    {stats.pending}
                  </Text>
                </Group>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3, md: 2.4 }}>
              <Card p="xs" withBorder style={{ backgroundColor: '#e8f5e9', borderLeft: '3px solid #4caf50' }}>
                <Group gap="xs" justify="space-between">
                  <Group gap={4}>
                    <IconCircleCheck size={14} color="#4caf50" />
                    <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                      Adopted
                    </Text>
                  </Group>
                  <Text fw={700} size="lg" c="dark">
                    {stats.adopted}
                  </Text>
                </Group>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3, md: 2.4 }}>
              <Card p="xs" withBorder style={{ backgroundColor: '#ffebee', borderLeft: '3px solid #f44336' }}>
                <Group gap="xs" justify="space-between">
                  <Group gap={4}>
                    <IconX size={14} color="#f44336" />
                    <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                      Rejected
                    </Text>
                  </Group>
                  <Text fw={700} size="lg" c="dark">
                    {stats.rejected}
                  </Text>
                </Group>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3, md: 2.4 }}>
              <Card p="xs" withBorder style={{ backgroundColor: '#f5f5f5', borderLeft: '3px solid #9e9e9e' }}>
                <Group gap="xs" justify="space-between">
                  <Group gap={4}>
                    <IconFileText size={14} color="#9e9e9e" />
                    <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                      Draft
                    </Text>
                  </Group>
                  <Text fw={700} size="lg" c="dark">
                    {stats.draft}
                  </Text>
                </Group>
              </Card>
            </Grid.Col>
          </Grid>
        </Paper>

        {/* Filters and Actions Bar - Compact */}
        <Paper p="xs" withBorder style={{ backgroundColor: '#ffffff' }}>
          <Group justify="space-between" wrap="nowrap" gap="xs">
            <Group gap="xs" wrap="nowrap">
              <IconFilter size={16} color="#495057" />
              <Text size="xs" fw={600} c="dark">
                Filter:
              </Text>
              <Select
                placeholder="All Statuses"
                value={statusFilter}
                onChange={(value) => setStatusFilter(value || 'all')}
                data={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'PENDING_VOTE', label: 'Pending Vote' },
                  { value: 'ADOPTED', label: 'Adopted' },
                  { value: 'REJECTED', label: 'Rejected' },
                ]}
                size="xs"
                style={{ width: 140 }}
              />
            </Group>
            <Text size="xs" c="dimmed">
              {resolutions.length} resolution{resolutions.length !== 1 ? 's' : ''}
            </Text>
          </Group>
        </Paper>

        {/* Enterprise Table */}
        {resolutions.length === 0 ? (
          <Paper p="xl" withBorder style={{ backgroundColor: '#ffffff' }}>
            <Center>
              <Stack gap="xs" align="center">
                <IconFileText size={48} color="#9e9e9e" />
                <Text c="dimmed" fw={500}>
                  No resolutions found
                </Text>
                {statusFilter !== 'all' && (
                  <Button
                    variant="subtle"
                    size="xs"
                    onClick={() => setStatusFilter('all')}
                  >
                    Clear Filter
                  </Button>
                )}
              </Stack>
            </Center>
          </Paper>
        ) : (
          <Paper withBorder style={{ backgroundColor: '#ffffff', overflow: 'hidden' }}>
            <Table.ScrollContainer minWidth={1000}>
              <Table verticalSpacing="xs" highlightOnHover striped>
                <Table.Thead>
                  <Table.Tr style={{ backgroundColor: '#f8f9fa' }}>
                    <Table.Th style={{ padding: '12px 16px' }}>
                      <Group gap="xs">
                        <IconFileText size={14} color="#495057" />
                        <Text size="xs" fw={700} c="dark" tt="uppercase">
                          Resolution #
                        </Text>
                      </Group>
                    </Table.Th>
                    <Table.Th style={{ padding: '12px 16px' }}>
                      <Text size="xs" fw={700} c="dark" tt="uppercase">
                        Title
                      </Text>
                    </Table.Th>
                    <Table.Th style={{ padding: '12px 16px' }}>
                      <Group gap="xs">
                        <IconTag size={14} color="#495057" />
                        <Text size="xs" fw={700} c="dark" tt="uppercase">
                          Type
                        </Text>
                      </Group>
                    </Table.Th>
                    <Table.Th style={{ padding: '12px 16px' }}>
                      <Text size="xs" fw={700} c="dark" tt="uppercase">
                        Status
                      </Text>
                    </Table.Th>
                    <Table.Th style={{ padding: '12px 16px' }}>
                      <Group gap="xs">
                        <IconCalendar size={14} color="#495057" />
                        <Text size="xs" fw={700} c="dark" tt="uppercase">
                          Meeting Date
                        </Text>
                      </Group>
                    </Table.Th>
                    <Table.Th style={{ padding: '12px 16px', width: 100 }}>
                      <Text size="xs" fw={700} c="dark" tt="uppercase">
                        Actions
                      </Text>
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {resolutions.map((resolution) => (
                    <Table.Tr key={resolution.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                      <Table.Td style={{ padding: '10px 16px' }}>
                        <Text fw={600} size="sm" c="dark" style={{ fontFamily: 'monospace' }}>
                          {resolution.resolution_number}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ padding: '10px 16px', maxWidth: 400 }}>
                        <Stack gap={2}>
                          <Text fw={500} size="sm" c="dark" lineClamp={1}>
                            {resolution.title}
                          </Text>
                          {resolution.description && (
                            <Text size="xs" c="dimmed" lineClamp={1}>
                              {resolution.description}
                            </Text>
                          )}
                        </Stack>
                      </Table.Td>
                      <Table.Td style={{ padding: '10px 16px' }}>
                        <Badge 
                          variant="light" 
                          size="sm"
                          color="orange"
                          leftSection={<IconBuilding size={12} />}
                        >
                          {resolution.type.replace('_', ' ')}
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ padding: '10px 16px' }}>
                        <Badge 
                          color={getStatusColor(resolution.status)} 
                          variant="filled"
                          size="sm"
                          leftSection={
                            resolution.status === 'EXECUTED' || resolution.status === 'ADOPTED' ? (
                              <IconCircleCheck size={12} />
                            ) : resolution.status === 'REJECTED' ? (
                              <IconX size={12} />
                            ) : (
                              <IconClock size={12} />
                            )
                          }
                        >
                          {resolution.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ padding: '10px 16px' }}>
                        <Text size="sm" c="dark">
                          {resolution.meeting_date
                            ? dayjs(resolution.meeting_date).format('MMM D, YYYY')
                            : <Text span c="dimmed" size="xs">N/A</Text>}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ padding: '10px 16px' }}>
                        <Group gap={4}>
                          <Tooltip label="View Details" withArrow>
                            <ActionIcon
                              variant="light"
                              color="blue"
                              size="sm"
                              onClick={() => {
                                setSelectedResolution(resolution);
                                setDetailModalOpen(true);
                              }}
                            >
                              <IconEye size={14} />
                            </ActionIcon>
                          </Tooltip>
                          {resolution.status === 'PENDING_VOTE' && (
                            <Tooltip label="View in Board Portal" withArrow>
                              <ActionIcon
                                variant="light"
                                color="indigo"
                                size="sm"
                                onClick={() =>
                                  navigate(`/company/board/resolution/${resolution.id}`)
                                }
                              >
                                <IconFileText size={14} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Paper>
        )}
      </Stack>

      {/* Detail Modal */}
      <Modal
        opened={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedResolution(null);
        }}
        title={
          <Group gap="xs">
            <IconFileText size={24} />
            <Title order={3}>Resolution Details</Title>
          </Group>
        }
        size="xl"
        padding="xl"
      >
        {selectedResolution && (
          <Stack gap="xl">
            {/* Header Section */}
            <Paper p="lg" withBorder style={{ backgroundColor: '#f8f9fa', borderLeft: '4px solid #228be6' }}>
              <Stack gap="sm">
                <Group justify="space-between" align="flex-start">
                  <Box>
                    <Text size="xs" c="dimmed" fw={600} tt="uppercase" mb={4}>
                      Resolution Number
                    </Text>
                    <Group gap="xs" align="center">
                      <IconFileText size={18} color="#228be6" />
                      <Text fw={700} size="lg" c="dark">
                        {selectedResolution.resolution_number}
                      </Text>
                    </Group>
                  </Box>
                  <Badge 
                    size="lg" 
                    color={getStatusColor(selectedResolution.status)}
                    variant="filled"
                    leftSection={
                      selectedResolution.status === 'EXECUTED' || selectedResolution.status === 'ADOPTED' ? (
                        <IconCircleCheck size={14} />
                      ) : selectedResolution.status === 'REJECTED' ? (
                        <IconX size={14} />
                      ) : (
                        <IconClock size={14} />
                      )
                    }
                  >
                    {selectedResolution.status}
                  </Badge>
                </Group>
                <Divider />
                <Box>
                  <Text size="xs" c="dimmed" fw={600} tt="uppercase" mb={4}>
                    Title
                  </Text>
                  <Title order={4} c="dark" fw={600}>
                    {selectedResolution.title}
                  </Title>
                </Box>
              </Stack>
            </Paper>

            {/* Description Section */}
            {selectedResolution.description && (
              <Paper p="lg" withBorder>
                <Stack gap="sm">
                  <Group gap="xs">
                    <IconInfoCircle size={18} color="#495057" />
                    <Text size="sm" fw={600} c="dark" tt="uppercase">
                      Description
                    </Text>
                  </Group>
                  <Text c="dimmed" style={{ lineHeight: 1.7 }}>
                    {selectedResolution.description}
                  </Text>
                </Stack>
              </Paper>
            )}

            {/* Details Grid */}
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Paper p="md" withBorder h="100%">
                  <Stack gap="xs">
                    <Group gap="xs">
                      <IconTag size={16} color="#495057" />
                      <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                        Type
                      </Text>
                    </Group>
                    <Badge 
                      size="lg" 
                      variant="light" 
                      color="orange"
                      leftSection={<IconBuilding size={14} />}
                    >
                      {selectedResolution.type.replace('_', ' ')}
                    </Badge>
                  </Stack>
                </Paper>
              </Grid.Col>

              {selectedResolution.meeting_date && (
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Paper p="md" withBorder h="100%">
                    <Stack gap="xs">
                      <Group gap="xs">
                        <IconCalendar size={16} color="#495057" />
                        <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                          Meeting Date
                        </Text>
                      </Group>
                      <Text fw={500} size="sm">
                        {dayjs(selectedResolution.meeting_date).format('MMMM D, YYYY')}
                      </Text>
                    </Stack>
                  </Paper>
                </Grid.Col>
              )}

              {selectedResolution.effective_date && (
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Paper p="md" withBorder h="100%">
                    <Stack gap="xs">
                      <Group gap="xs">
                        <IconCalendar size={16} color="#495057" />
                        <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                          Effective Date
                        </Text>
                      </Group>
                      <Text fw={500} size="sm">
                        {dayjs(selectedResolution.effective_date).format('MMMM D, YYYY')}
                      </Text>
                    </Stack>
                  </Paper>
                </Grid.Col>
              )}

              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Paper p="md" withBorder h="100%">
                  <Stack gap="xs">
                    <Group gap="xs">
                      <IconClock size={16} color="#495057" />
                      <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                        Created
                      </Text>
                    </Group>
                    <Text fw={500} size="sm">
                      {dayjs(selectedResolution.created_at).format('MMMM D, YYYY [at] h:mm A')}
                    </Text>
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>

            {/* Action Buttons */}
            {canManage && (
              <>
                {selectedResolution.status === 'PENDING_VOTE' && (
                  <Paper p="md" withBorder style={{ backgroundColor: '#fff9e6', borderLeft: '4px solid #ffc107' }}>
                    <Stack gap="md">
                      <Text size="sm" fw={600} c="dark">
                        Resolution Actions
                      </Text>
                      <Group>
                        <Button
                          leftSection={<IconCheck size={16} />}
                          color="green"
                          size="md"
                          onClick={() => {
                            setDetailModalOpen(false);
                            setAdoptModalOpen(true);
                          }}
                        >
                          Manually Adopt
                        </Button>
                        <Button
                          leftSection={<IconX size={16} />}
                          color="red"
                          variant="outline"
                          size="md"
                          onClick={() => {
                            setDetailModalOpen(false);
                            setRejectModalOpen(true);
                          }}
                        >
                          Manually Reject
                        </Button>
                      </Group>
                    </Stack>
                  </Paper>
                )}

                {selectedResolution.status === 'ADOPTED' && (
                  <Paper p="md" withBorder style={{ backgroundColor: '#e8f5e9', borderLeft: '4px solid #4caf50' }}>
                    <Stack gap="md">
                      <Group gap="xs">
                        <IconInfoCircle size={18} color="#4caf50" />
                        <Text size="sm" fw={600} c="dark">
                          Resolution is Adopted
                        </Text>
                      </Group>
                      <Text size="sm" c="dimmed">
                        This resolution has been adopted. Execute it to complete the appointment process and send notifications.
                      </Text>
                      <Button
                        leftSection={<IconPlayerPlay size={16} />}
                        color="blue"
                        size="md"
                        onClick={async () => {
                          setProcessing(true);
                          try {
                            const { error } = await supabase.functions.invoke('governance-execute-resolution', {
                              body: {
                                resolution_id: selectedResolution.id,
                              },
                            });
                            if (error) throw error;
                            notifications.show({
                              title: 'Success',
                              message: 'Resolution executed successfully',
                              color: 'green',
                              icon: <IconCheck size={16} />,
                            });
                            setDetailModalOpen(false);
                            setSelectedResolution(null);
                            fetchResolutions();
                          } catch (error: any) {
                            notifications.show({
                              title: 'Error',
                              message: error.message || 'Failed to execute resolution',
                              color: 'red',
                            });
                          } finally {
                            setProcessing(false);
                          }
                        }}
                        loading={processing}
                      >
                        Execute Resolution
                      </Button>
                    </Stack>
                  </Paper>
                )}
              </>
            )}
          </Stack>
        )}
      </Modal>

      {/* Manual Adopt Modal */}
      <Modal
        opened={adoptModalOpen}
        onClose={() => {
          setAdoptModalOpen(false);
          setSelectedResolution(null);
        }}
        title="Manually Adopt Resolution"
        size="md"
      >
        {selectedResolution && (
          <Stack gap="md">
            <Text>
              Are you sure you want to manually adopt resolution {selectedResolution.resolution_number}? This will immediately approve the resolution and finalize any associated appointments.
            </Text>
            {selectedResolution.type === 'EXECUTIVE_APPOINTMENT' && (
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
              <Button
                color="green"
                onClick={async () => {
                  setProcessing(true);
                  try {
                    const { error } = await supabase.functions.invoke('governance-manual-adopt-resolution', {
                      body: {
                        resolution_id: selectedResolution.id,
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
                    setSelectedResolution(null);
                    fetchResolutions();
                  } catch (error: any) {
                    notifications.show({
                      title: 'Error',
                      message: error.message || 'Failed to adopt resolution',
                      color: 'red',
                    });
                  } finally {
                    setProcessing(false);
                  }
                }}
                loading={processing}
              >
                Adopt Resolution
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Manual Reject Modal */}
      <Modal
        opened={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false);
          setSelectedResolution(null);
        }}
        title="Manually Reject Resolution"
        size="md"
      >
        {selectedResolution && (
          <Stack gap="md">
            <Text>
              Are you sure you want to manually reject resolution {selectedResolution.resolution_number}? This will immediately reject the resolution.
            </Text>
            {selectedResolution.type === 'EXECUTIVE_APPOINTMENT' && (
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
              <Button
                color="red"
                onClick={async () => {
                  setProcessing(true);
                  try {
                    const { error } = await supabase.functions.invoke('governance-manual-adopt-resolution', {
                      body: {
                        resolution_id: selectedResolution.id,
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
                    setSelectedResolution(null);
                    fetchResolutions();
                  } catch (error: any) {
                    notifications.show({
                      title: 'Error',
                      message: error.message || 'Failed to reject resolution',
                      color: 'red',
                    });
                  } finally {
                    setProcessing(false);
                  }
                }}
                loading={processing}
              >
                Reject Resolution
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Box>
  );
};

export default ResolutionList;

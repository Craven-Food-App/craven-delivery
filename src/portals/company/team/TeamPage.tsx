// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Container, Stack, Title, Text, Card, Grid, Group, Badge, Avatar, Button, Modal, Divider } from '@mantine/core';
import { IconPlus, IconMail, IconPhone, IconEdit, IconEye } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { NumberFormatter } from '@mantine/core';
import { notifications } from '@mantine/notifications';

const JASON_EMAIL = 'jparcell2022@gmail.com';

interface Executive {
  user_id: string;
  name: string;
  title: string;
  email?: string;
  shares?: number;
  percentage?: number;
}

const TeamPage: React.FC = () => {
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedExecutive, setSelectedExecutive] = useState<Executive | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    loadExecutives();
    checkReadOnly();
  }, []);

  const checkReadOnly = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email?.toLowerCase() === JASON_EMAIL) {
      setIsReadOnly(true);
    }
  };

  const loadExecutives = async () => {
    try {
      setLoading(true);
      console.log('📋 [TEAM] Loading executives...');

      // Load executives - get all, no filtering by status
      const { data: execData, error: execError } = await supabase
        .from('exec_users')
        .select('user_id, title')
        .order('title');

      if (execError) {
        console.error('❌ [TEAM] Error loading exec_users:', execError);
        throw execError;
      }

      console.log('📋 [TEAM] Found exec_users:', execData?.length || 0);

      // Load equity for each executive
      const { data: capData } = await supabase
        .from('cap_tables')
        .select('total_authorized')
        .limit(1)
        .maybeSingle();

      const totalAuthorized = capData?.total_authorized || 70000000;
      console.log('📋 [TEAM] Total authorized shares:', totalAuthorized);

      const executivesWithEquity = await Promise.all(
        (execData || []).map(async (exec: any) => {
          // Fetch user profile for name and email - use maybeSingle to avoid errors
          const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select('full_name, email')
            .eq('user_id', exec.user_id)
            .maybeSingle();

          if (profileError) {
            console.warn(`⚠️ [TEAM] Error loading profile for ${exec.user_id}:`, profileError);
          }

          // Use profile name, fallback to title
          const name = profileData?.full_name || exec.title || 'Unknown';
          const email = profileData?.email || '';

          // Skip entries where name matches title (likely orphaned/duplicate)
          if (name === exec.title && exec.title !== 'Unknown') {
            console.log(`⏭️ [TEAM] Skipping orphaned entry: ${name} (matches title)`);
            return null;
          }

          // Fetch equity data - only count 'grant' transactions (not 'issuance' which is separate)
          // Also check for grants by share amount for known executives (in case user_id doesn't match)
          let equityData: any[] = [];
          
          // First, try to get grants by user_id
          const { data: equityByUserId, error: equityError } = await supabase
            .from('equity_ledger')
            .select('shares_amount, transaction_type, transaction_date, notes, recipient_user_id, grant_id')
            .eq('recipient_user_id', exec.user_id)
            .eq('transaction_type', 'grant');

          if (equityError) {
            console.warn(`⚠️ [TEAM] Error loading equity for ${exec.user_id}:`, equityError);
          }

          if (equityByUserId) {
            equityData = equityByUserId;
          }

          // Special handling for known executives by share amount (in case user_id mismatch)
          // This matches the logic in EquityGrantsList.tsx
          if (equityData.length === 0) {
            // Check for Torrance's 10.5M grant
            if (email === 'tstroman.ceo@cravenusa.com' || name === 'Torrance Stroman') {
              const { data: torranceGrants } = await supabase
                .from('equity_ledger')
                .select('shares_amount, transaction_type, transaction_date, notes, recipient_user_id, grant_id')
                .eq('transaction_type', 'grant')
                .gte('shares_amount', 10400000)
                .lte('shares_amount', 10600000); // 10.4M - 10.6M range for Torrance's 10.5M
              
              if (torranceGrants && torranceGrants.length > 0) {
                console.log(`🔍 [TEAM] Found Torrance grant by share amount:`, torranceGrants);
                equityData = torranceGrants;
              }
            }
            
            // Check for Justin's 4.2M grant
            if (email === 'jsweet.cfo@cravenusa.com' || name === 'Justin Sweet') {
              const { data: justinGrants } = await supabase
                .from('equity_ledger')
                .select('shares_amount, transaction_type, transaction_date, notes, recipient_user_id, grant_id')
                .eq('transaction_type', 'grant')
                .gte('shares_amount', 4100000)
                .lte('shares_amount', 4300000); // 4.1M - 4.3M range for Justin's 4.2M
              
              if (justinGrants && justinGrants.length > 0) {
                console.log(`🔍 [TEAM] Found Justin grant by share amount:`, justinGrants);
                equityData = justinGrants;
              }
            }
          }

          // Check for cancellations that might affect the total
          const { data: cancellations } = await supabase
            .from('equity_ledger')
            .select('shares_amount, grant_id, recipient_user_id')
            .eq('transaction_type', 'cancellation')
            .eq('recipient_user_id', exec.user_id);

          // Filter out cancelled grants
          const cancelledGrantIds = new Set(
            cancellations?.map(c => c.grant_id).filter(Boolean) || []
          );
          const cancelledAmounts = new Set(
            cancellations?.map(c => `${c.recipient_user_id}_${c.shares_amount}`) || []
          );

          const activeGrants = equityData.filter(entry => {
            // Skip if cancelled by grant_id
            if (entry.grant_id && cancelledGrantIds.has(entry.grant_id)) {
              return false;
            }
            // Skip if cancelled by user_id + shares_amount
            const entryKey = `${entry.recipient_user_id}_${entry.shares_amount}`;
            if (cancelledAmounts.has(entryKey)) {
              return false;
            }
            return true;
          });

          // Debug: log all equity entries
          if (equityData.length > 0) {
            console.log(`📊 [TEAM] ${name} equity entries (before filtering):`, equityData.map(e => ({
              shares: e.shares_amount,
              type: e.transaction_type,
              date: e.transaction_date,
              grant_id: e.grant_id,
              recipient_user_id: e.recipient_user_id,
              notes: e.notes?.substring(0, 50)
            })));
            console.log(`📊 [TEAM] ${name} active grants (after filtering cancellations):`, activeGrants.length);
          }

          // Sum all active equity grants
          const shares = activeGrants.reduce((sum: number, entry: any) => {
            const amount = Number(entry.shares_amount) || 0;
            return sum + amount;
          }, 0);
          
          const percentage = shares > 0 ? (shares / totalAuthorized) * 100 : 0;

          console.log(`✅ [TEAM] ${name}: ${shares.toLocaleString()} shares (${percentage.toFixed(2)}%)`);

          return {
            user_id: exec.user_id,
            name,
            title: exec.title || '',
            email,
            shares,
            percentage,
          };
        })
      );

      // Filter out null entries (duplicates/orphaned)
      const validExecutives = executivesWithEquity.filter((exec): exec is Executive => exec !== null);

      console.log(`✅ [TEAM] Loaded ${validExecutives.length} valid executives`);
      setExecutives(validExecutives);
    } catch (err: any) {
      console.error('❌ [TEAM] Error loading executives:', err);
      notifications.show({
        title: 'Error',
        message: err.message || 'Failed to load executives',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="xl" py="md" style={{ padding: '16px 24px' }}>
      <Stack gap="md">
        <Group justify="space-between">
          <div>
            <Title order={1} style={{ fontSize: 24 }}>Team Management</Title>
            <Text c="dimmed" size="sm" mt={4}>
              Executive directory and contact information
            </Text>
          </div>
          <Button leftSection={<IconPlus size={16} />}>
            Add Executive
          </Button>
        </Group>

        <Grid>
          {executives.map((exec) => (
            <Grid.Col key={exec.user_id} span={{ base: 12, md: 6, lg: 4 }}>
              <Card padding="lg" withBorder>
                <Stack gap="md">
                  <Group>
                    <Avatar size="lg" color="blue" radius="xl">
                      {exec.name.charAt(0)}
                    </Avatar>
                    <div style={{ flex: 1 }}>
                      <Text fw={600} size="lg">{exec.name}</Text>
                      <Text size="sm" c="dimmed">{exec.title}</Text>
                    </div>
                  </Group>

                  {exec.email && (
                    <Group gap="xs">
                      <IconMail size={16} color="gray" />
                      <Text size="sm">{exec.email}</Text>
                    </Group>
                  )}

                  {/* Always show equity holdings section */}
                  <Card padding="sm" withBorder style={{ backgroundColor: '#f9fafb' }}>
                    <Stack gap="xs">
                      <Text size="xs" c="dimmed">Equity Holdings</Text>
                      <Group justify="space-between">
                        <Text fw={600}>
                          {exec.shares && exec.shares > 0 ? (
                            <>
                              <NumberFormatter value={exec.shares} thousandSeparator /> shares
                            </>
                          ) : (
                            '0 shares'
                          )}
                        </Text>
                        {exec.shares && exec.shares > 0 && exec.percentage ? (
                          <Badge color="purple" variant="light">
                            {exec.percentage.toFixed(2)}%
                          </Badge>
                        ) : (
                          <Badge color="gray" variant="light">
                            0%
                          </Badge>
                        )}
                      </Group>
                    </Stack>
                  </Card>

                  <Group gap="xs" mt="md">
                    <Button 
                      variant="light" 
                      size="xs" 
                      style={{ flex: 1 }}
                      leftSection={<IconEye size={14} />}
                      onClick={() => {
                        setSelectedExecutive(exec);
                        setDetailModalOpen(true);
                      }}
                    >
                      View Details
                    </Button>
                    <Button 
                      variant="subtle" 
                      size="xs" 
                      style={{ flex: 1 }}
                      leftSection={<IconEdit size={14} />}
                      onClick={() => {
                        setSelectedExecutive(exec);
                        setEditModalOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                  </Group>
                </Stack>
              </Card>
            </Grid.Col>
          ))}
        </Grid>

        {executives.length === 0 && !loading && (
          <Card padding="xl" withBorder>
            <Stack align="center" gap="md" py="xl">
              <Text c="dimmed">No executives found</Text>
            </Stack>
          </Card>
        )}
      </Stack>

      {/* View Details Modal */}
      <Modal
        opened={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedExecutive(null);
        }}
        title="Executive Details"
        size="lg"
      >
        {selectedExecutive && (
          <Stack gap="md">
            <Group>
              <Avatar size="xl" color="blue" radius="xl">
                {selectedExecutive.name.charAt(0)}
              </Avatar>
              <div>
                <Text fw={600} size="lg">{selectedExecutive.name}</Text>
                <Text size="sm" c="dimmed">{selectedExecutive.title}</Text>
              </div>
            </Group>

            <Divider />

            <Group>
              <Text fw={500} style={{ minWidth: 120 }}>Email:</Text>
              <Text>{selectedExecutive.email || 'Not provided'}</Text>
            </Group>

            <Group>
              <Text fw={500} style={{ minWidth: 120 }}>Title:</Text>
              <Text>{selectedExecutive.title}</Text>
            </Group>

            <Group>
              <Text fw={500} style={{ minWidth: 120 }}>Equity Holdings:</Text>
              <Group gap="xs">
                <Text>
                  {selectedExecutive.shares && selectedExecutive.shares > 0 ? (
                    <NumberFormatter value={selectedExecutive.shares} thousandSeparator />
                  ) : (
                    '0'
                  )} shares
                </Text>
                {selectedExecutive.shares && selectedExecutive.shares > 0 && selectedExecutive.percentage ? (
                  <Badge color="purple" variant="light">
                    {selectedExecutive.percentage.toFixed(2)}%
                  </Badge>
                ) : null}
              </Group>
            </Group>

            <Group>
              <Text fw={500} style={{ minWidth: 120 }}>User ID:</Text>
              <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>
                {selectedExecutive.user_id}
              </Text>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        opened={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedExecutive(null);
        }}
        title="Edit Executive"
        size="lg"
      >
        {selectedExecutive && (
          <Stack gap="md">
            <Text c="dimmed">
              Executive editing functionality is coming soon. For now, please use the Governance portal to manage executive appointments and equity grants.
            </Text>
            <Group>
              <Text fw={500}>Name:</Text>
              <Text>{selectedExecutive.name}</Text>
            </Group>
            <Group>
              <Text fw={500}>Title:</Text>
              <Text>{selectedExecutive.title}</Text>
            </Group>
            <Group>
              <Text fw={500}>Email:</Text>
              <Text>{selectedExecutive.email || 'Not provided'}</Text>
            </Group>
            <Button
              variant="light"
              onClick={() => {
                notifications.show({
                  title: 'Info',
                  message: 'Please use the Governance portal to edit executive information and equity grants.',
                  color: 'blue',
                });
                setEditModalOpen(false);
              }}
            >
              Go to Governance Portal
            </Button>
          </Stack>
        )}
      </Modal>
    </Container>
  );
};

export default TeamPage;


// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Container, Stack, Title, Text, Card, Grid, Group, Badge, Avatar, Button, Modal, Divider, TextInput, Select, Loader } from '@mantine/core';
import { IconPlus, IconMail, IconEdit, IconEye, IconCheck } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { NumberFormatter } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { dedupeTeamExecutives } from '@/utils/executiveDuplicateMerge';

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
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedExecutive, setSelectedExecutive] = useState<Executive | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');

  // Add form state
  const [newExecEmail, setNewExecEmail] = useState('');
  const [newExecTitle, setNewExecTitle] = useState('');
  const [newExecRole, setNewExecRole] = useState('');

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
      const { data: execData, error: execError } = await supabase
        .from('exec_users')
        .select('user_id, title, role')
        .order('title');

      if (execError) throw execError;

      const { data: capData } = await supabase
        .from('cap_tables')
        .select('total_authorized')
        .limit(1)
        .maybeSingle();

      const totalAuthorized = capData?.total_authorized || 70000000;

      const executivesWithEquity = await Promise.all(
        (execData || []).map(async (exec: any) => {
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('full_name, email')
            .eq('user_id', exec.user_id)
            .maybeSingle();

          const name = profileData?.full_name || exec.title || 'Unknown';
          const email = profileData?.email || '';

          if (name === exec.title && exec.title !== 'Unknown') return null;

          let equityData: any[] = [];
          const { data: equityByUserId } = await supabase
            .from('equity_ledger')
            .select('shares_amount, transaction_type, grant_id, recipient_user_id')
            .eq('recipient_user_id', exec.user_id)
            .eq('transaction_type', 'grant');

          if (equityByUserId) equityData = equityByUserId;

          // Fallback for known executives
          if (equityData.length === 0) {
            if (email === 'tstroman.ceo@cravenusa.com' || name === 'Torrance Stroman') {
              const { data: torranceGrants } = await supabase
                .from('equity_ledger')
                .select('shares_amount, transaction_type, grant_id, recipient_user_id')
                .eq('transaction_type', 'grant')
                .eq('recipient_user_id', exec.user_id)
                .gte('shares_amount', 10400000)
                .lte('shares_amount', 10600000);
              if (torranceGrants?.length) equityData = torranceGrants;
            }
            if (email === 'jsweet.cfo@cravenusa.com' || name === 'Justin Sweet') {
              const { data: justinGrants } = await supabase
                .from('equity_ledger')
                .select('shares_amount, transaction_type, grant_id, recipient_user_id')
                .eq('transaction_type', 'grant')
                .eq('recipient_user_id', exec.user_id)
                .gte('shares_amount', 4100000)
                .lte('shares_amount', 4300000);
              if (justinGrants?.length) equityData = justinGrants;
            }
          }

          const { data: cancellations } = await supabase
            .from('equity_ledger')
            .select('shares_amount, grant_id, recipient_user_id')
            .eq('transaction_type', 'cancellation')
            .eq('recipient_user_id', exec.user_id);

          const cancelledGrantIds = new Set(cancellations?.map(c => c.grant_id).filter(Boolean) || []);
          const activeGrants = equityData.filter(entry => {
            if (entry.grant_id && cancelledGrantIds.has(entry.grant_id)) return false;
            return true;
          });

          const shares = activeGrants.reduce((sum: number, entry: any) => sum + (Number(entry.shares_amount) || 0), 0);
          const percentage = shares > 0 ? (shares / totalAuthorized) * 100 : 0;

          return { user_id: exec.user_id, name, title: exec.title || '', email, shares, percentage };
        })
      );

      const filtered = executivesWithEquity.filter((exec): exec is Executive => exec !== null);
      setExecutives(dedupeTeamExecutives(filtered, totalAuthorized));
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.message || 'Failed to load executives', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (!selectedExecutive) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from('exec_users')
        .update({ title: editTitle })
        .eq('user_id', selectedExecutive.user_id);

      if (error) throw error;

      notifications.show({ title: 'Success', message: 'Executive title updated', color: 'green' });
      setEditModalOpen(false);
      setSelectedExecutive(null);
      loadExecutives();
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.message || 'Failed to update', color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddExecutive = async () => {
    if (!newExecEmail || !newExecTitle) {
      notifications.show({ title: 'Error', message: 'Email and title are required', color: 'red' });
      return;
    }
    try {
      setSaving(true);

      // Look up user by email in user_profiles
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('email', newExecEmail.toLowerCase().trim())
        .maybeSingle();

      if (!profile?.user_id) {
        notifications.show({ title: 'Error', message: 'No user found with that email. The user must have an account first.', color: 'red' });
        return;
      }

      // Check if already an executive
      const { data: existing } = await supabase
        .from('exec_users')
        .select('id')
        .eq('user_id', profile.user_id)
        .maybeSingle();

      if (existing) {
        notifications.show({ title: 'Error', message: 'This user is already an executive', color: 'orange' });
        return;
      }

      const { error } = await supabase.from('exec_users').insert({
        user_id: profile.user_id,
        title: newExecTitle,
        role: newExecRole || null,
        officer_status: 'active',
      });

      if (error) throw error;

      notifications.show({ title: 'Success', message: `${newExecTitle} added successfully`, color: 'green' });
      setAddModalOpen(false);
      setNewExecEmail('');
      setNewExecTitle('');
      setNewExecRole('');
      loadExecutives();
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.message || 'Failed to add executive', color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container size="xl" py="md" style={{ padding: '16px 24px' }}>
      <Stack gap="md">
        <Group justify="space-between">
          <div>
            <Title order={1} style={{ fontSize: 24 }}>Team Management</Title>
            <Text c="dimmed" size="sm" mt={4}>Executive directory and contact information</Text>
          </div>
          {!isReadOnly && (
            <Button leftSection={<IconPlus size={16} />} onClick={() => setAddModalOpen(true)}>
              Add Executive
            </Button>
          )}
        </Group>

        {loading ? (
          <Stack align="center" py="xl"><Loader size="lg" /></Stack>
        ) : (
          <Grid>
            {executives.map((exec) => (
              <Grid.Col key={exec.user_id} span={{ base: 12, md: 6, lg: 4 }}>
                <Card padding="lg" withBorder>
                  <Stack gap="md">
                    <Group>
                      <Avatar size="lg" color="blue" radius="xl">{exec.name.charAt(0)}</Avatar>
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
                    <Card padding="sm" withBorder style={{ backgroundColor: '#f9fafb' }}>
                      <Stack gap="xs">
                        <Text size="xs" c="dimmed">Equity Holdings</Text>
                        <Group justify="space-between">
                          <Text fw={600}>
                            {exec.shares && exec.shares > 0 ? (
                              <><NumberFormatter value={exec.shares} thousandSeparator /> shares</>
                            ) : '0 shares'}
                          </Text>
                          <Badge color={exec.shares && exec.shares > 0 ? 'purple' : 'gray'} variant="light">
                            {exec.percentage ? exec.percentage.toFixed(2) : '0'}%
                          </Badge>
                        </Group>
                      </Stack>
                    </Card>
                    <Group gap="xs" mt="md">
                      <Button variant="light" size="xs" style={{ flex: 1 }} leftSection={<IconEye size={14} />}
                        onClick={() => { setSelectedExecutive(exec); setDetailModalOpen(true); }}>
                        View Details
                      </Button>
                      {!isReadOnly && (
                        <Button variant="subtle" size="xs" style={{ flex: 1 }} leftSection={<IconEdit size={14} />}
                          onClick={() => { setSelectedExecutive(exec); setEditTitle(exec.title); setEditModalOpen(true); }}>
                          Edit
                        </Button>
                      )}
                    </Group>
                  </Stack>
                </Card>
              </Grid.Col>
            ))}
          </Grid>
        )}

        {executives.length === 0 && !loading && (
          <Card padding="xl" withBorder>
            <Stack align="center" gap="md" py="xl"><Text c="dimmed">No executives found</Text></Stack>
          </Card>
        )}
      </Stack>

      {/* View Details Modal */}
      <Modal opened={detailModalOpen} onClose={() => { setDetailModalOpen(false); setSelectedExecutive(null); }} title="Executive Details" size="lg">
        {selectedExecutive && (
          <Stack gap="md">
            <Group>
              <Avatar size="xl" color="blue" radius="xl">{selectedExecutive.name.charAt(0)}</Avatar>
              <div>
                <Text fw={600} size="lg">{selectedExecutive.name}</Text>
                <Text size="sm" c="dimmed">{selectedExecutive.title}</Text>
              </div>
            </Group>
            <Divider />
            <Group><Text fw={500} style={{ minWidth: 120 }}>Email:</Text><Text>{selectedExecutive.email || 'Not provided'}</Text></Group>
            <Group><Text fw={500} style={{ minWidth: 120 }}>Title:</Text><Text>{selectedExecutive.title}</Text></Group>
            <Group>
              <Text fw={500} style={{ minWidth: 120 }}>Equity Holdings:</Text>
              <Group gap="xs">
                <Text>{selectedExecutive.shares && selectedExecutive.shares > 0 ? <NumberFormatter value={selectedExecutive.shares} thousandSeparator /> : '0'} shares</Text>
                {selectedExecutive.percentage && selectedExecutive.percentage > 0 ? <Badge color="purple" variant="light">{selectedExecutive.percentage.toFixed(2)}%</Badge> : null}
              </Group>
            </Group>
            <Group>
              <Text fw={500} style={{ minWidth: 120 }}>User ID:</Text>
              <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>{selectedExecutive.user_id}</Text>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Edit Modal - Now functional */}
      <Modal opened={editModalOpen} onClose={() => { setEditModalOpen(false); setSelectedExecutive(null); }} title="Edit Executive" size="md">
        {selectedExecutive && (
          <Stack gap="md">
            <Group>
              <Avatar size="lg" color="blue" radius="xl">{selectedExecutive.name.charAt(0)}</Avatar>
              <div>
                <Text fw={600}>{selectedExecutive.name}</Text>
                <Text size="sm" c="dimmed">{selectedExecutive.email}</Text>
              </div>
            </Group>
            <Divider />
            <TextInput label="Title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Chief Executive Officer" required />
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setEditModalOpen(false)}>Cancel</Button>
              <Button onClick={handleEditSave} loading={saving} leftSection={<IconCheck size={16} />}>Save Changes</Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Add Executive Modal */}
      <Modal opened={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add New Executive" size="md">
        <Stack gap="md">
          <TextInput label="Email Address" placeholder="user@cravenusa.com" value={newExecEmail} onChange={(e) => setNewExecEmail(e.target.value)} required description="The user must already have an account" />
          <TextInput label="Title" placeholder="Chief Technology Officer" value={newExecTitle} onChange={(e) => setNewExecTitle(e.target.value)} required />
          <Select label="Role" placeholder="Select role" value={newExecRole} onChange={(v) => setNewExecRole(v || '')}
            data={[
              { value: 'ceo', label: 'CEO' },
              { value: 'cfo', label: 'CFO' },
              { value: 'coo', label: 'COO' },
              { value: 'cto', label: 'CTO' },
              { value: 'cpo', label: 'CPO' },
              { value: 'cmo', label: 'CMO' },
              { value: 'chro', label: 'CHRO' },
              { value: 'vp', label: 'Vice President' },
              { value: 'director', label: 'Director' },
              { value: 'other', label: 'Other' },
            ]}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setAddModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddExecutive} loading={saving} leftSection={<IconPlus size={16} />}>Add Executive</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
};

export default TeamPage;

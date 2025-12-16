import React, { useState, useEffect } from 'react';
import { Stack, Title, Text, Card, Group, Badge, Button, Grid, Tabs, Table, Alert, Textarea, Select, ActionIcon, Menu, Modal, TextInput } from '@mantine/core';
import { IconZoomMoney, IconMail, IconUsers, IconChartPie, IconDownload, IconSend, IconFileText, IconUserPlus, IconDotsVertical, IconPhone, IconCheck, IconX, IconEye } from '@tabler/icons-react';
import { useToast } from '@/hooks/useEmbeddedToast';
import { supabase } from '@/integrations/supabase/client';
import { PitchDeckManager } from '@/components/admin/PitchDeckManager';

interface Investor {
  id: string;
  investor_name: string;
  investor_type: string;
  investment_amount: number;
  investment_date: string;
  ownership_percent: number;
  contact_email: string | null;
}

interface InvestorInterest {
  id: string;
  opportunity_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  investor_type: string | null;
  investment_range: string | null;
  message: string | null;
  status: 'new' | 'contacted' | 'in_discussion' | 'committed' | 'invested' | 'declined' | 'archived';
  notes: string | null;
  shortlisted: boolean;
  created_at: string;
  opportunity?: {
    company_name: string;
  };
}

const INVESTMENT_RANGE_LABELS: Record<string, string> = {
  'under_10k': 'Under $10K',
  '10k_50k': '$10K - $50K',
  '50k_100k': '$50K - $100K',
  '100k_250k': '$100K - $250K',
  '250k_500k': '$250K - $500K',
  '500k_1m': '$500K - $1M',
  'over_1m': 'Over $1M',
};

const INVESTOR_TYPE_LABELS: Record<string, string> = {
  'angel': 'Angel',
  'vc': 'VC',
  'family_office': 'Family Office',
  'corporate': 'Corporate',
  'individual': 'Individual',
  'other': 'Other',
};

const STATUS_COLORS: Record<string, string> = {
  'new': 'blue',
  'contacted': 'cyan',
  'in_discussion': 'yellow',
  'committed': 'orange',
  'invested': 'green',
  'declined': 'red',
  'archived': 'gray',
};

export const EnhancedInvestorRelations: React.FC = () => {
  const [updateDraft, setUpdateDraft] = useState('');
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [interests, setInterests] = useState<InvestorInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [interestsLoading, setInterestsLoading] = useState(true);
  const [selectedInterest, setSelectedInterest] = useState<InvestorInterest | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const toast = useToast();

  useEffect(() => {
    fetchInvestors();
    fetchInterests();
  }, []);

  const fetchInvestors = async () => {
    try {
      const { data, error } = await supabase
        .from('investors')
        .select('*')
        .order('investment_date', { ascending: false });

      if (error) throw error;
      if (data) setInvestors(data);
    } catch (error) {
      console.error('Error fetching investors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInterests = async () => {
    try {
      const { data, error } = await supabase
        .from('investor_interests')
        .select(`
          *,
          opportunity:investment_opportunities(company_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setInterests(data as InvestorInterest[]);
    } catch (error) {
      console.error('Error fetching interests:', error);
    } finally {
      setInterestsLoading(false);
    }
  };

  const updateInterestStatus = async (interestId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('investor_interests')
        .update({ status: newStatus })
        .eq('id', interestId);

      if (error) throw error;
      
      setInterests(prev => prev.map(i => 
        i.id === interestId ? { ...i, status: newStatus as InvestorInterest['status'] } : i
      ));
      toast.success('Status updated');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const updateInterestNotes = async () => {
    if (!selectedInterest) return;
    
    try {
      const { error } = await supabase
        .from('investor_interests')
        .update({ notes: editNotes })
        .eq('id', selectedInterest.id);

      if (error) throw error;
      
      setInterests(prev => prev.map(i => 
        i.id === selectedInterest.id ? { ...i, notes: editNotes } : i
      ));
      setNotesModalOpen(false);
      toast.success('Notes saved');
    } catch (error) {
      console.error('Error updating notes:', error);
      toast.error('Failed to save notes');
    }
  };

  const toggleShortlist = async (interest: InvestorInterest) => {
    try {
      const { error } = await supabase
        .from('investor_interests')
        .update({ shortlisted: !interest.shortlisted })
        .eq('id', interest.id);

      if (error) throw error;
      
      setInterests(prev => prev.map(i => 
        i.id === interest.id ? { ...i, shortlisted: !i.shortlisted } : i
      ));
      toast.success(interest.shortlisted ? 'Removed from shortlist' : 'Added to shortlist');
    } catch (error) {
      console.error('Error toggling shortlist:', error);
      toast.error('Failed to update shortlist');
    }
  };

  const sendUpdate = async () => {
    try {
      await supabase.from('investor_updates').insert({
        update_title: `Monthly Update - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        update_content: updateDraft,
        sent_date: new Date().toISOString(),
        status: 'sent'
      });
      toast.success('Investor update sent successfully');
      setUpdateDraft('');
    } catch (error) {
      console.error('Error sending update:', error);
      toast.error('Failed to send update');
    }
  };

  const totalCapitalRaised = investors.reduce((sum, inv) => sum + inv.investment_amount, 0);
  const totalOwnership = investors.reduce((sum, inv) => sum + inv.ownership_percent, 0);
  const newInterestsCount = interests.filter(i => i.status === 'new').length;
  const shortlistedCount = interests.filter(i => i.shortlisted).length;

  return (
    <Stack gap="lg" p={{ base: 16, md: 24 }}>
      <Group justify="space-between" wrap="wrap">
        <div>
          <Title order={2}>Investor Relations</Title>
          <Text c="dimmed" size="sm">Manage investor communications, updates, and fundraising activities</Text>
        </div>
        <Group>
          <Button variant="light" leftSection={<IconMail size={16} />}>Schedule Call</Button>
          <Button leftSection={<IconDownload size={16} />} color="blue">Data Room</Button>
        </Group>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">Total Investors</Text>
                <Title order={3}>{investors.length}</Title>
              </div>
              <IconUsers size={32} color="blue" />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">Total Capital Raised</Text>
                <Title order={3}>${(totalCapitalRaised / 1000000).toFixed(1)}M</Title>
              </div>
              <IconZoomMoney size={32} color="green" />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">New Interests</Text>
                <Title order={3} c={newInterestsCount > 0 ? 'orange' : undefined}>
                  {newInterestsCount}
                  {newInterestsCount > 0 && <Badge size="xs" color="orange" ml="xs">New</Badge>}
                </Title>
              </div>
              <IconUserPlus size={32} color="orange" />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">Shortlisted</Text>
                <Title order={3}>{shortlistedCount}</Title>
              </div>
              <IconChartPie size={32} color="purple" />
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      <Tabs defaultValue="interested">
        <Tabs.List>
          <Tabs.Tab value="interested" leftSection={<IconUserPlus size={16} />}>
            Interested Investors
            {newInterestsCount > 0 && <Badge size="xs" color="orange" ml="xs">{newInterestsCount}</Badge>}
          </Tabs.Tab>
          <Tabs.Tab value="investors" leftSection={<IconUsers size={16} />}>Investor List</Tabs.Tab>
          <Tabs.Tab value="updates" leftSection={<IconMail size={16} />}>Monthly Updates</Tabs.Tab>
          <Tabs.Tab value="captable" leftSection={<IconChartPie size={16} />}>Cap Table</Tabs.Tab>
          <Tabs.Tab value="pitch-deck" leftSection={<IconFileText size={16} />}>Pitch Deck</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="interested" pt="md">
          <Card withBorder>
            {interestsLoading ? (
              <Text p="md">Loading interested investors...</Text>
            ) : interests.length === 0 ? (
              <Alert color="blue" m="md">
                <Text>No investor interests yet. Share your pitch deck to attract potential investors.</Text>
              </Alert>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Email</Table.Th>
                    <Table.Th>Company</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Range</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {interests.map((interest) => (
                    <Table.Tr key={interest.id} style={{ backgroundColor: interest.shortlisted ? 'rgba(255, 165, 0, 0.05)' : undefined }}>
                      <Table.Td>
                        <Group gap="xs">
                          {interest.shortlisted && <IconCheck size={14} color="orange" />}
                          <Text fw={interest.status === 'new' ? 600 : 400}>{interest.full_name}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <a href={`mailto:${interest.email}`} style={{ color: 'inherit' }}>{interest.email}</a>
                      </Table.Td>
                      <Table.Td>{interest.company_name || '-'}</Table.Td>
                      <Table.Td>
                        {interest.investor_type ? (
                          <Badge variant="light" size="sm">
                            {INVESTOR_TYPE_LABELS[interest.investor_type] || interest.investor_type}
                          </Badge>
                        ) : '-'}
                      </Table.Td>
                      <Table.Td>
                        {interest.investment_range ? INVESTMENT_RANGE_LABELS[interest.investment_range] || interest.investment_range : '-'}
                      </Table.Td>
                      <Table.Td>
                        <Select
                          size="xs"
                          value={interest.status}
                          onChange={(value) => value && updateInterestStatus(interest.id, value)}
                          data={[
                            { value: 'new', label: 'New' },
                            { value: 'contacted', label: 'Contacted' },
                            { value: 'in_discussion', label: 'In Discussion' },
                            { value: 'committed', label: 'Committed' },
                            { value: 'invested', label: 'Invested' },
                            { value: 'declined', label: 'Declined' },
                            { value: 'archived', label: 'Archived' },
                          ]}
                          styles={{
                            input: {
                              backgroundColor: `var(--mantine-color-${STATUS_COLORS[interest.status]}-light)`,
                              fontWeight: 500,
                            }
                          }}
                        />
                      </Table.Td>
                      <Table.Td>{new Date(interest.created_at).toLocaleDateString()}</Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon
                            variant="subtle"
                            size="sm"
                            onClick={() => {
                              setSelectedInterest(interest);
                              setViewModalOpen(true);
                            }}
                            title="View details"
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                          {interest.phone && (
                            <ActionIcon
                              variant="subtle"
                              size="sm"
                              component="a"
                              href={`tel:${interest.phone}`}
                              title="Call"
                            >
                              <IconPhone size={16} />
                            </ActionIcon>
                          )}
                          <Menu shadow="md" width={200}>
                            <Menu.Target>
                              <ActionIcon variant="subtle" size="sm">
                                <IconDotsVertical size={16} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item
                                leftSection={interest.shortlisted ? <IconX size={14} /> : <IconCheck size={14} />}
                                onClick={() => toggleShortlist(interest)}
                              >
                                {interest.shortlisted ? 'Remove from Shortlist' : 'Add to Shortlist'}
                              </Menu.Item>
                              <Menu.Item
                                leftSection={<IconMail size={14} />}
                                component="a"
                                href={`mailto:${interest.email}`}
                              >
                                Send Email
                              </Menu.Item>
                              <Menu.Item
                                leftSection={<IconFileText size={14} />}
                                onClick={() => {
                                  setSelectedInterest(interest);
                                  setEditNotes(interest.notes || '');
                                  setNotesModalOpen(true);
                                }}
                              >
                                Add Notes
                              </Menu.Item>
                            </Menu.Dropdown>
                          </Menu>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="investors" pt="md">
          <Card withBorder>
            {loading ? (
              <Text p="md">Loading investors...</Text>
            ) : investors.length === 0 ? (
              <Alert color="blue" m="md"><Text>No investors recorded yet. Add investor information to track relationships and ownership.</Text></Alert>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Investor Name</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Ownership</Table.Th>
                    <Table.Th>Investment</Table.Th>
                    <Table.Th>Date</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {investors.map((investor) => (
                    <Table.Tr key={investor.id}>
                      <Table.Td>{investor.investor_name}</Table.Td>
                      <Table.Td><Badge variant="light">{investor.investor_type}</Badge></Table.Td>
                      <Table.Td>{investor.ownership_percent.toFixed(1)}%</Table.Td>
                      <Table.Td>${(investor.investment_amount / 1000000).toFixed(1)}M</Table.Td>
                      <Table.Td>{new Date(investor.investment_date).toLocaleDateString()}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="updates" pt="md">
          <Stack gap="md">
            <Alert color="blue" icon={<IconMail />}>
              <Text fw={500}>Next Monthly Update Due: {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString()}</Text>
              <Text size="sm">Send consistent monthly updates to maintain investor confidence</Text>
            </Alert>

            <Card withBorder p="md">
              <Title order={4} mb="md">Draft Monthly Update</Title>
              <Textarea
                placeholder="Key highlights:&#10;- Financial performance&#10;- Major milestones&#10;- Team updates&#10;- Key metrics&#10;- Asks from investors"
                minRows={10}
                value={updateDraft}
                onChange={(e) => setUpdateDraft(e.target.value)}
              />
              <Group justify="flex-end" mt="md">
                <Button
                  leftSection={<IconSend size={16} />}
                  onClick={sendUpdate}
                  disabled={!updateDraft.trim()}
                >
                  Send Update
                </Button>
              </Group>
            </Card>

            <Card withBorder p="md">
              <Title order={4} mb="md">Update Template</Title>
              <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-line' }}>
                <strong>Monthly Investor Update - [Month, Year]</strong>
                {'\n\n'}
                <strong>Executive Summary</strong>
                {'\n'}- Key achievement or milestone
                {'\n'}- Brief financial snapshot
                {'\n\n'}
                <strong>Financial Performance</strong>
                {'\n'}- Revenue: [Amount] ([% change] vs prior month)
                {'\n'}- Expenses: [Amount]
                {'\n'}- Cash Position: [Amount]
                {'\n'}- Burn Rate: [Amount/month]
                {'\n'}- Runway: [Months]
                {'\n\n'}
                <strong>Key Metrics</strong>
                {'\n'}- Customer count
                {'\n'}- User growth
                {'\n'}- Engagement metrics
                {'\n\n'}
                <strong>Major Accomplishments</strong>
                {'\n'}- Product launches
                {'\n'}- Partnerships
                {'\n'}- Team hires
                {'\n\n'}
                <strong>Challenges & How We're Addressing Them</strong>
                {'\n\n'}
                <strong>Looking Ahead</strong>
                {'\n'}- Next month's priorities
                {'\n\n'}
                <strong>How You Can Help</strong>
                {'\n'}- Specific asks from investors
              </Text>
            </Card>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="captable" pt="md">
          <Card withBorder p="md">
            <Alert color="blue" icon={<IconChartPie />}>
              <Text fw={500}>Cap Table Summary</Text>
              <Text size="sm">Detailed cap table visualization available in Capital Structure tab</Text>
            </Alert>

            <Stack gap="md" mt="md">
              <Grid>
                <Grid.Col span={6}>
                  <Text size="sm" fw={500} c="dimmed">Total Investor Ownership</Text>
                  <Title order={3}>{totalOwnership.toFixed(1)}%</Title>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="sm" fw={500} c="dimmed">Number of Investors</Text>
                  <Title order={3}>{investors.length}</Title>
                </Grid.Col>
              </Grid>

              {investors.length > 0 && (
                <div>
                  <Text size="sm" fw={500} mb="xs">Top Investors:</Text>
                  {investors.slice(0, 5).map(inv => (
                    <Group key={inv.id} justify="space-between" mb="xs">
                      <Text size="sm">{inv.investor_name}</Text>
                      <Badge>{inv.ownership_percent.toFixed(1)}%</Badge>
                    </Group>
                  ))}
                </div>
              )}
            </Stack>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="pitch-deck" pt="md">
          <div style={{ padding: 0 }}>
            <PitchDeckManager />
          </div>
        </Tabs.Panel>
      </Tabs>

      {/* View Interest Modal */}
      <Modal
        opened={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title="Investor Interest Details"
        size="lg"
      >
        {selectedInterest && (
          <Stack gap="md">
            <Grid>
              <Grid.Col span={6}>
                <Text size="sm" c="dimmed">Full Name</Text>
                <Text fw={500}>{selectedInterest.full_name}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" c="dimmed">Email</Text>
                <Text fw={500}>
                  <a href={`mailto:${selectedInterest.email}`}>{selectedInterest.email}</a>
                </Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" c="dimmed">Phone</Text>
                <Text fw={500}>{selectedInterest.phone || '-'}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" c="dimmed">Company/Fund</Text>
                <Text fw={500}>{selectedInterest.company_name || '-'}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" c="dimmed">Investor Type</Text>
                <Text fw={500}>
                  {selectedInterest.investor_type 
                    ? INVESTOR_TYPE_LABELS[selectedInterest.investor_type] || selectedInterest.investor_type 
                    : '-'}
                </Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" c="dimmed">Investment Range</Text>
                <Text fw={500}>
                  {selectedInterest.investment_range 
                    ? INVESTMENT_RANGE_LABELS[selectedInterest.investment_range] || selectedInterest.investment_range 
                    : '-'}
                </Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" c="dimmed">Status</Text>
                <Badge color={STATUS_COLORS[selectedInterest.status]}>{selectedInterest.status}</Badge>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" c="dimmed">Date Submitted</Text>
                <Text fw={500}>{new Date(selectedInterest.created_at).toLocaleString()}</Text>
              </Grid.Col>
            </Grid>

            {selectedInterest.message && (
              <div>
                <Text size="sm" c="dimmed" mb="xs">Message</Text>
                <Card withBorder p="sm" bg="gray.0">
                  <Text size="sm">{selectedInterest.message}</Text>
                </Card>
              </div>
            )}

            {selectedInterest.notes && (
              <div>
                <Text size="sm" c="dimmed" mb="xs">Internal Notes</Text>
                <Card withBorder p="sm" bg="yellow.0">
                  <Text size="sm">{selectedInterest.notes}</Text>
                </Card>
              </div>
            )}

            <Group justify="flex-end" mt="md">
              <Button
                variant="light"
                leftSection={<IconMail size={16} />}
                component="a"
                href={`mailto:${selectedInterest.email}`}
              >
                Send Email
              </Button>
              {selectedInterest.phone && (
                <Button
                  variant="light"
                  leftSection={<IconPhone size={16} />}
                  component="a"
                  href={`tel:${selectedInterest.phone}`}
                >
                  Call
                </Button>
              )}
              <Button
                onClick={() => toggleShortlist(selectedInterest)}
                color={selectedInterest.shortlisted ? 'gray' : 'orange'}
              >
                {selectedInterest.shortlisted ? 'Remove from Shortlist' : 'Add to Shortlist'}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Notes Modal */}
      <Modal
        opened={notesModalOpen}
        onClose={() => setNotesModalOpen(false)}
        title="Internal Notes"
      >
        <Stack gap="md">
          <Textarea
            placeholder="Add internal notes about this investor interest..."
            minRows={4}
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setNotesModalOpen(false)}>Cancel</Button>
            <Button onClick={updateInterestNotes}>Save Notes</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

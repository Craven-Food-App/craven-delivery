import React, { useState, useEffect } from 'react';
import { Stack, Title, Text, Card, Group, Badge, Button, Grid, Tabs, Table, Alert, Textarea } from '@mantine/core';
import { IconZoomMoney, IconMail, IconUsers, IconChartPie, IconDownload, IconSend, IconFileText } from '@tabler/icons-react';
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

export const EnhancedInvestorRelations: React.FC = () => {
  const [updateDraft, setUpdateDraft] = useState('');
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchInvestors();
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
                <Text size="sm" c="dimmed">Investor Ownership</Text>
                <Title order={3}>{totalOwnership.toFixed(1)}%</Title>
              </div>
              <IconChartPie size={32} color="orange" />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">Next Update Due</Text>
                <Title order={3}>{new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).getDate() - new Date().getDate()} days</Title>
              </div>
              <IconMail size={32} color="purple" />
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      <Tabs defaultValue="investors">
        <Tabs.List>
          <Tabs.Tab value="investors" leftSection={<IconUsers size={16} />}>Investor List</Tabs.Tab>
          <Tabs.Tab value="updates" leftSection={<IconMail size={16} />}>Monthly Updates</Tabs.Tab>
          <Tabs.Tab value="captable" leftSection={<IconChartPie size={16} />}>Cap Table</Tabs.Tab>
          <Tabs.Tab value="pitch-deck" leftSection={<IconFileText size={16} />}>Pitch Deck</Tabs.Tab>
        </Tabs.List>

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
    </Stack>
  );
};

import React, { useState, useEffect } from 'react';
import { Stack, Title, Text, Card, Group, Badge, Button, Grid, Tabs, Timeline, Alert, List } from '@mantine/core';
import { IconTrendingUp, IconDownload, IconCalendar, IconPresentation, IconFileText, IconChartBar } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';

interface BoardMeeting {
  id: string;
  title: string;
  scheduled_at: string;
  status: string | null;
  description: string | null;
}

export const EnhancedBoardReporting: React.FC = () => {
  const [meetings, setMeetings] = useState<BoardMeeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from('board_meetings')
        .select('*')
        .order('scheduled_at', { ascending: false });

      if (error) throw error;
      if (data) setMeetings(data);
    } catch (error) {
      console.error('Error fetching board meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const upcomingMeetings = meetings.filter(m => m.status === 'upcoming' || new Date(m.scheduled_at) > new Date());
  const completedMeetings = meetings.filter(m => m.status === 'completed' || new Date(m.scheduled_at) <= new Date());
  const nextMeeting = upcomingMeetings[0];
  const meetingsThisYear = meetings.filter(m => new Date(m.scheduled_at).getFullYear() === new Date().getFullYear());

  return (
    <Stack gap="lg" p={{ base: 16, md: 24 }}>
      <Group justify="space-between" wrap="wrap">
        <div>
          <Title order={2}>Board Reporting & Presentations</Title>
          <Text c="dimmed" size="sm">Prepare board packages, financial presentations, and executive summaries</Text>
        </div>
        <Group>
          <Button leftSection={<IconPresentation size={16} />} color="blue">Create Board Package</Button>
          <Button variant="light" leftSection={<IconDownload size={16} />}>Export Template</Button>
        </Group>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">Next Board Meeting</Text>
                <Title order={3}>{nextMeeting ? new Date(nextMeeting.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}</Title>
                {nextMeeting && <Text size="xs" c="dimmed">Package due {new Date(new Date(nextMeeting.scheduled_at).getTime() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>}
              </div>
              <IconCalendar size={32} color="blue" />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">Meetings This Year</Text>
                <Title order={3}>{meetingsThisYear.length}</Title>
                <Text size="xs" c="dimmed">{upcomingMeetings.length} upcoming</Text>
              </div>
              <IconPresentation size={32} color="orange" />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">Package Status</Text>
                <Title order={3}>{nextMeeting ? 'In Progress' : 'N/A'}</Title>
                <Text size="xs" c="dimmed">{nextMeeting ? '75% complete' : 'No upcoming meeting'}</Text>
              </div>
              <IconFileText size={32} color="green" />
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      <Tabs defaultValue="upcoming">
        <Tabs.List>
          <Tabs.Tab value="upcoming" leftSection={<IconCalendar size={16} />}>Upcoming Meeting</Tabs.Tab>
          <Tabs.Tab value="history" leftSection={<IconFileText size={16} />}>Meeting History</Tabs.Tab>
          <Tabs.Tab value="templates" leftSection={<IconChartBar size={16} />}>Board Package Templates</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="upcoming" pt="md">
          <Card withBorder p="md">
            {loading ? (
              <Text>Loading meetings...</Text>
            ) : !nextMeeting ? (
              <Alert color="blue"><Text>No upcoming board meetings scheduled. Add meetings to track preparation and packages.</Text></Alert>
            ) : (
              <>
                <Alert color="blue" icon={<IconCalendar />} mb="md">
                  <Text fw={500}>Next Board Meeting: {new Date(nextMeeting.scheduled_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
                  <Text size="sm">Board package due: {new Date(new Date(nextMeeting.scheduled_at).getTime() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
                </Alert>

                <Title order={4} mb="md">Board Package Checklist</Title>
                <Timeline active={3} bulletSize={24} lineWidth={2}>
                  <Timeline.Item bullet={<IconChartBar size={12} />} title="Financial Statements">
                    <Text size="sm" c="dimmed">P&L, Balance Sheet, Cash Flow Statement</Text>
                    <Badge color="green" mt="xs">Complete</Badge>
                  </Timeline.Item>
                  <Timeline.Item bullet={<IconChartBar size={12} />} title="Budget vs Actuals">
                    <Text size="sm" c="dimmed">Variance analysis and commentary</Text>
                    <Badge color="green" mt="xs">Complete</Badge>
                  </Timeline.Item>
                  <Timeline.Item bullet={<IconChartBar size={12} />} title="Cash Flow Forecast">
                    <Text size="sm" c="dimmed">6-month cash runway projection</Text>
                    <Badge color="green" mt="xs">Complete</Badge>
                  </Timeline.Item>
                  <Timeline.Item bullet={<IconChartBar size={12} />} title="Executive Summary">
                    <Text size="sm" c="dimmed">Key highlights and action items</Text>
                    <Badge color="yellow" mt="xs">In Progress</Badge>
                  </Timeline.Item>
                  <Timeline.Item bullet={<IconChartBar size={12} />} title="Department KPIs">
                    <Text size="sm" c="dimmed">Operational metrics by department</Text>
                    <Badge color="gray" mt="xs">Not Started</Badge>
                  </Timeline.Item>
                  <Timeline.Item bullet={<IconChartBar size={12} />} title="Strategic Initiatives">
                    <Text size="sm" c="dimmed">Progress on key initiatives</Text>
                    <Badge color="gray" mt="xs">Not Started</Badge>
                  </Timeline.Item>
                </Timeline>
              </>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="history" pt="md">
          <Stack gap="md">
            {loading ? (
              <Text>Loading meeting history...</Text>
            ) : meetings.length === 0 ? (
              <Alert color="blue"><Text>No board meetings recorded. Add past and future meetings to track history and preparation.</Text></Alert>
            ) : (
              meetings.map((meeting) => (
                <Card key={meeting.id} withBorder p="md">
                  <Group justify="space-between">
                    <div>
                      <Group gap="sm">
                        <Text fw={500}>{meeting.title}</Text>
                        <Badge color={new Date(meeting.scheduled_at) > new Date() ? 'blue' : 'gray'}>
                          {new Date(meeting.scheduled_at) > new Date() ? 'upcoming' : 'completed'}
                        </Badge>
                      </Group>
                      <Text size="sm" c="dimmed">Meeting Date: {new Date(meeting.scheduled_at).toLocaleDateString()}</Text>
                      {meeting.description && <Text size="sm" c="dimmed" mt="xs">{meeting.description}</Text>}
                    </div>
                    {new Date(meeting.scheduled_at) <= new Date() && (
                      <Button variant="light" size="sm" leftSection={<IconDownload size={14} />}>Download Package</Button>
                    )}
                  </Group>
                </Card>
              ))
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="templates" pt="md">
          <Stack gap="md">
            <Card withBorder p="md">
              <Title order={4} mb="md">Standard Board Package Components</Title>
              <List spacing="sm">
                <List.Item>Executive Summary (1-2 pages max)</List.Item>
                <List.Item>Financial Performance Overview</List.Item>
                <List.Item>Budget vs Actuals with Variance Commentary</List.Item>
                <List.Item>Cash Flow Forecast (6-12 months)</List.Item>
                <List.Item>Key Performance Indicators by Department</List.Item>
                <List.Item>Strategic Initiative Updates</List.Item>
                <List.Item>Risk Assessment & Mitigation</List.Item>
                <List.Item>Requests for Board Action/Approval</List.Item>
                <List.Item>Appendix: Detailed Financial Statements</List.Item>
              </List>
            </Card>

            <Card withBorder p="md">
              <Title order={4} mb="md">Best Practices</Title>
              <List spacing="sm">
                <List.Item>Send materials 3-5 days before meeting</List.Item>
                <List.Item>Limit presentation to 10-15 slides</List.Item>
                <List.Item>Focus on trends and insights, not just numbers</List.Item>
                <List.Item>Use visuals (charts/graphs) liberally</List.Item>
                <List.Item>Include both good and bad news</List.Item>
                <List.Item>Prepare answers for likely questions</List.Item>
                <List.Item>Keep executive summary concise</List.Item>
              </List>
            </Card>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};

import React, { useState } from 'react';
import { Container, Stack, Title, Text, Tabs, Card, Grid, Badge, Group } from '@mantine/core';
import { IconUsers, IconFileText, IconCalendar, IconCheckbox } from '@tabler/icons-react';
import { useSearchParams } from 'react-router-dom';
import ResolutionVotingDashboard from '../governance-admin/ResolutionVotingDashboard';
import BoardResolutionList from './BoardResolutionList';
import BoardMembersDirectory from './BoardMembersDirectory';
import BoardMeetingsTab from './BoardMeetingsTab';
import BoardDocumentsTab from './BoardDocumentsTab';

/**
 * Board Portal Page
 * 
 * Comprehensive board member dashboard with:
 * - Board Members Directory
 * - Voting Dashboard
 * - Meeting Schedule
 * - Board Documents
 */
const BoardPortalPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string | null>(
    searchParams.get('tab') || 'members'
  );

  const handleTabChange = (value: string | null) => {
    if (value) {
      setActiveTab(value);
      setSearchParams({ tab: value });
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <div>
          <Title order={1}>Board Portal</Title>
          <Text c="dimmed" size="lg" mt={4}>
            Board member dashboard, voting, and governance
          </Text>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tabs.List>
            <Tabs.Tab value="members" leftSection={<IconUsers size={18} />}>
              Board Members
            </Tabs.Tab>
            <Tabs.Tab value="voting" leftSection={<IconCheckbox size={18} />}>
              Voting Dashboard
            </Tabs.Tab>
            <Tabs.Tab value="meetings" leftSection={<IconCalendar size={18} />}>
              Meetings
            </Tabs.Tab>
            <Tabs.Tab value="documents" leftSection={<IconFileText size={18} />}>
              Documents
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="members" pt="xl">
            <BoardMembersDirectory />
          </Tabs.Panel>

          <Tabs.Panel value="voting" pt="xl">
            <ResolutionVotingDashboard />
          </Tabs.Panel>

          <Tabs.Panel value="meetings" pt="xl">
            <BoardMeetingsTab />
          </Tabs.Panel>

          <Tabs.Panel value="documents" pt="xl">
            <BoardDocumentsTab />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
};

export default BoardPortalPage;


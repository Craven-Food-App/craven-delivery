import React, { useState } from 'react';
import { Container, Stack, Title, Text, Tabs, Card, Grid, Badge, Group } from '@mantine/core';
import { IconUsers, IconFileText, IconCalendar, IconCheckbox, IconShieldCheck } from '@tabler/icons-react';
import { useSearchParams } from 'react-router-dom';
import ResolutionVotingDashboard from '../governance-admin/ResolutionVotingDashboard';
import BoardMembersDirectory from './BoardMembersDirectory';
import BoardMeetingsTab from './BoardMeetingsTab';
import BoardDocumentsTab from './BoardDocumentsTab';
import SecretaryReviewTab from './SecretaryReviewTab';

/**
 * Board Portal Page
 * 
 * Comprehensive board member dashboard with:
 * - Board Members Directory
 * - Voting Dashboard
 * - Secretary Review (audit trail + approve/reject signed packets)
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
    <Container size="xl" py="md" style={{ padding: '16px 24px' }}>
      <Stack gap="md">
        {/* Header */}
        <div>
          <Title order={1} style={{ fontSize: 24 }}>Board Portal</Title>
          <Text c="dimmed" size="sm" mt={4}>
            Board member dashboard, voting, and governance
          </Text>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tabs.List>
            <Tabs.Tab value="members" leftSection={<IconUsers size={16} />}>
              Board Members
            </Tabs.Tab>
            <Tabs.Tab value="voting" leftSection={<IconCheckbox size={16} />}>
              Voting Dashboard
            </Tabs.Tab>
            <Tabs.Tab value="secretary-review" leftSection={<IconShieldCheck size={16} />}>
              Secretary Review
            </Tabs.Tab>
            <Tabs.Tab value="meetings" leftSection={<IconCalendar size={16} />}>
              Meetings
            </Tabs.Tab>
            <Tabs.Tab value="documents" leftSection={<IconFileText size={16} />}>
              Documents
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="members" pt="md">
            <BoardMembersDirectory />
          </Tabs.Panel>

          <Tabs.Panel value="voting" pt="md">
            <ResolutionVotingDashboard />
          </Tabs.Panel>

          <Tabs.Panel value="secretary-review" pt="md">
            <SecretaryReviewTab />
          </Tabs.Panel>

          <Tabs.Panel value="meetings" pt="md">
            <BoardMeetingsTab />
          </Tabs.Panel>

          <Tabs.Panel value="documents" pt="md">
            <BoardDocumentsTab />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
};

export default BoardPortalPage;


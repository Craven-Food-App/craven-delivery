import React, { useEffect, useState } from 'react';
import { Container, Title, Text, Stack, Tabs, Card } from '@mantine/core';
import { IconShield, IconUsers, IconFileText, IconUserCheck, IconHistory, IconChecklist, IconTags, IconKey, IconCheckbox, IconPlus, IconChartPie, IconCoins, IconCertificate, IconUserPlus } from '@tabler/icons-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppointmentList from './AppointmentList';
import ResolutionList from './ResolutionList';
import ResolutionBuilder from './ResolutionBuilder';
import ResolutionVotingDashboard from './ResolutionVotingDashboard';
import OfficerLedger from './OfficerLedger';
import GovernanceLogList from './GovernanceLogList';
import OfficerValidation from './OfficerValidation';
import DocumentTemplates from './DocumentTemplates';
import RoleManagement from './RoleManagement';
import CapTableOverview from './CapTableOverview';
import EquityGrantForm from './EquityGrantForm';
import EquityGrantsList from './EquityGrantsList';
import ShareCertificateViewer from './ShareCertificateViewer';
import { BoardSetupModule } from '@/components/board/BoardSetupModule';
import UserAccountManager from '@/components/admin/UserAccountManager';

const GovernanceAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || 'appointments');

  // Update active tab when URL changes
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Handle tab change
  const handleTabChange = (value: string | null) => {
    if (value) {
      setActiveTab(value);
      setSearchParams({ tab: value });
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1} c="dark" mb="xs">
            <IconShield size={32} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 12 }} />
            Governance Administration
          </Title>
          <Text c="dimmed" size="lg">
            Manage executive appointments, board resolutions, corporate officers, and governance logs.
          </Text>
        </div>

        <Card
          padding="lg"
          radius="md"
          withBorder
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
          }}
        >
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tabs.List>
              <Tabs.Tab value="appointments" leftSection={<IconUsers size={16} />}>
                Appointments
              </Tabs.Tab>
              <Tabs.Tab value="validation" leftSection={<IconChecklist size={16} />}>
                Officer Validation
              </Tabs.Tab>
              <Tabs.Tab value="resolutions" leftSection={<IconFileText size={16} />}>
                Resolutions
              </Tabs.Tab>
              <Tabs.Tab value="resolution-builder" leftSection={<IconPlus size={16} />}>
                Create Resolution
              </Tabs.Tab>
              <Tabs.Tab value="voting" leftSection={<IconCheckbox size={16} />}>
                Voting Dashboard
              </Tabs.Tab>
              <Tabs.Tab value="officers" leftSection={<IconUserCheck size={16} />}>
                Officers
              </Tabs.Tab>
              <Tabs.Tab value="cap-table" leftSection={<IconChartPie size={16} />}>
                Cap Table
              </Tabs.Tab>
              <Tabs.Tab value="equity-grant" leftSection={<IconCoins size={16} />}>
                Equity Grants
              </Tabs.Tab>
              <Tabs.Tab value="certificates" leftSection={<IconCertificate size={16} />}>
                Certificates
              </Tabs.Tab>
              <Tabs.Tab value="logs" leftSection={<IconHistory size={16} />}>
                Governance Logs
              </Tabs.Tab>
              <Tabs.Tab value="templates" leftSection={<IconTags size={16} />}>
                Document Templates
              </Tabs.Tab>
              <Tabs.Tab value="roles" leftSection={<IconKey size={16} />}>
                Role Management
              </Tabs.Tab>
              <Tabs.Tab value="user-accounts" leftSection={<IconUserPlus size={16} />}>
                Executive Accounts
              </Tabs.Tab>
              <Tabs.Tab value="board-setup" leftSection={<IconUsers size={16} />}>
                Board Setup
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="appointments" pt="md">
              <AppointmentList />
            </Tabs.Panel>

            <Tabs.Panel value="validation" pt="md">
              <OfficerValidation />
            </Tabs.Panel>

            <Tabs.Panel value="resolutions" pt="md">
              <ResolutionList />
            </Tabs.Panel>

            <Tabs.Panel value="resolution-builder" pt="md">
              <ResolutionBuilder />
            </Tabs.Panel>

            <Tabs.Panel value="voting" pt="md">
              <ResolutionVotingDashboard />
            </Tabs.Panel>

            <Tabs.Panel value="officers" pt="md">
              <OfficerLedger />
            </Tabs.Panel>

            <Tabs.Panel value="cap-table" pt="md">
              <CapTableOverview />
            </Tabs.Panel>

            <Tabs.Panel value="equity-grant" pt="md">
              <Stack gap="xl">
                <EquityGrantsList />
                <EquityGrantForm />
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="certificates" pt="md">
              <ShareCertificateViewer />
            </Tabs.Panel>

            <Tabs.Panel value="logs" pt="md">
              <GovernanceLogList />
            </Tabs.Panel>

            <Tabs.Panel value="templates" pt="md">
              <DocumentTemplates />
            </Tabs.Panel>

            <Tabs.Panel value="roles" pt="md">
              <RoleManagement />
            </Tabs.Panel>

            <Tabs.Panel value="user-accounts" pt="md">
              <UserAccountManager />
            </Tabs.Panel>

            <Tabs.Panel value="board-setup" pt="md">
              <BoardSetupModule />
            </Tabs.Panel>
          </Tabs>
        </Card>
      </Stack>
    </Container>
  );
};

export default GovernanceAdminDashboard;

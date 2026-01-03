import React, { useEffect, useState } from 'react';
import { Container, Title, Text, Stack, Tabs, Card, Box, Group } from '@mantine/core';
import { IconShield, IconUsers, IconFileText, IconUserCheck, IconHistory, IconChecklist, IconTags, IconKey, IconPlus, IconChartPie, IconCoins, IconCertificate, IconUserPlus, IconUserMinus, IconArchive } from '@tabler/icons-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppointmentList from './AppointmentList';
import ResolutionList from './ResolutionList';
import ResolutionBuilder from './ResolutionBuilder';
import BoardResolutionWizard from './wizards/BoardResolutionWizard';
import OfficerLedger from './OfficerLedger';
import GovernanceLogList from './GovernanceLogList';
import OfficerValidation from './OfficerValidation';
import OfficerValidationWizard from './wizards/OfficerValidationWizard';
import DocumentTemplates from './DocumentTemplates';
import RoleManagement from './RoleManagement';
import CapTableOverview from './CapTableOverview';
import EquityGrantForm from './EquityGrantForm';
import EquityGrantWizard from './wizards/EquityGrantWizard';
import EquityGrantsList from './EquityGrantsList';
import ShareCertificateViewer from './ShareCertificateViewer';
import { BoardSetupModule } from '@/components/board/BoardSetupModule';
import UserAccountManager from '@/components/admin/UserAccountManager';
import { ExitWorkflowManager } from '@/components/hr/ExitWorkflowManager';
import ExitWorkflowWizard from './wizards/ExitWorkflowWizard';
import RecordFilingSystem from './RecordFilingSystem';
import ExecutiveStatusTracker from './ExecutiveStatusTracker';

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
        {/* Enterprise Header */}
        <Box
          style={{
            background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
            borderRadius: '12px',
            padding: '32px',
            color: 'white',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          }}
        >
          <Group gap={16} mb={8}>
            <Box
              style={{
                backgroundColor: 'rgba(255, 106, 0, 0.2)',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconShield size={40} color="#ff6a00" stroke={2.5} />
            </Box>
            <div>
              <Title order={1} c="white" mb={4} style={{ letterSpacing: '0.5px' }}>
                Governance Administration
              </Title>
              <Text c="gray.3" size="lg" style={{ letterSpacing: '0.3px' }}>
                Enterprise-grade corporate governance and executive management platform
              </Text>
            </div>
          </Group>
        </Box>

        <Card
          padding={0}
          radius="md"
          withBorder
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
          }}
        >
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tabs.List
              style={{
                backgroundColor: '#f9fafb',
                borderBottom: '2px solid #e5e7eb',
                padding: '8px 16px',
                gap: '4px',
              }}
            >
              <Tabs.Tab 
                value="appointments" 
                leftSection={<IconUsers size={18} />}
                style={{
                  fontWeight: 500,
                  padding: '12px 20px',
                  borderRadius: '8px 8px 0 0',
                }}
              >
                Appointments
              </Tabs.Tab>
              <Tabs.Tab 
                value="validation" 
                leftSection={<IconChecklist size={18} />}
                style={{
                  fontWeight: 500,
                  padding: '12px 20px',
                  borderRadius: '8px 8px 0 0',
                }}
              >
                Validation
              </Tabs.Tab>
              <Tabs.Tab 
                value="resolutions" 
                leftSection={<IconFileText size={18} />}
                style={{
                  fontWeight: 500,
                  padding: '12px 20px',
                  borderRadius: '8px 8px 0 0',
                }}
              >
                Resolutions
              </Tabs.Tab>
              <Tabs.Tab 
                value="exit-workflows" 
                leftSection={<IconUserMinus size={18} />}
                style={{
                  fontWeight: 500,
                  padding: '12px 20px',
                  borderRadius: '8px 8px 0 0',
                }}
              >
                Exit Workflows
              </Tabs.Tab>
              <Tabs.Tab 
                value="resolution-builder" 
                leftSection={<IconPlus size={18} />}
                style={{
                  fontWeight: 500,
                  padding: '12px 20px',
                  borderRadius: '8px 8px 0 0',
                }}
              >
                Create Resolution
              </Tabs.Tab>
              <Tabs.Tab 
                value="officers" 
                leftSection={<IconUserCheck size={18} />}
                style={{
                  fontWeight: 500,
                  padding: '12px 20px',
                  borderRadius: '8px 8px 0 0',
                }}
              >
                Officers
              </Tabs.Tab>
              <Tabs.Tab 
                value="cap-table" 
                leftSection={<IconChartPie size={18} />}
                style={{
                  fontWeight: 500,
                  padding: '12px 20px',
                  borderRadius: '8px 8px 0 0',
                }}
              >
                Cap Table
              </Tabs.Tab>
              <Tabs.Tab 
                value="equity-grant" 
                leftSection={<IconCoins size={18} />}
                style={{
                  fontWeight: 500,
                  padding: '12px 20px',
                  borderRadius: '8px 8px 0 0',
                }}
              >
                Equity Grants
              </Tabs.Tab>
              <Tabs.Tab 
                value="certificates" 
                leftSection={<IconCertificate size={18} />}
                style={{
                  fontWeight: 500,
                  padding: '12px 20px',
                  borderRadius: '8px 8px 0 0',
                }}
              >
                Certificates
              </Tabs.Tab>
              <Tabs.Tab 
                value="logs" 
                leftSection={<IconHistory size={18} />}
                style={{
                  fontWeight: 500,
                  padding: '12px 20px',
                  borderRadius: '8px 8px 0 0',
                }}
              >
                Logs
              </Tabs.Tab>
              <Tabs.Tab 
                value="templates" 
                leftSection={<IconTags size={18} />}
                style={{
                  fontWeight: 500,
                  padding: '12px 20px',
                  borderRadius: '8px 8px 0 0',
                }}
              >
                Templates
              </Tabs.Tab>
              <Tabs.Tab 
                value="roles" 
                leftSection={<IconKey size={18} />}
                style={{
                  fontWeight: 500,
                  padding: '12px 20px',
                  borderRadius: '8px 8px 0 0',
                }}
              >
                Roles
              </Tabs.Tab>
              <Tabs.Tab 
                value="user-accounts" 
                leftSection={<IconUserPlus size={18} />}
                style={{
                  fontWeight: 500,
                  padding: '12px 20px',
                  borderRadius: '8px 8px 0 0',
                }}
              >
                Accounts
              </Tabs.Tab>
              <Tabs.Tab 
                value="board-setup" 
                leftSection={<IconUsers size={18} />}
                style={{
                  fontWeight: 500,
                  padding: '12px 20px',
                  borderRadius: '8px 8px 0 0',
                }}
              >
                Board Setup
              </Tabs.Tab>
              <Tabs.Tab 
                value="filing-system" 
                leftSection={<IconArchive size={18} />}
                style={{
                  fontWeight: 500,
                  padding: '12px 20px',
                  borderRadius: '8px 8px 0 0',
                }}
              >
                Filing System
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="appointments" pt="xl" px="xl" pb="xl">
              <AppointmentList />
            </Tabs.Panel>

            <Tabs.Panel value="validation" pt="xl" px="xl" pb="xl">
              <OfficerValidationWizard />
            </Tabs.Panel>

            <Tabs.Panel value="resolutions" pt="xl" px="xl" pb="xl">
              <ResolutionList />
            </Tabs.Panel>

            <Tabs.Panel value="exit-workflows" pt="xl" px="xl" pb="xl">
              <Stack gap="xl">
                <ExitWorkflowWizard />
                <ExitWorkflowManager />
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="resolution-builder" pt="xl" px="xl" pb="xl">
              <BoardResolutionWizard />
            </Tabs.Panel>

            <Tabs.Panel value="officers" pt="xl" px="xl" pb="xl">
              <OfficerLedger />
            </Tabs.Panel>

            <Tabs.Panel value="cap-table" pt="xl" px="xl" pb="xl">
              <CapTableOverview />
            </Tabs.Panel>

            <Tabs.Panel value="equity-grant" pt="xl" px="xl" pb="xl">
              <Stack gap="xl">
                <EquityGrantsList />
                <EquityGrantWizard />
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="certificates" pt="xl" px="xl" pb="xl">
              <ShareCertificateViewer />
            </Tabs.Panel>

            <Tabs.Panel value="logs" pt="xl" px="xl" pb="xl">
              <GovernanceLogList />
            </Tabs.Panel>

            <Tabs.Panel value="templates" pt="xl" px="xl" pb="xl">
              <DocumentTemplates />
            </Tabs.Panel>

            <Tabs.Panel value="roles" pt="xl" px="xl" pb="xl">
              <RoleManagement />
            </Tabs.Panel>

            <Tabs.Panel value="user-accounts" pt="xl" px="xl" pb="xl">
              <UserAccountManager />
            </Tabs.Panel>

            <Tabs.Panel value="board-setup" pt="xl" px="xl" pb="xl">
              <BoardSetupModule />
            </Tabs.Panel>

            <Tabs.Panel value="filing-system" pt="xl" px="xl" pb="xl">
              <Tabs defaultValue="filing">
                <Tabs.List>
                  <Tabs.Tab value="filing">Filing System</Tabs.Tab>
                  <Tabs.Tab value="status">Executive Status</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="filing" pt="xl">
                  <RecordFilingSystem />
                </Tabs.Panel>
                <Tabs.Panel value="status" pt="xl">
                  <ExecutiveStatusTracker />
                </Tabs.Panel>
              </Tabs>
            </Tabs.Panel>
          </Tabs>
        </Card>
      </Stack>
    </Container>
  );
};

export default GovernanceAdminDashboard;

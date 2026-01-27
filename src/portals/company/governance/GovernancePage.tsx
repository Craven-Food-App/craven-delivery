import React, { useState, useEffect } from 'react';
import { Container, Tabs, Stack, Title, Text, Box } from '@mantine/core';
import { IconUserCheck, IconShield, IconFileText, IconCertificate, IconUserMinus, IconHistory } from '@tabler/icons-react';
import { useSearchParams } from 'react-router-dom';
import AppointmentsTab from './appointments/AppointmentsTab';
import OfficersTab from './officers/OfficersTab';
import ResolutionsTab from './resolutions/ResolutionsTab';
import CertificatesTab from './certificates/CertificatesTab';
import ExitWorkflowsTab from './exit-workflows/ExitWorkflowsTab';
// Using old GovernanceLogList for now - will be moved later
import GovernanceLogList from '../governance-admin/GovernanceLogList';

/**
 * Governance Administration Page
 * 
 * 5 Tabs:
 * 1. Appointments - Executive appointment workflow
 * 2. Officers - Delaware statutory compliance
 * 3. Resolutions - Board resolutions & voting
 * 4. Certificates - Stock certificate management
 * 5. Exit Workflows - Executive departure management
 */
const GovernancePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string | null>(
    searchParams.get('tab') || 'appointments'
  );

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

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
        <Box>
          <Title order={1}>Governance Administration</Title>
          <Text c="dimmed" size="lg" mt={4}>
            Corporate governance, appointments, and compliance
          </Text>
        </Box>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tabs.List>
            <Tabs.Tab value="appointments" leftSection={<IconUserCheck size={18} />}>
              Appointments
            </Tabs.Tab>
            <Tabs.Tab value="officers" leftSection={<IconShield size={18} />}>
              Officers
            </Tabs.Tab>
            <Tabs.Tab value="resolutions" leftSection={<IconFileText size={18} />}>
              Resolutions
            </Tabs.Tab>
            <Tabs.Tab value="certificates" leftSection={<IconCertificate size={18} />}>
              Certificates
            </Tabs.Tab>
            <Tabs.Tab value="exit-workflows" leftSection={<IconUserMinus size={18} />}>
              Exit Workflows
            </Tabs.Tab>
            <Tabs.Tab value="logs" leftSection={<IconHistory size={18} />}>
              Logs
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="appointments" pt="xl">
            <AppointmentsTab />
          </Tabs.Panel>

          <Tabs.Panel value="officers" pt="xl">
            <OfficersTab />
          </Tabs.Panel>

          <Tabs.Panel value="resolutions" pt="xl">
            <ResolutionsTab />
          </Tabs.Panel>

          <Tabs.Panel value="certificates" pt="xl">
            <CertificatesTab />
          </Tabs.Panel>

          <Tabs.Panel value="exit-workflows" pt="xl">
            <ExitWorkflowsTab />
          </Tabs.Panel>

          <Tabs.Panel value="logs" pt="xl">
            <GovernanceLogList />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
};

export default GovernancePage;


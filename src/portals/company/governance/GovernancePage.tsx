import React, { useState, useEffect } from 'react';
import { Container, Tabs, Stack, Title, Text, Box } from '@mantine/core';
import { IconUserCheck, IconShield, IconFileText, IconCertificate, IconUserMinus, IconHistory, IconTemplate } from '@tabler/icons-react';
import { useSearchParams } from 'react-router-dom';
import AppointmentsTab from './appointments/AppointmentsTab';
import OfficersTab from './officers/OfficersTab';
import ResolutionsTab from './resolutions/ResolutionsTab';
import CertificatesTab from './certificates/CertificatesTab';
import ExitWorkflowsTab from './exit-workflows/ExitWorkflowsTab';
import GovernanceLogList from '../governance-admin/GovernanceLogList';
import DocumentTemplates from '../governance-admin/DocumentTemplates';

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
    <Container size="xl" py="md" style={{ padding: '16px 24px' }}>
      <Stack gap="md">
        <Box>
          <Title order={1} style={{ fontSize: 24 }}>Governance Administration</Title>
          <Text c="dimmed" size="sm" mt={4}>
            Corporate governance, appointments, and compliance
          </Text>
        </Box>

        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tabs.List>
            <Tabs.Tab value="appointments" leftSection={<IconUserCheck size={16} />}>
              Appointments
            </Tabs.Tab>
            <Tabs.Tab value="officers" leftSection={<IconShield size={16} />}>
              Officers
            </Tabs.Tab>
            <Tabs.Tab value="resolutions" leftSection={<IconFileText size={16} />}>
              Resolutions
            </Tabs.Tab>
            <Tabs.Tab value="certificates" leftSection={<IconCertificate size={16} />}>
              Certificates
            </Tabs.Tab>
            <Tabs.Tab value="exit-workflows" leftSection={<IconUserMinus size={16} />}>
              Exit Workflows
            </Tabs.Tab>
            <Tabs.Tab value="templates" leftSection={<IconTemplate size={16} />}>
              Templates
            </Tabs.Tab>
            <Tabs.Tab value="logs" leftSection={<IconHistory size={16} />}>
              Logs
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="appointments" pt="md">
            <AppointmentsTab />
          </Tabs.Panel>

          <Tabs.Panel value="officers" pt="md">
            <OfficersTab />
          </Tabs.Panel>

          <Tabs.Panel value="resolutions" pt="md">
            <ResolutionsTab />
          </Tabs.Panel>

          <Tabs.Panel value="certificates" pt="md">
            <CertificatesTab />
          </Tabs.Panel>

          <Tabs.Panel value="exit-workflows" pt="md">
            <ExitWorkflowsTab />
          </Tabs.Panel>

          <Tabs.Panel value="templates" pt="md">
            <DocumentTemplates />
          </Tabs.Panel>

          <Tabs.Panel value="logs" pt="md">
            <GovernanceLogList />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
};

export default GovernancePage;


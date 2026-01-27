import React from 'react';
import { Stack, Title, Text, Card, Alert } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

const ExitWorkflowsTab: React.FC = () => {
  return (
    <Stack gap="xl">
      <div>
        <Title order={2}>Exit Workflows</Title>
        <Text c="dimmed">Manage executive departures with proper equity treatment</Text>
      </div>

      <Alert icon={<IconInfoCircle size={16} />} title="Coming Soon" color="blue">
        Exit workflow management interface will be implemented here. This will include:
        <ul style={{ marginTop: 8, marginBottom: 0 }}>
          <li>Active separations dashboard</li>
          <li>Exit process initiation</li>
          <li>Equity treatment rules</li>
          <li>Offboarding checklist</li>
        </ul>
      </Alert>
    </Stack>
  );
};

export default ExitWorkflowsTab;


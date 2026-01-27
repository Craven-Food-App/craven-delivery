import React from 'react';
import { Stack, Title, Text, Card, Alert } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

const OfficersTab: React.FC = () => {
  return (
    <Stack gap="xl">
      <div>
        <Title order={2}>Corporate Officers</Title>
        <Text c="dimmed">Delaware statutory officer positions</Text>
      </div>

      <Alert icon={<IconInfoCircle size={16} />} title="Coming Soon" color="blue">
        Officer management interface will be implemented here. This will include:
        <ul style={{ marginTop: 8, marginBottom: 0 }}>
          <li>Required officers (President, Secretary, Treasurer)</li>
          <li>Optional officers (Vice President, Assistant Secretary)</li>
          <li>Delaware compliance checks</li>
          <li>Officer appointment workflow</li>
        </ul>
      </Alert>
    </Stack>
  );
};

export default OfficersTab;


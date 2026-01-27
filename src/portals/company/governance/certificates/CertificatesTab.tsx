import React from 'react';
import { Stack, Title, Text, Card, Alert } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

const CertificatesTab: React.FC = () => {
  return (
    <Stack gap="xl">
      <div>
        <Title order={2}>Stock Certificates</Title>
        <Text c="dimmed">Generate and manage stock certificates</Text>
      </div>

      <Alert icon={<IconInfoCircle size={16} />} title="Coming Soon" color="blue">
        Certificate management interface will be implemented here. This will include:
        <ul style={{ marginTop: 8, marginBottom: 0 }}>
          <li>Certificate number tracking</li>
          <li>Certificate generation</li>
          <li>Certificate registry</li>
          <li>Replacement certificates</li>
        </ul>
      </Alert>
    </Stack>
  );
};

export default CertificatesTab;


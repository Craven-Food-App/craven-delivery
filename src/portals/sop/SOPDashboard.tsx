import React from 'react';
import { Container, Stack, Title, Text, Card, Alert } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

const SOPDashboard: React.FC = () => {
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1}>SOP Portal</Title>
          <Text c="dimmed" size="lg" mt={4}>
            Standard Operating Procedures
          </Text>
        </div>

        <Alert icon={<IconInfoCircle size={16} />} title="SOP Portal" color="green">
          SOP management features will be implemented here. This will include:
          <ul style={{ marginTop: 8, marginBottom: 0 }}>
            <li>SOP index and search</li>
            <li>Category browsing</li>
            <li>SOP viewer</li>
            <li>SOP editor</li>
            <li>Version history</li>
            <li>PDF export</li>
          </ul>
        </Alert>
      </Stack>
    </Container>
  );
};

export default SOPDashboard;


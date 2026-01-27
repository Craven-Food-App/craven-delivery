import React from 'react';
import { Container, Stack, Title, Text, Card, Alert } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

const BoardPortalPage: React.FC = () => {
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1}>Board Portal</Title>
          <Text c="dimmed" size="lg" mt={4}>
            Board member dashboard and voting
          </Text>
        </div>

        <Alert icon={<IconInfoCircle size={16} />} title="Board Portal" color="blue">
          Board portal features will be integrated here. This will include:
          <ul style={{ marginTop: 8, marginBottom: 0 }}>
            <li>Board members directory</li>
            <li>Meeting schedule</li>
            <li>Voting dashboard</li>
            <li>Board documents</li>
          </ul>
        </Alert>
      </Stack>
    </Container>
  );
};

export default BoardPortalPage;


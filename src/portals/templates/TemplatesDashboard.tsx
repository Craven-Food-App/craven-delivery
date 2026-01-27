import React from 'react';
import { Container, Stack, Title, Text, Card, Alert, Tabs } from '@mantine/core';
import { IconInfoCircle, IconMail, IconFileText } from '@tabler/icons-react';

const TemplatesDashboard: React.FC = () => {
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1}>Templates Portal</Title>
          <Text c="dimmed" size="lg" mt={4}>
            Email and Document Templates
          </Text>
        </div>

        <Tabs defaultValue="all">
          <Tabs.List>
            <Tabs.Tab value="all">All Templates</Tabs.Tab>
            <Tabs.Tab value="email" leftSection={<IconMail size={16} />}>
              Email Templates
            </Tabs.Tab>
            <Tabs.Tab value="documents" leftSection={<IconFileText size={16} />}>
              Document Templates
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="all" pt="xl">
            <Alert icon={<IconInfoCircle size={16} />} title="Templates Portal" color="purple">
              Template management features will be implemented here. This will include:
              <ul style={{ marginTop: 8, marginBottom: 0 }}>
                <li>Template library</li>
                <li>Email templates</li>
                <li>Document templates</li>
                <li>Template variables/placeholders</li>
                <li>Template preview</li>
                <li>Template cloning</li>
              </ul>
            </Alert>
          </Tabs.Panel>

          <Tabs.Panel value="email" pt="xl">
            <Alert icon={<IconInfoCircle size={16} />} title="Email Templates" color="purple">
              Email template management coming soon.
            </Alert>
          </Tabs.Panel>

          <Tabs.Panel value="documents" pt="xl">
            <Alert icon={<IconInfoCircle size={16} />} title="Document Templates" color="purple">
              Document template management coming soon.
            </Alert>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
};

export default TemplatesDashboard;


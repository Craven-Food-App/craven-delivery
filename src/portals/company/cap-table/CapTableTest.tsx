import React from 'react';
import { Container, Title, Text, Stack } from '@mantine/core';

const CapTableTest: React.FC = () => {
  console.log('✅ CapTableTest rendering');
  
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1}>Cap Table Test Page</Title>
          <Text c="dimmed" size="lg" mt={4}>
            If you can see this, routing is working!
          </Text>
        </div>
      </Stack>
    </Container>
  );
};

export default CapTableTest;


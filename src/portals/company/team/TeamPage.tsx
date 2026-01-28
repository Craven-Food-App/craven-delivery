import React, { useState, useEffect } from 'react';
import { Container, Stack, Title, Text, Card, Grid, Group, Badge, Avatar, Button } from '@mantine/core';
import { IconPlus, IconMail, IconPhone } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { NumberFormatter } from '@mantine/core';

interface Executive {
  user_id: string;
  name: string;
  title: string;
  email?: string;
  shares?: number;
  percentage?: number;
}

const TeamPage: React.FC = () => {
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExecutives();
  }, []);

  const loadExecutives = async () => {
    try {
      // Load executives
      const { data: execData, error: execError } = await supabase
        .from('exec_users')
        .select('user_id, title')
        .order('title');

      if (execError) throw execError;

      // Load equity for each executive
      const { data: capData } = await supabase
        .from('cap_tables')
        .select('total_authorized')
        .limit(1)
        .single();

      const totalAuthorized = capData?.total_authorized || 70000000;

      const executivesWithEquity = await Promise.all(
        (execData || []).map(async (exec: any) => {
          // Fetch user profile for name and email
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('full_name, email')
            .eq('user_id', exec.user_id)
            .single();

          // Fetch equity data
          const { data: equityData } = await supabase
            .from('equity_ledger')
            .select('shares_amount')
            .eq('recipient_user_id', exec.user_id)
            .eq('transaction_type', 'grant')
            .single();

          const shares = equityData?.shares_amount || 0;
          const percentage = (shares / totalAuthorized) * 100;

          return {
            user_id: exec.user_id,
            name: profileData?.full_name || exec.title || 'Unknown',
            title: exec.title || '',
            email: profileData?.email || '',
            shares,
            percentage,
          };
        })
      );

      setExecutives(executivesWithEquity);
    } catch (err) {
      console.error('Error loading executives:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <div>
            <Title order={1}>Team Management</Title>
            <Text c="dimmed" size="lg" mt={4}>
              Executive directory and contact information
            </Text>
          </div>
          <Button leftSection={<IconPlus size={16} />}>
            Add Executive
          </Button>
        </Group>

        <Grid>
          {executives.map((exec) => (
            <Grid.Col key={exec.user_id} span={{ base: 12, md: 6, lg: 4 }}>
              <Card padding="lg" withBorder>
                <Stack gap="md">
                  <Group>
                    <Avatar size="lg" color="blue" radius="xl">
                      {exec.name.charAt(0)}
                    </Avatar>
                    <div style={{ flex: 1 }}>
                      <Text fw={600} size="lg">{exec.name}</Text>
                      <Text size="sm" c="dimmed">{exec.title}</Text>
                    </div>
                  </Group>

                  {exec.email && (
                    <Group gap="xs">
                      <IconMail size={16} color="gray" />
                      <Text size="sm">{exec.email}</Text>
                    </Group>
                  )}

                  {exec.shares && exec.shares > 0 && (
                    <Card padding="sm" withBorder style={{ backgroundColor: '#f9fafb' }}>
                      <Stack gap="xs">
                        <Text size="xs" c="dimmed">Equity Holdings</Text>
                        <Group justify="space-between">
                          <Text fw={600}>
                            <NumberFormatter value={exec.shares} thousandSeparator /> shares
                          </Text>
                          <Badge color="purple" variant="light">
                            {exec.percentage?.toFixed(2)}%
                          </Badge>
                        </Group>
                      </Stack>
                    </Card>
                  )}

                  <Group gap="xs" mt="md">
                    <Button variant="light" size="xs" style={{ flex: 1 }}>
                      View Details
                    </Button>
                    <Button variant="subtle" size="xs" style={{ flex: 1 }}>
                      Edit
                    </Button>
                  </Group>
                </Stack>
              </Card>
            </Grid.Col>
          ))}
        </Grid>

        {executives.length === 0 && !loading && (
          <Card padding="xl" withBorder>
            <Stack align="center" gap="md" py="xl">
              <Text c="dimmed">No executives found</Text>
            </Stack>
          </Card>
        )}
      </Stack>
    </Container>
  );
};

export default TeamPage;


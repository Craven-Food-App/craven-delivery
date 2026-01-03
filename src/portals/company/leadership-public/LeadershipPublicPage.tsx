import React, { useState, useEffect } from 'react';
import { Container, Title, Text, Stack, Card, Badge, Loader, Center, Divider, Grid, Group } from '@mantine/core';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';
import { IconUserX, IconUserCheck } from '@tabler/icons-react';

interface CorporateOfficer {
  id: string;
  full_name: string;
  title: string;
  effective_date: string;
  status?: string;
  metadata?: {
    bio?: string;
  };
}

const getHierarchyLevel = (title: string): number => {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('ceo') || lowerTitle.includes('chief executive')) return 1;
  if (lowerTitle.includes('president') && !lowerTitle.includes('vice')) return 2;
  if (lowerTitle.includes('cfo') || lowerTitle.includes('coo') || lowerTitle.includes('cto') || 
      lowerTitle.includes('chief financial') || lowerTitle.includes('chief operating') || 
      lowerTitle.includes('chief technology')) return 3;
  if (lowerTitle.includes('chief')) return 4;
  if (lowerTitle.includes('vice president') || lowerTitle.includes('vp')) return 5;
  if (lowerTitle.includes('director')) return 6;
  return 7;
};

const LeadershipPublicPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeOfficers, setActiveOfficers] = useState<CorporateOfficer[]>([]);
  const [formerOfficers, setFormerOfficers] = useState<CorporateOfficer[]>([]);

  useEffect(() => {
    fetchOfficers();
  }, []);

  const fetchOfficers = async () => {
    setLoading(true);
    try {
      // Fetch all officers (active and former)
      const { data, error } = await supabase
        .from('corporate_officers')
        .select('id, full_name, title, effective_date, status, metadata')
        .in('status', ['ACTIVE', 'REMOVED', 'RESIGNED', 'TERMINATED']);

      if (error) {
        if (error.code !== '42P01') {
          console.error('Error fetching officers:', error);
        }
        setActiveOfficers([]);
        setFormerOfficers([]);
        return;
      }

      const processedOfficers = (data || []).map((officer: any) => ({
        ...officer,
        metadata: typeof officer.metadata === 'string' ? {} : (officer.metadata || {})
      }));

      // Separate active and former officers
      const active = processedOfficers.filter((o: any) => o.status === 'ACTIVE');
      const former = processedOfficers.filter((o: any) => 
        ['REMOVED', 'RESIGNED', 'TERMINATED'].includes(o.status)
      );

      // Sort by hierarchy level, then by title
      const sortOfficers = (officers: any[]) => {
        return officers.sort((a, b) => {
          const levelDiff = getHierarchyLevel(a.title) - getHierarchyLevel(b.title);
          if (levelDiff !== 0) return levelDiff;
          return a.title.localeCompare(b.title);
        });
      };

      setActiveOfficers(sortOfficers(active) as any);
      setFormerOfficers(sortOfficers(former) as any);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderOfficerCard = (officer: CorporateOfficer, isFormer: boolean = false) => {
    const level = getHierarchyLevel(officer.title);
    const isTopLevel = level === 1;
    const isSecondLevel = level === 2 || level === 3;

    return (
      <Card
        key={officer.id}
        padding="lg"
        radius="md"
        style={{
          backgroundColor: isFormer ? '#f9fafb' : 'hsl(var(--card))',
          border: `2px solid ${isFormer ? '#e5e7eb' : isTopLevel ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
          height: '100%',
          opacity: isFormer ? 0.8 : 1,
        }}
      >
        <Stack gap="md">
          <div>
            <Group justify="space-between" mb="xs">
              <Text fw={600} size={isTopLevel ? "xl" : "lg"} c="foreground">
                {officer.full_name}
              </Text>
              {isFormer && (
                <Badge color="gray" variant="light" size="sm" leftSection={<IconUserX size={12} />}>
                  Former
                </Badge>
              )}
            </Group>
            <Badge 
              color={isFormer ? "gray" : "orange"} 
              variant={isTopLevel ? "filled" : "light"}
              size={isTopLevel ? "lg" : "md"}
            >
              {officer.title}
            </Badge>
          </div>
          {officer.metadata?.bio && (
            <Text size="sm" c="dimmed" lineClamp={isTopLevel ? 4 : 3}>
              {officer.metadata.bio}
            </Text>
          )}
          <Text size="xs" c="dimmed">
            {isFormer ? 'Former' : 'Since'} {dayjs(officer.effective_date).format('MMMM YYYY')}
          </Text>
        </Stack>
      </Card>
    );
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Center h={400}>
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1} c="dark" mb="xs">
            Leadership Team
          </Title>
          <Text c="dimmed" size="lg">
            Meet the executive leadership team driving Crave'n forward.
          </Text>
        </div>

        {/* Active Officers Section */}
        {activeOfficers.length === 0 ? (
          <Card
            padding="xl"
            radius="md"
            style={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
            }}
          >
            <Center>
              <Text c="dimmed">No active officers to display</Text>
            </Center>
          </Card>
        ) : (
          <div>
            <Group gap="xs" mb="lg">
              <IconUserCheck size={20} color="green" />
              <Title order={2} size="h3">Current Leadership</Title>
            </Group>
            <div className="space-y-8">
              {/* Group officers by hierarchy level */}
              {Array.from(new Set(activeOfficers.map(o => getHierarchyLevel(o.title)))).map(level => {
                const levelOfficers = activeOfficers.filter(o => getHierarchyLevel(o.title) === level);
                const isTopLevel = level === 1;
                const isSecondLevel = level === 2 || level === 3;
                
                return (
                  <div key={level} className="space-y-4">
                    <Grid gutter="lg">
                      {levelOfficers.map((officer) => (
                        <Grid.Col 
                          key={officer.id}
                          span={
                            isTopLevel ? 12 : 
                            isSecondLevel ? { base: 12, md: 6, lg: 4 } :
                            { base: 12, md: 6, lg: 3 }
                          }
                        >
                          {renderOfficerCard(officer, false)}
                        </Grid.Col>
                      ))}
                    </Grid>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Former Officers Section */}
        {formerOfficers.length > 0 && (
          <>
            <Divider my="xl" />
            <div>
              <Group gap="xs" mb="lg">
                <IconUserX size={20} color="gray" />
                <Title order={2} size="h3">Former Leadership</Title>
              </Group>
              <Grid gutter="lg">
                {formerOfficers.map((officer) => (
                  <Grid.Col 
                    key={officer.id}
                    span={{ base: 12, md: 6, lg: 4 }}
                  >
                    {renderOfficerCard(officer, true)}
                  </Grid.Col>
                ))}
              </Grid>
            </div>
          </>
        )}
      </Stack>
    </Container>
  );
};

export default LeadershipPublicPage;

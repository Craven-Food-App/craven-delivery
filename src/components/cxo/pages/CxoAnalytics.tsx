import React, { useEffect, useState } from 'react';
import { Stack, Card, Group, Text, Title, Loader, Center, Select, Grid, Button } from '@mantine/core';
import { MetricCard } from '@/components/cxo/shared/MetricCard';
import { analyticsRepository } from '@/lib/cxo/repositories/analyticsRepository';
import { ExperienceAnalytics } from '@/types/cxo';
import { IconStar, IconTrendingUp, IconClock, IconAlertCircle } from '@tabler/icons-react';

const CxoAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<ExperienceAnalytics[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<'global' | 'driver' | 'customer' | 'merchant'>('global');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [selectedSegment]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await analyticsRepository.getBySegment(selectedSegment);
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const latestAnalytics = analytics.length > 0 ? analytics[analytics.length - 1] : null;

  if (loading) {
    return (
      <Center style={{ minHeight: '50vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Experience Analytics</Title>
        <Group>
          <Select
            label="Segment"
            value={selectedSegment}
            onChange={(value) => setSelectedSegment((value as any) || 'global')}
            data={[
              { value: 'global', label: 'Global' },
              { value: 'driver', label: 'Driver' },
              { value: 'customer', label: 'Customer' },
              { value: 'merchant', label: 'Merchant' },
            ]}
          />
          <Button variant="subtle" onClick={() => {
            const csvData = analytics.map(a => ({
              Date: a.date,
              Segment: a.segment,
              CSAT: a.csatScore || '',
              NPS: a.npsScore || '',
              'Late Delivery Rate': a.lateDeliveryRate ? (a.lateDeliveryRate * 100).toFixed(2) + '%' : '',
              'Repeat Complaint Rate': a.repeatComplaintRate ? (a.repeatComplaintRate * 100).toFixed(2) + '%' : '',
              'Avg Delivery Minutes': a.avgDeliveryMinutes || '',
              'Total Surveys': a.totalSurveys || '',
            }));
            
            const headers = Object.keys(csvData[0] || {});
            const csv = [
              headers.join(','),
              ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row] || ''}"`).join(','))
            ].join('\n');
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cxo-analytics-${selectedSegment}-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          }}>
            Export CSV
          </Button>
        </Group>
      </Group>

      {/* Key Metric Overview */}
      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="CSAT Score"
            value={latestAnalytics?.csatScore ? `${latestAnalytics.csatScore.toFixed(1)}%` : 'N/A'}
            icon={<IconStar size={20} />}
            color="green"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="NPS Score"
            value={latestAnalytics?.npsScore ? latestAnalytics.npsScore.toFixed(1) : 'N/A'}
            icon={<IconTrendingUp size={20} />}
            color="blue"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Late Delivery Rate"
            value={latestAnalytics?.lateDeliveryRate ? `${(latestAnalytics.lateDeliveryRate * 100).toFixed(1)}%` : 'N/A'}
            icon={<IconClock size={20} />}
            color="orange"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Repeat Complaint Rate"
            value={latestAnalytics?.repeatComplaintRate ? `${(latestAnalytics.repeatComplaintRate * 100).toFixed(1)}%` : 'N/A'}
            icon={<IconAlertCircle size={20} />}
            color="red"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Avg Delivery Minutes"
            value={latestAnalytics?.avgDeliveryMinutes ? `${Math.round(latestAnalytics.avgDeliveryMinutes)} min` : 'N/A'}
            icon={<IconClock size={20} />}
            color="blue"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Total Surveys"
            value={latestAnalytics?.totalSurveys || 0}
            icon={<IconStar size={20} />}
            color="yellow"
          />
        </Grid.Col>
      </Grid>

      {/* Time-Series Charts Placeholder */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={4} mb="md">
          Time-Series Charts
        </Title>
        <Text c="dimmed" ta="center" py="xl">
          Chart visualization would be implemented here using a charting library (e.g., Recharts, Chart.js)
          <br />
          Showing CSAT, NPS, and Delivery Time trends over time for {selectedSegment} segment
        </Text>
      </Card>
    </Stack>
  );
};

export default CxoAnalytics;


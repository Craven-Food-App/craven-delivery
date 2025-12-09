import React, { useState } from 'react';
import {
  Card,
  Stack,
  Text,
  Title,
  Grid,
  Switch,
  Badge,
  Group,
  Button,
  Loader,
  Center,
  NumberFormatter,
} from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';

interface HotspotZone {
  id: string;
  zone_name: string;
  zone_type: string;
  latitude: number;
  longitude: number;
  radius_miles: number;
  bonus_per_delivery_cents: number;
  is_active: boolean;
  pickup_count: number;
  earnings_contribution_cents: number;
}

export default function HotspotZoneManager() {
  const queryClient = useQueryClient();

  const { data: hotspots, isLoading } = useQuery({
    queryKey: ['hotspot-zones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotspot_zones')
        .select('*')
        .order('zone_name');

      if (error && error.code !== 'PGRST205') {
        console.error('Error fetching hotspots:', error);
      }

      // Calculate pickup count and earnings contribution
      const hotspotsWithStats = await Promise.all(
        (data || []).map(async (hotspot) => {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);

          const [pickupsRes, earningsRes] = await Promise.all([
            supabase
              .from('driver_trips')
              .select('id', { count: 'exact', head: true })
              .eq('pickup_zone', hotspot.zone_name)
              .gte('trip_start_time', weekAgo.toISOString()),
            supabase
              .from('driver_earnings')
              .select('total_cents')
              .gte('earned_at', weekAgo.toISOString()),
          ]);

          // Simplified - in production, join with trips to get accurate earnings
          const earnings = earningsRes.data?.reduce((sum, e) => sum + (e.total_cents || 0), 0) || 0;

          return {
            ...hotspot,
            pickup_count: pickupsRes.count || 0,
            earnings_contribution_cents: earnings,
          };
        })
      );

      return hotspotsWithStats as HotspotZone[];
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('hotspot_zones')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotspot-zones'] });
      notifications.show({
        title: 'Hotspot Updated',
        message: 'Hotspot zone status has been updated.',
        color: 'green',
      });
    },
  });

  if (isLoading) {
    return (
      <Center style={{ minHeight: '50vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Stack gap="lg" p="lg">
      <Group justify="space-between">
        <div>
          <Title order={2}>Hotspot Zone Manager</Title>
          <Text c="dimmed" size="sm">
            Manage hotspot zones and bonus configurations
          </Text>
        </div>
        <Button>Add Hotspot Zone</Button>
      </Group>

      <Card withBorder padding="lg">
        <Text c="dimmed" size="sm" mb="md">
          Interactive map would be integrated here (Mapbox/Google Maps)
        </Text>
      </Card>

      <Grid>
        {hotspots && hotspots.length > 0 ? (
          hotspots.map((hotspot) => (
            <Grid.Col key={hotspot.id} span={{ base: 12, md: 6, lg: 4 }}>
              <Card withBorder padding="lg">
                <Stack gap="md">
                  <Group justify="space-between">
                    <Title order={4}>{hotspot.zone_name}</Title>
                    <Switch
                      checked={hotspot.is_active}
                      onChange={(e) =>
                        toggleActiveMutation.mutate({
                          id: hotspot.id,
                          isActive: e.currentTarget.checked,
                        })
                      }
                    />
                  </Group>

                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Pickup Count (7d):
                    </Text>
                    <Text fw={600}>{hotspot.pickup_count}</Text>
                  </Group>

                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Bonus per Delivery:
                    </Text>
                    <Badge color="blue">
                      <NumberFormatter
                        value={(hotspot.bonus_per_delivery_cents || 0) / 100}
                        prefix="$"
                        decimalScale={2}
                      />
                    </Badge>
                  </Group>

                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Earnings Contribution (7d):
                    </Text>
                    <Text fw={600}>
                      <NumberFormatter
                        value={(hotspot.earnings_contribution_cents || 0) / 100}
                        prefix="$"
                        decimalScale={2}
                      />
                    </Text>
                  </Group>

                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">
                      {hotspot.latitude}, {hotspot.longitude}
                    </Text>
                    <Badge variant="light" size="sm">
                      {hotspot.radius_miles} mi radius
                    </Badge>
                  </Group>
                </Stack>
              </Card>
            </Grid.Col>
          ))
        ) : (
          <Grid.Col span={12}>
            <Card withBorder padding="lg">
              <Text c="dimmed" ta="center" py="xl">
                No hotspot zones configured
              </Text>
            </Card>
          </Grid.Col>
        )}
      </Grid>
    </Stack>
  );
}



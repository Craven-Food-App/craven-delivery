/**
 * Admin: Market Demand
 * View restaurants_master (REQUESTABLE, COMING_SOON, LEAD_READY), request counts, partnership requests, and report metrics.
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Box,
  Stack,
  Text,
  Title,
  Button,
  Table,
  Badge,
  Loader,
  Paper,
  ActionIcon,
  Group,
  Drawer,
  Divider,
  SimpleGrid,
} from '@mantine/core';
import { IconMail, IconUserPlus, IconRefresh, IconChartBar, IconPhoto } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

const MERCHANT_SIGNUP_URL = 'https://cravenusa.com/merchant';

const ORDER_FREQ_LABELS: Record<string, string> = {
  frequently: 'Frequently',
  weekly: 'Weekly',
  '2_3_per_month': '2–3×/month',
  monthly: 'Monthly',
  rarely: 'Rarely',
};

const WOULD_REFER_LABELS: Record<string, string> = {
  yes: 'Yes',
  probably: 'Probably',
  maybe: 'Maybe',
  no: 'No',
};

const WHAT_MATTERS_LABELS: Record<string, string> = {
  delivery_speed: 'Delivery speed',
  support_local: 'Supporting local',
  variety: 'Variety',
  price: 'Price',
  quality: 'Quality',
};

export default function MarketDemand() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [backfillingLogos, setBackfillingLogos] = useState(false);
  const [reportDrawerOpen, setReportDrawerOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<{ id: string; name: string } | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  const fetchDemand = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurants_master')
        .select('id, name, city, state, address, category, status, request_count, last_requested_at, created_at, logo_url, image_url')
        .in('status', ['REQUESTABLE', 'COMING_SOON', 'LEAD_READY'])
        .order('request_count', { ascending: false })
        .order('last_requested_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      setRows(data || []);
    } catch (err) {
      console.error('Error fetching market demand:', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const backfillLogos = async () => {
    setBackfillingLogos(true);
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('backfill_seeded_merchant_logos', {
        p_overwrite_brandfetch: true,
      });

      if (!rpcError && rpcData) {
        notifications.show({
          title: 'Merchant logos updated',
          message: `Master: ${rpcData.restaurants_master_updated ?? 0} · Restaurants: ${rpcData.restaurants_updated ?? 0}`,
          color: 'green',
        });
        await fetchDemand();
        return;
      }

      const { data: fnData, error: fnError } = await supabase.functions.invoke('backfill-merchant-logos', {
        body: { overwrite_brandfetch: true },
      });

      if (fnError) throw fnError;
      if (fnData?.error) throw new Error(fnData.error);

      notifications.show({
        title: 'Merchant logos updated',
        message: `Master: ${fnData?.restaurants_master_updated ?? 0}${fnData?.fallback ? ' (fallback)' : ''}`,
        color: 'green',
      });
      await fetchDemand();
    } catch (err: any) {
      console.error('Logo backfill failed:', err);
      notifications.show({
        title: 'Logo backfill failed',
        message: err?.message || 'Could not update merchant logos',
        color: 'red',
      });
    } finally {
      setBackfillingLogos(false);
    }
  };

  useEffect(() => {
    fetchDemand();
  }, []);

  const copyInviteLink = () => {
    navigator.clipboard.writeText(MERCHANT_SIGNUP_URL);
  };

  const openReport = async (r: { id: string; name: string }) => {
    setSelectedRestaurant(r);
    setReportDrawerOpen(true);
    setRequestsLoading(true);
    try {
      const { data, error } = await supabase
        .from('merchant_partnership_requests')
        .select('id, requester_email, requester_name, order_frequency, would_refer, what_matters_most, message_to_business, created_at')
        .eq('restaurant_master_id', r.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching partnership requests:', err);
      setRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  };

  const reportMetrics = (() => {
    const total = requests.length;
    if (total === 0) return null;
    const byFreq: Record<string, number> = {};
    const byRefer: Record<string, number> = {};
    const byMatters: Record<string, number> = {};
    requests.forEach((req) => {
      if (req.order_frequency) byFreq[req.order_frequency] = (byFreq[req.order_frequency] || 0) + 1;
      if (req.would_refer) byRefer[req.would_refer] = (byRefer[req.would_refer] || 0) + 1;
      (req.what_matters_most || []).forEach((v: string) => { byMatters[v] = (byMatters[v] || 0) + 1; });
    });
    return { total, byFreq, byRefer, byMatters };
  })();

  return (
    <Box p="md">
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={2}>Market Demand</Title>
          <Group gap="sm">
            <Button
              leftSection={<IconPhoto size={16} />}
              variant="light"
              color="orange"
              onClick={backfillLogos}
              loading={backfillingLogos}
            >
              Pull brand logos
            </Button>
            <Button leftSection={<IconRefresh size={16} />} variant="light" onClick={fetchDemand} loading={loading}>
              Refresh
            </Button>
          </Group>
        </Group>
        <Text size="sm" c="dimmed">
          Restaurants requested by customers. Use &quot;Partnership report&quot; to view structured demand data for merchant outreach. When request count reaches 15, status becomes LEAD_READY.
          &quot;Pull brand logos&quot; writes curated Brandfetch logos onto seeded merchants (keeps hand-uploaded seed storage logos).
        </Text>

        {loading ? (
          <Loader />
        ) : (
          <Paper withBorder>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Restaurant</Table.Th>
                  <Table.Th>City</Table.Th>
                  <Table.Th>Requests</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Last Requested</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Text size="sm" c="dimmed" ta="center" py="xl">
                        No requestable or lead-ready restaurants yet.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  rows.map((r) => (
                    <Table.Tr key={r.id}>
                      <Table.Td>
                        <Text fw={600}>{r.name}</Text>
                        {r.category && (
                          <Text size="xs" c="dimmed">{r.category}</Text>
                        )}
                      </Table.Td>
                      <Table.Td>{r.city || '—'}</Table.Td>
                      <Table.Td>{r.request_count ?? 0}</Table.Td>
                      <Table.Td>
                        <Badge
                          color={
                            r.status === 'LEAD_READY'
                              ? 'green'
                              : r.status === 'COMING_SOON'
                                ? 'orange'
                                : 'gray'
                          }
                          variant="light"
                        >
                          {r.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {r.last_requested_at
                          ? new Date(r.last_requested_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Button
                            size="xs"
                            variant="light"
                            leftSection={<IconChartBar size={14} />}
                            onClick={() => openReport(r)}
                            title="View partnership requests and report metrics"
                          >
                            Report
                          </Button>
                          <ActionIcon
                            variant="light"
                            title="Copy invite link"
                            onClick={copyInviteLink}
                          >
                            <IconMail size={16} />
                          </ActionIcon>
                          <Button
                            component="a"
                            href={`mailto:?subject=Customers want your restaurant on Crave'n&body=Join Crave'n to receive delivery orders: ${MERCHANT_SIGNUP_URL}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="xs"
                            variant="light"
                            leftSection={<IconMail size={14} />}
                          >
                            Email
                          </Button>
                          <Button
                            size="xs"
                            variant="light"
                            leftSection={<IconUserPlus size={14} />}
                            title="Convert to Merchant (coming soon)"
                            disabled
                          >
                            Convert
                          </Button>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        )}

        <Drawer
          opened={reportDrawerOpen}
          onClose={() => { setReportDrawerOpen(false); setSelectedRestaurant(null); setRequests([]); }}
          title={selectedRestaurant ? `Partnership report: ${selectedRestaurant.name}` : 'Partnership report'}
          position="right"
          size="lg"
        >
          {selectedRestaurant && (
            <Stack gap="md">
              {requestsLoading ? (
                <Loader />
              ) : (
                <>
                  {reportMetrics && (
                    <>
                      <Text size="sm" fw={600}>Summary metrics</Text>
                      <SimpleGrid cols={2} spacing="sm">
                        <Paper p="sm" withBorder>
                          <Text size="xs" c="dimmed">Total requests</Text>
                          <Text fw={700}>{reportMetrics.total}</Text>
                        </Paper>
                        {Object.keys(reportMetrics.byFreq).length > 0 && (
                          <Paper p="sm" withBorder>
                            <Text size="xs" c="dimmed">Order intent</Text>
                            {Object.entries(reportMetrics.byFreq).map(([k, v]) => (
                              <Text key={k} size="sm">{ORDER_FREQ_LABELS[k] || k}: {v}</Text>
                            ))}
                          </Paper>
                        )}
                        {Object.keys(reportMetrics.byRefer).length > 0 && (
                          <Paper p="sm" withBorder>
                            <Text size="xs" c="dimmed">Would refer</Text>
                            {Object.entries(reportMetrics.byRefer).map(([k, v]) => (
                              <Text key={k} size="sm">{WOULD_REFER_LABELS[k] || k}: {v}</Text>
                            ))}
                          </Paper>
                        )}
                      </SimpleGrid>
                      <Divider />
                    </>
                  )}
                  <Text size="sm" fw={600}>Individual requests</Text>
                  {requests.length === 0 ? (
                    <Text size="sm" c="dimmed">No structured requests yet. Consumers can submit via &quot;Share with business&quot; on the app.</Text>
                  ) : (
                    <Table striped>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Date</Table.Th>
                          <Table.Th>Order frequency</Table.Th>
                          <Table.Th>Would refer</Table.Th>
                          <Table.Th>What matters</Table.Th>
                          <Table.Th>Message</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {requests.map((req) => (
                          <Table.Tr key={req.id}>
                            <Table.Td>{req.created_at ? new Date(req.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</Table.Td>
                            <Table.Td>{ORDER_FREQ_LABELS[req.order_frequency] || req.order_frequency || '—'}</Table.Td>
                            <Table.Td>{WOULD_REFER_LABELS[req.would_refer] || req.would_refer || '—'}</Table.Td>
                            <Table.Td>{((req.what_matters_most || []).map((v: string) => WHAT_MATTERS_LABELS[v] || v).join(', ')) || '—'}</Table.Td>
                            <Table.Td>{req.message_to_business ? (req.message_to_business.length > 60 ? req.message_to_business.slice(0, 60) + '…' : req.message_to_business) : '—'}</Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  )}
                </>
              )}
            </Stack>
          )}
        </Drawer>
      </Stack>
    </Box>
  );
}

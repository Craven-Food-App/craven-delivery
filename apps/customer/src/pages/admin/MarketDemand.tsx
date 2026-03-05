/**
 * Admin: Market Demand
 * View restaurants_master (REQUESTABLE, COMING_SOON, LEAD_READY), request counts, and actions.
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
} from '@mantine/core';
import { IconMail, IconUserPlus, IconRefresh } from '@tabler/icons-react';

const MERCHANT_SIGNUP_URL = 'https://cravenusa.com/merchant';

export default function MarketDemand() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDemand = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurants_master')
        .select('id, name, city, state, address, category, status, request_count, last_requested_at, created_at')
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

  useEffect(() => {
    fetchDemand();
  }, []);

  const copyInviteLink = () => {
    navigator.clipboard.writeText(MERCHANT_SIGNUP_URL);
  };

  return (
    <Box p="md">
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={2}>Market Demand</Title>
          <Button leftSection={<IconRefresh size={16} />} variant="light" onClick={fetchDemand} loading={loading}>
            Refresh
          </Button>
        </Group>
        <Text size="sm" c="dimmed">
          Restaurants requested by customers. When request count reaches 15, status becomes LEAD_READY for outreach.
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
                          <ActionIcon
                            variant="light"
                            title="Invite Restaurant"
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
      </Stack>
    </Box>
  );
}

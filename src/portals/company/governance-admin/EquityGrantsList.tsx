import React, { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Stack,
  Card,
  Table,
  Badge,
  Loader,
  Alert,
  Group,
  NumberFormatter,
  Button,
} from '@mantine/core';
import { IconCoins, IconRefresh, IconAlertCircle } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';

interface EquityGrant {
  id: string;
  recipient_user_id: string;
  recipient_email?: string;
  recipient_name?: string;
  shares_amount: number;
  share_class: string;
  transaction_date: string;
  vesting_type?: string;
  vested_shares?: number;
  unvested_shares?: number;
}

const EquityGrantsList: React.FC = () => {
  const [grants, setGrants] = useState<EquityGrant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGrants();
  }, []);

  const loadGrants = async () => {
    setLoading(true);
    try {
      // Load equity ledger entries (grants)
      const { data: ledgerEntries, error: ledgerError } = await supabase
        .from('equity_ledger')
        .select('id, recipient_user_id, shares_amount, share_class, transaction_date, transaction_type, created_at')
        .eq('transaction_type', 'grant')
        .order('created_at', { ascending: false });

      if (ledgerError) {
        console.error('Error loading equity ledger:', ledgerError);
        throw ledgerError;
      }

      // Load vesting schedules to get vesting info
      const { data: vestingSchedules, error: vestingError } = await supabase
        .from('vesting_schedules')
        .select('id, recipient_user_id, vesting_type, vested_shares, unvested_shares')
        .order('created_at', { ascending: false });

      if (vestingError) {
        console.warn('Error loading vesting schedules:', vestingError);
      }

      // Get user info for each grant
      const grantsWithUsers: EquityGrant[] = [];
      if (ledgerEntries) {
        for (const entry of ledgerEntries) {
          // Get user email/name
          let recipientEmail = '';
          let recipientName = '';
          
          try {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('email, full_name')
              .eq('user_id', entry.recipient_user_id)
              .maybeSingle();
            
            if (profile) {
              recipientEmail = profile.email || '';
              recipientName = profile.full_name || '';
            }
          } catch (err) {
            console.warn('Error fetching user profile:', err);
          }

          // Find matching vesting schedule
          const vesting = vestingSchedules?.find(v => v.recipient_user_id === entry.recipient_user_id);

          grantsWithUsers.push({
            id: entry.id,
            recipient_user_id: entry.recipient_user_id,
            recipient_email: recipientEmail,
            recipient_name: recipientName,
            shares_amount: Number(entry.shares_amount || 0),
            share_class: entry.share_class || 'common',
            transaction_date: entry.transaction_date || entry.created_at,
            vesting_type: vesting?.vesting_type,
            vested_shares: vesting ? Number(vesting.vested_shares || 0) : undefined,
            unvested_shares: vesting ? Number(vesting.unvested_shares || 0) : undefined,
          });
        }
      }

      setGrants(grantsWithUsers);
    } catch (error: any) {
      console.error('Error loading equity grants:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Loader size="lg" />
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <div>
            <Title order={2} c="dark" mb="xs">
              <IconCoins size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 12 }} />
              Equity Grants
            </Title>
            <Text c="dimmed">
              View all equity grants issued to executives and key personnel.
            </Text>
          </div>
          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={loadGrants}
            variant="light"
          >
            Refresh
          </Button>
        </Group>

        {grants.length === 0 ? (
          <Alert icon={<IconAlertCircle size={16} />} title="No Equity Grants" color="blue">
            No equity grants have been issued yet.
          </Alert>
        ) : (
          <Card padding="lg" radius="md" withBorder>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Recipient</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Shares</Table.Th>
                  <Table.Th>Share Class</Table.Th>
                  <Table.Th>Vesting Type</Table.Th>
                  <Table.Th>Vested/Unvested</Table.Th>
                  <Table.Th>Grant Date</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {grants.map((grant) => (
                  <Table.Tr key={grant.id}>
                    <Table.Td>
                      <Text fw={500}>
                        {grant.recipient_name || grant.recipient_email || 'Unknown'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {grant.recipient_email || 'N/A'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={600}>
                        <NumberFormatter value={grant.shares_amount} thousandSeparator />
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light">{grant.share_class}</Badge>
                    </Table.Td>
                    <Table.Td>
                      {grant.vesting_type ? (
                        <Badge color="blue" variant="light">
                          {grant.vesting_type}
                        </Badge>
                      ) : (
                        <Text size="sm" c="dimmed">N/A</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {grant.vested_shares !== undefined && grant.unvested_shares !== undefined ? (
                        <Text size="sm">
                          <NumberFormatter value={grant.vested_shares} thousandSeparator /> /{' '}
                          <NumberFormatter value={grant.unvested_shares} thousandSeparator />
                        </Text>
                      ) : (
                        <Text size="sm" c="dimmed">N/A</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {new Date(grant.transaction_date).toLocaleDateString()}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        )}
      </Stack>
    </Container>
  );
};

export default EquityGrantsList;


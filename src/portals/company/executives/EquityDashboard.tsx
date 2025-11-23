import React, { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Stack,
  Card,
  Group,
  Grid,
  Badge,
  Table,
  Progress,
  Loader,
  Alert,
  NumberFormatter,
  Button,
} from '@mantine/core';
import { IconCoins, IconChartPie, IconAlertCircle, IconCertificate } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';

interface EquitySummary {
  total_granted: number;
  total_vested: number;
  total_unvested: number;
  vested_percentage: number;
}

interface Certificate {
  id: string;
  certificate_number: string;
  shares_amount: number;
  share_class: string;
  issue_date: string;
  document_url: string;
}

interface VestingSchedule {
  id: string;
  total_shares: number;
  vested_shares: number;
  unvested_shares: number;
  vesting_type: string;
  start_date: string;
  end_date: string;
  vesting_schedule: any[];
}

const EquityDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<EquitySummary | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [vestingSchedules, setVestingSchedules] = useState<VestingSchedule[]>([]);

  useEffect(() => {
    loadEquityData();
  }, []);

  const loadEquityData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      console.log('Loading equity data for user:', user.id, user.email);

      // Load equity ledger entries
      const { data: ledgerEntries, error: ledgerError } = await supabase
        .from('equity_ledger')
        .select('id, shares_amount, transaction_type, transaction_date, created_at, recipient_user_id')
        .eq('recipient_user_id', user.id)
        .order('created_at', { ascending: false });

      if (ledgerError) {
        console.error('Error loading equity ledger:', ledgerError);
        console.error('Error details:', {
          message: ledgerError.message,
          details: ledgerError.details,
          hint: ledgerError.hint,
          code: ledgerError.code,
        });
        notifications.show({
          title: 'Error',
          message: `Failed to load equity ledger: ${ledgerError.message}`,
          color: 'red',
        });
      } else {
        console.log('Equity ledger entries:', ledgerEntries?.length || 0, ledgerEntries);
        if (ledgerEntries && ledgerEntries.length > 0) {
          console.log('Sample ledger entry:', ledgerEntries[0]);
        }
      }

      // Load certificates
      const { data: certs, error: certsError } = await supabase
        .from('share_certificates')
        .select('*')
        .eq('recipient_user_id', user.id)
        .eq('status', 'issued')
        .order('issue_date', { ascending: false });

      if (certsError) {
        console.error('Error loading certificates:', certsError);
      } else {
        console.log('Certificates:', certs?.length || 0);
      }

      // Load vesting schedules
      const { data: schedules, error: schedulesError } = await supabase
        .from('vesting_schedules')
        .select('id, recipient_user_id, total_shares, vested_shares, unvested_shares, vesting_type, start_date, end_date')
        .eq('recipient_user_id', user.id)
        .order('start_date', { ascending: false });

      if (schedulesError) {
        console.error('Error loading vesting schedules:', schedulesError);
        console.error('Error details:', {
          message: schedulesError.message,
          details: schedulesError.details,
          hint: schedulesError.hint,
          code: schedulesError.code,
        });
        notifications.show({
          title: 'Error',
          message: `Failed to load vesting schedules: ${schedulesError.message}`,
          color: 'red',
        });
      } else {
        console.log('Vesting schedules:', schedules?.length || 0, schedules);
        if (schedules && schedules.length > 0) {
          console.log('Sample vesting schedule:', schedules[0]);
        }
      }

      // Calculate summary
      const totalGranted = ledgerEntries?.filter(e => e.transaction_type === 'grant').reduce((sum, e) => sum + Number(e.shares_amount || 0), 0) || 0;
      const totalVested = schedules?.reduce((sum, s) => sum + Number(s.vested_shares || 0), 0) || 0;
      const totalUnvested = totalGranted - totalVested;
      const vestedPercentage = totalGranted > 0 ? (totalVested / totalGranted) * 100 : 0;

      console.log('Equity summary calculated:', {
        totalGranted,
        totalVested,
        totalUnvested,
        vestedPercentage,
        ledgerEntriesCount: ledgerEntries?.length || 0,
        schedulesCount: schedules?.length || 0,
        user_id: user.id,
        user_email: user.email,
      });

      // Diagnostic: Check if user has exec_users record
      const { data: execUser } = await supabase
        .from('exec_users')
        .select('id, user_id, role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      console.log('Exec user record:', execUser ? 'Found' : 'NOT FOUND', execUser);

      // If no data found, show helpful message
      if ((!ledgerEntries || ledgerEntries.length === 0) && (!schedules || schedules.length === 0)) {
        console.warn('⚠️ NO EQUITY DATA FOUND');
        console.warn('User ID:', user.id);
        console.warn('User Email:', user.email);
        console.warn('Exec User Record:', execUser ? 'EXISTS' : 'MISSING');
        console.warn('Possible issues:');
        console.warn('1. No equity grants issued to this user yet');
        console.warn('2. recipient_user_id in database does not match user.id');
        console.warn('3. RLS policies blocking access (check exec_users record exists)');
      }

      setSummary({
        total_granted: totalGranted,
        total_vested: totalVested,
        total_unvested: totalUnvested,
        vested_percentage: vestedPercentage,
      });

      setCertificates(certs || []);
      // @ts-ignore - Database query type compatibility
      setVestingSchedules(schedules || []);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load equity data',
        color: 'red',
      });
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

  if (!summary || summary.total_granted === 0) {
    return (
      <Container size="xl" py="xl">
        <Alert icon={<IconAlertCircle size={16} />} title="No Equity Grants" color="blue">
          You don't have any equity grants yet. Equity grants are typically issued as part of your executive appointment.
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={2} c="dark" mb="xs">
            <IconCoins size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 12 }} />
            Equity Dashboard
          </Title>
          <Text c="dimmed">
            View your equity grants, vesting progress, and share certificates.
          </Text>
        </div>

        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card padding="lg" radius="md" withBorder>
              <Stack gap="md">
                <Title order={4}>Total Granted</Title>
                <Text size="xl" fw={700}>
                  <NumberFormatter value={summary.total_granted} thousandSeparator /> shares
                </Text>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card padding="lg" radius="md" withBorder>
              <Stack gap="md">
                <Title order={4}>Vested Shares</Title>
                <Text size="xl" fw={700}>
                  <NumberFormatter value={summary.total_vested} thousandSeparator /> shares
                </Text>
                <Progress value={summary.vested_percentage} color="green" size="lg" />
                <Text size="sm" c="dimmed">
                  {summary.vested_percentage.toFixed(1)}% vested
                </Text>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card padding="lg" radius="md" withBorder>
              <Stack gap="md">
                <Title order={4}>Unvested Shares</Title>
                <Text size="xl" fw={700}>
                  <NumberFormatter value={summary.total_unvested} thousandSeparator /> shares
                </Text>
                <Badge color="yellow" size="lg">
                  Pending Vesting
                </Badge>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card padding="lg" radius="md" withBorder>
              <Stack gap="md">
                <Title order={4}>Share Certificates</Title>
                <Text size="xl" fw={700}>
                  {certificates.length} certificate{certificates.length !== 1 ? 's' : ''}
                </Text>
                <Badge color="blue" size="lg" leftSection={<IconCertificate size={14} />}>
                  Issued
                </Badge>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        {certificates.length > 0 && (
          <Card padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">Share Certificates</Title>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Certificate #</Table.Th>
                  <Table.Th>Shares</Table.Th>
                  <Table.Th>Share Class</Table.Th>
                  <Table.Th>Issue Date</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {certificates.map((cert) => (
                  <Table.Tr key={cert.id}>
                    <Table.Td>
                      <Text fw={500}>{cert.certificate_number}</Text>
                    </Table.Td>
                    <Table.Td>
                      <NumberFormatter value={cert.shares_amount} thousandSeparator />
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light">{cert.share_class}</Badge>
                    </Table.Td>
                    <Table.Td>
                      {new Date(cert.issue_date).toLocaleDateString()}
                    </Table.Td>
                    <Table.Td>
                      {cert.document_url && (
                        <Button
                          size="xs"
                          variant="light"
                          component="a"
                          href={cert.document_url}
                          target="_blank"
                        >
                          Download
                        </Button>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        )}

        {vestingSchedules.length > 0 && (
          <Card padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">Vesting Schedules</Title>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Grant</Table.Th>
                  <Table.Th>Total Shares</Table.Th>
                  <Table.Th>Vested</Table.Th>
                  <Table.Th>Vesting Type</Table.Th>
                  <Table.Th>Progress</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {vestingSchedules.map((schedule) => {
                  const vestingProgress = schedule.total_shares > 0
                    ? (Number(schedule.vested_shares || 0) / schedule.total_shares) * 100
                    : 0;

                  return (
                    <Table.Tr key={schedule.id}>
                      <Table.Td>
                        <Text fw={500}>
                          {schedule.vesting_type.charAt(0).toUpperCase() + schedule.vesting_type.slice(1)} Vesting
                        </Text>
                        <Text size="xs" c="dimmed">
                          Started {new Date(schedule.start_date).toLocaleDateString()}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <NumberFormatter value={schedule.total_shares} thousandSeparator />
                      </Table.Td>
                      <Table.Td>
                        <NumberFormatter value={schedule.vested_shares || 0} thousandSeparator />
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light">{schedule.vesting_type}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Progress value={vestingProgress} size="sm" color="green" />
                        <Text size="xs" c="dimmed" mt={4}>
                          {vestingProgress.toFixed(1)}%
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Card>
        )}
      </Stack>
    </Container>
  );
};

export default EquityDashboard;


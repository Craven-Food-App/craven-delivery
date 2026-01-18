// Admin Page: Promo Management
// Toggle promo active/inactive, view usage, lock wallets

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Box,
  Stack,
  Group,
  Text,
  Title,
  Button,
  Table,
  Badge,
  Switch,
  Loader,
  Paper,
  ActionIcon,
  Modal,
  TextInput,
} from '@mantine/core';
import { IconToggleLeft, IconToggleRight, IconLock, IconLockOpen } from '@tabler/icons-react';

const PromoManagement = () => {
  const [promo, setPromo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [usageStats, setUsageStats] = useState<any>(null);
  const [lockedWallets, setLockedWallets] = useState<any[]>([]);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [lockUserId, setLockUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchPromo();
    fetchUsageStats();
    fetchLockedWallets();
  }, []);

  const fetchPromo = async () => {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('code', 'CREDIT_20_FIRST3')
        .single();

      if (error) throw error;
      setPromo(data);
    } catch (error) {
      console.error('Error fetching promo:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageStats = async () => {
    try {
      // Get daily redemption counts and total credit applied
      const { data, error } = await supabase.rpc('get_promo_usage_stats');
      
      if (error) {
        // If function doesn't exist, calculate manually
        const { data: ledgerData } = await supabase
          .from('promo_ledger')
          .select('*')
          .eq('event_type', 'REDEEMED')
          .order('created_at', { ascending: false })
          .limit(1000);

        if (ledgerData) {
          const today = new Date().toISOString().split('T')[0];
          const todayRedemptions = ledgerData.filter(
            (r) => r.created_at?.split('T')[0] === today
          );
          const totalCredit = ledgerData.reduce((sum, r) => sum + (r.credit_cents || 0), 0);

          setUsageStats({
            today_count: todayRedemptions.length,
            today_credit_cents: todayRedemptions.reduce((sum, r) => sum + (r.credit_cents || 0), 0),
            total_count: ledgerData.length,
            total_credit_cents: totalCredit,
          });
        }
      } else {
        setUsageStats(data);
      }
    } catch (error) {
      console.error('Error fetching usage stats:', error);
    }
  };

  const fetchLockedWallets = async () => {
    try {
      const { data, error } = await supabase
        .from('promo_wallets')
        .select('*, user_id, user_profiles(full_name, email)')
        .eq('is_locked', true);

      if (error) throw error;
      setLockedWallets(data || []);
    } catch (error) {
      console.error('Error fetching locked wallets:', error);
    }
  };

  const togglePromoActive = async () => {
    if (!promo) return;

    try {
      const { error } = await supabase
        .from('promotions')
        .update({ is_active: !promo.is_active })
        .eq('id', promo.id);

      if (error) throw error;
      setPromo({ ...promo, is_active: !promo.is_active });
    } catch (error) {
      console.error('Error toggling promo:', error);
    }
  };

  const lockWallet = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('promo_wallets')
        .update({ is_locked: true })
        .eq('user_id', userId);

      if (error) throw error;
      await fetchLockedWallets();
      setLockModalOpen(false);
      setLockUserId(null);
    } catch (error) {
      console.error('Error locking wallet:', error);
    }
  };

  const unlockWallet = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('promo_wallets')
        .update({ is_locked: false })
        .eq('user_id', userId);

      if (error) throw error;
      await fetchLockedWallets();
    } catch (error) {
      console.error('Error unlocking wallet:', error);
    }
  };

  if (loading) {
    return (
      <Box style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Loader size="lg" />
      </Box>
    );
  }

  return (
    <Box style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <Title order={1} mb="xl">Promo Management</Title>

      {/* Promo Toggle */}
      <Paper p="md" mb="xl" withBorder>
        <Group justify="space-between">
          <Stack gap="xs">
            <Title order={3}>{promo?.name || 'First Order Promo'}</Title>
            <Text c="dimmed">Code: {promo?.code}</Text>
            <Badge color={promo?.is_active ? 'green' : 'gray'}>
              {promo?.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </Stack>
          <Switch
            checked={promo?.is_active || false}
            onChange={togglePromoActive}
            size="lg"
            onLabel="ON"
            offLabel="OFF"
          />
        </Group>
      </Paper>

      {/* Usage Statistics */}
      {usageStats && (
        <Paper p="md" mb="xl" withBorder>
          <Title order={3} mb="md">Usage Statistics</Title>
          <Group grow>
            <Box>
              <Text size="sm" c="dimmed">Today's Redemptions</Text>
              <Text size="xl" fw={700}>{usageStats.today_count || 0}</Text>
              <Text size="sm" c="dimmed">
                ${((usageStats.today_credit_cents || 0) / 100).toFixed(2)} credit applied
              </Text>
            </Box>
            <Box>
              <Text size="sm" c="dimmed">Total Redemptions</Text>
              <Text size="xl" fw={700}>{usageStats.total_count || 0}</Text>
              <Text size="sm" c="dimmed">
                ${((usageStats.total_credit_cents || 0) / 100).toFixed(2)} total credit
              </Text>
            </Box>
          </Group>
        </Paper>
      )}

      {/* Lock Wallet */}
      <Paper p="md" mb="xl" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={3}>Lock User Wallet</Title>
          <Button onClick={() => setLockModalOpen(true)}>Lock Wallet</Button>
        </Group>
        <Text size="sm" c="dimmed" mb="md">
          Lock a user's promo wallet to prevent them from using the first-order promotion (fraud prevention)
        </Text>
      </Paper>

      {/* Locked Wallets List */}
      {lockedWallets.length > 0 && (
        <Paper p="md" withBorder>
          <Title order={3} mb="md">Locked Wallets</Title>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>User</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Enrolled</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {lockedWallets.map((wallet) => (
                <Table.Tr key={wallet.id}>
                  <Table.Td>
                    {(wallet.user_profiles as any)?.full_name || 'Unknown'}
                  </Table.Td>
                  <Table.Td>
                    {(wallet.user_profiles as any)?.email || 'N/A'}
                  </Table.Td>
                  <Table.Td>
                    {new Date(wallet.enrolled_at).toLocaleDateString()}
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      onClick={() => unlockWallet(wallet.user_id)}
                      variant="subtle"
                      color="green"
                    >
                      <IconLockOpen size={18} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}

      {/* Lock Modal */}
      <Modal
        opened={lockModalOpen}
        onClose={() => {
          setLockModalOpen(false);
          setLockUserId(null);
        }}
        title="Lock User Wallet"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Enter the user ID or email to lock their promo wallet
          </Text>
          <TextInput
            label="User ID or Email"
            placeholder="user@example.com or uuid"
            value={lockUserId || ''}
            onChange={(e) => setLockUserId(e.currentTarget.value)}
          />
          <Button
            onClick={() => {
              if (lockUserId) {
                // If it's an email, look up user_id first
                // For now, assume it's a user_id
                lockWallet(lockUserId);
              }
            }}
            disabled={!lockUserId}
          >
            Lock Wallet
          </Button>
        </Stack>
      </Modal>
    </Box>
  );
};

export default PromoManagement;


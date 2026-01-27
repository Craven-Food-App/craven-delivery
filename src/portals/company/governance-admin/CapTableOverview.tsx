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
  Paper,
  Box,
} from '@mantine/core';
import { IconChartPie, IconAlertCircle, IconRefresh, IconTool } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { supabase } from '@/integrations/supabase/client';

interface CapTable {
  id: string;
  total_authorized: number;
  total_issued: number;
  total_unissued: number;
  equity_pool: number;
  holding_company_shares: number;
  founder_shares: number;
  holding_company_percentage: number;
  founder_percentage: number;
  pool_percentage: number;
  as_of_date: string;
  company_id?: string | null;
}

interface EquityGrant {
  recipient_name: string;
  shares_amount: number;
  percentage: number;
}

const CapTableOverview: React.FC = () => {
  const [capTable, setCapTable] = useState<CapTable | null>(null);
  const [equityGrants, setEquityGrants] = useState<EquityGrant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCapTable();
    loadEquityGrants();

    // Listen for equity grant creation events
    const handleGrantCreated = () => {
      console.log('🔄 [CAP TABLE] Equity grant created, refreshing...');
      loadCapTable();
      loadEquityGrants();
    };

    window.addEventListener('equityGrantCreated', handleGrantCreated);
    
    return () => {
      window.removeEventListener('equityGrantCreated', handleGrantCreated);
    };
  }, []);

  const loadCapTable = async () => {
    try {
      const { data, error } = await supabase
        .from('cap_tables')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      console.log('📊 [CAP TABLE] Loaded from database:', {
        total_authorized: data?.total_authorized,
        total_issued: data?.total_issued,
        total_unissued: data?.total_unissued,
        holding_company_shares: data?.holding_company_shares,
        founder_shares: data?.founder_shares,
        equity_pool: data?.equity_pool,
      });
      
      setCapTable(data);
    } catch (error: any) {
      console.error('Error loading cap table:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEquityGrants = async () => {
    try {
      // Get all active grants from equity_ledger
      const { data: grants, error: grantsError } = await supabase
        .from('equity_ledger')
        .select('id, recipient_user_id, shares_amount, transaction_type, notes')
        .eq('transaction_type', 'grant')
        .order('shares_amount', { ascending: false });
      
      // Also check for Justin's grant by finding his user_id from exec_users
      const { data: justinExec } = await supabase
        .from('exec_users')
        .select('user_id, title, first_name, last_name')
        .ilike('title', '%cfo%')
        .maybeSingle();
      
      console.log('👤 [EQUITY GRANTS] Justin exec_user lookup:', justinExec);
      
      if (justinExec?.user_id) {
        const { data: justinGrants } = await supabase
          .from('equity_ledger')
          .select('id, recipient_user_id, shares_amount, transaction_type, notes')
          .eq('transaction_type', 'grant')
          .eq('recipient_user_id', justinExec.user_id);
        
        console.log('💰 [EQUITY GRANTS] Justin-specific grants by user_id:', justinGrants);
        
        // If Justin's grant exists but wasn't in the main query, add it
        if (justinGrants && justinGrants.length > 0) {
          // Look for Justin's grant (4.2M shares, updated from 5M)
          const justinGrant = justinGrants.find(g => g.shares_amount >= 4000000 && g.shares_amount <= 5000000);
          if (justinGrant && !grants?.some(g => g.id === justinGrant.id)) {
            console.log('➕ [EQUITY GRANTS] Adding Justin grant that was missing from main query');
            grants?.push(justinGrant);
          }
        }
      }

      if (grantsError) throw grantsError;

      console.log('📊 [EQUITY GRANTS] Raw grants from ledger:', grants);
      console.log('📊 [EQUITY GRANTS] Total grants found:', grants?.length || 0);
      
      // Log all grant amounts to debug
      if (grants) {
        grants.forEach((g: any) => {
          console.log(`  - Grant: ${g.shares_amount} shares, user_id: ${g.recipient_user_id}`);
        });
      }

      // Get total authorized for percentage calculation
      const { data: capData } = await supabase
        .from('cap_tables')
        .select('total_authorized')
        .limit(1)
        .single();

      const totalAuthorized = capData?.total_authorized || 100000000;

      // For each grant, get the recipient name
      const formattedGrants: EquityGrant[] = [];
      
      for (const grant of grants || []) {
        if (!grant.recipient_user_id || !grant.shares_amount) {
          console.log('⏭️ Skipping grant (missing data):', grant);
          continue;
        }
        
        console.log(`🔍 Processing grant: ${grant.shares_amount} shares, user_id: ${grant.recipient_user_id}`);

        // Get user info once for both exclusion and naming
        let execUser: any = null;
        try {
          const { data, error } = await supabase
            .from('exec_users')
            .select('user_id, title, first_name, last_name')
            .eq('user_id', grant.recipient_user_id)
            .maybeSingle();
          
          if (!error && data) {
            execUser = data;
          }
        } catch (err) {
          console.warn('⚠️ Error querying exec_users for grant:', err);
        }

        // EXCLUDE Torrance's 18M grant (already counted in founder_shares)
        if (grant.shares_amount >= 17500000 && grant.shares_amount <= 18500000) {
          // Check if it's Torrance by title or name
          const isTorrance = execUser && (
            execUser.title?.toLowerCase().includes('founder') || 
            execUser.title?.toLowerCase().includes('ceo') ||
            execUser.first_name?.toLowerCase().includes('torrance') ||
            execUser.last_name?.toLowerCase().includes('stroman')
          );
          
          // If it's Torrance OR it's exactly 18M (Torrance's founder shares), exclude it
          if (isTorrance || grant.shares_amount === 18000000) {
            console.log('⏭️ Skipping Torrance\'s 18M grant (already in founder_shares):', {
              grant,
              execUser,
              isTorrance
            });
            continue;
          }
        }

        // EXCLUDE Nathan's 500K grant (revoked)
        if (grant.shares_amount >= 450000 && grant.shares_amount <= 550000) {
          const isNathan = execUser && (
            execUser.title?.toLowerCase().includes('cto') ||
            execUser.first_name?.toLowerCase().includes('nathan') ||
            execUser.last_name?.toLowerCase().includes('curry')
          );
          
          if (isNathan) {
            console.log('⏭️ Skipping Nathan\'s 500K grant (revoked):', {
              grant,
              execUser,
              isNathan
            });
            continue;
          }
        }

        // Build recipient name
        let recipientName = 'Unknown';

        if (execUser) {
          const fullName = `${execUser.first_name || ''} ${execUser.last_name || ''}`.trim();
          const role = execUser.title || '';
          
          // Format: "ROLE Full Name" (e.g., "CFO Justin Sweet")
          if (role && fullName) {
            recipientName = `${role} ${fullName}`;
          } else if (fullName) {
            recipientName = fullName;
          } else if (role) {
            recipientName = role;
          } else {
            recipientName = 'Executive';
          }
        } else {
          // Try employees
          const { data: employee } = await supabase
            .from('employees')
            .select('first_name, last_name')
            .eq('user_id', grant.recipient_user_id)
            .maybeSingle();

          if (employee) {
            recipientName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
          } else {
            // Fallback: use known grants by amount
            if (grant.shares_amount >= 4500000 && grant.shares_amount <= 5500000) {
              recipientName = 'CFO Justin Sweet';
            } else {
              recipientName = `Grant Recipient (${grant.shares_amount.toLocaleString()} shares)`;
            }
          }
        }

        console.log(`✅ [EQUITY GRANTS] Adding grant: ${recipientName} - ${grant.shares_amount} shares`);
        
        formattedGrants.push({
          recipient_name: recipientName,
          shares_amount: grant.shares_amount,
          percentage: (grant.shares_amount / totalAuthorized) * 100,
        });
      }

      // Also check equity_grants table for grants that might not be in ledger yet
      console.log('🔍 [EQUITY GRANTS] Checking equity_grants table for missing grants...');
      const { data: equityGrantsTable, error: equityGrantsError } = await supabase
        .from('equity_grants')
        .select('id, shares_total, executive_id, employee_id')
        .gte('shares_total', 4500000)
        .lte('shares_total', 5500000);

      if (!equityGrantsError && equityGrantsTable) {
        console.log('📊 [EQUITY GRANTS] Found grants in equity_grants table:', equityGrantsTable);
        
        for (const grant of equityGrantsTable) {
          // Check if this grant is already in our formatted list
          const alreadyAdded = formattedGrants.some(
            fg => fg.shares_amount === grant.shares_total
          );
          
          if (!alreadyAdded && grant.shares_total) {
            let recipientName = 'CFO Justin Sweet'; // Default for 5M grants
            
            // Try to get user info from exec_users
            if (grant.executive_id) {
              const { data: execUser } = await supabase
                .from('exec_users')
                .select('first_name, last_name, title, user_id')
                .eq('id', grant.executive_id)
                .maybeSingle();
              
              if (execUser) {
                const fullName = `${execUser.first_name || ''} ${execUser.last_name || ''}`.trim();
                const role = execUser.title || '';
                if (role && fullName) {
                  recipientName = `${role} ${fullName}`;
                } else if (fullName) {
                  recipientName = fullName;
                }
              }
            }
            
            // Try employees if no exec_user
            if (recipientName === 'CFO Justin Sweet' && grant.employee_id) {
              const { data: employee } = await supabase
                .from('employees')
                .select('first_name, last_name, user_id')
                .eq('id', grant.employee_id)
                .maybeSingle();
              
              if (employee) {
                const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
                if (fullName) {
                  recipientName = fullName;
                }
              }
            }
            
            // If we found a 5M grant and it's not already added, add it
            if (grant.shares_total >= 4500000 && grant.shares_total <= 5500000) {
              console.log(`➕ [EQUITY GRANTS] Adding grant from equity_grants: ${recipientName} - ${grant.shares_total} shares`);
              formattedGrants.push({
                recipient_name: recipientName,
                shares_amount: grant.shares_total,
                percentage: (grant.shares_total / totalAuthorized) * 100,
              });
            }
          }
        }
      } else if (equityGrantsError) {
        console.error('❌ [EQUITY GRANTS] Error checking equity_grants:', equityGrantsError);
      }

      // Ensure Justin Sweet (CFO) 5,000,000 shares (5.0%) is visible if it exists in the database
      // Check employee_equity table as a final fallback
      const justinInList = formattedGrants.some(
        grant => (grant.shares_amount >= 4500000 && grant.shares_amount <= 5500000) &&
                 (grant.recipient_name.toLowerCase().includes('justin') || 
                  grant.recipient_name.toLowerCase().includes('cfo') ||
                  grant.recipient_name.toLowerCase().includes('sweet'))
      );

      if (!justinInList) {
        // Try to find Justin's grant in employee_equity table
        const { data: justinEquity } = await supabase
          .from('employee_equity')
          .select('shares_total, shares_percentage, employees(first_name, last_name, position)')
          .gte('shares_total', 4500000)
          .lte('shares_total', 5500000)
          .maybeSingle();

        if (justinEquity && justinEquity.shares_total) {
          const employee = justinEquity.employees as any;
          const name = employee ? `${employee.first_name || ''} ${employee.last_name || ''}`.trim() : 'Justin Sweet';
          const title = employee?.position || 'CFO';
          
          console.log('➕ [EQUITY GRANTS] Found Justin Sweet grant in employee_equity:', justinEquity);
          formattedGrants.push({
            recipient_name: `CFO (${name})`,
            shares_amount: justinEquity.shares_total,
            percentage: justinEquity.shares_percentage || (justinEquity.shares_total / totalAuthorized) * 100,
          });
        }
      }

      // Sort grants: CFO (Justin Sweet) first (will appear right after Founder in table), then by shares descending
      formattedGrants.sort((a, b) => {
        // CFO should come first in the grants list (appears right after Founder)
        const aIsCFO = a.recipient_name.toLowerCase().includes('cfo') || 
                       a.recipient_name.toLowerCase().includes('justin');
        const bIsCFO = b.recipient_name.toLowerCase().includes('cfo') || 
                       b.recipient_name.toLowerCase().includes('justin');
        if (aIsCFO && !bIsCFO) return -1;
        if (!aIsCFO && bIsCFO) return 1;
        // Otherwise sort by shares descending
        return b.shares_amount - a.shares_amount;
      });

      console.log('📋 [EQUITY GRANTS] Final formatted grants:', formattedGrants);
      console.log('📋 [EQUITY GRANTS] Total grants to display:', formattedGrants.length);
      setEquityGrants(formattedGrants);
    } catch (error: any) {
      console.error('Error loading equity grants:', error);
    }
  };

  const fixEverything = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('governance-fix-everything');

      if (error) throw error;

      notifications.show({
        title: 'Success',
        message: data?.message || 'Fixed cap table: revoked Nathan, ensured Justin grant, recalculated totals',
        color: 'green',
        autoClose: 5000,
      });

      // Reload cap table and grants
      await loadCapTable();
      await loadEquityGrants();
    } catch (error: any) {
      console.error('Error fixing cap table:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to fix cap table',
        color: 'red',
        autoClose: 5000,
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

  const initializeCapTable = async () => {
    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/initialize-cap-table`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize cap table');
      }

      // Reload cap table
      await loadCapTable();
    } catch (error: any) {
      console.error('Error initializing cap table:', error);
      alert(`Failed to initialize cap table: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!capTable) {
    return (
      <Container size="xl" py="xl">
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          title="No Cap Table" 
          color="blue"
          mb="md"
        >
          Cap table has not been initialized. Please set up the initial capitalization.
        </Alert>
        <Button onClick={initializeCapTable} loading={loading}>
          Initialize Cap Table
        </Button>
      </Container>
    );
  }

  const issuedPercentage = (capTable.total_issued / capTable.total_authorized) * 100;
  const unissuedPercentage = (capTable.total_unissued / capTable.total_authorized) * 100;

  return (
    <Stack gap="xl">
      {/* Enterprise Header */}
      <Paper
        p="xl"
        radius="md"
        style={{
          background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
          color: 'white',
        }}
      >
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap={16} mb={8}>
              <Box
                style={{
                  backgroundColor: 'rgba(255, 106, 0, 0.2)',
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconChartPie size={32} color="#ff6a00" stroke={2.5} />
              </Box>
              <div>
                <Title order={2} c="white" mb={4} style={{ letterSpacing: '0.5px' }}>
                  Capitalization Table Overview
                </Title>
                <Text c="gray.3" size="sm" style={{ letterSpacing: '0.3px' }}>
                  Comprehensive equity ownership and share distribution analysis
                </Text>
              </div>
            </Group>
            <Group gap="md" mt="md">
              <Badge size="lg" variant="light" color="blue">
                As of {new Date(capTable.as_of_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </Badge>
              <Badge size="lg" variant="light" color="green">
                {issuedPercentage.toFixed(1)}% Issued
              </Badge>
              <Badge size="lg" variant="light" color="yellow">
                {unissuedPercentage.toFixed(1)}% Available
              </Badge>
            </Group>
          </div>
          <Group gap="xs">
            <Button
              variant="light"
              color="orange"
              leftSection={<IconRefresh size={18} />}
              onClick={async () => {
                console.log('🔄 [CAP TABLE] Refresh button clicked');
                setLoading(true);
                try {
                  await loadCapTable();
                  await loadEquityGrants();
                  console.log('✅ [CAP TABLE] Refresh complete');
                } catch (error) {
                  console.error('❌ [CAP TABLE] Refresh error:', error);
                } finally {
                  setLoading(false);
                }
              }}
              loading={loading}
              size="md"
            >
              Refresh
            </Button>
            <Button
              variant="filled"
              color="orange"
              leftSection={<IconTool size={18} />}
              onClick={fixEverything}
              loading={loading}
              size="md"
            >
              Fix Cap Table
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* Key Metrics Grid */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
          <Card padding="xl" radius="md" withBorder style={{ height: '100%' }}>
            <Stack gap="md">
              <Group justify="space-between">
                <Title order={4} c="dimmed">Authorized</Title>
                <Badge color="blue" size="lg">100%</Badge>
              </Group>
              <Text size="2xl" fw={700} c="dark">
                <NumberFormatter value={capTable.total_authorized} thousandSeparator />
              </Text>
              <Progress value={100} color="blue" size="lg" radius="xl" />
              <Text size="xs" c="dimmed">Total authorized shares</Text>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
          <Card padding="xl" radius="md" withBorder style={{ height: '100%', borderColor: '#10b981', borderWidth: 2 }}>
            <Stack gap="md">
              <Group justify="space-between">
                <Title order={4} c="dimmed">Issued</Title>
                <Badge color="green" size="lg">{issuedPercentage.toFixed(1)}%</Badge>
              </Group>
              <Text size="2xl" fw={700} c="green">
                <NumberFormatter value={capTable.total_issued} thousandSeparator />
              </Text>
              <Progress value={issuedPercentage} color="green" size="lg" radius="xl" />
              <Text size="xs" c="dimmed">Currently issued shares</Text>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
          <Card padding="xl" radius="md" withBorder style={{ height: '100%' }}>
            <Stack gap="md">
              <Group justify="space-between">
                <Title order={4} c="dimmed">Unissued</Title>
                <Badge color="yellow" size="lg">{unissuedPercentage.toFixed(1)}%</Badge>
              </Group>
              <Text size="2xl" fw={700} c="dark">
                <NumberFormatter value={capTable.total_unissued} thousandSeparator />
              </Text>
              <Progress value={unissuedPercentage} color="yellow" size="lg" radius="xl" />
              <Text size="xs" c="dimmed">Available for issuance</Text>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
          <Card padding="xl" radius="md" withBorder style={{ height: '100%', borderColor: '#f97316', borderWidth: 2 }}>
            <Stack gap="md">
              <Group justify="space-between">
                <Title order={4} c="dimmed">Equity Pool</Title>
                <Badge color="orange" size="lg">Reserved</Badge>
              </Group>
              <Text size="2xl" fw={700} c="orange">
                <NumberFormatter value={capTable.equity_pool} thousandSeparator />
              </Text>
              <Progress value={capTable.pool_percentage} color="orange" size="lg" radius="xl" />
              <Text size="xs" c="dimmed">{capTable.pool_percentage.toFixed(1)}% reserved for grants</Text>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Share Distribution Table */}
      <Card padding="xl" radius="md" withBorder>
        <Group justify="space-between" mb="xl">
          <div>
            <Title order={3} mb={4}>Share Distribution</Title>
            <Text c="dimmed" size="sm">Complete breakdown of equity ownership</Text>
          </div>
        </Group>
        <Table highlightOnHover verticalSpacing="md" horizontalSpacing="lg">
          <Table.Thead style={{ backgroundColor: '#f9fafb' }}>
            <Table.Tr>
              <Table.Th style={{ fontWeight: 600 }}>Holder</Table.Th>
              <Table.Th style={{ fontWeight: 600 }}>Shares</Table.Th>
              <Table.Th style={{ fontWeight: 600 }}>Percentage</Table.Th>
              <Table.Th style={{ fontWeight: 600 }}>Visual</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td>
                <Text fw={600} size="sm">Invero, Inc. (Holding Company)</Text>
              </Table.Td>
              <Table.Td>
                <Text fw={700} size="sm">
                  <NumberFormatter value={capTable.holding_company_shares} thousandSeparator />
                </Text>
              </Table.Td>
              <Table.Td>
                <Badge color="blue" size="lg" variant="light">
                  {capTable.holding_company_percentage.toFixed(1)}%
                </Badge>
              </Table.Td>
              <Table.Td>
                <Progress value={capTable.holding_company_percentage} color="blue" size="sm" radius="xl" style={{ minWidth: 100 }} />
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>
                <Text fw={600} size="sm">Founder (Torrance Stroman)</Text>
              </Table.Td>
              <Table.Td>
                <Text fw={700} size="sm">
                  <NumberFormatter value={capTable.founder_shares} thousandSeparator />
                </Text>
              </Table.Td>
              <Table.Td>
                <Badge color="green" size="lg" variant="light">
                  {capTable.founder_percentage.toFixed(1)}%
                </Badge>
              </Table.Td>
              <Table.Td>
                <Progress value={capTable.founder_percentage} color="green" size="sm" radius="xl" style={{ minWidth: 100 }} />
              </Table.Td>
            </Table.Tr>
            {/* Individual Equity Grants */}
            {equityGrants.map((grant, index) => (
              <Table.Tr key={`grant-${index}`}>
                <Table.Td>
                  <Text fw={600} size="sm">{grant.recipient_name}</Text>
                </Table.Td>
                <Table.Td>
                  <Text fw={700} size="sm">
                    <NumberFormatter value={grant.shares_amount} thousandSeparator />
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge color="purple" size="lg" variant="light">
                    {grant.percentage.toFixed(1)}%
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Progress value={grant.percentage} color="purple" size="sm" radius="xl" style={{ minWidth: 100 }} />
                </Table.Td>
              </Table.Tr>
            ))}
            <Table.Tr style={{ backgroundColor: '#f9fafb' }}>
              <Table.Td>
                <Text fw={600} size="sm" c="dimmed">Pool (Reserved)</Text>
              </Table.Td>
              <Table.Td>
                <Text fw={700} size="sm" c="dimmed">
                  <NumberFormatter value={capTable.equity_pool} thousandSeparator />
                </Text>
              </Table.Td>
              <Table.Td>
                <Badge color="orange" size="lg" variant="light">
                  {capTable.pool_percentage.toFixed(1)}% Reserved
                </Badge>
              </Table.Td>
              <Table.Td>
                <Progress value={capTable.pool_percentage} color="orange" size="sm" radius="xl" style={{ minWidth: 100 }} />
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Card>
    </Stack>
  );
};

export default CapTableOverview;


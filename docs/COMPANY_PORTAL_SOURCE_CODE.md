# Company Portal - Complete Source Code Export
**For Claude.ai Design Consultation**

---

## 1. Cap Table Overview Component
**File**: `src/portals/company/governance-admin/CapTableOverview.tsx`

```typescript
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
} from '@mantine/core';
import { IconChartPie, IconAlertCircle } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

interface CapTableData {
  total_authorized: number;
  total_issued: number;
  total_unissued: number;
  holding_company_shares: number;
  holding_company_percentage: number;
  founder_shares: number;
  founder_percentage: number;
  equity_pool: number;
  pool_percentage: number;
  par_value: number;
}

interface ExecutiveEquity {
  name: string;
  title: string;
  shares: number;
  percentage: number;
  strike_price: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

const CapTableOverview: React.FC = () => {
  const [capTable, setCapTable] = useState<CapTableData | null>(null);
  const [executives, setExecutives] = useState<ExecutiveEquity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCapTable();
  }, []);

  // ==========================================================================
  // LOAD CAP TABLE DATA
  // ==========================================================================
  const loadCapTable = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Get cap table summary
      const { data: capData, error: capError } = await supabase
        .from('cap_tables')
        .select('*')
        .limit(1)
        .single();

      if (capError) throw new Error(`Cap table error: ${capError.message}`);
      if (!capData) throw new Error('No cap table data found');

      setCapTable(capData);

      // 2. Get ALL executives from equity_ledger
      const { data: ledgerData, error: ledgerError } = await supabase
        .from('equity_ledger')
        .select('recipient_user_id, shares_amount, price_per_share')
        .eq('transaction_type', 'grant')
        .order('shares_amount', { ascending: false });

      if (ledgerError) throw new Error(`Equity ledger error: ${ledgerError.message}`);

      // 3. Get executive names from exec_users
      const { data: execData, error: execError } = await supabase
        .from('exec_users')
        .select('user_id, name, title');

      if (execError) throw new Error(`Exec users error: ${execError.message}`);

      // 4. Match ledger to executives
      const executiveEquity: ExecutiveEquity[] = [];

      for (const grant of ledgerData || []) {
        const exec = execData?.find(e => e.user_id === grant.recipient_user_id);
        
        if (exec) {
          const percentage = (grant.shares_amount / capData.total_authorized) * 100;
          
          executiveEquity.push({
            name: exec.name || 'Executive',
            title: exec.title || 'Executive',
            shares: grant.shares_amount,
            percentage: percentage,
            strike_price: grant.price_per_share || 0,
          });
        }
      }

      setExecutives(executiveEquity);
      
      console.log('✅ Cap table loaded:', {
        capTable: capData,
        executives: executiveEquity,
      });

    } catch (err: any) {
      console.error('❌ Cap table load error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // LOADING STATE
  // ==========================================================================
  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" gap="md" style={{ minHeight: 400, justifyContent: 'center' }}>
          <Loader size="lg" />
          <Text c="dimmed">Loading cap table...</Text>
        </Stack>
      </Container>
    );
  }

  // ==========================================================================
  // ERROR STATE
  // ==========================================================================
  if (error || !capTable) {
    return (
      <Container size="xl" py="xl">
        <Alert icon={<IconAlertCircle size={16} />} title="Error Loading Cap Table" color="red">
          {error || 'Cap table data not found'}
        </Alert>
      </Container>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={2}>
              <IconChartPie size={32} style={{ marginRight: 12, verticalAlign: 'middle' }} />
              Capitalization Table
            </Title>
            <Text c="dimmed" size="sm" mt={4}>
              Crave'n Inc. - 70,000,000 Authorized Shares at ${capTable.par_value.toFixed(4)} par value
            </Text>
          </div>
        </Group>

        {/* Overview Cards */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Card padding="xl" radius="md" withBorder style={{ height: '100%', borderColor: '#3b82f6', borderWidth: 2 }}>
              <Stack gap="md">
                <Title order={4} c="dimmed">Total Authorized</Title>
                <Text size="2xl" fw={700} c="blue">
                  <NumberFormatter value={capTable.total_authorized} thousandSeparator />
                </Text>
                <Text size="xs" c="dimmed">Delaware authorized shares</Text>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Card padding="xl" radius="md" withBorder style={{ height: '100%', borderColor: '#10b981', borderWidth: 2 }}>
              <Stack gap="md">
                <Group justify="space-between">
                  <Title order={4} c="dimmed">Total Issued</Title>
                  <Badge color="green" size="lg">{((capTable.total_issued / capTable.total_authorized) * 100).toFixed(1)}%</Badge>
                </Group>
                <Text size="2xl" fw={700} c="green">
                  <NumberFormatter value={capTable.total_issued} thousandSeparator />
                </Text>
                <Progress value={(capTable.total_issued / capTable.total_authorized) * 100} color="green" size="lg" radius="xl" />
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Card padding="xl" radius="md" withBorder style={{ height: '100%', borderColor: '#eab308', borderWidth: 2 }}>
              <Stack gap="md">
                <Group justify="space-between">
                  <Title order={4} c="dimmed">Unissued</Title>
                  <Badge color="yellow" size="lg">{((capTable.total_unissued / capTable.total_authorized) * 100).toFixed(1)}%</Badge>
                </Group>
                <Text size="2xl" fw={700} style={{ color: '#eab308' }}>
                  <NumberFormatter value={capTable.total_unissued} thousandSeparator />
                </Text>
                <Progress value={(capTable.total_unissued / capTable.total_authorized) * 100} color="yellow" size="lg" radius="xl" />
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
                <Text size="xs" c="dimmed">{capTable.pool_percentage.toFixed(1)}% reserved</Text>
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
                <Table.Th style={{ fontWeight: 600 }}>Strike Price</Table.Th>
                <Table.Th style={{ fontWeight: 600 }}>Visual</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {/* Holding Company */}
              <Table.Tr>
                <Table.Td>
                  <div>
                    <Text fw={600} size="sm">Invero, Inc.</Text>
                    <Text size="xs" c="dimmed">Holding Company</Text>
                  </div>
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
                  <Badge color="gray" size="sm" variant="outline">
                    $0.00
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Progress value={capTable.holding_company_percentage} color="blue" size="sm" radius="xl" style={{ minWidth: 100 }} />
                </Table.Td>
              </Table.Tr>

              {/* Founder */}
              <Table.Tr>
                <Table.Td>
                  <div>
                    <Text fw={600} size="sm">Torrance Stroman</Text>
                    <Text size="xs" c="dimmed">Founder & CEO</Text>
                  </div>
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
                  <Badge color="gray" size="sm" variant="outline">
                    $0.00
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Progress value={capTable.founder_percentage} color="green" size="sm" radius="xl" style={{ minWidth: 100 }} />
                </Table.Td>
              </Table.Tr>

              {/* Executives */}
              {executives.map((exec, index) => (
                <Table.Tr key={`exec-${index}`}>
                  <Table.Td>
                    <div>
                      <Text fw={600} size="sm">{exec.name}</Text>
                      <Text size="xs" c="dimmed">{exec.title}</Text>
                    </div>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={700} size="sm">
                      <NumberFormatter value={exec.shares} thousandSeparator />
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color="purple" size="lg" variant="light">
                      {exec.percentage.toFixed(1)}%
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge 
                      color={exec.strike_price === 0 ? "gray" : "indigo"} 
                      size="sm" 
                      variant="outline"
                    >
                      ${exec.strike_price.toFixed(2)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Progress value={exec.percentage} color="purple" size="sm" radius="xl" style={{ minWidth: 100 }} />
                  </Table.Td>
                </Table.Tr>
              ))}

              {/* Pool */}
              <Table.Tr style={{ backgroundColor: '#fef3c7' }}>
                <Table.Td>
                  <div>
                    <Text fw={600} size="sm" c="dimmed">Pool (Reserved)</Text>
                    <Text size="xs" c="dimmed">Available for grants</Text>
                  </div>
                </Table.Td>
                <Table.Td>
                  <Text fw={700} size="sm" c="dimmed">
                    <NumberFormatter value={capTable.equity_pool} thousandSeparator />
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge color="orange" size="lg" variant="light">
                    {capTable.pool_percentage.toFixed(1)}%
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge color="gray" size="sm" variant="outline">
                    N/A
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
    </Container>
  );
};

export default CapTableOverview;
```

---

## 2. Governance Admin Dashboard
**File**: `src/portals/company/governance-admin/GovernanceAdminDashboard.tsx`

This is a tabbed dashboard with 14 tabs:
- Appointments
- Validation
- Resolutions
- Exit Workflows
- Resolution Builder
- Officers
- **Cap Table** (your key page)
- **Equity Grants** (your equity management)
- Certificates
- Logs
- Templates
- Roles
- User Accounts
- Board Setup
- Filing System

**Tabs include**: AppointmentList, ResolutionList, CapTableOverview, EquityGrantsList, etc.

---

## 3. Company Sidebar Navigation
**File**: `src/portals/company/components/CompanySidebar.tsx`

**Current Navigation Items**:
1. Dashboard
2. Governance Admin (Founder/Corporate Secretary only)
3. Board (Board Members only)
4. Voting (Board/Executives)
5. Executives (Executives only)
6. Leadership (All)
7. Template Manager (Founder/CEO/Secretary)
8. SOP Documents (All)

**Role-Based Access Control**: Uses `fetchUserRoles()` and permission checks

---

## 4. Company Shell (Layout)
**File**: `src/portals/company/components/CompanyShell.tsx`

**Features**:
- Top header with company branding
- Left sidebar navigation (280px width)
- User menu with profile/logout
- "Back to Hub" button
- Mobile responsive with burger menu

**Current Brand Colors**:
- Primary: `#ff6a00` (Orange)
- Background: `#ffffff` (White)
- Border: `#e5e7eb` (Light Gray)

---

## Design Issues to Fix

### 1. Cap Table Page
**Current Issues**:
- Too basic, looks like a prototype
- No charts or visualizations
- Table is text-heavy
- Doesn't feel "investor-ready"

**What's Needed**:
- Hero section with key metrics
- Pie chart showing ownership breakdown
- Beautiful shareholder cards
- Export to PDF functionality
- Timeline view (optional)

### 2. Dashboard Layout
**Current Issues**:
- Just a tabbed interface
- No overview/summary on landing
- Tabs are functional but cluttered (14 tabs!)
- No visual hierarchy

**What's Needed**:
- Landing dashboard with KPI cards
- Recent activity feed
- Quick actions
- Better tab organization (group related items)

### 3. Sidebar Navigation
**Current Issues**:
- Basic list of links
- No visual grouping
- Icons are small
- No breadcrumbs

**What's Needed**:
- Grouped sections (Governance, Operations, Reports)
- Larger, more prominent icons
- Better active states
- Search functionality

---

## Current Data Flow

### Cap Table Data Sources

**Primary Table**: `cap_tables`
- `total_authorized`: 70,000,000
- `total_issued`: 55,300,000
- `total_unissued`: 14,700,000
- `holding_company_shares`: 40,600,000 (Invero, Inc.)
- `founder_shares`: 10,500,000 (Torrance Stroman)
- `equity_pool`: 14,700,000
- `par_value`: 0.001

**Executive Equity**: `equity_ledger`
- Tracks grants to executives (e.g., Justin Sweet: 4.2M shares @ $2.00)
- Linked to `exec_users` table via `recipient_user_id`

### Component Architecture

```
GovernanceAdminDashboard
├── Tabs (14 tabs)
│   ├── Cap Table Tab
│   │   └── <CapTableOverview />
│   ├── Equity Grants Tab
│   │   └── <EquityGrantsList />
│   └── ... (other tabs)
```

---

## What Needs Redesign

### Priority 1: Cap Table Page
- Make it visually stunning
- Add pie chart for ownership
- Use card-based layout for shareholders
- Add export to PDF
- Make it mobile-friendly

### Priority 2: Governance Dashboard
- Redesign landing page
- Add KPI cards
- Reduce tab clutter
- Add quick actions

### Priority 3: Navigation
- Better sidebar design
- Grouped navigation
- Better icons and spacing

---

## Technical Requirements

**Must Use**:
- Mantine UI components (v7+)
- TypeScript
- React 18
- Supabase client for data

**Must Support**:
- Role-based access control (keep existing logic)
- Mobile responsive
- Fast loading (< 2 seconds)

**Must NOT Break**:
- Existing Supabase schema
- Authentication flow
- Permission system

---

## Deliverables Requested from Claude.ai

1. **Cap Table Page Redesign**
   - Wireframe/mockup
   - Component code with Mantine UI
   - Chart implementation (pie chart for ownership)
   - Responsive design

2. **Dashboard Landing Page**
   - Hero section with KPIs
   - Recent activity feed
   - Quick actions
   - Better tab organization

3. **Navigation Redesign**
   - Grouped sidebar
   - Better visual hierarchy
   - Search functionality (optional)

4. **Design System**
   - Color palette
   - Typography
   - Spacing guidelines
   - Component library

---

## Questions for Claude.ai

1. Should we use a charting library (e.g., Recharts, Nivo) for ownership visualization?
2. How should we organize 14 tabs? (Group them? Reduce visible tabs?)
3. Should the cap table page be a standalone page or remain as a tab?
4. What's the best way to make the portal feel "enterprise-grade"?
5. Should we add a dashboard home page with widgets?

---

## Repository Info

- **Repo**: craven-delivery
- **Local Dev**: http://localhost:8080/company
- **Tech Stack**: React + TypeScript + Vite + Mantine + Supabase
- **Package Manager**: npm (not pnpm)

---

**Thank you for redesigning this portal to be more professional and investor-ready!**


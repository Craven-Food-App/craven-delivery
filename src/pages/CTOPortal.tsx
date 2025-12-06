// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Grid,
  Group,
  Stack,
  Button,
  Text,
  Title,
  Card,
  Paper,
  Badge,
  Alert,
  Divider,
  Modal,
  TextInput,
  NumberInput,
  Select,
  Table,
  ActionIcon,
  Tabs,
  Loader,
  Box,
  Tooltip,
  Center,
  Textarea,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import {
  IconCloud,
  IconBug,
  IconShield,
  IconDatabase,
  IconPlus,
  IconEdit,
  IconTrash,
  IconArrowLeft,
  IconMail,
  IconFileText,
  IconCheck,
  IconRocket,
  IconUsers,
  IconCode,
  IconServer,
  IconAlertTriangle,
  IconInfoCircle,
} from '@tabler/icons-react';
import { useExecAuth } from '@/hooks/useExecAuth';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { useAutoLogout } from '@/hooks/useAutoLogout';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ExecutiveInboxIMessage } from '@/components/executive/ExecutiveInboxIMessage';
import BusinessEmailSystem from '@/components/executive/BusinessEmailSystem';
import ExecutiveWordProcessor from '@/components/executive/ExecutiveWordProcessor';
import MorningTechnicalReview from '@/components/cto/MorningTechnicalReview';
import SprintManagement from '@/components/cto/SprintManagement';
import CodeReviewQueue from '@/components/cto/CodeReviewQueue';
import ITHelpDeskDashboard from '@/components/cto/ITHelpDeskDashboard';
import CodeEditorPortal from '@/components/cto/CodeEditorPortal';
import DeveloperOnboarding from '@/components/cto/DeveloperOnboarding';
import ExecutivePortalLayout, { ExecutiveNavItem } from '@/components/executive/ExecutivePortalLayout';
import { EnhancedCTODashboard } from '@/components/cto/EnhancedCTODashboard';
import { AdvancedInfrastructureManagement } from '@/components/cto/AdvancedInfrastructureManagement';
import { DevOpsDashboard } from '@/components/cto/DevOpsDashboard';
import { SecurityComplianceCenter } from '@/components/cto/SecurityComplianceCenter';
import { TeamResourceManagement } from '@/components/cto/TeamResourceManagement';
import { TechnologyRoadmap } from '@/components/cto/TechnologyRoadmap';
import { TechCostManagement } from '@/components/cto/TechCostManagement';
import { CTOPortalInstructionManual } from '@/components/cto/CTOPortalInstructionManual';
import { IncidentsDashboard } from '@/components/cto/IncidentsDashboard';
import { AssetManagement } from '@/components/cto/AssetManagement';
import { CTOOnboardingGovernance } from '@/components/cto/CTOOnboardingGovernance';
import { EmbeddedToastProvider } from '@/components/cfo/EmbeddedToast';
import { useToast } from '@/hooks/useEmbeddedToast';
import { MantineTable } from '@/components/cfo/MantineTable';
import { useForm } from '@mantine/form';
import { hasFullAccess } from '@/utils/torranceAccess';
import {
  Code,
  Cloud,
  Shield,
  Users,
  Rocket,
  FileText,
  Mail,
  BarChart3,
  Settings,
  Database,
  Scale,
} from 'lucide-react';

function CTOPortalContent() {
  const { loading: authLoading, user, execUser, isAuthorized, signOut } = useExecAuth('cto');
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>('onboarding');
  const [isChatCollapsed, setIsChatCollapsed] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const toast = useToast();
  
  // Track user activity
  useActivityTracking('cto');
  
  // Auto-logout after 30 minutes of inactivity
  useAutoLogout('cto');

  // TORRANCE STROMAN: IMMEDIATE FULL ACCESS CHECK - BEFORE ANYTHING ELSE
  const email = user?.email?.toLowerCase() || '';
  const isTorrance = email === 'tstroman.ceo@cravenusa.com' || 
                     email.includes('torrance') || 
                     email.includes('tstroman');
  
  // Log for debugging
  useEffect(() => {
    if (user?.email) {
      console.log('CTO Portal Auth Check:', {
        email: user.email,
        emailLower: email,
        isTorrance,
        isAuthorized,
        execUserRole: execUser?.role
      });
    }
  }, [user?.email, email, isTorrance, isAuthorized, execUser?.role]);

  // TORRANCE GETS FULL ACCESS - NO EXCEPTIONS
  const finalIsAuthorized = isAuthorized || isTorrance;

  const navItems = useMemo<ExecutiveNavItem[]>(() => [
    { id: 'onboarding', label: 'CTO Onboarding & Governance', icon: Scale },
    { id: 'overview', label: 'CTO Command Center', icon: BarChart3 },
    { id: 'infra', label: 'Advanced Infrastructure', icon: Cloud },
    { id: 'devops', label: 'DevOps & CI/CD', icon: Rocket },
    { id: 'security', label: 'Security & Compliance', icon: Shield },
    { id: 'team', label: 'Team & Resources', icon: Users },
    { id: 'roadmap', label: 'Technology Roadmap', icon: Rocket },
    { id: 'costs', label: 'Tech Cost Management', icon: Settings },
    { id: 'morning-review', label: 'Morning Review', icon: BarChart3 },
    { id: 'sprint', label: 'Sprint Management', icon: Rocket },
    { id: 'code-review', label: 'Code Reviews', icon: Code },
    { id: 'help-desk', label: 'IT Help Desk', icon: Users },
    { id: 'code-editor', label: 'Code Editor', icon: Code },
    { id: 'developer-onboarding', label: 'Developer Onboarding', icon: Rocket },
    { id: 'incidents', label: 'Incidents', icon: IconBug },
    { id: 'assets', label: 'Assets', icon: Database },
    { id: 'communications', label: 'Executive Communications', icon: Mail },
    { id: 'word', label: 'Draft Documents', icon: FileText },
    { id: 'manual', label: 'Instruction Manual', icon: FileText },
  ], []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      navigate('/auth?hq=true');
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'onboarding':
        return <CTOOnboardingGovernance />;
      case 'overview':
        return <EnhancedCTODashboard />;
      case 'infra':
        return <AdvancedInfrastructureManagement />;
      case 'devops':
        return <DevOpsDashboard />;
      case 'security':
        return <SecurityComplianceCenter />;
      case 'team':
        return <TeamResourceManagement />;
      case 'roadmap':
        return <TechnologyRoadmap />;
      case 'costs':
        return <TechCostManagement />;
      case 'morning-review':
        return <MorningTechnicalReview />;
      case 'sprint':
        return <SprintManagement />;
      case 'code-review':
        return <CodeReviewQueue />;
      case 'help-desk':
        return <ITHelpDeskDashboard />;
      case 'code-editor':
        return null; // Handled separately below
      case 'developer-onboarding':
        return <DeveloperOnboarding />;
      case 'incidents':
        return <IncidentsDashboard />;
      case 'assets':
        return <AssetManagement />;
      case 'communications':
        return <BusinessEmailSystem />;
      case 'word':
        return <ExecutiveWordProcessor storageKey="cto" supabaseTable="cto_documents" />;
      case 'manual':
        return <CTOPortalInstructionManual />;
      default:
        return <EnhancedCTODashboard />;
    }
  };

  const content = renderContent();
  const shouldWrapContent = activeSection !== 'overview';

  if (authLoading) {
    return (
      <Center style={{ height: '100vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  // TORRANCE STROMAN: FULL ACCESS - NO RESTRICTIONS
  if (!finalIsAuthorized) {
    console.log('CTO Portal Access Denied:', { 
      email: user?.email, 
      isAuthorized, 
      isTorrance,
      finalIsAuthorized 
    });
    return (
      <Center style={{ height: '100vh' }}>
        <Stack align="center" gap="md">
          <IconAlertTriangle size={48} color="#ef4444" />
          <Title order={2}>Access Denied</Title>
          <Text c="dimmed">You do not have permission to access the CTO Portal</Text>
          <Text size="sm" c="dimmed">Email: {user?.email || 'Not logged in'}</Text>
          <Button onClick={() => navigate('/hub')}>Back to Hub</Button>
        </Stack>
      </Center>
    );
  }

  // Always render code editor in standalone corporate mode
  if (activeSection === 'code-editor') {
    return (
      <CodeEditorPortal 
        standalone={true}
        onBack={() => setActiveSection('overview')}
      />
    );
  }

  return (
    <ExecutivePortalLayout
      title="CTO Portal"
      subtitle="Technology operations command center"
      navItems={navItems}
      activeItemId={activeSection}
      onSelect={setActiveSection}
      onBack={() => navigate('/hub')}
      onSignOut={handleSignOut}
      userInfo={{
        initials: 'CT',
        name: 'Chief Technology Officer',
        role: 'Technology Leadership',
      }}
    >
      <div className="space-y-6">
        <Alert color="green" style={{ padding: 16 }}>
          <Group justify="space-between" wrap="wrap" gap={12}>
            <Group gap={8}>
              <IconCheck size={16} color="#059669" />
              <Text size="sm" fw={600} c="green.7">Technology systems operational</Text>
            </Group>
            <Text size="xs" c="green.6">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Text>
          </Group>
        </Alert>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb={isChatCollapsed ? 0 : 16}>
            <Title order={4} style={{ margin: 0 }}>Executive Chat</Title>
            <Button
              size="sm"
              variant="default"
              onClick={() => setIsChatCollapsed((prev) => !prev)}
            >
              {isChatCollapsed ? 'Expand' : 'Collapse'}
            </Button>
          </Group>
          {!isChatCollapsed && (
            <ExecutiveInboxIMessage role="cto" deviceId={`cto-portal-${window.location.hostname}`} />
          )}
        </Card>

        {shouldWrapContent ? (
          <Card shadow="sm" padding="lg" radius="md" withBorder style={{ overflow: 'hidden' }}>
            {content}
          </Card>
        ) : (
          content
        )}
      </div>
    </ExecutivePortalLayout>
  );
}

// Infrastructure Health Component
function InfrastructureHealth() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const toast = useToast();

  const form = useForm({
    initialValues: {
      service_name: '',
      service_provider: '',
      status: 'operational',
      uptime_percent: 99.9,
      response_time_ms: 45,
    },
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('it_infrastructure')
        .select('*')
        .order('last_check', { ascending: false });
      
      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      console.error('Error fetching services:', error);
      toast.error('Failed to load services', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingService(null);
    form.reset();
    setModalOpened(true);
  };

  const handleEdit = (record: any) => {
    setEditingService(record);
    form.setValues(record);
    setModalOpened(true);
  };

  const handleDelete = async (id: string) => {
    modals.openConfirmModal({
      title: 'Delete Service',
      children: <Text size="sm">Are you sure you want to delete this service? This action cannot be undone.</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('it_infrastructure').delete().eq('id', id);
          if (error) throw error;
          toast.success('Service deleted successfully', 'Success');
          fetchServices();
        } catch (error: any) {
          console.error('Error deleting service:', error);
          toast.error(error.message || 'Failed to delete service', 'Error');
        }
      },
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingService) {
        const { error } = await supabase
          .from('it_infrastructure')
          .update(values)
          .eq('id', editingService.id);
        if (error) throw error;
        toast.success('Service updated successfully', 'Success');
      } else {
        const { error } = await supabase.from('it_infrastructure').insert(values);
        if (error) throw error;
        toast.success('Service created successfully', 'Success');
      }
      setModalOpened(false);
      form.reset();
      fetchServices();
    } catch (error: any) {
      console.error('Error saving service:', error);
      toast.error(error.message || 'Failed to save service', 'Error');
    }
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={4}>IT Infrastructure</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={handleCreate}>
          Add Service
        </Button>
      </Group>

      <MantineTable
        data={services}
        loading={loading}
        rowKey="id"
        columns={[
          { title: 'Service', dataIndex: 'service_name' },
          { title: 'Provider', dataIndex: 'service_provider' },
          {
            title: 'Status',
            dataIndex: 'status',
            render: (status: string) => (
              <Badge color={status === 'operational' ? 'green' : 'red'} variant="light">
                {status}
              </Badge>
            ),
          },
          { title: 'Uptime %', dataIndex: 'uptime_percent', render: (v: number) => `${v?.toFixed(2) || 0}%` },
          { title: 'Response (ms)', dataIndex: 'response_time_ms' },
          {
            title: 'Actions',
            dataIndex: 'actions',
            render: (_: any, record: any) => (
              <Group gap="xs">
                <Tooltip label="Edit">
                  <ActionIcon variant="subtle" color="blue" onClick={() => handleEdit(record)}>
                    <IconEdit size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Delete">
                  <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(record.id)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            ),
          },
        ]}
      />

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={editingService ? 'Edit Service' : 'Add Service'}
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Service Name"
              placeholder="API Gateway"
              required
              {...form.getInputProps('service_name')}
            />
            <TextInput
              label="Provider"
              placeholder="Supabase"
              required
              {...form.getInputProps('service_provider')}
            />
            <Select
              label="Status"
              required
              data={[
                { value: 'operational', label: 'Operational' },
                { value: 'degraded', label: 'Degraded' },
                { value: 'down', label: 'Down' },
                { value: 'maintenance', label: 'Maintenance' },
              ]}
              {...form.getInputProps('status')}
            />
            <Grid>
              <Grid.Col span={6}>
                <NumberInput
                  label="Uptime %"
                  min={0}
                  max={100}
                  decimalScale={2}
                  {...form.getInputProps('uptime_percent')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput
                  label="Response Time (ms)"
                  min={0}
                  {...form.getInputProps('response_time_ms')}
                />
              </Grid.Col>
            </Grid>
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setModalOpened(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}

export default function CTOPortal() {
  return (
    <EmbeddedToastProvider>
      <CTOPortalContent />
    </EmbeddedToastProvider>
  );
}

// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback, Suspense, startTransition } from 'react';
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
import { useNavigate, Routes, Route, useLocation } from 'react-router-dom';
import { ExecutiveInboxIMessage } from '@/components/executive/ExecutiveInboxIMessage';

// Lazy load heavy components for performance
const BusinessEmailSystem = React.lazy(() => import('@/components/executive/BusinessEmailSystem'));
const ExecutiveWordProcessor = React.lazy(() => import('@/components/executive/ExecutiveWordProcessor'));
const MorningTechnicalReview = React.lazy(() => import('@/components/cto/MorningTechnicalReview'));
const SprintManagement = React.lazy(() => import('@/components/cto/SprintManagement'));
const CodeReviewQueue = React.lazy(() => import('@/components/cto/CodeReviewQueue'));
const ITHelpDeskDashboard = React.lazy(() => import('@/components/cto/ITHelpDeskDashboard'));
const CodeEditorPortal = React.lazy(() => import('@/components/cto/CodeEditorPortal'));
import DeveloperOnboarding from '@/components/cto/DeveloperOnboarding';
import { PortalLayout } from '@/components/tpi/PortalLayout';
import { PageHeader } from '@/components/tpi/PageHeader';
import { SidebarItem } from '@/components/tpi/types';
import { EnhancedCTODashboard } from '@/components/cto/EnhancedCTODashboard';
import { AdvancedInfrastructureManagement } from '@/components/cto/AdvancedInfrastructureManagement';
import { DevOpsDashboard } from '@/components/cto/DevOpsDashboard';
import { SecurityComplianceCenter } from '@/components/cto/SecurityComplianceCenter';
import { TeamResourceManagement } from '@/components/cto/TeamResourceManagement';
import { TechnologyRoadmap } from '@/components/cto/TechnologyRoadmap';
import { TechCostManagement } from '@/components/cto/TechCostManagement';
import { CTOPortalInstructionManual } from '@/components/cto/CTOPortalInstructionManual';
import CtoEvaluationGatePanel from '@/components/cto/CtoEvaluationGatePanel';
import { IncidentsDashboard } from '@/components/cto/IncidentsDashboard';
import { AssetManagement } from '@/components/cto/AssetManagement';
import { CTOOnboardingGovernance } from '@/components/cto/CTOOnboardingGovernance';
import CtoTrainingRouter from '@/components/cto/training/CtoTrainingRouter';
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
  const location = useLocation();
  const [activeSection, setActiveSection] = useState<string>('onboarding');
  const [isChatCollapsed, setIsChatCollapsed] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const toast = useToast();

  // Determine current section from path
  const getCurrentSection = useCallback(() => {
    const path = location.pathname;
    if (path.includes('/training')) return 'training';
    if (path.includes('/onboarding')) return 'onboarding';
    if (path.includes('/evaluation')) return 'evaluation';
    if (path.includes('/infrastructure')) return 'infra';
    if (path.includes('/devops')) return 'devops';
    if (path.includes('/security')) return 'security';
    if (path.includes('/team')) return 'team';
    if (path.includes('/roadmap')) return 'roadmap';
    if (path.includes('/costs')) return 'costs';
    if (path.includes('/morning-review')) return 'morning-review';
    if (path.includes('/sprint')) return 'sprint';
    if (path.includes('/code-review')) return 'code-review';
    if (path.includes('/help-desk')) return 'help-desk';
    if (path.includes('/code-editor')) return 'code-editor';
    if (path.includes('/developer-onboarding')) return 'developer-onboarding';
    if (path.includes('/incidents')) return 'incidents';
    if (path.includes('/assets')) return 'assets';
    if (path.includes('/communications')) return 'communications';
    if (path.includes('/documents')) return 'word';
    if (path.includes('/manual')) return 'manual';
    return 'overview';
  }, [location.pathname]);

  // Sync activeSection with URL path
  useEffect(() => {
    const section = getCurrentSection();
    setActiveSection(section);
  }, [getCurrentSection]);
  
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

  const sidebarItems = useMemo<SidebarItem[]>(() => [
    {
      id: 'dashboard',
      label: 'CTO Command Center',
      icon: BarChart3,
      path: '/cto',
      children: [
        { id: 'overview', label: 'Overview', icon: BarChart3, path: '/cto' },
        { id: 'morning-review', label: 'Morning Review', icon: BarChart3, path: '/cto/morning-review' },
      ],
    },
    {
      id: 'governance',
      label: 'Governance',
      icon: Scale,
      path: '/cto/governance',
      children: [
        { id: 'evaluation', label: 'Evaluation Gate', icon: Shield, path: '/cto/evaluation' },
        { id: 'onboarding', label: 'Onboarding & Governance', icon: Scale, path: '/cto/onboarding' },
        { id: 'training', label: 'Training', icon: FileText, path: '/cto/training' },
      ],
    },
    {
      id: 'infrastructure',
      label: 'Infrastructure',
      icon: Cloud,
      path: '/cto/infrastructure',
      children: [
        { id: 'infra', label: 'Advanced Infrastructure', icon: Cloud, path: '/cto/infrastructure' },
        { id: 'devops', label: 'DevOps & CI/CD', icon: Rocket, path: '/cto/devops' },
        { id: 'security', label: 'Security & Compliance', icon: Shield, path: '/cto/security' },
      ],
    },
    {
      id: 'operations',
      label: 'Operations',
      icon: IconBug,
      path: '/cto/operations',
      children: [
        { id: 'incidents', label: 'Incidents', icon: IconBug, path: '/cto/incidents' },
        { id: 'assets', label: 'Assets', icon: Database, path: '/cto/assets' },
        { id: 'help-desk', label: 'IT Help Desk', icon: Users, path: '/cto/help-desk' },
      ],
    },
    {
      id: 'engineering',
      label: 'Engineering',
      icon: Code,
      path: '/cto/engineering',
      children: [
        { id: 'sprint', label: 'Sprint Management', icon: Rocket, path: '/cto/sprint' },
        { id: 'code-review', label: 'Code Reviews', icon: Code, path: '/cto/code-review' },
        { id: 'code-editor', label: 'Code Editor', icon: Code, path: '/cto/code-editor' },
        { id: 'developer-onboarding', label: 'Developer Onboarding', icon: Rocket, path: '/cto/developer-onboarding' },
      ],
    },
    {
      id: 'management',
      label: 'Management',
      icon: Settings,
      path: '/cto/management',
      children: [
        { id: 'team', label: 'Team & Resources', icon: Users, path: '/cto/team' },
        { id: 'roadmap', label: 'Technology Roadmap', icon: Rocket, path: '/cto/roadmap' },
        { id: 'costs', label: 'Tech Cost Management', icon: BarChart3, path: '/cto/costs' },
      ],
    },
    {
      id: 'business',
      label: 'Business',
      icon: Mail,
      path: '/cto/business',
      children: [
        { id: 'communications', label: 'Communications', icon: Mail, path: '/cto/communications' },
        { id: 'word', label: 'Documents', icon: FileText, path: '/cto/documents' },
      ],
    },
    {
      id: 'help',
      label: 'Help',
      icon: IconInfoCircle,
      path: '/cto/manual',
    },
  ], []);

  const renderContent = () => {
    switch (activeSection) {
      case 'training':
        return <CtoTrainingRouter />;
      case 'onboarding':
        return <CTOOnboardingGovernance />;
      case 'evaluation':
        return <CtoEvaluationGatePanel />;
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
      <Suspense fallback={
        <Center style={{ height: '100vh' }}>
          <Loader size="lg" />
        </Center>
      }>
        <CodeEditorPortal 
          standalone={true}
          onBack={() => setActiveSection('overview')}
        />
      </Suspense>
    );
  }

  return (
    <PortalLayout
      portalName="Technology Executive Dashboard"
      sidebarItems={sidebarItems}
      user={{
        id: user?.id || '',
        name: execUser?.first_name && execUser?.last_name 
          ? `${execUser.first_name} ${execUser.last_name}`
          : user?.email?.split('@')[0] || 'User',
        email: user?.email || '',
        role: execUser?.title || 'CTO',
      }}
      activeSection={activeSection}
      onSectionChange={(section) => {
        const item = sidebarItems
          .flatMap(parent => parent.children ? [parent, ...parent.children] : [parent])
          .find(item => item.id === section);
        if (item?.path) {
          navigate(item.path);
        }
      }}
    >
      <div style={{ maxWidth: '100%', margin: '0 auto' }}>
        {activeSection === 'overview' && (
          <>
            <PageHeader
              title="Technology Executive Dashboard"
              subtitle={`Welcome back, ${execUser?.first_name || user?.email?.split('@')[0] || 'User'}!`}
              icon={IconRocket}
            />
            <Card shadow="sm" padding="lg" radius="md" withBorder mb="md">
              <Alert icon={<IconInfoCircle size={16} />} title="Quick Stats" color="blue" variant="light" mb="md">
                <Text size="sm">Last updated: {lastUpdated.toLocaleString()}</Text>
              </Alert>
            </Card>
          </>
        )}

        <Suspense fallback={
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Center py="xl">
              <Loader size="lg" />
            </Center>
          </Card>
        }>
          {shouldWrapContent ? (
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ overflow: 'hidden' }}>
              {content}
            </Card>
          ) : (
            content
          )}
        </Suspense>
      </div>
    </PortalLayout>
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
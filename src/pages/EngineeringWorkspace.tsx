import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PortalLayout, PageHeader, KanbanBoard, DetailDrawer, FilterBar, StatusBadge, EmptyState, ErrorState, SkeletonLoader, DataTable, ColumnDef } from '@/components/tpi';
import { SidebarItem, User, KanbanColumn, KanbanCard } from '@/components/tpi';
import { Button, Group, Stack, Card, Text, Badge } from '@mantine/core';
import { IconPlus, IconCode, IconGitBranch, IconUsers, IconClock, IconCheck } from '@tabler/icons-react';
import { useExecAuth } from '@/hooks/useExecAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useEmbeddedToast';
import { EmbeddedToastProvider } from '@/components/cfo/EmbeddedToast';

const kanbanColumns: KanbanColumn[] = [
  { id: 'todo', title: 'To Do', status: 'todo', color: '#e5e7eb' },
  { id: 'in-progress', title: 'In Progress', status: 'in-progress', color: '#3b82f6' },
  { id: 'review', title: 'In Review', status: 'review', color: '#f59e0b' },
  { id: 'testing', title: 'Testing', status: 'testing', color: '#8b5cf6' },
  { id: 'done', title: 'Done', status: 'done', color: '#10b981' },
];

function EngineeringWorkspaceContent() {
  const { loading: authLoading, user, execUser, isAuthorized, signOut } = useExecAuth('cto');
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  
  // Determine active section from URL
  const getActiveSection = () => {
    const path = location.pathname;
    if (path.includes('/code-reviews')) return 'code-reviews';
    if (path.includes('/team')) return 'team';
    return 'sprints';
  };
  const [activeSection, setActiveSection] = useState<string>(getActiveSection());
  
  useEffect(() => {
    setActiveSection(getActiveSection());
  }, [location.pathname]);
  const [sprints, setSprints] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [codeReviews, setCodeReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const handleBackToHub = useCallback(() => {
    navigate('/hub');
  }, [navigate]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      navigate('/auth?hq=true');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [signOut, navigate]);

  // Fetch sprints
  const fetchSprints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('cto_sprints')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      setSprints(data || []);
    } catch (err: any) {
      console.error('Error fetching sprints:', err);
      setError(err.message || 'Failed to load sprints');
      toast.error('Failed to load sprints', 'Error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch sprint tickets
  const fetchTickets = useCallback(async (sprintId?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('cto_sprint_tickets')
        .select('*, cto_developers(full_name, email), cto_sprints(sprint_name)');
      
      if (sprintId) {
        query = query.eq('sprint_id', sprintId);
      }
      
      const { data, error: fetchError } = await query.order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      
      // Transform tickets to KanbanCard format
      const kanbanCards: KanbanCard[] = (data || []).map((ticket: any) => ({
        id: ticket.id,
        title: ticket.title,
        description: ticket.description || '',
        status: ticket.status || 'todo',
        priority: ticket.priority || 'normal',
        assignee: ticket.cto_developers ? {
          id: ticket.assigned_to || '',
          name: ticket.cto_developers.full_name || ticket.cto_developers.email || 'Unassigned',
        } : undefined,
        metadata: ticket,
      }));
      
      setTickets(kanbanCards);
    } catch (err: any) {
      console.error('Error fetching tickets:', err);
      setError(err.message || 'Failed to load tickets');
      toast.error('Failed to load tickets', 'Error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch code reviews
  const fetchCodeReviews = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('cto_code_reviews')
        .select('*, cto_developers!author_id(full_name, email), cto_developers!reviewer_id(full_name, email)')
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      setCodeReviews(data || []);
    } catch (err: any) {
      console.error('Error fetching code reviews:', err);
      setError(err.message || 'Failed to load code reviews');
      toast.error('Failed to load code reviews', 'Error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Handle card move (update ticket status)
  const handleCardMove = useCallback(async (cardId: string, newStatus: string) => {
    try {
      const { error: updateError } = await supabase
        .from('cto_sprint_tickets')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', cardId);
      
      if (updateError) throw updateError;
      
      toast.success('Ticket status updated', 'Success');
      fetchTickets();
    } catch (err: any) {
      console.error('Error updating ticket:', err);
      toast.error('Failed to update ticket', 'Error');
    }
  }, [fetchTickets, toast]);

  useEffect(() => {
    if (isAuthorized) {
      fetchSprints();
      fetchTickets();
      if (activeSection === 'code-reviews') {
        fetchCodeReviews();
      }
    }
  }, [isAuthorized, activeSection, fetchSprints, fetchTickets, fetchCodeReviews]);

  const sidebarItems: SidebarItem[] = [
    {
      id: 'sprints',
      label: 'Sprint Management',
      icon: IconClock,
      path: '/engineering-workspace/sprints',
    },
    {
      id: 'code-reviews',
      label: 'Code Reviews',
      icon: IconCode,
      path: '/engineering-workspace/code-reviews',
    },
    {
      id: 'team',
      label: 'Team Collaboration',
      icon: IconUsers,
      path: '/engineering-workspace/team',
    },
  ];

  const userInfo: User = {
    id: user?.id || '',
    email: user?.email || '',
    name: execUser?.title || 'Engineer',
    role: 'Engineering',
    initials: execUser?.title?.split(' ').map(n => n[0]).join('') || 'EN',
  };

  const codeReviewColumns: ColumnDef<any>[] = [
    {
      id: 'pr_number',
      header: 'PR #',
      accessor: (row) => row.pr_number,
      sortable: true,
    },
    {
      id: 'pr_title',
      header: 'Title',
      accessor: (row) => row.pr_title,
      sortable: true,
    },
    {
      id: 'repository',
      header: 'Repository',
      accessor: (row) => row.repository,
      sortable: true,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (row) => row.status,
      sortable: true,
      render: (value) => (
        <StatusBadge
          status={value === 'approved' || value === 'merged' ? 'success' : value === 'changes_requested' ? 'warning' : 'neutral'}
          label={value.replace('_', ' ')}
          size="sm"
        />
      ),
    },
  ];

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  const renderContent = () => {
    if (error) {
      return <ErrorState message={error} retry={{ label: 'Retry', onRetry: () => { fetchSprints(); fetchTickets(); } }} />;
    }

    switch (activeSection) {
      case 'sprints':
        const activeSprint = sprints.find(s => s.status === 'active');
        return (
          <Stack gap="md">
            <Group justify="space-between">
              <Text size="lg" fw={600}>
                {activeSprint ? `Active Sprint: ${activeSprint.sprint_name}` : 'Sprint Management'}
              </Text>
              <Button leftSection={<IconPlus size={16} />} onClick={() => console.log('New sprint')}>
                New Sprint
              </Button>
            </Group>
            {loading ? (
              <SkeletonLoader variant="card" count={3} />
            ) : tickets.length === 0 ? (
              <EmptyState
                title="No tickets found"
                description="Create a sprint and add tickets to get started"
              />
            ) : (
              <KanbanBoard
                columns={kanbanColumns}
                cards={tickets}
                loading={loading}
                onCardClick={(card) => setSelectedTask(card.id)}
                onCardMove={handleCardMove}
                onAddCard={(columnId) => {
                  console.log('Add card to', columnId);
                  // TODO: Open create ticket modal
                }}
              />
            )}
          </Stack>
        );
      case 'code-reviews':
        return (
          <Stack gap="md">
            <PageHeader
              title="Code Reviews"
              description="Review and approve code changes"
              actions={<Button leftSection={<IconPlus size={16} />}>New Review</Button>}
            />
            {loading ? (
              <SkeletonLoader variant="table" count={5} />
            ) : codeReviews.length === 0 ? (
              <EmptyState
                title="No pending reviews"
                description="All code reviews have been completed"
                icon={IconCheck}
              />
            ) : (
              <DataTable
                data={codeReviews}
                columns={codeReviewColumns}
                onRowClick={(row) => setSelectedTask(row.id)}
              />
            )}
          </Stack>
        );
      case 'team':
        return (
          <Stack gap="md">
            <PageHeader
              title="Team Collaboration"
              description="View team members and their current work"
            />
            <EmptyState
              title="Team view coming soon"
              description="Team collaboration features are under development"
            />
          </Stack>
        );
      default:
        return <EmptyState title="Select a section" description="Choose a section from the sidebar" />;
    }
  };

  if (authLoading) {
    return <SkeletonLoader variant="card" count={5} />;
  }

  if (!isAuthorized) {
    return <ErrorState message="You do not have access to the Engineering Workspace" />;
  }

  return (
    <PortalLayout
      portalName="Engineering Workspace"
      sidebarItems={sidebarItems}
      user={userInfo}
      onUserMenuClick={(action) => {
        if (action === 'logout') handleSignOut();
      }}
      onSearch={(query) => {
        console.log('Search:', query);
      }}
    >
      <PageHeader
        title="Engineering Workspace"
        description="Sprint management, code reviews, and team collaboration"
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => console.log('New item')}>
            New Item
          </Button>
        }
      />
      {renderContent()}
      <DetailDrawer
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        title="Task Details"
        entityId={selectedTask || undefined}
      >
        <Stack gap="md">
          <Text>Task details will be displayed here</Text>
        </Stack>
      </DetailDrawer>
    </PortalLayout>
  );
}

export default function EngineeringWorkspace() {
  return (
    <EmbeddedToastProvider>
      <EngineeringWorkspaceContent />
    </EmbeddedToastProvider>
  );
}


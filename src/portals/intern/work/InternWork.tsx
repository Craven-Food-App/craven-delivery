import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useResponsive } from '../hooks/useResponsive';
import {
  Briefcase,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  MessageSquare,
  Activity,
  Filter,
  Search,
  MoreVertical,
  Calendar,
  Tag,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Folder,
  Play,
  Pause,
  RotateCcw,
  Send,
  X,
  GripVertical,
  Sparkles,
} from 'lucide-react';

// Types
interface Task {
  id: string;
  title: string;
  description: string | null;
  category: 'development' | 'training' | 'project' | 'research' | 'documentation' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked';
  due_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface Deliverable {
  id: string;
  task_id: string | null;
  title: string;
  description: string | null;
  deliverable_type: 'document' | 'code' | 'presentation' | 'report' | 'design' | 'other';
  status: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'revision_requested';
  submission_url: string | null;
  reviewer_notes: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
}

interface ActivityLog {
  id: string;
  activity_type: string;
  entity_type: string | null;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
}

type TabType = 'board' | 'list' | 'deliverables' | 'activity';
type StatusColumn = 'backlog' | 'todo' | 'in_progress' | 'review' | 'completed';

const statusColumns: { key: StatusColumn; label: string; color: string; bgColor: string }[] = [
  { key: 'backlog', label: 'Backlog', color: '#6b7280', bgColor: '#f3f4f6' },
  { key: 'todo', label: 'To Do', color: '#3b82f6', bgColor: '#eff6ff' },
  { key: 'in_progress', label: 'In Progress', color: '#f59e0b', bgColor: '#fef3c7' },
  { key: 'review', label: 'In Review', color: '#8b5cf6', bgColor: '#f5f3ff' },
  { key: 'completed', label: 'Completed', color: '#10b981', bgColor: '#ecfdf5' },
];

const priorityConfig = {
  low: { color: '#6b7280', bgColor: '#f3f4f6', label: 'Low' },
  medium: { color: '#3b82f6', bgColor: '#eff6ff', label: 'Medium' },
  high: { color: '#f59e0b', bgColor: '#fef3c7', label: 'High' },
  urgent: { color: '#ef4444', bgColor: '#fef2f2', label: 'Urgent' },
};

const categoryConfig = {
  development: { color: '#8b5cf6', icon: '💻' },
  training: { color: '#10b981', icon: '📚' },
  project: { color: '#3b82f6', icon: '🎯' },
  research: { color: '#f59e0b', icon: '🔍' },
  documentation: { color: '#6b7280', icon: '📝' },
  other: { color: '#9ca3af', icon: '📌' },
};

const deliverableStatusConfig = {
  draft: { color: '#6b7280', bgColor: '#f3f4f6', label: 'Draft' },
  submitted: { color: '#3b82f6', bgColor: '#eff6ff', label: 'Submitted' },
  in_review: { color: '#f59e0b', bgColor: '#fef3c7', label: 'In Review' },
  approved: { color: '#10b981', bgColor: '#ecfdf5', label: 'Approved' },
  rejected: { color: '#ef4444', bgColor: '#fef2f2', label: 'Rejected' },
  revision_requested: { color: '#f97316', bgColor: '#fff7ed', label: 'Revision Requested' },
};

// Mock data for demo
const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Complete API Documentation',
    description: 'Document all REST API endpoints with examples and error codes',
    category: 'documentation',
    priority: 'high',
    status: 'in_progress',
    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    estimated_hours: 8,
    actual_hours: 4,
    tags: ['api', 'docs'],
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Fix Dashboard Loading Bug',
    description: 'Investigate and resolve the slow loading issue on the main dashboard',
    category: 'development',
    priority: 'urgent',
    status: 'todo',
    due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    estimated_hours: 4,
    actual_hours: null,
    tags: ['bug', 'performance'],
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Complete React Fundamentals Module',
    description: 'Finish the advanced React patterns training module',
    category: 'training',
    priority: 'medium',
    status: 'review',
    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    estimated_hours: 6,
    actual_hours: 5,
    tags: ['react', 'learning'],
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    title: 'Research Payment Gateway Options',
    description: 'Compare Stripe, Square, and PayPal for mobile integration',
    category: 'research',
    priority: 'low',
    status: 'backlog',
    due_date: null,
    estimated_hours: 3,
    actual_hours: null,
    tags: ['payments', 'research'],
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '5',
    title: 'Implement User Profile Component',
    description: 'Create reusable user profile card with avatar and stats',
    category: 'development',
    priority: 'medium',
    status: 'completed',
    due_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    estimated_hours: 5,
    actual_hours: 4,
    tags: ['component', 'ui'],
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '6',
    title: 'Write Unit Tests for Auth Module',
    description: 'Add comprehensive test coverage for authentication flows',
    category: 'development',
    priority: 'high',
    status: 'todo',
    due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    estimated_hours: 6,
    actual_hours: null,
    tags: ['testing', 'auth'],
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const mockDeliverables: Deliverable[] = [
  {
    id: '1',
    task_id: '1',
    title: 'API Documentation v1.0',
    description: 'Complete REST API documentation with Swagger specs',
    deliverable_type: 'document',
    status: 'in_review',
    submission_url: 'https://docs.example.com/api',
    reviewer_notes: null,
    submitted_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    approved_at: null,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    task_id: '5',
    title: 'User Profile Component Code',
    description: 'React component with TypeScript and unit tests',
    deliverable_type: 'code',
    status: 'approved',
    submission_url: 'https://github.com/example/pr/123',
    reviewer_notes: 'Great work! Clean code and good test coverage.',
    submitted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    approved_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    task_id: '3',
    title: 'React Training Certificate',
    description: 'Completion certificate for React Fundamentals course',
    deliverable_type: 'document',
    status: 'submitted',
    submission_url: null,
    reviewer_notes: null,
    submitted_at: new Date().toISOString(),
    approved_at: null,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    task_id: null,
    title: 'Weekly Progress Report',
    description: 'Summary of work completed and blockers encountered',
    deliverable_type: 'report',
    status: 'draft',
    submission_url: null,
    reviewer_notes: null,
    submitted_at: null,
    approved_at: null,
    created_at: new Date().toISOString(),
  },
];

const mockActivityLogs: ActivityLog[] = [
  {
    id: '1',
    activity_type: 'task_completed',
    entity_type: 'task',
    description: 'Completed task: Implement User Profile Component',
    metadata: { title: 'Implement User Profile Component' },
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    activity_type: 'deliverable_approved',
    entity_type: 'deliverable',
    description: 'Deliverable approved: User Profile Component Code',
    metadata: { title: 'User Profile Component Code', reviewer_notes: 'Great work!' },
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    activity_type: 'task_started',
    entity_type: 'task',
    description: 'Started working on: Complete API Documentation',
    metadata: { title: 'Complete API Documentation' },
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    activity_type: 'deliverable_submitted',
    entity_type: 'deliverable',
    description: 'Submitted deliverable: API Documentation v1.0',
    metadata: { title: 'API Documentation v1.0', type: 'document' },
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    activity_type: 'training_completed',
    entity_type: 'training',
    description: 'Completed training module: React Advanced Patterns',
    metadata: { module: 'React Advanced Patterns', score: 92 },
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '6',
    activity_type: 'task_created',
    entity_type: 'task',
    description: 'Created task: Write Unit Tests for Auth Module',
    metadata: { title: 'Write Unit Tests for Auth Module', category: 'development' },
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const InternWork: React.FC = () => {
  const { isMobile, isTablet } = useResponsive();
  const [activeTab, setActiveTab] = useState<TabType>('board');
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [deliverables] = useState<Deliverable[]>(mockDeliverables);
  const [activityLogs] = useState<ActivityLog[]>(mockActivityLogs);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      const matchesCategory = filterCategory === 'all' || task.category === filterCategory;
      return matchesSearch && matchesPriority && matchesCategory;
    });
  }, [tasks, searchQuery, filterPriority, filterCategory]);

  // Group tasks by status for board view
  const tasksByStatus = useMemo(() => {
    const grouped: Record<StatusColumn, Task[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      review: [],
      completed: [],
    };
    filteredTasks.forEach((task) => {
      if (task.status === 'blocked') {
        grouped.todo.push(task);
      } else if (task.status in grouped) {
        grouped[task.status as StatusColumn].push(task);
      }
    });
    return grouped;
  }, [filteredTasks]);

  // Stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const overdue = tasks.filter(
      (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
    ).length;
    return { total, completed, inProgress, overdue };
  }, [tasks]);

  const handleStatusChange = (taskId: string, newStatus: Task['status']) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null }
          : t
      )
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return { text: `${Math.abs(days)}d overdue`, color: '#ef4444' };
    if (days === 0) return { text: 'Due today', color: '#f59e0b' };
    if (days === 1) return { text: 'Due tomorrow', color: '#f59e0b' };
    if (days <= 7) return { text: `${days}d left`, color: '#3b82f6' };
    return { text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: '#6b7280' };
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task_completed':
        return <CheckCircle2 size={16} style={{ color: '#10b981' }} />;
      case 'task_started':
        return <Play size={16} style={{ color: '#3b82f6' }} />;
      case 'task_created':
        return <Plus size={16} style={{ color: '#8b5cf6' }} />;
      case 'deliverable_submitted':
        return <Send size={16} style={{ color: '#3b82f6' }} />;
      case 'deliverable_approved':
        return <CheckCircle2 size={16} style={{ color: '#10b981' }} />;
      case 'deliverable_rejected':
        return <AlertCircle size={16} style={{ color: '#ef4444' }} />;
      case 'training_completed':
        return <Sparkles size={16} style={{ color: '#f59e0b' }} />;
      default:
        return <Activity size={16} style={{ color: '#6b7280' }} />;
    }
  };

  // Task Card Component
  const TaskCard: React.FC<{ task: Task; compact?: boolean }> = ({ task, compact = false }) => {
    const dueInfo = formatDate(task.due_date);
    const cat = categoryConfig[task.category];
    const pri = priorityConfig[task.priority];

    return (
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '10px',
          padding: compact ? '12px' : '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onClick={() => setSelectedTask(task)}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.borderColor = '#d1d5db';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.borderColor = '#e5e7eb';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <span style={{ fontSize: '16px' }}>{cat.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <h4
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#111827',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}
              >
                {task.title}
              </h4>
            </div>
            {!compact && task.description && (
              <p
                style={{
                  fontSize: '13px',
                  color: '#6b7280',
                  margin: '0 0 10px 0',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: 1.4,
                }}
              >
                {task.description}
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: pri.bgColor,
                  color: pri.color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                }}
              >
                {pri.label}
              </span>
              {dueInfo && (
                <span
                  style={{
                    fontSize: '12px',
                    color: dueInfo.color,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Clock size={12} />
                  {dueInfo.text}
                </span>
              )}
            </div>
            {!compact && task.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '4px', marginTop: '10px', flexWrap: 'wrap' }}>
                {task.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: '#f3f4f6',
                      color: '#6b7280',
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Board View
  const BoardView = () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
        gap: isMobile ? '12px' : '16px',
        overflowX: isMobile ? 'hidden' : 'auto',
        paddingBottom: '16px',
      }}
    >
      {statusColumns.map((col) => (
        <div
          key={col.key}
          style={{
            backgroundColor: '#fafafa',
            borderRadius: isMobile ? '10px' : '12px',
            padding: isMobile ? '12px' : '16px',
            minWidth: isMobile ? 'auto' : '260px',
            minHeight: isMobile ? 'auto' : '400px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: col.color,
              }}
            />
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', margin: 0 }}>
              {col.label}
            </h3>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#6b7280',
                backgroundColor: '#e5e7eb',
                padding: '2px 8px',
                borderRadius: '10px',
              }}
            >
              {tasksByStatus[col.key].length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tasksByStatus[col.key].map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
            {tasksByStatus[col.key].length === 0 && (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: '#9ca3af',
                  fontSize: '13px',
                  border: '2px dashed #e5e7eb',
                  borderRadius: '8px',
                }}
              >
                No tasks
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  // List View
  const ListView = () => (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: isMobile ? '10px' : '12px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
      }}
    >
      {!isMobile && (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr 120px',
          gap: '16px',
          padding: '12px 20px',
          backgroundColor: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          fontSize: '12px',
          fontWeight: 600,
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        <span>Task</span>
        <span>Category</span>
        <span>Priority</span>
        <span>Due Date</span>
        <span>Status</span>
      </div>
      )}
      {filteredTasks.map((task) => {
        const dueInfo = formatDate(task.due_date);
        const cat = categoryConfig[task.category];
        const pri = priorityConfig[task.priority];
        const status = statusColumns.find((s) => s.key === task.status) || statusColumns[0];

        return isMobile ? (
          <div
            key={task.id}
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid #f3f4f6',
              cursor: 'pointer',
            }}
            onClick={() => setSelectedTask(task)}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
              <span style={{ fontSize: '16px' }}>{cat.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0, marginBottom: '4px' }}>
                  {task.title}
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: pri.bgColor,
                      color: pri.color,
                      textTransform: 'uppercase',
                    }}
                  >
                    {pri.label}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: status.bgColor,
                      color: status.color,
                    }}
                  >
                    {status.label}
                  </span>
                  {dueInfo && (
                    <span style={{ fontSize: '11px', color: dueInfo.color, fontWeight: 500 }}>
                      {dueInfo.text}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            key={task.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 120px',
              gap: '16px',
              padding: '16px 20px',
              borderBottom: '1px solid #f3f4f6',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.15s',
            }}
            onClick={() => setSelectedTask(task)}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '16px' }}>{cat.icon}</span>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
                  {task.title}
                </p>
                {task.description && (
                  <p
                    style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      margin: '2px 0 0 0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '300px',
                    }}
                  >
                    {task.description}
                  </p>
                )}
              </div>
            </div>
            <span
              style={{
                fontSize: '13px',
                color: cat.color,
                fontWeight: 500,
                textTransform: 'capitalize',
              }}
            >
              {task.category}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '4px',
                backgroundColor: pri.bgColor,
                color: pri.color,
                textTransform: 'uppercase',
                display: 'inline-block',
                width: 'fit-content',
              }}
            >
              {pri.label}
            </span>
            <span style={{ fontSize: '13px', color: dueInfo?.color || '#6b7280' }}>
              {dueInfo?.text || '—'}
            </span>
            <select
              value={task.status}
              onChange={(e) => {
                e.stopPropagation();
                handleStatusChange(task.id, e.target.value as Task['status']);
              }}
              onClick={(e) => e.stopPropagation()}
              style={{
                fontSize: '12px',
                fontWeight: 500,
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                backgroundColor: status.bgColor,
                color: status.color,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {statusColumns.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        );
      })}
      {filteredTasks.length === 0 && (
        <div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af' }}>
          <Briefcase size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <p style={{ fontSize: '16px', fontWeight: 500 }}>No tasks found</p>
          <p style={{ fontSize: '14px' }}>Try adjusting your filters or create a new task</p>
        </div>
      )}
    </div>
  );

  // Deliverables View
  const DeliverablesView = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {deliverables.map((del) => {
        const statusInfo = deliverableStatusConfig[del.status];
        const relatedTask = tasks.find((t) => t.id === del.task_id);

        return (
          <div
            key={del.id}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #e5e7eb',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = '#e5e7eb';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <FileText size={20} style={{ color: '#6b7280' }} />
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>
                    {del.title}
                  </h3>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: '4px',
                      backgroundColor: statusInfo.bgColor,
                      color: statusInfo.color,
                    }}
                  >
                    {statusInfo.label}
                  </span>
                </div>
                {del.description && (
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 12px 32px' }}>
                    {del.description}
                  </p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: '32px' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Folder size={14} />
                    {del.deliverable_type}
                  </span>
                  {relatedTask && (
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Briefcase size={14} />
                      {relatedTask.title}
                    </span>
                  )}
                  {del.submitted_at && (
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      Submitted {formatRelativeTime(del.submitted_at)}
                    </span>
                  )}
                </div>
                {del.reviewer_notes && (
                  <div
                    style={{
                      marginTop: '12px',
                      marginLeft: '32px',
                      padding: '12px',
                      backgroundColor: del.status === 'approved' ? '#ecfdf5' : '#fef3c7',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: del.status === 'approved' ? '#065f46' : '#92400e',
                    }}
                  >
                    <strong>Reviewer Feedback:</strong> {del.reviewer_notes}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {del.status === 'draft' && (
                  <button
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Send size={14} />
                    Submit
                  </button>
                )}
                {del.submission_url && (
                  <button
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      backgroundColor: 'white',
                      color: '#374151',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    <ArrowRight size={14} />
                    View
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {deliverables.length === 0 && (
        <div
          style={{
            padding: '64px',
            textAlign: 'center',
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
          }}
        >
          <FileText size={48} style={{ color: '#d1d5db', marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', fontWeight: 500, color: '#6b7280' }}>No deliverables yet</p>
          <p style={{ fontSize: '14px', color: '#9ca3af' }}>
            Create your first deliverable to track your work submissions
          </p>
        </div>
      )}
    </div>
  );

  // Activity View
  const ActivityView = () => (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>
          Recent Activity
        </h3>
        <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
          Your work history and milestones
        </p>
      </div>
      <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
        {activityLogs.map((log, idx) => (
          <div
            key={log.id}
            style={{
              display: 'flex',
              gap: '16px',
              padding: '16px 20px',
              borderBottom: idx < activityLogs.length - 1 ? '1px solid #f3f4f6' : 'none',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {getActivityIcon(log.activity_type)}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', color: '#111827', margin: 0 }}>{log.description}</p>
              <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0 0' }}>
                {formatRelativeTime(log.created_at)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Task Detail Modal
  const TaskDetailModal = () => {
    if (!selectedTask) return null;
    const cat = categoryConfig[selectedTask.category];
    const pri = priorityConfig[selectedTask.priority];
    const status = statusColumns.find((s) => s.key === selectedTask.status) || statusColumns[0];
    const dueInfo = formatDate(selectedTask.due_date);

    return (
      <>
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 50,
          }}
          onClick={() => setSelectedTask(null)}
        />
        <div
          style={{
            position: 'fixed',
            top: isMobile ? 0 : '50%',
            left: isMobile ? 0 : '50%',
            right: isMobile ? 0 : 'auto',
            bottom: isMobile ? 0 : 'auto',
            transform: isMobile ? 'none' : 'translate(-50%, -50%)',
            backgroundColor: 'white',
            borderRadius: isMobile ? 0 : '16px',
            width: isMobile ? '100%' : '90%',
            maxWidth: isMobile ? 'none' : '640px',
            maxHeight: isMobile ? '100%' : '90vh',
            overflow: 'auto',
            zIndex: 51,
            boxShadow: isMobile ? 'none' : '0 25px 50px rgba(0,0,0,0.25)',
          }}
        >
          <div
            style={{
              padding: isMobile ? '16px' : '24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '12px', flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: isMobile ? '20px' : '24px', flexShrink: 0 }}>{cat.icon}</span>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: isMobile ? '17px' : '20px', fontWeight: 700, color: '#111827', margin: 0 }}>
                  {selectedTask.title}
                </h2>
                <p style={{ fontSize: isMobile ? '12px' : '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
                  Created {formatRelativeTime(selectedTask.created_at)}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedTask(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '8px',
                color: '#6b7280',
              }}
            >
              <X size={20} />
            </button>
          </div>
          <div style={{ padding: isMobile ? '16px' : '24px' }}>
            <div style={{ display: 'flex', gap: isMobile ? '8px' : '12px', marginBottom: isMobile ? '16px' : '24px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: pri.bgColor,
                  color: pri.color,
                  textTransform: 'uppercase',
                }}
              >
                {pri.label} Priority
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: status.bgColor,
                  color: status.color,
                }}
              >
                {status.label}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#f3f4f6',
                  color: cat.color,
                  textTransform: 'capitalize',
                }}
              >
                {selectedTask.category}
              </span>
            </div>

            {selectedTask.description && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                  Description
                </h4>
                <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.6 }}>
                  {selectedTask.description}
                </p>
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                gap: isMobile ? '12px' : '16px',
                marginBottom: isMobile ? '16px' : '24px',
              }}
            >
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Calendar size={16} style={{ color: '#6b7280' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Due Date</span>
                </div>
                <p
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: dueInfo?.color || '#111827',
                    margin: 0,
                  }}
                >
                  {dueInfo?.text ||
                    (selectedTask.due_date
                      ? new Date(selectedTask.due_date).toLocaleDateString()
                      : 'No due date')}
                </p>
              </div>
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Clock size={16} style={{ color: '#6b7280' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Time Tracking</span>
                </div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
                  {selectedTask.actual_hours || 0}h / {selectedTask.estimated_hours || 0}h
                </p>
              </div>
            </div>

            {selectedTask.tags.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                  Tags
                </h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {selectedTask.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: '12px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#f3f4f6',
                        color: '#6b7280',
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '10px' : '12px' }}>
              <select
                value={selectedTask.status}
                onChange={(e) => {
                  handleStatusChange(selectedTask.id, e.target.value as Task['status']);
                  setSelectedTask({ ...selectedTask, status: e.target.value as Task['status'] });
                }}
                style={{
                  flex: 1,
                  padding: isMobile ? '10px 14px' : '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {statusColumns.map((s) => (
                  <option key={s.key} value={s.key}>
                    Move to: {s.label}
                  </option>
                ))}
              </select>
              <button
                style={{
                  padding: isMobile ? '10px 20px' : '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#ff5f1f',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Log Time
              </button>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: isMobile ? '16px' : '24px' }}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', marginBottom: '8px', gap: isMobile ? '12px' : '0' }}>
          <div>
            <h1 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 800, color: '#111827', margin: 0 }}>
              Work & Execution
            </h1>
            <p style={{ fontSize: isMobile ? '13px' : '15px', color: '#6b7280', margin: '4px 0 0 0' }}>
              Manage your tasks, track deliverables, and monitor your progress
            </p>
          </div>
          <button
            onClick={() => setShowNewTaskModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: isMobile ? '10px 16px' : '12px 20px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#ff5f1f',
              color: 'white',
              fontSize: isMobile ? '13px' : '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(255, 95, 31, 0.3)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!isMobile) {
              e.currentTarget.style.backgroundColor = '#e5541b';
              e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ff5f1f';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Plus size={18} />
            New Task
          </button>
        </div>

        {/* Stats Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: isMobile ? '10px' : '16px',
            marginTop: isMobile ? '16px' : '20px',
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: isMobile ? '10px' : '12px',
              padding: isMobile ? '12px' : '20px',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '12px' }}>
              <div
                style={{
                  width: isMobile ? '36px' : '44px',
                  height: isMobile ? '36px' : '44px',
                  borderRadius: isMobile ? '8px' : '10px',
                  backgroundColor: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Briefcase size={isMobile ? 18 : 22} style={{ color: '#3b82f6' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: isMobile ? '11px' : '12px', color: '#6b7280', margin: 0, fontWeight: 500 }}>Total Tasks</p>
                <p style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 700, color: '#111827', margin: 0 }}>{stats.total}</p>
              </div>
            </div>
          </div>
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: isMobile ? '10px' : '12px',
              padding: isMobile ? '12px' : '20px',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '12px' }}>
              <div
                style={{
                  width: isMobile ? '36px' : '44px',
                  height: isMobile ? '36px' : '44px',
                  borderRadius: isMobile ? '8px' : '10px',
                  backgroundColor: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Play size={isMobile ? 18 : 22} style={{ color: '#f59e0b' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: isMobile ? '11px' : '12px', color: '#6b7280', margin: 0, fontWeight: 500 }}>In Progress</p>
                <p style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 700, color: '#111827', margin: 0 }}>{stats.inProgress}</p>
              </div>
            </div>
          </div>
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: isMobile ? '10px' : '12px',
              padding: isMobile ? '12px' : '20px',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '12px' }}>
              <div
                style={{
                  width: isMobile ? '36px' : '44px',
                  height: isMobile ? '36px' : '44px',
                  borderRadius: isMobile ? '8px' : '10px',
                  backgroundColor: '#ecfdf5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CheckCircle2 size={isMobile ? 18 : 22} style={{ color: '#10b981' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: isMobile ? '11px' : '12px', color: '#6b7280', margin: 0, fontWeight: 500 }}>Completed</p>
                <p style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 700, color: '#111827', margin: 0 }}>{stats.completed}</p>
              </div>
            </div>
          </div>
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: isMobile ? '10px' : '12px',
              padding: isMobile ? '12px' : '20px',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '12px' }}>
              <div
                style={{
                  width: isMobile ? '36px' : '44px',
                  height: isMobile ? '36px' : '44px',
                  borderRadius: isMobile ? '8px' : '10px',
                  backgroundColor: stats.overdue > 0 ? '#fef2f2' : '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertCircle size={isMobile ? 18 : 22} style={{ color: stats.overdue > 0 ? '#ef4444' : '#6b7280' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: isMobile ? '11px' : '12px', color: '#6b7280', margin: 0, fontWeight: 500 }}>Overdue</p>
                <p
                  style={{
                    fontSize: isMobile ? '20px' : '24px',
                    fontWeight: 700,
                    color: stats.overdue > 0 ? '#ef4444' : '#111827',
                    margin: 0,
                  }}
                >
                  {stats.overdue}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          marginBottom: isMobile ? '16px' : '20px',
          flexWrap: 'wrap',
          gap: isMobile ? '12px' : '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '4px',
            backgroundColor: '#f3f4f6',
            padding: '4px',
            borderRadius: '10px',
            overflowX: isMobile ? 'auto' : 'visible',
          }}
        >
          {[
            { key: 'board' as TabType, label: isMobile ? '' : 'Board', icon: <GripVertical size={16} /> },
            { key: 'list' as TabType, label: isMobile ? '' : 'List', icon: <Briefcase size={16} /> },
            { key: 'deliverables' as TabType, label: isMobile ? '' : 'Deliverables', icon: <FileText size={16} /> },
            { key: 'activity' as TabType, label: isMobile ? '' : 'Activity', icon: <Activity size={16} /> },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: isMobile ? '10px 14px' : '10px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === tab.key ? 'white' : 'transparent',
                color: activeTab === tab.key ? '#111827' : '#6b7280',
                fontSize: '14px',
                fontWeight: activeTab === tab.key ? 600 : 500,
                cursor: 'pointer',
                boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
                flexShrink: 0,
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {(activeTab === 'board' || activeTab === 'list') && (
          <div style={{ display: 'flex', gap: isMobile ? '8px' : '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: isMobile ? 1 : 'none' }}>
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af',
                }}
              />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: isMobile ? '10px 12px 10px 36px' : '10px 12px 10px 40px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontSize: '14px',
                  width: isMobile ? '100%' : '240px',
                  outline: 'none',
                }}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: isMobile ? '10px 12px' : '10px 16px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                backgroundColor: showFilters ? '#f3f4f6' : 'white',
                color: '#374151',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <Filter size={16} />
              {!isMobile && 'Filters'}
              {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (activeTab === 'board' || activeTab === 'list') && (
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: isMobile ? '10px' : '12px',
            padding: isMobile ? '12px 14px' : '16px 20px',
            marginBottom: isMobile ? '16px' : '20px',
            border: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '16px',
            alignItems: isMobile ? 'stretch' : 'center',
          }}
        >
          <div>
            <label
              style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '6px' }}
            >
              Priority
            </label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                fontSize: '13px',
                minWidth: '120px',
                outline: 'none',
              }}
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label
              style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '6px' }}
            >
              Category
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                fontSize: '13px',
                minWidth: '140px',
                outline: 'none',
              }}
            >
              <option value="all">All Categories</option>
              <option value="development">Development</option>
              <option value="training">Training</option>
              <option value="project">Project</option>
              <option value="research">Research</option>
              <option value="documentation">Documentation</option>
              <option value="other">Other</option>
            </select>
          </div>
          {(filterPriority !== 'all' || filterCategory !== 'all') && (
            <button
              onClick={() => {
                setFilterPriority('all');
                setFilterCategory('all');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                marginTop: '18px',
              }}
            >
              <RotateCcw size={14} />
              Clear
            </button>
          )}
        </div>
      )}

      {/* Main Content */}
      {activeTab === 'board' && <BoardView />}
      {activeTab === 'list' && <ListView />}
      {activeTab === 'deliverables' && <DeliverablesView />}
      {activeTab === 'activity' && <ActivityView />}

      {/* Task Detail Modal */}
      {selectedTask && <TaskDetailModal />}
    </div>
  );
};

export default InternWork;

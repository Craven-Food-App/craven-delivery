import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Award,
  PlayCircle,
  Lock,
  TrendingUp,
  FileText,
  Video,
  ClipboardCheck,
  Download,
  Calendar,
  Target,
  Star,
} from 'lucide-react';

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  duration: string;
  type: 'video' | 'document' | 'quiz' | 'interactive';
  status: 'completed' | 'in-progress' | 'locked' | 'available';
  progress: number;
  score?: number;
  dueDate?: string;
  completedDate?: string;
  category: string;
}

const InternTraining: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [overallProgress, setOverallProgress] = useState(62);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const modules: TrainingModule[] = [
    {
      id: '1',
      title: 'Welcome to Crave\'N Delivery',
      description: 'Introduction to company culture, values, and team structure',
      duration: '45 min',
      type: 'video',
      status: 'completed',
      progress: 100,
      score: 95,
      category: 'Onboarding',
      completedDate: '2 weeks ago',
    },
    {
      id: '2',
      title: 'Safety & Compliance Fundamentals',
      description: 'Essential safety protocols and regulatory compliance',
      duration: '60 min',
      type: 'interactive',
      status: 'completed',
      progress: 100,
      score: 88,
      category: 'Compliance',
      completedDate: '1 week ago',
    },
    {
      id: '3',
      title: 'Delivery Operations 101',
      description: 'Core delivery processes, routing, and customer service',
      duration: '90 min',
      type: 'video',
      status: 'completed',
      progress: 100,
      score: 92,
      category: 'Operations',
      completedDate: '5 days ago',
    },
    {
      id: '4',
      title: 'Customer Service Excellence',
      description: 'Communication skills and handling difficult situations',
      duration: '75 min',
      type: 'interactive',
      status: 'completed',
      progress: 100,
      score: 90,
      category: 'Customer Service',
      completedDate: '3 days ago',
    },
    {
      id: '5',
      title: 'Technology Platform Training',
      description: 'Master the delivery app, POS system, and internal tools',
      duration: '120 min',
      type: 'interactive',
      status: 'in-progress',
      progress: 65,
      category: 'Technology',
      dueDate: 'Due in 2 days',
    },
    {
      id: '6',
      title: 'Advanced Routing & Optimization',
      description: 'Maximize efficiency with advanced route planning strategies',
      duration: '60 min',
      type: 'document',
      status: 'in-progress',
      progress: 30,
      category: 'Operations',
      dueDate: 'Due in 4 days',
    },
    {
      id: '7',
      title: 'Quality Assurance Standards',
      description: 'Ensuring food quality and proper handling procedures',
      duration: '45 min',
      type: 'video',
      status: 'available',
      progress: 0,
      category: 'Quality',
      dueDate: 'Due in 1 week',
    },
    {
      id: '8',
      title: 'Team Leadership Basics',
      description: 'Foundational skills for team coordination and leadership',
      duration: '90 min',
      type: 'interactive',
      status: 'locked',
      progress: 0,
      category: 'Leadership',
      dueDate: 'Unlocks in 2 weeks',
    },
  ];

  const categories = ['all', 'Onboarding', 'Operations', 'Compliance', 'Customer Service', 'Technology', 'Quality', 'Leadership'];

  const filteredModules = selectedCategory === 'all'
    ? modules
    : modules.filter(m => m.category === selectedCategory);

  const completedCount = modules.filter(m => m.status === 'completed').length;
  const totalCount = modules.length;
  const averageScore = modules
    .filter(m => m.score !== undefined)
    .reduce((acc, m) => acc + (m.score || 0), 0) / completedCount || 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return { bg: '#ecfdf5', text: '#10b981', border: '#10b981' };
      case 'in-progress':
        return { bg: '#fef3c7', text: '#f59e0b', border: '#f59e0b' };
      case 'available':
        return { bg: '#eff6ff', text: '#3b82f6', border: '#3b82f6' };
      case 'locked':
        return { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' };
      default:
        return { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video size={18} />;
      case 'document':
        return <FileText size={18} />;
      case 'quiz':
        return <ClipboardCheck size={18} />;
      case 'interactive':
        return <Target size={18} />;
      default:
        return <BookOpen size={18} />;
    }
  };

  const ModuleCard: React.FC<{ module: TrainingModule }> = ({ module }) => {
    const statusColor = getStatusColor(module.status);

    return (
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
          transition: 'all 0.2s',
          opacity: module.status === 'locked' ? 0.6 : 1,
        }}
        onMouseEnter={(e) => {
          if (module.status !== 'locked') {
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              backgroundColor: statusColor.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: statusColor.text,
              flexShrink: 0,
            }}
          >
            {module.status === 'completed' ? (
              <CheckCircle2 size={24} />
            ) : module.status === 'locked' ? (
              <Lock size={24} />
            ) : (
              getTypeIcon(module.type)
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>
                {module.title}
              </h3>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: statusColor.bg,
                  color: statusColor.text,
                  textTransform: 'uppercase',
                }}
              >
                {module.status.replace('-', ' ')}
              </span>
            </div>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
              {module.description}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} style={{ color: '#9ca3af' }} />
                <span style={{ fontSize: '13px', color: '#6b7280' }}>{module.duration}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {getTypeIcon(module.type)}
                <span style={{ fontSize: '13px', color: '#6b7280', textTransform: 'capitalize' }}>
                  {module.type}
                </span>
              </div>
              {module.dueDate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} style={{ color: '#9ca3af' }} />
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>{module.dueDate}</span>
                </div>
              )}
              {module.completedDate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                  <span style={{ fontSize: '13px', color: '#10b981' }}>
                    Completed {module.completedDate}
                  </span>
                </div>
              )}
            </div>
          </div>
          {module.score !== undefined && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: module.score >= 90 ? '#ecfdf5' : '#fef3c7',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '20px', fontWeight: 700, color: module.score >= 90 ? '#10b981' : '#f59e0b' }}>
                {module.score}%
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>Score</div>
            </div>
          )}
        </div>

        {module.progress > 0 && module.progress < 100 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Progress</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: statusColor.text }}>
                {module.progress}%
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: '6px',
                backgroundColor: '#f3f4f6',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${module.progress}%`,
                  height: '100%',
                  backgroundColor: statusColor.text,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>
        )}

        <button
          style={{
            width: '100%',
            padding: '10px 16px',
            backgroundColor: module.status === 'locked' ? '#f3f4f6' : statusColor.text,
            color: module.status === 'locked' ? '#9ca3af' : 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: module.status === 'locked' ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s',
          }}
          disabled={module.status === 'locked'}
          onMouseEnter={(e) => {
            if (module.status !== 'locked') {
              e.currentTarget.style.opacity = '0.9';
              e.currentTarget.style.transform = 'scale(1.02)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {module.status === 'completed' ? (
            <>
              <Award size={18} />
              View Certificate
            </>
          ) : module.status === 'locked' ? (
            <>
              <Lock size={18} />
              Locked
            </>
          ) : (
            <>
              <PlayCircle size={18} />
              {module.status === 'in-progress' ? 'Continue' : 'Start'} Module
            </>
          )}
        </button>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>
          Training & Onboarding
        </h1>
        <p style={{ fontSize: '16px', color: '#6b7280' }}>
          Complete the required modules to unlock full work access and advance your skills.
        </p>
      </div>

      {/* Stats Overview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                backgroundColor: '#fff4ed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ff5f1f',
              }}
            >
              <TrendingUp size={24} />
            </div>
            <div>
              <p style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>
                Overall Progress
              </p>
              <p style={{ fontSize: '28px', fontWeight: 700, color: '#111827', lineHeight: 1 }}>
                {overallProgress}%
              </p>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                {completedCount} of {totalCount} completed
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                backgroundColor: '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
              }}
            >
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>
                Modules Completed
              </p>
              <p style={{ fontSize: '28px', fontWeight: 700, color: '#111827', lineHeight: 1 }}>
                {completedCount}
              </p>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                {totalCount - completedCount} remaining
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                backgroundColor: '#f5f3ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8b5cf6',
              }}
            >
              <Star size={24} />
            </div>
            <div>
              <p style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>
                Average Score
              </p>
              <p style={{ fontSize: '28px', fontWeight: 700, color: '#111827', lineHeight: 1 }}>
                {averageScore.toFixed(0)}%
              </p>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Across all modules</p>
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                backgroundColor: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b',
              }}
            >
              <Clock size={24} />
            </div>
            <div>
              <p style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>
                In Progress
              </p>
              <p style={{ fontSize: '28px', fontWeight: 700, color: '#111827', lineHeight: 1 }}>
                {modules.filter(m => m.status === 'in-progress').length}
              </p>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Active modules</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div style={{ marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            backgroundColor: 'white',
            padding: '16px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb',
          }}
        >
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: selectedCategory === category ? '#ff5f1f' : '#f3f4f6',
                color: selectedCategory === category ? 'white' : '#6b7280',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                textTransform: 'capitalize',
              }}
              onMouseEnter={(e) => {
                if (selectedCategory !== category) {
                  e.currentTarget.style.backgroundColor = '#e5e7eb';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCategory !== category) {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }
              }}
            >
              {category === 'all' ? 'All Modules' : category}
            </button>
          ))}
        </div>
      </div>

      {/* Modules Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))', gap: '20px' }}>
        {filteredModules.map((module) => (
          <ModuleCard key={module.id} module={module} />
        ))}
      </div>

      {/* Help Section */}
      <div
        style={{
          marginTop: '32px',
          backgroundColor: '#eff6ff',
          border: '2px solid #3b82f6',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            backgroundColor: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            flexShrink: 0,
          }}
        >
          <BookOpen size={24} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
            Need Help with Training?
          </h3>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            Contact your training coordinator or visit our help center for technical support and questions.
          </p>
        </div>
        <button
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2563eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#3b82f6';
          }}
        >
          Get Support
        </button>
      </div>
    </div>
  );
};

export default InternTraining;




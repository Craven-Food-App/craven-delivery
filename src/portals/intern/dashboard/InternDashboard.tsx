import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  TrendingUp,
  Target,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Briefcase,
  ChartBar,
  Calendar,
  ArrowRight,
} from 'lucide-react';

interface InternStats {
  overallProgress: number;
  tasksCompleted: number;
  totalTasks: number;
  trainingModules: number;
  completedModules: number;
  performanceScore: number;
  daysInProgram: number;
  nextMilestone: string;
  conversionEligible: boolean;
}

const InternDashboard: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<InternStats>({
    overallProgress: 67,
    tasksCompleted: 24,
    totalTasks: 36,
    trainingModules: 8,
    completedModules: 5,
    performanceScore: 4.2,
    daysInProgram: 45,
    nextMilestone: '60-Day Performance Review',
    conversionEligible: false,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const StatCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string | number;
    subtext?: string;
    color: string;
    bgColor: string;
  }> = ({ icon, label, value, subtext, color, bgColor }) => (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            backgroundColor: bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>
            {label}
          </p>
          <p style={{ fontSize: '28px', fontWeight: 700, color: '#111827', lineHeight: 1 }}>
            {value}
          </p>
          {subtext && (
            <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{subtext}</p>
          )}
        </div>
      </div>
    </div>
  );

  const ProgressBar: React.FC<{ value: number; color: string }> = ({ value, color }) => (
    <div
      style={{
        width: '100%',
        height: '8px',
        backgroundColor: '#f3f4f6',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${value}%`,
          height: '100%',
          backgroundColor: color,
          transition: 'width 0.5s ease',
        }}
      />
    </div>
  );

  const QuickAction: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    color: string;
  }> = ({ icon, title, description, color }) => (
    <button
      style={{
        width: '100%',
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.backgroundColor = '#fafafa';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e5e7eb';
        e.currentTarget.style.backgroundColor = 'white';
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          backgroundColor: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '2px' }}>
          {title}
        </p>
        <p style={{ fontSize: '12px', color: '#6b7280' }}>{description}</p>
      </div>
      <ArrowRight size={18} style={{ color: '#9ca3af' }} />
    </button>
  );

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>
          Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}
        </h1>
        <p style={{ fontSize: '16px', color: '#6b7280' }}>
          Here's your progress and what's next in your development pathway.
        </p>
      </div>

      {/* Top Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        <StatCard
          icon={<Target size={24} />}
          label="Overall Progress"
          value={`${stats.overallProgress}%`}
          subtext="On track for conversion"
          color="#ff5f1f"
          bgColor="#fff4ed"
        />
        <StatCard
          icon={<CheckCircle2 size={24} />}
          label="Tasks Completed"
          value={`${stats.tasksCompleted}/${stats.totalTasks}`}
          subtext="12 pending"
          color="#10b981"
          bgColor="#ecfdf5"
        />
        <StatCard
          icon={<BookOpen size={24} />}
          label="Training Modules"
          value={`${stats.completedModules}/${stats.trainingModules}`}
          subtext="3 modules remaining"
          color="#3b82f6"
          bgColor="#eff6ff"
        />
        <StatCard
          icon={<ChartBar size={24} />}
          label="Performance Score"
          value={stats.performanceScore.toFixed(1)}
          subtext="Out of 5.0"
          color="#8b5cf6"
          bgColor="#f5f3ff"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px', marginBottom: '32px' }}>
        {/* Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Progress Breakdown */}
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <TrendingUp size={24} style={{ color: '#ff5f1f' }} />
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>
                Development Progress
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                    Core Skills Training
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#ff5f1f' }}>75%</span>
                </div>
                <ProgressBar value={75} color="#ff5f1f" />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                    Project Deliverables
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#10b981' }}>67%</span>
                </div>
                <ProgressBar value={67} color="#10b981" />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                    Team Collaboration
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#3b82f6' }}>82%</span>
                </div>
                <ProgressBar value={82} color="#3b82f6" />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                    Professional Development
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#8b5cf6' }}>58%</span>
                </div>
                <ProgressBar value={58} color="#8b5cf6" />
              </div>
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <Clock size={24} style={{ color: '#ef4444' }} />
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>
                Upcoming Deadlines
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { task: 'Complete Module 6: Advanced Operations', due: '2 days', priority: 'high' },
                { task: 'Submit Weekly Progress Report', due: '3 days', priority: 'medium' },
                { task: 'Peer Review: Project Documentation', due: '5 days', priority: 'medium' },
                { task: 'Schedule 1-on-1 with Manager', due: '1 week', priority: 'low' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    backgroundColor: '#fafafa',
                    borderRadius: '8px',
                    border: '1px solid #f3f4f6',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor:
                          item.priority === 'high'
                            ? '#ef4444'
                            : item.priority === 'medium'
                            ? '#f59e0b'
                            : '#10b981',
                      }}
                    />
                    <span style={{ fontSize: '14px', color: '#111827' }}>{item.task}</span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>
                    {item.due}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Next Milestone */}
          <div
            style={{
              background: 'linear-gradient(135deg, #ff5f1f 0%, #ff8c42 100%)',
              borderRadius: '12px',
              padding: '24px',
              color: 'white',
              boxShadow: '0 4px 6px rgba(255, 95, 31, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <Award size={28} />
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Next Milestone</h3>
            </div>
            <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
              {stats.nextMilestone}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Calendar size={16} />
              <span style={{ fontSize: '14px' }}>Day {stats.daysInProgram} of Program</span>
            </div>
            <div
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '13px',
                lineHeight: 1.5,
              }}
            >
              <strong>What's Next:</strong> Complete remaining training modules and maintain performance
              above 4.0 to unlock conversion eligibility.
            </div>
          </div>

          {/* Quick Actions */}
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb',
            }}
          >
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#111827',
                marginBottom: '16px',
              }}
            >
              Quick Actions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <QuickAction
                icon={<Briefcase size={20} />}
                title="View Tasks"
                description="3 tasks due this week"
                color="#ff5f1f"
              />
              <QuickAction
                icon={<BookOpen size={20} />}
                title="Continue Training"
                description="Module 6 in progress"
                color="#3b82f6"
              />
              <QuickAction
                icon={<ChartBar size={20} />}
                title="Performance"
                description="View detailed metrics"
                color="#8b5cf6"
              />
            </div>
          </div>

          {/* Status Badge */}
          <div
            style={{
              backgroundColor: stats.conversionEligible ? '#ecfdf5' : '#fef3c7',
              border: `2px solid ${stats.conversionEligible ? '#10b981' : '#f59e0b'}`,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {stats.conversionEligible ? (
                <CheckCircle2 size={20} style={{ color: '#10b981' }} />
              ) : (
                <AlertCircle size={20} style={{ color: '#f59e0b' }} />
              )}
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: stats.conversionEligible ? '#10b981' : '#f59e0b',
                }}
              >
                {stats.conversionEligible ? 'Conversion Eligible' : 'Building Toward Conversion'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InternDashboard;

import React, { useState, useMemo } from 'react';
import { useResponsive } from '../hooks/useResponsive';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Star,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  BarChart3,
  Users,
  Zap,
  BookOpen,
  MessageSquare,
  ThumbsUp,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  Trophy,
  Medal,
  Flame,
} from 'lucide-react';

// Types
interface KPI {
  id: string;
  name: string;
  category: 'productivity' | 'quality' | 'collaboration' | 'learning' | 'initiative';
  current: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  description: string;
}

interface PerformanceReview {
  id: string;
  period: string;
  reviewDate: string;
  reviewer: string;
  overallScore: number;
  status: 'scheduled' | 'completed' | 'pending_feedback';
  strengths: string[];
  improvements: string[];
  comments: string;
}

interface Skill {
  id: string;
  name: string;
  category: string;
  level: number; // 1-5
  targetLevel: number;
  lastAssessed: string;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  category: 'technical' | 'soft_skills' | 'project' | 'career';
  progress: number;
  dueDate: string;
  status: 'on_track' | 'at_risk' | 'completed' | 'overdue';
  milestones: { title: string; completed: boolean }[];
}

interface Feedback {
  id: string;
  from: string;
  type: 'praise' | 'constructive' | 'suggestion';
  content: string;
  date: string;
  isAnonymous: boolean;
}

type TabType = 'overview' | 'kpis' | 'reviews' | 'skills' | 'goals' | 'feedback';

// Mock data
const mockKPIs: KPI[] = [
  {
    id: '1',
    name: 'Tasks Completed',
    category: 'productivity',
    current: 24,
    target: 30,
    unit: 'tasks',
    trend: 'up',
    trendValue: 12,
    description: 'Number of tasks completed this month',
  },
  {
    id: '2',
    name: 'Code Quality Score',
    category: 'quality',
    current: 87,
    target: 85,
    unit: '%',
    trend: 'up',
    trendValue: 5,
    description: 'Average code review score',
  },
  {
    id: '3',
    name: 'On-Time Delivery',
    category: 'productivity',
    current: 92,
    target: 95,
    unit: '%',
    trend: 'down',
    trendValue: 3,
    description: 'Tasks completed by deadline',
  },
  {
    id: '4',
    name: 'Training Modules',
    category: 'learning',
    current: 5,
    target: 8,
    unit: 'modules',
    trend: 'up',
    trendValue: 2,
    description: 'Training modules completed',
  },
  {
    id: '5',
    name: 'Team Collaboration',
    category: 'collaboration',
    current: 4.2,
    target: 4.0,
    unit: '/5',
    trend: 'stable',
    trendValue: 0,
    description: 'Peer feedback score',
  },
  {
    id: '6',
    name: 'Initiative Projects',
    category: 'initiative',
    current: 2,
    target: 3,
    unit: 'projects',
    trend: 'up',
    trendValue: 1,
    description: 'Self-initiated improvements',
  },
];

const mockReviews: PerformanceReview[] = [
  {
    id: '1',
    period: '30-Day Review',
    reviewDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    reviewer: 'Sarah Chen',
    overallScore: 4.2,
    status: 'completed',
    strengths: ['Quick learner', 'Strong technical skills', 'Proactive communication'],
    improvements: ['Time estimation', 'Documentation habits'],
    comments: 'Excellent start to the internship. Shows great potential and eagerness to learn.',
  },
  {
    id: '2',
    period: '60-Day Review',
    reviewDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    reviewer: 'Sarah Chen',
    overallScore: 0,
    status: 'scheduled',
    strengths: [],
    improvements: [],
    comments: '',
  },
  {
    id: '3',
    period: '90-Day Review',
    reviewDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    reviewer: 'Michael Torres',
    overallScore: 0,
    status: 'scheduled',
    strengths: [],
    improvements: [],
    comments: '',
  },
];

const mockSkills: Skill[] = [
  { id: '1', name: 'React/TypeScript', category: 'Technical', level: 4, targetLevel: 5, lastAssessed: '2025-01-15' },
  { id: '2', name: 'API Design', category: 'Technical', level: 3, targetLevel: 4, lastAssessed: '2025-01-15' },
  { id: '3', name: 'Database Management', category: 'Technical', level: 2, targetLevel: 4, lastAssessed: '2025-01-10' },
  { id: '4', name: 'Problem Solving', category: 'Core', level: 4, targetLevel: 5, lastAssessed: '2025-01-15' },
  { id: '5', name: 'Communication', category: 'Soft Skills', level: 4, targetLevel: 4, lastAssessed: '2025-01-12' },
  { id: '6', name: 'Time Management', category: 'Soft Skills', level: 3, targetLevel: 4, lastAssessed: '2025-01-15' },
  { id: '7', name: 'Team Collaboration', category: 'Soft Skills', level: 4, targetLevel: 5, lastAssessed: '2025-01-14' },
  { id: '8', name: 'Git/Version Control', category: 'Technical', level: 4, targetLevel: 4, lastAssessed: '2025-01-10' },
];

const mockGoals: Goal[] = [
  {
    id: '1',
    title: 'Complete All Training Modules',
    description: 'Finish all 8 required training modules with passing scores',
    category: 'technical',
    progress: 62,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'on_track',
    milestones: [
      { title: 'Module 1-3: Foundations', completed: true },
      { title: 'Module 4-5: Core Skills', completed: true },
      { title: 'Module 6-7: Advanced Topics', completed: false },
      { title: 'Module 8: Final Assessment', completed: false },
    ],
  },
  {
    id: '2',
    title: 'Lead a Feature Implementation',
    description: 'Take ownership of a feature from design to deployment',
    category: 'project',
    progress: 35,
    dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'on_track',
    milestones: [
      { title: 'Feature proposal approved', completed: true },
      { title: 'Technical design complete', completed: false },
      { title: 'Implementation done', completed: false },
      { title: 'Code review passed', completed: false },
    ],
  },
  {
    id: '3',
    title: 'Improve Time Estimation Skills',
    description: 'Achieve 90%+ accuracy in task time estimates',
    category: 'soft_skills',
    progress: 75,
    dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'on_track',
    milestones: [
      { title: 'Track estimates vs actuals', completed: true },
      { title: 'Identify patterns', completed: true },
      { title: 'Apply learnings', completed: true },
      { title: 'Achieve 90% accuracy', completed: false },
    ],
  },
  {
    id: '4',
    title: 'Contribute to Documentation',
    description: 'Create or improve 5 documentation pages',
    category: 'technical',
    progress: 40,
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'at_risk',
    milestones: [
      { title: 'API documentation (2 pages)', completed: true },
      { title: 'Setup guide', completed: false },
      { title: 'Best practices guide', completed: false },
      { title: 'Troubleshooting guide', completed: false },
    ],
  },
];

const mockFeedback: Feedback[] = [
  {
    id: '1',
    from: 'Sarah Chen',
    type: 'praise',
    content: 'Great job on the dashboard refactoring! The code is much cleaner and more maintainable now.',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    isAnonymous: false,
  },
  {
    id: '2',
    from: 'Team Member',
    type: 'constructive',
    content: 'Consider adding more inline comments for complex logic. It would help the team understand your approach better.',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    isAnonymous: true,
  },
  {
    id: '3',
    from: 'Michael Torres',
    type: 'praise',
    content: 'Your presentation in the team meeting was excellent. Clear, concise, and well-prepared.',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    isAnonymous: false,
  },
  {
    id: '4',
    from: 'Team Member',
    type: 'suggestion',
    content: 'It might help to share your work-in-progress more often in standups. The team can provide early feedback.',
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    isAnonymous: true,
  },
];

const categoryConfig = {
  productivity: { color: '#3b82f6', bgColor: '#eff6ff', icon: <Zap size={16} /> },
  quality: { color: '#10b981', bgColor: '#ecfdf5', icon: <Star size={16} /> },
  collaboration: { color: '#8b5cf6', bgColor: '#f5f3ff', icon: <Users size={16} /> },
  learning: { color: '#f59e0b', bgColor: '#fef3c7', icon: <BookOpen size={16} /> },
  initiative: { color: '#ef4444', bgColor: '#fef2f2', icon: <Sparkles size={16} /> },
};

const goalCategoryConfig = {
  technical: { color: '#3b82f6', label: 'Technical' },
  soft_skills: { color: '#8b5cf6', label: 'Soft Skills' },
  project: { color: '#10b981', label: 'Project' },
  career: { color: '#f59e0b', label: 'Career' },
};

const InternPerformance: React.FC = () => {
  const { isMobile, isTablet } = useResponsive();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Calculate overall stats
  const overallStats = useMemo(() => {
    const avgKpiProgress = mockKPIs.reduce((acc, kpi) => acc + (kpi.current / kpi.target) * 100, 0) / mockKPIs.length;
    const completedReviews = mockReviews.filter((r) => r.status === 'completed').length;
    const avgReviewScore = mockReviews.filter((r) => r.status === 'completed').reduce((acc, r) => acc + r.overallScore, 0) / (completedReviews || 1);
    const avgSkillLevel = mockSkills.reduce((acc, s) => acc + s.level, 0) / mockSkills.length;
    const goalsOnTrack = mockGoals.filter((g) => g.status === 'on_track' || g.status === 'completed').length;

    return {
      kpiProgress: Math.min(100, Math.round(avgKpiProgress)),
      reviewScore: avgReviewScore.toFixed(1),
      skillLevel: avgSkillLevel.toFixed(1),
      goalsOnTrack,
      totalGoals: mockGoals.length,
    };
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return `in ${Math.abs(days)} days`;
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return formatDate(dateStr);
  };

  // Progress Ring Component
  const ProgressRing: React.FC<{ value: number; size?: number; strokeWidth?: number; color?: string }> = ({
    value,
    size = 120,
    strokeWidth = 8,
    color = '#ff5f1f',
  }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (value / 100) * circumference;

    return (
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
    );
  };

  // Skill Bar Component
  const SkillBar: React.FC<{ level: number; targetLevel: number }> = ({ level, targetLevel }) => (
    <div style={{ display: 'flex', gap: '4px' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            width: '24px',
            height: '8px',
            borderRadius: '4px',
            backgroundColor: i <= level ? '#ff5f1f' : i <= targetLevel ? '#fcd5c5' : '#f3f4f6',
            transition: 'background-color 0.3s',
          }}
        />
      ))}
    </div>
  );

  // Overview Tab
  const OverviewTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '24px' }}>
      {/* Performance Score Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ff5f1f 0%, #ff8c42 100%)',
          borderRadius: isMobile ? '12px' : '16px',
          padding: isMobile ? '20px' : '32px',
          color: 'white',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr auto',
          gap: isMobile ? '20px' : '32px',
          alignItems: 'center',
        }}
      >
        <div>
          <h2 style={{ fontSize: isMobile ? '20px' : '28px', fontWeight: 800, marginBottom: '8px' }}>
            Overall Performance Score
          </h2>
          <p style={{ fontSize: isMobile ? '14px' : '16px', opacity: 0.9, marginBottom: isMobile ? '16px' : '24px' }}>
            Based on KPIs, reviews, and goal completion
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? '16px' : '32px' }}>
            <div>
              <p style={{ fontSize: isMobile ? '12px' : '14px', opacity: 0.8, marginBottom: '4px' }}>Review Score</p>
              <p style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 700 }}>{overallStats.reviewScore}/5.0</p>
            </div>
            <div>
              <p style={{ fontSize: isMobile ? '12px' : '14px', opacity: 0.8, marginBottom: '4px' }}>KPI Progress</p>
              <p style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 700 }}>{overallStats.kpiProgress}%</p>
            </div>
            <div>
              <p style={{ fontSize: isMobile ? '12px' : '14px', opacity: 0.8, marginBottom: '4px' }}>Goals On Track</p>
              <p style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 700 }}>
                {overallStats.goalsOnTrack}/{overallStats.totalGoals}
              </p>
            </div>
          </div>
        </div>
        {!isMobile && (
        <div style={{ position: 'relative' }}>
          <ProgressRing value={overallStats.kpiProgress} size={140} strokeWidth={10} color="white" />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(90deg)',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '32px', fontWeight: 800 }}>{overallStats.kpiProgress}%</p>
          </div>
        </div>
        )}
      </div>

      {/* Quick Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? '10px' : '16px' }}>
        {[
          { icon: <Target size={isMobile ? 18 : 24} />, label: 'KPIs Met', value: `${mockKPIs.filter((k) => k.current >= k.target).length}/${mockKPIs.length}`, color: '#3b82f6' },
          { icon: <Star size={isMobile ? 18 : 24} />, label: 'Avg Skill Level', value: `${overallStats.skillLevel}/5`, color: '#f59e0b' },
          { icon: <Trophy size={isMobile ? 18 : 24} />, label: 'Reviews Done', value: `${mockReviews.filter((r) => r.status === 'completed').length}`, color: '#10b981' },
          { icon: <Flame size={isMobile ? 18 : 24} />, label: 'Feedback', value: `${mockFeedback.length}`, color: '#8b5cf6' },
        ].map((stat, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: 'white',
              borderRadius: isMobile ? '10px' : '12px',
              padding: isMobile ? '12px' : '20px',
              border: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '10px' : '16px',
            }}
          >
            <div
              style={{
                width: isMobile ? '36px' : '48px',
                height: isMobile ? '36px' : '48px',
                borderRadius: isMobile ? '8px' : '12px',
                backgroundColor: `${stat.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: stat.color,
                flexShrink: 0,
              }}
            >
              {stat.icon}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: isMobile ? '11px' : '13px', color: '#6b7280', marginBottom: '2px' }}>{stat.label}</p>
              <p style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: 700, color: '#111827' }}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '16px' : '24px' }}>
        {/* Recent Reviews */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>Performance Reviews</h3>
            <button
              onClick={() => setActiveTab('reviews')}
              style={{
                fontSize: '13px',
                color: '#ff5f1f',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {mockReviews.slice(0, 3).map((review) => (
              <div
                key={review.id}
                style={{
                  padding: '16px',
                  backgroundColor: '#fafafa',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{review.period}</p>
                  <p style={{ fontSize: '12px', color: '#6b7280' }}>
                    {formatRelativeTime(review.reviewDate)} • {review.reviewer}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {review.status === 'completed' ? (
                    <>
                      <p style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>
                        {review.overallScore.toFixed(1)}
                      </p>
                      <p style={{ fontSize: '11px', color: '#10b981' }}>Completed</p>
                    </>
                  ) : (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#fef3c7',
                        color: '#f59e0b',
                      }}
                    >
                      {review.status === 'scheduled' ? 'Scheduled' : 'Pending'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Goals */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>Active Goals</h3>
            <button
              onClick={() => setActiveTab('goals')}
              style={{
                fontSize: '13px',
                color: '#ff5f1f',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {mockGoals.slice(0, 3).map((goal) => (
              <div
                key={goal.id}
                style={{
                  padding: '16px',
                  backgroundColor: '#fafafa',
                  borderRadius: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{goal.title}</p>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: goal.status === 'on_track' ? '#ecfdf5' : goal.status === 'at_risk' ? '#fef2f2' : '#f3f4f6',
                      color: goal.status === 'on_track' ? '#10b981' : goal.status === 'at_risk' ? '#ef4444' : '#6b7280',
                    }}
                  >
                    {goal.status === 'on_track' ? 'On Track' : goal.status === 'at_risk' ? 'At Risk' : goal.status}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      flex: 1,
                      height: '6px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${goal.progress}%`,
                        height: '100%',
                        backgroundColor: goal.status === 'at_risk' ? '#ef4444' : '#ff5f1f',
                        borderRadius: '3px',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>{goal.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Feedback */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e5e7eb',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>Recent Feedback</h3>
          <button
            onClick={() => setActiveTab('feedback')}
            style={{
              fontSize: '13px',
              color: '#ff5f1f',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            View All <ChevronRight size={14} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: isMobile ? '12px' : '16px' }}>
          {mockFeedback.slice(0, 4).map((fb) => (
            <div
              key={fb.id}
              style={{
                padding: '16px',
                backgroundColor: fb.type === 'praise' ? '#ecfdf5' : fb.type === 'constructive' ? '#fef3c7' : '#f5f3ff',
                borderRadius: '10px',
                borderLeft: `4px solid ${fb.type === 'praise' ? '#10b981' : fb.type === 'constructive' ? '#f59e0b' : '#8b5cf6'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                {fb.type === 'praise' ? (
                  <ThumbsUp size={14} style={{ color: '#10b981' }} />
                ) : fb.type === 'constructive' ? (
                  <MessageSquare size={14} style={{ color: '#f59e0b' }} />
                ) : (
                  <Sparkles size={14} style={{ color: '#8b5cf6' }} />
                )}
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                  {fb.isAnonymous ? 'Anonymous' : fb.from}
                </span>
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>• {formatRelativeTime(fb.date)}</span>
              </div>
              <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>{fb.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // KPIs Tab
  const KPIsTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: isMobile ? '12px' : '20px' }}>
        {mockKPIs.map((kpi) => {
          const config = categoryConfig[kpi.category];
          const progress = Math.min(100, (kpi.current / kpi.target) * 100);
          const isAchieved = kpi.current >= kpi.target;

          return (
            <div
              key={kpi.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #e5e7eb',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor: config.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: config.color,
                  }}
                >
                  {config.icon}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: kpi.trend === 'up' ? '#10b981' : kpi.trend === 'down' ? '#ef4444' : '#6b7280',
                  }}
                >
                  {kpi.trend === 'up' ? <ArrowUpRight size={14} /> : kpi.trend === 'down' ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                  {kpi.trendValue > 0 && `${kpi.trend === 'down' ? '-' : '+'}${kpi.trendValue}%`}
                </div>
              </div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                {kpi.name}
              </h4>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '16px' }}>{kpi.description}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>{kpi.current}</span>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>/ {kpi.target} {kpi.unit}</span>
              </div>
              <div
                style={{
                  height: '8px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: '100%',
                    backgroundColor: isAchieved ? '#10b981' : config.color,
                    borderRadius: '4px',
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
              {isAchieved && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px' }}>
                  <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#10b981' }}>Target Achieved!</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Reviews Tab
  const ReviewsTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Timeline */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e5e7eb',
        }}
      >
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '24px' }}>
          Review Timeline
        </h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '60px',
              right: '60px',
              height: '4px',
              backgroundColor: '#e5e7eb',
              borderRadius: '2px',
            }}
          />
          {mockReviews.map((review, idx) => (
            <div key={review.id} style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: review.status === 'completed' ? '#10b981' : '#f3f4f6',
                  border: review.status === 'scheduled' ? '3px solid #ff5f1f' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                {review.status === 'completed' ? (
                  <CheckCircle2 size={20} style={{ color: 'white' }} />
                ) : (
                  <Calendar size={18} style={{ color: '#6b7280' }} />
                )}
              </div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{review.period}</p>
              <p style={{ fontSize: '12px', color: '#6b7280' }}>{formatDate(review.reviewDate)}</p>
              {review.status === 'completed' && (
                <p style={{ fontSize: '16px', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>
                  {review.overallScore.toFixed(1)}/5
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Completed Reviews */}
      {mockReviews
        .filter((r) => r.status === 'completed')
        .map((review) => (
          <div
            key={review.id}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>{review.period}</h3>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>
                  Reviewed by {review.reviewer} • {formatDate(review.reviewDate)}
                </p>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  backgroundColor: '#ecfdf5',
                  borderRadius: '12px',
                }}
              >
                <Star size={24} style={{ color: '#10b981', fill: '#10b981' }} />
                <span style={{ fontSize: '28px', fontWeight: 800, color: '#10b981' }}>
                  {review.overallScore.toFixed(1)}
                </span>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>/5.0</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '16px' : '24px', marginBottom: '20px' }}>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#10b981', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ThumbsUp size={16} /> Strengths
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {review.strengths.map((s, idx) => (
                    <li key={idx} style={{ fontSize: '14px', color: '#374151', marginBottom: '6px' }}>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#f59e0b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={16} /> Areas for Improvement
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {review.improvements.map((i, idx) => (
                    <li key={idx} style={{ fontSize: '14px', color: '#374151', marginBottom: '6px' }}>
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {review.comments && (
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '10px',
                  borderLeft: '4px solid #ff5f1f',
                }}
              >
                <p style={{ fontSize: '14px', color: '#374151', fontStyle: 'italic', lineHeight: 1.6 }}>
                  "{review.comments}"
                </p>
              </div>
            )}
          </div>
        ))}
    </div>
  );

  // Skills Tab
  const SkillsTab = () => {
    const skillsByCategory = useMemo(() => {
      const grouped: Record<string, Skill[]> = {};
      mockSkills.forEach((skill) => {
        if (!grouped[skill.category]) grouped[skill.category] = [];
        grouped[skill.category].push(skill);
      });
      return grouped;
    }, []);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Skill Summary */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e5e7eb',
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '20px' }}>
            Skills Overview
          </h3>
          <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <ProgressRing
                value={(mockSkills.reduce((acc, s) => acc + s.level, 0) / (mockSkills.length * 5)) * 100}
                size={120}
                strokeWidth={10}
                color="#ff5f1f"
              />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: '24px', fontWeight: 800, color: '#111827' }}>
                  {(mockSkills.reduce((acc, s) => acc + s.level, 0) / mockSkills.length).toFixed(1)}
                </p>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>Avg Level</p>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div style={{ padding: '16px', backgroundColor: '#ecfdf5', borderRadius: '10px' }}>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>
                    {mockSkills.filter((s) => s.level >= s.targetLevel).length}
                  </p>
                  <p style={{ fontSize: '13px', color: '#065f46' }}>At Target Level</p>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#fef3c7', borderRadius: '10px' }}>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b' }}>
                    {mockSkills.filter((s) => s.level < s.targetLevel && s.level >= s.targetLevel - 1).length}
                  </p>
                  <p style={{ fontSize: '13px', color: '#92400e' }}>Near Target</p>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#fef2f2', borderRadius: '10px' }}>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>
                    {mockSkills.filter((s) => s.level < s.targetLevel - 1).length}
                  </p>
                  <p style={{ fontSize: '13px', color: '#991b1b' }}>Needs Development</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Skills by Category */}
        {Object.entries(skillsByCategory).map(([category, skills]) => (
          <div
            key={category}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #e5e7eb',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', marginBottom: '20px' }}>
              {category}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {skills.map((skill) => (
                <div
                  key={skill.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    backgroundColor: '#fafafa',
                    borderRadius: '10px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{skill.name}</p>
                      {skill.level >= skill.targetLevel && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#ecfdf5',
                            color: '#10b981',
                          }}
                        >
                          TARGET MET
                        </span>
                      )}
                    </div>
                    <SkillBar level={skill.level} targetLevel={skill.targetLevel} />
                  </div>
                  <div style={{ textAlign: 'right', marginLeft: '24px' }}>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>
                      {skill.level}/{skill.targetLevel}
                    </p>
                    <p style={{ fontSize: '11px', color: '#9ca3af' }}>Current / Target</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Goals Tab
  const GoalsTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {mockGoals.map((goal) => {
        const catConfig = goalCategoryConfig[goal.category];
        const daysLeft = Math.ceil((new Date(goal.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        return (
          <div
            key={goal.id}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>{goal.title}</h3>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: `${catConfig.color}15`,
                      color: catConfig.color,
                    }}
                  >
                    {catConfig.label}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: goal.status === 'on_track' ? '#ecfdf5' : goal.status === 'at_risk' ? '#fef2f2' : '#f3f4f6',
                      color: goal.status === 'on_track' ? '#10b981' : goal.status === 'at_risk' ? '#ef4444' : '#6b7280',
                    }}
                  >
                    {goal.status === 'on_track' ? 'On Track' : goal.status === 'at_risk' ? 'At Risk' : goal.status}
                  </span>
                </div>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>{goal.description}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '28px', fontWeight: 800, color: goal.status === 'at_risk' ? '#ef4444' : '#ff5f1f' }}>
                  {goal.progress}%
                </p>
                <p style={{ fontSize: '12px', color: daysLeft < 7 ? '#ef4444' : '#6b7280' }}>
                  {daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div
              style={{
                height: '10px',
                backgroundColor: '#f3f4f6',
                borderRadius: '5px',
                overflow: 'hidden',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  width: `${goal.progress}%`,
                  height: '100%',
                  backgroundColor: goal.status === 'at_risk' ? '#ef4444' : '#ff5f1f',
                  borderRadius: '5px',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>

            {/* Milestones */}
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>Milestones</p>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '10px' }}>
                {goal.milestones.map((milestone, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      backgroundColor: milestone.completed ? '#ecfdf5' : '#fafafa',
                      borderRadius: '8px',
                    }}
                  >
                    {milestone.completed ? (
                      <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                    ) : (
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          border: '2px solid #d1d5db',
                        }}
                      />
                    )}
                    <span
                      style={{
                        fontSize: '13px',
                        color: milestone.completed ? '#065f46' : '#6b7280',
                        textDecoration: milestone.completed ? 'line-through' : 'none',
                      }}
                    >
                      {milestone.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // Feedback Tab
  const FeedbackTab = () => {
    const feedbackByType = useMemo(() => {
      return {
        praise: mockFeedback.filter((f) => f.type === 'praise'),
        constructive: mockFeedback.filter((f) => f.type === 'constructive'),
        suggestion: mockFeedback.filter((f) => f.type === 'suggestion'),
      };
    }, []);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Feedback Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? '12px' : '16px' }}>
          <div
            style={{
              backgroundColor: '#ecfdf5',
              borderRadius: '12px',
              padding: '20px',
              borderLeft: '4px solid #10b981',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <ThumbsUp size={20} style={{ color: '#10b981' }} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#065f46' }}>Praise</span>
            </div>
            <p style={{ fontSize: '32px', fontWeight: 800, color: '#10b981' }}>{feedbackByType.praise.length}</p>
          </div>
          <div
            style={{
              backgroundColor: '#fef3c7',
              borderRadius: '12px',
              padding: '20px',
              borderLeft: '4px solid #f59e0b',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <MessageSquare size={20} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#92400e' }}>Constructive</span>
            </div>
            <p style={{ fontSize: '32px', fontWeight: 800, color: '#f59e0b' }}>{feedbackByType.constructive.length}</p>
          </div>
          <div
            style={{
              backgroundColor: '#f5f3ff',
              borderRadius: '12px',
              padding: '20px',
              borderLeft: '4px solid #8b5cf6',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <Sparkles size={20} style={{ color: '#8b5cf6' }} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#5b21b6' }}>Suggestions</span>
            </div>
            <p style={{ fontSize: '32px', fontWeight: 800, color: '#8b5cf6' }}>{feedbackByType.suggestion.length}</p>
          </div>
        </div>

        {/* All Feedback */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e5e7eb',
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '20px' }}>
            All Feedback
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {mockFeedback.map((fb) => (
              <div
                key={fb.id}
                style={{
                  padding: '20px',
                  backgroundColor: fb.type === 'praise' ? '#ecfdf5' : fb.type === 'constructive' ? '#fef3c7' : '#f5f3ff',
                  borderRadius: '12px',
                  borderLeft: `4px solid ${fb.type === 'praise' ? '#10b981' : fb.type === 'constructive' ? '#f59e0b' : '#8b5cf6'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: fb.type === 'praise' ? '#10b981' : fb.type === 'constructive' ? '#f59e0b' : '#8b5cf6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '14px',
                      }}
                    >
                      {fb.isAnonymous ? '?' : fb.from.charAt(0)}
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                        {fb.isAnonymous ? 'Anonymous Feedback' : fb.from}
                      </p>
                      <p style={{ fontSize: '12px', color: '#6b7280' }}>{formatRelativeTime(fb.date)}</p>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      color: fb.type === 'praise' ? '#10b981' : fb.type === 'constructive' ? '#f59e0b' : '#8b5cf6',
                      textTransform: 'capitalize',
                    }}
                  >
                    {fb.type}
                  </span>
                </div>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.6 }}>{fb.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: isMobile ? '16px' : '24px' }}>
        <h1 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 800, color: '#111827', marginBottom: '4px' }}>
          Performance & Evaluation
        </h1>
        <p style={{ fontSize: isMobile ? '13px' : '15px', color: '#6b7280' }}>
          Track your KPIs, reviews, skills development, and feedback
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          backgroundColor: '#f3f4f6',
          padding: '4px',
          borderRadius: '12px',
          marginBottom: isMobile ? '16px' : '24px',
          width: isMobile ? '100%' : 'fit-content',
          overflowX: 'auto',
        }}
      >
        {[
          { key: 'overview' as TabType, label: isMobile ? '' : 'Overview', icon: <BarChart3 size={16} /> },
          { key: 'kpis' as TabType, label: isMobile ? '' : 'KPIs', icon: <Target size={16} /> },
          { key: 'reviews' as TabType, label: isMobile ? '' : 'Reviews', icon: <FileText size={16} /> },
          { key: 'skills' as TabType, label: isMobile ? '' : 'Skills', icon: <Award size={16} /> },
          { key: 'goals' as TabType, label: isMobile ? '' : 'Goals', icon: <Trophy size={16} /> },
          { key: 'feedback' as TabType, label: isMobile ? '' : 'Feedback', icon: <MessageSquare size={16} /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: isMobile ? '10px 14px' : '10px 18px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === tab.key ? 'white' : 'transparent',
              color: activeTab === tab.key ? '#111827' : '#6b7280',
              fontSize: '14px',
              fontWeight: activeTab === tab.key ? 600 : 500,
              cursor: 'pointer',
              boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s',
              flex: isMobile ? 1 : 'none',
              flexShrink: 0,
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'kpis' && <KPIsTab />}
      {activeTab === 'reviews' && <ReviewsTab />}
      {activeTab === 'skills' && <SkillsTab />}
      {activeTab === 'goals' && <GoalsTab />}
      {activeTab === 'feedback' && <FeedbackTab />}
    </div>
  );
};

export default InternPerformance;

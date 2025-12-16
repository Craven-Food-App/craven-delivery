import React, { useState, useMemo } from 'react';
import {
  Award,
  CheckCircle2,
  Circle,
  Clock,
  Star,
  TrendingUp,
  Users,
  Briefcase,
  GraduationCap,
  FileText,
  Shield,
  Zap,
  ChevronRight,
  ChevronDown,
  Calendar,
  Target,
  Sparkles,
  ArrowRight,
  Lock,
  Unlock,
  Trophy,
  Medal,
  Crown,
  Building2,
  DollarSign,
  Percent,
  ClipboardCheck,
  AlertCircle,
  Info,
  ExternalLink,
  Download,
} from 'lucide-react';

// Types
interface EligibilityRequirement {
  id: string;
  category: 'time' | 'performance' | 'training' | 'skills' | 'project' | 'culture';
  title: string;
  description: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  status: 'completed' | 'in_progress' | 'not_started' | 'at_risk';
  weight: number; // Percentage weight toward eligibility
}

interface ConversionOffer {
  id: string;
  title: string;
  role: string;
  department: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  offeredDate: string;
  expiresDate: string;
  compensation: {
    deferredSalary: number;
    equityPercent: number;
    vestingSchedule: string;
  };
  benefits: string[];
  responsibilities: string[];
}

interface PathwayStage {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'locked';
  completedDate?: string;
  requirements: string[];
}

// Mock data
const mockRequirements: EligibilityRequirement[] = [
  {
    id: '1',
    category: 'time',
    title: 'Minimum Tenure',
    description: 'Complete at least 90 days in the internship program',
    currentValue: 45,
    targetValue: 90,
    unit: 'days',
    status: 'in_progress',
    weight: 15,
  },
  {
    id: '2',
    category: 'performance',
    title: 'Performance Score',
    description: 'Maintain an average performance score of 4.0 or higher',
    currentValue: 4.2,
    targetValue: 4.0,
    unit: '/5.0',
    status: 'completed',
    weight: 25,
  },
  {
    id: '3',
    category: 'training',
    title: 'Training Completion',
    description: 'Complete all required training modules with passing scores',
    currentValue: 5,
    targetValue: 8,
    unit: 'modules',
    status: 'in_progress',
    weight: 15,
  },
  {
    id: '4',
    category: 'skills',
    title: 'Core Skills Assessment',
    description: 'Achieve target proficiency in all core skill areas',
    currentValue: 6,
    targetValue: 8,
    unit: 'skills',
    status: 'in_progress',
    weight: 15,
  },
  {
    id: '5',
    category: 'project',
    title: 'Project Leadership',
    description: 'Successfully lead at least one feature or project to completion',
    currentValue: 0,
    targetValue: 1,
    unit: 'project',
    status: 'not_started',
    weight: 20,
  },
  {
    id: '6',
    category: 'culture',
    title: 'Team Collaboration',
    description: 'Receive positive feedback from at least 3 team members',
    currentValue: 2,
    targetValue: 3,
    unit: 'reviews',
    status: 'in_progress',
    weight: 10,
  },
];

const mockOffer: ConversionOffer | null = null; // No active offer yet

const mockPathwayStages: PathwayStage[] = [
  {
    id: '1',
    title: 'Intern',
    description: 'Foundation building and skill development',
    status: 'current',
    requirements: [
      'Complete onboarding',
      'Pass 30-day review',
      'Complete core training modules',
    ],
  },
  {
    id: '2',
    title: 'Acting Executive',
    description: 'Leadership development with limited authority',
    status: 'locked',
    requirements: [
      'Meet all eligibility requirements',
      'Receive conversion offer',
      'Complete executive orientation',
    ],
  },
  {
    id: '3',
    title: 'Executive Officer',
    description: 'Full executive authority and responsibilities',
    status: 'locked',
    requirements: [
      'Complete 6-month Acting period',
      'Demonstrate leadership excellence',
      'Board approval',
    ],
  },
];

const categoryConfig = {
  time: { icon: <Clock size={18} />, color: '#3b82f6', bgColor: '#eff6ff', label: 'Time' },
  performance: { icon: <TrendingUp size={18} />, color: '#10b981', bgColor: '#ecfdf5', label: 'Performance' },
  training: { icon: <GraduationCap size={18} />, color: '#f59e0b', bgColor: '#fef3c7', label: 'Training' },
  skills: { icon: <Zap size={18} />, color: '#8b5cf6', bgColor: '#f5f3ff', label: 'Skills' },
  project: { icon: <Briefcase size={18} />, color: '#ef4444', bgColor: '#fef2f2', label: 'Project' },
  culture: { icon: <Users size={18} />, color: '#06b6d4', bgColor: '#ecfeff', label: 'Culture' },
};

const InternConversion: React.FC = () => {
  const [expandedRequirement, setExpandedRequirement] = useState<string | null>(null);
  const [showOfferDetails, setShowOfferDetails] = useState(false);

  // Calculate overall eligibility
  const eligibilityStats = useMemo(() => {
    const completedWeight = mockRequirements
      .filter((r) => r.status === 'completed')
      .reduce((acc, r) => acc + r.weight, 0);
    
    const inProgressWeight = mockRequirements
      .filter((r) => r.status === 'in_progress')
      .reduce((acc, r) => {
        const progress = Math.min(r.currentValue / r.targetValue, 1);
        return acc + r.weight * progress;
      }, 0);

    const totalProgress = completedWeight + inProgressWeight;
    const completedCount = mockRequirements.filter((r) => r.status === 'completed').length;
    const totalCount = mockRequirements.length;

    return {
      overallProgress: Math.round(totalProgress),
      completedCount,
      totalCount,
      isEligible: completedCount === totalCount,
    };
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Progress Ring Component
  const ProgressRing: React.FC<{
    value: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
    bgColor?: string;
  }> = ({ value, size = 160, strokeWidth = 12, color = '#ff5f1f', bgColor = '#f3f4f6' }) => {
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
          stroke={bgColor}
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

  // Requirement Card Component
  const RequirementCard: React.FC<{ req: EligibilityRequirement }> = ({ req }) => {
    const config = categoryConfig[req.category];
    const progress = Math.min((req.currentValue / req.targetValue) * 100, 100);
    const isExpanded = expandedRequirement === req.id;

    return (
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          transition: 'all 0.2s',
        }}
      >
        <button
          onClick={() => setExpandedRequirement(isExpanded ? null : req.id)}
          style={{
            width: '100%',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: req.status === 'completed' ? '#ecfdf5' : config.bgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: req.status === 'completed' ? '#10b981' : config.color,
              flexShrink: 0,
            }}
          >
            {req.status === 'completed' ? <CheckCircle2 size={24} /> : config.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0 }}>
                {req.title}
              </h4>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: config.bgColor,
                  color: config.color,
                  textTransform: 'uppercase',
                }}
              >
                {config.label}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{req.description}</p>
          </div>
          <div style={{ textAlign: 'right', marginRight: '8px' }}>
            <p style={{ fontSize: '18px', fontWeight: 700, color: req.status === 'completed' ? '#10b981' : '#111827', margin: 0 }}>
              {req.currentValue}{req.unit !== 'project' && req.unit !== 'modules' && req.unit !== 'skills' && req.unit !== 'reviews' ? '' : '/'}{req.unit !== 'project' && req.unit !== 'modules' && req.unit !== 'skills' && req.unit !== 'reviews' ? req.unit : req.targetValue}
            </p>
            <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>
              {req.weight}% weight
            </p>
          </div>
          <div
            style={{
              width: '60px',
              height: '60px',
              position: 'relative',
              flexShrink: 0,
            }}
          >
            <ProgressRing
              value={progress}
              size={60}
              strokeWidth={6}
              color={req.status === 'completed' ? '#10b981' : config.color}
            />
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '12px',
                fontWeight: 700,
                color: req.status === 'completed' ? '#10b981' : '#111827',
              }}
            >
              {Math.round(progress)}%
            </div>
          </div>
          <ChevronDown
            size={20}
            style={{
              color: '#9ca3af',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          />
        </button>
        {isExpanded && (
          <div
            style={{
              padding: '0 20px 20px',
              borderTop: '1px solid #f3f4f6',
              marginTop: '-8px',
              paddingTop: '16px',
            }}
          >
            <div
              style={{
                height: '8px',
                backgroundColor: '#f3f4f6',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  backgroundColor: req.status === 'completed' ? '#10b981' : config.color,
                  borderRadius: '4px',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                  Current: <strong style={{ color: '#111827' }}>{req.currentValue} {req.unit}</strong>
                </p>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
                  Target: <strong style={{ color: '#111827' }}>{req.targetValue} {req.unit}</strong>
                </p>
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor:
                    req.status === 'completed'
                      ? '#ecfdf5'
                      : req.status === 'in_progress'
                      ? '#fef3c7'
                      : req.status === 'at_risk'
                      ? '#fef2f2'
                      : '#f3f4f6',
                  color:
                    req.status === 'completed'
                      ? '#10b981'
                      : req.status === 'in_progress'
                      ? '#f59e0b'
                      : req.status === 'at_risk'
                      ? '#ef4444'
                      : '#6b7280',
                }}
              >
                {req.status === 'completed'
                  ? '✓ Completed'
                  : req.status === 'in_progress'
                  ? 'In Progress'
                  : req.status === 'at_risk'
                  ? 'At Risk'
                  : 'Not Started'}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#111827', marginBottom: '4px' }}>
          Conversion & Advancement
        </h1>
        <p style={{ fontSize: '15px', color: '#6b7280' }}>
          Track your path from Intern to Acting Executive and beyond
        </p>
      </div>

      {/* Career Pathway */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '24px',
          color: 'white',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <Crown size={28} style={{ color: '#fbbf24' }} />
          <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>Your Career Pathway</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          {/* Connection Line */}
          <div
            style={{
              position: 'absolute',
              top: '40px',
              left: '80px',
              right: '80px',
              height: '4px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '2px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '40px',
              left: '80px',
              width: '33%',
              height: '4px',
              backgroundColor: '#ff5f1f',
              borderRadius: '2px',
            }}
          />

          {mockPathwayStages.map((stage, idx) => (
            <div key={stage.id} style={{ textAlign: 'center', position: 'relative', zIndex: 1, flex: 1 }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor:
                    stage.status === 'completed'
                      ? '#10b981'
                      : stage.status === 'current'
                      ? '#ff5f1f'
                      : 'rgba(255,255,255,0.1)',
                  border: stage.status === 'current' ? '4px solid rgba(255,255,255,0.3)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: stage.status === 'current' ? '0 0 30px rgba(255, 95, 31, 0.4)' : 'none',
                }}
              >
                {stage.status === 'completed' ? (
                  <CheckCircle2 size={36} />
                ) : stage.status === 'current' ? (
                  idx === 0 ? <GraduationCap size={36} /> : <Award size={36} />
                ) : (
                  <Lock size={28} style={{ opacity: 0.5 }} />
                )}
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{stage.title}</h3>
              <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '12px' }}>{stage.description}</p>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 12px',
                  borderRadius: '12px',
                  backgroundColor:
                    stage.status === 'completed'
                      ? 'rgba(16, 185, 129, 0.2)'
                      : stage.status === 'current'
                      ? 'rgba(255, 95, 31, 0.2)'
                      : 'rgba(255,255,255,0.1)',
                  color:
                    stage.status === 'completed'
                      ? '#10b981'
                      : stage.status === 'current'
                      ? '#ff5f1f'
                      : 'rgba(255,255,255,0.5)',
                }}
              >
                {stage.status === 'completed' ? 'Completed' : stage.status === 'current' ? 'Current Stage' : 'Locked'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
        {/* Left Column - Requirements */}
        <div>
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #e5e7eb',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
                  Eligibility Requirements
                </h3>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                  Complete all requirements to unlock Acting Executive conversion
                </p>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  backgroundColor: eligibilityStats.isEligible ? '#ecfdf5' : '#fef3c7',
                  borderRadius: '10px',
                }}
              >
                {eligibilityStats.isEligible ? (
                  <Unlock size={18} style={{ color: '#10b981' }} />
                ) : (
                  <Lock size={18} style={{ color: '#f59e0b' }} />
                )}
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: eligibilityStats.isEligible ? '#10b981' : '#f59e0b',
                  }}
                >
                  {eligibilityStats.isEligible ? 'Eligible' : 'Not Yet Eligible'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {mockRequirements.map((req) => (
                <RequirementCard key={req.id} req={req} />
              ))}
            </div>
          </div>

          {/* What's Next Section */}
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <Sparkles size={24} style={{ color: '#ff5f1f' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
                What Happens Next?
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                {
                  step: 1,
                  title: 'Complete All Requirements',
                  description: 'Finish the remaining eligibility requirements to unlock conversion',
                  icon: <ClipboardCheck size={20} />,
                  status: 'current',
                },
                {
                  step: 2,
                  title: 'Receive Conversion Offer',
                  description: 'Your manager will extend an Acting Executive offer letter',
                  icon: <FileText size={20} />,
                  status: 'pending',
                },
                {
                  step: 3,
                  title: 'Executive Orientation',
                  description: 'Complete the Acting Executive onboarding program',
                  icon: <GraduationCap size={20} />,
                  status: 'pending',
                },
                {
                  step: 4,
                  title: 'Begin Acting Role',
                  description: 'Start your journey as an Acting Executive with expanded responsibilities',
                  icon: <Award size={20} />,
                  status: 'pending',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    padding: '16px',
                    backgroundColor: item.status === 'current' ? '#fff7ed' : '#fafafa',
                    borderRadius: '12px',
                    border: item.status === 'current' ? '2px solid #ff5f1f' : '1px solid #f3f4f6',
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: item.status === 'current' ? '#ff5f1f' : '#e5e7eb',
                      color: item.status === 'current' ? 'white' : '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                      Step {item.step}: {item.title}
                    </h4>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Progress & Benefits */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Overall Progress */}
          <div
            style={{
              background: 'linear-gradient(135deg, #ff5f1f 0%, #ff8c42 100%)',
              borderRadius: '16px',
              padding: '32px',
              color: 'white',
              textAlign: 'center',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '24px', opacity: 0.9 }}>
              Overall Eligibility Progress
            </h3>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '24px' }}>
              <ProgressRing
                value={eligibilityStats.overallProgress}
                size={160}
                strokeWidth={12}
                color="white"
                bgColor="rgba(255,255,255,0.2)"
              />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <p style={{ fontSize: '40px', fontWeight: 800, margin: 0 }}>{eligibilityStats.overallProgress}%</p>
                <p style={{ fontSize: '12px', opacity: 0.8, margin: 0 }}>Complete</p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px' }}>
              <div>
                <p style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>{eligibilityStats.completedCount}</p>
                <p style={{ fontSize: '12px', opacity: 0.8, margin: 0 }}>Completed</p>
              </div>
              <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.3)' }} />
              <div>
                <p style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>
                  {eligibilityStats.totalCount - eligibilityStats.completedCount}
                </p>
                <p style={{ fontSize: '12px', opacity: 0.8, margin: 0 }}>Remaining</p>
              </div>
            </div>
          </div>

          {/* Acting Executive Benefits */}
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <Trophy size={24} style={{ color: '#f59e0b' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
                Acting Executive Benefits
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { icon: <DollarSign size={18} />, title: 'Deferred Compensation', description: '$120,000 annual accrual', color: '#10b981' },
                { icon: <Percent size={18} />, title: 'Equity Participation', description: '0.5% target equity stake', color: '#8b5cf6' },
                { icon: <Building2 size={18} />, title: 'Department Leadership', description: 'Lead your own team', color: '#3b82f6' },
                { icon: <Shield size={18} />, title: 'Executive Access', description: 'Strategic planning & decisions', color: '#f59e0b' },
                { icon: <Star size={18} />, title: 'Mentorship Program', description: 'Direct C-suite mentorship', color: '#ef4444' },
              ].map((benefit, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px',
                    backgroundColor: '#fafafa',
                    borderRadius: '10px',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: `${benefit.color}15`,
                      color: benefit.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {benefit.icon}
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
                      {benefit.title}
                    </p>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Estimate */}
          <div
            style={{
              backgroundColor: '#f0fdf4',
              borderRadius: '16px',
              padding: '24px',
              border: '2px solid #86efac',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <Calendar size={24} style={{ color: '#10b981' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#065f46', margin: 0 }}>
                Estimated Timeline
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#065f46' }}>Days remaining</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>~45 days</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#065f46' }}>Projected eligibility</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#065f46' }}>March 1, 2025</span>
              </div>
            </div>
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: 'white',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Info size={16} style={{ color: '#10b981' }} />
              <p style={{ fontSize: '12px', color: '#065f46', margin: 0 }}>
                Based on your current progress rate
              </p>
            </div>
          </div>

          {/* Active Offer Card (if exists) */}
          {mockOffer && (
            <div
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderRadius: '16px',
                padding: '24px',
                color: 'white',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <FileText size={24} />
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Active Offer</h3>
              </div>
              <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '20px' }}>
                You have a pending conversion offer!
              </p>
              <button
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: 'white',
                  color: '#10b981',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                View Offer Details
                <ArrowRight size={18} />
              </button>
            </div>
          )}

          {/* No Offer Yet */}
          {!mockOffer && (
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid #e5e7eb',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <FileText size={28} style={{ color: '#9ca3af' }} />
              </div>
              <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
                No Active Offer
              </h4>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                Complete all eligibility requirements to receive your conversion offer
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InternConversion;

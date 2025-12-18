import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useResponsive } from '../hooks/useResponsive';
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
  Target,
  Download,
  Star,
  Shield,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import type {
  TrainingModule,
  ModuleProgress,
  Certification,
  InternActivationStatus,
  ModuleWithProgress,
  TrainingStats,
  ModuleStatus,
  ModuleScope,
  DeliveryType,
} from '@/types/internTraining';
import {
  SCOPE_LABELS,
  SCOPE_COLORS,
  STATUS_COLORS,
  formatDuration,
  calculateOverallProgress,
} from '@/types/internTraining';
import ModuleViewer from './ModuleViewer';
import CertificateGenerator from './CertificateGenerator';

// ============================================
// COMPONENT: ModuleCard
// ============================================
interface ModuleCardProps {
  module: ModuleWithProgress;
  onStart: (moduleId: string) => void;
  onContinue: (moduleId: string) => void;
  onViewCertificate: (certification: Certification) => void;
  isUpdating: boolean;
  isMobile?: boolean;
}

const ModuleCard: React.FC<ModuleCardProps> = ({
  module,
  onStart,
  onContinue,
  onViewCertificate,
  isUpdating,
  isMobile = false,
}) => {
  const statusColor = STATUS_COLORS[module.effectiveStatus];
  const scopeColor = SCOPE_COLORS[module.scope];
  const isLocked = module.effectiveStatus === 'LOCKED';
  const isCompleted = module.effectiveStatus === 'COMPLETED';
  const isInProgress = module.effectiveStatus === 'IN_PROGRESS';

  const getDeliveryIcon = (type: DeliveryType) => {
    switch (type) {
      case 'Video':
        return <Video size={16} />;
      case 'Interactive':
        return <Target size={16} />;
      case 'Document':
        return <FileText size={16} />;
    }
  };

  const handleAction = () => {
    if (isLocked || isUpdating) return;
    if (isCompleted && module.certification) {
      onViewCertificate(module.certification);
    } else if (isInProgress) {
      onContinue(module.id);
    } else {
      onStart(module.id);
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: isMobile ? '12px' : '16px',
        padding: isMobile ? '16px' : '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
        border: `1px solid ${isLocked ? '#e5e7eb' : statusColor.border}20`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isLocked ? 0.65 : 1,
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        if (!isLocked && !isMobile) {
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)';
          e.currentTarget.style.transform = 'translateY(-4px)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Scope indicator stripe */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: `linear-gradient(90deg, ${scopeColor.text}, ${scopeColor.border})`,
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? '12px' : '16px', marginBottom: isMobile ? '12px' : '16px' }}>
        <div
          style={{
            width: isMobile ? '44px' : '56px',
            height: isMobile ? '44px' : '56px',
            borderRadius: isMobile ? '10px' : '14px',
            backgroundColor: statusColor.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: statusColor.text,
            flexShrink: 0,
          }}
        >
          {isCompleted ? (
            <CheckCircle2 size={isMobile ? 22 : 28} />
          ) : isLocked ? (
            <Lock size={isMobile ? 22 : 28} />
          ) : isInProgress ? (
            <RefreshCw size={isMobile ? 22 : 28} style={{ animation: 'none' }} />
          ) : (
            <PlayCircle size={isMobile ? 22 : 28} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: isMobile ? '15px' : '17px', fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.3 }}>
              {module.name}
            </h3>
            {module.certification_issued && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#fef3c7',
                  color: '#d97706',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                <Award size={12} />
                Certification
              </span>
            )}
          </div>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
            {module.description}
          </p>
        </div>

        {/* Score badge */}
        {module.progress?.score !== null && module.progress?.score !== undefined && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              backgroundColor: module.progress.score >= 90 ? '#ecfdf5' : module.progress.score >= 70 ? '#fef3c7' : '#fef2f2',
              textAlign: 'center',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: module.progress.score >= 90 ? '#10b981' : module.progress.score >= 70 ? '#f59e0b' : '#ef4444',
                lineHeight: 1,
              }}
            >
              {module.progress.score}%
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>Score</div>
          </div>
        )}
      </div>

      {/* Meta info */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '8px' : '16px',
          flexWrap: 'wrap',
          marginBottom: isMobile ? '12px' : '16px',
          padding: isMobile ? '10px 12px' : '12px 16px',
          backgroundColor: '#f9fafb',
          borderRadius: isMobile ? '8px' : '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={14} style={{ color: '#9ca3af' }} />
          <span style={{ fontSize: '13px', color: '#4b5563', fontWeight: 500 }}>
            {formatDuration(module.duration_minutes)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9ca3af' }}>
          {getDeliveryIcon(module.delivery_type)}
          <span style={{ fontSize: '13px', color: '#4b5563', fontWeight: 500 }}>
            {module.delivery_type}
          </span>
        </div>
        {module.passing_score && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Target size={14} style={{ color: '#9ca3af' }} />
            <span style={{ fontSize: '13px', color: '#4b5563', fontWeight: 500 }}>
              Pass: {module.passing_score}%
            </span>
          </div>
        )}
        {module.is_required && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: '4px',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              textTransform: 'uppercase',
            }}
          >
            Required
          </span>
        )}
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: '4px',
            backgroundColor: statusColor.bg,
            color: statusColor.text,
            textTransform: 'uppercase',
            marginLeft: 'auto',
          }}
        >
          {module.effectiveStatus.replace('_', ' ')}
        </span>
      </div>

      {/* Progress bar for in-progress modules */}
      {isInProgress && module.progress && module.progress.progress_percent > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Progress</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: statusColor.text }}>
              {module.progress.progress_percent}%
            </span>
          </div>
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
                width: `${module.progress.progress_percent}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${statusColor.text}, ${statusColor.border})`,
                borderRadius: '4px',
                transition: 'width 0.5s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Action button */}
      <button
        onClick={handleAction}
        disabled={isLocked || isUpdating}
        style={{
          width: '100%',
          padding: isMobile ? '12px 16px' : '14px 20px',
          background: isLocked
            ? '#f3f4f6'
            : isCompleted && module.certification
            ? `linear-gradient(135deg, #f59e0b, #d97706)`
            : `linear-gradient(135deg, ${statusColor.text}, ${statusColor.border})`,
          color: isLocked ? '#9ca3af' : 'white',
          border: 'none',
          borderRadius: isMobile ? '10px' : '12px',
          fontSize: isMobile ? '13px' : '14px',
          fontWeight: 700,
          cursor: isLocked ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isMobile ? '8px' : '10px',
          transition: 'all 0.2s',
          boxShadow: isLocked ? 'none' : '0 2px 8px rgba(0,0,0,0.15)',
        }}
        onMouseEnter={(e) => {
          if (!isLocked && !isUpdating) {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = isLocked ? 'none' : '0 2px 8px rgba(0,0,0,0.15)';
        }}
      >
        {isUpdating ? (
          <>
            <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
            Updating...
          </>
        ) : isCompleted && module.certification ? (
          <>
            <Award size={18} />
            View Certificate
          </>
        ) : isCompleted ? (
          <>
            <CheckCircle2 size={18} />
            Completed
          </>
        ) : isLocked ? (
          <>
            <Lock size={18} />
            {module.unlock_after_weeks ? `Unlocks in ${module.unlock_after_weeks} weeks` : 'Locked'}
          </>
        ) : isInProgress ? (
          <>
            <PlayCircle size={18} />
            Continue Module
            <ChevronRight size={16} />
          </>
        ) : (
          <>
            <PlayCircle size={18} />
            Start Module
            <ChevronRight size={16} />
          </>
        )}
      </button>
    </div>
  );
};

// ============================================
// COMPONENT: StatsCard
// ============================================
interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
  bgColor: string;
  isMobile?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({ icon, label, value, subtext, color, bgColor, isMobile = false }) => (
  <div
    style={{
      backgroundColor: 'white',
      borderRadius: isMobile ? '12px' : '16px',
      padding: isMobile ? '12px' : '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      border: '1px solid #e5e7eb',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? '10px' : '16px' }}>
      <div
        style={{
          width: isMobile ? '40px' : '52px',
          height: isMobile ? '40px' : '52px',
          borderRadius: isMobile ? '10px' : '14px',
          backgroundColor: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
          flexShrink: 0,
        }}
      >
        {isMobile ? React.cloneElement(icon as React.ReactElement, { size: 20 }) : icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: isMobile ? '11px' : '13px', color: '#6b7280', fontWeight: 500, marginBottom: '2px' }}>
          {label}
        </p>
        <p style={{ fontSize: isMobile ? '20px' : '28px', fontWeight: 800, color: '#111827', lineHeight: 1 }}>
          {value}
        </p>
        {subtext && !isMobile && (
          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{subtext}</p>
        )}
      </div>
    </div>
  </div>
);

// ============================================
// COMPONENT: ActivationBanner
// ============================================
interface ActivationBannerProps {
  activationStatus: InternActivationStatus | null;
  stats: TrainingStats;
}

const ActivationBanner: React.FC<ActivationBannerProps & { isMobile?: boolean }> = ({ activationStatus, stats, isMobile = false }) => {
  if (!activationStatus) return null;

  const isActivated = activationStatus.is_activated;
  const coreComplete = activationStatus.core_modules_completed;
  const roleComplete = activationStatus.role_modules_completed;

  if (isActivated) {
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #10b981, #059669)',
          borderRadius: '16px',
          padding: isMobile ? '16px' : '24px',
          marginBottom: isMobile ? '20px' : '32px',
          color: 'white',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: isMobile ? '16px' : '20px',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Sparkles size={32} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>
            🎉 You're Fully Activated!
          </h3>
          <p style={{ fontSize: '14px', opacity: 0.9 }}>
            Congratulations! You've completed all required training modules and are now fully activated.
            You have full access to the intern portal and work assignments.
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 800 }}>{stats.certCount}</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>Certifications</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        borderRadius: '16px',
        padding: isMobile ? '16px' : '24px',
        marginBottom: isMobile ? '20px' : '32px',
        color: 'white',
      }}
    >
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '12px' : '20px', marginBottom: '16px' }}>
        <div
          style={{
            width: isMobile ? '44px' : '56px',
            height: isMobile ? '44px' : '56px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <AlertTriangle size={isMobile ? 22 : 28} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 800, marginBottom: '4px' }}>
            Complete Training to Activate Your Account
          </h3>
          <p style={{ fontSize: isMobile ? '13px' : '14px', opacity: 0.9 }}>
            You must complete all required modules before gaining full portal access.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '10px' : '16px' }}>
        <div
          style={{
            flex: 1,
            padding: '16px',
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            {coreComplete ? (
              <CheckCircle2 size={20} />
            ) : (
              <Clock size={20} />
            )}
            <span style={{ fontWeight: 700 }}>Core Training</span>
          </div>
          <div style={{ fontSize: '13px', opacity: 0.9 }}>
            {coreComplete ? 'Completed ✓' : 'In Progress'}
          </div>
        </div>
        <div
          style={{
            flex: 1,
            padding: '16px',
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            {roleComplete ? (
              <CheckCircle2 size={20} />
            ) : coreComplete ? (
              <Clock size={20} />
            ) : (
              <Lock size={20} />
            )}
            <span style={{ fontWeight: 700 }}>{SCOPE_LABELS[activationStatus.role_track]}</span>
          </div>
          <div style={{ fontSize: '13px', opacity: 0.9 }}>
            {roleComplete ? 'Completed ✓' : coreComplete ? 'Available' : 'Locked (Complete Core First)'}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT: InternTraining
// ============================================
const InternTraining: React.FC = () => {
  const { isMobile, isTablet } = useResponsive();
  const queryClient = useQueryClient();
  const [selectedScope, setSelectedScope] = useState<'all' | ModuleScope>('all');
  const [user, setUser] = useState<{ id: string; email: string; name?: string } | null>(null);
  const [certificateModal, setCertificateModal] = useState<Certification | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleWithProgress | null>(null);

  // Fetch user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser({ id: user.id, email: user.email || '', name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Intern' });
      }
    });
  }, []);

  // Fetch intern's activation status (includes role track)
  const { data: activationStatus, isLoading: activationLoading } = useQuery({
    queryKey: ['intern-activation-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('intern_activation_status')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as InternActivationStatus | null;
    },
    enabled: !!user?.id,
  });

  // Determine effective role track (use default if no activation status)
  const effectiveRoleTrack: ModuleScope = activationStatus?.role_track || 'MARKETING_GROWTH';

  // Fetch all modules relevant to this intern
  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ['training-modules', effectiveRoleTrack],
    queryFn: async () => {
      // Always include both CORE and role-specific modules
      const scopes: ModuleScope[] = ['CORE', effectiveRoleTrack];

      const { data, error } = await supabase
        .from('intern_training_modules')
        .select('*')
        .in('scope', scopes)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      
      return data as TrainingModule[];
    },
    enabled: true, // Always enabled - we want modules even without activation status
  });

  // Fetch user's progress for all modules
  const { data: progressList = [] } = useQuery({
    queryKey: ['module-progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('intern_module_progress')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data as ModuleProgress[];
    },
    enabled: !!user?.id,
  });

  // Fetch certifications
  const { data: certificationsList = [] } = useQuery({
    queryKey: ['certifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('intern_certifications')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data as Certification[];
    },
    enabled: !!user?.id,
  });

  // Fetch manual unlocks
  const { data: unlocksList = [] } = useQuery({
    queryKey: ['module-unlocks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('intern_module_unlocks')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data as { module_id: string }[];
    },
    enabled: !!user?.id,
  });

  // Create maps for quick lookup
  const progressMap = useMemo(() => {
    const map: Record<string, ModuleProgress> = {};
    progressList.forEach((p) => {
      map[p.module_id] = p;
    });
    return map;
  }, [progressList]);

  const certificationsMap = useMemo(() => {
    const map: Record<string, Certification> = {};
    certificationsList.forEach((c) => {
      map[c.module_id] = c;
    });
    return map;
  }, [certificationsList]);

  const unlocksSet = useMemo(() => {
    return new Set(unlocksList.map((u) => u.module_id));
  }, [unlocksList]);

  // Demo modules when database tables don't exist yet
  const demoModules: TrainingModule[] = useMemo(() => [
    // Core modules
    {
      id: 'core-1',
      name: 'Welcome to Crave\'n Delivery',
      description: 'Company culture, values, team structure, and expectations. Learn what makes Crave\'n unique and how you fit into our mission.',
      duration_minutes: 45,
      delivery_type: 'Video' as DeliveryType,
      scope: 'CORE' as ModuleScope,
      is_required: true,
      certification_issued: true,
      passing_score: null,
      prerequisite_module_ids: [],
      unlock_after_weeks: null,
      admin_unlock_only: false,
      performance_flag_required: false,
      content_url: null,
      content_json: {},
      sort_order: 1,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'core-2',
      name: 'Safety & Compliance Fundamentals',
      description: 'Essential safety protocols, regulatory compliance, ethics, and reporting obligations. This module requires a passing score of 80%.',
      duration_minutes: 60,
      delivery_type: 'Interactive' as DeliveryType,
      scope: 'CORE' as ModuleScope,
      is_required: true,
      certification_issued: true,
      passing_score: 80,
      prerequisite_module_ids: [],
      unlock_after_weeks: null,
      admin_unlock_only: false,
      performance_flag_required: false,
      content_url: null,
      content_json: {},
      sort_order: 2,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'core-3',
      name: 'Delivery Operations 101 (Intern Context)',
      description: 'Operational understanding, process flow awareness, and cross-team impact. Understand how delivery operations work from end to end.',
      duration_minutes: 90,
      delivery_type: 'Video' as DeliveryType,
      scope: 'CORE' as ModuleScope,
      is_required: true,
      certification_issued: true,
      passing_score: null,
      prerequisite_module_ids: [],
      unlock_after_weeks: null,
      admin_unlock_only: false,
      performance_flag_required: false,
      content_url: null,
      content_json: {},
      sort_order: 3,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'core-4',
      name: 'Customer Service Excellence',
      description: 'Communication standards, professional behavior, and handling difficult situations with grace and efficiency.',
      duration_minutes: 75,
      delivery_type: 'Interactive' as DeliveryType,
      scope: 'CORE' as ModuleScope,
      is_required: true,
      certification_issued: true,
      passing_score: null,
      prerequisite_module_ids: [],
      unlock_after_weeks: null,
      admin_unlock_only: false,
      performance_flag_required: false,
      content_url: null,
      content_json: {},
      sort_order: 4,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    // Marketing & Growth modules
    {
      id: 'mkt-1',
      name: 'Technology Platform Training',
      description: 'Master internal tools, marketing systems, and platform literacy. Learn the tech stack that powers our growth initiatives.',
      duration_minutes: 120,
      delivery_type: 'Interactive' as DeliveryType,
      scope: 'MARKETING_GROWTH' as ModuleScope,
      is_required: true,
      certification_issued: false,
      passing_score: null,
      prerequisite_module_ids: [],
      unlock_after_weeks: null,
      admin_unlock_only: false,
      performance_flag_required: false,
      content_url: null,
      content_json: {},
      sort_order: 10,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'mkt-2',
      name: 'Advanced Growth & Optimization',
      description: 'Campaign optimization techniques, growth strategy awareness, and data-driven decision making.',
      duration_minutes: 60,
      delivery_type: 'Document' as DeliveryType,
      scope: 'MARKETING_GROWTH' as ModuleScope,
      is_required: true,
      certification_issued: false,
      passing_score: null,
      prerequisite_module_ids: [],
      unlock_after_weeks: null,
      admin_unlock_only: false,
      performance_flag_required: false,
      content_url: null,
      content_json: {},
      sort_order: 11,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'mkt-3',
      name: 'Quality & Brand Assurance Standards',
      description: 'Brand protection, content quality guidelines, and public representation rules. Protect and enhance the Crave\'n brand.',
      duration_minutes: 45,
      delivery_type: 'Video' as DeliveryType,
      scope: 'MARKETING_GROWTH' as ModuleScope,
      is_required: true,
      certification_issued: false,
      passing_score: null,
      prerequisite_module_ids: [],
      unlock_after_weeks: null,
      admin_unlock_only: false,
      performance_flag_required: false,
      content_url: null,
      content_json: {},
      sort_order: 12,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'mkt-4',
      name: 'Team Leadership Basics',
      description: 'Leadership fundamentals and coordination basics. Unlock your potential as a future leader at Crave\'n.',
      duration_minutes: 90,
      delivery_type: 'Interactive' as DeliveryType,
      scope: 'MARKETING_GROWTH' as ModuleScope,
      is_required: false,
      certification_issued: false,
      passing_score: null,
      prerequisite_module_ids: [],
      unlock_after_weeks: 4,
      admin_unlock_only: false,
      performance_flag_required: false,
      content_url: null,
      content_json: {},
      sort_order: 99,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ], []);

  // Use demo modules if no real modules exist
  // Also ensure both CORE and role-specific modules are present
  const effectiveModules = useMemo(() => {
    if (modules.length === 0) {
      // Use demo modules filtered by effective role track
      return demoModules.filter(m => m.scope === 'CORE' || m.scope === effectiveRoleTrack);
    }
    
    // Check if we have both CORE and role-specific modules
    const hasCoreModules = modules.some(m => m.scope === 'CORE');
    const hasRoleModules = modules.some(m => m.scope === effectiveRoleTrack);
    
    const result: TrainingModule[] = [...modules];
    
    // Add demo CORE modules if missing from database
    if (!hasCoreModules) {
      const coreDemoModules = demoModules.filter(m => m.scope === 'CORE');
      result.unshift(...coreDemoModules);
    }
    
    // Add demo role-specific modules if missing from database
    if (!hasRoleModules) {
      const roleDemoModules = demoModules.filter(m => m.scope === effectiveRoleTrack);
      result.push(...roleDemoModules);
    }
    
    return result;
  }, [modules, effectiveRoleTrack]);

  // Compute module status based on prerequisites and unlock rules
  const modulesWithStatus: ModuleWithProgress[] = useMemo(() => {
    const coreModules = effectiveModules.filter((m) => m.scope === 'CORE').sort((a, b) => a.sort_order - b.sort_order);
    const allCoreCompleted = coreModules
      .filter((m) => m.is_required)
      .every((m) => progressMap[m.id]?.status === 'COMPLETED');

    return effectiveModules.map((module) => {
      const progress = progressMap[module.id] || null;
      const certification = certificationsMap[module.id] || null;
      const isManuallyUnlocked = unlocksSet.has(module.id);

      // Determine effective status
      let effectiveStatus: ModuleStatus = progress?.status || 'LOCKED';

      if (!progress || progress.status === 'LOCKED') {
        if (isManuallyUnlocked) {
          effectiveStatus = 'AVAILABLE';
        } else if (module.admin_unlock_only) {
          effectiveStatus = 'LOCKED';
        } else if (module.scope === 'CORE') {
          // Core modules unlock sequentially
          const moduleIndex = coreModules.findIndex((m) => m.id === module.id);
          if (moduleIndex === 0) {
            effectiveStatus = 'AVAILABLE';
          } else if (moduleIndex > 0) {
            const prevModule = coreModules[moduleIndex - 1];
            const prevProgress = progressMap[prevModule.id];
            effectiveStatus = prevProgress?.status === 'COMPLETED' ? 'AVAILABLE' : 'LOCKED';
          }
        } else {
          // Role-specific modules unlock after all required core modules are completed
          if (!allCoreCompleted) {
            effectiveStatus = 'LOCKED';
          } else {
            // Check prerequisites
            const prerequisitesMet =
              module.prerequisite_module_ids.length === 0 ||
              module.prerequisite_module_ids.every((prereqId) => {
                const prereqProgress = progressMap[prereqId];
                return prereqProgress?.status === 'COMPLETED';
              });

            effectiveStatus = prerequisitesMet ? 'AVAILABLE' : 'LOCKED';
          }
        }
      }

      return {
        ...module,
        progress,
        certification,
        effectiveStatus,
        isUnlocked: isManuallyUnlocked,
      };
    });
  }, [effectiveModules, progressMap, certificationsMap, unlocksSet]);

  // Calculate stats
  const stats: TrainingStats = useMemo(() => {
    const completed = modulesWithStatus.filter((m) => m.effectiveStatus === 'COMPLETED').length;
    const inProgress = modulesWithStatus.filter((m) => m.effectiveStatus === 'IN_PROGRESS').length;
    const available = modulesWithStatus.filter((m) => m.effectiveStatus === 'AVAILABLE').length;
    const locked = modulesWithStatus.filter((m) => m.effectiveStatus === 'LOCKED').length;
    const total = modulesWithStatus.length;

    const requiredModules = modulesWithStatus.filter((m) => m.is_required);
    const requiredCompleted = requiredModules.filter((m) => m.effectiveStatus === 'COMPLETED').length;
    const requiredTotal = requiredModules.length;

    const scores = modulesWithStatus
      .filter((m) => m.progress?.score !== null && m.progress?.score !== undefined)
      .map((m) => m.progress!.score!);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const certCount = certificationsList.length;

    const totalTimeMinutes = modulesWithStatus.reduce((acc, m) => acc + m.duration_minutes, 0);
    const timeSpentMinutes = progressList.reduce((acc, p) => acc + (p.time_spent_minutes || 0), 0);

    const overallProgress = calculateOverallProgress(modulesWithStatus, true);

    return {
      completed,
      inProgress,
      available,
      locked,
      total,
      requiredCompleted,
      requiredTotal,
      overallProgress,
      avgScore,
      certCount,
      totalTimeMinutes,
      timeSpentMinutes,
    };
  }, [modulesWithStatus, certificationsList, progressList]);

  // Start module mutation
  const startModuleMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase.from('intern_module_progress').upsert(
        {
          user_id: user.id,
          module_id: moduleId,
          status: 'IN_PROGRESS',
          progress_percent: 0,
          started_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,module_id' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-progress'] });
      queryClient.invalidateQueries({ queryKey: ['intern-activation-status'] });
    },
  });

  // Continue module (simulates progress for demo)
  const continueModuleMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const currentProgress = progressMap[moduleId];
      const newProgress = Math.min((currentProgress?.progress_percent || 0) + 25, 100);
      const isComplete = newProgress >= 100;

      const { error } = await supabase
        .from('intern_module_progress')
        .update({
          status: isComplete ? 'COMPLETED' : 'IN_PROGRESS',
          progress_percent: newProgress,
          score: isComplete ? Math.floor(Math.random() * 20) + 80 : null, // Random score 80-100
          completed_at: isComplete ? new Date().toISOString() : null,
          last_activity_at: new Date().toISOString(),
          time_spent_minutes: (currentProgress?.time_spent_minutes || 0) + 15,
          attempts: (currentProgress?.attempts || 0) + 1,
        })
        .eq('user_id', user.id)
        .eq('module_id', moduleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-progress'] });
      queryClient.invalidateQueries({ queryKey: ['certifications'] });
      queryClient.invalidateQueries({ queryKey: ['intern-activation-status'] });
    },
  });

  // Filter modules by scope
  const filteredModules =
    selectedScope === 'all'
      ? modulesWithStatus
      : modulesWithStatus.filter((m) => m.scope === selectedScope);

  // Group modules by scope
  const groupedModules = useMemo(() => {
    const groups: Record<ModuleScope, ModuleWithProgress[]> = {
      CORE: [],
      MARKETING_GROWTH: [],
      ENGINEERING_TECH: [],
      OPERATIONS_STRATEGY: [],
      FINANCE_ADMIN: [],
    };

    filteredModules.forEach((module) => {
      groups[module.scope].push(module);
    });

    return groups;
  }, [filteredModules]);

  // Get available scopes for filter
  const availableScopes = useMemo(() => {
    const scopes = new Set(effectiveModules.map((m) => m.scope));
    return ['all', ...Array.from(scopes)] as ('all' | ModuleScope)[];
  }, [effectiveModules]);

  const isLoading = activationLoading || modulesLoading;
  const isUpdating = startModuleMutation.isPending || continueModuleMutation.isPending;

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <RefreshCw
            size={40}
            style={{ color: '#ff5f1f', animation: 'spin 1s linear infinite', marginBottom: '16px' }}
          />
          <p style={{ color: '#6b7280', fontSize: '16px' }}>Loading training modules...</p>
        </div>
      </div>
    );
  }

  // Create a demo activation status if none exists (for preview purposes)
  const effectiveActivationStatus: InternActivationStatus = activationStatus || {
    id: 'demo',
    user_id: user?.id || 'demo',
    role_track: effectiveRoleTrack,
    core_modules_completed: false,
    role_modules_completed: false,
    is_activated: false,
    activated_at: null,
    onboarding_started_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* CSS for animations */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* Header */}
      <div style={{ marginBottom: isMobile ? '20px' : '32px' }}>
        <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '12px', marginBottom: '8px' }}>
          <h1 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 800, color: '#111827', margin: 0 }}>
            Training & Onboarding
          </h1>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: '20px',
              backgroundColor: SCOPE_COLORS[effectiveActivationStatus.role_track].bg,
              color: SCOPE_COLORS[effectiveActivationStatus.role_track].text,
            }}
          >
            {SCOPE_LABELS[effectiveActivationStatus.role_track]} Track
          </span>
        </div>
        <p style={{ fontSize: '16px', color: '#6b7280', margin: 0 }}>
          Complete the required modules to unlock full portal access and advance your career at Crave'n.
        </p>
      </div>

      {/* Demo Mode Banner */}
      {!activationStatus && (
        <div
          style={{
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            borderRadius: '16px',
            padding: '16px 24px',
            marginBottom: '24px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Sparkles size={24} />
          <div>
            <span style={{ fontWeight: 700 }}>Preview Mode</span>
            <span style={{ opacity: 0.9, marginLeft: '8px' }}>
              — Showing demo data. Run database migration to enable full functionality.
            </span>
          </div>
        </div>
      )}

      {/* Activation Banner */}
      <ActivationBanner activationStatus={effectiveActivationStatus} stats={stats} isMobile={isMobile} />

      {/* Stats Overview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: isMobile ? '10px' : '16px',
          marginBottom: isMobile ? '20px' : '32px',
        }}
      >
        <StatsCard
          icon={<TrendingUp size={26} />}
          label="Overall Progress"
          value={`${stats.overallProgress}%`}
          subtext={`${stats.requiredCompleted} of ${stats.requiredTotal} required`}
          color="#ff5f1f"
          bgColor="#fff4ed"
          isMobile={isMobile}
        />
        <StatsCard
          icon={<CheckCircle2 size={26} />}
          label="Completed"
          value={stats.completed}
          subtext={`${stats.total - stats.completed} remaining`}
          color="#10b981"
          bgColor="#ecfdf5"
          isMobile={isMobile}
        />
        <StatsCard
          icon={<Star size={26} />}
          label="Average Score"
          value={stats.avgScore > 0 ? `${stats.avgScore}%` : '—'}
          subtext="Across completed modules"
          color="#8b5cf6"
          bgColor="#f5f3ff"
          isMobile={isMobile}
        />
        <StatsCard
          icon={<Award size={26} />}
          label="Certifications"
          value={stats.certCount}
          subtext="Earned certificates"
          color="#f59e0b"
          bgColor="#fef3c7"
          isMobile={isMobile}
        />
      </div>

      {/* Scope Filter */}
      <div style={{ marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            backgroundColor: 'white',
            padding: '16px',
            borderRadius: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            border: '1px solid #e5e7eb',
          }}
        >
          {availableScopes.map((scope) => {
            const isActive = selectedScope === scope;
            const scopeModules = scope === 'all' ? modulesWithStatus : modulesWithStatus.filter((m) => m.scope === scope);
            const completedInScope = scopeModules.filter((m) => m.effectiveStatus === 'COMPLETED').length;

            return (
              <button
                key={scope}
                onClick={() => setSelectedScope(scope)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: isActive ? '#ff5f1f' : '#f3f4f6',
                  color: isActive ? 'white' : '#4b5563',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#e5e7eb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }
                }}
              >
                {scope === 'all' ? 'All Modules' : SCOPE_LABELS[scope]}
                <span
                  style={{
                    fontSize: '12px',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : '#e5e7eb',
                    color: isActive ? 'white' : '#6b7280',
                  }}
                >
                  {completedInScope}/{scopeModules.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modules by Section */}
      {Object.entries(groupedModules).map(([scope, scopeModules]) => {
        if (scopeModules.length === 0) return null;

        const scopeKey = scope as ModuleScope;
        const scopeColor = SCOPE_COLORS[scopeKey];

        return (
          <div key={scope} style={{ marginBottom: '40px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px',
                paddingBottom: '12px',
                borderBottom: `2px solid ${scopeColor.border}40`,
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '32px',
                  borderRadius: '4px',
                  backgroundColor: scopeColor.text,
                }}
              />
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>
                {SCOPE_LABELS[scopeKey]}
              </h2>
              <span
                style={{
                  fontSize: '13px',
                  color: '#6b7280',
                  backgroundColor: '#f3f4f6',
                  padding: '4px 12px',
                  borderRadius: '20px',
                }}
              >
                {scopeModules.filter((m) => m.effectiveStatus === 'COMPLETED').length} of {scopeModules.length} complete
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(400px, 1fr))',
                gap: isMobile ? '12px' : '20px',
              }}
            >
              {scopeModules.map((module) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  onStart={() => setActiveModule(module)}
                  onContinue={() => setActiveModule(module)}
                  onViewCertificate={setCertificateModal}
                  isUpdating={isUpdating}
                  isMobile={isMobile}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Help Section */}
      <div
        style={{
          marginTop: isMobile ? '24px' : '40px',
          background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
          border: '2px solid #3b82f6',
          borderRadius: '16px',
          padding: isMobile ? '16px' : '24px',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: isMobile ? '16px' : '20px',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            backgroundColor: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            flexShrink: 0,
          }}
        >
          <BookOpen size={28} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
            Need Help with Training?
          </h3>
          <p style={{ fontSize: '14px', color: '#4b5563', margin: 0 }}>
            Contact your training coordinator or visit our help center for technical support and questions.
          </p>
        </div>
        <button
          style={{
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2563eb';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#3b82f6';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          Get Support
          <ExternalLink size={16} />
        </button>
      </div>

      {/* Module Viewer */}
      {activeModule && (
        <ModuleViewer
          module={activeModule}
          progress={activeModule.progress}
          onClose={() => setActiveModule(null)}
          onProgressUpdate={() => {}}
          onComplete={(score) => { setActiveModule(null); }}
        />
      )}

      {/* Certificate Modal */}
      {certificateModal && (
        <CertificateGenerator
          certification={certificateModal}
          userName={user?.name || 'Intern'}
          onClose={() => setCertificateModal(null)}
        />
      )}
    </div>
  );
};

export default InternTraining;



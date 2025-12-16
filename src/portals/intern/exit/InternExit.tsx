import React, { useState, useMemo } from 'react';
import {
  LogOut,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  FileText,
  Shield,
  Key,
  Laptop,
  Users,
  Calendar,
  ChevronRight,
  ChevronDown,
  Download,
  ExternalLink,
  Info,
  XCircle,
  Building2,
  Mail,
  Phone,
  MessageSquare,
  Briefcase,
  Award,
  Heart,
  Star,
  Send,
  Lock,
  Unlock,
  ClipboardCheck,
  FileSignature,
  UserX,
  Database,
  Wifi,
  CreditCard,
  Package,
  Handshake,
} from 'lucide-react';

// Types
interface OffboardingStep {
  id: string;
  category: 'documentation' | 'access' | 'equipment' | 'knowledge' | 'hr';
  title: string;
  description: string;
  status: 'completed' | 'in_progress' | 'pending' | 'blocked';
  dueDate?: string;
  completedDate?: string;
  assignee: string;
  notes?: string;
  documents?: { name: string; url: string }[];
}

interface ExitDocument {
  id: string;
  name: string;
  type: 'required' | 'optional';
  status: 'signed' | 'pending' | 'not_started';
  dueDate: string;
  description: string;
}

interface ExitInterview {
  id: string;
  scheduledDate: string;
  interviewer: string;
  status: 'scheduled' | 'completed' | 'pending';
  location: string;
  duration: string;
}

type TabType = 'checklist' | 'documents' | 'timeline' | 'resources';

// Mock data
const mockOffboardingSteps: OffboardingStep[] = [
  {
    id: '1',
    category: 'documentation',
    title: 'Sign Separation Agreement',
    description: 'Review and sign the internship separation agreement',
    status: 'pending',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'HR Department',
    notes: 'Document will be sent via DocuSign',
  },
  {
    id: '2',
    category: 'documentation',
    title: 'IP Assignment Reaffirmation',
    description: 'Confirm all intellectual property created during internship',
    status: 'pending',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Legal Team',
    documents: [{ name: 'IP Assignment Form', url: '#' }],
  },
  {
    id: '3',
    category: 'knowledge',
    title: 'Knowledge Transfer Session',
    description: 'Document and transfer all project knowledge to team members',
    status: 'pending',
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Your Manager',
    notes: 'Schedule 2-hour session with your team',
  },
  {
    id: '4',
    category: 'knowledge',
    title: 'Update Documentation',
    description: 'Ensure all project documentation is up to date',
    status: 'pending',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'You',
  },
  {
    id: '5',
    category: 'access',
    title: 'System Access Revocation',
    description: 'All system access will be revoked on your last day',
    status: 'pending',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'IT Department',
    notes: 'Includes email, Slack, GitHub, and all internal tools',
  },
  {
    id: '6',
    category: 'access',
    title: 'Badge & Building Access',
    description: 'Return access badge and deactivate building entry',
    status: 'pending',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Security',
  },
  {
    id: '7',
    category: 'equipment',
    title: 'Return Company Equipment',
    description: 'Return laptop, monitors, and any other company equipment',
    status: 'pending',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'IT Department',
    notes: 'Schedule equipment return appointment',
  },
  {
    id: '8',
    category: 'hr',
    title: 'Exit Interview',
    description: 'Complete exit interview with HR',
    status: 'pending',
    dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'HR Department',
    notes: 'Will be scheduled separately',
  },
  {
    id: '9',
    category: 'hr',
    title: 'Final Timesheet Submission',
    description: 'Submit final hours and expense reports',
    status: 'pending',
    dueDate: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'You',
  },
  {
    id: '10',
    category: 'hr',
    title: 'Benefits Information',
    description: 'Review benefits continuation options (if applicable)',
    status: 'pending',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'HR Department',
  },
];

const mockDocuments: ExitDocument[] = [
  {
    id: '1',
    name: 'Separation Agreement',
    type: 'required',
    status: 'not_started',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Formal agreement confirming the end of your internship',
  },
  {
    id: '2',
    name: 'IP Assignment Reaffirmation',
    type: 'required',
    status: 'not_started',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Confirms all work created belongs to the company',
  },
  {
    id: '3',
    name: 'NDA Reminder',
    type: 'required',
    status: 'not_started',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Reminder of ongoing confidentiality obligations',
  },
  {
    id: '4',
    name: 'Equipment Return Form',
    type: 'required',
    status: 'not_started',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Inventory of all equipment being returned',
  },
  {
    id: '5',
    name: 'Reference Letter Request',
    type: 'optional',
    status: 'not_started',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Request a letter of recommendation from your manager',
  },
  {
    id: '6',
    name: 'Alumni Network Opt-In',
    type: 'optional',
    status: 'not_started',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Join our intern alumni network for future opportunities',
  },
];

const mockExitInterview: ExitInterview = {
  id: '1',
  scheduledDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
  interviewer: 'Sarah Chen (HR)',
  status: 'scheduled',
  location: 'Video Call (Link will be sent)',
  duration: '30 minutes',
};

const categoryConfig = {
  documentation: { icon: <FileText size={18} />, color: '#3b82f6', bgColor: '#eff6ff', label: 'Documentation' },
  access: { icon: <Key size={18} />, color: '#ef4444', bgColor: '#fef2f2', label: 'Access' },
  equipment: { icon: <Laptop size={18} />, color: '#8b5cf6', bgColor: '#f5f3ff', label: 'Equipment' },
  knowledge: { icon: <Database size={18} />, color: '#10b981', bgColor: '#ecfdf5', label: 'Knowledge' },
  hr: { icon: <Users size={18} />, color: '#f59e0b', bgColor: '#fef3c7', label: 'HR' },
};

const InternExit: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('checklist');
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  // Calculate progress
  const progress = useMemo(() => {
    const completed = mockOffboardingSteps.filter((s) => s.status === 'completed').length;
    const total = mockOffboardingSteps.length;
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatFullDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysUntil = (dateStr: string) => {
    const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  // Progress Ring Component
  const ProgressRing: React.FC<{
    value: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
  }> = ({ value, size = 120, strokeWidth = 10, color = '#ff5f1f' }) => {
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

  // Checklist Tab
  const ChecklistTab = () => {
    const stepsByCategory = useMemo(() => {
      const grouped: Record<string, OffboardingStep[]> = {};
      mockOffboardingSteps.forEach((step) => {
        if (!grouped[step.category]) grouped[step.category] = [];
        grouped[step.category].push(step);
      });
      return grouped;
    }, []);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {Object.entries(stepsByCategory).map(([category, steps]) => {
          const config = categoryConfig[category as keyof typeof categoryConfig];
          const categoryCompleted = steps.filter((s) => s.status === 'completed').length;

          return (
            <div
              key={category}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #e5e7eb',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>
                      {config.label}
                    </h3>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                      {categoryCompleted}/{steps.length} completed
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    position: 'relative',
                  }}
                >
                  <ProgressRing
                    value={(categoryCompleted / steps.length) * 100}
                    size={48}
                    strokeWidth={4}
                    color={config.color}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: config.color,
                    }}
                  >
                    {Math.round((categoryCompleted / steps.length) * 100)}%
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {steps.map((step) => {
                  const isExpanded = expandedStep === step.id;

                  return (
                    <div
                      key={step.id}
                      style={{
                        backgroundColor: '#fafafa',
                        borderRadius: '10px',
                        border: step.status === 'completed' ? '1px solid #86efac' : '1px solid #f3f4f6',
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                        style={{
                          width: '100%',
                          padding: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor:
                              step.status === 'completed'
                                ? '#10b981'
                                : step.status === 'in_progress'
                                ? '#f59e0b'
                                : '#e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {step.status === 'completed' ? (
                            <CheckCircle2 size={16} style={{ color: 'white' }} />
                          ) : step.status === 'in_progress' ? (
                            <Clock size={14} style={{ color: 'white' }} />
                          ) : (
                            <Circle size={14} style={{ color: '#9ca3af' }} />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4
                            style={{
                              fontSize: '14px',
                              fontWeight: 600,
                              color: step.status === 'completed' ? '#6b7280' : '#111827',
                              margin: 0,
                              textDecoration: step.status === 'completed' ? 'line-through' : 'none',
                            }}
                          >
                            {step.title}
                          </h4>
                          <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0 0' }}>
                            Assigned to: {step.assignee}
                          </p>
                        </div>
                        {step.dueDate && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '4px 10px',
                              borderRadius: '6px',
                              backgroundColor: getDaysUntil(step.dueDate) <= 3 ? '#fef2f2' : '#f3f4f6',
                              color: getDaysUntil(step.dueDate) <= 3 ? '#ef4444' : '#6b7280',
                            }}
                          >
                            {formatDate(step.dueDate)}
                          </span>
                        )}
                        <ChevronDown
                          size={18}
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
                            padding: '0 16px 16px',
                            borderTop: '1px solid #f3f4f6',
                            marginTop: '-4px',
                            paddingTop: '12px',
                          }}
                        >
                          <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 12px 0' }}>
                            {step.description}
                          </p>
                          {step.notes && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '8px',
                                padding: '10px',
                                backgroundColor: '#fef3c7',
                                borderRadius: '8px',
                                marginBottom: '12px',
                              }}
                            >
                              <Info size={14} style={{ color: '#f59e0b', marginTop: '2px', flexShrink: 0 }} />
                              <p style={{ fontSize: '12px', color: '#92400e', margin: 0 }}>{step.notes}</p>
                            </div>
                          )}
                          {step.documents && step.documents.length > 0 && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {step.documents.map((doc, idx) => (
                                <button
                                  key={idx}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid #e5e7eb',
                                    backgroundColor: 'white',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Download size={14} />
                                  {doc.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Documents Tab
  const DocumentsTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Required Documents */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e5e7eb',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
            }}
          >
            <FileSignature size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
              Required Documents
            </h3>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
              Must be completed before your last day
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {mockDocuments
            .filter((d) => d.type === 'required')
            .map((doc) => (
              <div
                key={doc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  backgroundColor: '#fafafa',
                  borderRadius: '10px',
                  border: '1px solid #f3f4f6',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor:
                        doc.status === 'signed'
                          ? '#ecfdf5'
                          : doc.status === 'pending'
                          ? '#fef3c7'
                          : '#f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color:
                        doc.status === 'signed'
                          ? '#10b981'
                          : doc.status === 'pending'
                          ? '#f59e0b'
                          : '#6b7280',
                    }}
                  >
                    {doc.status === 'signed' ? <CheckCircle2 size={20} /> : <FileText size={20} />}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
                      {doc.name}
                    </h4>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0 0' }}>
                      {doc.description}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor:
                        doc.status === 'signed'
                          ? '#ecfdf5'
                          : doc.status === 'pending'
                          ? '#fef3c7'
                          : '#f3f4f6',
                      color:
                        doc.status === 'signed'
                          ? '#10b981'
                          : doc.status === 'pending'
                          ? '#f59e0b'
                          : '#6b7280',
                    }}
                  >
                    {doc.status === 'signed' ? 'Signed' : doc.status === 'pending' ? 'Pending' : 'Not Started'}
                  </span>
                  <button
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: doc.status === 'not_started' ? '#ff5f1f' : '#e5e7eb',
                      color: doc.status === 'not_started' ? 'white' : '#6b7280',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: doc.status === 'not_started' ? 'pointer' : 'default',
                    }}
                  >
                    {doc.status === 'signed' ? 'View' : 'Sign'}
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Optional Documents */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e5e7eb',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#f5f3ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8b5cf6',
            }}
          >
            <FileText size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
              Optional Documents
            </h3>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
              Recommended but not required
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {mockDocuments
            .filter((d) => d.type === 'optional')
            .map((doc) => (
              <div
                key={doc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  backgroundColor: '#fafafa',
                  borderRadius: '10px',
                  border: '1px solid #f3f4f6',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: '#f5f3ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#8b5cf6',
                    }}
                  >
                    {doc.name.includes('Reference') ? <Award size={20} /> : <Heart size={20} />}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
                      {doc.name}
                    </h4>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0 0' }}>
                      {doc.description}
                    </p>
                  </div>
                </div>
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
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Request
                  <Send size={14} />
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  // Timeline Tab
  const TimelineTab = () => {
    const lastDay = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Last Day Countdown */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            borderRadius: '16px',
            padding: '32px',
            color: 'white',
            textAlign: 'center',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', opacity: 0.8 }}>
            Your Last Day
          </h3>
          <p style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
            {formatFullDate(lastDay.toISOString())}
          </p>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 20px',
              backgroundColor: 'rgba(255, 95, 31, 0.2)',
              borderRadius: '20px',
              marginTop: '12px',
            }}
          >
            <Clock size={18} style={{ color: '#ff5f1f' }} />
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#ff5f1f' }}>
              {getDaysUntil(lastDay.toISOString())} days remaining
            </span>
          </div>
        </div>

        {/* Exit Interview */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
              }}
            >
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
                Exit Interview
              </h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                Share your experience and feedback
              </p>
            </div>
          </div>
          <div
            style={{
              padding: '20px',
              backgroundColor: '#f0fdf4',
              borderRadius: '12px',
              border: '2px solid #86efac',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '12px', color: '#065f46', marginBottom: '4px' }}>Date & Time</p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
                  {formatFullDate(mockExitInterview.scheduledDate)}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#065f46', marginBottom: '4px' }}>Duration</p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
                  {mockExitInterview.duration}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#065f46', marginBottom: '4px' }}>Interviewer</p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
                  {mockExitInterview.interviewer}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#065f46', marginBottom: '4px' }}>Location</p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
                  {mockExitInterview.location}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#10b981',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <Calendar size={16} />
                Add to Calendar
              </button>
              <button
                style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: 'white',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Reschedule
              </button>
            </div>
          </div>
        </div>

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
            Offboarding Timeline
          </h3>
          <div style={{ position: 'relative', paddingLeft: '32px' }}>
            <div
              style={{
                position: 'absolute',
                left: '11px',
                top: '8px',
                bottom: '8px',
                width: '2px',
                backgroundColor: '#e5e7eb',
              }}
            />
            {[
              { day: 'Week 1', items: ['Update documentation', 'Knowledge transfer planning'] },
              { day: 'Week 2', items: ['Knowledge transfer sessions', 'Sign required documents', 'Exit interview'] },
              { day: 'Last Day', items: ['Return equipment', 'Final goodbyes', 'Access revocation'] },
            ].map((week, idx) => (
              <div key={idx} style={{ marginBottom: '24px', position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '-32px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: idx === 0 ? '#ff5f1f' : '#f3f4f6',
                    border: idx === 0 ? 'none' : '2px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {idx === 0 && <Circle size={8} style={{ color: 'white', fill: 'white' }} />}
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
                  {week.day}
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {week.items.map((item, i) => (
                    <li key={i} style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Resources Tab
  const ResourcesTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Contact Information */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e5e7eb',
        }}
      >
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '20px' }}>
          Key Contacts
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          {[
            { name: 'HR Department', email: 'hr@craven.com', phone: '(555) 123-4567', icon: <Users size={20} /> },
            { name: 'IT Support', email: 'it@craven.com', phone: '(555) 123-4568', icon: <Laptop size={20} /> },
            { name: 'Your Manager', email: 'sarah.chen@craven.com', phone: '(555) 123-4569', icon: <Briefcase size={20} /> },
            { name: 'Legal Team', email: 'legal@craven.com', phone: '(555) 123-4570', icon: <Shield size={20} /> },
          ].map((contact, idx) => (
            <div
              key={idx}
              style={{
                padding: '16px',
                backgroundColor: '#fafafa',
                borderRadius: '10px',
                border: '1px solid #f3f4f6',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#3b82f6',
                  }}
                >
                  {contact.icon}
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
                  {contact.name}
                </h4>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={14} style={{ color: '#6b7280' }} />
                  <span style={{ fontSize: '13px', color: '#3b82f6' }}>{contact.email}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Phone size={14} style={{ color: '#6b7280' }} />
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>{contact.phone}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQs */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e5e7eb',
        }}
      >
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '20px' }}>
          Frequently Asked Questions
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { q: 'When will I receive my final paycheck?', a: 'Final paychecks are processed on the next regular pay date following your last day.' },
            { q: 'Can I keep my work email address?', a: 'No, all company email addresses are deactivated on your last day. Make sure to save any personal contacts.' },
            { q: 'What happens to my benefits?', a: 'As an intern, standard benefits end on your last day. HR will provide information about any applicable continuation options.' },
            { q: 'Can I get a reference letter?', a: 'Yes! Request a reference letter from your manager before your last day using the optional documents section.' },
          ].map((faq, idx) => (
            <div
              key={idx}
              style={{
                padding: '16px',
                backgroundColor: '#fafafa',
                borderRadius: '10px',
              }}
            >
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
                {faq.q}
              </h4>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Alumni Network */}
      <div
        style={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
          borderRadius: '12px',
          padding: '24px',
          color: 'white',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Handshake size={28} />
          <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Join Our Alumni Network</h3>
        </div>
        <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '20px', lineHeight: 1.6 }}>
          Stay connected with Crave'N! Our alumni network offers exclusive job opportunities, networking events, and the chance to mentor future interns.
        </p>
        <button
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'white',
            color: '#8b5cf6',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Star size={16} />
          Join the Network
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#111827', marginBottom: '4px' }}>
          Exit & Offboarding
        </h1>
        <p style={{ fontSize: '15px', color: '#6b7280' }}>
          Complete your offboarding checklist and prepare for your transition
        </p>
      </div>

      {/* Status Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ff5f1f 0%, #ff8c42 100%)',
          borderRadius: '16px',
          padding: '24px 32px',
          marginBottom: '24px',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ position: 'relative' }}>
            <ProgressRing value={progress.percentage} size={80} strokeWidth={6} color="white" />
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <p style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>{progress.percentage}%</p>
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>
              Offboarding Progress
            </h2>
            <p style={{ fontSize: '14px', opacity: 0.9 }}>
              {progress.completed} of {progress.total} tasks completed
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '4px' }}>Last Day</p>
          <p style={{ fontSize: '20px', fontWeight: 700 }}>
            {formatDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString())}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          backgroundColor: '#f3f4f6',
          padding: '4px',
          borderRadius: '12px',
          marginBottom: '24px',
          width: 'fit-content',
        }}
      >
        {[
          { key: 'checklist' as TabType, label: 'Checklist', icon: <ClipboardCheck size={16} /> },
          { key: 'documents' as TabType, label: 'Documents', icon: <FileText size={16} /> },
          { key: 'timeline' as TabType, label: 'Timeline', icon: <Calendar size={16} /> },
          { key: 'resources' as TabType, label: 'Resources', icon: <Info size={16} /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === tab.key ? 'white' : 'transparent',
              color: activeTab === tab.key ? '#111827' : '#6b7280',
              fontSize: '14px',
              fontWeight: activeTab === tab.key ? 600 : 500,
              cursor: 'pointer',
              boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'checklist' && <ChecklistTab />}
      {activeTab === 'documents' && <DocumentsTab />}
      {activeTab === 'timeline' && <TimelineTab />}
      {activeTab === 'resources' && <ResourcesTab />}
    </div>
  );
};

export default InternExit;

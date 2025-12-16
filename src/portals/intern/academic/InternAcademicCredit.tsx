import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  School,
  Clock,
  Calendar,
  FileText,
  Upload,
  CheckCircle2,
  Circle,
  AlertCircle,
  XCircle,
  ChevronRight,
  ChevronDown,
  Download,
  ExternalLink,
  Info,
  Star,
  User,
  Mail,
  Building2,
  BookOpen,
  ClipboardCheck,
  FileSignature,
  AlertTriangle,
  Send,
  Eye,
  Edit3,
  Save,
  X,
  Plus,
  Trash2,
  Award,
  TrendingUp,
  Users,
  Briefcase,
} from 'lucide-react';

// Types
type CreditStatus = 'not_seeking' | 'seeking_pending' | 'approved' | 'completed';
type DocumentType = 'learning_agreement' | 'syllabus' | 'faculty_approval' | 'university_form' | 'other';
type ApprovalStatus = 'pending' | 'approved' | 'rejected';
type EvaluationType = 'midterm' | 'final';
type CreditRecommendation = 'satisfactory' | 'unsatisfactory';

interface AcademicCreditRecord {
  id: string;
  internId: string;
  creditStatus: CreditStatus;
  schoolName: string;
  department: string;
  program: string;
  courseCode: string;
  term: string;
  requiredHours: number;
  weeklyMinHours: number;
  approvalDeadline: string;
  facultyName: string;
  facultyEmail: string;
  supervisorConfirmedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface CreditDocument {
  id: string;
  documentType: DocumentType;
  fileName: string;
  fileUrl: string;
  uploadedBy: 'intern' | 'supervisor' | 'admin';
  approvalStatus: ApprovalStatus;
  rejectionReason?: string;
  createdAt: string;
}

interface TimeLog {
  id: string;
  weekStart: string;
  weekEnd: string;
  hoursWorked: number;
  tasksPerformed: string;
  learningOutcomes: string;
  internAttestation: boolean;
  supervisorApproved: boolean;
  approvedAt?: string;
  createdAt: string;
}

interface Evaluation {
  id: string;
  evaluationType: EvaluationType;
  professionalism: number;
  skillDevelopment: number;
  learningProgress: number;
  attendance: number;
  overallPerformance: number;
  feedback: string;
  totalHoursVerified: number;
  creditRecommendation: CreditRecommendation;
  supervisorSignature?: string;
  signedAt?: string;
  createdAt: string;
}

type TabType = 'overview' | 'documents' | 'time_logs' | 'evaluations';

// Mock data
const mockCreditRecord: AcademicCreditRecord = {
  id: '1',
  internId: 'user-1',
  creditStatus: 'approved',
  schoolName: 'California State University, Northridge',
  department: 'Computer Science',
  program: 'Bachelor of Science in Computer Science',
  courseCode: 'COMP 499',
  term: 'Spring 2025',
  requiredHours: 120,
  weeklyMinHours: 10,
  approvalDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  facultyName: 'Dr. Sarah Johnson',
  facultyEmail: 's.johnson@csun.edu',
  supervisorConfirmedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
};

const mockDocuments: CreditDocument[] = [
  {
    id: '1',
    documentType: 'learning_agreement',
    fileName: 'Learning_Agreement_Spring2025.pdf',
    fileUrl: '#',
    uploadedBy: 'intern',
    approvalStatus: 'approved',
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    documentType: 'syllabus',
    fileName: 'COMP499_Syllabus.pdf',
    fileUrl: '#',
    uploadedBy: 'intern',
    approvalStatus: 'approved',
    createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    documentType: 'faculty_approval',
    fileName: 'Faculty_Approval_Letter.pdf',
    fileUrl: '#',
    uploadedBy: 'admin',
    approvalStatus: 'pending',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const mockTimeLogs: TimeLog[] = [
  {
    id: '1',
    weekStart: '2025-01-06',
    weekEnd: '2025-01-12',
    hoursWorked: 12,
    tasksPerformed: 'Completed user authentication module, fixed navigation bugs, participated in code review',
    learningOutcomes: 'Learned about OAuth 2.0 implementation, improved debugging skills',
    internAttestation: true,
    supervisorApproved: true,
    approvedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    weekStart: '2025-01-13',
    weekEnd: '2025-01-19',
    hoursWorked: 15,
    tasksPerformed: 'Developed dashboard components, integrated API endpoints, wrote unit tests',
    learningOutcomes: 'Gained experience with React hooks, learned testing best practices',
    internAttestation: true,
    supervisorApproved: true,
    approvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    weekStart: '2025-01-20',
    weekEnd: '2025-01-26',
    hoursWorked: 10,
    tasksPerformed: 'Working on performance optimization, database queries',
    learningOutcomes: 'Learning about query optimization and caching strategies',
    internAttestation: true,
    supervisorApproved: false,
    createdAt: new Date().toISOString(),
  },
];

const mockEvaluations: Evaluation[] = [
  {
    id: '1',
    evaluationType: 'midterm',
    professionalism: 5,
    skillDevelopment: 4,
    learningProgress: 5,
    attendance: 5,
    overallPerformance: 4,
    feedback: 'Excellent progress so far. Shows strong initiative and willingness to learn. Communication skills are outstanding.',
    totalHoursVerified: 37,
    creditRecommendation: 'satisfactory',
    supervisorSignature: 'Sarah Chen',
    signedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const statusConfig = {
  not_seeking: { color: '#6b7280', bgColor: '#f3f4f6', label: 'Not Seeking Credit' },
  seeking_pending: { color: '#f59e0b', bgColor: '#fef3c7', label: 'Pending Approval' },
  approved: { color: '#10b981', bgColor: '#ecfdf5', label: 'Approved' },
  completed: { color: '#3b82f6', bgColor: '#eff6ff', label: 'Completed' },
};

const documentTypeConfig = {
  learning_agreement: { label: 'Learning Agreement', icon: <FileSignature size={16} /> },
  syllabus: { label: 'Course Syllabus', icon: <BookOpen size={16} /> },
  faculty_approval: { label: 'Faculty Approval', icon: <Award size={16} /> },
  university_form: { label: 'University Form', icon: <Building2 size={16} /> },
  other: { label: 'Other Document', icon: <FileText size={16} /> },
};

const approvalStatusConfig = {
  pending: { color: '#f59e0b', bgColor: '#fef3c7', label: 'Pending' },
  approved: { color: '#10b981', bgColor: '#ecfdf5', label: 'Approved' },
  rejected: { color: '#ef4444', bgColor: '#fef2f2', label: 'Rejected' },
};

const InternAcademicCredit: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showTimeLogModal, setShowTimeLogModal] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Calculate stats
  const stats = useMemo(() => {
    const totalApprovedHours = mockTimeLogs
      .filter((log) => log.supervisorApproved)
      .reduce((acc, log) => acc + log.hoursWorked, 0);
    const totalLoggedHours = mockTimeLogs.reduce((acc, log) => acc + log.hoursWorked, 0);
    const approvedDocs = mockDocuments.filter((d) => d.approvalStatus === 'approved').length;
    const pendingDocs = mockDocuments.filter((d) => d.approvalStatus === 'pending').length;
    const progressPercent = Math.min(100, Math.round((totalApprovedHours / mockCreditRecord.requiredHours) * 100));
    const daysUntilDeadline = Math.ceil(
      (new Date(mockCreditRecord.approvalDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return {
      totalApprovedHours,
      totalLoggedHours,
      approvedDocs,
      pendingDocs,
      progressPercent,
      daysUntilDeadline,
      hasMidterm: mockEvaluations.some((e) => e.evaluationType === 'midterm'),
      hasFinal: mockEvaluations.some((e) => e.evaluationType === 'final'),
    };
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatWeekRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
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

  // Rating Stars Component
  const RatingStars: React.FC<{ rating: number; label: string }> = ({ rating, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
      <span style={{ fontSize: '13px', color: '#6b7280' }}>{label}</span>
      <div style={{ display: 'flex', gap: '4px' }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={16}
            style={{
              color: i <= rating ? '#f59e0b' : '#e5e7eb',
              fill: i <= rating ? '#f59e0b' : 'none',
            }}
          />
        ))}
      </div>
    </div>
  );

  // Overview Tab
  const OverviewTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Status Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
          borderRadius: '16px',
          padding: '32px',
          color: 'white',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <GraduationCap size={32} />
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>Academic Credit Tracking</h2>
                <p style={{ fontSize: '14px', opacity: 0.9, margin: '4px 0 0 0' }}>
                  {mockCreditRecord.courseCode} • {mockCreditRecord.term}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '24px', marginTop: '20px' }}>
              <div>
                <p style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>Status</p>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    padding: '6px 14px',
                    borderRadius: '20px',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                  }}
                >
                  {statusConfig[mockCreditRecord.creditStatus].label}
                </span>
              </div>
              <div>
                <p style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>School</p>
                <p style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>{mockCreditRecord.schoolName}</p>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <ProgressRing value={stats.progressPercent} size={140} strokeWidth={12} color="white" />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <p style={{ fontSize: '32px', fontWeight: 800, margin: 0 }}>{stats.totalApprovedHours}</p>
                <p style={{ fontSize: '12px', opacity: 0.8, margin: 0 }}>/ {mockCreditRecord.requiredHours} hrs</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {[
          { icon: <Clock size={24} />, label: 'Hours Logged', value: `${stats.totalLoggedHours}`, color: '#3b82f6' },
          { icon: <CheckCircle2 size={24} />, label: 'Hours Approved', value: `${stats.totalApprovedHours}`, color: '#10b981' },
          { icon: <FileText size={24} />, label: 'Documents', value: `${stats.approvedDocs}/${mockDocuments.length}`, color: '#8b5cf6' },
          { icon: <Calendar size={24} />, label: 'Days to Deadline', value: `${stats.daysUntilDeadline}`, color: stats.daysUntilDeadline < 14 ? '#ef4444' : '#f59e0b' },
        ].map((stat, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: `${stat.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: stat.color,
              }}
            >
              {stat.icon}
            </div>
            <div>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>{stat.label}</p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Academic Information */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
              Academic Information
            </h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                backgroundColor: 'white',
                fontSize: '13px',
                fontWeight: 500,
                color: '#374151',
                cursor: 'pointer',
              }}
            >
              <Edit3 size={14} />
              Edit
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { label: 'School', value: mockCreditRecord.schoolName, icon: <School size={16} /> },
              { label: 'Department', value: mockCreditRecord.department, icon: <Building2 size={16} /> },
              { label: 'Program', value: mockCreditRecord.program, icon: <BookOpen size={16} /> },
              { label: 'Course Code', value: mockCreditRecord.courseCode, icon: <FileText size={16} /> },
              { label: 'Term', value: mockCreditRecord.term, icon: <Calendar size={16} /> },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: '#fafafa',
                  borderRadius: '8px',
                }}
              >
                <div style={{ color: '#6b7280' }}>{item.icon}</div>
                <div>
                  <p style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>{item.label}</p>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#111827', margin: 0 }}>{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Faculty & Requirements */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e5e7eb',
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '20px' }}>
            Faculty & Requirements
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                padding: '16px',
                backgroundColor: '#f0fdf4',
                borderRadius: '10px',
                border: '1px solid #86efac',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 600,
                  }}
                >
                  {mockCreditRecord.facultyName.charAt(0)}
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
                    {mockCreditRecord.facultyName}
                  </p>
                  <p style={{ fontSize: '12px', color: '#10b981', margin: 0 }}>Faculty Advisor</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={14} style={{ color: '#6b7280' }} />
                <a href={`mailto:${mockCreditRecord.facultyEmail}`} style={{ fontSize: '13px', color: '#3b82f6' }}>
                  {mockCreditRecord.facultyEmail}
                </a>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '16px', backgroundColor: '#fafafa', borderRadius: '10px' }}>
                <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Required Hours</p>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>
                  {mockCreditRecord.requiredHours}
                </p>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#fafafa', borderRadius: '10px' }}>
                <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Weekly Minimum</p>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>
                  {mockCreditRecord.weeklyMinHours}
                </p>
              </div>
            </div>

            <div
              style={{
                padding: '16px',
                backgroundColor: stats.daysUntilDeadline < 14 ? '#fef2f2' : '#fef3c7',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <AlertTriangle size={20} style={{ color: stats.daysUntilDeadline < 14 ? '#ef4444' : '#f59e0b' }} />
              <div>
                <p style={{ fontSize: '12px', color: stats.daysUntilDeadline < 14 ? '#991b1b' : '#92400e', marginBottom: '2px' }}>
                  Approval Deadline
                </p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
                  {formatDate(mockCreditRecord.approvalDeadline)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e5e7eb',
        }}
      >
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '20px' }}>
          Recent Activity
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {mockTimeLogs.slice(0, 3).map((log) => (
            <div
              key={log.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                backgroundColor: '#fafafa',
                borderRadius: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor: log.supervisorApproved ? '#ecfdf5' : '#fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: log.supervisorApproved ? '#10b981' : '#f59e0b',
                  }}
                >
                  <Clock size={20} />
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
                    {formatWeekRange(log.weekStart, log.weekEnd)}
                  </p>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0 0' }}>
                    {log.hoursWorked} hours logged
                  </p>
                </div>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: log.supervisorApproved ? '#ecfdf5' : '#fef3c7',
                  color: log.supervisorApproved ? '#10b981' : '#f59e0b',
                }}
              >
                {log.supervisorApproved ? 'Approved' : 'Pending'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Documents Tab
  const DocumentsTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Upload Section */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e5e7eb',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
              Required Documents
            </h3>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
              Upload documents required by your academic institution
            </p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#ff5f1f',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Upload size={16} />
            Upload Document
          </button>
        </div>

        {/* Document Types Checklist */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {Object.entries(documentTypeConfig).map(([type, config]) => {
            const doc = mockDocuments.find((d) => d.documentType === type);
            const hasApproved = doc?.approvalStatus === 'approved';

            return (
              <div
                key={type}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px',
                  backgroundColor: hasApproved ? '#ecfdf5' : '#fafafa',
                  borderRadius: '10px',
                  border: hasApproved ? '1px solid #86efac' : '1px solid #f3f4f6',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: hasApproved ? '#10b981' : '#e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: hasApproved ? 'white' : '#6b7280',
                  }}
                >
                  {hasApproved ? <CheckCircle2 size={16} /> : config.icon}
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827', margin: 0 }}>
                    {config.label}
                  </p>
                  <p style={{ fontSize: '11px', color: hasApproved ? '#10b981' : '#9ca3af', margin: 0 }}>
                    {hasApproved ? 'Approved' : doc ? 'Pending Review' : 'Not Uploaded'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Document List */}
        <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>
          Uploaded Documents
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {mockDocuments.map((doc) => {
            const typeConfig = documentTypeConfig[doc.documentType];
            const statusConf = approvalStatusConfig[doc.approvalStatus];

            return (
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
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      backgroundColor: '#eff6ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#3b82f6',
                    }}
                  >
                    <FileText size={22} />
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
                      {doc.fileName}
                    </p>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0 0' }}>
                      {typeConfig.label} • Uploaded {formatDate(doc.createdAt)}
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
                      backgroundColor: statusConf.bgColor,
                      color: statusConf.color,
                    }}
                  >
                    {statusConf.label}
                  </span>
                  <button
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
                    Download
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Box */}
      <div
        style={{
          padding: '20px',
          backgroundColor: '#eff6ff',
          borderRadius: '12px',
          border: '1px solid #bfdbfe',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
        }}
      >
        <Info size={20} style={{ color: '#3b82f6', marginTop: '2px', flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e40af', margin: '0 0 4px 0' }}>
            Document Requirements
          </p>
          <p style={{ fontSize: '13px', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
            At least one document must be approved before your credit status can move to "Approved". 
            Please ensure all documents are legible and properly signed where required.
          </p>
        </div>
      </div>
    </div>
  );

  // Time Logs Tab
  const TimeLogsTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Summary Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ff5f1f 0%, #ff8c42 100%)',
          borderRadius: '16px',
          padding: '24px 32px',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Hours Progress</h3>
          <p style={{ fontSize: '14px', opacity: 0.9 }}>
            {mockCreditRecord.requiredHours - stats.totalApprovedHours} hours remaining to complete requirement
          </p>
        </div>
        <div style={{ display: 'flex', gap: '32px' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '32px', fontWeight: 800, margin: 0 }}>{stats.totalApprovedHours}</p>
            <p style={{ fontSize: '12px', opacity: 0.8 }}>Approved</p>
          </div>
          <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.3)' }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '32px', fontWeight: 800, margin: 0 }}>{stats.totalLoggedHours - stats.totalApprovedHours}</p>
            <p style={{ fontSize: '12px', opacity: 0.8 }}>Pending</p>
          </div>
          <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.3)' }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '32px', fontWeight: 800, margin: 0 }}>{mockCreditRecord.requiredHours}</p>
            <p style={{ fontSize: '12px', opacity: 0.8 }}>Required</p>
          </div>
        </div>
      </div>

      {/* Log New Hours */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e5e7eb',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
              Weekly Time Logs
            </h3>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
              Log your hours weekly for supervisor approval
            </p>
          </div>
          <button
            onClick={() => setShowTimeLogModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#ff5f1f',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            Log Hours
          </button>
        </div>

        {/* Time Log List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {mockTimeLogs.map((log) => {
            const isExpanded = expandedLog === log.id;

            return (
              <div
                key={log.id}
                style={{
                  backgroundColor: '#fafafa',
                  borderRadius: '12px',
                  border: log.supervisorApproved ? '1px solid #86efac' : '1px solid #f3f4f6',
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                  style={{
                    width: '100%',
                    padding: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        backgroundColor: log.supervisorApproved ? '#ecfdf5' : '#fef3c7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: log.supervisorApproved ? '#10b981' : '#f59e0b',
                      }}
                    >
                      {log.supervisorApproved ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                    </div>
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0 }}>
                        {formatWeekRange(log.weekStart, log.weekEnd)}
                      </p>
                      <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                        {log.internAttestation ? 'Attested by intern' : 'Awaiting attestation'}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>
                        {log.hoursWorked}
                      </p>
                      <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>hours</p>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '4px 12px',
                        borderRadius: '6px',
                        backgroundColor: log.supervisorApproved ? '#ecfdf5' : '#fef3c7',
                        color: log.supervisorApproved ? '#10b981' : '#f59e0b',
                      }}
                    >
                      {log.supervisorApproved ? 'Approved' : 'Pending'}
                    </span>
                    <ChevronDown
                      size={20}
                      style={{
                        color: '#9ca3af',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }}
                    />
                  </div>
                </button>
                {isExpanded && (
                  <div
                    style={{
                      padding: '0 18px 18px',
                      borderTop: '1px solid #f3f4f6',
                      marginTop: '-4px',
                      paddingTop: '16px',
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px' }}>
                          Tasks Performed
                        </p>
                        <p style={{ fontSize: '13px', color: '#374151', margin: 0, lineHeight: 1.5 }}>
                          {log.tasksPerformed}
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px' }}>
                          Learning Outcomes
                        </p>
                        <p style={{ fontSize: '13px', color: '#374151', margin: 0, lineHeight: 1.5 }}>
                          {log.learningOutcomes}
                        </p>
                      </div>
                    </div>
                    {!log.supervisorApproved && (
                      <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                        <button
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb',
                            backgroundColor: 'white',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: '#374151',
                            cursor: 'pointer',
                          }}
                        >
                          <Edit3 size={14} />
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Rules Notice */}
      <div
        style={{
          padding: '16px 20px',
          backgroundColor: '#fef3c7',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <AlertTriangle size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
        <p style={{ fontSize: '13px', color: '#92400e', margin: 0 }}>
          Time logs cannot be edited after supervisor approval. Logs can only be submitted for the current week or up to 7 days retroactively.
        </p>
      </div>
    </div>
  );

  // Evaluations Tab
  const EvaluationsTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Evaluation Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {(['midterm', 'final'] as EvaluationType[]).map((type) => {
          const evaluation = mockEvaluations.find((e) => e.evaluationType === type);
          const isCompleted = !!evaluation?.supervisorSignature;

          return (
            <div
              key={type}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                border: isCompleted ? '2px solid #86efac' : '1px solid #e5e7eb',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      backgroundColor: isCompleted ? '#ecfdf5' : '#f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isCompleted ? '#10b981' : '#6b7280',
                    }}
                  >
                    {isCompleted ? <CheckCircle2 size={24} /> : <ClipboardCheck size={24} />}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0, textTransform: 'capitalize' }}>
                      {type} Evaluation
                    </h4>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0 0' }}>
                      {isCompleted ? `Completed ${formatDate(evaluation!.signedAt!)}` : 'Pending supervisor review'}
                    </p>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '4px 12px',
                    borderRadius: '6px',
                    backgroundColor: isCompleted ? '#ecfdf5' : '#f3f4f6',
                    color: isCompleted ? '#10b981' : '#6b7280',
                  }}
                >
                  {isCompleted ? 'Completed' : 'Pending'}
                </span>
              </div>

              {evaluation && (
                <>
                  <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                    <RatingStars rating={evaluation.professionalism} label="Professionalism" />
                    <RatingStars rating={evaluation.skillDevelopment} label="Skill Development" />
                    <RatingStars rating={evaluation.learningProgress} label="Learning Progress" />
                    <RatingStars rating={evaluation.attendance} label="Attendance" />
                    <RatingStars rating={evaluation.overallPerformance} label="Overall Performance" />
                  </div>

                  <div style={{ marginTop: '16px', padding: '14px', backgroundColor: '#fafafa', borderRadius: '8px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '6px' }}>
                      Feedback
                    </p>
                    <p style={{ fontSize: '13px', color: '#374151', margin: 0, lineHeight: 1.5 }}>
                      {evaluation.feedback}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Hours Verified</p>
                      <p style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
                        {evaluation.totalHoursVerified}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Recommendation</p>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          padding: '4px 12px',
                          borderRadius: '6px',
                          backgroundColor: evaluation.creditRecommendation === 'satisfactory' ? '#ecfdf5' : '#fef2f2',
                          color: evaluation.creditRecommendation === 'satisfactory' ? '#10b981' : '#ef4444',
                          textTransform: 'capitalize',
                        }}
                      >
                        {evaluation.creditRecommendation}
                      </span>
                    </div>
                  </div>

                  {evaluation.supervisorSignature && (
                    <div
                      style={{
                        marginTop: '16px',
                        padding: '12px',
                        backgroundColor: '#f0fdf4',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <FileSignature size={16} style={{ color: '#10b981' }} />
                      <div>
                        <p style={{ fontSize: '11px', color: '#065f46', margin: 0 }}>Signed by</p>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#065f46', margin: 0 }}>
                          {evaluation.supervisorSignature}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {!evaluation && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <Circle size={48} style={{ color: '#e5e7eb', marginBottom: '12px' }} />
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                    Evaluation not yet submitted
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Export Options */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e5e7eb',
        }}
      >
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>
          Export Documents
        </h3>
        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
          Generate official documents for university submission
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          {[
            { label: 'Credit Verification Letter', icon: <Award size={16} /> },
            { label: 'Hours Summary Report', icon: <Clock size={16} /> },
            { label: 'Supervisor Evaluation PDF', icon: <FileSignature size={16} /> },
          ].map((doc, idx) => (
            <button
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 18px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                backgroundColor: 'white',
                fontSize: '13px',
                fontWeight: 500,
                color: '#374151',
                cursor: 'pointer',
              }}
            >
              {doc.icon}
              {doc.label}
              <Download size={14} style={{ marginLeft: '4px' }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#111827', marginBottom: '4px' }}>
          Academic Credit
        </h1>
        <p style={{ fontSize: '15px', color: '#6b7280' }}>
          Track your academic credit requirements, hours, and evaluations
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
          marginBottom: '24px',
          width: 'fit-content',
        }}
      >
        {[
          { key: 'overview' as TabType, label: 'Overview', icon: <GraduationCap size={16} /> },
          { key: 'documents' as TabType, label: 'Documents', icon: <FileText size={16} /> },
          { key: 'time_logs' as TabType, label: 'Time Logs', icon: <Clock size={16} /> },
          { key: 'evaluations' as TabType, label: 'Evaluations', icon: <ClipboardCheck size={16} /> },
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
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'documents' && <DocumentsTab />}
      {activeTab === 'time_logs' && <TimeLogsTab />}
      {activeTab === 'evaluations' && <EvaluationsTab />}

      {/* Compliance Disclaimer */}
      <div
        style={{
          marginTop: '32px',
          padding: '20px',
          backgroundColor: '#f9fafb',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <Info size={18} style={{ color: '#6b7280', marginTop: '2px', flexShrink: 0 }} />
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
            <strong>Disclaimer:</strong> Crave'n Inc. does not award academic credit. Academic credit eligibility and approval are determined solely by the intern's academic institution. Crave'n Inc. supports the academic credit process by providing supervision, documentation, evaluations, and hour verification.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InternAcademicCredit;



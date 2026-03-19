// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Input, Modal, Form, Select, InputNumber, DatePicker, message, Popconfirm, Statistic, Card, Upload, Checkbox, Alert } from 'antd';
import {
  UserAddOutlined,
  DeleteOutlined,
  RiseOutlined,
  DollarOutlined,
  TeamOutlined,
  MailOutlined,
  TrophyOutlined,
  UserOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import { buildEmails } from '@/config/positions';
import { DEFAULT_EMPLOYEE_PACKET } from '@/config/hiringPacket';
import { isCLevelPosition, getExecRoleFromPosition, isCFOPosition, getPortalsForPosition } from '@/utils/roleUtils';
import { logPersonnelAction } from '@/utils/auditLogger';
import { RoleSyncVerification } from './RoleSyncVerification';
import {
  getRequiredSteps,
  createWorkflowSteps,
  createBoardResolutionForRemoval,
} from '@/utils/exitWorkflowUtils';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  department_id: string;
  department?: { name: string };
  employment_type: string;
  employment_status: string;
  salary: number;
  hire_date: string;
  employee_number: string;
  employee_equity?: Array<{ shares_percentage: number; equity_type: string }>;
}

interface Department {
  id: string;
  name: string;
  description: string;
}

export const PersonnelManager: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isPromoteModalVisible, setIsPromoteModalVisible] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [previewValues, setPreviewValues] = useState<any | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchText, setSearchText] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [promoteForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [suggestedEmails, setSuggestedEmails] = useState<{named?:string; roleAlias?:string}>({});
  const [packetDocs, setPacketDocs] = useState<any[]>([]);
  const [packetForEmail, setPacketForEmail] = useState<string | null>(null);
  const [showDeferred, setShowDeferred] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isEmailHistoryVisible, setIsEmailHistoryVisible] = useState(false);
  const [emailHistory, setEmailHistory] = useState<any[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [positions, setPositions] = useState<any[]>([]);
  const [viewFilter, setViewFilter] = useState<'all' | 'officers' | 'employees'>('all');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any | null>(null);
  const [isAppointmentModalVisible, setIsAppointmentModalVisible] = useState(false);
  const [appointmentForm] = Form.useForm();
  const [isExecutiveRemovalModalVisible, setIsExecutiveRemovalModalVisible] = useState(false);
  const [executiveRemovalForm] = Form.useForm();

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchPositions();
    fetchAppointments();

    // Check screen size
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const openHireModal = () => {
      setSelectedEmployee(null);
      form.resetFields();
      setIsModalVisible(true);
      setIsPreviewVisible(false);
      setIsEditModalVisible(false);
    };

    const openPromoteModal = (event: Event) => {
      const custom = event as CustomEvent<Employee>;
      if (custom.detail) {
        setSelectedEmployee(custom.detail);
        promoteForm.setFieldsValue({
          new_position: custom.detail.position,
          salary_adjustment: custom.detail.salary,
          effective_date: dayjs(),
        });
      }
      setIsPromoteModalVisible(true);
    };

    window.addEventListener('ceo-open-hire-modal', openHireModal as EventListener);
    window.addEventListener('ceo-open-promote-modal', openPromoteModal as EventListener);
    return () => {
      window.removeEventListener('ceo-open-hire-modal', openHireModal as EventListener);
      window.removeEventListener('ceo-open-promote-modal', openPromoteModal as EventListener);
    };
  }, [form, promoteForm]);

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      message.error('Failed to load departments');
    }
  };

  const fetchPositions = async () => {
    try {
      const { data, error } = await supabase
        .from('positions')
        .select('id, title, code, is_executive, is_active')
        .eq('is_active', true)
        .order('is_executive', { ascending: false })
        .order('title', { ascending: true });

      if (error) throw error;
      setPositions(data || []);
    } catch (error) {
      console.error('Error fetching positions:', error);
      message.error('Failed to load positions');
    }
  };

  const fetchAppointments = async () => {
    setLoadingAppointments(true);
    try {
      const { data, error } = await supabase
        .from('board_resolutions')
        .select('*')
        .eq('resolution_type', 'appointment')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          setAppointments([]);
          return;
        }
        throw error;
      }
      setAppointments(data || []);
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
      message.error('Failed to load appointments');
    } finally {
      setLoadingAppointments(false);
    }
  };

  const handleEditAppointment = (appointment: any) => {
    setEditingAppointment(appointment);
    appointmentForm.setFieldsValue({
      resolution_title: appointment.resolution_title,
      resolution_text: appointment.resolution_text,
      subject_person_name: appointment.subject_person_name,
      subject_person_email: appointment.subject_person_email,
      subject_position: appointment.subject_position,
      effective_date: appointment.effective_date ? dayjs(appointment.effective_date) : null,
    });
    setIsAppointmentModalVisible(true);
  };

  const handleUpdateAppointment = async (values: any) => {
    if (!editingAppointment) return;
    
    try {
      const { error } = await supabase
        .from('board_resolutions')
        .update({
          resolution_title: values.resolution_title,
          resolution_text: values.resolution_text,
          subject_person_name: values.subject_person_name,
          subject_person_email: values.subject_person_email,
          subject_position: values.subject_position,
          effective_date: values.effective_date ? dayjs(values.effective_date).toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingAppointment.id);

      if (error) throw error;

      message.success('Appointment updated successfully!');
      setIsAppointmentModalVisible(false);
      setEditingAppointment(null);
      appointmentForm.resetFields();
      fetchAppointments();
    } catch (error: any) {
      console.error('Error updating appointment:', error);
      message.error(error.message || 'Failed to update appointment');
    }
  };

  // --- Document preview helpers ---
  const isExecutivePosition = (position?: string) => isCLevelPosition(position);

  const buildOfferLetterHtml = (v: any) => {
    const salaryFormatted = v?.salary ? `$${Number(v.salary).toLocaleString()}/year` : 'Equity-only role';
    const equityLine = v?.equity ? `<li>Equity Stake: <strong>${v.equity}%</strong>${v?.equity_type ? ` (${(v.equity_type || '').toString().replace('_',' ')})` : ''}</li>` : '';
    const isCfo = isCFOPosition(v?.position);
    const cfoResp = isCfo ? `
      <div style="margin: 20px 0;">
        <h3 style="margin: 0 0 8px 0; color: #1a1a1a; font-size: 16px;">Primary Responsibilities (CFO)</h3>
        <ul style="margin: 0; padding-left: 20px; color: #4a4a4a; font-size: 14px; line-height: 1.8;">
          <li>Financial strategy, capital planning, and KPI management.</li>
          <li>Budgeting, forecasting, FP&A, and board/investor reporting.</li>
          <li>Internal controls, audit readiness, and GAAP compliance.</li>
          <li>Treasury and cash flow management; runway/burn oversight.</li>
          <li>Fundraising support and investor relations.</li>
          <li>Leadership of finance, accounting, and procurement.</li>
        </ul>
      </div>
    ` : '';
    return `
      <div style="font-family: Arial, sans-serif; padding: 24px;">
        <h2 style="margin-top:0;">Offer Letter - ${v.position}</h2>
        <p>Dear ${v.first_name} ${v.last_name},</p>
        <p>Craven Inc is pleased to extend an offer for the position of <strong>${v.position}</strong>.</p>
        <ul>
          <li>Department: ${v.department_name || 'Corporate'}</li>
          <li>Start Date: ${dayjs(v.hire_date || new Date()).format('MMM D, YYYY')}</li>
          <li>Compensation: ${salaryFormatted}</li>
          ${equityLine}
        </ul>
        ${cfoResp}
        <p>Reporting to: CEO - Torrance Stroman.</p>
        <p>Sincerely,<br/>Craven Inc HR</p>
      </div>
    `;
  };

  const buildEquityAgreementHtml = (v: any) => {
    if (!v?.equity) return '<div style="padding:24px;">No equity specified.</div>';
    const typeMap: Record<string,string> = { common_stock:'Common Stock', preferred_stock:'Preferred Stock', stock_options:'Stock Options', phantom_stock:'Phantom Stock' };
    const vestingMap: Record<string,string> = { immediate:'Immediate (100% vested)', '4_year_1_cliff':'4 years, 1-year cliff', '3_year_1_cliff':'3 years, 1-year cliff', '2_year_1_cliff':'2 years, 1-year cliff', custom:'Custom schedule' };
    return `
      <div style="font-family: Arial, sans-serif; padding: 24px;">
        <h2 style="margin-top:0;">Equity Offer Agreement</h2>
        <p>Company: Craven Inc (Ohio)</p>
        <ul>
          <li>Grantee: ${v.first_name} ${v.last_name} (${v.position})</li>
          <li>Ownership: <strong>${v.equity}%</strong></li>
          <li>Equity Type: ${typeMap[v.equity_type || 'common_stock'] || 'Common Stock'}</li>
          <li>Vesting: ${vestingMap[v.vesting_schedule || '4_year_1_cliff']}</li>
          ${v.equity_type === 'stock_options' ? `<li>Strike Price: $${Number(v.strike_price || 0).toFixed(2)}</li>` : ''}
        </ul>
        <p>Governing law: Ohio.</p>
      </div>
    `;
  };

  const buildBoardResolutionHtml = (v: any, resolutionNumber: string) => `
    <div style="font-family: Arial, sans-serif; padding: 24px;">
      <h2 style="margin-top:0;">Board Resolution #${resolutionNumber}</h2>
      <p>Appointment of ${v.first_name} ${v.last_name} as ${v.position} effective ${dayjs(v.hire_date || new Date()).format('MMM D, YYYY')}.</p>
      ${v.equity ? `<p>Includes authorization to grant ${v.equity}% equity.</p>` : ''}
      <p>Status: Approved.</p>
    </div>
  `;

  const buildFoundersHtml = (v: any, resolutionNumber: string) => `
    <div style="font-family: Arial, sans-serif; padding: 24px;">
      <h2 style="margin-top:0;">Founders Equity Insurance Agreement</h2>
      <p>Founder: ${v.first_name} ${v.last_name} (CEO).</p>
      <p>Ownership protected: ${Number(v.equity || 0)}% (anti-dilution, board-supermajority exception).</p>
      <p>Resolution reference: #${resolutionNumber}</p>
    </div>
  `;

  const openPreview = async () => {
    try {
      const vals = await form.validateFields();
      const dept = departments.find(d => d.id === vals.department_id);
      const enriched = { ...vals, department_name: dept?.name };
      setPreviewValues(enriched);
      setIsPreviewVisible(true);
    } catch (e) {
      // validation error shown by antd
    }
  };

  const onPositionChange = (positionCode: string) => {
    const v = form.getFieldsValue();
    const pos = positions.find(
      (position) =>
        position.code === positionCode ||
        position.id === positionCode ||
        position.title === positionCode
    );

    if (!pos?.code) {
      setSuggestedEmails({});
      return;
    }

    const { named, roleAlias } = buildEmails(v.first_name || '', v.last_name || '', pos.code, 'cravenusa.com');
    setSuggestedEmails({
      named,
      roleAlias: pos.is_executive ? roleAlias : undefined,
    });
  };

  const issueEmails = async () => {
    try {
      const v = await form.validateFields();
      const pos = positions.find(
        (position) =>
          position.code === v.position ||
          position.id === v.position ||
          position.title === v.position
      );

      if (!pos?.code) {
        message.error('Selected position is not configured in the positions table.');
        return;
      }

      const res = await supabase.functions.invoke('msgraph-provision', {
        body: { firstName: v.first_name, lastName: v.last_name, positionCode: pos.code, domain: 'cravenusa.com' }
      });
      
      if ((res as any)?.data?.ok) {
        const emails = (res as any).data;
        const namedEmail = emails.named;
        const roleAlias = emails.roleAlias || '';
        setSuggestedEmails({ named: namedEmail, roleAlias });
        message.success(`📧 Email account created: ${namedEmail}${roleAlias ? ` (alias: ${roleAlias})` : ''}`);
      } else {
        message.error('❌ Failed to provision email account. Check Supabase logs.');
      }
    } catch (e: any) {
      console.error('Email provisioning error:', e);
      message.error(`❌ Failed to provision email: ${e?.message || 'Unknown error'}`);
    }
  };

  const confirmSendAndHire = async () => {
    if (!previewValues) return;
    setIsSending(true);
    try {
      await handleHire(previewValues);
      setIsPreviewVisible(false);
    } finally {
      setIsSending(false);
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          department:departments(name),
          employee_equity(shares_percentage, shares_total, equity_type, vesting_schedule),
          ms365_email_accounts(email_address, role_alias, provisioning_status)
        `)
        .order('hire_date', { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      message.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const loadPacketStatus = async (email: string) => {
    const { data: packets } = await supabase.from('hiring_packets').select('id').eq('employee_email', email).order('created_at', { ascending: false }).limit(1);
    if (packets && packets[0]) {
      setPacketForEmail(email);
      const { data: docs } = await supabase.from('hiring_packet_docs').select('*').eq('packet_id', packets[0].id).order('label');
      setPacketDocs(docs || []);
    } else {
      setPacketDocs([]);
      setPacketForEmail(null);
    }
  };

  const fetchEmailHistory = async (employeeId: string) => {
    setLoadingEmails(true);
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .eq('employee_id', employeeId)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      setEmailHistory(data || []);
    } catch (error) {
      console.error('Error fetching email history:', error);
      message.error('Failed to load email history');
    } finally {
      setLoadingEmails(false);
    }
  };

  const resendCommunications = async (emp: Employee) => {
    try {
      // New signature token
      const signatureToken = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      await supabase.from('executive_signatures').insert([{
        employee_email: emp.email,
        employee_name: `${emp.first_name} ${emp.last_name}`,
        position: emp.position,
        document_type: 'offer_letter',
        token: signatureToken,
      }]);

      // Offer letter (best-effort with minimal data)
      await supabase.functions.invoke('send-executive-offer-letter', {
        body: {
          employeeEmail: emp.email,
          employeeName: `${emp.first_name} ${emp.last_name}`,
          position: emp.position,
          department: emp.department?.name || 'Corporate',
          salary: emp.salary || 0,
          startDate: emp.hire_date || new Date().toISOString(),
          reportingTo: 'CEO - Torrance Stroman',
          signatureToken,
          employeeId: emp.id, // Track in database
        }
      });

      // Portal access email
      const portals: Array<'board'|'ceo'|'admin'> = /chief|ceo|cfo|cto|coo|president/i.test(emp.position) ? ['board'] : ['admin'];
      await supabase.functions.invoke('send-portal-access-email', {
        body: {
          email: emp.email,
          name: `${emp.first_name} ${emp.last_name}`,
          portals,
          tempPassword: Math.random().toString(36).slice(2,10) + 'A1!',
          employeeId: emp.id // Track in database
        }
      });

      // Hiring packet resend (use last known state via work_location lookup if loaded)
      await loadPacketStatus(emp.email);
      if (!packetForEmail) {
        // fall back to creating one for OH
        const docs = DEFAULT_EMPLOYEE_PACKET.states['OH'];
        await supabase.functions.invoke('send-hiring-packet', { body: { candidateEmail: emp.email, candidateName: `${emp.first_name} ${emp.last_name}`, state: 'OH', packetType: 'employee', docs } });
      }

      message.success('Resent offer, portal access, and hiring packet (if applicable).');
    } catch (e) {
      console.error(e);
      message.error('Failed to resend communications');
    }
  };

  const sendHiringPacketNow = async (emp: Employee) => {
    try {
      const stateCode = (emp as any).work_location?.match?.(/\b(OH|MI|FL|GA|NY|MO|KS|LA)\b/i)?.[1]?.toUpperCase() || 'OH';
      const docs = DEFAULT_EMPLOYEE_PACKET.states[stateCode as any] || DEFAULT_EMPLOYEE_PACKET.states['OH'] || [];
      await supabase.functions.invoke('send-hiring-packet', {
        body: {
          candidateEmail: emp.email,
          candidateName: `${emp.first_name} ${emp.last_name}`,
          state: stateCode,
          packetType: 'executive',
          docs,
        }
      });
      message.success('Hiring packet sent.');
    } catch (e) {
      console.error('Error sending hiring packet:', e);
      message.error('Failed to send hiring packet');
    }
  };

  const handleHire = async (values: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('employees')
        .insert([
          {
            first_name: values.first_name,
            last_name: values.last_name,
            email: values.email,
            phone: values.phone,
            position: values.position,
            department_id: values.department_id,
            employment_type: values.employment_type,
            salary: values.salary,
            hire_date: values.hire_date ? dayjs(values.hire_date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
            work_location: values.work_location,
            salary_status: values.deferred_salary ? 'deferred' : 'active',
            funding_trigger: values.deferred_salary ? (values.funding_trigger || 500000) : null,
            deferred_salary_clause: !!values.deferred_salary,
            remote_allowed: values.remote_allowed || false,
            hired_by: user?.id,
          }
        ])
        .select();

      if (error) throw error;

      // Check if this is a C-suite position
      const isCLevel = /chief|ceo|cfo|cto|coo|president/i.test(values.position);

      // Save equity for any hire when provided (C-level or not)
      if ((values.equity && values.equity > 0) || (values.shares_total && values.shares_total > 0)) {
        const vestingSchedule = values.vesting_schedule || '4_year_1_cliff';
        const vestingJson = {
          type: vestingSchedule,
          duration_months: vestingSchedule === 'immediate' ? 0 : 
                          vestingSchedule === '2_year_1_cliff' ? 24 :
                          vestingSchedule === '3_year_1_cliff' ? 36 : 48,
          cliff_months: vestingSchedule === 'immediate' ? 0 : 12
        };

        // Normalize equity_type to match DB constraint ('stock','options','phantom')
        const equityTypeInput = (values.equity_type || '').toString().toLowerCase();
        const equityTypeMap: Record<string, 'stock' | 'options' | 'phantom'> = {
          'common_stock': 'stock',
          'preferred_stock': 'stock',
          'stock': 'stock',
          'stock_options': 'options',
          'options': 'options',
          'phantom_stock': 'phantom',
          'phantom': 'phantom',
        };
        const normalizedEquityType = equityTypeMap[equityTypeInput] || 'stock';

        await supabase.from('employee_equity').insert([{
          employee_id: data[0].id,
          shares_percentage: values.equity ? Number(values.equity) : null,
          shares_total: values.shares_total ? Number(values.shares_total) : null,
          equity_type: normalizedEquityType,
          vesting_schedule: vestingJson,
          strike_price: values.strike_price || null,
          authorized_by: user?.id,
        }]);
      }

      // Log to employee history
      if (data && data[0]) {
        await supabase.from('employee_history').insert([
          {
            employee_id: data[0].id,
            action_type: 'hired',
            new_position: values.position,
            new_salary: values.salary,
            new_department_id: values.department_id,
            effective_date: values.hire_date || new Date().toISOString(),
            performed_by: user?.id,
            notes: 'Initial hire',
          }
        ]);
      }

      // Get department info for offer letter
      const dept = departments.find(d => d.id === values.department_id);
      
      // Generate board resolution number
      const resolutionNumber = `BR${new Date().getFullYear()}${String(Math.floor(Math.random() * 9000) + 1000)}`;
      
      // Create board resolution record with employee_id link
      const boardResolution = {
        resolution_number: resolutionNumber,
        resolution_type: 'appointment',
        subject_position: values.position,
        subject_person_name: `${values.first_name} ${values.last_name}`,
        subject_person_email: values.email,
        resolution_title: `Appointment of ${values.first_name} ${values.last_name} as ${values.position}`,
        resolution_text: `Resolution to appoint ${values.first_name} ${values.last_name} to the position of ${values.position}`,
        effective_date: values.hire_date || new Date().toISOString(),
        board_members: [
          { name: 'Torrance Stroman', title: 'CEO', vote: 'for' },
          { name: 'Board Member 1', title: 'Independent Director', vote: 'for' },
          { name: 'Board Member 2', title: 'Independent Director', vote: 'for' }
        ],
        votes_for: 3,
        votes_against: 0,
        votes_abstain: 0,
        status: 'approved',
        required_documents: isCLevel ? 
          (values.position.toLowerCase().includes('ceo') ? 
            ['board_resolution', 'founders_equity_insurance_agreement', 'equity_offer_agreement', 'offer_letter'] :
            ['board_resolution', 'equity_offer_agreement', 'offer_letter']) :
          ['offer_letter'],
        created_by: user?.id,
        executed_by: user?.id,
        executed_at: new Date().toISOString(),
        employee_id: data[0].id // Link to employee
      };

      const { data: boardResData } = await supabase.from('board_resolutions').insert([boardResolution]).select();
      const boardResolutionId = boardResData?.[0]?.id;

      // Prepare signature token
      const signatureToken = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      await supabase.from('executive_signatures').insert([
        {
          employee_email: values.email,
          employee_name: `${values.first_name} ${values.last_name}`,
          position: values.position,
          document_type: 'offer_letter',
          token: signatureToken,
        }
      ]);

      // Provision portal access based on role (using centralized utilities)
      const portals = getPortalsForPosition(values.position);
      let tempPassword: string | undefined;
      let userId: string | undefined;
      
      // Note: Database triggers will automatically create exec_users when employee is inserted
      // But we still need to create the auth user if it doesn't exist
      if (isCLevelPosition(values.position)) {
        const execRole = getExecRoleFromPosition(values.position);
        
        if (execRole) {
          try {
            const { data: execAuthData, error: execAuthError } = await supabase.functions.invoke('create-executive-user', {
              body: {
                firstName: values.first_name,
                lastName: values.last_name,
                email: values.email,
                position: values.position,
                department: dept?.name || 'Executive',
                role: execRole
              }
            });

            if (execAuthError || !execAuthData) {
              console.error('Failed to create executive user:', execAuthError);
            } else {
              userId = execAuthData.userId;
              tempPassword = execAuthData.tempPassword;
              
              // Update employee record with user_id from auth
              // Database triggers will automatically sync to exec_users
              await supabase.from('employees').update({ user_id: userId }).eq('id', data[0].id);
            }
          } catch (err) {
            console.error('Error creating executive user:', err);
          }
        }
        
        // Grant CEO email access credentials if CEO
        if (execRole === 'ceo') {
          await supabase.from('ceo_access_credentials').insert([{ user_email: values.email }]).select();
        }
      }

      // Generate and store PDF documents
      try {
        // Generate Board Resolution PDF and store it
        const boardResPDF = await supabase.functions.invoke('generate-hr-pdf', {
          body: {
            documentType: 'board_resolution',
            employeeId: data[0].id,
            metadata: {
              employeeName: `${values.first_name} ${values.last_name}`,
              employeeEmail: values.email,
              position: values.position,
              resolutionNumber: resolutionNumber,
              effectiveDate: values.hire_date || new Date().toISOString(),
              companyName: 'Craven Inc',
              state: 'Ohio',
              boardMembers: boardResolution.board_members,
              equityPercentage: isCLevel && values.equity ? values.equity : undefined,
              createdBy: user?.id
            },
            alsoEmail: true // Also send via email
          }
        });

        // Link board resolution to the generated PDF document
        if (boardResPDF.data?.documentId && boardResolutionId) {
          await supabase.from('board_resolutions')
            .update({ document_id: boardResPDF.data.documentId })
            .eq('id', boardResolutionId);
        }

        // Pre-acceptance notification: provisional emails
        try {
          const posDef = positions.find(
            (position) =>
              position.code === values.position ||
              position.title === values.position ||
              position.id === values.position
          );

          if (posDef?.code) {
            const emails = buildEmails(values.first_name, values.last_name, posDef.code, 'cravenusa.com');
            await supabase.functions.invoke('send-preaccept-email', {
              body: {
                candidateEmail: values.email,
                candidateName: `${values.first_name} ${values.last_name}`,
                namedEmail: emails.named,
                roleAlias: posDef.is_executive ? emails.roleAlias : null,
                position: posDef.title || values.position,
              }
            });
          }
        } catch (_) {}

        // Generate Offer Letter PDF and store it
        await supabase.functions.invoke('generate-hr-pdf', {
          body: {
            documentType: 'offer_letter',
            employeeId: data[0].id,
            metadata: {
              employeeName: `${values.first_name} ${values.last_name}`,
              employeeEmail: values.email,
              position: values.position,
              department: dept?.name || 'Corporate',
              salary: values.salary,
              equity: isCLevel && values.equity ? values.equity : undefined,
              startDate: values.hire_date || new Date().toISOString(),
              reportingTo: 'CEO - Torrance Stroman',
              signatureToken,
              deferredSalary: !!values.deferred_salary,
              fundingTrigger: values.funding_trigger || null,
              companyName: 'Craven Inc',
              state: 'Ohio',
              createdBy: user?.id
            },
            alsoEmail: true // Also send via email
          }
        });

        // Generate Equity Agreement if C-suite
        if (isCLevel && values.equity && values.equity > 0) {
          await supabase.functions.invoke('generate-hr-pdf', {
            body: {
              documentType: 'equity_agreement',
              employeeId: data[0].id,
              metadata: {
                employeeName: `${values.first_name} ${values.last_name}`,
                employeeEmail: values.email,
                position: values.position,
                equityPercentage: values.equity,
                equityType: values.equity_type || 'common_stock',
                vestingSchedule: values.vesting_schedule || '4_year_1_cliff',
                strikePrice: values.strike_price,
                startDate: values.hire_date || new Date().toISOString(),
                companyName: 'Craven Inc',
                state: 'Ohio',
                createdBy: user?.id
              },
              alsoEmail: true // Also send via email
            }
          });
        }

        // Generate Founders Agreement if CEO
        if (values.position.toLowerCase().includes('ceo')) {
          await supabase.functions.invoke('generate-hr-pdf', {
            body: {
              documentType: 'founders_equity_insurance_agreement',
              employeeId: data[0].id,
              metadata: {
                employeeName: `${values.first_name} ${values.last_name}`,
                employeeEmail: values.email,
                position: values.position,
                equityPercentage: values.equity || 0,
                startDate: values.hire_date || new Date().toISOString(),
                companyName: 'Craven Inc',
                state: 'Ohio',
                resolutionNumber: resolutionNumber,
                createdBy: user?.id
              },
              alsoEmail: true // Also send via email
            }
          });
        }

        const documentsSent = isCLevel ? 
          (values.position.toLowerCase().includes('ceo') ? 
            'Board Resolution, Offer Letter, Equity Agreement, and Founders Agreement' :
            'Board Resolution, Offer Letter, and Equity Agreement') :
          'Board Resolution and Offer Letter';

        // Send portal access email (only for C-level with temp password)
        if (tempPassword && portals.length > 0) {
          await supabase.functions.invoke('send-portal-access-email', {
            body: {
              email: values.email,
              name: `${values.first_name} ${values.last_name}`,
              portals,
              tempPassword: tempPassword,
              employeeId: data[0].id // Track in database
            }
          });
        }

        // Generate Hiring Packet Forms as PDFs (state-specific)
        const stateCode = (values.work_location || '').match(/\b(OH|MI|FL|GA|NY|MO|KS|LA)\b/i)?.[1]?.toUpperCase() || 'OH';
        const docs = DEFAULT_EMPLOYEE_PACKET.states[stateCode as any] || [];
        
        // Generate each hiring packet form as a PDF
        for (const doc of docs) {
          const docKey = typeof doc === 'string' ? doc : doc.key;
          try {
            await supabase.functions.invoke('generate-hr-pdf', {
              body: {
                documentType: docKey,
                employeeId: data[0].id,
                metadata: {
                  employeeName: `${values.first_name} ${values.last_name}`,
                  firstName: values.first_name,
                  lastName: values.last_name,
                  employeeEmail: values.email,
                  position: values.position,
                  address: values.address || 'Address TBD',
                  cityStateZip: values.work_location || 'City, ST ZIP',
                  ssnLast4: null, // Employee will fill this
                  companyName: 'Craven Inc',
                  state: stateCode,
                  createdBy: user?.id
                },
                alsoEmail: false // Don't email - stored for Document Vault
              }
            });
          } catch (docError) {
            console.error(`Error generating ${docKey}:`, docError);
          }
        }

        message.success(`🎉 ${values.first_name} ${values.last_name} hired successfully! ${documentsSent} sent. Portal access and hiring packet emailed.`);
      } catch (emailError) {
        console.error('Error sending documents:', emailError);
        message.success(`🎉 ${values.first_name} ${values.last_name} hired successfully! (Some documents failed to send)`);
      }

      setIsModalVisible(false);
      form.resetFields();
      fetchEmployees();

      // POST-HIRE: Provision M365 email accounts (REQUIRED)
      try {
        const posDef = positions.find(
          (position) =>
            position.code === values.position ||
            position.title === values.position ||
            position.id === values.position
        );

        const provResult = await supabase.functions.invoke('msgraph-provision', {
          body: {
            firstName: values.first_name,
            lastName: values.last_name,
            positionCode: posDef?.code || values.position,
            domain: 'cravenusa.com',
            executive: !!posDef?.is_executive,
            personalEmail: values.email,
            employeeId: data[0].id // Track in database
          }
        });
        
        // Show success message with generated email
        if ((provResult as any)?.data?.ok) {
          const emails = (provResult as any).data;
          const namedEmail = emails.named || 'email';
          const roleAlias = emails.roleAlias || '';
          message.success(`📧 M365 account created: ${namedEmail}${roleAlias ? ` (alias: ${roleAlias})` : ''}`);
        } else {
          message.warning('⚠️ M365 provisioning may have failed. Check Supabase logs.');
        }
      } catch (e: any) {
        console.error('M365 Provisioning Error:', e);
        message.error(`⚠️ Failed to provision M365 account: ${e?.message || 'Unknown error'}`);
        message.warning('⚠️ Employee hired but email account may not be ready. Check Supabase Edge Function logs.');
      }
    } catch (error: any) {
      console.error('Error hiring employee:', error);
      message.error(error.message || 'Failed to hire employee');
    }
  };

  const handlePromote = async (values: any) => {
    if (!selectedEmployee) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('employees')
        .update({
          position: values.new_position,
          salary: values.new_salary,
          department_id: values.new_department_id || selectedEmployee.department_id,
        })
        .eq('id', selectedEmployee.id);

      if (error) throw error;

      // Log promotion
      await supabase.from('employee_history').insert([
        {
          employee_id: selectedEmployee.id,
          action_type: 'promoted',
          previous_position: selectedEmployee.position,
          new_position: values.new_position,
          previous_salary: selectedEmployee.salary,
          new_salary: values.new_salary,
          previous_department_id: selectedEmployee.department_id,
          new_department_id: values.new_department_id || selectedEmployee.department_id,
          effective_date: new Date().toISOString(),
          reason: values.reason,
          performed_by: user?.id,
        }
      ]);

      message.success(`✅ ${selectedEmployee.first_name} ${selectedEmployee.last_name} promoted successfully!`);
      setIsPromoteModalVisible(false);
      promoteForm.resetFields();
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (error: any) {
      console.error('Error promoting employee:', error);
      message.error(error.message || 'Failed to promote employee');
    }
  };

  const handleEditEmployee = async (values: any) => {
    if (!selectedEmployee) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Get current position before update
      const { data: currentEmployee } = await supabase
        .from('employees')
        .select('position')
        .eq('id', selectedEmployee.id)
        .single();

      const newPosition = values.position === '__CUSTOM__' ? values.custom_position : values.position;

      // Update basic fields
      const { error: empErr } = await supabase
        .from('employees')
        .update({
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email,
          position: newPosition,
          department_id: values.department_id,
          employment_type: values.employment_type,
          salary: values.salary,
        })
        .eq('id', selectedEmployee.id);
      if (empErr) throw empErr;

      // Track position change in employee_history if position changed
      if (currentEmployee && newPosition && currentEmployee.position !== newPosition) {
        await supabase
          .from('employee_history')
          .insert({
            employee_id: selectedEmployee.id,
            change_type: 'position_change',
            old_value: currentEmployee.position,
            new_value: newPosition,
            changed_by: user?.id || null,
            effective_date: new Date().toISOString().split('T')[0],
            notes: `Position changed from "${currentEmployee.position}" to "${newPosition}"`,
          });
      }

      // Upsert equity if provided
      if (values.equity_percentage || values.shares_total || values.equity_type) {
        const equityTypeInput = (values.equity_type || '').toString().toLowerCase();
        const equityTypeMap: Record<string, 'stock' | 'options' | 'phantom'> = {
          'common_stock': 'stock',
          'preferred_stock': 'stock',
          'stock': 'stock',
          'stock_options': 'options',
          'options': 'options',
          'phantom_stock': 'phantom',
          'phantom': 'phantom',
        };
        const normalizedEquityType = equityTypeMap[equityTypeInput] || 'stock';
        const equityPayload: any = {
          employee_id: selectedEmployee.id,
          shares_percentage: values.equity_percentage != null ? Number(values.equity_percentage) : null,
          shares_total: values.shares_total != null ? Number(values.shares_total) : null,
          equity_type: normalizedEquityType,
          authorized_by: user?.id || null,
        };
        const { error: eqErr } = await supabase
          .from('employee_equity')
          .upsert(equityPayload, { onConflict: 'employee_id' });
        if (eqErr) throw eqErr;
      }

      message.success('Employee updated');
      setIsEditModalVisible(false);
      setSelectedEmployee(null);
      editForm.resetFields();
      fetchEmployees();
    } catch (error: any) {
      console.error('Error updating employee:', error);
      message.error(error.message || 'Failed to update employee');
    }
  };

  const handleTerminate = async (employee: Employee) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const isExecutive = isCLevelPosition(employee.position);

      // For executives, redirect to exit workflow (requires Board approval)
      if (isExecutive) {
        Modal.confirm({
          title: 'Executive Removal Required',
          width: 600,
          content: (
            <div>
              <p>
                <strong>{employee.first_name} {employee.last_name}</strong> is a C-Suite executive.
              </p>
              <p>
                Executive removals require Board approval and must go through the formal Exit Workflow process.
              </p>
              <p>
                Would you like to initiate the Executive Removal Process?
              </p>
            </div>
          ),
          okText: 'Initiate Removal Process',
          cancelText: 'Cancel',
          onOk: async () => {
            // Navigate to Company Portal Governance Admin for executive removal
            window.location.href = '/company/governance-admin?tab=exit-workflows';
            message.info('Redirecting to Governance Admin → Exit Workflows to initiate executive removal process.');
          },
        });
        return;
      }

      // For regular employees, offer choice: quick termination or full workflow
      Modal.confirm({
        title: 'Terminate Employee',
        width: 600,
        content: (
          <div>
            <p>
              Terminate <strong>{employee.first_name} {employee.last_name}</strong>?
            </p>
            <p style={{ marginTop: 16 }}>
              Choose an option:
            </p>
            <ul style={{ marginTop: 8, paddingLeft: 20 }}>
              <li><strong>Quick Termination:</strong> Immediate termination with basic logging</li>
              <li><strong>Full Workflow:</strong> Complete exit process with access revocation, asset return, and final settlement</li>
            </ul>
          </div>
        ),
        okText: 'Quick Termination',
        cancelText: 'Cancel',
        onOk: async () => {
          // Quick termination (existing behavior)
      const oldValues = {
        employment_status: employee.employment_status,
        termination_date: employee.termination_date,
      };

      const { error } = await supabase
        .from('employees')
        .update({
          employment_status: 'terminated',
          termination_date: new Date().toISOString(),
              terminated_by: user.id,
        })
        .eq('id', employee.id);

      if (error) throw error;

      // Log termination to employee_history
      await supabase.from('employee_history').insert([
        {
          employee_id: employee.id,
          action_type: 'terminated',
          effective_date: new Date().toISOString(),
              performed_by: user.id,
        }
      ]);

          // Log audit trail
      await logPersonnelAction(
        'terminate',
        employee.id,
        `${employee.first_name} ${employee.last_name}`,
        {
          position: employee.position,
          department_id: employee.department_id,
        },
        oldValues,
        {
          employment_status: 'terminated',
          termination_date: new Date().toISOString(),
        }
      );

      message.success(`${employee.first_name} ${employee.last_name} has been terminated`);
      fetchEmployees();
        },
      });

      // Also show option for full workflow
      // User can access Exit Workflow Manager separately for full process
    } catch (error: any) {
      console.error('Error terminating employee:', error);
      message.error(error.message || 'Failed to terminate employee');
    }
  };

  const filteredEmployees = employees.filter(emp => {
    // First apply search filter
    const matchesSearch = searchText === '' || 
      emp.first_name.toLowerCase().includes(searchText.toLowerCase()) ||
      emp.last_name.toLowerCase().includes(searchText.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchText.toLowerCase()) ||
      emp.position.toLowerCase().includes(searchText.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // Then apply view filter
    const isCLevel = isCLevelPosition(emp.position);
    if (viewFilter === 'officers') return isCLevel;
    if (viewFilter === 'employees') return !isCLevel;
    return true; // 'all'
  });

  // Mobile columns - simplified view
  const mobileColumns = [
    {
      title: 'Name',
      key: 'name',
      render: (_: any, record: any) => (
        <div className="flex flex-col">
          <span className="font-medium">{`${record.first_name} ${record.last_name}`}</span>
          <span className="text-xs text-gray-500">{record.email}</span>
          {record.ms365_email_accounts && record.ms365_email_accounts[0] && (
            <span className="text-xs text-blue-600">{record.ms365_email_accounts[0].email_address}</span>
          )}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'employment_status',
      key: 'employment_status',
      width: 80,
      render: (status: string) => {
        const colors: Record<string, string> = {
          active: 'green',
          'on-leave': 'orange',
          suspended: 'red',
          terminated: 'red',
        };
        return <Tag color={colors[status] || 'default'}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_: any, record: Employee) => (
        <Space size="small" direction="vertical">
          <Button 
            type="primary" 
            size="small"
            onClick={() => {
              setSelectedEmployee(record);
              const eq: any = (record as any).employee_equity?.[0] || {};
              editForm.setFieldsValue({
                first_name: (record as any).first_name,
                last_name: (record as any).last_name,
                email: (record as any).email,
                position: (record as any).position,
                department_id: (record as any).department_id,
                employment_type: (record as any).employment_type,
                salary: (record as any).salary,
                equity_percentage: eq.shares_percentage,
                shares_total: eq.shares_total,
                equity_type: eq.equity_type || 'stock',
              });
              setIsEditModalVisible(true);
            }}
          >
            Edit
          </Button>
        </Space>
      ),
    },
  ];

  // Desktop columns - full view
  const desktopColumns = [
    {
      title: 'Employee #',
      dataIndex: 'employee_number',
      key: 'employee_number',
      width: 120,
    },
    {
      title: 'Name',
      key: 'name',
      render: (_: any, record: Employee) => (
        <div className="flex items-center gap-2">
          <span>{`${record.first_name} ${record.last_name}`}</span>
          {isCLevelPosition(record.position) && (
            <Tag color="gold" className="text-xs">OFFICER</Tag>
          )}
        </div>
      ),
      sorter: (a: Employee, b: Employee) => a.first_name.localeCompare(b.first_name),
    },
    {
      title: 'Personal Email',
      dataIndex: 'email',
      key: 'email',
      width: 200,
    },
    {
      title: 'Company Email',
      key: 'company_email',
      render: (_: any, record: any) => {
        const m365 = record.ms365_email_accounts?.[0];
        if (!m365) return <Tag color="default">Not Provisioned</Tag>;
        return (
          <div className="flex flex-col">
            <span>{m365.email_address}</span>
            {m365.role_alias && <span className="text-xs text-blue-600">{m365.role_alias}</span>}
            <Tag color={m365.provisioning_status === 'active' ? 'green' : 'orange'}>
              {m365.provisioning_status}
            </Tag>
          </div>
        );
      },
      width: 250,
    },
    {
      title: 'Position',
      dataIndex: 'position',
      key: 'position',
    },
    {
      title: 'Department',
      key: 'department',
      render: (_: any, record: Employee) => record.department?.name || 'N/A',
      filters: departments.map(d => ({ text: d.name, value: d.id })),
      onFilter: (value: any, record: Employee) => record.department_id === value,
    },
    {
      title: 'Equity %',
      key: 'equity',
      render: (_: any, record: Employee) => {
        const equity = record.employee_equity?.[0];
        return equity ? `${equity.shares_percentage}%` : '-';
      },
      width: 100,
    },
    {
      title: 'Type',
      dataIndex: 'employment_type',
      key: 'employment_type',
      render: (type: string) => {
        const colors: Record<string, string> = {
          'full-time': 'blue',
          'part-time': 'cyan',
          'contract': 'orange',
          'intern': 'purple',
        };
        return <Tag color={colors[type] || 'default'}>{type.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Salary',
      dataIndex: 'salary',
      key: 'salary',
      render: (salary: number) => salary ? `$${salary.toLocaleString()}` : 'N/A',
      sorter: (a: Employee, b: Employee) => (a.salary || 0) - (b.salary || 0),
    },
    {
      title: 'Hire Date',
      dataIndex: 'hire_date',
      key: 'hire_date',
      render: (date: string) => dayjs(date).format('MMM D, YYYY'),
      sorter: (a: Employee, b: Employee) => dayjs(a.hire_date).unix() - dayjs(b.hire_date).unix(),
    },
    {
      title: 'Status',
      dataIndex: 'employment_status',
      key: 'employment_status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          active: 'green',
          'on-leave': 'orange',
          suspended: 'red',
          terminated: 'red',
        };
        return <Tag color={colors[status] || 'default'}>{status.toUpperCase()}</Tag>;
      },
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'On Leave', value: 'on-leave' },
        { text: 'Terminated', value: 'terminated' },
      ],
      onFilter: (value: any, record: Employee) => record.employment_status === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Employee) => (
        <Space size="small">
          {record.employment_status === 'active' && (
            <>
              <Button 
                type="link" 
                size="small"
                onClick={() => {
                  setSelectedEmployee(record);
                  const eq: any = (record as any).employee_equity?.[0] || {};
                  editForm.setFieldsValue({
                    first_name: (record as any).first_name,
                    last_name: (record as any).last_name,
                    email: (record as any).email,
                    position: (record as any).position,
                    department_id: (record as any).department_id,
                    employment_type: (record as any).employment_type,
                    salary: (record as any).salary,
                    equity_percentage: eq.shares_percentage,
                    shares_total: eq.shares_total,
                    equity_type: eq.equity_type || 'stock',
                  });
                  setIsEditModalVisible(true);
                }}
              >
                Edit
              </Button>
              <Button 
                type="link" 
                icon={<RiseOutlined />} 
                size="small"
                onClick={() => {
                  setSelectedEmployee(record);
                  promoteForm.setFieldsValue({
                    current_position: record.position,
                    current_salary: record.salary,
                  });
                  setIsPromoteModalVisible(true);
                }}
              >
                Promote
              </Button>
              <Popconfirm
                title="Are you sure you want to terminate this employee?"
                description="This action cannot be undone easily."
                onConfirm={() => handleTerminate(record)}
                okText="Yes, Terminate"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Button type="link" danger icon={<DeleteOutlined />} size="small">
                  Terminate
                </Button>
              </Popconfirm>
          <Button type="link" size="small" onClick={() => resendCommunications(record)}>
            Resend Offer/Emails
          </Button>
          <Button type="link" size="small" onClick={() => sendHiringPacketNow(record)}>
            Send Hiring Packet
          </Button>
          <Button 
            type="link" 
            icon={<MailOutlined />} 
            size="small"
            onClick={async () => {
              setSelectedEmployee(record);
              await fetchEmailHistory(record.id);
              setIsEmailHistoryVisible(true);
            }}
          >
            View Emails
          </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const columns = isMobile ? mobileColumns : desktopColumns;

  const activeEmployees = employees.filter(e => e.employment_status === 'active');
  const totalPayroll = employees.reduce((sum, e) => sum + (e.salary || 0), 0);
  const recentHires = employees.filter(e => dayjs(e.hire_date).isAfter(dayjs().subtract(30, 'days')));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1 sm:mb-2">Personnel Management</h2>
          <p className="text-sm sm:text-base text-slate-600">Hire, manage, and monitor all employees</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select
            value={viewFilter}
            onChange={setViewFilter}
            style={{ width: isMobile ? '100%' : 180 }}
            size="large"
          >
            <Option value="all">
              <TeamOutlined /> All Personnel
            </Option>
            <Option value="officers">
              <TrophyOutlined /> Officers Only
            </Option>
            <Option value="employees">
              <UserOutlined /> Employees Only
            </Option>
          </Select>
          <Search
            placeholder="Search personnel..."
            allowClear
            onSearch={setSearchText}
            className="w-full sm:w-auto sm:min-w-[200px] sm:max-w-[300px]"
          />
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            size="large"
            onClick={() => setIsModalVisible(true)}
            className="w-full sm:w-auto"
          >
            <span className="hidden sm:inline">Hire New Employee</span>
            <span className="sm:hidden">Hire Employee</span>
          </Button>
        </div>
      </div>

      {/* Metrics - Responsive Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <Statistic
            title={<span className="text-xs sm:text-sm">Total Employees</span>}
            value={employees.length}
            prefix={<TeamOutlined className="text-base sm:text-lg" />}
            valueStyle={{ color: '#3f8600', fontSize: isMobile ? '20px' : '24px' }}
          />
        </Card>
        <Card>
          <Statistic
            title={<span className="text-xs sm:text-sm">Active Employees</span>}
            value={activeEmployees.length}
            valueStyle={{ color: '#1890ff', fontSize: isMobile ? '20px' : '24px' }}
          />
        </Card>
        <Card>
          <Statistic
            title={<span className="text-xs sm:text-sm">Monthly Payroll</span>}
            value={Math.round(totalPayroll / 12)}
            prefix={<DollarOutlined className="text-base sm:text-lg" />}
            precision={0}
            valueStyle={{ color: '#cf1322', fontSize: isMobile ? '16px' : '20px' }}
          />
        </Card>
        <Card>
          <Statistic
            title={<span className="text-xs sm:text-sm">Hired (30 days)</span>}
            value={recentHires.length}
            valueStyle={{ color: '#faad14', fontSize: isMobile ? '20px' : '24px' }}
          />
        </Card>
      </div>

      {/* Role Sync Verification */}
      <RoleSyncVerification />

      {/* Table - Mobile Optimized */}
      <div className="overflow-hidden">
        <Table
          columns={columns}
          dataSource={filteredEmployees}
          rowKey="id"
          loading={loading}
          pagination={{ 
            pageSize: isMobile ? 5 : 10, 
            showSizeChanger: !isMobile, 
            showTotal: (total) => `Total ${total} employees`,
            size: isMobile ? 'small' : 'default',
            showQuickJumper: !isMobile
          }}
          className="shadow-lg"
          scroll={{ x: isMobile ? 800 : 1200 }}
          size={isMobile ? 'small' : 'default'}
        />
      </div>

      {/* Executive Appointments Section */}
      <div className="mt-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">Executive Appointments</h3>
            <p className="text-sm text-slate-600">View and edit board resolutions for executive appointments</p>
          </div>
        </div>
        <div className="overflow-hidden">
          <Table
            dataSource={appointments}
            rowKey="id"
            loading={loadingAppointments}
            pagination={{ 
              pageSize: isMobile ? 5 : 10, 
              showSizeChanger: !isMobile,
              showTotal: (total) => `Total ${total} appointments`,
              size: isMobile ? 'small' : 'default',
            }}
            className="shadow-lg"
            scroll={{ x: isMobile ? 1000 : 1400 }}
            size={isMobile ? 'small' : 'default'}
            locale={{ emptyText: 'No appointments found' }}
            columns={[
              {
                title: 'Resolution #',
                dataIndex: 'resolution_number',
                key: 'resolution_number',
                width: 150,
                render: (text: string) => <span className="font-mono text-sm">{text}</span>,
              },
              {
                title: 'Title',
                dataIndex: 'resolution_title',
                key: 'resolution_title',
                width: 250,
                render: (text: string) => <span className="font-semibold">{text}</span>,
              },
              {
                title: 'Person',
                key: 'person',
                width: 200,
                render: (_: any, record: any) => (
                  <div>
                    <div className="font-medium">{record.subject_person_name || 'N/A'}</div>
                    <div className="text-xs text-slate-500">{record.subject_person_email || ''}</div>
                  </div>
                ),
              },
              {
                title: 'Position',
                dataIndex: 'subject_position',
                key: 'subject_position',
                width: 180,
                render: (text: string) => <Tag color="blue">{text}</Tag>,
              },
              {
                title: 'Effective Date',
                dataIndex: 'effective_date',
                key: 'effective_date',
                width: 130,
                render: (date: string) => date ? dayjs(date).format('MMM D, YYYY') : 'N/A',
              },
              {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                width: 120,
                render: (status: string) => {
                  const colors: Record<string, string> = {
                    approved: 'green',
                    pending: 'orange',
                    rejected: 'red',
                    draft: 'gray',
                  };
                  return <Tag color={colors[status?.toLowerCase()] || 'default'}>{status?.toUpperCase() || 'UNKNOWN'}</Tag>;
                },
              },
              {
                title: 'Actions',
                key: 'actions',
                width: 100,
                fixed: 'right' as const,
                render: (_: any, record: any) => (
                  <Space>
                    <Button
                      type="primary"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => handleEditAppointment(record)}
                    >
                      Edit
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </div>
      </div>

      {/* Edit Employee Modal */}
      <Modal
        title={`✏️ Edit ${selectedEmployee ? `${(selectedEmployee as any).first_name} ${(selectedEmployee as any).last_name}` : 'Employee'}`}
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          setSelectedEmployee(null);
          editForm.resetFields();
        }}
        footer={null}
        width={isMobile ? '90%' : 700}
      >
        <Form layout="vertical" form={editForm} onFinish={handleEditEmployee}>
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <Form.Item label="First Name" name="first_name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Last Name" name="last_name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </div>

          <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>

          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <Form.Item label="Position" name="position" rules={[{ required: true }]}>
              <Select 
                showSearch
                placeholder="Select position"
                filterOption={(input, option) =>
                  (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {/* Group executives first */}
                {positions.filter(p => p.is_executive).map(p => (
                  <Option key={p.id || p.code} value={p.title || p.label}>
                    {p.title || p.label}
                  </Option>
                ))}
                {/* Then regular positions */}
                {positions.filter(p => !p.is_executive).map(p => (
                  <Option key={p.id || p.code} value={p.title || p.label}>
                    {p.title || p.label}
                  </Option>
                ))}
                {/* Allow custom entry if not found */}
                <Option value="__CUSTOM__">+ Enter Custom Position</Option>
              </Select>
            </Form.Item>
            <Form.Item label="Department" name="department_id">
              <Select allowClear placeholder="Select department">
                {departments.map(dept => (
                  <Option key={dept.id} value={dept.id}>{dept.name}</Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <Form.Item label="Employment Type" name="employment_type" initialValue="full-time">
              <Select>
                <Option value="full-time">Full-Time</Option>
                <Option value="part-time">Part-Time</Option>
                <Option value="contract">Contract</Option>
                <Option value="intern">Intern</Option>
              </Select>
            </Form.Item>
            <Form.Item label="Annual Salary" name="salary">
              <InputNumber style={{ width: '100%' }} min={0} step={5000}
                formatter={v => `$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={v => v!.replace(/\$\s?|(,*)/g, '')}
              />
            </Form.Item>
          </div>

          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
            <Form.Item label="Equity %" name="equity_percentage">
              <InputNumber style={{ width: '100%' }} min={0} max={100} step={0.25} precision={2} />
            </Form.Item>
            <Form.Item label="Shares Total" name="shares_total">
              <InputNumber style={{ width: '100%' }} min={0} step={1000} />
            </Form.Item>
            <Form.Item label="Equity Type" name="equity_type" initialValue="stock">
              <Select>
                <Option value="stock">Stock</Option>
                <Option value="options">Options</Option>
                <Option value="phantom">Phantom</Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item>
            <Space className="w-full justify-end flex-wrap">
              <Button onClick={() => {
                setIsEditModalVisible(false);
                setSelectedEmployee(null);
                editForm.resetFields();
              }}>Cancel</Button>
              <Button type="primary" htmlType="submit">Save Changes</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Hire Modal */}
      <Modal
        title="🎯 Hire New Employee"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={isMobile ? '90%' : 700}
      >
        <Form layout="vertical" form={form} onFinish={handleHire}>
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <Form.Item
              label="First Name"
              name="first_name"
              rules={[{ required: true, message: 'Required' }]}
            >
              <Input placeholder="John" />
            </Form.Item>

            <Form.Item
              label="Last Name"
              name="last_name"
              rules={[{ required: true, message: 'Required' }]}
            >
              <Input placeholder="Smith" />
            </Form.Item>
          </div>

          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, type: 'email', message: 'Valid email required' }]}
          >
            <Input placeholder="employee@craven.com" />
          </Form.Item>

          <Form.Item label="Phone" name="phone">
            <Input placeholder="(555) 123-4567" />
          </Form.Item>

          <Form.Item
            label="Position"
            name="position"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Select 
              placeholder="Select position" 
              onChange={onPositionChange} 
              onSelect={onPositionChange} 
              onBlur={onPositionChange} 
              showSearch
              filterOption={(input, option) =>
                (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {/* Group executives first */}
              {positions.filter(p => p.is_executive).map(p => (
                <Option key={p.id || p.code} value={p.code}>
                  {p.title || p.label}
                </Option>
              ))}
              {/* Then regular positions */}
              {positions.filter(p => !p.is_executive).map(p => (
                <Option key={p.id || p.code} value={p.code}>
                  {p.title || p.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {suggestedEmails?.named && (
            <div className="p-3 rounded-md border bg-slate-50 mb-2">
              <div className="text-sm text-slate-600 mb-1">Suggested emails for this hire:</div>
              <div className="font-mono text-sm">{suggestedEmails.named}</div>
              {suggestedEmails.roleAlias && <div className="font-mono text-sm">{suggestedEmails.roleAlias}</div>}
              <div className="mt-2">
                <Button size="small" onClick={issueEmails}>Issue Emails</Button>
              </div>
            </div>
          )}

          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <Form.Item
              label="Department"
              name="department_id"
              rules={[{ required: true, message: 'Required' }]}
            >
              <Select placeholder="Select department">
                {departments.map(dept => (
                  <Option key={dept.id} value={dept.id}>{dept.name}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Employment Type"
              name="employment_type"
              rules={[{ required: true, message: 'Required' }]}
              initialValue="full-time"
            >
              <Select>
                <Option value="full-time">Full-Time</Option>
                <Option value="part-time">Part-Time</Option>
                <Option value="contract">Contract</Option>
                <Option value="intern">Intern</Option>
              </Select>
            </Form.Item>
          </div>

          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <Form.Item
              label="Annual Salary"
              name="salary"
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const executiveDept = departments.find(d => d.name === 'Executive');
                    const deptId = getFieldValue('department_id');
                    const isExecutive = executiveDept && deptId === executiveDept.id;
                    if (isExecutive) {
                      // Executive department: salary optional
                      return Promise.resolve();
                    }
                    // Non-executive: require a numeric salary > 0
                    if (value === undefined || value === null || value === '' || Number(value) <= 0) {
                      return Promise.reject(new Error('Required for non-executive roles'));
                    }
                    return Promise.resolve();
                  }
                })
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value!.replace(/\$\s?|(,*)/g, '')}
                min={0}
                max={1000000}
                step={5000}
                placeholder="Leave blank for equity-only compensation"
              />
            </Form.Item>

            <Form.Item
              label="Hire Date"
              name="hire_date"
              initialValue={dayjs()}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <Form.Item name="deferred_salary" valuePropName="checked" label=" ">
              <Checkbox onChange={(e)=> setShowDeferred(e.target.checked)}>Defer Salary Until Funding?</Checkbox>
            </Form.Item>
            {showDeferred && (
              <Form.Item
                label="Funding Trigger (USD)"
                name="funding_trigger"
                initialValue={500000}
                rules={[{ required: true, message: 'Funding trigger required when deferring salary' }]}
              >
                <InputNumber min={0} step={5000} style={{ width: '100%' }} />
              </Form.Item>
            )}
          </div>

          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <Form.Item
              label="Equity Stake (%)"
              name="equity"
              tooltip="For C-suite positions only (CEO, CFO, CTO, COO, President)"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                max={100}
                precision={2}
                step={0.5}
                placeholder="e.g., 10.50 for 10.5%"
              />
            </Form.Item>

            <Form.Item
              label="Equity Type"
              name="equity_type"
              tooltip="Type of equity being granted"
            >
              <Select placeholder="Select equity type">
                <Option value="common_stock">Common Stock</Option>
                <Option value="preferred_stock">Preferred Stock</Option>
                <Option value="stock_options">Stock Options</Option>
                <Option value="phantom_stock">Phantom Stock</Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            label="Shares Total"
            name="shares_total"
            tooltip="Total number of shares granted (optional)"
          >
            <InputNumber style={{ width: '100%' }} min={0} step={1000} />
          </Form.Item>

          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <Form.Item
              label="Vesting Schedule"
              name="vesting_schedule"
              tooltip="How the equity vests over time"
            >
              <Select placeholder="Select vesting schedule">
                <Option value="immediate">Immediate (100% vested)</Option>
                <Option value="4_year_1_cliff">4 years, 1 year cliff</Option>
                <Option value="3_year_1_cliff">3 years, 1 year cliff</Option>
                <Option value="2_year_1_cliff">2 years, 1 year cliff</Option>
                <Option value="custom">Custom Schedule</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Strike Price (if options)"
              name="strike_price"
              tooltip="Exercise price for stock options"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                precision={2}
                placeholder="e.g., 0.01 for $0.01"
                formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value!.replace(/\$\s?|(,*)/g, '')}
              />
            </Form.Item>
          </div>

          <Form.Item label="Work Location" name="work_location">
            <Input placeholder="e.g., HQ - Los Angeles, Remote" />
          </Form.Item>

          <Form.Item>
            <Space className={`w-full ${isMobile ? 'flex-col' : 'justify-end'}`} direction={isMobile ? 'vertical' : 'horizontal'} size="small">
              <Button onClick={() => {
                setIsModalVisible(false);
                form.resetFields();
              }} block={isMobile}>
                Cancel
              </Button>
              <Button onClick={openPreview} size="large" block={isMobile}>
                👀 Preview Documents
              </Button>
              <Button type="primary" htmlType="submit" size="large" block={isMobile}>
                {isMobile ? '🎉 Hire' : '🎉 Hire Employee (Skip Preview)'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Document Preview Modal */}
      <Modal
        title="📄 Review Documents"
        open={isPreviewVisible}
        onCancel={() => setIsPreviewVisible(false)}
        width={isMobile ? '95%' : 900}
        footer={null}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Live-edit fields */}
          <div className="md:col-span-1 space-y-3">
            <div className="text-slate-700 font-semibold">Edit fields</div>
            <Input
              placeholder="Position"
              value={previewValues?.position}
              onChange={e => setPreviewValues((p:any) => ({...p, position: e.target.value}))}
            />
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Equity %"
              value={previewValues?.equity}
              min={0}
              max={100}
              step={0.5}
              onChange={(v) => setPreviewValues((p:any) => ({...p, equity: v}))}
            />
            <Select
              value={previewValues?.equity_type || 'common_stock'}
              onChange={(v) => setPreviewValues((p:any) => ({...p, equity_type: v}))}
            >
              <Option value="common_stock">Common Stock</Option>
              <Option value="preferred_stock">Preferred Stock</Option>
              <Option value="stock_options">Stock Options</Option>
              <Option value="phantom_stock">Phantom Stock</Option>
            </Select>
            <Select
              value={previewValues?.vesting_schedule || '4_year_1_cliff'}
              onChange={(v) => setPreviewValues((p:any) => ({...p, vesting_schedule: v}))}
            >
              <Option value="immediate">Immediate (100% vested)</Option>
              <Option value="4_year_1_cliff">4 years, 1 year cliff</Option>
              <Option value="3_year_1_cliff">3 years, 1 year cliff</Option>
              <Option value="2_year_1_cliff">2 years, 1 year cliff</Option>
              <Option value="custom">Custom</Option>
            </Select>
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Strike Price (if options)"
              value={previewValues?.strike_price}
              min={0}
              step={0.01}
              onChange={(v) => setPreviewValues((p:any) => ({...p, strike_price: v}))}
            />
          </div>

          {/* Previews */}
          <div className="md:col-span-2 space-y-6">
            <div className="border rounded-md overflow-hidden">
              <div className="px-3 py-2 text-sm font-semibold bg-slate-50 border-b">Board Resolution</div>
              <div className="p-4 max-h-80 overflow-auto" dangerouslySetInnerHTML={{ __html: buildBoardResolutionHtml(previewValues || {}, 'PREVIEW') }} />
            </div>
            <div className="border rounded-md overflow-hidden">
              <div className="px-3 py-2 text-sm font-semibold bg-slate-50 border-b">Offer Letter</div>
              <div className="p-4 max-h-80 overflow-auto" dangerouslySetInnerHTML={{ __html: buildOfferLetterHtml(previewValues || {}) }} />
            </div>
            {isExecutivePosition(previewValues?.position) && (previewValues?.equity > 0) && (
              <div className="border rounded-md overflow-hidden">
                <div className="px-3 py-2 text-sm font-semibold bg-slate-50 border-b">Equity Offer Agreement</div>
                <div className="p-4 max-h-80 overflow-auto" dangerouslySetInnerHTML={{ __html: buildEquityAgreementHtml(previewValues || {}) }} />
              </div>
            )}
            {(previewValues?.position || '').toLowerCase().includes('ceo') && (
              <div className="border rounded-md overflow-hidden">
                <div className="px-3 py-2 text-sm font-semibold bg-slate-50 border-b">Founders Equity Insurance Agreement</div>
                <div className="p-4 max-h-80 overflow-auto" dangerouslySetInnerHTML={{ __html: buildFoundersHtml(previewValues || {}, 'PREVIEW') }} />
              </div>
            )}
          </div>
        </div>

        <Space className="w-full justify-end">
          <Button onClick={() => setIsPreviewVisible(false)}>Back</Button>
          <Button type="primary" loading={isSending} onClick={confirmSendAndHire}>
            Send Documents & Hire
          </Button>
        </Space>
      </Modal>

      {/* Hiring Packet Status */}
      <div className="mt-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
          <div className="text-base sm:text-lg font-bold">Hiring Packet Status</div>
          <Space>
            <Input.Search 
              placeholder="Lookup by email" 
              onSearch={loadPacketStatus} 
              allowClear 
              className={isMobile ? 'w-full' : ''}
              style={isMobile ? {} : { width: 320 }} 
            />
          </Space>
        </div>
        {packetForEmail && (
          <div className="text-xs sm:text-sm text-slate-600 mt-1">Showing: {packetForEmail}</div>
        )}
        <div className="overflow-hidden">
          <Table
            className="mt-3"
            dataSource={packetDocs.map(d => ({ key: d.id, ...d }))}
            pagination={false}
            size={isMobile ? 'small' : 'default'}
            scroll={{ x: isMobile ? 600 : 'auto' }}
            columns={[
              { title: 'Document', dataIndex: 'label' },
              { title: 'Required', dataIndex: 'required', render: (v)=> v? 'Yes':'No', width: 90 },
              { title: 'Status', dataIndex: 'status', width: 120 },
              { title: 'File', dataIndex: 'file_url', render: (v)=> v? <a href={v} target="_blank">View</a> : '-' },
              { title: 'Actions', key:'actions', render: (_:any, rec:any) => (
                <Space>
                  <Upload
                    beforeUpload={() => false}
                    maxCount={1}
                    onChange={async ({ file }) => {
                      // @ts-ignore
                      if (!file || file.originFileObj == null) return;
                      // @ts-ignore
                      const blob = file.originFileObj;
                      const filename = `${rec.id}_${Date.now()}_${file.name}`;
                      const { data, error } = await supabase.storage.from('hiring-packets').upload(filename, blob);
                      if (!error && data) {
                        const { data: pub } = supabase.storage.from('hiring-packets').getPublicUrl(data.path);
                        await supabase.functions.invoke('mark-packet-doc', { body: { docId: rec.id, status: 'uploaded', fileUrl: pub.publicUrl } });
                        if (packetForEmail) loadPacketStatus(packetForEmail);
                        message.success('Uploaded');
                      }
                    }}
                  >
                    <Button size="small">Upload Signed</Button>
                  </Upload>
                </Space>
              ) }
            ]}
          />
        </div>
      </div>

      {/* Promote Modal */}
      <Modal
        title={`⬆️ Promote ${selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : 'Employee'}`}
        open={isPromoteModalVisible}
        onCancel={() => {
          setIsPromoteModalVisible(false);
          setSelectedEmployee(null);
          promoteForm.resetFields();
        }}
        footer={null}
        width={isMobile ? '90%' : 600}
      >
        <Form layout="vertical" form={promoteForm} onFinish={handlePromote}>
          <div className="bg-slate-50 p-4 rounded-lg mb-4">
            <div className="text-sm text-slate-600 mb-2">Current Position:</div>
            <div className="font-semibold">{selectedEmployee?.position}</div>
            <div className="text-sm text-slate-600 mt-2 mb-2">Current Salary:</div>
            <div className="font-semibold">${selectedEmployee?.salary?.toLocaleString()}</div>
          </div>

          <Form.Item
            label="New Position"
            name="new_position"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input placeholder="e.g., Senior Operations Director" />
          </Form.Item>

          <Form.Item
            label="New Salary"
            name="new_salary"
            rules={[{ required: true, message: 'Required' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value!.replace(/\$\s?|(,*)/g, '')}
              min={(selectedEmployee?.salary || 0) + 5000}
              step={5000}
            />
          </Form.Item>

          <Form.Item label="Transfer to Department" name="new_department_id">
            <Select placeholder="Keep current department" allowClear>
              {departments.map(dept => (
                <Option key={dept.id} value={dept.id}>{dept.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Reason for Promotion"
            name="reason"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input.TextArea rows={3} placeholder="Excellent performance, leadership skills, etc." />
          </Form.Item>

          <Form.Item>
            <Space className={`w-full ${isMobile ? 'flex-col' : 'justify-end'}`} direction={isMobile ? 'vertical' : 'horizontal'}>
              <Button onClick={() => {
                setIsPromoteModalVisible(false);
                setSelectedEmployee(null);
                promoteForm.resetFields();
              }} block={isMobile}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" size="large" block={isMobile}>
                ✅ Confirm Promotion
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Email History Modal */}
      <Modal
        title={`📧 Email History - ${selectedEmployee ? `${(selectedEmployee as any).first_name} ${(selectedEmployee as any).last_name}` : ''}`}
        open={isEmailHistoryVisible}
        onCancel={() => {
          setIsEmailHistoryVisible(false);
          setSelectedEmployee(null);
          setEmailHistory([]);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setIsEmailHistoryVisible(false);
            setSelectedEmployee(null);
            setEmailHistory([]);
          }}>
            Close
          </Button>
        ]}
        width={800}
      >
        <Table
          columns={[
            {
              title: 'Type',
              dataIndex: 'email_type',
              key: 'email_type',
              render: (type: string) => {
                const colors: any = {
                  'offer_letter': 'blue',
                  'portal_access': 'green',
                  'hiring_packet': 'orange',
                  'board_resolution': 'purple',
                  'equity_agreement': 'cyan',
                  'ms365_welcome': 'geekblue',
                  'other': 'default'
                };
                return <Tag color={colors[type] || 'default'}>{type.replace('_', ' ').toUpperCase()}</Tag>;
              }
            },
            {
              title: 'Subject',
              dataIndex: 'subject',
              key: 'subject',
            },
            {
              title: 'Recipient',
              dataIndex: 'recipient_email',
              key: 'recipient_email',
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status: string) => {
                const colors: any = {
                  'sent': 'blue',
                  'delivered': 'green',
                  'opened': 'geekblue',
                  'clicked': 'cyan',
                  'bounced': 'red',
                  'failed': 'volcano'
                };
                return <Tag color={colors[status] || 'default'}>{status?.toUpperCase() || 'SENT'}</Tag>;
              }
            },
            {
              title: 'Sent',
              dataIndex: 'sent_at',
              key: 'sent_at',
              render: (date: string) => dayjs(date).format('MMM D, YYYY HH:mm'),
              sorter: (a: any, b: any) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime(),
            }
          ]}
          dataSource={emailHistory}
          rowKey="id"
          loading={loadingEmails}
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Modal>

      {/* Edit Appointment Modal */}
      <Modal
        title={`✏️ Edit Executive Appointment${editingAppointment ? ` - ${editingAppointment.resolution_number}` : ''}`}
        open={isAppointmentModalVisible}
        onCancel={() => {
          setIsAppointmentModalVisible(false);
          setEditingAppointment(null);
          appointmentForm.resetFields();
        }}
        footer={null}
        width={isMobile ? '90%' : 700}
      >
        <Form layout="vertical" form={appointmentForm} onFinish={handleUpdateAppointment}>
          <Form.Item
            label="Resolution Title"
            name="resolution_title"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input placeholder="e.g., Appointment of John Doe as Chief Financial Officer" />
          </Form.Item>

          <Form.Item
            label="Resolution Text"
            name="resolution_text"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input.TextArea rows={4} placeholder="Full resolution text..." />
          </Form.Item>

          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <Form.Item
              label="Person Name"
              name="subject_person_name"
              rules={[{ required: true, message: 'Required' }]}
            >
              <Input placeholder="Full name" />
            </Form.Item>

            <Form.Item
              label="Person Email"
              name="subject_person_email"
              rules={[{ required: true, type: 'email', message: 'Valid email required' }]}
            >
              <Input placeholder="email@example.com" />
            </Form.Item>
          </div>

          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <Form.Item
              label="Position"
              name="subject_position"
              rules={[{ required: true, message: 'Required' }]}
            >
              <Input placeholder="e.g., Chief Financial Officer" />
            </Form.Item>

            <Form.Item
              label="Effective Date"
              name="effective_date"
              rules={[{ required: true, message: 'Required' }]}
            >
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
          </div>

          <Form.Item>
            <Space className="w-full justify-end">
              <Button onClick={() => {
                setIsAppointmentModalVisible(false);
                setEditingAppointment(null);
                appointmentForm.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Update Appointment
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Executive Removal Modal */}
      <Modal
        title={`Executive Removal - ${selectedEmployee?.first_name} ${selectedEmployee?.last_name}`}
        open={isExecutiveRemovalModalVisible}
        onCancel={() => {
          setIsExecutiveRemovalModalVisible(false);
          setSelectedEmployee(null);
          executiveRemovalForm.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={executiveRemovalForm}
          layout="vertical"
          onFinish={async (values) => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) throw new Error('User not authenticated');

              if (!selectedEmployee) throw new Error('No employee selected');

              // Create workflow
              const { data: workflow, error: workflowError } = await supabase
                .from('exit_workflows')
                .insert({
                  employee_id: selectedEmployee.id,
                  workflow_type: 'executive_removal',
                  termination_type: values.termination_type,
                  status: 'board_approval_pending',
                  effective_date: values.effective_date.format('YYYY-MM-DD'),
                  termination_reason: values.termination_reason,
                  grounds_for_cause: values.grounds_for_cause || [],
                  initiated_by: user.id,
                  steps_required: getRequiredSteps('executive_removal', true),
                })
                .select()
                .single();

              if (workflowError) throw workflowError;

              // Create workflow steps
              const steps = getRequiredSteps('executive_removal', true);
              await createWorkflowSteps(workflow.id, steps);

              // Create Board resolution
              const resolutionId = await createBoardResolutionForRemoval(
                workflow.id,
                selectedEmployee.id,
                `${selectedEmployee.first_name} ${selectedEmployee.last_name}`,
                selectedEmployee.position,
                values.termination_type,
                values.grounds_for_cause,
                values.termination_reason
              );

              if (!resolutionId) {
                message.warning('Workflow created but Board resolution creation failed. Please create manually.');
              }

              message.success('Executive removal workflow initiated. Board approval required.');
              setIsExecutiveRemovalModalVisible(false);
              setSelectedEmployee(null);
              executiveRemovalForm.resetFields();
              fetchEmployees();
            } catch (error: any) {
              message.error(error.message || 'Failed to initiate executive removal');
              console.error(error);
            }
          }}
          initialValues={{
            termination_type: 'without_cause',
            effective_date: dayjs(),
          }}
        >
          <Alert
            message="Board Approval Required"
            description="This executive removal requires Board approval. A Board resolution will be created for voting."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Form.Item
            name="termination_type"
            label="Termination Type"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="for_cause">For Cause</Option>
              <Option value="without_cause">Without Cause</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="effective_date"
            label="Effective Date"
            rules={[{ required: true }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="termination_reason"
            label="Termination Reason"
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={4} placeholder="Enter reason for executive removal..." />
          </Form.Item>

          <Form.Item
            name="grounds_for_cause"
            label="Grounds for Cause (if applicable)"
            dependencies={['termination_type']}
          >
            <Select
              mode="multiple"
              placeholder="Select grounds"
              disabled={executiveRemovalForm.getFieldValue('termination_type') !== 'for_cause'}
            >
              <Option value="financial_misconduct">Financial Misconduct</Option>
              <Option value="security_violation">Security Violation</Option>
              <Option value="ethical_violation">Ethical Violation</Option>
              <Option value="performance_failure">Performance Failure</Option>
              <Option value="material_breach">Material Breach</Option>
              <Option value="insubordination">Insubordination</Option>
              <Option value="criminal_conduct">Criminal Conduct</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button onClick={() => {
                setIsExecutiveRemovalModalVisible(false);
                setSelectedEmployee(null);
                executiveRemovalForm.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" danger>
                Initiate Executive Removal
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

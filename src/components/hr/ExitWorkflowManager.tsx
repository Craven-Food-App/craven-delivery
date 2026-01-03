// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  Card, Steps, Button, Form, Input, Select, DatePicker, 
  Modal, Table, Tag, Space, message, Divider, Descriptions,
  Typography, Alert, Timeline, Checkbox, InputNumber
} from 'antd';
import { 
  UserDeleteOutlined, CheckCircleOutlined, 
  CloseCircleOutlined, ClockCircleOutlined,
  FileTextOutlined, DollarOutlined, KeyOutlined,
  ExclamationCircleOutlined, EyeOutlined
} from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import { isCLevelPosition } from '@/utils/roleUtils';
import {
  getRequiredSteps,
  createWorkflowSteps,
  createBoardResolutionForRemoval,
  requiresBoardApproval,
  calculateFinalCompensation,
  getDefaultAssetChecklist,
  getDefaultAccessSystems,
  logExitWorkflowAction,
  type FinalCompensation
} from '@/utils/exitWorkflowUtils';
import dayjs from 'dayjs';
import { ExitWorkflowDetailModal } from './exit/ExitWorkflowDetailModal';
import { useWatch } from 'antd/es/form/Form';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface ExitWorkflow {
  id: string;
  employee_id: string;
  workflow_type: string;
  termination_type?: string;
  status: string;
  effective_date: string;
  termination_reason?: string;
  board_resolution_id?: string;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    position: string;
    employment_status: string;
  };
  board_resolution?: {
    id: string;
    resolution_number: string;
    status: string;
  };
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  employment_status: string;
}

export const ExitWorkflowManager: React.FC = () => {
  const [workflows, setWorkflows] = useState<ExitWorkflow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [isInitiateModalVisible, setIsInitiateModalVisible] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<ExitWorkflow | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [creatingResolution, setCreatingResolution] = useState<string | null>(null);
  const [form] = Form.useForm();
  const terminationType = Form.useWatch('termination_type', form);

  useEffect(() => {
    fetchWorkflows();
    fetchEmployees();
  }, []);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exit_workflows')
        .select(`
          *,
          employee:employees(id, first_name, last_name, email, position, employment_status),
          board_resolution:board_resolutions!board_resolution_id(id, resolution_number, status, resolution_title)
        `)
        .order('created_at', { ascending: false });

      // Note: Resolutions are in board_resolutions table, not governance_board_resolutions
      // The Board Resolutions UI queries governance_board_resolutions, so these won't show there
      // until the migration runs to create them in both tables

      if (error) throw error;
      
      // Debug: Log workflow data to see resolution status
      console.log('📋 [FETCH WORKFLOWS] Fetched workflows:', data?.length || 0);
      if (data) {
        // For each workflow with a resolution_id, verify the resolution actually exists
        for (const w of data) {
          const hasResolutionId = !!w.board_resolution_id;
          const hasResolutionObj = !!(w.board_resolution && w.board_resolution.resolution_number);
          const isExecutive = w.workflow_type === 'executive_removal';
          
          // Log detailed resolution info
          if (hasResolutionId) {
            console.log(`📄 [RESOLUTION CHECK] Workflow ${w.id}:`, {
              resolution_id: w.board_resolution_id,
              has_resolution_obj: !!w.board_resolution,
              resolution_number: w.board_resolution?.resolution_number || 'MISSING',
              resolution_status: w.board_resolution?.status || 'MISSING',
              resolution_title: w.board_resolution?.resolution_title || 'MISSING',
            });
          }
          
          // If there's a resolution_id but no resolution object, verify it exists in DB
          if (hasResolutionId && !hasResolutionObj) {
            console.log(`⚠️ [FETCH WORKFLOWS] Workflow ${w.id} has resolution_id ${w.board_resolution_id} but no object. Verifying...`);
            const { data: verifyRes, error: verifyError } = await supabase
              .from('board_resolutions')
              .select('id, resolution_number, status, resolution_title')
              .eq('id', w.board_resolution_id)
              .single();
            
            if (verifyError || !verifyRes) {
              console.log(`❌ [FETCH WORKFLOWS] Resolution ${w.board_resolution_id} does NOT exist in database! Clearing stale ID...`);
              // Clear the stale resolution_id
              await supabase
                .from('exit_workflows')
                .update({ board_resolution_id: null })
                .eq('id', w.id);
              w.board_resolution_id = null;
            } else {
              console.log(`✅ [FETCH WORKFLOWS] Resolution exists: ${verifyRes.resolution_number} (${verifyRes.status})`);
              // Manually set the resolution object since join failed
              w.board_resolution = verifyRes;
            }
          }
          
          const shouldShowButton = isExecutive && !hasResolutionObj;
          console.log(`  - Workflow ${w.id}: type=${w.workflow_type}, resolution_id=${w.board_resolution_id}, has_resolution_obj=${hasResolutionObj}, resolution_number=${w.board_resolution?.resolution_number || 'N/A'}, should_show_button=${shouldShowButton}`);
        }
      }
      
      setWorkflows(data || []);
    } catch (error: any) {
      message.error('Failed to fetch exit workflows');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      console.log('🔍 Fetching ALL executives from exec_users table...');
      
      // Get ALL exec_users - no role filtering, get everyone
      const { data: execUsers, error: execUsersError } = await supabase
        .from('exec_users')
        .select('id, user_id, role, title, linked_employee_id')
        .order('role');

      console.log('✅ Exec users fetched:', execUsers?.length || 0);
      console.log('📋 Exec users data:', execUsers);

      if (execUsersError) {
        console.error('❌ Error fetching exec_users:', execUsersError);
        throw execUsersError;
      }

      if (!execUsers || execUsers.length === 0) {
        console.log('⚠️ No executives found in exec_users table');
        setEmployees([]);
        message.warning('No executives found in exec_users table.');
        return;
      }

      // Get all user_ids
      const execUserIds = execUsers.map(eu => eu.user_id).filter(Boolean);
      console.log('👤 User IDs to lookup:', execUserIds);

      // Get linked employee IDs
      const linkedEmployeeIds = execUsers
        .map(eu => eu.linked_employee_id)
        .filter(Boolean) as string[];
      console.log('🔗 Linked employee IDs:', linkedEmployeeIds);

      // Fetch employees by linked_employee_id
      let employeesByLinkedId: Record<string, any> = {};
      if (linkedEmployeeIds.length > 0) {
        const { data: linkedEmployees, error: linkedError } = await supabase
          .from('employees')
          .select('id, user_id, first_name, last_name, email, position, employment_status')
          .in('id', linkedEmployeeIds)
          .neq('employment_status', 'terminated');

        if (linkedError) {
          console.warn('⚠️ Error fetching linked employees:', linkedError);
        } else {
          console.log('✅ Linked employees found:', linkedEmployees?.length || 0);
          if (linkedEmployees) {
            linkedEmployees.forEach(emp => {
              employeesByLinkedId[emp.id] = emp;
            });
          }
        }
      }

      // Fetch employees by user_id
      let employeesByUserId: Record<string, any> = {};
      if (execUserIds.length > 0) {
        const { data: employeesForExecs, error: empError } = await supabase
          .from('employees')
          .select('id, user_id, first_name, last_name, email, position, employment_status')
          .in('user_id', execUserIds)
          .neq('employment_status', 'terminated');

        if (empError) {
          console.warn('⚠️ Error fetching employees by user_id:', empError);
        } else {
          console.log('✅ Employees by user_id found:', employeesForExecs?.length || 0);
          if (employeesForExecs) {
            employeesForExecs.forEach(emp => {
              employeesByUserId[emp.user_id] = emp;
            });
          }
        }
      }

      // Get user profiles as fallback for names
      let userProfilesMap: Record<string, { email: string; full_name: string }> = {};
      if (execUserIds.length > 0) {
        const { data: userProfiles } = await supabase
          .from('user_profiles')
          .select('user_id, email, full_name')
          .in('user_id', execUserIds);
        
        if (userProfiles) {
          userProfiles.forEach(up => {
            userProfilesMap[up.user_id] = { email: up.email || '', full_name: up.full_name || '' };
          });
          console.log('✅ User profiles found:', userProfiles.length);
        }
      }

      // Build the final list
      const allEmployees: Employee[] = [];
      const employeeMap = new Map<string, Employee>();

      for (const execUser of execUsers) {
        let employee: Employee | null = null;

        // Priority 1: Check linked_employee_id
        if (execUser.linked_employee_id) {
          employee = employeesByLinkedId[execUser.linked_employee_id] || null;
          console.log(`🔍 Exec ${execUser.role} (${execUser.title}): Checking linked_employee_id ${execUser.linked_employee_id}`, employee ? '✅ Found' : '❌ Not found');
        }

        // Priority 2: Check by user_id
        if (!employee && execUser.user_id) {
          employee = employeesByUserId[execUser.user_id] || null;
          console.log(`🔍 Exec ${execUser.role} (${execUser.title}): Checking user_id ${execUser.user_id}`, employee ? '✅ Found' : '❌ Not found');
        }

        if (employee && !employeeMap.has(employee.id)) {
          if (employee.employment_status !== 'terminated') {
            allEmployees.push(employee);
            employeeMap.set(employee.id, employee);
            console.log(`✅ Added: ${employee.first_name} ${employee.last_name} - ${employee.position}`);
          } else {
            console.log(`⏭️ Skipped (terminated): ${employee.first_name} ${employee.last_name}`);
          }
        } else if (!employee) {
          // Executive without employee record - CREATE ONE AUTOMATICALLY
          const profile = execUser.user_id ? userProfilesMap[execUser.user_id] : null;
          
          if (profile && execUser.user_id) {
            // Parse full_name into first_name and last_name
            const nameParts = profile.full_name.trim().split(/\s+/);
            const firstName = nameParts[0] || 'Executive';
            const lastName = nameParts.slice(1).join(' ') || execUser.role.toUpperCase();
            
            console.log(`🔨 Creating employee record for ${profile.full_name} (${execUser.role})...`);
            
            try {
              // Generate unique employee number
              const timestamp = Date.now();
              const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
              const employeeNumber = `EXEC-${execUser.role.toUpperCase()}-${timestamp.toString().slice(-6)}-${random}`;
              
              // Check if email already exists
              const proposedEmail = profile.email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@cravenusa.com`;
              const { data: existingEmployeeByEmail } = await supabase
                .from('employees')
                .select('id, user_id, first_name, last_name, email, position, employment_status')
                .eq('email', proposedEmail)
                .maybeSingle();
              
              if (existingEmployeeByEmail) {
                console.log(`ℹ️ Employee record already exists for email ${proposedEmail}. Using existing record.`);
                // Use existing employee record
                if (!employeeMap.has(existingEmployeeByEmail.id) && existingEmployeeByEmail.employment_status !== 'terminated') {
                  allEmployees.push(existingEmployeeByEmail as Employee);
                  employeeMap.set(existingEmployeeByEmail.id, existingEmployeeByEmail as Employee);
                }
                continue; // Skip to next exec_user
              }
              
              // Create employee record
              const { data: newEmployee, error: createError } = await supabase
                .from('employees')
                .insert({
                  user_id: execUser.user_id,
                  employee_number: employeeNumber,
                  first_name: firstName,
                  last_name: lastName,
                  email: proposedEmail,
                  position: execUser.title || execUser.role.toUpperCase().replace('_', ' '),
                  employment_type: 'full-time',
                  employment_status: 'active',
                  hire_date: new Date().toISOString().split('T')[0],
                  start_date: new Date().toISOString().split('T')[0],
                })
                .select()
                .single();
              
              if (createError) {
                console.error(`❌ Failed to create employee record for ${profile.full_name}:`, createError);
              } else if (newEmployee) {
                console.log(`✅ Created employee record: ${newEmployee.first_name} ${newEmployee.last_name} (${newEmployee.id})`);
                // Add to list
                if (!employeeMap.has(newEmployee.id)) {
                  allEmployees.push(newEmployee as Employee);
                  employeeMap.set(newEmployee.id, newEmployee as Employee);
                }
              }
            } catch (createErr: any) {
              console.error(`❌ Error creating employee record for ${profile.full_name}:`, createErr);
            }
          } else {
            const execName = execUser.title || execUser.role.toUpperCase();
            console.warn(`⚠️ Executive ${execName} (${execUser.role}) has no employee record and no user profile. Cannot create automatically.`);
          }
        }
      }

      // Sort by first name
      allEmployees.sort((a, b) => (a.first_name || '').localeCompare(b.first_name || ''));

      console.log('🎯 TOTAL EXECUTIVES FOR EXIT WORKFLOW:', allEmployees.length);
      console.log('📝 Executive list:', allEmployees.map(e => `${e.first_name} ${e.last_name} - ${e.position} (${e.employment_status})`));

      setEmployees(allEmployees);
      
      if (allEmployees.length === 0) {
        message.warning(`Found ${execUsers.length} executives in exec_users, but none have employee records. Executives must have employee records to create exit workflows.`);
      } else {
        message.success(`Found ${allEmployees.length} executive(s) available for removal.`);
      }
    } catch (error: any) {
      console.error('❌ Error fetching executives:', error);
      message.error(`Failed to fetch executives: ${error.message || 'Unknown error'}`);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleInitiateWorkflow = async (values: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get employee details
      const employee = employees.find(e => e.id === values.employee_id);
      if (!employee) throw new Error('Employee not found');

      const isExecutive = isCLevelPosition(employee.position);
      const workflowType = isExecutive ? 'executive_removal' : 'employee_termination';
      const status = isExecutive ? 'board_approval_pending' : 'initiated';

      // Create workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('exit_workflows')
        .insert({
          employee_id: values.employee_id,
          workflow_type: workflowType,
          termination_type: values.termination_type,
          status: status,
          effective_date: values.effective_date.format('YYYY-MM-DD'),
          termination_reason: values.termination_reason,
          grounds_for_cause: values.grounds_for_cause || [],
          initiated_by: user.id,
          steps_required: getRequiredSteps(workflowType, isExecutive),
        })
        .select()
        .single();

      if (workflowError) throw workflowError;

      // Create workflow steps
      const steps = getRequiredSteps(workflowType, isExecutive);
      await createWorkflowSteps(workflow.id, steps);

      // If executive, create Board resolution - CRITICAL: Must succeed
      let resolutionId: string | null = null;
      if (isExecutive) {
        try {
          console.log('🔨 [CRITICAL] Creating board resolution for executive removal...');
          resolutionId = await createBoardResolutionForRemoval(
            workflow.id,
            employee.id,
            `${employee.first_name} ${employee.last_name}`,
            employee.position,
            values.termination_type,
            values.grounds_for_cause,
            values.termination_reason
          );

          if (!resolutionId) {
            const errorMsg = 'CRITICAL: Board resolution creation returned null. This should never happen.';
            console.error('❌', errorMsg);
            message.error(errorMsg);
            throw new Error(errorMsg);
          } else {
            console.log('✅ [SUCCESS] Board resolution created:', resolutionId);
            message.success('Board resolution created successfully. Board members can now vote.');
          }
        } catch (resolutionError: any) {
          const errorMsg = `CRITICAL FAILURE: Board resolution creation failed: ${resolutionError.message || 'Unknown error'}`;
          console.error('❌', errorMsg, resolutionError);
          message.error(errorMsg);
          // This is critical - we should not proceed without a board resolution for executives
          throw new Error(`Executive removal requires board resolution. ${errorMsg}`);
        }
      }

      // AUDIT LOGGING - Log to both governance_logs and unified_audit_trail
      const employeeName = `${employee.first_name} ${employee.last_name}`;
      await logExitWorkflowAction(
        'Exit Workflow Initiated',
        workflow.id,
        employee.id,
        employeeName,
        employee.position,
        undefined,
        status,
        {
          workflow_type: workflowType,
          termination_type: values.termination_type,
          termination_reason: values.termination_reason,
          grounds_for_cause: values.grounds_for_cause || [],
          effective_date: values.effective_date.format('YYYY-MM-DD'),
          board_resolution_id: resolutionId,
          requires_board_approval: isExecutive,
        }
      );

      message.success('Exit workflow initiated successfully');
      setIsInitiateModalVisible(false);
      form.resetFields();
      fetchWorkflows();
    } catch (error: any) {
      message.error(error.message || 'Failed to initiate exit workflow');
      console.error(error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      initiated: 'blue',
      board_approval_pending: 'orange',
      board_approved: 'green',
      board_rejected: 'red',
      notice_sent: 'cyan',
      access_revoked: 'purple',
      assets_returned: 'geekblue',
      final_settlement: 'gold',
      completed: 'green',
      cancelled: 'default',
    };
    return colors[status] || 'default';
  };

  const handleViewWorkflow = (workflow: ExitWorkflow) => {
    setSelectedWorkflow(workflow);
    setIsDetailModalVisible(true);
  };

  const handleMergeDuplicates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Find duplicate workflows (same employee_id and workflow_type)
      const duplicates = new Map<string, ExitWorkflow[]>();
      workflows.forEach(w => {
        const key = `${w.employee_id}_${w.workflow_type}`;
        if (!duplicates.has(key)) {
          duplicates.set(key, []);
        }
        duplicates.get(key)!.push(w);
      });

      // Process each set of duplicates
      for (const [key, dupWorkflows] of duplicates.entries()) {
        if (dupWorkflows.length <= 1) continue;

        // Sort by created_at (most recent first)
        dupWorkflows.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        const keepWorkflow = dupWorkflows[0]; // Keep the most recent
        const deleteWorkflows = dupWorkflows.slice(1); // Delete the rest

        console.log(`🔄 [MERGE] Keeping workflow ${keepWorkflow.id}, deleting ${deleteWorkflows.length} duplicates`);

        // For each duplicate to delete:
        for (const dupWorkflow of deleteWorkflows) {
          // Transfer steps to the kept workflow if they don't exist
          const { data: dupSteps } = await supabase
            .from('exit_workflow_steps')
            .select('*')
            .eq('workflow_id', dupWorkflow.id);

          if (dupSteps && dupSteps.length > 0) {
            const { data: keepSteps } = await supabase
              .from('exit_workflow_steps')
              .select('step_name')
              .eq('workflow_id', keepWorkflow.id);

            const keepStepNames = new Set(keepSteps?.map(s => s.step_name) || []);

            for (const step of dupSteps) {
              if (!keepStepNames.has(step.step_name)) {
                // Transfer this step to the kept workflow
                await supabase
                  .from('exit_workflow_steps')
                  .update({ workflow_id: keepWorkflow.id })
                  .eq('id', step.id);
                console.log(`  ✅ Transferred step ${step.step_name} to workflow ${keepWorkflow.id}`);
              }
            }
          }

          // Transfer access revocations
          await supabase
            .from('exit_access_revocations')
            .update({ workflow_id: keepWorkflow.id })
            .eq('workflow_id', dupWorkflow.id);

          // Transfer asset returns
          await supabase
            .from('exit_asset_returns')
            .update({ workflow_id: keepWorkflow.id })
            .eq('workflow_id', dupWorkflow.id);

          // If duplicate has a resolution but kept one doesn't, transfer it
          if (dupWorkflow.board_resolution_id && !keepWorkflow.board_resolution_id) {
            await supabase
              .from('exit_workflows')
              .update({ board_resolution_id: dupWorkflow.board_resolution_id })
              .eq('id', keepWorkflow.id);
            console.log(`  ✅ Transferred board resolution ${dupWorkflow.board_resolution_id} to workflow ${keepWorkflow.id}`);
          }

          // Delete the duplicate workflow (cascade will delete related records)
          await supabase
            .from('exit_workflows')
            .delete()
            .eq('id', dupWorkflow.id);

          console.log(`  🗑️ Deleted duplicate workflow ${dupWorkflow.id}`);
        }
      }

      message.success('Duplicate workflows merged successfully');
      fetchWorkflows(); // Refresh the list
    } catch (error: any) {
      console.error('Error merging duplicates:', error);
      message.error(`Failed to merge duplicates: ${error.message || 'Unknown error'}`);
    }
  };

  const handleCreateBoardResolution = async (workflow: ExitWorkflow) => {
    if (!workflow.employee) {
      message.error('Employee information not available');
      return;
    }

    setCreatingResolution(workflow.id);
    try {
      console.log('🔨 [MANUAL CREATE] Creating board resolution for workflow:', workflow.id);
      console.log('🔨 [MANUAL CREATE] Current workflow state:', {
        workflow_id: workflow.id,
        board_resolution_id: workflow.board_resolution_id,
        has_board_resolution_obj: !!workflow.board_resolution,
        employee: `${workflow.employee.first_name} ${workflow.employee.last_name}`,
        position: workflow.employee.position,
        termination_type: workflow.termination_type,
      });

      // If there's a stale resolution_id, we should verify it doesn't exist first
      if (workflow.board_resolution_id && !workflow.board_resolution) {
        console.log('⚠️ [MANUAL CREATE] Workflow has resolution_id but no resolution object. Checking if resolution exists...');
        const { data: existingResolution, error: checkError } = await supabase
          .from('board_resolutions')
          .select('id, resolution_number, status')
          .eq('id', workflow.board_resolution_id)
          .single();

        if (checkError || !existingResolution) {
          console.log('⚠️ [MANUAL CREATE] Resolution does not exist in database. Clearing stale ID...');
          // Clear the stale resolution_id
          await supabase
            .from('exit_workflows')
            .update({ board_resolution_id: null })
            .eq('id', workflow.id);
        } else {
          console.log('✅ [MANUAL CREATE] Resolution exists:', existingResolution.resolution_number);
          message.info(`Resolution ${existingResolution.resolution_number} already exists. Refreshing workflow data...`);
          fetchWorkflows();
          setCreatingResolution(null);
          return;
        }
      }

      const resolutionId = await createBoardResolutionForRemoval(
        workflow.id,
        workflow.employee_id,
        `${workflow.employee.first_name} ${workflow.employee.last_name}`,
        workflow.employee.position,
        (workflow.termination_type || 'without_cause') as 'for_cause' | 'without_cause',
        workflow.grounds_for_cause || [],
        workflow.termination_reason || undefined
      );

      if (resolutionId) {
        console.log('✅ [MANUAL CREATE] Board resolution created successfully:', resolutionId);
        message.success('Board resolution created successfully');
        // Wait a moment for the database to sync, then refresh
        setTimeout(() => {
          fetchWorkflows(); // Refresh to show the new resolution
        }, 500);
      } else {
        console.error('❌ [MANUAL CREATE] createBoardResolutionForRemoval returned null');
        message.error('Failed to create board resolution. Check console for details.');
      }
    } catch (error: any) {
      console.error('❌ [MANUAL CREATE] Error creating board resolution:', error);
      message.error(`Failed to create board resolution: ${error.message || 'Unknown error'}`);
    } finally {
      setCreatingResolution(null);
    }
  };

  const columns = [
    {
      title: 'Employee',
      key: 'employee',
      render: (_: any, record: ExitWorkflow) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {record.employee?.first_name} {record.employee?.last_name}
          </div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.employee?.position}
          </Text>
        </div>
      ),
    },
                {
                  title: 'Type',
                  dataIndex: 'workflow_type',
                  width: 120,
                  render: (type: string) => (
                    <Tag style={{ fontSize: '11px', padding: '2px 8px' }}>
                      {type.replace('_', ' ').toUpperCase()}
                    </Tag>
                  ),
                },
                {
                  title: 'Term Type',
                  dataIndex: 'termination_type',
                  width: 110,
                  render: (type: string) => type ? (
                    <Tag color={type === 'for_cause' ? 'red' : 'orange'} style={{ fontSize: '11px', padding: '2px 8px' }}>
                      {type === 'for_cause' ? 'CAUSE' : type === 'without_cause' ? 'NO CAUSE' : type.toUpperCase()}
                    </Tag>
                  ) : '-',
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  width: 140,
                  render: (status: string) => (
                    <Tag color={getStatusColor(status)} style={{ fontSize: '11px', padding: '2px 8px' }}>
                      {status.replace('_', ' ').toUpperCase()}
                    </Tag>
                  ),
                },
                {
                  title: 'Effective',
                  dataIndex: 'effective_date',
                  width: 100,
                  render: (date: string) => (
                    <span style={{ fontSize: '12px' }}>{dayjs(date).format('MMM DD, YYYY')}</span>
                  ),
                },
                {
                  title: 'Resolution',
                  key: 'board_resolution',
                  width: 130,
                  render: (_: any, record: ExitWorkflow) => {
                    // Only show resolution if the object actually exists
                    if (record.board_resolution && record.board_resolution.resolution_number) {
                      const status = record.board_resolution.status?.toLowerCase() || '';
                      const isApproved = status === 'approved' || status === 'executed' || status === 'adopted';
                      const resolutionNum = record.board_resolution.resolution_number;
                      return (
                        <Tag color={isApproved ? 'green' : 'orange'} style={{ fontSize: '11px', padding: '2px 8px' }}>
                          {resolutionNum.length > 12 ? resolutionNum.slice(0, 12) + '...' : resolutionNum}
                        </Tag>
                      );
                    }
                    // If there's a resolution_id but no resolution object, it means the resolution doesn't exist
                    if (record.board_resolution_id) {
                      return (
                        <Tag color="red" style={{ fontSize: '11px', padding: '2px 8px' }}>
                          Missing (ID: {record.board_resolution_id.slice(0, 8)}...)
                        </Tag>
                      );
                    }
                    // No resolution at all
                    return (
                      <Tag color="red" style={{ fontSize: '11px', padding: '2px 8px' }}>Not Created</Tag>
                    );
                  },
                },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: ExitWorkflow) => {
        // Check if resolution actually exists
        // Resolution only truly exists if we have the resolution object with a resolution_number
        const hasResolutionObj = !!(record.board_resolution && record.board_resolution.resolution_number);
        const hasResolutionId = !!record.board_resolution_id;
        const isExecutive = record.workflow_type === 'executive_removal';
        
        // Show button if: executive removal AND resolution object doesn't exist
        // (even if there's a resolution_id, if the object is missing, the resolution doesn't exist)
        const needsResolution = isExecutive && !hasResolutionObj;
        
        // Debug logging - always log for executives
        if (isExecutive) {
          console.log(`🔘 [TABLE BUTTON] Workflow ${record.id}:`, {
            isExecutive,
            hasResolutionId,
            hasResolutionObj,
            needsResolution,
            resolution_id: record.board_resolution_id,
            resolution_obj_exists: !!record.board_resolution,
            resolution_number: record.board_resolution?.resolution_number || 'N/A'
          });
        }
        
        return (
          <Space size="small">
            {needsResolution && (
              <Button 
                type="primary"
                danger
                size="small"
                onClick={() => handleCreateBoardResolution(record)}
                loading={creatingResolution === record.id}
                style={{ fontSize: '11px', padding: '0 8px', height: '24px', fontWeight: 'bold' }}
              >
                {hasResolutionId ? 'Recreate Resolution' : 'Create Resolution'}
              </Button>
            )}
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => handleViewWorkflow(record)}
              style={{ fontSize: '11px', padding: '0 8px', height: '24px' }}
            >
              View
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: '16px' }}>
      <Card style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
          <div>
            <Title level={3} style={{ margin: 0, fontSize: '20px' }}>Executive Removal Workflow</Title>
            <Text type="secondary" style={{ fontSize: '12px' }}>Manage executive removals and board-appointed officer terminations. Regular employees are terminated through HR Portal.</Text>
          </div>
          <Space>
            {workflows.length > 0 && (
              <Button
                type="default"
                icon={<CheckCircleOutlined />}
                size="middle"
                onClick={handleMergeDuplicates}
                title="Merge duplicate workflows for the same employee"
              >
                Merge Duplicates
              </Button>
            )}
            <Button
              type="primary"
              icon={<UserDeleteOutlined />}
              size="middle"
              onClick={() => setIsInitiateModalVisible(true)}
            >
              Initiate Exit Process
            </Button>
          </Space>
        </div>

                    <Table
                      columns={columns}
                      dataSource={workflows}
                      loading={loading}
                      rowKey="id"
                      pagination={{ pageSize: 20, size: 'small' }}
                      size="small"
                      scroll={{ x: 'max-content' }}
                    />
      </Card>

      {/* Initiate Workflow Modal */}
      <Modal
        title="Initiate Exit Process"
        open={isInitiateModalVisible}
        onCancel={() => {
          setIsInitiateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleInitiateWorkflow}
          initialValues={{
            termination_type: 'without_cause',
            effective_date: dayjs(),
          }}
        >
          <Form.Item
            name="employee_id"
            label="Executive / Board-Appointed Officer"
            rules={[{ required: true, message: 'Please select an executive' }]}
          >
            <Select
              showSearch
              placeholder={employees.length === 0 ? "No executives available" : "Select executive"}
              optionFilterProp="children"
              filterOption={(input, option) => {
                const text = (option?.children as string) || '';
                return text.toLowerCase().includes(input.toLowerCase());
              }}
              notFoundContent={employees.length === 0 ? "No executives found. Only executives and board-appointed officers appear here." : "No matching executives"}
              loading={loadingEmployees}
              disabled={employees.length === 0 || loadingEmployees}
            >
              {employees.map(emp => (
                <Option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} - {emp.position}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="termination_type"
            label="Termination Type"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="for_cause">For Cause</Option>
              <Option value="without_cause">Without Cause</Option>
              <Option value="resignation">Resignation</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="effective_date"
            label="Effective Date"
            rules={[{ required: true, message: 'Please select effective date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="termination_reason"
            label="Termination Reason"
            rules={[{ required: true, message: 'Please enter termination reason' }]}
          >
            <TextArea rows={4} placeholder="Enter reason for termination..." />
          </Form.Item>

          <Form.Item
            name="grounds_for_cause"
            label="Grounds for Cause (if applicable)"
            dependencies={['termination_type']}
          >
            <Select
              mode="multiple"
              placeholder="Select grounds"
              disabled={terminationType !== 'for_cause'}
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

          <Alert
            message="Note"
            description="C-Suite executives will require Board approval before the termination can proceed."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large">
              Initiate Exit Process
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Workflow Detail Modal */}
      {selectedWorkflow && (
        <ExitWorkflowDetailModal
          workflow={selectedWorkflow}
          visible={isDetailModalVisible}
          onClose={() => {
            setIsDetailModalVisible(false);
            setSelectedWorkflow(null);
          }}
          onUpdate={fetchWorkflows}
        />
      )}
    </div>
  );
};


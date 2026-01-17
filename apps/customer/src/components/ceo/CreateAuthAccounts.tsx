// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Alert, message, Modal, Input } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, UserAddOutlined, ReloadOutlined } from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import { isCLevelPosition } from '@/utils/roleUtils';

interface EmployeeNeedingAuth {
  employee_id: string;
  employee_name: string;
  position: string;
  email: string;
  phone: string | null;
}

export const CreateAuthAccounts: React.FC = () => {
  const [employees, setEmployees] = useState<EmployeeNeedingAuth[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [passwordModal, setPasswordModal] = useState<{ visible: boolean; employee: EmployeeNeedingAuth | null; password: string }>({
    visible: false,
    employee: null,
    password: '',
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, position, email, phone')
        .is('user_id', null);

      if (error) throw error;

      const cLevelEmployees = (data || []).filter((emp: any) => 
        isCLevelPosition(emp.position)
      );

      setEmployees(cLevelEmployees.map((emp: any) => ({
        employee_id: emp.id,
        employee_name: `${emp.first_name} ${emp.last_name}`,
        position: emp.position,
        email: emp.email,
        phone: emp.phone,
      })));
    } catch (error) {
      console.error('Error fetching employees:', error);
      message.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const handleCreateAuthAccount = async (employee: EmployeeNeedingAuth) => {
    try {
      setCreating(employee.employee_id);
      
      // Get department info
      const { data: empData } = await supabase
        .from('employees')
        .select('department_id, departments(name)')
        .eq('id', employee.employee_id)
        .single();

      const department = empData?.departments?.name || 'Executive';
      
      // Determine exec role
      const position = employee.position.toLowerCase();
      let execRole = 'board_member';
      if (position.includes('ceo') || position.includes('chief executive')) execRole = 'ceo';
      else if (position.includes('cfo') || position.includes('chief financial')) execRole = 'cfo';
      else if (position.includes('coo') || position.includes('chief operating')) execRole = 'coo';
      else if (position.includes('cto') || position.includes('chief technology')) execRole = 'cto';

      // Generate password
      const tempPassword = generatePassword();
      
      // Call edge function to create auth account
      const { data, error } = await supabase.functions.invoke('create-executive-user', {
        body: {
          firstName: employee.employee_name.split(' ')[0],
          lastName: employee.employee_name.split(' ').slice(1).join(' '),
          email: employee.email,
          position: employee.position,
          department: department,
          role: execRole,
          password: tempPassword, // Pass the generated password to edge function
          employeeId: employee.employee_id, // Pass employee ID so edge function can link it
        }
      });

      if (error) throw error;

      if (data?.userId) {
        // Edge function should have linked it, but ensure it's linked
        const { error: updateError } = await supabase
          .from('employees')
          .update({ user_id: data.userId })
          .eq('id', employee.employee_id);

        if (updateError) {
          console.warn('Employee already linked or link failed:', updateError);
          // Don't fail - might already be linked by trigger
        }

        // Show password in modal (use password from response if available, otherwise use generated one)
        setPasswordModal({
          visible: true,
          employee,
          password: data.tempPassword || tempPassword,
        });

        message.success(`Auth account created for ${employee.employee_name}`);
        fetchEmployees(); // Refresh list
      } else {
        throw new Error('No userId returned from edge function');
      }
    } catch (error: any) {
      console.error('Error creating auth account:', error);
      message.error(`Failed to create auth account: ${error.message || 'Unknown error'}`);
    } finally {
      setCreating(null);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'employee_name',
      key: 'employee_name',
    },
    {
      title: 'Position',
      dataIndex: 'position',
      key: 'position',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: EmployeeNeedingAuth) => (
        <Button
          type="primary"
          icon={<UserAddOutlined />}
          loading={creating === record.employee_id}
          onClick={() => handleCreateAuthAccount(record)}
        >
          Create Auth Account
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <Card>
        <div className="text-center py-8">
          <p>Loading employees...</p>
        </div>
      </Card>
    );
  }

  if (employees.length === 0) {
    return (
      <Card>
        <Alert
          message="All C-level employees have auth accounts!"
          description="All employees are properly linked. No action needed."
          type="success"
          showIcon
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold">Create Auth Accounts for C-Level Employees</h3>
            <p className="text-sm text-gray-600">
              {employees.length} employee(s) need auth accounts created
            </p>
          </div>
          <Button icon={<ReloadOutlined />} onClick={fetchEmployees}>
            Refresh
          </Button>
        </div>

        <Alert
          message="Action Required"
          description="These employees need auth accounts to access the system. Click 'Create Auth Account' to automatically create accounts and link them."
          type="warning"
          showIcon
          className="mb-4"
        />

        <Table
          columns={columns}
          dataSource={employees}
          rowKey="employee_id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Password Modal */}
      <Modal
        title="Auth Account Created Successfully"
        open={passwordModal.visible}
        onCancel={() => setPasswordModal({ visible: false, employee: null, password: '' })}
        footer={[
          <Button key="copy" onClick={() => {
            navigator.clipboard.writeText(passwordModal.password);
            message.success('Password copied to clipboard!');
          }}>
            Copy Password
          </Button>,
          <Button key="close" type="primary" onClick={() => setPasswordModal({ visible: false, employee: null, password: '' })}>
            Close
          </Button>,
        ]}
      >
        <div className="space-y-4">
          <Alert
            message="Account Created"
            description={`Auth account has been created for ${passwordModal.employee?.employee_name}. The employee record has been automatically linked.`}
            type="success"
            showIcon
          />
          
          <div>
            <p className="font-semibold mb-2">Temporary Password:</p>
            <div className="flex gap-2">
              <Input.Password
                value={passwordModal.password}
                readOnly
                className="font-mono"
              />
              <Button onClick={() => {
                navigator.clipboard.writeText(passwordModal.password);
                message.success('Copied!');
              }}>
                Copy
              </Button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              ⚠️ Save this password securely! The employee will need it to log in.
            </p>
          </div>

          <Alert
            message="Next Steps"
            description="The employee has been automatically synced to exec_users and user_roles. They can now log in using their email and this password."
            type="info"
            showIcon
          />
        </div>
      </Modal>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, InputNumber, DatePicker, message, Tag } from 'antd';
import { supabase } from '@/integrations/supabase/client';
import type { ColumnsType } from 'antd/es/table';

interface OfficerData {
  id: string;
  user_id: string;
  title: string;
  role: string;
  appointment_date: string;
  is_also_employee: boolean;
  officer_status: string;
  equity_percent?: number;
}

export const OfficerToEmployeeConverter: React.FC = () => {
  const [officers, setOfficers] = useState<OfficerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [convertModalVisible, setConvertModalVisible] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState<OfficerData | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchOfficers();
  }, []);

  const fetchOfficers = async () => {
    try {
      setLoading(true);
      
      // Get officers with equity data
      const { data: execData, error: execError } = await supabase
        .from('exec_users')
        .select(`
          id,
          user_id,
          title,
          role,
          appointment_date,
          is_also_employee,
          officer_status
        `)
        .eq('is_also_employee', false)
        .in('officer_status', ['appointed', 'active'])
        .order('appointment_date', { ascending: true });

      if (execError) throw execError;

      // Get equity percentages from employee_equity table
      const { data: equityData } = await supabase
        .from('employee_equity')
        .select('employee_id, shares_percentage')
        .in('employee_id', execData?.map(e => e.id) || []);

      const equityMap = new Map(equityData?.map(e => [e.employee_id, e.shares_percentage]) || []);
      
      const officers = execData?.map(officer => ({
        ...officer,
        equity_percent: equityMap.get(officer.id) || 0
      })) || [];

      setOfficers(officers);
    } catch (error: any) {
      console.error('Error fetching officers:', error);
      message.error('Failed to load officers');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToEmployee = async () => {
    if (!selectedOfficer) return;

    try {
      setLoading(true);
      const values = form.getFieldsValue();

      // Get user email from auth
      const { data: userData } = await supabase.auth.admin.getUserById(selectedOfficer.user_id);
      const userEmail = userData?.user?.email || '';

      // Create employee record
      const { data: employeeData, error: employeeError} = await supabase
        .from('employees')
        .insert([{
          email: userEmail,
          first_name: 'Officer',
          last_name: selectedOfficer.title,
          employment_type: 'full_time',
          position: selectedOfficer.title,
          hire_date: values.effective_date,
          employment_status: 'active',
          user_id: selectedOfficer.user_id,
          salary: values.annual_salary,
          salary_status: 'active',
        }])
        .select()
        .single();

      if (employeeError) throw employeeError;

      // Update exec_users record
      const { error: updateError } = await supabase
        .from('exec_users')
        .update({
          is_also_employee: true,
          linked_employee_id: employeeData.id,
          officer_status: 'active',
        })
        .eq('id', selectedOfficer.id);

      if (updateError) throw updateError;

      message.success('Officer successfully converted to employee with active salary');
      setConvertModalVisible(false);
      fetchOfficers();
    } catch (error: any) {
      console.error('Error converting officer:', error);
      message.error(error.message || 'Failed to convert officer');
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<OfficerData> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => <Tag color="blue">{role.toUpperCase()}</Tag>,
    },
    {
      title: 'Equity %',
      dataIndex: 'equity_percent',
      key: 'equity_percent',
      render: (percent?: number) => `${percent || 0}%`,
    },
    {
      title: 'Appointment Date',
      dataIndex: 'appointment_date',
      key: 'appointment_date',
      render: (date: string | null) => date ? new Date(date).toLocaleDateString() : 'N/A',
    },
    {
      title: 'Status',
      dataIndex: 'officer_status',
      key: 'officer_status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'orange'}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: OfficerData) => (
        <Button
          type="primary"
          size="small"
          onClick={() => {
            setSelectedOfficer(record);
            setConvertModalVisible(true);
          }}
        >
          Activate Salary
        </Button>
      ),
    },
  ];

  return (
    <Card title="Convert Officers to Employees (Post-Funding)">
      <p style={{ marginBottom: 16, color: '#6b7280' }}>
        Officers with deferred compensation can be converted to active employees with salary once funding is secured.
        This maintains their officer status while activating their employment agreement.
      </p>

      <Table
        columns={columns}
        dataSource={officers}
        loading={loading}
        rowKey="id"
        pagination={false}
      />

      <Modal
        title="Activate Officer Salary"
        open={convertModalVisible}
        onOk={handleConvertToEmployee}
        onCancel={() => setConvertModalVisible(false)}
        okText="Activate Salary"
        confirmLoading={loading}
      >
        {selectedOfficer && (
          <>
            <p><strong>Title:</strong> {selectedOfficer.title}</p>
            <p><strong>Role:</strong> {selectedOfficer.role.toUpperCase()}</p>
            <p><strong>Current Status:</strong> Equity-only (Deferred salary)</p>

            <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
              <Form.Item
                name="annual_salary"
                label="Annual Salary (USD)"
                rules={[{ required: true, message: 'Please enter annual salary' }]}
                initialValue={120000}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="120000"
                  formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => Number(value!.replace(/\$\s?|(,*)/g, '')) as any}
                />
              </Form.Item>
              <Form.Item
                name="effective_date"
                label="Salary Effective Date"
                rules={[{ required: true, message: 'Please select effective date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Form>

            <div style={{ marginTop: 16, padding: 12, background: '#f0f9ff', borderRadius: 4 }}>
              <p style={{ margin: 0, fontSize: 13 }}>
                ℹ️ This will create an employee record, link it to the officer profile, and activate salary payments while maintaining officer status.
              </p>
            </div>
          </>
        )}
      </Modal>
    </Card>
  );
};

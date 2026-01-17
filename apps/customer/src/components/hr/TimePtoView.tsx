// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { CalendarClock, Plus, Clock, Users, Shield, Edit2, Save, X } from 'lucide-react';
import { Card, Table, Tag, Button, Space, message, Statistic, Row, Col, Input, Modal, Form } from 'antd';
import { supabase } from '@/integrations/supabase/client';

interface PtoRequest {
  id: number;
  employee: string;
  dates: string;
  type: 'Vacation' | 'Sick Day' | 'Personal';
  status: 'Pending' | 'Approved' | 'Declined';
  days: number;
}

interface ClockedInEmployee {
  id: string;
  user_id: string;
  clock_in_at: string;
  employee_name: string;
  department?: string;
  position?: string;
  duration: string;
}

interface Employee {
  id: string;
  employee_number?: string;
  first_name: string;
  last_name: string;
  email: string;
  department?: string;
  position?: string;
  ssn_last4?: string | null;
  user_id?: string | null;
  is_executive?: boolean;
}

const mockPtoRequests: PtoRequest[] = [
  { id: 1, employee: 'Alice Johnson', dates: '2025-12-24 to 2025-12-26', type: 'Vacation', status: 'Pending', days: 3 },
  { id: 2, employee: 'Bob Smith', dates: '2025-11-15', type: 'Sick Day', status: 'Approved', days: 1 },
  { id: 3, employee: 'Charlie Brown', dates: '2025-12-01', type: 'Personal', status: 'Pending', days: 1 },
];

// Format time helper
const formatTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};

// Calculate duration
const calculateDuration = (start: Date | string, end: Date | string): string => {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;
  const diffMs = endDate.getTime() - startDate.getTime();
  const seconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
};

const TimePtoView: React.FC = () => {
  const [clockedInEmployees, setClockedInEmployees] = useState<ClockedInEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [editingSsn, setEditingSsn] = useState<string | null>(null);
  const [ssnValue, setSsnValue] = useState('');
  const [savingSsn, setSavingSsn] = useState(false);

  // Fetch currently clocked in employees
  useEffect(() => {
    fetchClockedInEmployees();
    fetchEmployees();
    // Poll for updates every 30 seconds
    const interval = setInterval(() => {
      fetchClockedInEmployees();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch all employees for SSN management (includes C-suite)
  const fetchEmployees = async () => {
    setEmployeesLoading(true);
    try {
      // Fetch ALL employees (no status filter)
      const { data: regularEmployees, error: employeesError } = await supabase
        .from('employees')
        .select('id, employee_number, first_name, last_name, email, department, position, ssn_last4, user_id, employment_status')
        .order('last_name', { ascending: true });

      if (employeesError) {
        console.error('Error fetching regular employees:', employeesError);
        throw employeesError;
      }

      // Combine both lists
      const allEmployees: Employee[] = [];

      // Add regular employees first
      if (regularEmployees) {
        regularEmployees.forEach((emp: any) => {
          allEmployees.push({
            id: emp.id,
            employee_number: emp.employee_number,
            first_name: emp.first_name,
            last_name: emp.last_name,
            email: emp.email,
            department: emp.department,
            position: emp.position,
            ssn_last4: emp.ssn_last4,
            user_id: emp.user_id,
            is_executive: false,
          });
        });
      }

      // Try to fetch C-suite executives (if this fails, we still have regular employees)
      try {
        // Fetch ALL C-suite executives (no user_id filter)
        const { data: executives, error: execError } = await supabase
          .from('exec_users')
          .select('id, user_id, role, title, department');

        if (execError) {
          console.warn('Error fetching executives (non-critical):', execError);
        } else if (executives && executives.length > 0) {
          // Fetch user profiles for executives that have user_id
          const execUserIds = executives.filter(e => e.user_id).map(e => e.user_id as string);
          let profileMap = new Map();
          
          if (execUserIds.length > 0) {
            const { data: userProfiles, error: profileError } = await supabase
              .from('user_profiles')
              .select('user_id, full_name, email')
              .in('user_id', execUserIds);

            if (!profileError && userProfiles) {
              userProfiles.forEach((profile: any) => {
                profileMap.set(profile.user_id, profile);
              });
            }
          }

          // Add ALL C-suite executives (no restrictions)
          for (const exec of executives) {
            // Get profile data if available
            const profile = exec.user_id ? profileMap.get(exec.user_id) : null;
            const fullName = profile?.full_name || '';
            const email = profile?.email || '';

            // Use name from profile, or parse from title/role, or use email
            let firstName = '';
            let lastName = '';
            
            if (fullName) {
              const nameParts = fullName.trim().split(' ');
              firstName = nameParts[0] || '';
              lastName = nameParts.slice(1).join(' ') || '';
            } else if (exec.title) {
              // Try to parse name from title (e.g., "Torrance Stroman" from "CEO")
              const titleParts = exec.title.trim().split(' ');
              if (titleParts.length >= 2) {
                firstName = titleParts[0];
                lastName = titleParts.slice(1).join(' ');
              } else {
                firstName = exec.title;
                lastName = exec.role.toUpperCase();
              }
            } else {
              firstName = exec.role.toUpperCase();
              lastName = '';
            }

            // Try to find employee number
            let employeeNumber = '';
            try {
              if (exec.user_id) {
                const { data: empData } = await supabase
                  .from('employees')
                  .select('employee_number')
                  .eq('user_id', exec.user_id)
                  .maybeSingle();
                employeeNumber = empData?.employee_number || '';
              }

              // If no employee number found, try by email
              if (!employeeNumber && email) {
                const { data: empDataByEmail } = await supabase
                  .from('employees')
                  .select('employee_number')
                  .eq('email', email)
                  .maybeSingle();
                employeeNumber = empDataByEmail?.employee_number || '';
              }
            } catch (empNumError) {
              console.warn('Error fetching employee number for executive:', empNumError);
            }

            // Always add executive (no restrictions)
            allEmployees.push({
              id: exec.id,
              employee_number: employeeNumber,
              first_name: firstName,
              last_name: lastName,
              email: email,
              department: exec.department || 'Executive',
              position: exec.title || exec.role.toUpperCase(),
              ssn_last4: null,
              user_id: exec.user_id,
              is_executive: true,
            });
          }
        }
      } catch (execFetchError) {
        console.warn('Error processing executives (non-critical, continuing with regular employees):', execFetchError);
        // Continue with just regular employees if executive fetch/processing fails
      }

      // Sort by last name
      allEmployees.sort((a, b) => a.last_name.localeCompare(b.last_name));

      setEmployees(allEmployees);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      message.error('Failed to load employees');
    } finally {
      setEmployeesLoading(false);
    }
  };

  // Handle SSN edit
  const handleEditSsn = (employee: Employee) => {
    setEditingSsn(employee.id);
    setSsnValue(employee.ssn_last4 || '');
  };

  // Cancel SSN edit
  const handleCancelSsn = () => {
    setEditingSsn(null);
    setSsnValue('');
  };

  // Save SSN last 4
  const handleSaveSsn = async (employee: Employee) => {
    if (!ssnValue || ssnValue.length !== 4) {
      message.error('Please enter exactly 4 digits');
      return;
    }

    if (!/^\d{4}$/.test(ssnValue)) {
      message.error('Please enter only numbers');
      return;
    }

    setSavingSsn(true);
    try {
      if (employee.is_executive) {
        // For executives, we need to find or create their employee record
        if (!employee.user_id) {
          message.error('Cannot save SSN for executive without user_id');
          return;
        }

        // Check if executive has an employee record
        const { data: existingEmp } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', employee.user_id)
          .single();

        if (existingEmp) {
          // Update existing employee record
          const { error } = await supabase
            .from('employees')
            .update({ ssn_last4: ssnValue })
            .eq('id', existingEmp.id);

          if (error) throw error;
        } else {
          // Create employee record for executive
          const { data: execData } = await supabase
            .from('exec_users')
            .select('name, email, role, title')
            .eq('id', employee.id)
            .single();

          if (!execData) {
            throw new Error('Executive record not found');
          }

          const nameParts = execData.name?.trim().split(' ') || [];
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          // Generate employee number if needed
          const employeeNumber = employee.employee_number || `EMP${String(Date.now()).slice(-5)}`;

          const { error } = await supabase
            .from('employees')
            .insert({
              user_id: employee.user_id,
              employee_number: employeeNumber,
              first_name: firstName,
              last_name: lastName,
              email: execData.email || employee.email,
              position: execData.title || execData.role.toUpperCase(),
              department: 'Executive',
              employment_type: 'full-time',
              employment_status: 'active',
              ssn_last4: ssnValue,
              hire_date: new Date().toISOString().split('T')[0],
            });

          if (error) throw error;
        }
      } else {
        // Regular employee update
        const { error } = await supabase
          .from('employees')
          .update({ ssn_last4: ssnValue })
          .eq('id', employee.id);

        if (error) throw error;
      }

      message.success('SSN last 4 digits saved successfully');
      setEditingSsn(null);
      setSsnValue('');
      await fetchEmployees(); // Refresh list
    } catch (error: any) {
      console.error('Error saving SSN:', error);
      message.error('Failed to save SSN: ' + error.message);
    } finally {
      setSavingSsn(false);
    }
  };

  // Update durations in real-time every second
  useEffect(() => {
    const durationInterval = setInterval(() => {
      setClockedInEmployees(prev => 
        prev.map(emp => ({
          ...emp,
          duration: calculateDuration(emp.clock_in_at, new Date())
        }))
      );
    }, 1000);
    return () => clearInterval(durationInterval);
  }, []);

  const fetchClockedInEmployees = async () => {
    try {
      // Get all time entries that are currently clocked in
      const { data: entries, error } = await supabase
        .from('time_entries')
        .select(`
          id,
          user_id,
          clock_in_at,
          employee_id,
          exec_user_id,
          employees:employee_id (
            first_name,
            last_name,
            department,
            position
          ),
          exec_users:exec_user_id (
            user_id
          )
        `)
        .eq('status', 'clocked_in')
        .is('clock_out_at', null)
        .order('clock_in_at', { ascending: false });

      if (error) {
        console.error('Error fetching clocked in employees:', error);
        setLoading(false);
        return;
      }

      if (entries) {
        // Fetch names and build employee list
        const employeesWithNames = await Promise.all(
          entries.map(async (entry: any) => {
            let name = 'Unknown';
            let department = '';
            let position = '';

            // If entry has employee data, use it
            if (entry.employees && entry.employees.first_name) {
              name = `${entry.employees.first_name} ${entry.employees.last_name}`;
              department = entry.employees.department || '';
              position = entry.employees.position || '';
            } 
            // If entry has exec_user data, fetch name from user_profiles
            else if (entry.exec_users && entry.exec_users.user_id) {
              const { data: profile } = await supabase
                .from('user_profiles')
                .select('full_name, email')
                .eq('user_id', entry.exec_users.user_id)
                .single();
              if (profile?.full_name) {
                name = profile.full_name;
              } else if (profile?.email) {
                name = profile.email;
              }
            }

            // Calculate duration
            const duration = calculateDuration(entry.clock_in_at, new Date());

            return {
              id: entry.id,
              user_id: entry.user_id,
              clock_in_at: entry.clock_in_at,
              employee_name: name,
              department: department,
              position: position,
              duration: duration,
            };
          })
        );

        setClockedInEmployees(employeesWithNames);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching clocked in employees:', error);
      setLoading(false);
    }
  };

  const pendingRequests = mockPtoRequests.filter(r => r.status === 'Pending');

  const getStatusStyle = (status: PtoRequest['status']) => {
    switch (status) {
      case 'Approved': return 'success';
      case 'Pending': return 'warning';
      case 'Declined': return 'error';
      default: return 'default';
    }
  };

  // Columns for currently clocked in employees
  const clockedInColumns = [
    {
      title: 'Employee Name',
      dataIndex: 'employee_name',
      key: 'employee_name',
      render: (text: string, record: ClockedInEmployee) => (
        <div>
          <div style={{ fontWeight: 600 }}>{text}</div>
          {record.position && (
            <div style={{ fontSize: '12px', color: '#666' }}>{record.position}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      render: (text: string) => text || <span style={{ color: '#999' }}>N/A</span>,
    },
    {
      title: 'Clock In Time',
      dataIndex: 'clock_in_at',
      key: 'clock_in_at',
      render: (text: string) => {
        const date = new Date(text);
        return (
          <div>
            <div>{date.toLocaleDateString()}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>{formatTime(date)}</div>
          </div>
        );
      },
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      render: (text: string) => (
        <Tag color="green" style={{ fontFamily: 'monospace', fontSize: '14px' }}>
          {text}
        </Tag>
      ),
    },
  ];

  // Columns for PTO requests
  const ptoColumns = [
    {
      title: 'Employee',
      dataIndex: 'employee',
      key: 'employee',
    },
    {
      title: 'Dates',
      dataIndex: 'dates',
      key: 'dates',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: 'Days',
      dataIndex: 'days',
      key: 'days',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: PtoRequest['status']) => (
        <Tag color={getStatusStyle(status)}>{status}</Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (record: PtoRequest) => (
        record.status === 'Pending' ? (
          <Space>
            <Button type="link" size="small" style={{ color: '#52c41a' }}>
              Approve
            </Button>
            <Button type="link" size="small" danger>
              Decline
            </Button>
          </Space>
        ) : (
          <span style={{ color: '#999' }}>N/A</span>
        )
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Currently Clocked In Employees */}
      <Card
        title={
          <span style={{ display: 'flex', alignItems: 'center', fontSize: '24px' }}>
            <Users style={{ width: '24px', height: '24px', marginRight: '8px', color: '#ff7a45' }} />
            Currently Clocked In ({clockedInEmployees.length})
          </span>
        }
      >
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
          View all employees and executives who are currently clocked in and working.
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Clock style={{ width: '32px', height: '32px', marginBottom: '16px', color: '#999' }} />
            <p style={{ color: '#999' }}>Loading clock data...</p>
          </div>
        ) : clockedInEmployees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Users style={{ width: '48px', height: '48px', marginBottom: '16px', color: '#d9d9d9' }} />
            <p style={{ color: '#999', fontSize: '16px' }}>No employees currently clocked in</p>
          </div>
        ) : (
          <Table
            columns={clockedInColumns}
            dataSource={clockedInEmployees}
            rowKey="id"
            pagination={false}
            loading={loading}
          />
        )}
      </Card>

      {/* SSN Management Section */}
      <Card
        title={
          <span style={{ display: 'flex', alignItems: 'center', fontSize: '24px' }}>
            <Shield style={{ width: '24px', height: '24px', marginRight: '8px', color: '#ff7a45' }} />
            Employee SSN Last 4 Management
          </span>
        }
      >
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
          Set the last 4 digits of Social Security Number for employees to enable time clock authentication.
          Employees must enter this code when clocking in or out.
        </p>

        <Table
          columns={[
            {
              title: 'Employee',
              key: 'employee',
              render: (record: Employee) => (
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {record.first_name} {record.last_name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {record.email} • {record.employee_number}
                  </div>
                  {record.department && (
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      {record.department} • {record.position}
                    </div>
                  )}
                </div>
              ),
            },
            {
              title: 'SSN Last 4',
              key: 'ssn_last4',
              render: (record: Employee) => {
                if (editingSsn === record.id) {
                  return (
                    <Input
                      type="text"
                      maxLength={4}
                      value={ssnValue}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 4) {
                          setSsnValue(value);
                        }
                      }}
                      placeholder="0000"
                      style={{ width: 100, fontFamily: 'monospace' }}
                      autoFocus
                    />
                  );
                }
                return (
                  <Tag color={record.ssn_last4 ? 'green' : 'red'} style={{ fontFamily: 'monospace', fontSize: '14px' }}>
                    {record.ssn_last4 || 'Not Set'}
                  </Tag>
                );
              },
            },
            {
              title: 'Action',
              key: 'action',
              render: (record: Employee) => {
                if (editingSsn === record.id) {
                  return (
                    <Space>
                      <Button
                        type="primary"
                        icon={<Save />}
                        size="small"
                        onClick={() => handleSaveSsn(record)}
                        loading={savingSsn}
                      >
                        Save
                      </Button>
                      <Button
                        icon={<X />}
                        size="small"
                        onClick={handleCancelSsn}
                        disabled={savingSsn}
                      >
                        Cancel
                      </Button>
                    </Space>
                  );
                }
                return (
                  <Button
                    icon={<Edit2 />}
                    size="small"
                    onClick={() => handleEditSsn(record)}
                  >
                    {record.ssn_last4 ? 'Edit' : 'Set'}
                  </Button>
                );
              },
            },
          ]}
          dataSource={employees}
          rowKey="id"
          loading={employeesLoading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Manager Approval Section */}
      <Card
        title={
          <span style={{ display: 'flex', alignItems: 'center', fontSize: '24px' }}>
            <CalendarClock style={{ width: '24px', height: '24px', marginRight: '8px', color: '#ff7a45' }} />
            Manager PTO Approval Queue ({pendingRequests.length} Pending)
          </span>
        }
      >
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
          Review and action pending time-off requests from your direct reports.
        </p>

        <Table
          columns={ptoColumns}
          dataSource={mockPtoRequests}
          rowKey="id"
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default TimePtoView;


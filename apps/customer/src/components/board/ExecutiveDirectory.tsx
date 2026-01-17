/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Avatar, Tag, Input, Row, Col, message, Button, Modal, Space, Typography } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, SearchOutlined, MessageOutlined, LockOutlined, CopyOutlined } from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { FALLBACK_EXECUTIVES } from '@/data/executiveFallbacks';

const { Paragraph, Text } = Typography;
import { isCLevelPosition, getExecRoleFromPosition } from '@/utils/roleUtils';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Search } = Input;

interface Executive {
  id: string;
  user_id?: string;
  role: string;
  title: string;
  department?: string;
  last_login?: string;
  created_at?: string;
  name?: string;
  email?: string;
  source: 'exec_users' | 'employees' | 'fallback';
  photo_url?: string;
  phone?: string;
}

interface ExecutiveDirectoryProps {
  viewerRole?: string;
}

export const ExecutiveDirectory: React.FC<ExecutiveDirectoryProps> = ({ viewerRole }) => {
  const navigate = useNavigate();
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [filteredExecutives, setFilteredExecutives] = useState<Executive[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [resetPasswordModal, setResetPasswordModal] = useState<{ visible: boolean; exec: Executive | null; tempPassword: string | null }>(
    {
      visible: false,
      exec: null,
      tempPassword: null,
    }
  );
  const [resettingPassword, setResettingPassword] = useState(false);

  const canViewProfiles = useMemo(() => {
    const normalized = viewerRole?.toLowerCase();
    return normalized === 'ceo' || normalized === 'board_member' || normalized === 'chairperson' || normalized === 'chairman';
  }, [viewerRole]);

  useEffect(() => {
    fetchExecutives();
  }, []);

  useEffect(() => {
    if (searchText) {
      setFilteredExecutives(
        executives.filter(exec =>
          exec.role.toLowerCase().includes(searchText.toLowerCase()) ||
          exec.title?.toLowerCase().includes(searchText.toLowerCase()) ||
          exec.department?.toLowerCase().includes(searchText.toLowerCase()) ||
          exec.name?.toLowerCase().includes(searchText.toLowerCase()) ||
          exec.email?.toLowerCase().includes(searchText.toLowerCase())
        )
      );
    } else {
      setFilteredExecutives(executives);
    }
  }, [searchText, executives]);

  const fetchExecutives = async () => {
    setLoading(true);
    try {
      const execUsersPromise = supabase
        .from('exec_users')
        .select('id, user_id, role, title, department, last_login, created_at, photo_url, email, phone')
        .order('created_at', { ascending: false });
      const employeesPromise = supabase.from('employees' as any).select('*').order('position');

      const [execUsersRes, employeesRes] = await Promise.allSettled([execUsersPromise, employeesPromise]);

      const execUsersData = execUsersRes.status === 'fulfilled' && !execUsersRes.value.error ? execUsersRes.value.data ?? [] : [];
      const employeesData = employeesRes.status === 'fulfilled' && !employeesRes.value.error ? employeesRes.value.data ?? [] : [];

      if (execUsersRes.status === 'fulfilled' && execUsersRes.value.error) {
        console.warn('exec_users query error:', execUsersRes.value.error.message);
      }
      if (employeesRes.status === 'fulfilled' && employeesRes.value.error) {
        console.warn('employees query error:', employeesRes.value.error.message);
      }

      const existingEmails = new Set<string>();

      const executivesFromOfficers: Executive[] = (execUsersData as any[]).map((officer: any) => {
        const email = officer.email?.toLowerCase();
        if (email) existingEmails.add(email);
        return {
          id: officer.id,
          user_id: officer.user_id,
          role: officer.role || 'executive',
          title: officer.title || officer.role?.toUpperCase(),
          department: officer.department || 'Executive',
          last_login: officer.last_login,
          created_at: officer.created_at,
          name: officer.title || officer.role?.toUpperCase(),
          email: officer.email,
          source: 'exec_users',
          photo_url: officer.photo_url,
          phone: officer.phone,
        };
      });

      const executivesFromEmployees: Executive[] = (employeesData as any[])
        .filter((emp: any) => isCLevelPosition(emp.position))
        .map((emp: any) => {
          const position = String(emp.position || '').toLowerCase();
          const execRole = getExecRoleFromPosition(emp.position);
          let role = execRole || position;
          if (position.includes('board member')) role = 'board_member';
          else if (position.includes('advisor')) role = 'advisor';
          else if (!execRole) role = position;
          const email = (emp.email || '').toLowerCase();
          if (email) existingEmails.add(email);
          return {
            id: emp.id,
            user_id: emp.user_id,
            role,
            title: emp.position,
            department: emp.department,
            last_login: null,
            created_at: emp.created_at,
            name: `${emp.first_name} ${emp.last_name}`,
            email: emp.email || '',
            source: 'employees',
            photo_url: emp.photo_url,
            phone: emp.phone,
          };
        });

      const combined = [...executivesFromOfficers];
      executivesFromEmployees.forEach((empExec) => {
        const exists = combined.find((ex) => ex.user_id && empExec.user_id && ex.user_id === empExec.user_id);
        if (!exists) {
          combined.push(empExec);
        }
      });

      FALLBACK_EXECUTIVES.forEach((fallback) => {
        const emailLower = fallback.email.toLowerCase();
        if (!existingEmails.has(emailLower)) {
          combined.push({
            id: fallback.id,
            user_id: fallback.user_id,
            role: fallback.role,
            title: fallback.title,
            department: fallback.department,
            name: fallback.name,
            email: fallback.email,
            phone: fallback.phone,
            source: 'fallback' as const,
            created_at: new Date().toISOString(),
          });
        }
      });

      setExecutives(combined);
      setFilteredExecutives(combined);
    } catch (error) {
      console.error('Error fetching executives:', error);
      message.error('Failed to load executives, showing default roster.');
      const fallbackList = FALLBACK_EXECUTIVES.map((fallback) => ({
        id: fallback.id,
        user_id: fallback.user_id,
        role: fallback.role,
        title: fallback.title,
        department: fallback.department,
        name: fallback.name,
        email: fallback.email,
        phone: fallback.phone,
        source: 'fallback' as const,
        created_at: new Date().toISOString(),
      }));
      setExecutives(fallbackList);
      setFilteredExecutives(fallbackList);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (exec: Executive) => {
    if (!exec.email) {
      message.error('No email address found for this executive');
      return;
    }
    if (exec.source === 'fallback') {
      message.info('Invite this executive through Supabase Auth to enable password resets.');
      return;
    }

    Modal.confirm({
      title: 'Reset Executive Password',
      content: `Are you sure you want to reset the password for ${exec.name || exec.email}? A temporary password will be generated.`,
      okText: 'Reset Password',
      cancelText: 'Cancel',
      onOk: async () => {
        setResettingPassword(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const resetBy = user?.email || 'admin';

          const { data, error } = await supabase.functions.invoke('reset-executive-password-admin', {
            body: {
              email: exec.email,
              resetBy,
            },
          });

          if (error) throw error;

          if (data?.success && data?.tempPassword) {
            setResetPasswordModal({
              visible: true,
              exec,
              tempPassword: data.tempPassword,
            });
            message.success('Password reset successfully!');
          } else {
            throw new Error(data?.error || 'Failed to reset password');
          }
        } catch (error: any) {
          console.error('Error resetting password:', error);
          message.error(error.message || 'Failed to reset password');
        } finally {
          setResettingPassword(false);
        }
      },
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('Temporary password copied to clipboard!');
  };

  const handleViewProfile = (exec: Executive) => {
    const params = new URLSearchParams();
    params.set('execId', exec.id);
    params.set('source', exec.source);
    if (exec.user_id) params.set('userId', exec.user_id);
    if (exec.email) params.set('email', exec.email);
    if (viewerRole) params.set('viewerRole', viewerRole);
    navigate(`/executive/profile?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Executive Directory</h2>
          <p className="text-slate-600">C-suite and board member directory</p>
        </div>
        <Search
          placeholder="Search executives..."
          allowClear
          onSearch={setSearchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300 }}
          prefix={<SearchOutlined />}
        />
      </div>

      {loading && <p className="text-slate-500 text-sm">Loading executives...</p>}

      <Row gutter={[8, 12]}>
        <Col xs={12} sm={6}>
          <Card>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600">{executives.length}</div>
              <div className="text-xs sm:text-sm text-slate-600">Total Executives</div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-red-600">
                {executives.filter(e => e.role === 'ceo').length}
              </div>
              <div className="text-xs sm:text-sm text-slate-600">CEOs</div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-purple-600">
                {executives.filter(e => ['cfo', 'coo', 'cto', 'cxo'].includes(e.role)).length}
              </div>
              <div className="text-xs sm:text-sm text-slate-600">C-Suite</div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-orange-500">
                {executives.filter(e => e.source === 'fallback').length}
              </div>
              <div className="text-xs sm:text-sm text-slate-600">Seed Profiles</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[8, 12]}>
        {filteredExecutives.map((exec) => (
          <Col xs={12} sm={12} lg={8} key={exec.id}>
            <Card
              className="hover:shadow-lg transition-shadow"
              bordered={false}
            >
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-3">
                  <Avatar
                    size={window.innerWidth < 640 ? 60 : 80}
                    icon={!exec.photo_url ? <UserOutlined /> : undefined}
                    src={exec.photo_url}
                    className={!exec.photo_url ? 'bg-gradient-to-br from-blue-500 to-purple-500' : ''}
                  />
                  <div className="absolute -bottom-2 -right-2 text-2xl sm:text-3xl">
                    {exec.role.toUpperCase() === 'CEO' ? '👑' : '👤'}
                  </div>
                </div>

                <Tag color={exec.source === 'fallback' ? 'blue' : 'magenta'} className="mb-2 text-xs">
                  {exec.role.toUpperCase().replace('_', ' ')}
                </Tag>

                <h3 className="text-sm sm:text-lg font-bold text-slate-900 mb-1">
                  {exec.name || exec.title || exec.role.toUpperCase()}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 mb-1">{exec.title}</p>

                {exec.department && (
                  <p className="text-xs text-slate-500 mb-2">{exec.department}</p>
                )}

                <div className="w-full space-y-2 mt-2">
                  {exec.email && (
                    <div className="flex items-center justify-center gap-1 text-xs text-slate-600">
                      <MailOutlined />
                      <span className="truncate text-xs">{exec.email}</span>
                    </div>
                  )}

                  {exec.phone && (
                    <div className="flex items-center justify-center gap-1 text-xs text-slate-600">
                      <PhoneOutlined />
                      <span className="truncate text-xs">{exec.phone}</span>
                    </div>
                  )}

                  {exec.last_login && (
                    <div className="text-xs text-slate-500">
                      {dayjs(exec.last_login).fromNow()}
                    </div>
                  )}
                </div>

                <div className="w-full mt-3 pt-2 border-t border-slate-200 flex justify-center gap-2">
                  <Button type="link" icon={<MessageOutlined />} size="small" className="text-xs">
                    Send Message
                  </Button>
                  {exec.email && exec.source !== 'fallback' && (
                    <Button
                      type="link"
                      icon={<LockOutlined />}
                      size="small"
                      className="text-xs"
                      onClick={() => handleResetPassword(exec)}
                      loading={resettingPassword}
                    >
                      Reset Password
                    </Button>
                  )}
                  {exec.source === 'fallback' && (
                    <Tag color="gold" className="text-xs">Seeded</Tag>
                  )}
                  {canViewProfiles && (
                    <Button
                      type="link"
                      icon={<UserOutlined />}
                      size="small"
                      className="text-xs"
                      onClick={() => handleViewProfile(exec)}
                    >
                      View Profile
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Modal
        title="Password Reset Successful"
        open={resetPasswordModal.visible}
        onCancel={() => setResetPasswordModal({ visible: false, exec: null, tempPassword: null })}
        footer={[
          <Button key="close" onClick={() => setResetPasswordModal({ visible: false, exec: null, tempPassword: null })}>
            Close
          </Button>,
        ]}
        width={500}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Paragraph>
            A temporary password has been generated for <strong>{resetPasswordModal.exec?.name || resetPasswordModal.exec?.email}</strong>.
            They will be required to change this password on their next login.
          </Paragraph>

          <div>
            <Text strong>Temporary Password:</Text>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '8px',
              padding: '12px',
              background: '#f5f5f5',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '16px',
            }}>
              <Text code style={{ flex: 1, margin: 0 }}>{resetPasswordModal.tempPassword}</Text>
              <Button
                icon={<CopyOutlined />}
                size="small"
                onClick={() => resetPasswordModal.tempPassword && copyToClipboard(resetPasswordModal.tempPassword)}
              >
                Copy
              </Button>
            </div>
          </div>

          <div style={{
            padding: '12px',
            background: '#fff7e6',
            borderRadius: '4px',
            border: '1px solid #ffd591',
          }}>
            <Text type="warning">
              <strong>Important:</strong> Share this temporary password securely with the executive.
              They must change it immediately upon login.
            </Text>
          </div>
        </Space>
      </Modal>
    </div>
  );
};


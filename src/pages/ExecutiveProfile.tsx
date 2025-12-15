/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Row,
  Space,
  Spin,
  Typography,
  message,
} from 'antd';
import {
  LockOutlined,
  MailOutlined,
  UserOutlined,
  ProfileOutlined,
  SafetyOutlined,
  PhoneOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { getExecRoleFromPosition } from '@/utils/roleUtils';
import { FALLBACK_EXECUTIVES, FallbackExecutive } from '@/data/executiveFallbacks';

const { Title, Text, Paragraph } = Typography;

interface ExecRecord {
  id: string;
  role?: string;
  title?: string;
  department?: string;
  photo_url?: string;
}

interface PasswordFormValues {
  newPassword: string;
  confirmPassword: string;
}

type ExecSource = 'exec_users' | 'employees' | 'fallback';

interface TargetExecProfile {
  id: string;
  name?: string;
  title?: string;
  role?: string;
  department?: string;
  email?: string;
  phone?: string;
  photo_url?: string;
  last_login?: string | null;
  created_at?: string | null;
  hire_date?: string | null;
  source: ExecSource;
}

const privilegedViewerRoles = new Set(['ceo', 'board_member', 'chairperson', 'chairman']);

const findFallbackByIdOrEmail = (id?: string | null, email?: string | null): FallbackExecutive | undefined => {
  const emailLower = email?.toLowerCase();
  return FALLBACK_EXECUTIVES.find((fallback) => {
    if (id && fallback.id === id) return true;
    if (emailLower && fallback.email.toLowerCase() === emailLower) return true;
    return false;
  });
};

const ExecutiveProfile: React.FC = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [viewerExecRecord, setViewerExecRecord] = useState<ExecRecord | null>(null);
  const [targetExec, setTargetExec] = useState<TargetExecProfile | null>(null);
  const [targetLoading, setTargetLoading] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [form] = Form.useForm<PasswordFormValues>();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const targetExecId = searchParams.get('execId');
  const targetSource = (searchParams.get('source') as ExecSource | null) ?? null;
  const targetEmailParam = searchParams.get('email') ?? undefined;
  const targetUserIdParam = searchParams.get('userId') ?? undefined;

  const isResetFlow = useMemo(() => {
    if (searchParams.get('reset') === 'true') {
      return true;
    }
    return typeof location.hash === 'string' && location.hash.includes('type=recovery');
  }, [location.hash, searchParams]);

  const ensureRecoverySession = async () => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token')) return;

    const hashParams = new URLSearchParams(hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        console.error('Failed to establish recovery session', error);
        return;
      }

      window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        if (isResetFlow) {
          await ensureRecoverySession();
        }

        const {
          data: { user: currentUser },
          error,
        } = await supabase.auth.getUser();
        if (error) throw error;

        setUser(currentUser);

        if (currentUser) {
          const { data, error: execError } = await supabase
            .from('exec_users')
            .select('id, role, title, department, photo_url')
            .eq('user_id', currentUser.id)
            .maybeSingle();

          if (!execError && data) {
            setViewerExecRecord(data as ExecRecord);
          }
        }
      } catch (err) {
        console.error('Failed to load profile', err);
        message.error('Unable to load executive profile. Please sign in again.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [isResetFlow, location.hash]);

  const viewerRoleParam = searchParams.get('viewerRole')?.toLowerCase();
  const viewerRole = useMemo(
    () => viewerExecRecord?.role?.toLowerCase() || viewerRoleParam || undefined,
    [viewerExecRecord?.role, viewerRoleParam]
  );

  const canViewOthers = useMemo(() => {
    if (!viewerRole) return false;
    return privilegedViewerRoles.has(viewerRole);
  }, [viewerRole]);

  const loadTargetExec = useCallback(
    async (execId: string, source: ExecSource | null) => {
      if (!execId) {
        setTargetExec(null);
        return;
      }

      if (!canViewOthers && (!viewerExecRecord || viewerExecRecord.id !== execId)) {
        setTargetExec(null);
        return;
      }

      setTargetLoading(true);
      try {
        if (source === 'exec_users' || !source) {
          const { data, error } = await supabase
            .from('exec_users')
            .select('id, role, title, department, photo_url, last_login, created_at, user_id, first_name, last_name')
            .eq('id', execId)
            .maybeSingle();

          if (data !== null && typeof data === 'object') {
            const dataObj = data as Record<string, any>;
            if ('id' in dataObj) {
              const firstName = dataObj.first_name;
              const lastName = dataObj.last_name;
              const title = dataObj.title;
              const role = dataObj.role;
              const fullName = (firstName && lastName)
                ? `${firstName} ${lastName}`.trim()
                : (title || role?.toUpperCase() || 'Executive');
              
              setTargetExec({
                id: dataObj.id,
                name: fullName,
                role: role || undefined,
                title: title || undefined,
                department: dataObj.department || undefined,
                email: targetEmailParam,
                phone: undefined,
                photo_url: dataObj.photo_url || undefined,
                last_login: dataObj.last_login || undefined,
                created_at: dataObj.created_at || undefined,
                source: 'exec_users',
              });
              return;
            }
          }

          if (error && source === 'exec_users') {
            throw error;
          }
        }

        const { data: employeeData, error: employeeError } = await supabase
          .from('employees' as any)
          .select('id, first_name, last_name, position, department, email, phone, photo_url, hire_date, created_at')
          .eq('id', execId)
          .maybeSingle();

        if (employeeError && employeeError.code !== 'PGRST116') {
          throw employeeError;
        }

        if (employeeData !== null && typeof employeeData === 'object') {
          const dataObj = employeeData as Record<string, any>;
          if ('id' in dataObj) {
            const empData = dataObj;
            const execRole = getExecRoleFromPosition(empData.position || null);
            const firstName = empData.first_name || '';
            const lastName = empData.last_name || '';
            const fullName = `${firstName} ${lastName}`.trim() || empData.position || 'Executive';
            
            setTargetExec({
              id: empData.id,
              name: fullName,
              role: execRole || empData.position || undefined,
              title: empData.position || undefined,
              department: empData.department || undefined,
              email: empData.email || undefined,
              phone: empData.phone || undefined,
              photo_url: empData.photo_url || undefined,
              hire_date: empData.hire_date || undefined,
              created_at: empData.created_at || undefined,
              source: 'employees',
            });
            return;
          }
        }

        const fallback = findFallbackByIdOrEmail(execId, targetEmailParam ?? undefined);
        if (fallback) {
          setTargetExec({
            id: fallback.id,
            name: fallback.name,
            role: fallback.role,
            title: fallback.title,
            department: fallback.department,
            email: fallback.email,
            phone: fallback.phone,
            photo_url: fallback.photo_url,
            source: 'fallback',
            created_at: new Date().toISOString(),
          });
          return;
        }

        if (targetUserIdParam) {
          const { data } = await supabase
            .from('exec_users')
            .select('id, role, title, department, photo_url, last_login, created_at, first_name, last_name')
            .eq('user_id', targetUserIdParam)
            .maybeSingle();

          if (data !== null && typeof data === 'object') {
            const dataObj = data as Record<string, any>;
            if ('id' in dataObj) {
              const firstName = dataObj.first_name;
              const lastName = dataObj.last_name;
              const title = dataObj.title;
              const role = dataObj.role;
              const fullName = (firstName && lastName)
                ? `${firstName} ${lastName}`.trim()
                : (title || role?.toUpperCase() || 'Executive');
              
              setTargetExec({
                id: dataObj.id,
                name: fullName,
                role: role || undefined,
                title: title || undefined,
                department: dataObj.department || undefined,
                email: targetEmailParam,
                phone: undefined,
                photo_url: dataObj.photo_url || undefined,
                last_login: dataObj.last_login || undefined,
                created_at: dataObj.created_at || undefined,
                source: 'exec_users',
              });
              return;
            }
          }
        }

        setTargetExec(null);
        message.warning('Unable to load the requested executive profile.');
      } catch (err) {
        console.error('Failed to load target executive', err);
        message.error('Unable to load the requested executive profile.');
        setTargetExec(null);
      } finally {
        setTargetLoading(false);
      }
    },
    [canViewOthers, targetEmailParam, targetUserIdParam, viewerExecRecord]
  );

  useEffect(() => {
    if (!targetExecId) {
      setTargetExec(null);
      return;
    }

    if (loading) return;

    if (viewerExecRecord && viewerExecRecord.id === targetExecId) {
      setTargetExec(null);
      return;
    }

    loadTargetExec(targetExecId, targetSource);
  }, [targetExecId, targetSource, loadTargetExec, loading, viewerExecRecord]);

  const redirectToBusinessAuth = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    window.location.href = `${origin}/business-auth?hq=true`;
  };

  const handlePasswordUpdate = async (values: PasswordFormValues) => {
    if (passwordUpdated) return;

    if (values.newPassword !== values.confirmPassword) {
      message.error('Passwords do not match.');
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.newPassword,
        data: {
          temp_password: false,
          temp_password_set_at: null,
          temp_password_reset_by: null,
        },
      });

      if (error) throw error;

      message.success('Password updated successfully. Please sign in again.');
      setPasswordUpdated(true);

      await supabase.auth.signOut();

      setTimeout(() => {
        redirectToBusinessAuth();
      }, 1200);
    } catch (err: any) {
      console.error('Password update failed', err);
      message.error(err?.message || 'Failed to update password. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading || targetLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spin size="large" />
      </div>
    );
  }

  if (targetExecId && !targetExec) {
    if (!canViewOthers) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <Card style={{ maxWidth: 520, width: '100%' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <ProfileOutlined style={{ fontSize: 48, color: '#ff7a45' }} />
                <Title level={3} style={{ marginTop: 16 }}>Access Restricted</Title>
              </div>
              <Alert
                type="warning"
                showIcon
                message="You don't have permission to view this executive profile."
                description="Only board members and the CEO can view other executive profiles."
              />
            </Space>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <Card style={{ maxWidth: 520, width: '100%' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <ProfileOutlined style={{ fontSize: 48, color: '#1677ff' }} />
              <Title level={3} style={{ marginTop: 16 }}>Executive Not Found</Title>
            </div>
            <Alert
              type="info"
              showIcon
              message="We couldn't locate that executive"
              description="The profile may have been removed or you might not have the latest directory data. Refresh the directory and try again."
            />
            <Button type="primary" onClick={() => window.history.back()} block>
              Go Back
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <Card style={{ maxWidth: 520, width: '100%' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <ProfileOutlined style={{ fontSize: 48, color: '#ff7a45' }} />
              <Title level={3} style={{ marginTop: 16 }}>Executive Profile</Title>
            </div>
            <Alert
              type="warning"
              showIcon
              message="Sign in required"
              description="Please sign in through the executive portal to access your profile."
            />
            <Button type="primary" onClick={redirectToBusinessAuth} block>
              Go to Executive Sign-In
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  const isViewingSelf = !targetExecId || (viewerExecRecord && viewerExecRecord.id === targetExecId) ||
    (!!targetExec && targetExec.email && user.email && targetExec.email.toLowerCase() === user.email.toLowerCase());

  if (!isViewingSelf && targetExec) {
    const displayRole = targetExec.role ? targetExec.role.toUpperCase().replace('_', ' ') : 'EXECUTIVE';
    return (
      <div className="min-h-screen bg-white p-6">
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={8}>
            <Card bordered={false} className="shadow-lg">
              <div className="flex flex-col items-center text-center space-y-3">
                <Avatar
                  size={96}
                  icon={<UserOutlined />}
                  src={targetExec.photo_url}
                  className="bg-gradient-to-br from-blue-600 to-purple-600"
                />
                <Title level={4} style={{ marginBottom: 0 }}>
                  {targetExec.name || targetExec.title || displayRole}
                </Title>
                <Text type="secondary">{targetExec.title}</Text>
                <div className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold">
                  <TeamOutlined style={{ marginRight: 4 }} />
                  {displayRole}
                </div>
                {targetExec.department && <Text type="secondary">{targetExec.department}</Text>}
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={16}>
            <Card title="Executive Details" bordered={false} className="shadow-lg">
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                  <Text strong>Email</Text>
                  <Paragraph>
                    {targetExec.email ? (
                      <Space>
                        <MailOutlined />
                        <a href={`mailto:${targetExec.email}`}>{targetExec.email}</a>
                      </Space>
                    ) : (
                      <Text type="secondary">Not available</Text>
                    )}
                  </Paragraph>
                </div>

                <div>
                  <Text strong>Phone</Text>
                  <Paragraph>
                    {targetExec.phone ? (
                      <Space>
                        <PhoneOutlined />
                        <a href={`tel:${targetExec.phone}`}>{targetExec.phone}</a>
                      </Space>
                    ) : (
                      <Text type="secondary">Not available</Text>
                    )}
                  </Paragraph>
                </div>

                <div>
                  <Text strong>Appointment Date</Text>
                  <Paragraph>
                    {targetExec.created_at
                      ? new Date(targetExec.created_at).toLocaleDateString()
                      : targetExec.hire_date
                      ? new Date(targetExec.hire_date).toLocaleDateString()
                      : 'Not available'}
                  </Paragraph>
                </div>

                {targetExec.last_login && (
                  <div>
                    <Text strong>Last Sign-In</Text>
                    <Paragraph>{new Date(targetExec.last_login).toLocaleString()}</Paragraph>
                  </div>
                )}

                {targetExec.source === 'fallback' && (
                  <Alert
                    type="info"
                    showIcon
                    message="Seeded executive profile"
                    description="Invite this executive via Supabase Auth to activate password reset and messaging features."
                  />
                )}
              </Space>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  const displayName = viewerExecRecord?.title || user.user_metadata?.full_name || user.user_metadata?.name || user.email;
  const initials = displayName
    ?.split(' ')
    .map((part: string) => part[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const roleLabel = viewerExecRecord?.role?.toUpperCase() ||
    findFallbackByIdOrEmail(undefined, user.email ?? undefined)?.role?.toUpperCase() ||
    'EXECUTIVE';

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card>
            <Row gutter={[24, 24]} align="middle">
              <Col xs={24} sm={8} md={6} style={{ textAlign: 'center' }}>
                <Avatar
                  size={120}
                  src={viewerExecRecord?.photo_url || undefined}
                  icon={!viewerExecRecord?.photo_url ? <UserOutlined /> : undefined}
                  style={{ backgroundColor: '#ff7a45', fontSize: 48 }}
                >
                  {!viewerExecRecord?.photo_url && initials}
                </Avatar>
                <Title level={4} style={{ marginTop: 16 }}>{displayName}</Title>
                <Paragraph type="secondary" style={{ marginBottom: 4 }}>{roleLabel}</Paragraph>
                {viewerExecRecord?.department && (
                  <Text type="secondary">{viewerExecRecord.department}</Text>
                )}
                <Divider />
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Text><MailOutlined style={{ marginRight: 8 }} />{user.email}</Text>
                  {viewerExecRecord?.title && (
                    <Text><ProfileOutlined style={{ marginRight: 8 }} />{viewerExecRecord.title}</Text>
                  )}
                </Space>
              </Col>
              <Col xs={24} sm={16} md={18}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <div>
                    <Title level={3} style={{ marginBottom: 8 }}>Account Security</Title>
                    <Text type="secondary">
                      Manage your executive password and security preferences. For security, you will be signed out after
                      updating your password and redirected to the executive sign-in screen.
                    </Text>
                  </div>

                  {isResetFlow && (
                    <Alert
                      type="info"
                      showIcon
                      icon={<SafetyOutlined />}
                      message="Password reset required"
                      description="Your account was accessed through a secure reset link. Set a new password below to continue."
                    />
                  )}

                  <Card type="inner" title="Update Password" bordered>
                    <Form<PasswordFormValues>
                      layout="vertical"
                      form={form}
                      onFinish={handlePasswordUpdate}
                      requiredMark={false}
                    >
                      <Form.Item
                        label="New Password"
                        name="newPassword"
                        rules={[
                          { required: true, message: 'Please enter a new password' },
                          { min: 8, message: 'Password must be at least 8 characters' },
                        ]}
                      >
                        <Input.Password
                          prefix={<LockOutlined />}
                          placeholder="Enter a new password"
                          autoComplete="new-password"
                        />
                      </Form.Item>

                      <Form.Item
                        label="Confirm Password"
                        name="confirmPassword"
                        dependencies={["newPassword"]}
                        rules={[
                          { required: true, message: 'Please confirm your password' },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              if (!value || getFieldValue('newPassword') === value) {
                                return Promise.resolve();
                              }
                              return Promise.reject(new Error('Passwords do not match'));
                            },
                          }),
                        ]}
                      >
                        <Input.Password
                          prefix={<LockOutlined />}
                          placeholder="Confirm your new password"
                          autoComplete="new-password"
                        />
                      </Form.Item>

                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={updating}
                        disabled={passwordUpdated}
                        block
                        size="large"
                      >
                        {isResetFlow ? 'Set New Password' : 'Update Password'}
                      </Button>
                    </Form>
                  </Card>

                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Alert
                      type="warning"
                      showIcon
                      message="Stay secure"
                      description="Use a unique password for your executive account. Contact IT immediately if you did not request a reset."
                    />
                    <Button onClick={redirectToBusinessAuth} block>
                      Go to Executive Sign-In
                    </Button>
                  </Space>
                </Space>
              </Col>
            </Row>
          </Card>

          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <Card title="Role" bordered={false}>
                <Space direction="vertical" size="small">
                  <Text type="secondary">Role</Text>
                  <Text strong>{roleLabel}</Text>
                </Space>
                <Divider />
                <Space direction="vertical" size="small">
                  <Text type="secondary">Department</Text>
                  <Text strong>{viewerExecRecord?.department || 'Executive Office'}</Text>
                </Space>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title="Account" bordered={false}>
                <Space direction="vertical" size="small">
                  <Text type="secondary">Email</Text>
                  <Text strong>{user.email}</Text>
                </Space>
                <Divider />
                <Space direction="vertical" size="small">
                  <Text type="secondary">User ID</Text>
                  <Text strong>{user.id}</Text>
                </Space>
              </Card>
            </Col>
          </Row>
        </Space>
      </div>
    </div>
  );
};

export default ExecutiveProfile;

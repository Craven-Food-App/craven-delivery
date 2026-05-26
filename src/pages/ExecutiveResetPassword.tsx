import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Space,
  Spin,
  Typography,
  message,
} from 'antd';
import { supabase } from '@/integrations/supabase/client';
import {
  LockOutlined,
  SafetyOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

interface ResetFormValues {
  newPassword: string;
  confirmPassword: string;
}

const ExecutiveResetPassword: React.FC = () => {
  const location = useLocation();
  const [form] = Form.useForm<ResetFormValues>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  const hashParams = useMemo(() => {
    if (typeof window === 'undefined') return null;
    if (!window.location.hash) return null;
    return new URLSearchParams(window.location.hash.substring(1));
  }, [location.hash]);

  const establishSession = async () => {
    if (!hashParams) {
      setSessionError('Invalid or expired password reset link.');
      setLoading(false);
      return;
    }

    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (!accessToken || !refreshToken) {
      setSessionError('Invalid or expired password reset link.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      console.error('Failed to establish recovery session', error);
      setSessionError(error.message || 'Unable to verify reset link.');
      setLoading(false);
      return;
    }

    // Clean URL once session established
    window.history.replaceState(
      {},
      document.title,
      `${window.location.pathname}${window.location.search}`
    );

    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setSessionError(null);

      // If user already signed in (e.g., visited from portal), bypass token handling
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setLoading(false);
        return;
      }

      await establishSession();
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (values: ResetFormValues) => {
    if (passwordUpdated) return;

    if (values.newPassword !== values.confirmPassword) {
      message.error('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setSessionError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: values.newPassword,
        data: {
          temp_password: false,
          temp_password_set_at: null,
          temp_password_reset_by: null,
        },
      });

      if (error) {
        throw error;
      }

      message.success('Password updated successfully.');
      setPasswordUpdated(true);

      await supabase.auth.signOut();

      setTimeout(() => {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        window.location.href = `${origin}/business-auth?reset=done`;
      }, 1000);
    } catch (err: any) {
      console.error('Password reset failed', err);
      const errorMessage = err?.message || 'Failed to update password. Please try again.';
      setSessionError(errorMessage);
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    window.location.href = `${origin}/business-auth`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spin size="large" />
      </div>
    );
  }

  if (sessionError && !passwordUpdated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <Card style={{ maxWidth: 520, width: '100%' }}>
          <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
            <SafetyOutlined style={{ fontSize: 48, color: '#ff7a45' }} />
            <Title level={3}>Password Reset Link</Title>
            <Paragraph>
              {sessionError}
            </Paragraph>
            <Button type="primary" onClick={handleBackToLogin}>
              Return to Executive Sign-In
            </Button>
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
            <SafetyOutlined style={{ fontSize: 48, color: '#ff7a45' }} />
            <Title level={3} style={{ marginTop: 16 }}>
              Executive Password Reset
            </Title>
            <Paragraph type="secondary">
              Create a new password to secure your executive account.
            </Paragraph>
          </div>

          {passwordUpdated ? (
            <Alert
              type="success"
              showIcon
              message="Password updated"
              description="Redirecting you back to the executive sign-in page."
            />
          ) : (
            <Form<ResetFormValues>
              layout="vertical"
              form={form}
              onFinish={handleSubmit}
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
                  disabled={submitting || passwordUpdated}
                />
              </Form.Item>

              <Form.Item
                label="Confirm Password"
                name="confirmPassword"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: 'Please confirm your new password' },
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
                  disabled={submitting || passwordUpdated}
                />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                disabled={passwordUpdated}
                block
                size="large"
              >
                Reset Password
              </Button>
            </Form>
          )}

          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
              showIcon
              type="info"
              message="Security tip"
              description="Use a unique password for your executive account. Contact IT if you did not request this reset."
            />
            <Text type="secondary" style={{ textAlign: 'center' }}>
              Need help? Reach out to help@cravenusa.com.
            </Text>
            <Button onClick={handleBackToLogin} block>
              Return to Executive Sign-In
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  );
};

export default ExecutiveResetPassword;


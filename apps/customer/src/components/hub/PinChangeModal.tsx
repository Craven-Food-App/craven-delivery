import React, { useState } from 'react';
import { Modal, Form, Input, message, Space, Typography } from 'antd';
import { LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';

const { Text } = Typography;

interface PinChangeModalProps {
  visible: boolean;
  userEmail: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface PinFormValues {
  newPin: string;
  confirmPin: string;
}

const PinChangeModal: React.FC<PinChangeModalProps> = ({
  visible,
  userEmail,
  onSuccess,
  onCancel,
}) => {
  const [form] = Form.useForm<PinFormValues>();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: PinFormValues) => {
    if (values.newPin !== values.confirmPin) {
      message.error('PINs do not match');
      return;
    }

    if (values.newPin.length < 4 || values.newPin.length > 8) {
      message.error('PIN must be between 4 and 8 digits');
      return;
    }

    if (!/^\d+$/.test(values.newPin)) {
      message.error('PIN must contain only numbers');
      return;
    }

    setLoading(true);

    try {
      // First, get the current PIN hash to verify we have access
      const { data: credentials } = await supabase
        .from('ceo_access_credentials')
        .select('id')
        .eq('user_email', userEmail.toLowerCase())
        .single();

      if (!credentials) {
        throw new Error('No access credentials found for this email');
      }

      // Hash the new PIN using bcrypt - call edge function to do this securely
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/update-executive-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          email: userEmail.toLowerCase(),
          newPin: values.newPin,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to update PIN';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } else {
            const textError = await response.text();
            console.error('Non-JSON error response:', textError);
            errorMessage = `Server error (${response.status}): ${response.statusText}`;
          }
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
          errorMessage = `Server error (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      // Update user metadata to clear temporary PIN flag
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          requires_pin_change: false,
        },
      });

      if (metadataError) {
        console.warn('Failed to update metadata:', metadataError);
      }

      message.success('PIN updated successfully!');
      form.resetFields();
      onSuccess();
    } catch (error: any) {
      console.error('Error updating PIN:', error);
      message.error(error.message || 'Failed to update PIN. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <SafetyOutlined style={{ color: '#ff7a45' }} />
          <span>Set New Hub PIN</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={450}
      closable={false}
      maskClosable={false}
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="warning" strong>
          Temporary PIN Detected
        </Text>
        <br />
        <Text type="secondary">
          For security, please set a new PIN for Hub access. Your PIN must be 4-8 digits.
        </Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          label="New PIN"
          name="newPin"
          rules={[
            { required: true, message: 'Please enter a new PIN' },
            { pattern: /^\d{4,8}$/, message: 'PIN must be 4-8 digits' },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Enter 4-8 digit PIN"
            maxLength={8}
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label="Confirm PIN"
          name="confirmPin"
          dependencies={['newPin']}
          rules={[
            { required: true, message: 'Please confirm your PIN' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPin') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('PINs do not match'));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Confirm your PIN"
            maxLength={8}
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#ff7a45',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Updating PIN...' : 'Set New PIN'}
          </button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PinChangeModal;

import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Space, Typography, Divider, Row, Col } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface CompanySettings {
  company_name: string;
  state_of_incorporation: string;
  registered_office: string;
  state_filing_office: string;
  registered_agent_name: string;
  registered_agent_address: string;
  fiscal_year_end: string;
  incorporator_name: string;
  incorporator_address: string;
  incorporator_email: string;
  county: string;
}

export function CompanySettingsManager() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'company_name',
          'state_of_incorporation',
          'registered_office',
          'state_filing_office',
          'registered_agent_name',
          'registered_agent_address',
          'fiscal_year_end',
          'incorporator_name',
          'incorporator_address',
          'incorporator_email',
          'county',
        ]);

      if (error) throw error;

      const settings: Partial<CompanySettings> = {};
      data?.forEach((item) => {
        const key = item.setting_key as keyof CompanySettings;
        settings[key] = item.setting_value;
      });

      form.setFieldsValue(settings);
    } catch (error: any) {
      console.error('Error fetching company settings:', error);
      message.error('Failed to load company settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: CompanySettings) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update all settings
      const updates = Object.entries(values).map(([key, value]) => ({
        setting_key: key,
        setting_value: value || '',
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }));

      // Use upsert to update or insert
      const { error } = await supabase
        .from('company_settings')
        .upsert(updates, {
          onConflict: 'setting_key',
        });

      if (error) throw error;

      message.success('Company settings saved successfully');
    } catch (error: any) {
      console.error('Error saving company settings:', error);
      message.error(`Failed to save settings: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Company Settings" loading={loading}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        initialValues={{
          company_name: "Crave'n, Inc.",
          state_of_incorporation: 'Delaware',
          registered_office: '123 Main St, Wilmington, DE 19801',
          state_filing_office: 'Delaware Secretary of State',
          registered_agent_name: 'Torrance Stroman',
          registered_agent_address: '123 Main St, Cleveland, OH 44101',
          fiscal_year_end: 'December 31',
          incorporator_name: 'Torrance Stroman',
          incorporator_address: '123 Main St, Cleveland, OH 44101',
          incorporator_email: 'tstroman.ceo@cravenusa.com',
          county: 'Cuyahoga',
        }}
      >
        <Title level={4}>Basic Company Information</Title>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="company_name"
              label="Company Name"
              rules={[{ required: true, message: 'Company name is required' }]}
            >
              <Input placeholder="Crave'n, Inc." />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="state_of_incorporation"
              label="State of Incorporation"
              rules={[{ required: true, message: 'State is required' }]}
            >
              <Input placeholder="Ohio" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="registered_office"
          label="Registered Office Address"
          rules={[{ required: true, message: 'Registered office is required' }]}
        >
          <Input placeholder="123 Main St, Cleveland, OH 44101" />
        </Form.Item>

        <Form.Item
          name="state_filing_office"
          label="State Filing Office"
          rules={[{ required: true, message: 'State filing office is required' }]}
        >
          <Input placeholder="Ohio Secretary of State" />
        </Form.Item>

        <Divider />

        <Title level={4}>Registered Agent</Title>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="registered_agent_name"
              label="Registered Agent Name"
              rules={[{ required: true, message: 'Registered agent name is required' }]}
            >
              <Input placeholder="Torrance Stroman" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="county"
              label="County"
              rules={[{ required: true, message: 'County is required' }]}
            >
              <Input placeholder="Cuyahoga" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="registered_agent_address"
          label="Registered Agent Address"
          rules={[{ required: true, message: 'Registered agent address is required' }]}
        >
          <Input placeholder="123 Main St, Cleveland, OH 44101" />
        </Form.Item>

        <Divider />

        <Title level={4}>Incorporator Information</Title>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="incorporator_name"
              label="Incorporator Name"
              rules={[{ required: true, message: 'Incorporator name is required' }]}
            >
              <Input placeholder="Torrance Stroman" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="incorporator_email"
              label="Incorporator Email"
              rules={[
                { required: true, message: 'Incorporator email is required' },
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input placeholder="tstroman.ceo@cravenusa.com" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="incorporator_address"
          label="Incorporator Address"
          rules={[{ required: true, message: 'Incorporator address is required' }]}
        >
          <Input placeholder="123 Main St, Cleveland, OH 44101" />
        </Form.Item>

        <Divider />

        <Title level={4}>Fiscal Information</Title>
        <Form.Item
          name="fiscal_year_end"
          label="Fiscal Year End"
          rules={[{ required: true, message: 'Fiscal year end is required' }]}
        >
          <Input placeholder="December 31" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
            Save Company Settings
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}


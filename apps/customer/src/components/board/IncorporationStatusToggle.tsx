import { useState, useEffect } from 'react';
import { Card, Switch, message, Typography, Alert, Space } from 'antd';
import { supabase } from '@/integrations/supabase/client';

const { Text } = Typography;

export function IncorporationStatusToggle() {
  const [status, setStatus] = useState<'pre_incorporation' | 'incorporated'>('pre_incorporation');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('setting_value')
        .eq('setting_key', 'incorporation_status')
        .single();
      
      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" - that's ok, we'll use default
        console.error('Error fetching incorporation status:', error);
      }
      
      if (data) {
        setStatus(data.setting_value as 'pre_incorporation' | 'incorporated');
      }
    } catch (error) {
      console.error('Error fetching incorporation status:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    const newStatus = checked ? 'incorporated' : 'pre_incorporation';
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('company_settings')
        .upsert({
          setting_key: 'incorporation_status',
          setting_value: newStatus,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'setting_key'
        });
      
      if (error) throw error;
      
      setStatus(newStatus);
      message.success(
        `Incorporation status updated to: ${newStatus === 'incorporated' ? 'Incorporated' : 'Pre-Incorporation'}`
      );
    } catch (error: any) {
      console.error('Error updating incorporation status:', error);
      message.error(`Failed to update status: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Card title="Company Incorporation Status" style={{ marginBottom: 16 }}>
        <Text>Loading...</Text>
      </Card>
    );
  }

  return (
    <Card 
      title="Company Incorporation Status" 
      style={{ marginBottom: 16 }}
    >
      <Alert
        message={status === 'pre_incorporation' 
          ? 'Pre-Incorporation Mode Active' 
          : 'Incorporated Mode Active'}
        description={
          status === 'pre_incorporation'
            ? 'Documents will use Pre Incorporation Consent templates until incorporation is complete. This document includes organizational actions like Articles of Incorporation approval, Bylaws adoption, and conditional officer appointments.'
            : 'Documents will use standard Board Resolution templates for officer appointments. Use this mode after the company has been formally incorporated.'
        }
        type={status === 'pre_incorporation' ? 'warning' : 'success'}
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      <Space direction="vertical" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
          <Text strong={status === 'pre_incorporation'}>Pre-Incorporation</Text>
          <Switch
            checked={status === 'incorporated'}
            onChange={handleToggle}
            loading={loading}
            checkedChildren="Incorporated"
            unCheckedChildren="Pre-Incorp"
          />
          <Text strong={status === 'incorporated'}>Incorporated</Text>
        </div>
        
        <Text type="secondary" style={{ textAlign: 'center', display: 'block', fontSize: '12px' }}>
          {status === 'pre_incorporation' 
            ? 'When you complete incorporation, toggle this switch to start using Board Resolution documents.'
            : 'If you need to revert to pre-incorporation mode, toggle this switch back.'}
        </Text>
      </Space>
    </Card>
  );
}


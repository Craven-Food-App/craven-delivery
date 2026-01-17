import React from 'react';
import { Card, Tabs } from 'antd';
import { MailOutlined, MessageOutlined, SettingOutlined } from '@ant-design/icons';
import { ExecutiveComms } from '@/components/board/ExecutiveComms';
import BusinessEmailSystem from '@/components/executive/BusinessEmailSystem';
import ExecutiveCommsSettings from '@/components/executive/ExecutiveCommsSettings';

interface ExecutiveCommunicationsCenterProps {
  defaultTab?: 'messages' | 'workspace' | 'settings';
  compact?: boolean;
}

const ExecutiveCommunicationsCenter: React.FC<ExecutiveCommunicationsCenterProps> = ({
  defaultTab = 'messages',
  compact,
}) => {
  return (
    <Card
      style={{ borderRadius: 16, width: '100%' }}
      bodyStyle={{ padding: compact ? 16 : 24 }}
    >
      <Tabs
        defaultActiveKey={defaultTab}
        size="large"
        items={[
          {
            key: 'messages',
            label: (
              <span>
                <MessageOutlined /> Secure Messages
              </span>
            ),
            children: <ExecutiveComms />,
          },
          {
            key: 'workspace',
            label: (
              <span>
                <MailOutlined /> Communications Workspace
              </span>
            ),
            children: <BusinessEmailSystem />,
          },
          {
            key: 'settings',
            label: (
              <span>
                <SettingOutlined /> Settings
              </span>
            ),
            children: <ExecutiveCommsSettings />,
          },
        ]}
      />
    </Card>
  );
};

export default ExecutiveCommunicationsCenter;


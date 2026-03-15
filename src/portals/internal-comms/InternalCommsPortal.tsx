import React from 'react';
import { Layout, Typography, Button, ConfigProvider } from 'antd';
import { Tabs } from 'antd';
import { ArrowLeftOutlined, NotificationOutlined, FileOutlined, CheckSquareOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { cravenDriverTheme } from '@/config/antd-theme';
import cravenCLogo from '@/assets/craven-c-new.png';
import MessagesTab from './tabs/MessagesTab';
import AnnouncementsTab from './tabs/AnnouncementsTab';
import SharedFilesTab from './tabs/SharedFilesTab';
import TasksTab from './tabs/TasksTab';

const { Header, Content } = Layout;
const { Title } = Typography;

const InternalCommsPortal: React.FC = () => {
  const navigate = useNavigate();

  return (
    <ConfigProvider theme={cravenDriverTheme}>
      <Layout style={{ minHeight: '100vh', background: '#f8f9fa' }}>
        <Header
          style={{
            background: '#ffffff',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #e5e7eb',
            height: 56,
            gap: 12,
          }}
        >
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/hub')}
            style={{ color: '#374151' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={cravenCLogo} alt="C" style={{ height: 22, width: 'auto' }} />
            <Title level={4} style={{ margin: 0, fontSize: 18 }}>
              Comms
            </Title>
          </div>
        </Header>

        <Content style={{ padding: '16px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
          <Tabs
            defaultActiveKey="messages"
            size="large"
            style={{ background: '#ffffff', borderRadius: 8, padding: '16px' }}
            items={[
              {
                key: 'messages',
                label: (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MessageOutlined /> Messages
                  </span>
                ),
                children: <MessagesTab />,
              },
              {
                key: 'announcements',
                label: (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <NotificationOutlined /> Announcements
                  </span>
                ),
                children: <AnnouncementsTab />,
              },
              {
                key: 'files',
                label: (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileOutlined /> Shared Files
                  </span>
                ),
                children: <SharedFilesTab />,
              },
              {
                key: 'tasks',
                label: (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckSquareOutlined /> Tasks
                  </span>
                ),
                children: <TasksTab />,
              },
            ]}
          />
        </Content>
      </Layout>
    </ConfigProvider>
  );
};

export default InternalCommsPortal;

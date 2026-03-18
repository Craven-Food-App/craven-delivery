import React from 'react';
import { Tabs } from 'antd';
import { NotificationOutlined, FileOutlined, CheckSquareOutlined } from '@ant-design/icons';
import cravenCLogo from '@/assets/craven-c-new.png';
import MessagesTab from './tabs/MessagesTab';
import AnnouncementsTab from './tabs/AnnouncementsTab';
import SharedFilesTab from './tabs/SharedFilesTab';
import TasksTab from './tabs/TasksTab';

/**
 * Embedded C Comms component for use inside executive portals.
 * Renders the same tabs as the standalone InternalCommsPortal but without the layout shell.
 */
const EmbeddedCComms: React.FC = () => {
  return (
    <div style={{ background: '#ffffff', borderRadius: 8, padding: 16 }}>
      <Tabs
        defaultActiveKey="messages"
        size="large"
        items={[
          {
            key: 'messages',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <img src={cravenCLogo} alt="C" style={{ height: 16, width: 'auto' }} /> Messages
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
    </div>
  );
};

export default EmbeddedCComms;

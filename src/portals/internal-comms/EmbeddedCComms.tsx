import React from 'react';
import { Tabs, Paper } from '@mantine/core';
import {
  IconBell,
  IconFile,
  IconCheckbox,
} from '@tabler/icons-react';
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
    <Paper radius="md" p="md" withBorder>
      <Tabs defaultValue="messages" keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab
            value="messages"
            leftSection={<img src={cravenCLogo} alt="" style={{ height: 16, width: 'auto' }} />}
          >
            Messages
          </Tabs.Tab>
          <Tabs.Tab value="announcements" leftSection={<IconBell size={16} />}>
            Announcements
          </Tabs.Tab>
          <Tabs.Tab value="files" leftSection={<IconFile size={16} />}>
            Shared Files
          </Tabs.Tab>
          <Tabs.Tab value="tasks" leftSection={<IconCheckbox size={16} />}>
            Tasks
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="messages" pt="md">
          <MessagesTab />
        </Tabs.Panel>
        <Tabs.Panel value="announcements" pt="md">
          <AnnouncementsTab />
        </Tabs.Panel>
        <Tabs.Panel value="files" pt="md">
          <SharedFilesTab />
        </Tabs.Panel>
        <Tabs.Panel value="tasks" pt="md">
          <TasksTab />
        </Tabs.Panel>
      </Tabs>
    </Paper>
  );
};

export default EmbeddedCComms;

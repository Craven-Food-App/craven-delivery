import React, { useState, useEffect } from 'react';
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

const EmbeddedCComms: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <Paper radius="md" p={isMobile ? 'xs' : 'md'} withBorder={!isMobile}>
      <Tabs defaultValue="messages" keepMounted={false}>
        <Tabs.List style={isMobile ? { overflowX: 'auto', flexWrap: 'nowrap' } : undefined}>
          <Tabs.Tab
            value="messages"
            leftSection={<img src={cravenCLogo} alt="" style={{ height: 16, width: 'auto' }} />}
          >
            Messages
          </Tabs.Tab>
          <Tabs.Tab value="announcements" leftSection={<IconBell size={16} />}>
            {isMobile ? 'News' : 'Announcements'}
          </Tabs.Tab>
          <Tabs.Tab value="files" leftSection={<IconFile size={16} />}>
            Files
          </Tabs.Tab>
          <Tabs.Tab value="tasks" leftSection={<IconCheckbox size={16} />}>
            Tasks
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="messages" pt={isMobile ? 'xs' : 'md'}>
          <MessagesTab />
        </Tabs.Panel>
        <Tabs.Panel value="announcements" pt={isMobile ? 'xs' : 'md'}>
          <AnnouncementsTab />
        </Tabs.Panel>
        <Tabs.Panel value="files" pt={isMobile ? 'xs' : 'md'}>
          <SharedFilesTab />
        </Tabs.Panel>
        <Tabs.Panel value="tasks" pt={isMobile ? 'xs' : 'md'}>
          <TasksTab />
        </Tabs.Panel>
      </Tabs>
    </Paper>
  );
};

export default EmbeddedCComms;

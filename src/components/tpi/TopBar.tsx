import React, { useState } from 'react';
import { Group, TextInput, Avatar, Menu, Badge, Button, Text } from '@mantine/core';
import { Search, Bell, User, LogOut, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User as UserType, QuickAction, Notification } from './types';

interface TopBarProps {
  portalName: string;
  onSearch?: (query: string) => void;
  quickActions?: QuickAction[];
  notifications?: Notification[];
  user: UserType;
  onUserMenuClick?: (action: string) => void;
  showPortalSwitcher?: boolean;
  availablePortals?: Array<{ id: string; name: string; path: string }>;
}

export function TopBar({
  portalName,
  onSearch,
  quickActions,
  notifications = [],
  user,
  onUserMenuClick,
  showPortalSwitcher = false,
  availablePortals = [],
}: TopBarProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setSearchOpen(true);
    }
  };

  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown as any);
    return () => {
      document.removeEventListener('keydown', handleKeyDown as any);
    };
  }, []);

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        backgroundColor: 'white',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Group gap="lg" style={{ flex: 1 }}>
        <Text fw={700} size="lg" c="orange">
          {portalName}
        </Text>

        {onSearch && (
          <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: '400px' }}>
            <TextInput
              placeholder="Search... (Cmd/Ctrl+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              leftSection={<Search size={16} />}
              style={{ width: '100%' }}
              size="sm"
            />
          </form>
        )}
      </Group>

      <Group gap="sm">
        {quickActions && quickActions.length > 0 && (
          <Menu>
            <Menu.Target>
              <Button variant="subtle" size="sm">
                Quick Actions
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Menu.Item
                    key={action.id}
                    leftSection={<Icon size={16} />}
                    onClick={action.onClick}
                  >
                    {action.label}
                  </Menu.Item>
                );
              })}
            </Menu.Dropdown>
          </Menu>
        )}

        <Menu
          opened={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
        >
          <Menu.Target>
            <Button
              variant="subtle"
              size="sm"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              style={{ position: 'relative' }}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <Badge
                  size="xs"
                  color="red"
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    minWidth: '18px',
                    height: '18px',
                    padding: '0 4px',
                  }}
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </Menu.Target>
          <Menu.Dropdown style={{ width: '320px', maxHeight: '400px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <Text c="dimmed" size="sm" p="md" ta="center">
                No notifications
              </Text>
            ) : (
              notifications.map((notification) => (
                <Menu.Item
                  key={notification.id}
                  onClick={() => {
                    if (notification.action) {
                      notification.action.onClick();
                    }
                    setNotificationsOpen(false);
                  }}
                >
                  <div>
                    <Text size="sm" fw={notification.read ? 400 : 600}>
                      {notification.title}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {notification.message}
                    </Text>
                  </div>
                </Menu.Item>
              ))
            )}
          </Menu.Dropdown>
        </Menu>

        <Menu>
          <Menu.Target>
            <Avatar
              src={user.avatar}
              alt={user.name}
              size="sm"
              style={{ cursor: 'pointer' }}
            >
              {user.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()}
            </Avatar>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>
              <Text size="sm" fw={600}>
                {user.name}
              </Text>
              <Text size="xs" c="dimmed">
                {user.email}
              </Text>
            </Menu.Label>
            <Menu.Divider />
            <Menu.Item leftSection={<Settings size={16} />}>
              Settings
            </Menu.Item>
            <Menu.Item
              leftSection={<LogOut size={16} />}
              onClick={() => {
                if (onUserMenuClick) {
                  onUserMenuClick('signout');
                }
              }}
            >
              Sign Out
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </div>
  );
}



















































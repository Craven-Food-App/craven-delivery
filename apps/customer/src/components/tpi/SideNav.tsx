import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Stack, Group, Text, Badge, Collapse } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import { SidebarItem } from './types';

interface SideNavProps {
  items: SidebarItem[];
  activePath: string;
  onNavigate: (path: string) => void;
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

export function SideNav({
  items,
  activePath,
  onNavigate,
  collapsed = false,
}: SideNavProps) {
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (itemId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const isActive = (item: SidebarItem) => {
    if (item.path === activePath || location.pathname === item.path) {
      return true;
    }
    if (item.children) {
      return item.children.some((child) => child.path === activePath || location.pathname === child.path);
    }
    return false;
  };

  const renderItem = (item: SidebarItem, level: number = 0) => {
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedGroups.has(item.id);
    const active = isActive(item);
    const isChildActive = hasChildren && item.children!.some((child) => 
      child.path === activePath || location.pathname === child.path
    );

    if (hasChildren) {
      return (
        <div key={item.id}>
          <button
            onClick={() => toggleGroup(item.id)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              background: active || isChildActive ? 'rgba(255, 95, 31, 0.1)' : 'transparent',
              color: active || isChildActive ? '#ff5f1f' : '#4b5563',
              fontWeight: active || isChildActive ? 600 : 500,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 150ms',
              marginLeft: level * 16,
            }}
            onMouseEnter={(e) => {
              if (!active && !isChildActive) {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }
            }}
            onMouseLeave={(e) => {
              if (!active && !isChildActive) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <Group gap="12px" style={{ flex: 1 }}>
              <Icon size={20} />
              {!collapsed && <Text size="sm">{item.label}</Text>}
              {!collapsed && item.badge && (
                <Badge size="sm" variant="light" color="orange">
                  {item.badge}
                </Badge>
              )}
            </Group>
            {!collapsed && (
              <IconChevronRight
                size={16}
                style={{
                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 200ms',
                }}
              />
            )}
          </button>
          {!collapsed && (
            <Collapse in={isExpanded}>
              <div style={{ marginLeft: level * 16 + 32 }}>
                {item.children!.map((child) => renderItem(child, level + 1))}
              </div>
            </Collapse>
          )}
        </div>
      );
    }

    return (
      <button
        key={item.id}
        onClick={() => {
          onNavigate(item.path);
        }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          borderRadius: '8px',
          border: 'none',
          background: active
            ? 'rgba(255, 95, 31, 0.1)'
            : 'transparent',
          borderLeft: active ? '3px solid #ff5f1f' : '3px solid transparent',
          color: active ? '#ff5f1f' : '#4b5563',
          fontWeight: active ? 600 : 500,
          fontSize: '14px',
          cursor: 'pointer',
          transition: 'all 150ms',
          marginLeft: level * 16,
          textAlign: 'left',
        }}
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        <Group gap="12px" style={{ flex: 1 }}>
          <Icon size={20} />
          {!collapsed && <Text size="sm">{item.label}</Text>}
          {!collapsed && item.badge && (
            <Badge size="sm" variant="light" color="orange">
              {item.badge}
            </Badge>
          )}
        </Group>
      </button>
    );
  };

  return (
    <nav
      style={{
        width: collapsed ? '64px' : '240px',
        height: '100%',
        backgroundColor: 'white',
        borderRight: '1px solid #e5e7eb',
        transition: 'width 200ms ease-in-out',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      <Stack gap={4} style={{ padding: '12px' }}>
        {items.map((item) => renderItem(item))}
      </Stack>
    </nav>
  );
}


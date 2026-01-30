import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IconChevronRight, IconHome } from '@tabler/icons-react';
import { Text, Group, Anchor } from '@mantine/core';
import { BreadcrumbItem } from './types';

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  maxItems?: number; // default: 5, then ellipsis
}

export function Breadcrumbs({ items, maxItems = 5 }: BreadcrumbsProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Truncate if too many items
  let displayItems = items;
  if (items.length > maxItems) {
    displayItems = [
      items[0],
      { label: '...', path: undefined },
      ...items.slice(-2)
    ];
  }

  return (
    <Group gap="xs" style={{ padding: '12px 0', fontSize: '14px' }}>
      <Anchor
        component="button"
        onClick={() => navigate('/')}
        style={{ display: 'flex', alignItems: 'center', color: '#6b7280' }}
      >
        <IconHome size={16} />
      </Anchor>
      
      {displayItems.map((item, index) => {
        const isLast = index === displayItems.length - 1;
        const isCurrent = !item.path || item.path === location.pathname;

        if (isLast || isCurrent) {
          return (
            <React.Fragment key={index}>
              <IconChevronRight size={16} style={{ color: '#9ca3af' }} />
              <Text
                fw={isLast ? 600 : 400}
                c={isLast ? 'dark' : 'dimmed'}
                size="sm"
              >
                {item.label}
              </Text>
            </React.Fragment>
          );
        }

        return (
          <React.Fragment key={index}>
            <IconChevronRight size={16} style={{ color: '#9ca3af' }} />
            <Anchor
              component="button"
              onClick={() => item.path && navigate(item.path)}
              style={{ color: '#6b7280', textDecoration: 'none' }}
              size="sm"
            >
              {item.label}
            </Anchor>
          </React.Fragment>
        );
      })}
    </Group>
  );
}


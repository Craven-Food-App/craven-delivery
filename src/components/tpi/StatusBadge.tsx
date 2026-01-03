import React from 'react';
import { Badge, BadgeProps } from '@mantine/core';
import { IconCheck, IconAlertTriangle, IconX, IconInfoCircle, IconCircle } from '@tabler/icons-react';

interface StatusBadgeProps extends Omit<BadgeProps, 'color' | 'variant'> {
  status: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  label: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'outline' | 'subtle';
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

const statusConfig = {
  success: {
    color: 'green',
    icon: IconCheck,
    bgColor: '#10b981',
    textColor: 'white',
  },
  warning: {
    color: 'yellow',
    icon: IconAlertTriangle,
    bgColor: '#f59e0b',
    textColor: 'white',
  },
  error: {
    color: 'red',
    icon: IconX,
    bgColor: '#ef4444',
    textColor: 'white',
  },
  info: {
    color: 'blue',
    icon: IconInfoCircle,
    bgColor: '#3b82f6',
    textColor: 'white',
  },
  neutral: {
    color: 'gray',
    icon: IconCircle,
    bgColor: '#6b7280',
    textColor: 'white',
  },
};

export function StatusBadge({
  status,
  label,
  size = 'md',
  variant = 'solid',
  icon: CustomIcon,
  ...badgeProps
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = CustomIcon || config.icon;
  const iconSize = size === 'sm' ? 12 : size === 'md' ? 14 : 16;

  const getVariantStyles = () => {
    switch (variant) {
      case 'solid':
        return {
          backgroundColor: config.bgColor,
          color: config.textColor,
          border: 'none',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: config.bgColor,
          border: `1px solid ${config.bgColor}`,
        };
      case 'subtle':
        return {
          backgroundColor: `${config.bgColor}1A`, // 10% opacity
          color: config.bgColor,
          border: 'none',
        };
    }
  };

  return (
    <Badge
      size={size}
      leftSection={<Icon size={iconSize} />}
      style={{
        textTransform: 'uppercase',
        fontWeight: 600,
        fontSize: size === 'sm' ? '10px' : size === 'md' ? '12px' : '14px',
        padding: size === 'sm' ? '4px 8px' : size === 'md' ? '6px 10px' : '8px 12px',
        ...getVariantStyles(),
      }}
      {...badgeProps}
    >
      {label}
    </Badge>
  );
}


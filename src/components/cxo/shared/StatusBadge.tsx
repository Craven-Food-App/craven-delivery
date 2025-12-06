import React from 'react';
import { Badge } from '@mantine/core';

interface StatusBadgeProps {
  status: string;
  variant?: 'light' | 'filled' | 'outline';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, variant = 'light' }) => {
  const getColor = (status: string): string => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('open') || lowerStatus.includes('active') || lowerStatus.includes('in_progress')) {
      return 'blue';
    }
    if (lowerStatus.includes('resolved') || lowerStatus.includes('completed') || lowerStatus.includes('closed')) {
      return 'green';
    }
    if (lowerStatus.includes('critical') || lowerStatus.includes('high') || lowerStatus.includes('suspended')) {
      return 'red';
    }
    if (lowerStatus.includes('medium') || lowerStatus.includes('planned')) {
      return 'yellow';
    }
    if (lowerStatus.includes('low') || lowerStatus.includes('on_hold')) {
      return 'gray';
    }
    return 'blue';
  };

  return (
    <Badge color={getColor(status)} variant={variant}>
      {status.replace('_', ' ').toUpperCase()}
    </Badge>
  );
};


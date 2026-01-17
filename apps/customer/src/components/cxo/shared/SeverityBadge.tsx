import React from 'react';
import { Badge } from '@mantine/core';

interface SeverityBadgeProps {
  severity: 'low' | 'medium' | 'high' | 'critical';
  variant?: 'light' | 'filled' | 'outline';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, variant = 'light' }) => {
  const colorMap = {
    low: 'gray',
    medium: 'yellow',
    high: 'orange',
    critical: 'red',
  };

  return (
    <Badge color={colorMap[severity]} variant={variant}>
      {severity.toUpperCase()}
    </Badge>
  );
};


import React from 'react';
import { Badge } from '@mantine/core';

interface VersionBadgeProps {
  version: string;
}

export const VersionBadge: React.FC<VersionBadgeProps> = ({ version }) => {
  return (
    <Badge variant="dot" size="sm" color="blue">
      v{version}
    </Badge>
  );
};


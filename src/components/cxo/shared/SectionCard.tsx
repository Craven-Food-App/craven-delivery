import React from 'react';
import { Card, Title, Divider } from '@mantine/core';

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const SectionCard: React.FC<SectionCardProps> = ({ title, children, actions }) => {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <Title order={4}>{title}</Title>
        {actions && <div>{actions}</div>}
      </div>
      <Divider mb="md" />
      {children}
    </Card>
  );
};


import React from 'react';
import { Group, Title, Text, Badge, Button, Stack } from '@mantine/core';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  badge?: string | number;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  backButton?: boolean;
  onBack?: () => void;
}

export function PageHeader({
  title,
  description,
  actions,
  badge,
  icon: Icon,
  backButton,
  onBack,
}: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      <Group justify="space-between" align="flex-start">
        <Group gap="md" align="flex-start">
          {backButton && (
            <Button
              variant="subtle"
              size="sm"
              onClick={handleBack}
              leftSection={<ArrowLeft size={16} />}
              style={{ marginTop: '4px' }}
            >
              Back
            </Button>
          )}
          <Stack gap={4}>
            <Group gap="md" align="center">
              {Icon && <Icon size={24} style={{ color: '#ff5f1f' }} />}
              <Title order={1} size="xl" style={{ margin: 0 }}>
                {title}
              </Title>
              {badge !== undefined && (
                <Badge size="lg" variant="light" color="orange">
                  {badge}
                </Badge>
              )}
            </Group>
            {description && (
              <Text c="dimmed" size="sm" style={{ marginTop: '4px' }}>
                {description}
              </Text>
            )}
          </Stack>
        </Group>
        {actions && (
          <Group gap="sm">
            {actions}
          </Group>
        )}
      </Group>
    </div>
  );
}








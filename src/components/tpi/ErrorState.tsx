import React, { useState } from 'react';
import { Card, Stack, Text, Button, Group, Collapse } from '@mantine/core';
import { AlertCircle, RefreshCw, ChevronDown } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  error?: Error;
  retry?: {
    label: string;
    onRetry: () => void;
  };
  actions?: React.ReactNode;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  error,
  retry,
  actions,
}: ErrorStateProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <Card
      padding="xl"
      radius="md"
      withBorder
      style={{
        textAlign: 'center',
        maxWidth: '500px',
        margin: '0 auto',
        borderColor: '#ef4444',
      }}
    >
      <Stack gap="md" align="center">
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#fee2e2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AlertCircle size={32} style={{ color: '#ef4444' }} />
        </div>

        <Stack gap="xs" align="center">
          <Text size="lg" fw={600} c="red">
            {title}
          </Text>
          <Text size="sm" c="dimmed" style={{ maxWidth: '400px' }}>
            {message}
          </Text>
        </Stack>

        {error && (
          <div style={{ width: '100%' }}>
            <Button
              variant="subtle"
              size="xs"
              rightSection={
                <ChevronDown
                  size={14}
                  style={{
                    transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 200ms',
                  }}
                />
              }
              onClick={() => setShowDetails(!showDetails)}
              style={{ marginBottom: '8px' }}
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
            <Collapse in={showDetails}>
              <Card
                padding="sm"
                style={{
                  backgroundColor: '#f9fafb',
                  textAlign: 'left',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                }}
              >
                <Text size="xs" c="dimmed">
                  {error.message}
                </Text>
                {error.stack && (
                  <Text size="xs" c="dimmed" style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>
                    {error.stack}
                  </Text>
                )}
              </Card>
            </Collapse>
          </div>
        )}

        <Group gap="sm" justify="center">
          {retry && (
            <Button
              onClick={retry.onRetry}
              leftSection={<RefreshCw size={16} />}
              color="orange"
            >
              {retry.label}
            </Button>
          )}
          {actions}
        </Group>
      </Stack>
    </Card>
  );
}















































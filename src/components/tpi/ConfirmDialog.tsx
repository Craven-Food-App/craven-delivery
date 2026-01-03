import React, { useState } from 'react';
import { Modal, Stack, Text, Button, Group, TextInput, Alert } from '@mantine/core';
import { IconAlertTriangle, IconX } from '@tabler/icons-react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  requireTyping?: string; // e.g., "DELETE" for extra confirmation
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  requireTyping,
  loading = false,
}: ConfirmDialogProps) {
  const [typedValue, setTypedValue] = useState('');

  const handleConfirm = () => {
    if (requireTyping && typedValue !== requireTyping) {
      return;
    }
    onConfirm();
    setTypedValue('');
  };

  const handleClose = () => {
    setTypedValue('');
    onClose();
  };

  const canConfirm = !requireTyping || typedValue === requireTyping;

  return (
    <Modal
      opened={open}
      onClose={handleClose}
      title={
        <Group gap="sm">
          {variant === 'destructive' && (
            <IconAlertTriangle size={20} style={{ color: '#ef4444' }} />
          )}
          <Text fw={600} size="lg">
            {title}
          </Text>
        </Group>
      }
      centered
      size="md"
      styles={{
        body: {
          padding: '24px',
        },
      }}
    >
      <Stack gap="md">
        {variant === 'destructive' && (
          <Alert
            color="red"
            icon={<IconAlertTriangle size={16} />}
            title="Destructive Action"
          >
            This action cannot be undone.
          </Alert>
        )}

        <Text size="sm">{message}</Text>

        {requireTyping && (
          <div>
            <Text size="sm" fw={500} mb="xs">
              Type <Text component="span" fw={700} c="red">{requireTyping}</Text> to confirm:
            </Text>
            <TextInput
              value={typedValue}
              onChange={(e) => setTypedValue(e.currentTarget.value)}
              placeholder={requireTyping}
              autoFocus
            />
          </div>
        )}

        <Group justify="flex-end" gap="sm" mt="md">
          <Button
            variant="subtle"
            onClick={handleClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            color={variant === 'destructive' ? 'red' : 'orange'}
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}


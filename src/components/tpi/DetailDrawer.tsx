import React, { useEffect } from 'react';
import { Drawer, Stack, Group, Text, Button, Divider } from '@mantine/core';
import { X, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  entityId?: string;
  children: React.ReactNode;
  width?: number | string;
  footer?: React.ReactNode;
  unsavedChanges?: boolean;
  onSave?: () => void;
  loading?: boolean;
}

export function DetailDrawer({
  open,
  onClose,
  title,
  entityId,
  children,
  width = 600,
  footer,
  unsavedChanges = false,
  onSave,
  loading = false,
}: DetailDrawerProps) {
  const navigate = useNavigate();
  const [showCloseConfirm, setShowCloseConfirm] = React.useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        handleCloseAttempt();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, unsavedChanges]);

  const handleCloseAttempt = () => {
    if (unsavedChanges) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowCloseConfirm(false);
    onClose();
  };

  return (
    <>
      <Drawer
        opened={open}
        onClose={handleCloseAttempt}
        title={
          <Group justify="space-between" style={{ width: '100%' }}>
            <Text fw={600} size="lg">
              {title}
            </Text>
            {unsavedChanges && (
              <Text size="xs" c="orange" style={{ fontStyle: 'italic' }}>
                Unsaved changes
              </Text>
            )}
          </Group>
        }
        position="right"
        size={typeof width === 'number' ? `${width}px` : width}
        styles={{
          body: {
            padding: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
          }}
        >
          {loading ? (
            <div>Loading...</div>
          ) : (
            children
          )}
        </div>

        {footer && (
          <>
            <Divider />
            <div style={{ padding: '16px 24px' }}>{footer}</div>
          </>
        )}

        {!footer && onSave && (
          <>
            <Divider />
            <Group justify="flex-end" p="md" gap="sm">
              <Button variant="subtle" onClick={handleCloseAttempt}>
                Cancel
              </Button>
              <Button onClick={onSave} loading={loading}>
                Save Changes
              </Button>
            </Group>
          </>
        )}
      </Drawer>

      {/* Unsaved Changes Confirmation */}
      {showCloseConfirm && (
        <Drawer
          opened={showCloseConfirm}
          onClose={() => setShowCloseConfirm(false)}
          title="Unsaved Changes"
          position="right"
          size="400px"
        >
          <Stack gap="md">
            <Group gap="sm">
              <AlertTriangle size={20} color="#f59e0b" />
              <Text size="sm">
                You have unsaved changes. Are you sure you want to close?
              </Text>
            </Group>
            <Group justify="flex-end" gap="sm">
              <Button variant="subtle" onClick={() => setShowCloseConfirm(false)}>
                Cancel
              </Button>
              <Button
                color="red"
                onClick={handleConfirmClose}
              >
                Discard Changes
              </Button>
            </Group>
          </Stack>
        </Drawer>
      )}
    </>
  );
}







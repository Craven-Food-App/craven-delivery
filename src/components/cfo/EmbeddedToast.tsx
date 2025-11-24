import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Box, Text, Group, ActionIcon, Transition } from '@mantine/core';
import { IconX, IconCheck, IconAlertCircle, IconInfoCircle } from '@tabler/icons-react';

interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useEmbeddedToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useEmbeddedToast must be used within EmbeddedToastProvider');
  }
  return context;
};

export const EmbeddedToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    const newToast: Toast = { ...toast, id, duration: toast.duration || 4000 };
    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, newToast.duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <EmbeddedToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

interface EmbeddedToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const EmbeddedToastContainer: React.FC<EmbeddedToastContainerProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <Box
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 400,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <EmbeddedToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </Box>
  );
};

interface EmbeddedToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const EmbeddedToastItem: React.FC<EmbeddedToastItemProps> = ({ toast, onRemove }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getColor = () => {
    switch (toast.type) {
      case 'success':
        return '#10b981';
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'info':
        return '#3b82f6';
      default:
        return '#64748b';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <IconCheck size={16} />;
      case 'error':
        return <IconAlertCircle size={16} />;
      case 'warning':
        return <IconAlertCircle size={16} />;
      case 'info':
        return <IconInfoCircle size={16} />;
      default:
        return <IconInfoCircle size={16} />;
    }
  };

  return (
    <Transition mounted={mounted} transition="slide-left" duration={300} timingFunction="ease">
      {(styles) => (
        <Box
          style={{
            ...styles,
            pointerEvents: 'auto',
            backgroundColor: 'white',
            border: `1px solid ${getColor()}20`,
            borderLeft: `3px solid ${getColor()}`,
            borderRadius: 6,
            padding: '10px 12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            fontSize: 13,
          }}
        >
          <Group gap="xs" justify="space-between" wrap="nowrap">
            <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
              <Box style={{ color: getColor(), flexShrink: 0 }}>{getIcon()}</Box>
              <Box style={{ flex: 1, minWidth: 0 }}>
                {toast.title && (
                  <Text fw={600} size="sm" style={{ color: '#0f172a', marginBottom: 2 }}>
                    {toast.title}
                  </Text>
                )}
                <Text size="xs" c="dimmed" style={{ lineHeight: 1.4 }}>
                  {toast.message}
                </Text>
              </Box>
            </Group>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={() => onRemove(toast.id)}
              style={{ flexShrink: 0, color: '#64748b' }}
            >
              <IconX size={14} />
            </ActionIcon>
          </Group>
        </Box>
      )}
    </Transition>
  );
};



import { useEmbeddedToast } from '@/components/cfo/EmbeddedToast';

export const useToast = () => {
  const { showToast } = useEmbeddedToast();

  return {
    show: (options: { title?: string; message: string; color?: 'success' | 'error' | 'info' | 'warning'; duration?: number }) => {
      showToast({
        title: options.title,
        message: options.message,
        type: options.color || 'info',
        duration: options.duration,
      });
    },
    success: (message: string, title?: string) => {
      showToast({ title, message, type: 'success' });
    },
    error: (message: string, title?: string) => {
      showToast({ title, message, type: 'error' });
    },
    info: (message: string, title?: string) => {
      showToast({ title, message, type: 'info' });
    },
    warning: (message: string, title?: string) => {
      showToast({ title, message, type: 'warning' });
    },
  };
};



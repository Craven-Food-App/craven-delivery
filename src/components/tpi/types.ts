// TPI Component Types

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  path: string;
  badge?: string | number;
  children?: SidebarItem[];
  requiredRole?: string | string[];
  requiredPermission?: string | string[];
}

export interface BreadcrumbItem {
  label: string;
  path?: string; // if undefined, current page (non-clickable)
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  onClick: () => void;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}


























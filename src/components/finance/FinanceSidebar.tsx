import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  IconButton,
} from '@mui/material';
import {
  BarChart3,
  DollarSign,
  Rocket,
  FileText,
  Users,
  ShieldAlert,
  Mail,
  LogOut,
  Menu,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  category?: string;
}

interface FinanceSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onSignOut: () => void;
  open: boolean;
  onClose: () => void;
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'CFO Command Center', icon: BarChart3, category: 'Overview' },
  { id: 'fpa', label: 'FP&A & Forecasting', icon: Rocket, category: 'Planning' },
  { id: 'treasury', label: 'Advanced Treasury', icon: DollarSign, category: 'Operations' },
  { id: 'payroll', label: 'Payroll Management', icon: Users, category: 'Operations' },
  { id: 'tax', label: 'Tax Planning', icon: FileText, category: 'Planning' },
  { id: 'controls', label: 'Financial Controls', icon: ShieldAlert, category: 'Compliance' },
  { id: 'board', label: 'Board Reporting', icon: FileText, category: 'Reporting' },
  { id: 'investor', label: 'Investor Relations', icon: Mail, category: 'Communication' },
  { id: 'audit', label: 'Audit Management', icon: ShieldAlert, category: 'Compliance' },
  { id: 'risk', label: 'Risk Management', icon: ShieldAlert, category: 'Compliance' },
  { id: 'capital', label: 'Capital Structure', icon: DollarSign, category: 'Planning' },
  { id: 'scenario', label: 'Scenario Planning', icon: Rocket, category: 'Planning' },
];

export const FinanceSidebar: React.FC<FinanceSidebarProps> = ({
  activeSection,
  onSectionChange,
  onSignOut,
  open,
  onClose,
}) => {
  const groupedItems = navItems.reduce((acc, item) => {
    const category = item.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  const drawerContent = (
    <Box sx={{ width: 280, height: '100%', backgroundColor: '#12121a' }}>
      <Box sx={{ p: 3, borderBottom: '1px solid rgba(255, 106, 0, 0.2)' }}>
        <Typography variant="h5" sx={{ color: '#ff6a00', fontWeight: 700, mb: 1 }}>
          CFO Portal
        </Typography>
        <Typography variant="body2" sx={{ color: '#a1a1aa' }}>
          Financial Command Center
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {Object.entries(groupedItems).map(([category, items]) => (
          <Box key={category}>
            <Typography
              variant="caption"
              sx={{
                px: 3,
                pt: 2,
                pb: 1,
                color: '#a1a1aa',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {category}
            </Typography>
            <List sx={{ px: 1 }}>
              {items.map((item) => {
                const IconComponent = item.icon as React.ComponentType<{ size?: number }>;
                const isActive = activeSection === item.id;
                return (
                  <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
                    <ListItemButton
                      onClick={() => {
                        onSectionChange(item.id);
                        onClose();
                      }}
                      sx={{
                        borderRadius: 2,
                        mx: 1,
                        backgroundColor: isActive ? 'rgba(255, 106, 0, 0.15)' : 'transparent',
                        border: isActive ? '1px solid rgba(255, 106, 0, 0.4)' : '1px solid transparent',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 106, 0, 0.1)',
                          border: '1px solid rgba(255, 106, 0, 0.3)',
                        },
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40, color: isActive ? '#ff6a00' : '#a1a1aa' }}>
                        <IconComponent size={20} />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          fontSize: '0.9rem',
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? '#ff6a00' : '#ffffff',
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      <Box sx={{ borderTop: '1px solid rgba(255, 106, 0, 0.2)', p: 2 }}>
        <ListItemButton
          onClick={onSignOut}
          sx={{
            borderRadius: 2,
            border: '1px solid rgba(255, 106, 0, 0.2)',
            '&:hover': {
              backgroundColor: 'rgba(255, 106, 0, 0.1)',
              border: '1px solid rgba(255, 106, 0, 0.4)',
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: '#ef4444' }}>
            <LogOut size={20} />
          </ListItemIcon>
          <ListItemText
            primary="Sign Out"
            primaryTypographyProps={{
              fontSize: '0.9rem',
              color: '#ffffff',
            }}
          />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={open}
        onClose={onClose}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            backgroundColor: '#12121a',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Permanent Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            position: 'relative',
            width: 280,
            backgroundColor: '#12121a',
            border: 'none',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

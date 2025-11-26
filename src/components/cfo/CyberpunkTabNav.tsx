import React from 'react';
import { Box, Button } from '@mui/material';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Wallet, 
  Users, 
  FileText,
  Shield,
  Presentation,
  DollarSign,
  AlertTriangle,
  LineChart,
  Building,
  Layers
} from 'lucide-react';

interface CyberpunkTabNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'fpa', label: 'FP&A', icon: TrendingUp },
  { id: 'treasury', label: 'Treasury', icon: Wallet },
  { id: 'payroll', label: 'Payroll', icon: Users },
  { id: 'tax', label: 'Tax', icon: FileText },
  { id: 'controls', label: 'Controls', icon: Shield },
  { id: 'board', label: 'Board', icon: Presentation },
  { id: 'investor', label: 'Investors', icon: DollarSign },
  { id: 'audit', label: 'Audit', icon: AlertTriangle },
  { id: 'risk', label: 'Risk', icon: AlertTriangle },
  { id: 'capital', label: 'Capital', icon: Building },
  { id: 'scenario', label: 'Scenarios', icon: Layers },
];

export const CyberpunkTabNav: React.FC<CyberpunkTabNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        p: 2,
        background: 'rgba(3, 7, 18, 0.6)',
        borderBottom: '1px solid rgba(0, 255, 255, 0.2)',
        overflowX: 'auto',
        '&::-webkit-scrollbar': {
          height: '4px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'rgba(0, 255, 255, 0.1)',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(0, 255, 255, 0.4)',
        },
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <Button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`hud-tab ${isActive ? 'active' : ''}`}
            sx={{
              minWidth: '120px',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              whiteSpace: 'nowrap',
            }}
          >
            <Icon size={14} />
            {tab.label}
          </Button>
        );
      })}
    </Box>
  );
};

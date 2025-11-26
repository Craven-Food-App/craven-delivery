import React, { useState, useEffect } from 'react';
import { Box, IconButton, Alert, Typography } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { financePortalTheme } from '@/themes/financePortalTheme';
import { FinanceSidebar } from '@/components/finance/FinanceSidebar';
import { Menu, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { EmbeddedToastProvider } from '@/components/cfo/EmbeddedToast';

// Import all Enhanced components
import { EnhancedCFODashboard } from '@/components/cfo/EnhancedCFODashboard';
import { EnhancedFPandA } from '@/components/cfo/EnhancedFPandA';
import { AdvancedTreasuryManagement } from '@/components/cfo/AdvancedTreasuryManagement';
import { EnhancedPayroll } from '@/components/cfo/EnhancedPayroll';
import { EnhancedTaxPlanning } from '@/components/cfo/EnhancedTaxPlanning';
import { EnhancedFinancialControls } from '@/components/cfo/EnhancedFinancialControls';
import { EnhancedBoardReporting } from '@/components/cfo/EnhancedBoardReporting';
import { EnhancedInvestorRelations } from '@/components/cfo/EnhancedInvestorRelations';
import { EnhancedAuditManagement } from '@/components/cfo/EnhancedAuditManagement';
import { EnhancedRiskManagement } from '@/components/cfo/EnhancedRiskManagement';
import { EnhancedCapitalStructure } from '@/components/cfo/EnhancedCapitalStructure';
import { EnhancedScenarioPlanning } from '@/components/cfo/EnhancedScenarioPlanning';

import '../styles/neon-finance.css';

function CFOPortalContent() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useActivityTracking('cfo');

  useEffect(() => {
    // Set up auto-refresh every 60 seconds
    const interval = setInterval(() => {
      try {
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Error in auto-refresh:', error);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      navigate('/auth?hq=true');
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <EnhancedCFODashboard />;
      case 'fpa':
        return <EnhancedFPandA />;
      case 'treasury':
        return <AdvancedTreasuryManagement />;
      case 'payroll':
        return <EnhancedPayroll />;
      case 'tax':
        return <EnhancedTaxPlanning />;
      case 'controls':
        return <EnhancedFinancialControls />;
      case 'board':
        return <EnhancedBoardReporting />;
      case 'investor':
        return <EnhancedInvestorRelations />;
      case 'audit':
        return <EnhancedAuditManagement />;
      case 'risk':
        return <EnhancedRiskManagement />;
      case 'capital':
        return <EnhancedCapitalStructure />;
      case 'scenario':
        return <EnhancedScenarioPlanning />;
      default:
        return <EnhancedCFODashboard />;
    }
  };

  return (
    <ThemeProvider theme={financePortalTheme}>
      <Box
        sx={{
          display: 'flex',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #12121a 100%)',
        }}
      >
        {/* Sidebar */}
        <FinanceSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          onSignOut={handleSignOut}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            minHeight: '100vh',
            overflow: 'auto',
          }}
        >
          {/* Mobile Menu Button */}
          <Box
            sx={{
              display: { xs: 'flex', md: 'none' },
              alignItems: 'center',
              p: 2,
              borderBottom: '1px solid rgba(255, 106, 0, 0.2)',
            }}
          >
            <IconButton onClick={() => setSidebarOpen(true)} sx={{ color: '#ff6a00' }}>
              <Menu size={24} />
            </IconButton>
            <Typography variant="h6" sx={{ ml: 2, color: '#ff6a00', fontWeight: 700 }}>
              CFO Portal
            </Typography>
          </Box>

          {/* Status Alert */}
          <Box sx={{ p: 3, pb: 0 }}>
            <Alert
              severity="success"
              icon={<CheckCircle size={20} />}
              sx={{
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#22c55e',
                '& .MuiAlert-icon': { color: '#22c55e' },
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="body2" fontWeight={600}>
                  Finance systems operational
                </Typography>
                <Typography variant="caption">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </Typography>
              </Box>
            </Alert>
          </Box>

          {/* Content Area */}
          <Box sx={{ p: 3 }}>
            {renderContent()}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default function CFOPortal() {
  return (
    <EmbeddedToastProvider>
      <CFOPortalContent />
    </EmbeddedToastProvider>
  );
}

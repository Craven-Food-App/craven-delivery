import React, { useState } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { EmbeddedToastProvider } from '@/components/cfo/EmbeddedToast';
import { CyberpunkHeader } from '@/components/cfo/CyberpunkHeader';
import { CyberpunkTabNav } from '@/components/cfo/CyberpunkTabNav';
import { CyberpunkDashboard } from '@/components/cfo/CyberpunkDashboard';

// Import all Enhanced components
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

import '../styles/cyberpunk-hud.css';

function CFOPortalContent() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  useActivityTracking('cfo');

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
    switch (activeTab) {
      case 'overview':
        return <CyberpunkDashboard />;
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
        return <CyberpunkDashboard />;
    }
  };

  return (
    <Box className="hud-container">
      {/* Header */}
      <CyberpunkHeader onSignOut={handleSignOut} />

      {/* Tab Navigation */}
      <CyberpunkTabNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <Box
        sx={{
          p: 3,
          position: 'relative',
          zIndex: 2,
        }}
      >
        {renderContent()}
      </Box>
    </Box>
  );
}

export default function CFOPortal() {
  return (
    <EmbeddedToastProvider>
      <CFOPortalContent />
    </EmbeddedToastProvider>
  );
}

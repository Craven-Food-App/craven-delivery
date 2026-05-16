import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useExecAuth } from '@/hooks/useExecAuth';
import { hasFullAccess } from '@/utils/torranceAccess';
import ExecutivePortalLayout, { ExecutiveNavItem } from '@/components/executive/ExecutivePortalLayout';
import { EASDashboard } from '@/components/executive/accountability/EASDashboard';
import { EASWorkflowViewer } from '@/components/executive/accountability/EASWorkflowViewer';
import { EPMTemplate } from '@/components/executive/accountability/EPMTemplate';
import { ECAPTemplate } from '@/components/executive/accountability/ECAPTemplate';
import { BNNCTemplate } from '@/components/executive/accountability/BNNCTemplate';
import { ETFCNTemplate } from '@/components/executive/accountability/ETFCNTemplate';
import { EASPolicyViewer } from '@/components/executive/accountability/EASPolicyViewer';
import { Scale, FileText, AlertTriangle, XCircle, Shield, Home } from 'lucide-react';

const ExecutiveAccountability: React.FC = () => {
  const navigate = useNavigate();
  const { loading, user, execUser, isAuthorized, signOut } = useExecAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      if (loading) return;
      
      // Use exact-match helper from torranceAccess (no partial email matching).
      if (hasFullAccess(user?.email)) {
        setHasAccess(true);
        return;
      }

      // CEO and Board members have access
      if (isAuthorized && (execUser?.role === 'ceo' || execUser?.role === 'board_member')) {
        setHasAccess(true);
        return;
      }

      setHasAccess(false);
    };

    checkAccess();
  }, [loading, user, execUser, isAuthorized]);

  useEffect(() => {
    if (!loading && hasAccess === false) {
      navigate('/hub');
    }
  }, [loading, hasAccess, navigate]);

  const navItems: ExecutiveNavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Scale as any },
    { id: 'workflow', label: 'Workflow', icon: FileText as any },
    { id: 'epm', label: 'EPM', icon: AlertTriangle as any },
    { id: 'ecap', label: 'ECAP', icon: XCircle as any },
    { id: 'bnnc', label: 'BNNC', icon: Shield as any },
    { id: 'etfcn', label: 'Termination', icon: XCircle as any },
    { id: 'policy', label: 'Policy', icon: FileText as any },
  ];

  const handleBackToHub = () => {
    navigate('/hub');
  };

  const handleSignOut = async () => {
    if (signOut) {
      await signOut();
    }
    navigate('/auth?hq=true');
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <EASDashboard />;
      case 'workflow':
        return <EASWorkflowViewer />;
      case 'epm':
        return <EPMTemplate />;
      case 'ecap':
        return <ECAPTemplate />;
      case 'bnnc':
        return <BNNCTemplate />;
      case 'etfcn':
        return <ETFCNTemplate />;
      case 'policy':
        return <EASPolicyViewer />;
      default:
        return <EASDashboard />;
    }
  };

  if (loading || hasAccess === null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  // TORRANCE STROMAN: UNIVERSAL ACCESS - ALWAYS ALLOWED
  const finalHasAccess = hasAccess || (user?.email && hasFullAccess(user.email));

  if (!finalHasAccess) {
    return null;
  }

  return (
    <ExecutivePortalLayout
      title="Executive Accountability"
      subtitle="EAS System"
      navItems={navItems}
      activeItemId={activeSection}
      onSelect={setActiveSection}
      onBack={handleBackToHub}
      onSignOut={handleSignOut}
      userInfo={{
        initials: execUser?.title?.substring(0, 2).toUpperCase() || 'EA',
        name: execUser?.title || 'Executive',
        role: 'Executive Accountability',
      }}
    >
      {renderContent()}
    </ExecutivePortalLayout>
  );
};

export default ExecutiveAccountability;


import React, { useMemo, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ExecutivePortalLayout, { ExecutiveNavItem } from '@/components/executive/ExecutivePortalLayout';
import CxoAuthGuard from '@/components/cxo/CxoAuthGuard';
import {
  LayoutDashboard,
  Ticket,
  Users,
  ShoppingBag,
  Store,
  Headphones,
  BarChart3,
  Target,
  AlertTriangle,
  FileText,
  GraduationCap,
  BookOpen,
  MessageSquare,
} from 'lucide-react';

// Import page components
import CxoDashboard from '@/components/cxo/pages/CxoDashboard';
import CxoTickets from '@/components/cxo/pages/CxoTickets';
import CxoDrivers from '@/components/cxo/pages/CxoDrivers';
import CxoCustomers from '@/components/cxo/pages/CxoCustomers';
import CxoMerchants from '@/components/cxo/pages/CxoMerchants';
import CxoSupport from '@/components/cxo/pages/CxoSupport';
import CxoAnalytics from '@/components/cxo/pages/CxoAnalytics';
import CxoInitiatives from '@/components/cxo/pages/CxoInitiatives';
import CxoIncidents from '@/components/cxo/pages/CxoIncidents';
import CxoReports from '@/components/cxo/pages/CxoReports';

// Import onboarding component
import CXOOnboardingGovernance from '@/components/cxo/CXOOnboardingGovernance';

// Import training components
import CxoTrainingHome from '@/components/cxo/training/CxoTrainingHome';
import CxoTrainingModuleDetail from '@/components/cxo/training/CxoTrainingModuleDetail';
import CxoTrainingLesson from '@/components/cxo/training/CxoTrainingLesson';
import CxoTrainingProgress from '@/components/cxo/training/CxoTrainingProgress';

const EmbeddedCComms = React.lazy(() => import('@/portals/internal-comms/EmbeddedCComms'));

const CXOPortal: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems: ExecutiveNavItem[] = useMemo(
    () => [
      { id: 'onboarding', label: 'Onboarding', icon: BookOpen },
      { id: 'training', label: 'Training', icon: GraduationCap },
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'tickets', label: 'Tickets', icon: Ticket },
      { id: 'drivers', label: 'Drivers', icon: Users },
      { id: 'customers', label: 'Customers', icon: ShoppingBag },
      { id: 'merchants', label: 'Merchants', icon: Store },
      { id: 'support', label: 'Support', icon: Headphones },
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'initiatives', label: 'Initiatives', icon: Target },
      { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
      { id: 'reports', label: 'Reports', icon: FileText },
    ],
    []
  );

  // Determine active item from route
  const activeItemId = useMemo(() => {
    const path = location.pathname;
    if (path.includes('/onboarding')) return 'onboarding';
    if (path.includes('/training')) return 'training';
    if (path.includes('/tickets')) return 'tickets';
    if (path.includes('/drivers')) return 'drivers';
    if (path.includes('/customers')) return 'customers';
    if (path.includes('/merchants')) return 'merchants';
    if (path.includes('/support')) return 'support';
    if (path.includes('/analytics')) return 'analytics';
    if (path.includes('/initiatives')) return 'initiatives';
    if (path.includes('/incidents')) return 'incidents';
    if (path.includes('/reports')) return 'reports';
    return 'dashboard';
  }, [location.pathname]);

  const handleBackToHub = () => {
    navigate('/hub');
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      sessionStorage.removeItem('hub_employee_info');
      navigate('/auth?hq=true');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleNavSelect = (id: string) => {
    navigate(`/cxo/${id}`);
  };

  return (
    <CxoAuthGuard>
      <ExecutivePortalLayout
        title="CXO Portal"
        subtitle="Experience Command Center"
        navItems={navItems}
        activeItemId={activeItemId}
        onSelect={handleNavSelect}
        onBack={handleBackToHub}
        onSignOut={handleSignOut}
        userInfo={{
          initials: 'CX',
          name: 'Chief Experience Officer',
          role: 'CXO',
        }}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/cxo/dashboard" replace />} />
          <Route path="dashboard" element={<CxoDashboard />} />
          <Route path="tickets" element={<CxoTickets />} />
          <Route path="drivers" element={<CxoDrivers />} />
          <Route path="customers" element={<CxoCustomers />} />
          <Route path="merchants" element={<CxoMerchants />} />
          <Route path="support" element={<CxoSupport />} />
          <Route path="analytics" element={<CxoAnalytics />} />
          <Route path="initiatives" element={<CxoInitiatives />} />
          <Route path="incidents" element={<CxoIncidents />} />
          <Route path="reports" element={<CxoReports />} />
          <Route path="onboarding" element={<CXOOnboardingGovernance />} />
          <Route path="training" element={<CxoTrainingHome />} />
          <Route path="training/progress" element={<CxoTrainingProgress />} />
          <Route path="training/modules/:moduleId" element={<CxoTrainingModuleDetail />} />
          <Route path="training/lessons/:lessonId" element={<CxoTrainingLesson />} />
        </Routes>
      </ExecutivePortalLayout>
    </CxoAuthGuard>
  );
};

export default CXOPortal;


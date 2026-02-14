// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchInternRoles, hasInternRole, InternRole } from '@/lib/internRbac';
import {
  Home,
  LogOut,
  TrendingUp,
  CheckSquare,
  UserCog,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

interface NavItem {
  id: string;
  label: string;
  icon: IconComponent;
  path: string;
}

const SponsorPortalLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState<any>(null);

  const { data: roles = [], isLoading } = useQuery<InternRole[]>({
    queryKey: ['intern-roles'],
    queryFn: fetchInternRoles,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const navItems: NavItem[] = useMemo(
    () => [
      { id: 'pipeline', label: 'Conversion Pipeline', icon: TrendingUp, path: '/executive-sponsor/pipeline' },
      { id: 'approvals', label: 'Approvals', icon: CheckSquare, path: '/executive-sponsor/approvals' },
    ],
    []
  );

  const currentPath = location.pathname;
  const activeItemId = navItems.find((item) => currentPath.startsWith(item.path))?.id || 'pipeline';

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth?hq=true');
  };

  const handleBackToHub = () => {
    navigate('/main-hub');
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p>Loading Executive Sponsor Portal...</p>
      </div>
    );
  }

  const canAccess = hasInternRole(roles, ['INTERN_SPONSOR', 'INTERN_PROGRAM_ADMIN']);
  if (!canAccess) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#dc2626' }}>Access Denied</h1>
        <p style={{ color: '#6b7280', marginTop: '8px' }}>
          You do not have permission to access the Executive Sponsor Portal.
        </p>
      </div>
    );
  }

  const renderNavigation = (onNavigate?: () => void) => (
    <nav style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeItemId === item.id;
        return (
          <button
            key={item.id}
            onClick={() => {
              handleNavigation(item.path);
              if (onNavigate) {
                onNavigate();
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '12px',
              marginBottom: '4px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 150ms',
              backgroundColor: isActive ? '#ff5f1f' : 'transparent',
              color: isActive ? 'white' : '#4b5563',
              boxShadow: isActive ? '0 4px 6px rgba(0,0,0,0.1)' : 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.color = '#111827';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#4b5563';
              }
            }}
          >
            <Icon size={20} />
            {isSidebarOpen && (
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.label}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f9fafb', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: isSidebarOpen ? '256px' : '80px',
            backgroundColor: 'white',
            borderRight: '1px solid #e5e7eb',
            transition: 'all 300ms ease-in-out',
            boxShadow: '0 10px 15px rgba(0,0,0,0.1)',
          }}
        >
          <div
            style={{
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: '64px',
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            {isSidebarOpen ? (
              <div>
                <span style={{ fontSize: '20px', fontWeight: 800, color: '#ff5f1f' }}>
                  Sponsor Portal
                </span>
                <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 500, marginTop: '2px' }}>
                  EXECUTIVE OVERSIGHT
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#ff5f1f', margin: '0 auto' }}>S</div>
            )}
            <button
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              style={{
                color: '#6b7280',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'transform 0.3s',
                transform: isSidebarOpen ? 'rotate(0deg)' : 'rotate(180deg)',
              }}
            >
              <ChevronRight size={20} />
            </button>
          </div>
          {renderNavigation()}
          <div style={{ borderTop: '1px solid #e5e7eb', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={handleBackToHub}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: isSidebarOpen ? '8px' : '0',
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                backgroundColor: '#f3f4f6',
                color: '#111827',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 150ms',
                justifyContent: isSidebarOpen ? 'flex-start' : 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              title={isSidebarOpen ? '' : 'Back to Hub'}
            >
              <Home size={18} />
              {isSidebarOpen && <span>Back to Hub</span>}
            </button>
            <button
              onClick={handleSignOut}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: isSidebarOpen ? '8px' : '0',
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 150ms',
                justifyContent: isSidebarOpen ? 'flex-start' : 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#fecaca';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fee2e2';
              }}
              title={isSidebarOpen ? '' : 'Sign Out'}
            >
              <LogOut size={18} />
              {isSidebarOpen && <span>Sign Out</span>}
            </button>
            {user && isSidebarOpen && (
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      height: '40px',
                      width: '40px',
                      borderRadius: '50%',
                      backgroundColor: '#8b5cf6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '16px',
                    }}
                  >
                    <UserCog size={20} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#111827',
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {user.email?.split('@')[0]}
                    </p>
                    <p
                      style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Executive Sponsor
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Header */}
      {isMobile && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '60px',
            backgroundColor: 'white',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            zIndex: 40,
          }}
        >
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#ff5f1f' }}>Sponsor Portal</span>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#4b5563',
            }}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {isMobile && isMobileMenuOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setIsMobileMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              zIndex: 30,
              border: 'none',
              cursor: 'pointer',
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: '280px',
              backgroundColor: 'white',
              zIndex: 40,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 10px 15px rgba(0,0,0,0.3)',
            }}
          >
            <div
              style={{
                padding: '16px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#ff5f1f' }}>Sponsor Portal</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                }}
              >
                <X size={24} />
              </button>
            </div>
            {renderNavigation(() => setIsMobileMenuOpen(false))}
            <div style={{ borderTop: '1px solid #e5e7eb', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={handleBackToHub}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  backgroundColor: '#f3f4f6',
                  color: '#111827',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Home size={18} />
                <span>Back to Hub</span>
              </button>
              <button
                onClick={handleSignOut}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          overflow: 'auto',
          marginTop: isMobile ? '60px' : 0,
        }}
      >
        <div style={{ padding: '24px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default SponsorPortalLayout;

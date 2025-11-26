import React, { useState, useEffect } from 'react';
import { Menu, X, ChevronRight, Home, LogOut } from 'lucide-react';

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

export interface ExecutiveNavItem {
  id: string;
  label: string;
  icon: IconComponent;
}

interface ExecutivePortalLayoutProps {
  title: string;
  subtitle?: string;
  navItems: ExecutiveNavItem[];
  activeItemId: string;
  onSelect: (id: string) => void;
  children: React.ReactNode;
  onBack?: () => void;
  onSignOut?: () => void;
  actionButtons?: React.ReactNode;
  userInfo?: {
    initials: string;
    name: string;
    role: string;
  };
  sidebarFooter?: React.ReactNode;
}

const ExecutivePortalLayout: React.FC<ExecutivePortalLayoutProps> = ({
  title,
  subtitle,
  navItems,
  activeItemId,
  onSelect,
  children,
  onBack,
  onSignOut,
  actionButtons,
  userInfo,
  sidebarFooter,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  const renderNavigation = (onNavigate?: () => void) => (
    <nav style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeItemId === item.id;
        return (
          <button
            key={item.id}
            onClick={() => {
              onSelect(item.id);
              if (onNavigate) {
                onNavigate();
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 150ms',
              backgroundColor: isActive ? '#ff5f1f' : 'transparent',
              color: isActive ? 'white' : '#4b5563',
              boxShadow: isActive ? '0 4px 6px rgba(0,0,0,0.1)' : 'none',
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
            {isSidebarOpen && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>}
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
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px', borderBottom: '1px solid #e5e7eb' }}>
          {isSidebarOpen ? (
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#ff5f1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title}
            </span>
          ) : (
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#ff5f1f', margin: '0 auto' }}>{title.charAt(0)}</div>
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
          {/* Back to Hub and Sign Out Buttons */}
          {(onBack || onSignOut) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
              {onBack && (
                <button
                  onClick={onBack}
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
              )}
              {onSignOut && (
                <button
                  onClick={onSignOut}
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
              )}
            </div>
          )}
          {sidebarFooter ? (
            sidebarFooter
          ) : userInfo ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  height: '40px',
                  width: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '18px',
                }}
              >
                {userInfo.initials}
              </div>
              {isSidebarOpen && (
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {userInfo.name}
                  </p>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {userInfo.role}
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
      )}

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <button
          type="button"
          aria-label="Close menu"
            style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 30,
            display: isMobile ? 'block' : 'none',
          }}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 40,
          width: '256px',
          backgroundColor: 'white',
          borderLeft: '1px solid #e5e7eb',
          boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
          transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms ease-in-out',
          display: isMobile ? 'flex' : 'none',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px', borderBottom: '1px solid #e5e7eb', padding: '0 16px' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#ff5f1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            style={{ color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={22} />
          </button>
        </div>
        {renderNavigation(() => setIsMobileMenuOpen(false))}
        <div style={{ borderTop: '1px solid #e5e7eb', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Back to Hub and Sign Out Buttons */}
          {(onBack || onSignOut) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
              {onBack && (
                <button
                  onClick={() => {
                    onBack();
                    setIsMobileMenuOpen(false);
                  }}
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
                    transition: 'all 150ms',
                    justifyContent: 'flex-start',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e5e7eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}
                >
                  <Home size={18} />
                  <span>Back to Hub</span>
                </button>
              )}
              {onSignOut && (
                <button
                  onClick={() => {
                    onSignOut();
                    setIsMobileMenuOpen(false);
                  }}
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
                    transition: 'all 150ms',
                    justifyContent: 'flex-start',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fecaca';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fee2e2';
                  }}
                >
                  <LogOut size={18} />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          )}
          {sidebarFooter ? (
            sidebarFooter
          ) : userInfo ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  height: '40px',
                  width: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '18px',
                }}
              >
                {userInfo.initials}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userInfo.name}
                </p>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userInfo.role}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Mobile App Bar */}
      {isMobile && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '64px',
            backgroundColor: 'white',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            zIndex: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              marginRight: '16px',
              color: '#4b5563',
            }}
          >
            <Menu size={24} />
          </button>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#ff5f1f' }}>{title}</span>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {onBack && (
              <button
                onClick={onBack}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  backgroundColor: '#f3f4f6',
                  color: '#111827',
                  border: 'none',
                  cursor: 'pointer',
                }}
                title="Back to Hub"
              >
                <Home size={16} />
                <span>Hub</span>
              </button>
            )}
            {onSignOut && (
              <button
                onClick={onSignOut}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  border: 'none',
                  cursor: 'pointer',
                }}
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            )}
            {actionButtons}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', backgroundColor: '#f9fafb', marginTop: isMobile ? '64px' : '0' }}>
        {children}
      </main>
    </div>
  );
};

export default ExecutivePortalLayout;

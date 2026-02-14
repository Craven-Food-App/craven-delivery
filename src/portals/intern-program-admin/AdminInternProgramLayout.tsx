// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchInternRoles, hasInternRole, InternRole } from '@/lib/internRbac';
import {
  Home,
  LogOut,
  LayoutDashboard,
  Shield,
  FileText,
  ChevronRight,
  Menu,
  X,
  Users,
  BookOpen,
  GitBranch,
  Scale,
  AlertTriangle,
  ScrollText,
} from 'lucide-react';

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

interface NavItem {
  id: string;
  label: string;
  icon: IconComponent;
  path: string;
}

const AdminInternProgramLayout: React.FC = () => {
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

  // Full navigation structure per spec
  const navItems: NavItem[] = useMemo(
    () => [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin/intern-program/dashboard' },
      { id: 'interns', label: 'Interns', icon: Users, path: '/admin/intern-program/interns' },
      { id: 'test-modules', label: 'Test Module Library', icon: BookOpen, path: '/admin/intern-program/test-modules' },
      { id: 'role-tracks', label: 'Role Tracks & Playlists', icon: GitBranch, path: '/admin/intern-program/role-tracks' },
      { id: 'promotion-rules', label: 'Promotion Rules', icon: Scale, path: '/admin/intern-program/promotion-rules' },
      { id: 'reviews', label: 'Reviews & Enforcement', icon: AlertTriangle, path: '/admin/intern-program/reviews' },
      { id: 'roles', label: 'Roles & Permissions', icon: Shield, path: '/admin/intern-program/roles-permissions' },
      { id: 'templates', label: 'Templates', icon: FileText, path: '/admin/intern-program/templates' },
      { id: 'audit-log', label: 'Audit Log', icon: ScrollText, path: '/admin/intern-program/audit-log' },
    ],
    []
  );

  const currentPath = location.pathname;
  const activeItemId = navItems.find((item) => currentPath.startsWith(item.path))?.id || 'dashboard';

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
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading Intern Program Admin...</p>
        </div>
      </div>
    );
  }

  const canAccess = hasInternRole(roles, 'INTERN_PROGRAM_ADMIN');
  if (!canAccess) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 flex-col gap-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <Shield className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="text-gray-500 text-center max-w-md">
          You do not have permission to access the Intern Program Admin Portal.
          <br />
          Required role: <code className="bg-gray-100 px-2 py-0.5 rounded text-sm">INTERN_PROGRAM_ADMIN</code>
        </p>
        <button
          onClick={() => navigate('/main-hub')}
          className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          Return to Hub
        </button>
      </div>
    );
  }

  const renderNavigation = (onNavigate?: () => void) => (
    <nav className="flex-1 p-3 overflow-y-auto">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeItemId === item.id;
        return (
          <button
            key={item.id}
            onClick={() => {
              handleNavigation(item.path);
              if (onNavigate) onNavigate();
            }}
            className={`
              flex items-center gap-3 w-full p-3 mb-1 rounded-lg text-sm font-medium
              transition-all duration-150 text-left
              ${isActive 
                ? 'bg-orange-500 text-white shadow-md' 
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }
            `}
          >
            <Icon size={20} className="flex-shrink-0" />
            {isSidebarOpen && (
              <span className="truncate">{item.label}</span>
            )}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div
          className={`
            flex flex-col bg-white border-r border-gray-200 shadow-xl
            transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'w-64' : 'w-20'}
          `}
        >
          {/* Header */}
          <div className="p-4 flex items-center justify-between h-16 border-b border-gray-200">
            {isSidebarOpen ? (
              <div>
                <span className="text-xl font-extrabold text-orange-500">
                  Program Admin
                </span>
                <div className="text-[11px] text-gray-400 font-medium mt-0.5 tracking-wide">
                  INTERN PROGRAM
                </div>
              </div>
            ) : (
              <div className="text-2xl font-extrabold text-orange-500 mx-auto">P</div>
            )}
            <button
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className={`
                text-gray-500 hover:text-gray-700 transition-transform duration-300
                ${isSidebarOpen ? '' : 'rotate-180'}
              `}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Navigation */}
          {renderNavigation()}

          {/* Footer */}
          <div className="border-t border-gray-200 p-4 space-y-2">
            <button
              onClick={handleBackToHub}
              className={`
                flex items-center gap-2 w-full p-2.5 rounded-lg text-sm font-medium
                bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors
                ${isSidebarOpen ? '' : 'justify-center'}
              `}
              title={isSidebarOpen ? '' : 'Back to Hub'}
            >
              <Home size={18} />
              {isSidebarOpen && <span>Back to Hub</span>}
            </button>
            <button
              onClick={handleSignOut}
              className={`
                flex items-center gap-2 w-full p-2.5 rounded-lg text-sm font-medium
                bg-red-50 text-red-600 hover:bg-red-100 transition-colors
                ${isSidebarOpen ? '' : 'justify-center'}
              `}
              title={isSidebarOpen ? '' : 'Sign Out'}
            >
              <LogOut size={18} />
              {isSidebarOpen && <span>Sign Out</span>}
            </button>
            {user && isSidebarOpen && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-sm">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {user.email?.split('@')[0]}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      Program Admin
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
        <div className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-40">
          <span className="text-lg font-extrabold text-orange-500">Program Admin</span>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-gray-600"
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
            className="fixed inset-0 bg-black/40 z-30"
          />
          <div className="fixed top-0 left-0 bottom-0 w-72 bg-white z-40 flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <span className="text-xl font-extrabold text-orange-500">Program Admin</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
            {renderNavigation(() => setIsMobileMenuOpen(false))}
            <div className="border-t border-gray-200 p-4 space-y-2">
              <button
                onClick={handleBackToHub}
                className="flex items-center gap-2 w-full p-2.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-900"
              >
                <Home size={18} />
                <span>Back to Hub</span>
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 w-full p-2.5 rounded-lg text-sm font-medium bg-red-50 text-red-600"
              >
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <main className={`flex-1 overflow-auto ${isMobile ? 'mt-14' : ''}`}>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminInternProgramLayout;

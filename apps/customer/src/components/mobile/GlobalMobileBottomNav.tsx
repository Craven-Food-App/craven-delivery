import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  IconHome,
  IconDots,
  IconShoppingBag,
  IconWallet,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCraveWheel } from '@/hooks/useCraveWheel';
import CraveWheel from '@/components/mobile/CraveWheel';
import {
  CRAVE_NAV_INACTIVE,
  CRAVE_ORANGE,
  type CraveWheelService,
} from '@/components/mobile/craveWheelConfig';
import cravenCLogo from '@/assets/craven-c-new.png';
import './craveWheel.css';

type NavId = 'home' | 'orders' | 'wallet' | 'more';

interface SideNavItem {
  id: NavId;
  label: string;
  icon: React.ComponentType<{ size?: number; stroke?: number; color?: string }>;
  path: string;
  requiresAuth?: boolean;
}

const LEFT_ITEMS: SideNavItem[] = [
  { id: 'home', label: 'Home', icon: IconHome, path: '/restaurants?browse=guest' },
  { id: 'orders', label: 'Orders', icon: IconShoppingBag, path: '/order-history' },
];

const RIGHT_ITEMS: SideNavItem[] = [
  {
    id: 'wallet',
    label: 'Wallet',
    icon: IconWallet,
    path: '/account/my-credits',
    requiresAuth: true,
  },
  {
    id: 'more',
    label: 'More',
    icon: IconDots,
    path: '/account',
    requiresAuth: true,
  },
];

function isNavActive(id: NavId, pathname: string): boolean {
  switch (id) {
    case 'home':
      return pathname === '/' || pathname === '/restaurants';
    case 'orders':
      return pathname === '/order-history';
    case 'wallet':
      return pathname === '/account/my-credits' || pathname === '/my-credits';
    case 'more':
      return (
        pathname === '/account' ||
        (pathname.startsWith('/account/') &&
          pathname !== '/account/my-credits')
      );
    default:
      return false;
  }
}

/**
 * Custom Crave'n customer bottom navigation with raised center C + Crave Wheel.
 */
const GlobalMobileBottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [cPressed, setCPressed] = useState(false);

  const {
    open,
    reducedMotion,
    centerBtnRef,
    firstItemRef,
    closeWheel,
    toggleWheel,
    selectService,
  } = useCraveWheel();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      setUser(u);
    };
    void getUser();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) closeWheel('auth');
    });
    return () => subscription.unsubscribe();
  }, [closeWheel]);

  // Close wheel on route change (keep open during in-place search-param updates only when already closed)
  const pathRef = useRef(location.pathname + location.search);
  useEffect(() => {
    const key = location.pathname + location.search;
    if (key !== pathRef.current) {
      pathRef.current = key;
      if (open) closeWheel('route_change');
    }
  }, [location.pathname, location.search, open, closeWheel]);

  // Watch item-modal-open body class (RestaurantMenuPage)
  useEffect(() => {
    const sync = () => setItemModalOpen(document.body.classList.contains('item-modal-open'));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  if (!isMobile) return null;

  const hideOnPaths = [
    '/driver',
    '/enhanced-onboarding',
    '/restaurant-dashboard',
    '/merchant',
    '/auth',
    '/customer-support',
    '/checkout',
  ];
  if (hideOnPaths.some((path) => location.pathname.startsWith(path))) {
    return null;
  }
  if (itemModalOpen) return null;

  const goTo = (item: SideNavItem) => {
    if (open) closeWheel('nav');
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'bottom_navigation_selected', {
          nav_id: item.id,
          nav_label: item.label,
          destination_route: item.path,
        });
      }
    } catch {
      // no-op
    }

    if (item.id === 'home') {
      sessionStorage.setItem('browse_as_guest', 'true');
      navigate('/restaurants?browse=guest');
      return;
    }
    if (item.requiresAuth && !user) {
      navigate('/auth');
      return;
    }
    navigate(item.path);
  };

  const renderSideItem = (item: SideNavItem) => {
    const Icon = item.icon;
    const active = isNavActive(item.id, location.pathname);
    const color = active ? CRAVE_ORANGE : CRAVE_NAV_INACTIVE;
    return (
      <button
        key={item.id}
        type="button"
        className={`crave-nav-item${active ? ' active' : ''}`}
        aria-label={item.label}
        aria-current={active ? 'page' : undefined}
        onClick={() => goTo(item)}
      >
        <Icon size={22} stroke={active ? 2.4 : 1.9} color={color} />
        <span className="crave-nav-item-label">{item.label}</span>
      </button>
    );
  };

  const onWheelSelect = (service: CraveWheelService) => {
    selectService({
      id: service.id,
      label: service.label,
      path: service.path,
      comingSoon: service.comingSoon,
      enabled: service.enabled,
    });
  };

  // Portal to document.body so overflow:hidden on .safe-area-content / .safe-area-container
  // cannot clip the fixed bar (bottom safe-area spacer shortens that box on iOS).
  return createPortal(
    <div className="crave-nav-root" data-crave-wheel-open={open ? 'true' : 'false'}>
      <CraveWheel
        open={open}
        reducedMotion={reducedMotion}
        firstItemRef={firstItemRef}
        onClose={closeWheel}
        onSelect={onWheelSelect}
      />

      <nav className="crave-nav-bar" aria-label="Customer primary">
        <div className="crave-nav-center-anchor">
          <div className="crave-nav-housing" aria-hidden="true" />
          <button
            ref={centerBtnRef}
            type="button"
            className={`crave-c-btn${open ? ' is-open' : ''}${cPressed ? ' is-pressed' : ''}`}
            aria-label={open ? 'Close Crave menu' : 'Open Crave menu'}
            aria-expanded={open}
            aria-haspopup="menu"
            aria-controls="crave-wheel-menu"
            onPointerDown={() => setCPressed(true)}
            onPointerUp={() => setCPressed(false)}
            onPointerLeave={() => setCPressed(false)}
            onClick={() => toggleWheel()}
          >
            <img src={cravenCLogo} alt="" />
          </button>
        </div>

        <div className="crave-nav-items">
          <div className="crave-nav-side">{LEFT_ITEMS.map(renderSideItem)}</div>
          <div className="crave-nav-center-slot" aria-hidden="true" />
          <div className="crave-nav-side">{RIGHT_ITEMS.map(renderSideItem)}</div>
        </div>
      </nav>

      {/* Screen-reader live region */}
      <div
        id="crave-wheel-menu"
        role="menu"
        aria-hidden={!open}
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
        }}
      >
        {open ? 'Crave menu opened' : 'Crave menu closed'}
      </div>
    </div>,
    document.body
  );
};

export default GlobalMobileBottomNav;

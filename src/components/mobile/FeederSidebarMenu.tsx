import React, { useState } from 'react';
import { IconHome, IconCalendar, IconCurrencyDollar, IconUser, IconStar, IconFlame, IconTrendingUp } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { getTierConfig } from '@/utils/ratingHelpers';
import { RatingTier } from '@/types/diamond-orders';
import { useFeederDarkMode } from '@/contexts/FeederDarkModeContext';

/* ─────────────────────────────────────────
   THEME TOKENS
   ───────────────────────────────────────── */
const T = {
  orange: "#E8622A",
  orangeLight: "rgba(232,98,42,0.07)",
  orangeGlow: "rgba(232,98,42,0.22)",
  textPrimary: "#1A1A1A",
  textSecondary: "#6B7280",
  textTertiary: "#9CA3AF",
  border: "#E8EAED",
  bg: "#FAFBFC",
  bgPage: "#eef0f3",
  cardDark: "#1A1A1A",
  cardDarkSlab: "#222",
  cardDarkBorder: "#2e2e2e",
  white: "#FFFFFF",
  blue: "#3a7bd5",
  blueBg: "#EEF4FF",
  star: "#f0b827",
};

/* ─────────────────────────────────────────
   ICONS
   ───────────────────────────────────────── */
const Icon = ({ children, size = 16, stroke = T.textTertiary, fill = "none", strokeWidth = 1.8, style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", flexShrink: 0, ...style }}>
    {children}
  </svg>
);

const HomeIcon     = (p) => <Icon {...p}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></Icon>;
const CalendarIcon = (p) => <Icon {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></Icon>;
const FlameIcon    = (p) => <Icon {...p}><path d="M12 22c-4 0-7-2.5-7-6 0-2 1-3.5 2.5-4.5C6 9 6 6 8 4c1 3 3 4 5 4 0-2 1.5-4 4-5 1 2 1 4 0 6 1.5 1 2.5 2.5 2.5 4.5 0 3.5-3 6-7 6z"/></Icon>;
const DollarIcon   = (p) => <Icon {...p}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></Icon>;
const UserIcon     = (p) => <Icon {...p}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="8" r="4"/></Icon>;
const ChevronIcon  = (p) => <Icon {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></Icon>;
const RatingsIcon  = (p) => <Icon {...p}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></Icon>;
const PromosIcon   = (p) => <Icon {...p}><polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/><polyline points="17,6 23,6 23,12"/></Icon>;
const StarIcon     = ({ size = 11 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={T.star} stroke="none" style={{ display: "block", flexShrink: 0 }}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);
const DiamondIcon = ({ size = 9 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={T.blue} stroke="none" style={{ display: "block", flexShrink: 0 }}>
    <path d="M12 2L2 9l3 13h14l3-13L12 2z"/>
  </svg>
);

/* ─────────────────────────────────────────
   KEYFRAMES
   ───────────────────────────────────────── */
const KEYFRAMES = `
  @keyframes ctaPulse {
    0%, 100% { transform: scale(0.8); opacity: 0.35; }
    50%      { transform: scale(1.35); opacity: 1; }
  }
`;

type FeederSidebarMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: string;
  onNavigate?: (path: string) => void;
};

const FeederSidebarMenu: React.FC<FeederSidebarMenuProps> = ({
  isOpen,
  onClose,
  activeTab = 'home',
  onNavigate
}) => {
  const [driverName, setDriverName] = React.useState('');
  const [driverRating, setDriverRating] = React.useState(5.00);
  const [deliveries, setDeliveries] = React.useState(0);
  const [perfection, setPerfection] = React.useState(100);
  const [driverStatus, setDriverStatus] = React.useState('New Driver');
  const [driverTier, setDriverTier] = React.useState<RatingTier>('Feeder');

  // Fetch driver data
  React.useEffect(() => {
    const fetchDriverData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch driver profile
        const { data: profile } = await supabase
          .from('driver_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          setDriverRating(profile.rating || 5.00);
          setDeliveries(profile.total_deliveries || 0);
          setPerfection(profile.rating ? Math.round((profile.rating / 5) * 100) : 100);
          
          // Read tier_status from DB (source of truth)
          const tierValue = (profile.tier_status as RatingTier) || (profile.rating_tier as RatingTier) || 'Feeder';
          setDriverTier(tierValue);
        }

        // Fetch user metadata and profile for full name
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        // Try to get full name from craver_applications table first
        const { data: application } = await supabase
          .from('craver_applications')
          .select('first_name, last_name')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (application?.first_name || application?.last_name) {
          const fullName = [application.first_name, application.last_name].filter(Boolean).join(' ');
          if (fullName) {
            setDriverName(fullName);
          }
        } else if (authUser?.user_metadata?.full_name) {
          setDriverName(authUser.user_metadata.full_name);
        } else if (authUser?.user_metadata?.first_name || authUser?.user_metadata?.last_name) {
          const fullName = [authUser.user_metadata.first_name, authUser.user_metadata.last_name].filter(Boolean).join(' ');
          if (fullName) {
            setDriverName(fullName);
          }
        } else if (authUser?.email) {
          const emailName = authUser.email.split('@')[0];
          setDriverName(emailName.charAt(0).toUpperCase() + emailName.slice(1));
        }

        // Check if new driver (less than 10 deliveries)
        if (profile && (profile.total_deliveries || 0) < 10) {
          setDriverStatus('New Driver');
        } else {
          setDriverStatus('');
        }
      } catch (error) {
        console.error('Error fetching driver data:', error);
      }
    };

    if (isOpen) {
      fetchDriverData();
    }
  }, [isOpen]);

  const TIER_GLOW_GRADIENTS: Record<string, string> = {
    Feeder: 'linear-gradient(to bottom, rgba(156, 163, 175, 0.2), rgba(209, 213, 219, 0.1), transparent)',
    Gold: 'linear-gradient(to bottom, rgba(212, 175, 55, 0.35), rgba(234, 197, 80, 0.18), transparent)',
    Platinum: 'linear-gradient(to bottom, rgba(156, 163, 175, 0.3), rgba(209, 213, 219, 0.18), transparent)',
    Diamond: 'linear-gradient(to bottom, rgba(30, 58, 95, 0.45), rgba(59, 130, 246, 0.2), rgba(147, 197, 253, 0.08), transparent)',
    Ultimate: 'linear-gradient(to bottom, rgba(26, 26, 26, 0.5), rgba(245, 124, 0, 0.25), rgba(245, 124, 0, 0.05), transparent)',
  };

  const tierConfig = getTierConfig(driverTier);
  const status = {
    name: tierConfig.name,
    glowGradient: TIER_GLOW_GRADIENTS[driverTier] || TIER_GLOW_GRADIENTS.Feeder,
  };

  // Get initials from driver name
  const getInitials = (name: string) => {
    if (!name) return 'DR';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Wrapper components to use Tabler icons with our Icon component style
  const RatingsIconWrapper = (p: any) => <IconStar {...p} />;
  const PromosIconWrapper = (p: any) => <IconTrendingUp {...p} />;

  const navItems = [
    { id: "home", label: "Home", Icon: HomeIcon },
    { id: "schedule", label: "Schedule", Icon: CalendarIcon },
    { id: "onfire", label: "On Fire", Icon: FlameIcon },
    { id: "earnings", label: "Earnings", Icon: DollarIcon },
    { id: "ratings", label: "Ratings", Icon: RatingsIconWrapper },
    { id: "promos", label: "Promos", Icon: PromosIconWrapper },
  ];

  const badgeText = tierConfig.name;

  const handleMenuClick = (path: string) => {
    if (onNavigate) {
      // Convert path to capitalized format expected by handleMenuNavigation
      // Map lowercase paths to the capitalized format
      const pathMap: Record<string, string> = {
        'home': 'Home',
        'schedule': 'Schedule',
        'onfire': 'On Fire',
        'earnings': 'Earnings',
        'notifications': 'Notifications',
        'account': 'Account',
        'ratings': 'Ratings',
        'promos': 'Promos',
        'help': 'Messages',
        'messages': 'Messages'
      };
      const capitalizedPath = pathMap[path] || path.charAt(0).toUpperCase() + path.slice(1);
      onNavigate(capitalizedPath);
    }
    onClose();
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Redirect to mobile splash page
      window.location.href = '/mobile';
    } catch (error) {
      console.error('Error logging out:', error);
      // Still redirect even on error
      window.location.href = '/mobile';
    }
  };

  /* ═══════════════════════════════════════════
     MENU HEADER
     ═══════════════════════════════════════════ */
  const MenuHeader = ({ name, initials, badge }: { name: string; initials: string; badge: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "20px 20px 16px", borderBottom: `1px solid ${T.border}`, position: "relative", zIndex: 2 }}>
      <div style={{
        width: 38, height: 38, borderRadius: "50%",
        background: `linear-gradient(135deg, ${T.orange}, #f0a060)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: T.white, fontWeight: 700, fontSize: 14, flexShrink: 0,
        boxShadow: "0 2px 8px rgba(232,98,42,0.3)",
      }}>{initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: T.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 4, marginTop: 3,
          background: driverTier === 'Ultimate' ? '#1A1A1A' : `${tierConfig.color}22`,
          color: tierConfig.textColor,
          padding: "2px 7px", borderRadius: 10,
          fontSize: 9, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase",
          border: driverTier === 'Ultimate' ? '1px solid #F57C00' : 'none',
        }}>
          {badge}
        </div>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════
     STATS ROW
     ═══════════════════════════════════════════ */
  const Stat = ({ value, label, prefix }: { value: string | number; label: string; prefix?: React.ReactNode }) => (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
        {prefix}{value}
      </div>
      <div style={{ fontSize: 9, color: T.textTertiary, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 500 }}>{label}</div>
    </div>
  );

  const StatsRow = ({ rating, deliveries, perfect }: { rating: number; deliveries: number; perfect: number | string }) => (
    <div style={{ display: "flex", padding: "12px 20px", borderBottom: `1px solid ${T.border}`, position: "relative", zIndex: 2 }}>
      <Stat value={rating.toFixed(2)} label="Rating" prefix={<StarIcon size={11} />} />
      <div style={{ width: 1, background: T.border, margin: "4px 0" }} />
      <Stat value={deliveries} label="Deliveries" />
      <div style={{ width: 1, background: T.border, margin: "4px 0" }} />
      <Stat value={perfect} label="Perfect" />
    </div>
  );

  /* ═══════════════════════════════════════════
     NEW DRIVER CTA
     ═══════════════════════════════════════════ */
  const NewDriverCTA = () => {
    const [h, setH] = useState(false);
    if (!driverStatus) return null;
    return (
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${T.border}`, position: "relative", zIndex: 2 }}>
        <button
          onMouseEnter={() => setH(true)}
          onMouseLeave={() => setH(false)}
          style={{
            width: "100%", background: T.cardDark, border: "none", borderRadius: 9,
            padding: 0, cursor: "pointer", overflow: "hidden",
            display: "flex", alignItems: "stretch", height: 42,
            boxShadow: h ? "0 5px 18px rgba(0,0,0,0.24)" : "0 3px 12px rgba(0,0,0,0.18)",
            transform: h ? "translateY(-1px)" : "translateY(0)",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
          }}
        >
          <div style={{
            width: 42, flexShrink: 0, background: T.cardDarkSlab,
            borderRight: `1px solid ${T.cardDarkBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
          }}>
            <div style={{
              position: "absolute", width: 26, height: 26, borderRadius: "50%",
              background: `radial-gradient(circle, ${T.orangeGlow} 0%, transparent 70%)`,
              animation: "ctaPulse 2.4s ease-in-out infinite",
            }} />
            <FlameIcon size={18} stroke={T.orange} style={{ position: "relative", zIndex: 1 }} />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 13px" }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: T.white, letterSpacing: 0.3 }}>New Driver</div>
            <div style={{ fontSize: 8.5, color: "#5a5a5a", fontWeight: 500, marginTop: 1.5 }}>Start earning today</div>
          </div>
          <div style={{ width: 34, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronIcon size={14} stroke="#5a5a5a" strokeWidth={2.2} />
          </div>
        </button>
      </div>
    );
  };

  /* ═══════════════════════════════════════════
     NAV ITEM
     ═══════════════════════════════════════════ */
  const NavItem = ({ item, isActive, onClick }: { item: typeof navItems[0]; isActive: boolean; onClick: () => void }) => {
    const [h, setH] = useState(false);
    const { Icon: ItemIcon } = item;
    return (
      <button
        onClick={onClick}
        onMouseEnter={() => setH(true)}
        onMouseLeave={() => setH(false)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "8px 10px", borderRadius: 6, border: "none",
          background: (h && !isActive) ? "#F3F4F6" : "transparent",
          cursor: "pointer", position: "relative", transition: "background 0.15s",
        }}
      >
        {isActive && <div style={{ position: "absolute", left: 0, top: 6, bottom: 6, width: 2.5, background: T.orange, borderRadius: "0 2px 2px 0" }} />}
        <div style={{
          width: 32, height: 32, borderRadius: 6, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: isActive ? T.orangeLight : h ? "#ECEEF1" : "transparent",
          transition: "background 0.15s",
        }}>
          <ItemIcon size={16} stroke={isActive ? T.orange : h ? T.textSecondary : T.textTertiary} />
        </div>
        <span style={{ fontSize: 12.5, fontWeight: isActive ? 600 : 500, color: isActive ? T.orange : h ? T.textPrimary : T.textSecondary, transition: "color 0.15s" }}>
          {item.label}
        </span>
      </button>
    );
  };

  /* ═══════════════════════════════════════════
     ACCOUNT FOOTER
     ═══════════════════════════════════════════ */
  const AccountFooter = () => {
    const [h, setH] = useState(false);
    return (
      <div style={{ padding: "10px 12px 14px", borderTop: `1px solid ${T.border}` }}>
        <button
          onClick={() => handleMenuClick('account')}
          onMouseEnter={() => setH(true)}
          onMouseLeave={() => setH(false)}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10,
            padding: "8px 10px", borderRadius: 6, border: "none",
            background: h ? "#F3F4F6" : "transparent", cursor: "pointer", transition: "background 0.15s",
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 6, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: h ? "#ECEEF1" : "transparent", transition: "background 0.15s",
          }}>
            <UserIcon size={16} stroke={h ? T.textSecondary : T.textTertiary} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 500, color: h ? T.textSecondary : T.textTertiary, transition: "color 0.15s" }}>Account</span>
        </button>
      </div>
    );
  };

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.38)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.3s ease", zIndex: 10,
        }}
      />
      
      <div
        style={{
          position: "fixed", top: 0, bottom: 0, left: 0,
          width: 260, background: T.bg,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          zIndex: 20,
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        {/* Top Glow Effect - Matches Feeder Level - Covers top of menu */}
        {isOpen && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 300,
              background: status.glowGradient,
              pointerEvents: "none",
              zIndex: 1,
              transition: "opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              opacity: isOpen ? 1 : 0,
            }}
          />
        )}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${T.orange}, #f0a060)`, flexShrink: 0, position: "relative", zIndex: 2 }} />
        <MenuHeader name={driverName || "Driver"} initials={getInitials(driverName)} badge={badgeText} />
        <StatsRow rating={driverRating} deliveries={deliveries} perfect={`${perfection}%`} />
        <NewDriverCTA />
        <div style={{ padding: "8px 12px", flex: 1, display: "flex", flexDirection: "column", gap: 1, overflowY: "auto" }}>
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              isActive={activeTab === item.id}
              onClick={() => {
                handleMenuClick(item.id);
              }}
            />
          ))}
        </div>
        <AccountFooter />
      </div>
    </>
  );
};

export default FeederSidebarMenu;

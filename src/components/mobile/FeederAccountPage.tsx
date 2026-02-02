/**
 * Crave'n Feeder App — Account Tab (Enterprise Compact White)
 * ────────────────────────────────────────────────────────────
 * Drop-in:  src/components/mobile/FeederAccountPage.tsx
 *
 * Cursor instructions:
 *   1) Replace src/components/mobile/FeederAccountPage.tsx with this file.
 *   2) Route / tab already points to <FeederAccountPage /> — no change needed.
 *   3) No gradients on backgrounds, no emojis, no oversized cards.
 *   4) All layout is inline-style; no external CSS file required.
 *   5) Driver data fetched from Supabase — integrated with existing fetchDriverData.
 *   6) Status tier thresholds match your app:
 *        Silver   55–64 pts
 *        Gold     65–75 pts
 *        Platinum 76–84 pts
 *        Diamond  85+  pts
 *   7) Nav rows are driven by the MENU_ITEMS array — wired to existing actions.
 *   8) ON FIRE card calls showSafetySettings — existing modal.
 *   9) Sign Out row calls handleSignOut — existing auth logout flow.
 */

import React, { useMemo, useState, useEffect } from "react";
import { notifications } from "@mantine/notifications";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import ProfileDetailsPage from "./ProfileDetailsPage";
import VehicleDocumentsPage from "./VehicleDocumentsPage";
import AppSettingsPage from "./AppSettingsPage";
import SecuritySafetyPage from "./SecuritySafetyPage";
import DriverSupportChat from "./DriverSupportChat";
import { SafetySettings } from "@/components/settings/SafetySettings";
import {
  Box,
  Loader,
  ActionIcon,
  Modal,
  TextInput,
  Stack,
  Group,
  Button,
  ThemeIcon,
  Paper,
  Text,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconPlus,
  IconMinus,
  IconX,
  IconEye,
  IconEyeOff,
} from "@tabler/icons-react";

// ─── THEME (shared across Crave'n enterprise pages) ────────────────────────
const C = {
  orange:  "#E8622A",
  text:    "#111111",
  muted:   "#777777",
  muted2:  "#999999",
  border:  "#EEEEEE",
  track:   "#EEF1F6",
  bg:      "#FFFFFF",
  blue:    "#3A7BD5",
  blueBg:  "#EEF4FF",
  green:   "#2E7D32",
  greenBg: "#E6F4EA",
  red:     "#C62828",
  redBg:   "#FEF2F2",
} as const;

// ─── TYPES ──────────────────────────────────────────────────────────────────
type StatusTier = "Silver" | "Gold" | "Platinum" | "Diamond";

interface StatusInfo {
  tier:       StatusTier;
  label:      string;   // e.g. "Diamond Feeder"
  minPts:     number;
  maxPts:     number | null; // null = no cap
  barColor:   string;   // accent for the 2px progress bar
}

interface AccountData {
  name:         string;
  rating:       number;   // 0–5
  totalFeeds:   number;
  statusPoints: number;
  memberSince:  string;   // e.g. "Oct 2025"
  onFireActive: boolean;
  cardBalance:  number;
}

type FeederAccountPageProps = {
  onOpenMenu?: () => void;
  onOpenNotifications?: () => void;
};

// ─── STATUS TIERS (source of truth — edit thresholds here) ─────────────────
const TIERS: StatusInfo[] = [
  { tier: "Diamond",  label: "Diamond Feeder",  minPts: 85,  maxPts: null,  barColor: "#3A7BD5" },
  { tier: "Platinum", label: "Platinum Feeder", minPts: 76,  maxPts: 84,    barColor: "#78909C" },
  { tier: "Gold",     label: "Gold Feeder",     minPts: 65,  maxPts: 75,    barColor: "#F9A825" },
  { tier: "Silver",   label: "Silver Feeder",   minPts: 55,  maxPts: 64,    barColor: "#90A4AE" },
];

function getStatus(pts: number): StatusInfo {
  // Walk highest → lowest; first match wins
  for (const t of TIERS) {
    if (pts >= t.minPts) return t;
  }
  // Below Silver floor — still render as Silver
  return TIERS[TIERS.length - 1];
}

/** Progress 0–1 within the current tier band. */
function tierProgress(pts: number, status: StatusInfo): number {
  const max = status.maxPts ?? status.minPts + 15; // Diamond has no cap; use +15 as visual range
  return Math.min(1, Math.max(0, (pts - status.minPts) / (max - status.minPts)));
}

// ─── NAV ITEMS (your real Account menu — add/remove/reorder here) ──────────
//     Each `id` maps to the onPress switch below in NavRow.
const MENU_ITEMS = [
  { id: "profile",     label: "Profile Information",  desc: "Personal details & preferences" },
  { id: "vehicle",     label: "Vehicle & Documents",  desc: "Registration, insurance, inspection" },
  { id: "feederCard",  label: "Transaction History",  desc: "View all Feeder Card transactions" },
  { id: "settings",    label: "App Settings",         desc: "Notifications, language, preferences" },
  { id: "security",    label: "Security & Safety",    desc: "Password, 2FA, emergency contacts" },
  { id: "callSupport", label: "Call Support",         desc: "24/7 support hotline" },
  { id: "msgSupport",  label: "Message Support",      desc: "Live chat with an agent" },
] as const;

type NavId = typeof MENU_ITEMS[number]["id"];

// ─── SVG ICONS (inline, no dependency) ─────────────────────────────────────
function HamburgerIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth={2} strokeLinecap="round">
      <line x1="3" y1="6"  x2="21" y2="6"  />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function MoreDotsIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill={C.muted}>
      <circle cx="5"  cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.muted2} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9,6 15,12 9,18" />
    </svg>
  );
}

function StarIcon({ size = 12, filled = true }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#F5C518" : C.border}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

// Per-nav-item SVG icons — matched to your existing Account page icons
function NavIcon({ id }: { id: NavId }) {
  const s = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: C.text, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (id) {
    case "profile":
      return (
        <svg {...s}>
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="8" r="4" />
        </svg>
      );
    case "vehicle":
      return (
        <svg {...s}>
          <rect x="1" y="3" width="15" height="13" rx="2" />
          <path d="M16 8l5 3-5 3z" />
        </svg>
      );
    case "feederCard":
      return (
        <svg {...s}>
          <rect x="1" y="4" width="22" height="16" rx="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      );
    case "settings":
      return (
        <svg {...s}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      );
    case "security":
      return (
        <svg {...s}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case "callSupport":
      return (
        <svg {...s}>
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
        </svg>
      );
    case "msgSupport":
      return (
        <svg {...s}>
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      );
  }
}

// ─── COMPONENT: TOP BAR ─────────────────────────────────────────────────────
function TopBar({ onMenuPress }: { onMenuPress?: () => void }) {
  return (
    <div style={{
      height: 56, background: C.bg, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 16px", borderBottom: `1px solid ${C.border}`,
    }}>
      <button 
        type="button" 
        onClick={onMenuPress} 
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}
      >
        <HamburgerIcon />
      </button>
      <span style={{ fontSize: 17, fontWeight: 600, color: C.text }}>Account</span>
      <MoreDotsIcon />
    </div>
  );
}

// ─── COMPONENT: IDENTITY ROW (horizontal: avatar · name · badge · since) ───
function IdentityRow({ data, status }: { data: AccountData; status: { tier: StatusTier; label: string } }) {
  // Initials from first + last name
  const initials = data.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div style={{
      borderBottom: `1px solid ${C.border}`,
      padding: "14px 16px",
      display: "flex", gap: 13, alignItems: "center",
    }}>
      {/* Monogram avatar */}
      <div style={{
        width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
        background: "linear-gradient(135deg, #E8622A, #f0a060)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontSize: 14, fontWeight: 700,
        boxShadow: "0 2px 8px rgba(232,98,42,0.28)",
      }}>
        {initials}
      </div>

      {/* Name + badge + since */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {data.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
          {/* Tier badge */}
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            background: C.blueBg, color: C.blue,
            padding: "2px 7px", borderRadius: 10,
            fontSize: 9, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase",
          }}>
            {/* Small diamond / gem SVG for the badge icon */}
            <svg width={8} height={8} viewBox="0 0 24 24" fill={C.blue}>
              <path d="M12 2L2 9l3 13h14l3-13L12 2z" />
            </svg>
            {status.label}
          </span>
          <span style={{ fontSize: 10, color: C.muted, fontWeight: 500 }}>
            Since {data.memberSince}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── COMPONENT: INLINE STATS STRIP (rating · feeds · points) ───────────────
function StatsStrip({ data }: { data: AccountData }) {
  const stats = [
    { value: <><StarIcon size={11} />{data.rating.toFixed(2)}</>, label: "Rating" },
    { value: <>{data.totalFeeds}</>,                              label: "Feeds" },
    { value: <>{data.statusPoints}</>,                            label: "Points" },
  ];

  return (
    <div style={{
      borderBottom: `1px solid ${C.border}`,
      padding: "10px 16px",
      display: "flex",
    }}>
      {stats.map((s, i) => (
        <React.Fragment key={s.label}>
          {i > 0 && <div style={{ width: 1, background: C.border, alignSelf: "stretch", margin: "3px 0" }} />}
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.text, display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 9, color: C.muted, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 }}>
              {s.label}
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── COMPONENT: SECTION HEADER ──────────────────────────────────────────────
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: "12px 16px 0",
      fontSize: 11, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: 1.2, color: C.orange,
    }}>
      {children}
    </div>
  );
}

// ─── COMPONENT: STATUS POINTS (2px progress row) ───────────────────────────
function StatusRow({ data, status }: { data: AccountData; status: { tier: StatusTier; label: string; barColor: string; minPts: number; maxPts: number | null } }) {
  const progress = tierProgress(data.statusPoints, status as any);
  const nextTierIdx = TIERS.findIndex((t) => t.tier === status.tier) - 1;
  const nextTier = nextTierIdx >= 0 ? TIERS[nextTierIdx] : null;

  return (
    <>
      <div style={{
        margin: "8px 16px 0",
        display: "flex", alignItems: "center", gap: 10, height: 34,
      }}>
        <span style={{ fontSize: 12, color: C.text, fontWeight: 600, width: 80, flexShrink: 0 }}>Points</span>
        {/* 2px bar */}
        <div style={{ flex: 1, height: 2, background: C.track, borderRadius: 1, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            background: status.barColor,
            borderRadius: 1,
            width: `${progress * 100}%`,
            transition: "width 600ms cubic-bezier(.22,.61,0,1)",
          }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 800, color: C.text, flexShrink: 0, whiteSpace: "nowrap" }}>
          {data.statusPoints} pts
        </span>
      </div>
      {/* Operational sub-line */}
      <div style={{ margin: "4px 16px 0", fontSize: 10.5, color: C.muted, fontWeight: 500 }}>
        {nextTier
          ? `${nextTier.minPts - data.statusPoints} pts to ${nextTier.label}`
          : `${status.label} — top tier reached`}
      </div>
    </>
  );
}

// ─── COMPONENT: ON FIRE CARD (flat, left orange accent bar) ────────────────
function OnFireCard({ active, onConfigure }: { active: boolean; onConfigure: () => void }) {
  return (
    <div style={{
      margin: "12px 16px 0",
      border: `1px solid ${C.border}`, borderRadius: 8,
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "flex-start",
        padding: "11px 12px",
        borderLeft: `3px solid ${C.orange}`,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header: title + active pill */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: C.text }}>ON FIRE Game</span>
            {active && (
              <span style={{
                display: "inline-block",
                background: C.greenBg, color: C.green,
                fontSize: 8, fontWeight: 700, letterSpacing: 0.8,
                textTransform: "uppercase", padding: "2px 6px", borderRadius: 3,
              }}>
                Active
              </span>
            )}
          </div>
          {/* Description */}
          <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.4, marginTop: 3 }}>
            Safety-first speed monitoring with gamified bonuses.
          </div>
          {/* CTA link */}
          <div
            role="button"
            tabIndex={0}
            onClick={onConfigure}
            onKeyDown={(e) => e.key === "Enter" && onConfigure()}
            style={{ fontSize: 10, color: C.orange, fontWeight: 700, marginTop: 6, display: "inline-flex", alignItems: "center", gap: 3, cursor: "pointer" }}
          >
            Configure Safety &amp; Game Mode
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={C.orange} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12,5 19,12 12,19" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── COMPONENT: NAV ROW ─────────────────────────────────────────────────────
function NavRow({ id, label, desc, onPress, badge }: { id: NavId; label: string; desc: string; onPress: () => void; badge?: string }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPress}
      onKeyDown={(e) => e.key === "Enter" && onPress()}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "11px 16px",
        borderBottom: `1px solid ${C.border}`,
        cursor: "pointer",
      }}
    >
      <div style={{ width: 18, height: 18, flexShrink: 0, opacity: 0.45 }}>
        <NavIcon id={id} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{label}</div>
        <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{desc}</div>
      </div>
      {badge && (
        <span style={{
          fontSize: 10, fontWeight: 700, color: C.green,
          marginRight: 4,
        }}>
          {badge}
        </span>
      )}
      <ChevronIcon />
    </div>
  );
}

// ─── COMPONENT: SIGN OUT ROW ────────────────────────────────────────────────
function SignOutRow({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSignOut}
      onKeyDown={(e) => e.key === "Enter" && onSignOut()}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "11px 16px",
        borderBottom: `1px solid ${C.border}`,
        cursor: "pointer",
      }}
    >
      {/* LogOut icon */}
      <div style={{ width: 18, height: 18, flexShrink: 0 }}>
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
          <polyline points="16,17 21,12 16,7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.red }}>Sign Out</div>
        <div style={{ fontSize: 10, color: C.red, marginTop: 1, opacity: 0.7 }}>Log out of your account</div>
      </div>
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
        <polyline points="9,6 15,12 9,18" />
      </svg>
    </div>
  );
}

// ─── PAGE ───────────────────────────────────────────────────────────────────
const FeederAccountPage: React.FC<FeederAccountPageProps> = ({
  onOpenMenu,
  onOpenNotifications
}) => {
  const navigate = useNavigate();
  const [showCardPage, setShowCardPage] = useState(false);
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [isCardLocked, setIsCardLocked] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState<'main' | 'profile' | 'vehicle' | 'settings' | 'security' | 'support'>('main');
  const [loading, setLoading] = useState(true);
  const [showSafetySettings, setShowSafetySettings] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [gameSettings, setGameSettings] = useState({
    onFireGameEnabled: false,
    speedDetectionEnabled: false,
  });
  const [cardBalance, setCardBalance] = useState(0);
  const [cardNumber] = useState('5399283309390129');
  const [expiryDate] = useState('12/28');
  const [cvv] = useState('847');
  const [transactions, setTransactions] = useState<any[]>([]);

  // Account data state
  const [accountData, setAccountData] = useState<AccountData>({
    name: '',
    rating: 0,
    totalFeeds: 0,
    statusPoints: 0,
    memberSince: '',
    onFireActive: false,
    cardBalance: 0,
  });

  // Check URL params and listen for navigation events to auto-open card page
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('section') === 'card') {
      setShowCardPage(true);
    }

    const handleSwitchTab = (event: CustomEvent<{ tab: string; section?: string }>) => {
      if (event.detail.section === 'card') {
        setShowCardPage(true);
      }
    };

    window.addEventListener('switchTab', handleSwitchTab as EventListener);
    return () => window.removeEventListener('switchTab', handleSwitchTab as EventListener);
  }, []);
  
  const formatCardNumber = (number: string, showFull: boolean): string => {
    const digitsOnly = number.replace(/\D/g, '');
    const normalized = digitsOnly.slice(0, 16).padEnd(16, '0');
    
    if (showFull) {
      return `${normalized.slice(0, 4)} ${normalized.slice(4, 8)} ${normalized.slice(8, 12)} ${normalized.slice(12, 16)}`;
    } else {
      return `**** **** **** ${normalized.slice(12, 16)}`;
    }
  };

  useEffect(() => {
    fetchDriverData();
  }, []);

  const fetchDriverData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: driverProfile } = await supabase
        .from('driver_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const { data: application } = await supabase
        .from('craver_applications')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      let fullName = '';
      if (application?.first_name || application?.last_name) {
        fullName = [application.first_name, application.last_name].filter(Boolean).join(' ');
      } else if (user.user_metadata?.full_name) {
        fullName = user.user_metadata.full_name;
      } else if (user.user_metadata?.first_name || user.user_metadata?.last_name) {
        fullName = [user.user_metadata.first_name, user.user_metadata.last_name].filter(Boolean).join(' ');
      } else if (user.email) {
        const emailName = user.email.split('@')[0];
        fullName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
      }
      
      const rating = Number(driverProfile?.rating) || 0;
      const totalDeliveries = driverProfile?.total_deliveries || 0;
      const points = Math.round((rating) * 17 + (totalDeliveries) * 0.1);

      let memberSince = '';
      if (driverProfile?.created_at) {
        const date = new Date(driverProfile.created_at);
        memberSince = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      } else if (user.created_at) {
        const date = new Date(user.created_at);
        memberSince = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }

      const { data: earnings } = await supabase
        .from('driver_earnings')
        .select('*')
        .eq('driver_id', user.id)
        .order('earned_at', { ascending: false });

      const totalEarnings = earnings?.reduce((sum, earning) => {
        return sum + ((earning.total_cents || 0) / 100);
      }, 0) || 0;

      const { data: payouts } = await supabase
        .from('driver_payouts')
        .select('amount')
        .eq('driver_id', user.id)
        .in('status', ['completed', 'sent']);

      const totalPayouts = payouts?.reduce((sum, payout) => {
        return sum + (payout.amount || 0);
      }, 0) || 0;

      const walletBalance = totalEarnings - totalPayouts;
      const balance = Math.max(0, walletBalance);

      if (earnings) {
        const formattedTransactions = earnings.slice(0, 10).map((earning: any) => ({
          date: new Date(earning.earned_at || earning.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          description: 'Delivery Earnings',
          amount: (earning.total_cents || 0) / 100,
          type: 'credit' as const,
        }));
        setTransactions(formattedTransactions);
      }

      const { data: driverSettings } = await supabase
        .from('driver_settings')
        .select('on_fire_game_enabled, speed_detection_enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      const onFireActive = driverSettings?.on_fire_game_enabled || false;
      if (driverSettings) {
        setGameSettings({
          onFireGameEnabled: driverSettings.on_fire_game_enabled || false,
          speedDetectionEnabled: driverSettings.speed_detection_enabled || false,
        });
      }

      setAccountData({
        name: fullName,
        rating,
        totalFeeds: totalDeliveries,
        statusPoints: points,
        memberSince,
        onFireActive,
        cardBalance: balance,
      });
      setCardBalance(balance);
    } catch (error) {
      console.error('Error fetching driver data:', error);
    } finally {
      setLoading(false);
    }
  };

  const status = useMemo(() => getStatus(accountData.statusPoints), [accountData.statusPoints]);

  // ── Navigation / action handlers ─────────────────────────────────────────
  const handleNav = (id: NavId) => {
    switch (id) {
      case "profile":
        setCurrentPage('profile');
        break;
      case "vehicle":
        setCurrentPage('vehicle');
        break;
      case "feederCard":
        setShowCardPage(true);
        break;
      case "settings":
        setCurrentPage('settings');
        break;
      case "security":
        setCurrentPage('security');
        break;
      case "callSupport":
        window.location.href = 'tel:+18005551234';
        break;
      case "msgSupport":
        setCurrentPage('support');
        break;
    }
  };

  const handleConfigureOnFire = () => {
    setShowSafetySettings(true);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      notifications.show({
        title: "Signed out successfully",
        message: '',
        color: "green",
      });
      navigate('/mobile');
    } catch (error) {
      console.error("Error signing out:", error);
      notifications.show({
        title: "Failed to sign out",
        message: '',
        color: "red",
      });
      navigate('/mobile');
    }
  };

  // Show sub-pages
  if (currentPage === 'profile') {
    return <ProfileDetailsPage onBack={() => setCurrentPage('main')} />;
  }

  if (currentPage === 'vehicle') {
    return <VehicleDocumentsPage onBack={() => setCurrentPage('main')} />;
  }

  if (currentPage === 'settings') {
    return <AppSettingsPage onBack={() => setCurrentPage('main')} />;
  }

  if (currentPage === 'security') {
    return <SecuritySafetyPage onBack={() => setCurrentPage('main')} />;
  }

  if (currentPage === 'support') {
    return <DriverSupportChat onBack={() => setCurrentPage('main')} />;
  }

  // If card page is open, show that instead (keeping existing card page UI)
  if (showCardPage) {
    return (
        <div style={{ 
          background: 'white', 
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <Paper
            pos="sticky"
            top={0}
            bg="white"
            style={{ 
              zIndex: 10,
              paddingTop: 'env(safe-area-inset-top, 0px)',
              borderBottom: '1px solid var(--mantine-color-gray-2)',
              flexShrink: 0,
            }}
          >
          <Group px="xl" pb="md" justify="space-between" align="center">
            <ActionIcon onClick={() => setShowCardPage(false)} variant="subtle" color="dark">
              <IconArrowLeft size={24} />
            </ActionIcon>
            <Text fw={700} size="lg" c="dark">Transaction History</Text>
            <Box w={24} />
          </Group>
        </Paper>

        <div style={{ 
          flex: 1, 
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: `calc(80px + env(safe-area-inset-bottom, 0px))`,
        }}>

        <Modal
          opened={showPinDialog}
          onClose={() => setShowPinDialog(false)}
          title="Change Card PIN"
          centered
          radius="xl"
        >
          <Stack gap="md">
            <TextInput
              label="Current PIN"
              type="password"
              maxLength={4}
              placeholder="****"
              styles={{
                input: {
                  textAlign: 'center',
                  fontSize: '24px',
                  fontFamily: 'monospace',
                  letterSpacing: '0.2em',
                  border: '2px solid var(--mantine-color-gray-2)',
                  borderRadius: '12px',
                },
              }}
            />
            <TextInput
              label="New PIN"
              type="password"
              maxLength={4}
              placeholder="****"
              styles={{
                input: {
                  textAlign: 'center',
                  fontSize: '24px',
                  fontFamily: 'monospace',
                  letterSpacing: '0.2em',
                  border: '2px solid var(--mantine-color-gray-2)',
                  borderRadius: '12px',
                },
              }}
            />
            <TextInput
              label="Confirm New PIN"
              type="password"
              maxLength={4}
              placeholder="****"
              styles={{
                input: {
                  textAlign: 'center',
                  fontSize: '24px',
                  fontFamily: 'monospace',
                  letterSpacing: '0.2em',
                  border: '2px solid var(--mantine-color-gray-2)',
                  borderRadius: '12px',
                },
              }}
            />
            <Group gap="md" mt="md">
              <Button
                variant="light"
                color="gray"
                flex={1}
                onClick={() => setShowPinDialog(false)}
                radius="xl"
              >
                Cancel
              </Button>
              <Button
                flex={1}
                color="orange"
                onClick={() => {
                  setShowPinDialog(false);
                  notifications.show({
                    title: "PIN updated successfully",
                    message: '',
                    color: "green",
                  });
                }}
                radius="xl"
              >
                Update PIN
              </Button>
            </Group>
          </Stack>
        </Modal>

        <Box px="xl" py="md" style={{ backgroundColor: 'white' }}>
          <Text fw={700} c="dark" size="xl" mb="lg">Feeder Card Transactions</Text>
          {transactions.length === 0 ? (
            <Box p="xl" style={{ textAlign: 'center' }}>
              <Text c="dimmed">No transactions yet</Text>
              <Text size="sm" c="dimmed" mt="xs">Your earnings will appear here</Text>
            </Box>
          ) : (
            <Box style={{ border: '1px solid var(--mantine-color-gray-2)', borderRadius: '8px', overflow: 'hidden' }}>
              {transactions.map((txn, idx) => (
                <Box 
                  key={idx} 
                  p="sm" 
                  style={{ 
                    backgroundColor: 'white',
                    borderBottom: idx < transactions.length - 1 ? '1px solid var(--mantine-color-gray-2)' : 'none',
                    minHeight: '60px'
                  }}
                >
                  <Group justify="space-between" gap="sm">
                    <Group gap="sm">
                      <ThemeIcon size="md" radius="md" color={txn.type === "credit" ? "green" : "red"} variant="light">
                        {txn.type === "credit" ? <IconPlus size={16} /> : <IconMinus size={16} />}
                      </ThemeIcon>
                      <Box>
                        <Text fw={600} c="dark" size="sm">{txn.description}</Text>
                        <Text size="xs" c="dimmed">{txn.date}</Text>
                      </Box>
                    </Group>
                    <Text size="lg" fw={700} c={txn.type === "credit" ? "green.6" : "red.6"}>
                      {txn.type === "credit" ? "+" : "-"}${Math.abs(txn.amount).toFixed(2)}
                    </Text>
                  </Group>
                </Box>
              ))}
            </Box>
          )}
        </Box>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100dvh',
        width: '100%',
        background: C.bg,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        <Loader size="lg" color="orange" />
      </div>
    );
  }

  return (
    <div style={{
      background: C.bg,
      color: C.text,
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      display: "flex",
      flexDirection: "column",
      height: "100dvh",
      overflow: "hidden",
      paddingTop: 'env(safe-area-inset-top, 0px)',
    }}>

      {/* ── Fixed Header Section (everything visible in image) */}
      <div style={{ flexShrink: 0 }}>
        {/* ── Top bar */}
        <TopBar onMenuPress={onOpenMenu} />

        {/* ── Identity row */}
        <IdentityRow data={accountData} status={status} />

        {/* ── Inline stats strip: rating | feeds | points */}
        <StatsStrip data={accountData} />

        {/* ── Status section */}
        <SectionHeader>Status</SectionHeader>
        <StatusRow data={accountData} status={status} />

        {/* ── Active Programs section (ON FIRE) */}
        <SectionHeader>Active Programs</SectionHeader>
        <OnFireCard active={accountData.onFireActive} onConfigure={handleConfigureOnFire} />
      </div>

      {/* ── Scrollable Menu Section */}
      <div style={{ 
        flex: 1, 
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        overflowX: "hidden",
        marginTop: 14,
        borderTop: `1px solid ${C.border}`,
      }}>
        {/* ── Menu section — all nav items from MENU_ITEMS */}
        {MENU_ITEMS.map((item) => (
          <NavRow
            key={item.id}
            id={item.id}
            label={item.label}
            desc={item.desc}
            badge={undefined}
            onPress={() => handleNav(item.id)}
          />
        ))}

        {/* ── Sign Out */}
        <SignOutRow onSignOut={handleSignOut} />

        {/* Bottom breathing room for tab bar and extra scroll space */}
        <div style={{ 
          paddingBottom: `calc(100px + env(safe-area-inset-bottom, 0px))` 
        }} />
      </div>

      {/* ON FIRE Safety Settings Modal - Full Screen */}
      {showSafetySettings && userId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: C.bg,
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            borderBottom: `1px solid ${C.border}`,
            flexShrink: 0,
          }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>Safety Settings</div>
            <button
              type="button"
              onClick={() => setShowSafetySettings(false)}
            style={{
                background: 'none',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconX size={20} style={{ color: C.text }} />
            </button>
          </div>
          {/* Scrollable Content */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}>
            <SafetySettings
              userId={userId}
              currentSettings={gameSettings}
              onSettingsUpdate={() => {
                setShowSafetySettings(false);
                fetchDriverData();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FeederAccountPage;

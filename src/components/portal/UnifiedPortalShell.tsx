// @ts-nocheck
import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconArrowDown,
  IconArrowLeft,
  IconArrowUp,
  IconClock,
  IconLogout,
  IconMenu2,
  IconX,
  IconChevronDown,
  IconChevronsLeft,
  IconChevronsRight,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { useFeatureHighlights } from '@/hooks/useFeatureHighlights';
import { FeatureHighlight } from './FeatureHighlight';

export interface PortalTab {
  id: string;
  label: string;
  description: string;
  section: string;
  icon: any;
}

export interface PortalKPI {
  id: string;
  label: string;
  value: string;
  delta: string;
  up: boolean;
  onClick?: () => void;
}

interface UnifiedPortalShellProps {
  portalId?: string;
  portalName: string;
  portalSubtitle: string;
  sectionLabel: string;
  tabs: PortalTab[];
  sections: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  kpis?: PortalKPI[];
  kpiLabel?: string;
  headerActions?: React.ReactNode;
  lastUpdated?: Date;
  userTitle?: string;
  children: React.ReactNode;
  onBack?: () => void;
  onSignOut?: () => void;
  getBadgeValue?: (tabId: string) => number;
}

export function UnifiedPortalShell({
  portalId = 'general',
  portalName,
  portalSubtitle,
  sectionLabel,
  tabs,
  sections,
  activeTab,
  onTabChange,
  kpis,
  kpiLabel = 'Key Metrics — Live',
  headerActions,
  lastUpdated,
  userTitle,
  children,
  onBack,
  onSignOut,
  getBadgeValue,
}: UnifiedPortalShellProps) {
  const navigate = useNavigate();
  const activeTabMeta = tabs.find(t => t.id === activeTab) || tabs[0];
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(activeTabMeta?.section || null);
  const { getFeature, markSeen } = useFeatureHighlights(portalId);

  // Close mobile nav on tab change
  const handleTabChange = (tabId: string) => {
    onTabChange(tabId);
    setMobileNavOpen(false);
  };

  // Close mobile nav on outside click / escape
  useEffect(() => {
    if (!mobileNavOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileNavOpen]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <div className="mx-auto w-full max-w-[1800px] p-2 sm:p-3 md:p-4">
        <div className={cn('grid gap-2 sm:gap-3 transition-all duration-200', sidebarCollapsed ? 'lg:grid-cols-[60px_minmax(0,1fr)]' : 'lg:grid-cols-[280px_minmax(0,1fr)]')}>
          {/* Desktop Sidebar — collapsible */}
          <aside className="hidden rounded-lg border border-border bg-card shadow-card lg:flex lg:h-[calc(100vh-2rem)] lg:flex-col lg:overflow-hidden transition-all duration-200">
            <div className="border-b border-border p-4 flex items-center justify-between">
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{sectionLabel}</p>
                  <h1 className="mt-1 text-lg font-semibold text-foreground">{portalName}</h1>
                  <p className="mt-1 text-xs text-muted-foreground">{portalSubtitle}</p>
                </div>
              )}
              <button
                onClick={() => setSidebarCollapsed(c => !c)}
                className={cn(
                  'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors',
                  sidebarCollapsed && 'mx-auto'
                )}
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? <IconChevronsRight size={14} /> : <IconChevronsLeft size={14} />}
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-3">
              {sections.map(section => {
                const sectionTabs = tabs.filter(tab => tab.section === section);
                if (sectionTabs.length === 0) return null;
                return (
                  <div key={section} className="space-y-1">
                    {!sidebarCollapsed && (
                      <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{section}</p>
                    )}
                    {sidebarCollapsed && <div className="my-1 border-t border-border" />}
                    {sectionTabs.map(tab => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      const badgeValue = getBadgeValue?.(tab.id) ?? 0;

                      if (sidebarCollapsed) {
                        return (
                          <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            title={tab.label}
                            className={cn(
                              'group relative flex w-full items-center justify-center rounded-md border p-2 transition-colors',
                              isActive
                                ? 'border-primary/40 bg-primary/10 text-primary'
                                : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground'
                            )}
                          >
                            <Icon size={16} />
                            {badgeValue > 0 && (
                              <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
                                {badgeValue}
                              </span>
                            )}
                          </button>
                        );
                      }

                      return (
                        <button
                          key={tab.id}
                          onClick={() => onTabChange(tab.id)}
                          className={cn(
                            'group flex w-full items-start gap-2.5 rounded-md border px-2.5 py-2 text-left transition-colors',
                            isActive
                              ? 'border-primary/40 bg-primary/10 text-foreground'
                              : 'border-transparent bg-background text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground'
                          )}
                        >
                          <span className={cn(
                            'mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border',
                            isActive ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-muted/50 text-muted-foreground group-hover:text-foreground'
                          )}>
                            <Icon size={14} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-xs font-semibold">{tab.label}</span>
                              {badgeValue > 0 && (
                                <span className="rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                  {badgeValue}
                                </span>
                              )}
                            </span>
                            <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">{tab.description}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Mobile Sidebar Drawer */}
          <aside className={cn(
            'fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] transform bg-card shadow-xl transition-transform duration-200 ease-out lg:hidden',
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
          )}>
            <div className="flex items-center justify-between border-b border-border p-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{sectionLabel}</p>
                <h1 className="text-sm font-semibold text-foreground">{portalName}</h1>
              </div>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted"
              >
                <IconX size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2" style={{ maxHeight: 'calc(100vh - 60px)' }}>
              {sections.map(section => {
                const sectionTabs = tabs.filter(tab => tab.section === section);
                if (sectionTabs.length === 0) return null;
                const isExpanded = expandedSection === section;
                const hasActiveTab = sectionTabs.some(t => t.id === activeTab);

                return (
                  <div key={section} className="mb-1">
                    <button
                      onClick={() => setExpandedSection(isExpanded ? null : section)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors',
                        hasActiveTab ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <span>{section}</span>
                      <IconChevronDown size={14} className={cn('transition-transform', isExpanded && 'rotate-180')} />
                    </button>
                    {isExpanded && (
                      <div className="space-y-0.5 pb-1">
                        {sectionTabs.map(tab => {
                          const Icon = tab.icon;
                          const isActive = activeTab === tab.id;
                          const badgeValue = getBadgeValue?.(tab.id) ?? 0;

                          return (
                            <button
                              key={tab.id}
                              onClick={() => handleTabChange(tab.id)}
                              className={cn(
                                'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors',
                                isActive
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                              )}
                            >
                              <Icon size={15} className="flex-shrink-0" />
                              <span className="truncate text-xs font-medium">{tab.label}</span>
                              {badgeValue > 0 && (
                                <span className="ml-auto rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{badgeValue}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Mobile nav actions */}
              <div className="mt-3 space-y-1 border-t border-border pt-3">
                <button
                  onClick={() => { setMobileNavOpen(false); (onBack || (() => navigate('/hub')))(); }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                >
                  <IconArrowLeft size={15} />
                  Back to Hub
                </button>
                {onSignOut && (
                  <button
                    onClick={() => { setMobileNavOpen(false); onSignOut(); }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10"
                  >
                    <IconLogout size={15} />
                    Sign Out
                  </button>
                )}
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="min-w-0 space-y-2 sm:space-y-3">
            {/* Header */}
            <header className="rounded-lg border border-border bg-card p-2 shadow-card sm:p-3">
              <div className="flex flex-col gap-2 sm:gap-3">
                <div className="flex items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                  {/* Mobile menu button */}
                  <button
                    onClick={() => setMobileNavOpen(true)}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted lg:hidden"
                  >
                    <IconMenu2 size={16} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:block">{portalName}</p>
                    <h2 className="truncate text-sm font-semibold text-foreground sm:text-lg">{activeTabMeta?.label}</h2>
                    <p className="hidden text-xs text-muted-foreground sm:block">{activeTabMeta?.description}</p>
                  </div>
                  {headerActions && (
                    <div className="hidden grid-cols-2 gap-2 sm:grid sm:flex sm:flex-wrap sm:justify-end">
                      {headerActions}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-border pt-2 sm:gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground sm:text-xs">
                    {lastUpdated && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 sm:px-2 sm:py-1">
                        <IconClock size={12} />
                        <span className="hidden sm:inline">Updated </span>{lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {userTitle && (
                      <span className="hidden items-center gap-1 rounded-md border border-border bg-background px-2 py-1 sm:inline-flex">
                        {userTitle}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      onClick={onBack || (() => navigate('/hub'))}
                      className="hidden items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted lg:inline-flex"
                    >
                      <IconArrowLeft size={14} />
                      Hub
                    </button>
                    {onSignOut && (
                      <button
                        onClick={onSignOut}
                        className="hidden items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted lg:inline-flex"
                      >
                        <IconLogout size={14} />
                        Sign out
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </header>

            {/* Mobile quick-tab scroller — compact pill style */}
            <div className="rounded-lg border border-border bg-card p-1.5 shadow-card lg:hidden">
              <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  const badgeValue = getBadgeValue?.(tab.id) ?? 0;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => onTabChange(tab.id)}
                      className={cn(
                        'inline-flex flex-shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted/40'
                      )}
                    >
                      <Icon size={12} />
                      {tab.label}
                      {badgeValue > 0 && (
                        <span className="rounded-full bg-primary/10 px-1 text-[9px] font-semibold leading-none text-primary">{badgeValue}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* KPI Strip */}
            {kpis && kpis.length > 0 && (
              <section className="rounded-lg border border-border bg-card p-1.5 shadow-card sm:p-2 md:p-3">
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 px-1 sm:mb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{kpiLabel}</p>
                  <p className="text-[10px] tabular-nums text-muted-foreground sm:text-[11px]">{new Date().toLocaleDateString()}</p>
                </div>
                <div className={cn(
                  'grid grid-cols-2 gap-1.5 sm:gap-2',
                  kpis.length <= 4 ? 'md:grid-cols-4' : 'md:grid-cols-4 xl:grid-cols-8'
                )}>
                  {kpis.map(kpi => (
                    <button
                      key={kpi.id}
                      onClick={kpi.onClick}
                      className={cn(
                        'rounded-md border border-border bg-background p-1.5 text-left transition-colors sm:p-2',
                        kpi.onClick ? 'hover:border-primary/40 hover:bg-primary/5' : 'cursor-default'
                      )}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-foreground sm:text-[10px] sm:tracking-[0.08em]">{kpi.label}</span>
                        {kpi.up ? <IconArrowUp size={11} className="flex-shrink-0 text-status-online" /> : <IconArrowDown size={11} className="flex-shrink-0 text-destructive" />}
                      </div>
                      <p className="mt-0.5 text-xs font-semibold tabular-nums text-foreground sm:mt-1 sm:text-sm">{kpi.value}</p>
                      <p className={cn('mt-0.5 text-[10px] sm:text-[11px]', kpi.up ? 'text-status-online' : 'text-destructive')}>
                        {kpi.delta}
                      </p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Module Workspace */}
            <section className="rounded-lg border border-border bg-card shadow-card">
              <div className="border-b border-border px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Module Workspace</p>
                <h3 className="text-xs font-semibold text-foreground sm:text-sm">{activeTabMeta?.label}</h3>
              </div>
              <div className="overflow-x-auto p-1.5 sm:p-2 md:p-3">
                <Suspense
                  fallback={
                    <div className="flex min-h-[160px] items-center justify-center rounded-md border border-dashed border-border bg-muted/20 sm:min-h-[220px]">
                      <div className="text-center">
                        <div className="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary sm:h-6 sm:w-6" />
                        <p className="text-[11px] text-muted-foreground sm:text-xs">Loading module...</p>
                      </div>
                    </div>
                  }
                >
                  {children}
                </Suspense>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
// Reusable loading state
export function PortalLoadingState({ message = 'Verifying access...' }: { message?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="rounded-lg border border-border bg-card px-6 py-5 text-center shadow-card">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// Reusable access denied state
export function PortalAccessDenied({
  portalName,
  email,
  onHome,
  onSignOut,
}: {
  portalName: string;
  email?: string;
  onHome?: () => void;
  onSignOut?: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-card">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
            <IconArrowLeft size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Access denied</h2>
            <p className="text-xs text-muted-foreground">You don't have access to {portalName}.</p>
          </div>
        </div>
        {email && (
          <p className="mb-4 text-xs text-muted-foreground">
            Logged in as <span className="font-semibold text-foreground">{email}</span>
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onHome || (() => navigate('/hub'))}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Back to Hub
          </button>
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/15"
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// @ts-nocheck
import React, { Suspense, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconArrowDown,
  IconArrowLeft,
  IconArrowUp,
  IconClock,
  IconLogout,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1800px] p-3 md:p-4">
        <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Sidebar */}
          <aside className="hidden rounded-lg border border-border bg-card shadow-card lg:flex lg:h-[calc(100vh-2rem)] lg:flex-col lg:overflow-hidden">
            <div className="border-b border-border p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{sectionLabel}</p>
              <h1 className="mt-1 text-lg font-semibold text-foreground">{portalName}</h1>
              <p className="mt-1 text-xs text-muted-foreground">{portalSubtitle}</p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-3">
              {sections.map(section => {
                const sectionTabs = tabs.filter(tab => tab.section === section);
                if (sectionTabs.length === 0) return null;
                return (
                  <div key={section} className="space-y-1">
                    <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{section}</p>
                    {sectionTabs.map(tab => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      const badgeValue = getBadgeValue?.(tab.id) ?? 0;

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

          {/* Main content */}
          <main className="min-w-0 space-y-3">
            {/* Header */}
            <header className="rounded-lg border border-border bg-card p-3 shadow-card">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{portalName}</p>
                    <h2 className="text-lg font-semibold text-foreground">{activeTabMeta?.label}</h2>
                    <p className="text-xs text-muted-foreground">{activeTabMeta?.description}</p>
                  </div>
                  {headerActions && (
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                      {headerActions}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {lastUpdated && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1">
                        <IconClock size={13} />
                        Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {userTitle && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1">
                        {userTitle}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onBack || (() => navigate('/hub'))}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                      <IconArrowLeft size={14} />
                      Hub
                    </button>
                    {onSignOut && (
                      <button
                        onClick={onSignOut}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                      >
                        <IconLogout size={14} />
                        Sign out
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </header>

            {/* Mobile tabs */}
            <div className="rounded-lg border border-border bg-card p-2 shadow-card lg:hidden">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  const badgeValue = getBadgeValue?.(tab.id) ?? 0;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => onTabChange(tab.id)}
                      className={cn(
                        'inline-flex flex-shrink-0 items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-semibold',
                        isActive
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground'
                      )}
                    >
                      <Icon size={13} />
                      {tab.label}
                      {badgeValue > 0 && (
                        <span className="rounded-full border border-primary/40 bg-primary/10 px-1 py-0.5 text-[10px] leading-none text-primary">{badgeValue}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* KPI Strip */}
            {kpis && kpis.length > 0 && (
              <section className="rounded-lg border border-border bg-card p-2 shadow-card md:p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{kpiLabel}</p>
                  <p className="text-[11px] tabular-nums text-muted-foreground">{new Date().toLocaleDateString()}</p>
                </div>
                <div className={cn(
                  'grid grid-cols-2 gap-2',
                  kpis.length <= 4 ? 'md:grid-cols-4' : 'md:grid-cols-4 xl:grid-cols-8'
                )}>
                  {kpis.map(kpi => (
                    <button
                      key={kpi.id}
                      onClick={kpi.onClick}
                      className={cn(
                        'rounded-md border border-border bg-background p-2 text-left transition-colors',
                        kpi.onClick ? 'hover:border-primary/40 hover:bg-primary/5' : 'cursor-default'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{kpi.label}</span>
                        {kpi.up ? <IconArrowUp size={12} className="text-status-online" /> : <IconArrowDown size={12} className="text-destructive" />}
                      </div>
                      <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">{kpi.value}</p>
                      <p className={cn('mt-0.5 text-[11px]', kpi.up ? 'text-status-online' : 'text-destructive')}>
                        {kpi.delta}
                      </p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Module Workspace */}
            <section className="rounded-lg border border-border bg-card shadow-card">
              <div className="border-b border-border px-3 py-2 md:px-4 md:py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Module Workspace</p>
                <h3 className="text-sm font-semibold text-foreground">{activeTabMeta?.label}</h3>
              </div>
              <div className="p-2 md:p-3">
                <Suspense
                  fallback={
                    <div className="flex min-h-[220px] items-center justify-center rounded-md border border-dashed border-border bg-muted/20">
                      <div className="text-center">
                        <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
                        <p className="text-xs text-muted-foreground">Loading module...</p>
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

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { readDesktopNotificationPreferences } from './desktopNotificationPreferences';

type InternalMessageRow = {
  id: string;
  sender_id: string;
  subject: string | null;
  body: string;
  parent_id: string | null;
  thread_root_id?: string | null;
  recipient_ids: string[] | null;
};

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  priority: string;
  author_id: string;
  expires_at: string | null;
};

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  assigned_by: string;
  priority: string;
};

type SupportMessageRow = {
  id: string;
  thread_id: string;
  sender_role: 'merchant' | 'support' | 'customer' | 'driver' | 'system';
  body: string;
};

type LocationSnapshot = {
  pathname: string;
  search: string;
};

const profileNameCache = new Map<string, string>();

function compactBody(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact ? compact.slice(0, 180) : fallback;
}

function queryValue(search: string, key: string): string | null {
  return new URLSearchParams(search).get(key);
}

function isViewingRoute(location: LocationSnapshot, route: string): boolean {
  const target = new URL(route, 'https://craven-hub.local');
  if (location.pathname !== target.pathname || document.visibilityState !== 'visible' || !document.hasFocus()) {
    return false;
  }

  const targetTab = target.searchParams.get('tab');
  const currentTab = queryValue(location.search, 'tab');
  if (targetTab && currentTab !== targetTab) return false;

  for (const key of ['message', 'thread', 'announcement', 'task']) {
    const targetValue = target.searchParams.get(key);
    if (targetValue && queryValue(location.search, key) !== targetValue) return false;
  }
  return true;
}

async function profileName(userId: string): Promise<string> {
  const cached = profileNameCache.get(userId);
  if (cached) return cached;

  const { data } = await supabase
    .from('user_profiles')
    .select('full_name, email')
    .eq('user_id', userId)
    .maybeSingle();
  const row = data as { full_name: string | null; email: string | null } | null;
  const name = row?.full_name || row?.email || 'Craven teammate';
  profileNameCache.set(userId, name);
  return name;
}

async function canReceiveSupportNotifications(user: User): Promise<boolean> {
  const { data, error } = await (supabase as any).rpc('is_craven_support', { _user_id: user.id });
  return !error && data === true;
}

export default function DesktopNotificationBridge() {
  const location = useLocation();
  const locationRef = useRef<LocationSnapshot>({
    pathname: location.pathname,
    search: location.search,
  });

  useEffect(() => {
    locationRef.current = { pathname: location.pathname, search: location.search };
  }, [location.pathname, location.search]);

  useEffect(() => {
    const desktopNotifications = window.cravenDesktop?.notifications;
    if (!desktopNotifications) return;

    let cancelled = false;
    let activeUserId: string | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const removeChannel = () => {
      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
    };

    const show = async (payload: { id: string; title: string; body: string; route: string }) => {
      if (
        cancelled ||
        !readDesktopNotificationPreferences().enabled ||
        isViewingRoute(locationRef.current, payload.route)
      ) return;
      await desktopNotifications.show(payload);
    };

    const bind = async (user: User | null) => {
      if (cancelled || activeUserId === user?.id) return;
      removeChannel();
      activeUserId = user?.id ?? null;
      if (!user) return;

      const supported = await desktopNotifications.isSupported();
      if (!supported || cancelled || activeUserId !== user.id) return;
      const supportAccess = await canReceiveSupportNotifications(user);
      if (cancelled || activeUserId !== user.id) return;

      let nextChannel = supabase
        .channel(`desktop-native-notifications-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'internal_messages' },
          (payload) => {
            const row = payload.new as InternalMessageRow;
            const preferences = readDesktopNotificationPreferences();
            if (!preferences.enabled || !preferences.internalComms) return;
            if (row.sender_id === user.id || !(row.recipient_ids || []).includes(user.id)) return;
            const rootId = row.thread_root_id || row.parent_id || row.id;
            void profileName(row.sender_id).then((sender) =>
              show({
                id: `internal-message:${row.id}`,
                title: row.subject?.trim() || `New message from ${sender}`,
                body: preferences.showPreviews
                  ? compactBody(row.body, `${sender} sent an internal message.`)
                  : `${sender} sent an internal message.`,
                route: `/hub/internal-comms?tab=messages&message=${encodeURIComponent(rootId)}`,
              }),
            );
          },
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'internal_announcements' },
          (payload) => {
            const row = payload.new as AnnouncementRow;
            const preferences = readDesktopNotificationPreferences();
            if (!preferences.enabled || !preferences.internalComms) return;
            if (row.author_id === user.id) return;
            if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return;
            const priority = row.priority === 'critical' ? 'Critical: ' : row.priority === 'urgent' ? 'Urgent: ' : '';
            void show({
              id: `internal-announcement:${row.id}`,
              title: `${priority}${row.title}`,
              body: preferences.showPreviews
                ? compactBody(row.body, 'A new company announcement was published.')
                : 'A new company announcement was published.',
              route: `/hub/internal-comms?tab=announcements&announcement=${encodeURIComponent(row.id)}`,
            });
          },
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'internal_tasks' },
          (payload) => {
            const row = payload.new as TaskRow;
            const preferences = readDesktopNotificationPreferences();
            if (!preferences.enabled || !preferences.internalComms) return;
            if (row.assigned_to !== user.id || row.assigned_by === user.id) return;
            void show({
              id: `internal-task:${row.id}`,
              title: row.priority === 'urgent' ? `Urgent task: ${row.title}` : `New task: ${row.title}`,
              body: preferences.showPreviews
                ? compactBody(row.description, 'A new internal task was assigned to you.')
                : 'A new internal task was assigned to you.',
              route: `/hub/internal-comms?tab=tasks&task=${encodeURIComponent(row.id)}`,
            });
          },
        );

      if (supportAccess) {
        nextChannel = nextChannel.on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'order_support_messages' },
          (payload) => {
            const row = payload.new as SupportMessageRow;
            const preferences = readDesktopNotificationPreferences();
            if (!preferences.enabled || !preferences.supportConversations) return;
            if (row.sender_role === 'support' || row.sender_role === 'system') return;
            const sender =
              row.sender_role === 'driver'
                ? 'Feeder'
                : row.sender_role === 'merchant'
                  ? 'Merchant'
                  : 'Customer';
            void show({
              id: `order-support-message:${row.id}`,
              title: `New ${sender} support message`,
              body: preferences.showPreviews
                ? compactBody(row.body, `${sender} sent a support message.`)
                : `${sender} sent a support message.`,
              route: `/support-operations?tab=conversations&thread=${encodeURIComponent(row.thread_id)}`,
            });
          },
        );
      }

      channel = nextChannel.subscribe();
    };

    void supabase.auth.getUser().then(({ data }) => bind(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void bind(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      activeUserId = null;
      removeChannel();
      subscription.unsubscribe();
    };
  }, []);

  return null;
}

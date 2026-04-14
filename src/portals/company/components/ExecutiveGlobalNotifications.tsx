import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Card, Tag, Tooltip } from 'antd';
import {
  BellOutlined,
  MessageOutlined,
  NotificationOutlined,
  CheckOutlined,
  CloseOutlined,
  FileDoneOutlined,
  HolderOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: 'normal' | 'urgent' | 'critical';
  read_by: string[];
  created_at: string;
}

interface MessageRow {
  id: string;
  recipient_ids: string[];
  read_by: string[];
}

interface TaskRow {
  id: string;
}

const EXEC_NOTIFICATION_ROLES = new Set([
  'CRAVEN_EXECUTIVE',
  'CRAVEN_CEO',
  'CRAVEN_CFO',
  'CRAVEN_COO',
  'CRAVEN_CTO',
  'CRAVEN_CXO',
]);

const priorityColor = (priority: Announcement['priority']) => {
  if (priority === 'critical') return 'red';
  if (priority === 'urgent') return 'orange';
  return 'default';
};

const POSITION_STORAGE_KEY = 'craven-exec-global-notifications-position';

type PanelPosition = { left: number; top: number };

function readStoredPosition(): PanelPosition | null {
  try {
    const raw = localStorage.getItem(POSITION_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PanelPosition;
    if (typeof p.left === 'number' && typeof p.top === 'number' && Number.isFinite(p.left) && Number.isFinite(p.top)) {
      return p;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function defaultPanelPosition(): PanelPosition {
  if (typeof window === 'undefined') return { left: 20, top: 70 };
  const panelWidth = Math.min(430, window.innerWidth - 40);
  return { left: Math.max(8, window.innerWidth - panelWidth - 20), top: 70 };
}

function clampPanelPosition(pos: PanelPosition, containerWidth: number, containerHeight: number): PanelPosition {
  const margin = 8;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 800;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 600;
  const w = Math.min(containerWidth, vw - margin * 2);
  const h = containerHeight;
  return {
    left: Math.min(Math.max(margin, pos.left), Math.max(margin, vw - w - margin)),
    top: Math.min(Math.max(margin, pos.top), Math.max(margin, vh - h - margin)),
  };
}

const ExecutiveGlobalNotifications: React.FC = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [isExecutive, setIsExecutive] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState<Announcement[]>([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLSpanElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
  } | null>(null);
  const [position, setPosition] = useState<PanelPosition>(() => readStoredPosition() ?? defaultPanelPosition());
  const [dragging, setDragging] = useState(false);

  const visibleAnnouncements = useMemo(
    () => unreadAnnouncements.filter((a) => !dismissedAnnouncements.includes(a.id)).slice(0, 2),
    [dismissedAnnouncements, unreadAnnouncements],
  );

  const markAnnouncementAsRead = useCallback(async (announcement: Announcement) => {
    if (!userId || announcement.read_by.includes(userId)) return;
    const { error } = await supabase
      .from('internal_announcements')
      .update({ read_by: [...announcement.read_by, userId] })
      .eq('id', announcement.id);
    if (error) return;
    setUnreadAnnouncements((prev) => prev.filter((a) => a.id !== announcement.id));
  }, [userId]);

  const fetchExecutiveNotificationState = useCallback(async (currentUserId: string) => {
    const [messagesRes, tasksRes, announcementsRes] = await Promise.all([
      supabase
        .from('internal_messages')
        .select('id, recipient_ids, read_by')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('internal_tasks')
        .select('id')
        .eq('assigned_to', currentUserId)
        .neq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('internal_announcements')
        .select('id, title, body, priority, read_by, created_at')
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const unreadMessages = ((messagesRes.data || []) as MessageRow[]).filter(
      (m) => (m.recipient_ids || []).includes(currentUserId) && !(m.read_by || []).includes(currentUserId),
    );
    const openTasks = (tasksRes.data || []) as TaskRow[];
    const unreadAnns = ((announcementsRes.data || []) as Announcement[]).filter(
      (a) => !(a.read_by || []).includes(currentUserId),
    );

    setMessageCount(unreadMessages.length);
    setTaskCount(openTasks.length);
    setUnreadAnnouncements(unreadAnns);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let channelRef: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      setUserId(user.id);

      const [rolesRes, execRes] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', user.id),
        supabase.from('exec_users').select('user_id').eq('user_id', user.id).maybeSingle(),
      ]);

      const roles = (rolesRes.data || []).map((r: any) => r.role);
      const hasExecRole = roles.some((role: string) => EXEC_NOTIFICATION_ROLES.has(role));
      const hasExecRow = !!execRes.data;
      const execAccess = hasExecRole || hasExecRow;
      if (cancelled) return;
      setIsExecutive(execAccess);

      if (!execAccess) return;
      await fetchExecutiveNotificationState(user.id);
      if (cancelled) return;

      channelRef = supabase
        .channel(`company-exec-global-notifications-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'internal_messages' }, () => {
          fetchExecutiveNotificationState(user.id);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'internal_announcements' }, () => {
          fetchExecutiveNotificationState(user.id);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'internal_tasks' }, () => {
          fetchExecutiveNotificationState(user.id);
        })
        .subscribe();
    };
    init();
    return () => {
      cancelled = true;
      if (channelRef) {
        supabase.removeChannel(channelRef);
      }
    };
  }, [fetchExecutiveNotificationState]);

  const reclampPosition = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPosition((prev) => {
      const next = clampPanelPosition(prev, rect.width, rect.height);
      if (next.left !== prev.left || next.top !== prev.top) {
        try {
          localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    window.addEventListener('resize', reclampPosition);
    return () => window.removeEventListener('resize', reclampPosition);
  }, [reclampPosition]);

  const onDragHandlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originLeft: position.left,
      originTop: position.top,
    };
    dragHandleRef.current?.setPointerCapture(e.pointerId);
  };

  const onDragHandlePointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    const el = containerRef.current;
    const w = el?.offsetWidth ?? Math.min(430, typeof window !== 'undefined' ? window.innerWidth - 40 : 430);
    const h = el?.offsetHeight ?? 120;
    setPosition(clampPanelPosition({ left: d.originLeft + dx, top: d.originTop + dy }, w, h));
  };

  const endDrag = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    try {
      dragHandleRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    dragRef.current = null;
    setDragging(false);
    setPosition((prev) => {
      const el = containerRef.current;
      const w = el?.offsetWidth ?? Math.min(430, window.innerWidth - 40);
      const h = el?.offsetHeight ?? 120;
      const next = clampPanelPosition(prev, w, h);
      try {
        localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  if (!isExecutive || !userId) return null;

  const totalCount = messageCount + taskCount + unreadAnnouncements.length;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: position.left,
        top: position.top,
        zIndex: 1200,
        width: 'min(430px, calc(100vw - 40px))',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <Card size="small" style={{ border: '1px solid #e5e7eb', boxShadow: '0 6px 18px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
            <span
              ref={dragHandleRef}
              role="button"
              tabIndex={0}
              title="Drag to move"
              aria-label="Move notifications panel"
              style={{
                cursor: dragging ? 'grabbing' : 'grab',
                touchAction: 'none',
                userSelect: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                color: '#9ca3af',
                flexShrink: 0,
              }}
              onPointerDown={onDragHandlePointerDown}
              onPointerMove={onDragHandlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <HolderOutlined style={{ fontSize: 14, pointerEvents: 'none' }} />
            </span>
            <Badge count={totalCount} size="small" offset={[3, -2]}>
              <BellOutlined style={{ color: '#FF6B35', fontSize: 16 }} />
            </Badge>
            <div style={{ fontSize: 12, color: '#374151' }}>
              <span style={{ marginRight: 8 }}><MessageOutlined /> {messageCount} messages</span>
              <span style={{ marginRight: 8 }}><NotificationOutlined /> {unreadAnnouncements.length} announcements</span>
              <span><FileDoneOutlined /> {taskCount} tasks</span>
            </div>
          </div>
          <Tooltip title="Open Internal Communications">
            <Button
              size="small"
              type="primary"
              onClick={() => navigate('/hub/internal-comms')}
              style={{ background: '#FF6B35', borderColor: '#FF6B35' }}
            >
              Open
            </Button>
          </Tooltip>
        </div>
      </Card>

      {visibleAnnouncements.map((announcement) => (
        <Card
          key={announcement.id}
          size="small"
          style={{
            borderLeft: `4px solid ${announcement.priority === 'critical' ? '#ef4444' : announcement.priority === 'urgent' ? '#f59e0b' : '#d1d5db'}`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                <NotificationOutlined style={{ color: '#FF6B35' }} />
                <strong style={{ fontSize: 13 }}>{announcement.title}</strong>
                <Tag color={priorityColor(announcement.priority)} style={{ marginInlineEnd: 0 }}>
                  {announcement.priority}
                </Tag>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#4b5563',
                  lineHeight: 1.5,
                  maxHeight: 56,
                  overflow: 'hidden',
                  marginBottom: 8,
                }}
              >
                {announcement.body}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button size="small" icon={<CheckOutlined />} onClick={() => markAnnouncementAsRead(announcement)}>
                  Mark read
                </Button>
                <Button
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => setDismissedAnnouncements((prev) => [...prev, announcement.id])}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default ExecutiveGlobalNotifications;

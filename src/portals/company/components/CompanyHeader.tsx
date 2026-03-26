import React from 'react';
import { Badge, Tooltip } from 'antd';
import { Burger, Button, Group } from '@mantine/core';
import { IconBell, IconHome } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface CompanyHeaderProps {
  opened?: boolean;
  onToggle?: () => void;
  portalName?: string;
  userEmail?: string;
}

export const CompanyHeader: React.FC<CompanyHeaderProps> = ({
  opened = false,
  onToggle,
  portalName = 'Company Portal',
  userEmail = '',
}) => {
  const navigate = useNavigate();
  const [isExecutive, setIsExecutive] = React.useState(false);
  const [notificationCount, setNotificationCount] = React.useState(0);
  const initializedRef = React.useRef(false);
  const lastCountRef = React.useRef(0);

  const playNotificationSound = React.useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      const now = ctx.currentTime;
      playTone(880, now, 0.12);
      playTone(1320, now + 0.1, 0.16);
    } catch {
      // Browser blocked autoplay audio or context unavailable.
    }
  }, []);

  const refreshNotifications = React.useCallback(async (currentUserId: string) => {
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
        .limit(200),
      supabase
        .from('internal_announcements')
        .select('id, read_by')
        .order('created_at', { ascending: false })
        .limit(30),
    ]);

    const unreadMessages = (messagesRes.data || []).filter(
      (m: any) => (m.recipient_ids || []).includes(currentUserId) && !(m.read_by || []).includes(currentUserId),
    ).length;
    const openTasks = (tasksRes.data || []).length;
    const unreadAnnouncements = (announcementsRes.data || []).filter(
      (a: any) => !(a.read_by || []).includes(currentUserId),
    ).length;

    const nextCount = unreadMessages + openTasks + unreadAnnouncements;
    setNotificationCount(nextCount);

    if (initializedRef.current && nextCount > lastCountRef.current) {
      playNotificationSound();
    }
    initializedRef.current = true;
    lastCountRef.current = nextCount;
  }, [playNotificationSound]);

  React.useEffect(() => {
    let cancelled = false;
    let channelRef: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const [rolesRes, execRes] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', user.id),
        supabase.from('exec_users').select('user_id').eq('user_id', user.id).maybeSingle(),
      ]);
      if (cancelled) return;

      const execRoles = new Set([
        'CRAVEN_EXECUTIVE',
        'CRAVEN_CEO',
        'CRAVEN_CFO',
        'CRAVEN_COO',
        'CRAVEN_CTO',
        'CRAVEN_CXO',
      ]);
      const hasRole = (rolesRes.data || []).some((r: any) => execRoles.has(r.role));
      const allowed = hasRole || !!execRes.data;
      setIsExecutive(allowed);
      if (!allowed) return;

      await refreshNotifications(user.id);
      if (cancelled) return;

      channelRef = supabase
        .channel(`company-header-notifications-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'internal_messages' }, () => {
          refreshNotifications(user.id);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'internal_announcements' }, () => {
          refreshNotifications(user.id);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'internal_tasks' }, () => {
          refreshNotifications(user.id);
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
  }, [refreshNotifications]);

  const handleBackToHub = () => {
    navigate('/hub');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/hub');
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        padding: '0 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #e5e7eb',
        height: 60,
        minHeight: 60,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          minWidth: 0,
          flex: '1 1 auto',
        }}
      >
        {onToggle && (
          <Burger
            opened={opened}
            onClick={onToggle}
            hiddenFrom="sm"
            size="sm"
            style={{ marginRight: 12 }}
          />
        )}
        <div
          style={{
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
            fontSize: 20,
            fontWeight: 700,
            color: '#FF6B35',
            marginRight: 16,
            whiteSpace: 'nowrap',
          }}
        >
          Crave'n
        </div>
        <div
          style={{
            borderLeft: '1px solid #e5e7eb',
            height: 24,
            marginRight: 16,
          }}
        />
        <div
          style={{
            fontSize: 14,
            color: '#6b7280',
            marginRight: 16,
            whiteSpace: 'nowrap',
          }}
        >
          {portalName}
        </div>
        <div
          style={{
            borderLeft: '1px solid #e5e7eb',
            height: 24,
            marginRight: 16,
          }}
        />
        <div
          style={{
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#1f2937',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            }}
          >
            {userEmail.split('@')[0] || 'Corporate User'}
          </div>
          <div
            style={{
              fontSize: 11,
              color: '#6b7280',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            }}
          >
            Corporate HQ
          </div>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginLeft: 16,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: '#FF6B35',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {userEmail.charAt(0).toUpperCase() || 'C'}
        </div>
        <Button
          onClick={() => navigate('/hub/internal-comms')}
          variant="light"
          style={{
            color: '#FF6B35',
            height: 32,
            minWidth: 36,
            padding: '0 10px',
            borderRadius: 4,
            display: isExecutive ? 'inline-flex' : 'none',
          }}
        >
          <Tooltip title="Executive notifications">
            <Badge count={notificationCount} size="small" offset={[0, 2]}>
              <IconBell size={16} />
            </Badge>
          </Tooltip>
        </Button>
        <Button
          onClick={handleBackToHub}
          leftSection={<IconHome size={14} />}
          variant="light"
          style={{
            color: '#FF6B35',
            height: 32,
            fontSize: 12,
            padding: '0 14px',
            borderRadius: 4,
          }}
        >
          Back to Hub
        </Button>
        <Button
          onClick={handleSignOut}
          variant="outline"
          style={{
            borderColor: '#d1d5db',
            color: '#374151',
            height: 32,
            fontSize: 12,
            padding: '0 14px',
            borderRadius: 4,
            background: '#ffffff',
          }}
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
};


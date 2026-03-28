// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  Title,
  Text,
  Group,
  Badge,
  Stack,
  SimpleGrid,
  Button,
  Modal,
  TextInput,
  Textarea,
  Select,
  Switch,
  ActionIcon,
  Divider,
  ScrollArea,
  MultiSelect,
  NumberInput,
  FileInput,
  Checkbox,
} from '@mantine/core';
import { DatePickerInput, DateTimePicker } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import {
  IconChevronLeft,
  IconChevronRight,
  IconEdit,
  IconTrash,
  IconPlus,
  IconPaperclip,
  IconDownload,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { supabase } from '@/integrations/supabase/client';
import { expandMonthInstances, instanceTouchesDay, type RecurrenceJson } from '@/utils/executiveCalendarRecurrence';

const DAYS_IN_WEEK = 7;
const CALENDAR_BUCKET = 'executive-calendar-files';

/** Exited executives — must not appear in calendar invite picker (see AboutUs.tsx same rule). */
const EXCLUDED_EXEC_INVITE_USER_IDS = new Set<string>([
  '76e5acef-e7c0-4b26-a9e1-52e25c3e7ff3', // Nathan Curry
]);
const EXCLUDED_EXEC_INVITE_EMAILS = new Set<string>(['natecurry.cto@cravenusa.com']);

/** When two exec_users rows share the same display name (legacy duplicate accounts), keep this email's user_id. */
const CANONICAL_EXEC_EMAIL_BY_NORMALIZED_NAME: Record<string, string> = {
  'torrance stroman': 'tstroman.ceo@cravenusa.com',
};

function normalizeExecDisplayName(name: string | null | undefined): string {
  return (name || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export interface CalendarRenewalItem {
  id: string;
  name: string;
  partnerName: string;
  type: 'document' | 'partnership';
  expiresAt: Date;
}

export interface ExecutiveCalendarProps {
  showRenewalLayer?: boolean;
  renewalItems?: CalendarRenewalItem[];
}

type InviteRow = {
  id: string;
  event_id: string;
  user_id: string;
  response: string;
};

type AttachmentRow = {
  id: string;
  event_id: string;
  storage_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string;
};

type DbEvent = {
  id: string;
  created_by: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  location: string | null;
  event_type: string;
  /** private = organizer + invitees; executives = all exec_users (apply migration 20260328210000). */
  visibility?: 'private' | 'executives' | null;
  recurrence?: RecurrenceJson | null;
  invites?: InviteRow[];
  attachments?: AttachmentRow[];
};

const EVENT_COLORS: Record<string, string> = {
  meeting: 'blue',
  event: 'green',
  focus: 'violet',
  reminder: 'gray',
};

const WEEKDAY_OPTS = [
  { value: '0', label: 'Sun' },
  { value: '1', label: 'Mon' },
  { value: '2', label: 'Tue' },
  { value: '3', label: 'Wed' },
  { value: '4', label: 'Thu' },
  { value: '5', label: 'Fri' },
  { value: '6', label: 'Sat' },
];

const ExecutiveCalendar: React.FC<ExecutiveCalendarProps> = ({
  showRenewalLayer = false,
  renewalItems: renewalItemsProp,
}) => {
  const renewalItems = renewalItemsProp ?? [];
  const [rawEvents, setRawEvents] = useState<DbEvent[]>([]);
  const [nameByUser, setNameByUser] = useState<Record<string, string>>({});
  const [execOptions, setExecOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [dayModalOpen, { open: openDayModal, close: closeDayModal }] = useDisclosure(false);
  const [formOpen, { open: openForm, close: closeForm }] = useDisclosure(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editing, setEditing] = useState<DbEvent | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [eventType, setEventType] = useState<string>('meeting');
  const [eventVisibility, setEventVisibility] = useState<'private' | 'executives'>('private');
  const [allDay, setAllDay] = useState(false);
  const [startVal, setStartVal] = useState<Date | null>(new Date());
  const [endVal, setEndVal] = useState<Date | null>(new Date());
  const [allDayDate, setAllDayDate] = useState<Date | null>(new Date());

  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatFreq, setRepeatFreq] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [repeatInterval, setRepeatInterval] = useState(1);
  const [repeatUntil, setRepeatUntil] = useState<Date | null>(null);
  const [repeatWeekdays, setRepeatWeekdays] = useState<string[]>([]);

  const [invitedUserIds, setInvitedUserIds] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<AttachmentRow[]>([]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const monthInstances = useMemo(
    () => expandMonthInstances(rawEvents, year, month),
    [rawEvents, year, month],
  );

  const eventById = useMemo(() => {
    const m: Record<string, DbEvent> = {};
    rawEvents.forEach((e) => {
      m[e.id] = e;
    });
    return m;
  }, [rawEvents]);

  const loadExecDirectory = useCallback(async () => {
    const { data: execRowsRaw } = await supabase
      .from('exec_users')
      .select('user_id, title, role, officer_status')
      .not('user_id', 'is', null);

    const execRows = (execRowsRaw || []).filter((r: any) => {
      const s = r.officer_status;
      return s !== 'resigned' && s !== 'removed';
    });

    const uids = [...new Set(execRows.map((r: any) => r.user_id).filter(Boolean))];
    if (!uids.length) {
      setExecOptions([]);
      return;
    }

    const { data: profiles } = await supabase.from('user_profiles').select('user_id, full_name, email').in('user_id', uids);

    const profileByUid: Record<string, { user_id: string; full_name?: string; email?: string }> = {};
    (profiles || []).forEach((p: any) => {
      profileByUid[p.user_id] = p;
    });

    type Cand = { uid: string; label: string; normName: string; email: string };
    const candidates: Cand[] = [];

    for (const uid of uids) {
      if (EXCLUDED_EXEC_INVITE_USER_IDS.has(uid)) continue;
      const p = profileByUid[uid];
      if (!p) continue;
      const email = (p.email || '').toLowerCase();
      if (EXCLUDED_EXEC_INVITE_EMAILS.has(email)) continue;

      const ex = execRows.find((e: any) => e.user_id === uid);
      const role = ex?.title || ex?.role || '';
      const display = p.full_name || p.email || 'Executive';
      const normName = normalizeExecDisplayName(p.full_name) || normalizeExecDisplayName(p.email) || uid;
      const label = `${display}${role ? ` — ${role}` : ''}`;
      candidates.push({ uid, label, normName, email });
    }

    const byNorm = new Map<string, Cand[]>();
    for (const c of candidates) {
      const key = c.normName;
      if (!byNorm.has(key)) byNorm.set(key, []);
      byNorm.get(key)!.push(c);
    }

    const merged: { value: string; label: string }[] = [];
    for (const [, group] of byNorm) {
      if (group.length === 1) {
        merged.push({ value: group[0].uid, label: group[0].label });
        continue;
      }
      const canonEmail = CANONICAL_EXEC_EMAIL_BY_NORMALIZED_NAME[group[0].normName];
      let pick = group[0];
      if (canonEmail) {
        const match = group.find((g) => g.email === canonEmail);
        if (match) pick = match;
      }
      const p = profileByUid[pick.uid];
      const ex = execRows.find((e: any) => e.user_id === pick.uid);
      const role = ex?.title || ex?.role || '';
      const display = p?.full_name || p?.email || 'Executive';
      merged.push({
        value: pick.uid,
        label: `${display}${role ? ` — ${role}` : ''}`,
      });
    }

    merged.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
    setExecOptions(merged);
  }, []);

  useEffect(() => {
    loadExecDirectory();
  }, [loadExecDirectory]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
      const ms = monthStart.toISOString();
      const me = monthEnd.toISOString();

      // Base query: only needs migration 20260327220000 (executive_calendar_events).
      const { data: overlap, error: overlapErr } = await supabase
        .from('executive_calendar_events')
        .select('*')
        .lte('starts_at', me)
        .gte('ends_at', ms)
        .order('starts_at', { ascending: true });

      if (overlapErr) throw overlapErr;

      let recurring: any[] = [];
      const { data: recData, error: recErr } = await supabase
        .from('executive_calendar_events')
        .select('*')
        .not('recurrence', 'is', null)
        .order('starts_at', { ascending: true });

      if (recErr) {
        console.warn('[ExecutiveCalendar] Recurring series query skipped (add migration 20260328200000 for recurrence):', recErr.message);
      } else {
        recurring = recData || [];
      }

      const merged = new Map<string, any>();
      [...(overlap || []), ...recurring].forEach((row) => {
        if (!merged.has(row.id)) merged.set(row.id, row);
      });

      let rows = [...merged.values()].filter((row) => {
        if (!row.recurrence) return true;
        const until = (row.recurrence as RecurrenceJson)?.until;
        if (!until) return true;
        return new Date(`${until}T23:59:59`) >= monthStart;
      });

      const eventIds = rows.map((r) => r.id);
      const invitesByEvent: Record<string, InviteRow[]> = {};
      const attachmentsByEvent: Record<string, AttachmentRow[]> = {};

      if (eventIds.length) {
        const { data: inv, error: invErr } = await supabase
          .from('executive_calendar_event_invites')
          .select('*')
          .in('event_id', eventIds);
        if (invErr) {
          console.warn('[ExecutiveCalendar] Invites not loaded (apply migration 20260328200000):', invErr.message);
        } else {
          (inv || []).forEach((i: any) => {
            if (!invitesByEvent[i.event_id]) invitesByEvent[i.event_id] = [];
            invitesByEvent[i.event_id].push(i);
          });
        }

        const { data: att, error: attErr } = await supabase
          .from('executive_calendar_event_attachments')
          .select('*')
          .in('event_id', eventIds);
        if (attErr) {
          console.warn('[ExecutiveCalendar] Attachments not loaded (apply migration 20260328200000):', attErr.message);
        } else {
          (att || []).forEach((a: any) => {
            if (!attachmentsByEvent[a.event_id]) attachmentsByEvent[a.event_id] = [];
            attachmentsByEvent[a.event_id].push(a);
          });
        }
      }

      rows = rows.map((row) => ({
        ...row,
        invites: invitesByEvent[row.id] || [],
        attachments: attachmentsByEvent[row.id] || [],
      })) as DbEvent[];

      setRawEvents(rows);

      const ids = [...new Set(rows.flatMap((r) => [r.created_by, ...(r.invites || []).map((i) => i.user_id)]))];
      if (ids.length) {
        const { data: profiles } = await supabase.from('user_profiles').select('user_id, full_name').in('user_id', ids);
        const map: Record<string, string> = {};
        (profiles || []).forEach((p: any) => {
          if (p.user_id && p.full_name) map[p.user_id] = p.full_name;
        });
        setNameByUser(map);
      } else {
        setNameByUser({});
      }
    } catch (e: any) {
      console.error(e);
      notifications.show({
        title: 'Calendar',
        message: e?.message || 'Could not load executive calendar',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const ch = supabase
      .channel('executive-calendar-full')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'executive_calendar_events' }, () => loadEvents())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'executive_calendar_event_invites' }, () => loadEvents())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'executive_calendar_event_attachments' }, () => loadEvents())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [loadEvents]);

  const resetForm = () => {
    setEditing(null);
    setTitle('');
    setDescription('');
    setLocation('');
    setEventType('meeting');
    setAllDay(false);
    const now = new Date();
    setStartVal(now);
    setEndVal(new Date(now.getTime() + 60 * 60 * 1000));
    setAllDayDate(now);
    setRepeatEnabled(false);
    setRepeatFreq('weekly');
    setRepeatInterval(1);
    setRepeatUntil(null);
    setRepeatWeekdays([]);
    setInvitedUserIds([]);
    setPendingFiles([]);
    setExistingAttachments([]);
    setEventVisibility('private');
  };

  const openCreateForDate = (date: Date) => {
    const base = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0, 0, 0);
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 10, 0, 0, 0);
    setSelectedDate(date);
    setEditing(null);
    setTitle('');
    setDescription('');
    setLocation('');
    setEventType('meeting');
    setAllDay(false);
    setStartVal(base);
    setEndVal(end);
    setAllDayDate(date);
    setRepeatEnabled(false);
    setRepeatFreq('weekly');
    setRepeatInterval(1);
    setRepeatUntil(null);
    setRepeatWeekdays([String(date.getDay())]);
    setInvitedUserIds([]);
    setPendingFiles([]);
    setExistingAttachments([]);
    setEventVisibility('private');
    openForm();
    closeDayModal();
  };

  const openEdit = (base: DbEvent) => {
    setEditing(base);
    setTitle(base.title);
    setDescription(base.description || '');
    setLocation(base.location || '');
    setEventType(base.event_type || 'meeting');
    setAllDay(!!base.all_day);
    setStartVal(new Date(base.starts_at));
    setEndVal(new Date(base.ends_at));
    setAllDayDate(new Date(base.starts_at));
    const r = base.recurrence;
    if (r && r.frequency && r.frequency !== 'none') {
      setRepeatEnabled(true);
      setRepeatFreq(r.frequency);
      setRepeatInterval(r.interval || 1);
      setRepeatUntil(r.until ? new Date(r.until + 'T12:00:00') : null);
      setRepeatWeekdays((r.weekdays || []).map(String));
    } else {
      setRepeatEnabled(false);
      setRepeatFreq('weekly');
      setRepeatInterval(1);
      setRepeatUntil(null);
      setRepeatWeekdays([]);
    }
    setInvitedUserIds((base.invites || []).map((i) => i.user_id));
    setPendingFiles([]);
    setExistingAttachments(base.attachments || []);
    setEventVisibility(base.visibility === 'private' ? 'private' : 'executives');
    openForm();
    closeDayModal();
  };

  const buildRecurrencePayload = (): RecurrenceJson | null => {
    if (!repeatEnabled) return null;
    const r: RecurrenceJson = {
      frequency: repeatFreq,
      interval: Math.max(1, repeatInterval || 1),
    };
    if (repeatUntil) {
      const y = repeatUntil.getFullYear();
      const m = String(repeatUntil.getMonth() + 1).padStart(2, '0');
      const d = String(repeatUntil.getDate()).padStart(2, '0');
      r.until = `${y}-${m}-${d}`;
    }
    if (repeatFreq === 'weekly') {
      const wds = repeatWeekdays?.length ? repeatWeekdays.map(Number) : [startVal?.getDay() ?? 0];
      r.weekdays = wds;
    }
    return r;
  };

  const syncInvites = async (eventId: string) => {
    await supabase.from('executive_calendar_event_invites').delete().eq('event_id', eventId);
    const unique = [...new Set(invitedUserIds.filter(Boolean))];
    if (unique.length) {
      const { error } = await supabase.from('executive_calendar_event_invites').insert(
        unique.map((user_id) => ({
          event_id: eventId,
          user_id,
          response: 'pending',
        })),
      );
      if (error) throw error;
    }
  };

  const uploadPendingFiles = async (eventId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const files = pendingFiles || [];
    if (!user || !files.length) return;
    for (const file of files) {
      const safe = file.name.replace(/[^\w.\-]+/g, '_');
      const path = `${eventId}/${crypto.randomUUID()}_${safe}`;
      const { error: upErr } = await supabase.storage.from(CALENDAR_BUCKET).upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      });
      if (upErr) throw upErr;
      const { error: rowErr } = await supabase.from('executive_calendar_event_attachments').insert({
        event_id: eventId,
        storage_path: path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || null,
        uploaded_by: user.id,
      });
      if (rowErr) throw rowErr;
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      notifications.show({ title: 'Title required', message: 'Add a title for this event.', color: 'orange' });
      return;
    }

    let starts: Date;
    let ends: Date;
    if (allDay && allDayDate) {
      starts = new Date(allDayDate.getFullYear(), allDayDate.getMonth(), allDayDate.getDate(), 0, 0, 0, 0);
      ends = new Date(allDayDate.getFullYear(), allDayDate.getMonth(), allDayDate.getDate(), 23, 59, 59, 999);
    } else if (startVal && endVal) {
      starts = startVal;
      ends = endVal;
    } else {
      notifications.show({ title: 'Date required', message: 'Choose start and end.', color: 'orange' });
      return;
    }
    if (ends < starts) {
      notifications.show({ title: 'Invalid range', message: 'End must be after start.', color: 'red' });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      notifications.show({ title: 'Sign in required', color: 'red' });
      return;
    }

    const recurrence = buildRecurrencePayload();

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        all_day: allDay,
        event_type: eventType,
        visibility: eventVisibility,
      };
      // Omit when null so DBs without a recurrence column (base migration only) still work.
      if (recurrence !== null) {
        payload.recurrence = recurrence;
      }

      let eventId = editing?.id;

      if (editing) {
        const { error } = await supabase.from('executive_calendar_events').update(payload).eq('id', editing.id);
        if (error) throw error;
        eventId = editing.id;
        try {
          await syncInvites(eventId);
        } catch (invErr: any) {
          console.warn('[ExecutiveCalendar] Invites sync skipped:', invErr?.message);
        }
        try {
          await uploadPendingFiles(eventId);
        } catch (attErr: any) {
          console.warn('[ExecutiveCalendar] Attachment upload skipped:', attErr?.message);
        }
        notifications.show({ title: 'Event updated', color: 'green' });
      } else {
        const { data: inserted, error } = await supabase
          .from('executive_calendar_events')
          .insert({ ...payload, created_by: user.id })
          .select('id')
          .single();
        if (error) throw error;
        eventId = inserted.id;
        try {
          await syncInvites(eventId);
        } catch (invErr: any) {
          console.warn('[ExecutiveCalendar] Invites sync skipped:', invErr?.message);
        }
        try {
          await uploadPendingFiles(eventId);
        } catch (attErr: any) {
          console.warn('[ExecutiveCalendar] Attachment upload skipped:', attErr?.message);
        }
        notifications.show({ title: 'Event scheduled', color: 'green' });
      }
      closeForm();
      resetForm();
      await loadEvents();
    } catch (e: any) {
      console.error(e);
      notifications.show({
        title: 'Save failed',
        message: e?.message || 'Could not save event',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ev: DbEvent) => {
    if (!currentUserId || ev.created_by !== currentUserId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('executive_calendar_events').delete().eq('id', ev.id);
      if (error) throw error;
      notifications.show({ title: 'Event removed', color: 'green' });
      closeForm();
      resetForm();
      await loadEvents();
    } catch (e: any) {
      notifications.show({ title: 'Delete failed', message: e?.message, color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const removeAttachment = async (att: AttachmentRow) => {
    if (!editing || currentUserId !== editing.created_by) return;
    setSaving(true);
    try {
      await supabase.storage.from(CALENDAR_BUCKET).remove([att.storage_path]);
      const { error } = await supabase.from('executive_calendar_event_attachments').delete().eq('id', att.id);
      if (error) throw error;
      setExistingAttachments((prev) => prev.filter((a) => a.id !== att.id));
      notifications.show({ title: 'Attachment removed', color: 'green' });
    } catch (e: any) {
      notifications.show({ title: 'Remove failed', message: e?.message, color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const openAttachment = async (att: AttachmentRow) => {
    const { data, error } = await supabase.storage.from(CALENDAR_BUCKET).createSignedUrl(att.storage_path, 3600);
    if (error || !data?.signedUrl) {
      notifications.show({ title: 'Download failed', message: error?.message, color: 'red' });
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const setInviteResponse = async (eventId: string, response: string) => {
    if (!currentUserId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('executive_calendar_event_invites')
        .update({ response })
        .eq('event_id', eventId)
        .eq('user_id', currentUserId);
      if (error) throw error;
      notifications.show({ title: 'Response saved', color: 'green' });
      await loadEvents();
    } catch (e: any) {
      notifications.show({ title: 'Update failed', message: e?.message, color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);
  while (calendarDays.length % DAYS_IN_WEEK !== 0) calendarDays.push(null);

  const getRenewalsForDay = (day: number) => {
    if (!showRenewalLayer) return [];
    return renewalItems.filter((item) => {
      const t = item.expiresAt;
      return t.getFullYear() === year && t.getMonth() === month && t.getDate() === day;
    });
  };

  const getInstancesForDay = (day: number) =>
    monthInstances.filter((inst) => instanceTouchesDay(inst, year, month, day));

  const getDaysUntil = (date: Date) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getUrgencyColor = (date: Date) => {
    const days = getDaysUntil(date);
    if (days < 0) return 'dark';
    if (days <= 7) return 'red';
    if (days <= 30) return 'orange';
    return 'green';
  };

  const openDay = (day: number) => {
    setSelectedDate(new Date(year, month, day));
    openDayModal();
  };

  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  const dayModalRenewals =
    selectedDate && showRenewalLayer
      ? renewalItems.filter((i) => {
          const t = i.expiresAt;
          return (
            t.getFullYear() === selectedDate.getFullYear() &&
            t.getMonth() === selectedDate.getMonth() &&
            t.getDate() === selectedDate.getDate()
          );
        })
      : [];

  const dayModalInstances = selectedDate
    ? monthInstances.filter((inst) =>
        instanceTouchesDay(inst, selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()),
      )
    : [];

  const headerSubtitle = showRenewalLayer
    ? 'Partner renewals plus shared schedule with invites, attachments, and recurring meetings.'
    : 'Shared executive schedule — invites, RSVPs, attachments, and recurring events. Edit or delete only events you created.';

  return (
    <Stack gap="md">
      <div>
        <Title order={4}>Schedule</Title>
        <Text size="sm" c="dimmed">
          {headerSubtitle}
        </Text>
      </div>

      <Card shadow="sm" radius="md" padding="lg" withBorder>
        <Group justify="space-between" mb="md" wrap="wrap">
          <Button variant="subtle" color="gray" onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}>
            <IconChevronLeft size={18} />
          </Button>
          <Title order={4}>{monthName}</Title>
          <Group gap="xs">
            <Button
              leftSection={<IconPlus size={16} />}
              color="orange"
              size="sm"
              onClick={() => {
                const t = new Date();
                setCurrentMonth(new Date(t.getFullYear(), t.getMonth(), 1));
                queueMicrotask(() => openCreateForDate(t));
              }}
            >
              New event
            </Button>
            <Button variant="subtle" color="gray" onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}>
              <IconChevronRight size={18} />
            </Button>
          </Group>
        </Group>

        {loading ? (
          <Text c="dimmed" size="sm">
            Loading events…
          </Text>
        ) : (
          <SimpleGrid cols={7} spacing={0}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <Text key={d} ta="center" fw={700} size="xs" c="dimmed" pb="xs">
                {d}
              </Text>
            ))}
            {calendarDays.map((day, idx) => {
              if (day === null) return <div key={idx} style={{ minHeight: 72 }} />;
              const renewals = getRenewalsForDay(day);
              const insts = getInstancesForDay(day);
              const isToday =
                new Date().getFullYear() === year && new Date().getMonth() === month && new Date().getDate() === day;
              const hasContent = renewals.length > 0 || insts.length > 0;
              return (
                <div
                  key={idx}
                  onClick={() => openDay(day)}
                  onKeyDown={(e) => e.key === 'Enter' && openDay(day)}
                  role="button"
                  tabIndex={0}
                  style={{
                    minHeight: 72,
                    padding: 4,
                    border: '1px solid #eee',
                    borderRadius: 4,
                    cursor: 'pointer',
                    backgroundColor: isToday ? '#fff4e6' : hasContent ? '#fafafa' : undefined,
                  }}
                >
                  <Text size="xs" fw={isToday ? 700 : 500} c={isToday ? 'orange' : undefined}>
                    {day}
                  </Text>
                  <Stack gap={2} mt={2}>
                    {[
                      ...renewals.map((r) => ({ kind: 'r' as const, r })),
                      ...insts.map((inst) => ({ kind: 'i' as const, inst })),
                    ]
                      .slice(0, 3)
                      .map((entry) =>
                        entry.kind === 'r' ? (
                          <Badge
                            key={`r-${entry.r.id}`}
                            size="xs"
                            color={getUrgencyColor(entry.r.expiresAt)}
                            variant="light"
                            fullWidth
                            style={{ overflow: 'hidden' }}
                          >
                            <Text size="xs" truncate>
                              {entry.r.partnerName}
                            </Text>
                          </Badge>
                        ) : (
                          <Badge
                            key={entry.inst.instanceKey}
                            size="xs"
                            color={EVENT_COLORS[eventById[entry.inst.eventId]?.event_type] || 'blue'}
                            variant="filled"
                            fullWidth
                            style={{ overflow: 'hidden' }}
                          >
                            <Text size="xs" truncate c="white">
                              {eventById[entry.inst.eventId]?.title || 'Event'}
                            </Text>
                          </Badge>
                        ),
                      )}
                  </Stack>
                  {renewals.length + insts.length > 3 && (
                    <Text size="xs" c="dimmed" ta="center" mt={2}>
                      +{renewals.length + insts.length - 3} more
                    </Text>
                  )}
                </div>
              );
            })}
          </SimpleGrid>
        )}
      </Card>

      <Modal
        opened={dayModalOpen}
        onClose={closeDayModal}
        title={
          selectedDate
            ? selectedDate.toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })
            : 'Day'
        }
        size="lg"
      >
        <Stack gap="sm">
          <Button leftSection={<IconPlus size={16} />} color="orange" onClick={() => selectedDate && openCreateForDate(selectedDate)}>
            Add event or meeting
          </Button>
          <Divider label="Renewals" labelPosition="center" />
          {showRenewalLayer && dayModalRenewals.length === 0 && (
            <Text size="sm" c="dimmed">
              No renewal deadlines on this date.
            </Text>
          )}
          {showRenewalLayer &&
            dayModalRenewals.map((item) => (
              <Card key={item.id} withBorder padding="sm" radius="md">
                <Group justify="space-between" wrap="nowrap">
                  <div style={{ minWidth: 0 }}>
                    <Text fw={600} size="sm" truncate>
                      {item.partnerName}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {item.name}
                    </Text>
                  </div>
                  <Badge color={getUrgencyColor(item.expiresAt)} size="sm">
                    {getDaysUntil(item.expiresAt) < 0 ? 'Expired' : `${getDaysUntil(item.expiresAt)}d`}
                  </Badge>
                </Group>
              </Card>
            ))}
          <Divider label="Schedule" labelPosition="center" />
          {dayModalInstances.length === 0 && <Text size="sm" c="dimmed">No scheduled items on this date.</Text>}
          <ScrollArea mah={380} type="auto">
            <Stack gap="xs">
              {dayModalInstances.map((inst) => {
                const ev = eventById[inst.eventId];
                if (!ev) return null;
                const myInvite = (ev.invites || []).find((i) => i.user_id === currentUserId);
                return (
                  <Card key={inst.instanceKey} withBorder padding="sm" radius="md">
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <div style={{ minWidth: 0 }}>
                        <Text fw={600} size="sm">
                          {ev.title}
                          {inst.isRecurringInstance ? (
                            <Badge ml={8} size="xs" variant="outline" color="gray">
                              Repeats
                            </Badge>
                          ) : null}
                          {ev.visibility === 'private' ? (
                            <Badge ml={8} size="xs" variant="outline" color="gray">
                              Private
                            </Badge>
                          ) : (
                            <Badge ml={8} size="xs" variant="outline" color="blue">
                              All executives
                            </Badge>
                          )}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {ev.all_day
                            ? 'All day'
                            : `${new Date(inst.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${new Date(inst.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                          {ev.location ? ` · ${ev.location}` : ''}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Organized by {nameByUser[ev.created_by] || 'Executive'}
                        </Text>
                        {(ev.invites || []).length > 0 && (
                          <Group gap={4} mt={6} wrap="wrap">
                            <Text size="xs" fw={600}>
                              Invited:
                            </Text>
                            {(ev.invites || []).map((inv) => (
                              <Badge key={inv.id} size="xs" variant="light" color={inv.response === 'accepted' ? 'green' : inv.response === 'declined' ? 'red' : 'gray'}>
                                {(nameByUser[inv.user_id] || 'Executive').split('—')[0].trim()} ({inv.response})
                              </Badge>
                            ))}
                          </Group>
                        )}
                        {myInvite && (
                          <Group gap="xs" mt={8}>
                            <Text size="xs">Your RSVP:</Text>
                            <Button.Group>
                              <Button size="xs" variant={myInvite.response === 'accepted' ? 'filled' : 'light'} color="green" loading={saving} onClick={() => setInviteResponse(ev.id, 'accepted')}>
                                Accept
                              </Button>
                              <Button size="xs" variant={myInvite.response === 'tentative' ? 'filled' : 'light'} color="orange" loading={saving} onClick={() => setInviteResponse(ev.id, 'tentative')}>
                                Maybe
                              </Button>
                              <Button size="xs" variant={myInvite.response === 'declined' ? 'filled' : 'light'} color="red" loading={saving} onClick={() => setInviteResponse(ev.id, 'declined')}>
                                Decline
                              </Button>
                            </Button.Group>
                          </Group>
                        )}
                        {(ev.attachments || []).length > 0 && (
                          <Stack gap={4} mt={8}>
                            <Text size="xs" fw={600}>
                              Attachments
                            </Text>
                            {(ev.attachments || []).map((att) => (
                              <Button
                                key={att.id}
                                size="xs"
                                variant="light"
                                leftSection={<IconDownload size={14} />}
                                justify="flex-start"
                                onClick={() => openAttachment(att)}
                              >
                                {att.file_name}
                              </Button>
                            ))}
                          </Stack>
                        )}
                      </div>
                      {currentUserId === ev.created_by && (
                        <Group gap={4}>
                          <ActionIcon variant="light" color="orange" onClick={() => openEdit(ev)}>
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon variant="light" color="red" onClick={() => handleDelete(ev)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      )}
                    </Group>
                  </Card>
                );
              })}
            </Stack>
          </ScrollArea>
        </Stack>
      </Modal>

      <Modal
        opened={formOpen}
        onClose={() => {
          closeForm();
          resetForm();
        }}
        title={editing ? 'Edit event' : 'New event or meeting'}
        size="lg"
      >
        <Stack gap="sm">
          <TextInput label="Title" required value={title} onChange={(e) => setTitle(e.currentTarget.value)} placeholder="e.g. Q2 partnership review" />
          <Select
            label="Type"
            data={[
              { value: 'meeting', label: 'Meeting' },
              { value: 'event', label: 'Event' },
              { value: 'focus', label: 'Focus / deep work' },
              { value: 'reminder', label: 'Reminder' },
            ]}
            value={eventType}
            onChange={(v) => setEventType(v || 'meeting')}
          />
          <Select
            label="Who can see this event?"
            description={
              eventVisibility === 'private'
                ? 'Only you and people you invite (default). Others will not see it on their calendar.'
                : 'Every executive with portal access sees this event (all-hands, milestones, etc.).'
            }
            data={[
              { value: 'private', label: 'Only me & invited executives' },
              { value: 'executives', label: 'All executives (organization-wide)' },
            ]}
            value={eventVisibility}
            onChange={(v) => setEventVisibility(v === 'executives' ? 'executives' : 'private')}
          />
          <Switch label="All day" checked={allDay} onChange={(e) => setAllDay(e.currentTarget.checked)} />
          {allDay ? (
            <DatePickerInput label="Date" value={allDayDate} onChange={setAllDayDate} />
          ) : (
            <>
              <DateTimePicker label="Starts" value={startVal} onChange={setStartVal} />
              <DateTimePicker label="Ends" value={endVal} onChange={setEndVal} />
            </>
          )}

          <Divider label="Repeat" labelPosition="center" />
          <Switch label="Repeating event" checked={repeatEnabled} onChange={(e) => setRepeatEnabled(e.currentTarget.checked)} />
          {repeatEnabled && (
            <Stack gap="xs">
              <Select
                label="Frequency"
                data={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                ]}
                value={repeatFreq}
                onChange={(v) => setRepeatFreq(v || 'weekly')}
              />
              <NumberInput label="Every N periods" min={1} value={repeatInterval} onChange={(v) => setRepeatInterval(typeof v === 'number' ? v : 1)} />
              {repeatFreq === 'weekly' && (
                <Checkbox.Group label="On weekdays" value={repeatWeekdays} onChange={setRepeatWeekdays}>
                  <Group gap="xs" mt={4}>
                    {WEEKDAY_OPTS.map((w) => (
                      <Checkbox key={w.value} value={w.value} label={w.label} />
                    ))}
                  </Group>
                </Checkbox.Group>
              )}
              <DatePickerInput label="Repeat until (optional)" value={repeatUntil} onChange={setRepeatUntil} clearable />
            </Stack>
          )}

          <Divider label="People" labelPosition="center" />
          <MultiSelect
            label="Invite executives"
            placeholder="Select people to notify (RSVP)"
            data={execOptions}
            value={invitedUserIds}
            onChange={setInvitedUserIds}
            searchable
            clearable
          />

          <TextInput label="Location" value={location} onChange={(e) => setLocation(e.currentTarget.value)} placeholder="Zoom, room, address…" />
          <Textarea label="Notes" value={description} onChange={(e) => setDescription(e.currentTarget.value)} minRows={3} />

          <Divider label="Attachments" labelPosition="center" />
          {existingAttachments.length > 0 && (
            <Stack gap={4}>
              {existingAttachments.map((att) => (
                <Group key={att.id} justify="space-between" wrap="nowrap">
                  <Text size="sm" truncate style={{ flex: 1 }}>
                    <IconPaperclip size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                    {att.file_name}
                  </Text>
                  {editing && currentUserId === editing.created_by && (
                    <Button size="xs" color="red" variant="light" onClick={() => removeAttachment(att)}>
                      Remove
                    </Button>
                  )}
                </Group>
              ))}
            </Stack>
          )}
          <FileInput
            label="Add files"
            placeholder="Upload documents (stored securely)"
            multiple
            value={pendingFiles ?? []}
            onChange={(f) => setPendingFiles(f ?? [])}
            clearable
          />

          <Group justify="flex-end">
            {editing && currentUserId === editing.created_by && (
              <Button color="red" variant="light" loading={saving} onClick={() => handleDelete(editing)}>
                Delete
              </Button>
            )}
            <Button variant="default" onClick={() => { closeForm(); resetForm(); }}>
              Cancel
            </Button>
            <Button color="orange" loading={saving} onClick={handleSave}>
              {editing ? 'Save' : 'Schedule'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default ExecutiveCalendar;

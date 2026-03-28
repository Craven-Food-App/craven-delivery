/**
 * Client-side expansion of recurring executive calendar events into month view.
 * recurrence JSON: { frequency: 'daily'|'weekly'|'monthly', interval: number, until?: 'YYYY-MM-DD', weekdays?: number[] } (0=Sun)
 */

export type RecurrenceJson = {
  frequency: 'daily' | 'weekly' | 'monthly' | 'none';
  interval: number;
  until?: string;
  /** 0=Sunday … 6=Saturday; for weekly repeats */
  weekdays?: number[];
};

export type DisplayCalendarInstance = {
  instanceKey: string;
  eventId: string;
  starts_at: string;
  ends_at: string;
  isRecurringInstance: boolean;
};

function stripTime(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function parseRecurrence(raw: unknown): RecurrenceJson | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as RecurrenceJson;
  if (!r.frequency || r.frequency === 'none') return null;
  return r;
}

function occursOnCalendarDay(
  anchorStart: Date,
  rule: RecurrenceJson,
  y: number,
  m: number,
  day: number,
): boolean {
  const d = new Date(y, m, day);
  const anchorDay = stripTime(anchorStart);
  const targetDay = stripTime(d);
  const until = rule.until
    ? stripTime(new Date(rule.until + 'T12:00:00'))
    : new Date(2099, 11, 31).getTime();

  if (targetDay < anchorDay || targetDay > until) return false;

  const interval = Math.max(1, rule.interval || 1);

  if (rule.frequency === 'daily') {
    const diffDays = Math.round((targetDay - anchorDay) / 86400000);
    return diffDays >= 0 && diffDays % interval === 0;
  }

  if (rule.frequency === 'weekly') {
    const wds =
      rule.weekdays && rule.weekdays.length > 0 ? rule.weekdays : [anchorStart.getDay()];
    if (!wds.includes(d.getDay())) return false;
    const diffDays = Math.round((targetDay - anchorDay) / 86400000);
    if (diffDays < 0) return false;
    if (diffDays % 7 !== 0) return false;
    const weekIndex = diffDays / 7;
    return weekIndex % interval === 0;
  }

  if (rule.frequency === 'monthly') {
    if (d.getDate() !== anchorStart.getDate()) return false;
    const monthsDiff =
      (d.getFullYear() - anchorStart.getFullYear()) * 12 + (d.getMonth() - anchorStart.getMonth());
    return monthsDiff >= 0 && monthsDiff % interval === 0;
  }

  return false;
}

/** Build occurrence times for a specific calendar day (preserves time-of-day / duration from anchor). */
export function buildOccurrenceForDay(
  eventId: string,
  startsAtIso: string,
  endsAtIso: string,
  recurrence: unknown,
  y: number,
  m: number,
  day: number,
): DisplayCalendarInstance | null {
  const anchorStart = new Date(startsAtIso);
  const anchorEnd = new Date(endsAtIso);
  const duration = anchorEnd.getTime() - anchorStart.getTime();
  const rule = parseRecurrence(recurrence);

  if (!rule) {
    const dayStart = new Date(y, m, day, 0, 0, 0, 0);
    const dayEnd = new Date(y, m, day, 23, 59, 59, 999);
    if (anchorStart <= dayEnd && anchorEnd >= dayStart) {
      const clipStart = anchorStart > dayStart ? anchorStart : dayStart;
      const clipEnd = anchorEnd < dayEnd ? anchorEnd : dayEnd;
      const dk = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return {
        instanceKey: `${eventId}::${dk}`,
        eventId,
        starts_at: clipStart.toISOString(),
        ends_at: clipEnd.toISOString(),
        isRecurringInstance: false,
      };
    }
    return null;
  }

  if (!occursOnCalendarDay(anchorStart, rule, y, m, day)) return null;

  const start = new Date(
    y,
    m,
    day,
    anchorStart.getHours(),
    anchorStart.getMinutes(),
    anchorStart.getSeconds(),
    anchorStart.getMilliseconds(),
  );
  const end = new Date(start.getTime() + duration);
  const dateKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return {
    instanceKey: `${eventId}::${dateKey}`,
    eventId,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    isRecurringInstance: true,
  };
}

export function instanceTouchesDay(
  inst: DisplayCalendarInstance,
  y: number,
  m: number,
  day: number,
): boolean {
  const start = new Date(inst.starts_at);
  const end = new Date(inst.ends_at);
  const dayStart = new Date(y, m, day, 0, 0, 0, 0);
  const dayEnd = new Date(y, m, day, 23, 59, 59, 999);
  return start <= dayEnd && end >= dayStart;
}

/** All display instances in a month (for agenda / day list). */
export function expandMonthInstances(
  rows: Array<{
    id: string;
    starts_at: string;
    ends_at: string;
    recurrence?: unknown;
  }>,
  year: number,
  month: number,
): DisplayCalendarInstance[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const out: DisplayCalendarInstance[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    for (let day = 1; day <= daysInMonth; day++) {
      const inst = buildOccurrenceForDay(row.id, row.starts_at, row.ends_at, row.recurrence, year, month, day);
      if (inst && !seen.has(inst.instanceKey)) {
        seen.add(inst.instanceKey);
        out.push(inst);
      }
    }
  }
  out.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  return out;
}

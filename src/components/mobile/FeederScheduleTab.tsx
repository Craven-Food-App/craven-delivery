/**
 * Crave'n Feeder App — Schedule Tab (Enterprise Compact White)
 * ─────────────────────────────────────────────────────────────
 * Drop-in replacement:  src/pages/Schedule.tsx
 *
 * Cursor instructions:
 *   1) Replace src/pages/Schedule.tsx with this file.
 *   2) Route / tab already points to <SchedulePage /> — no change needed.
 *   3) No icons, no emojis, no orange backgrounds.
 *   4) All layout is inline-style; no external CSS file required.
 *   5) Mock data lives in useMockShifts() — swap for your API call there.
 */

import React, { useEffect, useMemo, useState } from "react";

// ─── THEME ──────────────────────────────────────────────────────────────────
const C = {
  orange: "#E8622A",
  text: "#111827",
  muted: "#6B7280",
  border: "#E7E9EE",
  track: "#EEF1F6",
  bg: "#FFFFFF",
  bgMuted: "#FAFBFD",
} as const;

// ─── TYPES ──────────────────────────────────────────────────────────────────
type Demand = "Standard" | "High Demand" | "Locked";
type Tab = "Available" | "Scheduled";

interface Shift {
  id: string;
  dateISO: string;   // "YYYY-MM-DD"
  start: string;     // "HH:MM"
  end: string;       // "HH:MM"
  zone: string;
  city: string;
  demand: Demand;
  isScheduled: boolean;
}

type FeederScheduleTabProps = {
  onOpenMenu?: () => void;
  onOpenNotifications?: () => void;
};

// ─── TINY UTILS ─────────────────────────────────────────────────────────────
const pad2 = (n: number) => String(n).padStart(2, "0");

const toISODate = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const addDays = (d: Date, n: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};

const to12h = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${pad2(m)} ${h >= 12 ? "PM" : "AM"}`;
};

const minsOf = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

const formatTimeUntil = (totalMins: number) => {
  if (totalMins <= 0) return "0m";
  const d = Math.floor(totalMins / 1440);
  const h = Math.floor((totalMins % 1440) / 60);
  const m = totalMins % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const dayLabel = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return {
    day: d.toLocaleDateString(undefined, { weekday: "short" }),
    num: d.getDate(),
  };
};

// ─── RING PROGRESS ──────────────────────────────────────────────────────────
function RingProgress({
  size,
  stroke,
  progress,
  topLabel,
  mainLabel,
}: {
  size: number;
  stroke: number;
  progress: number; // 0–1
  topLabel: string;
  mainLabel: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const filled = circ * clamp01(progress);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        {/* track */}
        <circle cx={size / 2} cy={size / 2} r={r} stroke={C.track} strokeWidth={stroke} fill="none" />
        {/* fill */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={C.orange} strokeWidth={stroke} fill="none"
          strokeLinecap="butt"
          strokeDasharray={`${filled} ${circ - filled}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {/* center text */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{topLabel}</span>
        <span style={{ fontSize: 20, color: C.text, fontWeight: 800, marginTop: 3 }}>{mainLabel}</span>
      </div>
    </div>
  );
}

// ─── SEGMENTED TABS ─────────────────────────────────────────────────────────
function SegTabs({ value, onChange }: { value: Tab; onChange: (v: Tab) => void }) {
  const tabs: Tab[] = ["Available", "Scheduled"];
  return (
    <div style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${C.border}`, marginTop: 10 }}>
      {tabs.map((t) => {
        const active = t === value;
        return (
          <button key={t} type="button" onClick={() => onChange(t)} style={{
            background: "none", border: "none",
            borderBottom: active ? `2px solid ${C.text}` : "2px solid transparent",
            color: active ? C.text : C.muted,
            fontWeight: active ? 800 : 600,
            fontSize: 13, padding: "9px 0", marginRight: 14, cursor: "pointer",
          }}>
            {t}
          </button>
        );
      })}
    </div>
  );
}

// ─── DATE STRIP (4 days) ────────────────────────────────────────────────────
function DateStrip({
  dates,
  selected,
  onSelect,
  dots,
}: {
  dates: string[];
  selected: string;
  onSelect: (d: string) => void;
  dots: Record<string, boolean>;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
      {dates.map((d) => {
        const active = d === selected;
        const { day, num } = dayLabel(d);
        const has = !!dots[d];
        return (
          <button key={d} type="button" onClick={() => onSelect(d)} style={{
            background: C.bg,
            border: active ? `2px solid ${C.text}` : `1px solid ${C.border}`,
            borderRadius: 9, padding: "8px 7px",
            cursor: "pointer", textAlign: "left", minHeight: 52,
          }}>
            {/* day + num row */}
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: active ? C.text : C.muted, fontWeight: 800 }}>{day}</span>
              <span style={{ fontSize: 13, color: C.text, fontWeight: 900 }}>{num}</span>
            </div>
            {/* dot + label */}
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{
                display: "inline-block", width: 5, height: 5, borderRadius: 999,
                background: has ? C.orange : "transparent",
                border: has ? "none" : `1px solid ${C.border}`,
              }} />
              <span style={{ fontSize: 10, color: C.muted, fontWeight: 700 }}>{has ? "Shifts" : "None"}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── SHIFT CARD ─────────────────────────────────────────────────────────────
function ShiftCard({
  shift,
  mode,
  onAdd,
  onRemove,
}: {
  shift: Shift;
  mode: Tab;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const locked = shift.demand === "Locked";
  const canAdd = mode === "Available" && !shift.isScheduled && !locked;
  const canRemove = mode === "Scheduled" && shift.isScheduled && !locked;

  // action button style
  const actionBase: React.CSSProperties = {
    padding: "7px 10px", borderRadius: 8, fontSize: 11, fontWeight: 900,
    cursor: "pointer", whiteSpace: "nowrap", background: "none",
  };

  return (
    <div style={{
      background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
      padding: "10px 11px", display: "flex", gap: 10, alignItems: "flex-start",
    }}>
      {/* content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {to12h(shift.start)} – {to12h(shift.end)}
        </div>
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginTop: 4 }}>
          {shift.zone}, {shift.city} · {shift.demand}
        </div>
      </div>

      {/* action */}
      {locked ? (
        <span style={{ ...actionBase, border: `1px solid ${C.border}`, color: C.muted, background: C.bgMuted, cursor: "default" }}>
          Locked
        </span>
      ) : canAdd ? (
        <button type="button" onClick={() => onAdd(shift.id)} style={{ ...actionBase, border: `1px solid ${C.text}`, color: C.text }}>
          Add Shift
        </button>
      ) : canRemove ? (
        <button type="button" onClick={() => { if (confirm("Remove this shift?")) onRemove(shift.id); }} style={{ ...actionBase, border: `1px solid ${C.border}`, color: C.text }}>
          Remove
        </button>
      ) : (
        <span style={{ width: 80 }} />
      )}
    </div>
  );
}

// ─── EMPTY STATE ────────────────────────────────────────────────────────────
function EmptyState({ tab, onFlip }: { tab: Tab; onFlip: () => void }) {
  const other = tab === "Scheduled" ? "Available" : "Scheduled";
  return (
    <div style={{
      border: `1px dashed ${C.border}`, borderRadius: 10,
      padding: 14, color: C.muted, fontWeight: 700, fontSize: 12, lineHeight: 1.4,
    }}>
      {tab === "Scheduled"
        ? "No shifts scheduled for this day."
        : "No available shifts for this day."}
      <button type="button" onClick={onFlip} style={{
        display: "block", marginTop: 10,
        background: "none", border: `1px solid ${C.text}`, borderRadius: 8,
        color: C.text, fontWeight: 900, fontSize: 11, padding: "7px 10px", cursor: "pointer",
      }}>
        View {other} Shifts
      </button>
    </div>
  );
}

// ─── MOCK DATA ──────────────────────────────────────────────────────────────
function useMockShifts() {
  const today = useMemo(() => new Date(), []);
  const dates = useMemo(() => [0, 1, 2, 3].map((i) => toISODate(addDays(today, i))), [today]);

  const [shifts, setShifts] = useState<Shift[]>(() => {
    const [d0, d1, d2, d3] = dates;
    return [
      { id: "s1", dateISO: d0, start: "06:00", end: "09:00", zone: "Downtown", city: "Toledo", demand: "High Demand",  isScheduled: false },
      { id: "s2", dateISO: d0, start: "09:00", end: "12:00", zone: "Downtown", city: "Toledo", demand: "Standard",     isScheduled: true  },
      { id: "s3", dateISO: d0, start: "12:00", end: "14:00", zone: "Downtown", city: "Toledo", demand: "Standard",     isScheduled: false },
      { id: "s4", dateISO: d1, start: "07:00", end: "10:00", zone: "Central",  city: "Toledo", demand: "Standard",     isScheduled: false },
      { id: "s5", dateISO: d1, start: "10:00", end: "13:00", zone: "Central",  city: "Toledo", demand: "High Demand",  isScheduled: true  },
      { id: "s6", dateISO: d2, start: "08:00", end: "11:00", zone: "West",     city: "Toledo", demand: "Standard",     isScheduled: false },
      { id: "s7", dateISO: d2, start: "11:00", end: "14:00", zone: "West",     city: "Toledo", demand: "Locked",       isScheduled: false },
      { id: "s8", dateISO: d3, start: "06:00", end: "09:00", zone: "Downtown", city: "Toledo", demand: "Standard",     isScheduled: false },
    ];
  });

  return { dates, shifts, setShifts };
}

// ─── DERIVED HELPERS ────────────────────────────────────────────────────────
function getNextShift(shifts: Shift[]): Shift | null {
  const now = Date.now();
  return (
    shifts
      .filter((s) => s.isScheduled)
      .map((s) => ({ s, t: new Date(`${s.dateISO}T${s.start}:00`).getTime() }))
      .filter((x) => x.t > now)
      .sort((a, b) => a.t - b.t)[0]?.s ?? null
  );
}

function ringProgress(next: Shift | null): number {
  if (!next) return 0;
  const minsLeft = Math.max(0, (new Date(`${next.dateISO}T${next.start}:00`).getTime() - Date.now()) / 60000);
  return clamp01(minsLeft / (72 * 60)); // 72-hour horizon
}

function minsUntil(next: Shift | null): number {
  if (!next) return 0;
  return Math.max(0, Math.floor((new Date(`${next.dateISO}T${next.start}:00`).getTime() - Date.now()) / 60000));
}

// ─── PAGE ───────────────────────────────────────────────────────────────────
const FeederScheduleTab: React.FC<FeederScheduleTabProps> = ({
  onOpenMenu,
  onOpenNotifications
}) => {
  const { dates, shifts, setShifts } = useMockShifts();
  const [tab, setTab]               = useState<Tab>("Available");
  const [selDate, setSelDate]       = useState(dates[0]);

  // tick every 60s to refresh countdown
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // ── derived ──
  const dots = useMemo(() => {
    const m: Record<string, boolean> = {};
    dates.forEach((d) => (m[d] = false));
    shifts.forEach((s) => { if (m[s.dateISO] !== undefined) m[s.dateISO] = true; });
    return m;
  }, [dates, shifts]);

  const next       = useMemo(() => getNextShift(shifts), [shifts, tick]);
  const countdown  = useMemo(() => (next ? formatTimeUntil(minsUntil(next)) : "None"), [next, tick]);
  const progress   = useMemo(() => ringProgress(next), [next, tick]);

  const contextText = useMemo(() => {
    if (!next) return "No upcoming shift scheduled";
    const d = new Date(`${next.dateISO}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" });
    return `${next.zone} · Starts ${d} ${to12h(next.start)} · ${next.demand}`;
  }, [next]);

  const windowText = useMemo(() => {
    const last = new Date(`${dates[3]}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" });
    return `Scheduling window: Today through ${last}`;
  }, [dates]);

  const filtered = useMemo(() => {
    const byDate = shifts.filter((s) => s.dateISO === selDate);
    return tab === "Scheduled" ? byDate.filter((s) => s.isScheduled) : byDate.filter((s) => !s.isScheduled);
  }, [shifts, selDate, tab]);

  const summary = useMemo(() => {
    const scheduled = shifts.filter((s) => dates.includes(s.dateISO) && s.isScheduled);
    const totalMins = scheduled.reduce((a, s) => a + minsOf(s.end) - minsOf(s.start), 0);
    return {
      hours: Math.round((totalMins / 60) * 10) / 10,
      days:  new Set(scheduled.map((s) => s.dateISO)).size,
    };
  }, [shifts, dates]);

  const sectionDay = useMemo(() =>
    new Date(`${selDate}T00:00:00`).toLocaleDateString(undefined, { weekday: "long" }),
    [selDate]
  );

  // ── mutations ──
  const onAdd    = (id: string) => setShifts((p) => p.map((s) => (s.id === id ? { ...s, isScheduled: true  } : s)));
  const onRemove = (id: string) => setShifts((p) => p.map((s) => (s.id === id ? { ...s, isScheduled: false } : s)));

  // ── render ──
  return (
    <div style={{
      background: C.bg, minHeight: "100vh", color: C.text,
      paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    }}>

      {/* ── sticky top bar ── */}
      <div style={{
        position: "sticky", top: 0, background: C.bg, zIndex: 10,
        borderBottom: `1px solid ${C.border}`, padding: "12px 16px",
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h1 style={{ fontSize: 16, fontWeight: 900, letterSpacing: 0.2, margin: 0 }}>Schedule</h1>
          {onOpenMenu && (
            <button type="button" onClick={onOpenMenu} style={{
              background: "none", border: `1px solid ${C.border}`, borderRadius: 7,
              color: C.text, fontWeight: 700, fontSize: 11, padding: "6px 10px", cursor: "pointer",
            }}>
              Back
            </button>
          )}
        </div>
        <SegTabs value={tab} onChange={setTab} />
      </div>

      {/* ── scrollable content ── */}
      <div style={{ padding: "12px 16px 0", maxWidth: 520, margin: "0 auto" }}>

        {/* ring card */}
        <div style={{
          border: `1px solid ${C.border}`, borderRadius: 12, padding: 12,
          display: "grid", gridTemplateColumns: "96px 1fr", gap: 12, alignItems: "center",
        }}>
          <RingProgress size={96} stroke={9} progress={progress} topLabel="Next Shift" mainLabel={countdown} />
          <div>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 800 }}>Shift Context</div>
            <div style={{ fontSize: 12, color: C.text, fontWeight: 800, marginTop: 5, lineHeight: 1.35 }}>{contextText}</div>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginTop: 7, lineHeight: 1.35 }}>{windowText}</div>
          </div>
        </div>

        {/* date strip */}
        <div style={{ marginTop: 12 }}>
          <DateStrip dates={dates} selected={selDate} onSelect={setSelDate} dots={dots} />
        </div>

        {/* section header */}
        <div style={{ marginTop: 14, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 950 }}>
            {tab === "Scheduled" ? "Scheduled" : "Available"} Shifts — {sectionDay}
          </span>
          <button type="button" onClick={() => setSelDate(dates[0])} style={{
            background: "none", border: "none", color: C.muted,
            fontWeight: 800, fontSize: 11, cursor: "pointer", padding: 0,
          }}>
            Back
          </button>
        </div>

        {/* shift list */}
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.length === 0 ? (
            <EmptyState tab={tab} onFlip={() => setTab(tab === "Scheduled" ? "Available" : "Scheduled")} />
          ) : (
            filtered.map((s) => (
              <ShiftCard key={s.id} shift={s} mode={tab} onAdd={onAdd} onRemove={onRemove} />
            ))
          )}
        </div>
      </div>

      {/* ── sticky footer ── */}
      <div style={{
        position: "fixed", left: 0, right: 0, bottom: 0,
        background: C.bg, borderTop: `1px solid ${C.border}`,
        padding: "10px 16px",
      }}>
        <div style={{ maxWidth: 520, margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 800 }}>Scheduled Next 4 Days</div>
            <div style={{ fontSize: 12, color: C.text, fontWeight: 950, marginTop: 3 }}>
              {summary.hours}h total · {summary.days} active {summary.days === 1 ? "day" : "days"}
            </div>
          </div>
          <button type="button" onClick={() => setTab("Scheduled")} style={{
            background: C.text, color: "#fff", border: "none", borderRadius: 8,
            padding: "8px 12px", fontWeight: 950, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap",
          }}>
            Review Schedule
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeederScheduleTab;

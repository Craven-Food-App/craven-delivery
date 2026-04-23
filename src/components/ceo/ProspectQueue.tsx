import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type ProspectStatus = 'new' | 'attempted' | 'contacted' | 'qualified' | 'won' | 'lost' | 'do_not_call';

interface Prospect {
  id: string;
  business_name: string;
  legal_name?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address_line1?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  category?: string | null;
  status: ProspectStatus;
  priority: number;
  source: string;
  next_call_at?: string | null;
  last_contact_at?: string | null;
  notes?: string | null;
  owner_user_id?: string | null;
  delivery_state: 'draft' | 'pushed_to_cpo' | 'accepted_by_cpo' | 'returned' | 'archived';
  pipeline_partnership_id?: string | null;
  created_at: string;
}

interface Activity {
  id: string;
  prospect_id: string;
  activity_type: string;
  outcome?: string | null;
  note?: string | null;
  follow_up_at?: string | null;
  created_at: string;
}

interface QueueMetrics {
  targetsInQueue: number;
  connectedToday: number;
  qualifiedToday: number;
  pipelineMovedToday: number;
  conversionRate7d: number;
}

const STATUS_OPTIONS: ProspectStatus[] = ['new', 'attempted', 'contacted', 'qualified', 'won', 'lost', 'do_not_call'];

interface StructuredPitch {
  header?: string;
  area?: string;
  businessType?: string;
  askFor?: string;
  grabber?: string;
  hook?: string;
  close?: string;
  objectionHandler?: string;
}

function extractSection(notes: string, label: string, nextLabels: string[]): string | undefined {
  const startIndex = notes.indexOf(label);
  if (startIndex < 0) return undefined;
  const sectionStart = startIndex + label.length;
  const nextIndex = nextLabels
    .map((nextLabel) => notes.indexOf(nextLabel, sectionStart))
    .filter((idx) => idx >= 0)
    .sort((a, b) => a - b)[0];
  const value = notes.slice(sectionStart, nextIndex ?? notes.length).trim();
  return value || undefined;
}

function parseStructuredPitch(notes?: string | null): StructuredPitch | null {
  if (!notes) return null;
  if (!notes.includes('GRABBER:') && !notes.includes('HOOK:') && !notes.includes('CLOSE:')) return null;

  return {
    header: extractSection(notes, '=== TOLEDO SPRINT TARGET ', ['Area:']),
    area: extractSection(notes, 'Area:', ['Type:', 'Ask for:', '--- 30-SECOND PITCH ---']),
    businessType: extractSection(notes, 'Type:', ['Ask for:', '--- 30-SECOND PITCH ---']),
    askFor: extractSection(notes, 'Ask for:', ['--- 30-SECOND PITCH ---', 'GRABBER:']),
    grabber: extractSection(notes, 'GRABBER:', ['HOOK:', 'CLOSE:', '--- IF THEY USE ANOTHER APP ---']),
    hook: extractSection(notes, 'HOOK:', ['CLOSE:', '--- IF THEY USE ANOTHER APP ---']),
    close: extractSection(notes, 'CLOSE:', ['--- IF THEY USE ANOTHER APP ---']),
    objectionHandler: extractSection(notes, 'Say:', []),
  };
}

function humanizeStatus(value?: string | null): string {
  if (!value) return 'unknown';
  return value.replace(/_/g, ' ');
}

function displayPriority(priority?: number | null): 'P1' | 'P2' | 'P3' | 'P4' | 'P5' {
  if (!priority) return 'P3';
  const rank = 6 - priority;
  if (rank <= 1) return 'P1';
  if (rank === 2) return 'P2';
  if (rank === 3) return 'P3';
  if (rank === 4) return 'P4';
  return 'P5';
}

function priorityChipClasses(priority?: number | null): string {
  const label = displayPriority(priority);
  if (label === 'P1') return 'bg-red-500 text-white';
  if (label === 'P2') return 'bg-amber-400 text-black';
  if (label === 'P3') return 'bg-zinc-300 text-zinc-700';
  return 'bg-zinc-200 text-zinc-600';
}

function queueAccentClasses(priority?: number | null): string {
  const label = displayPriority(priority);
  if (label === 'P1') return 'border-l-red-500';
  if (label === 'P2') return 'border-l-amber-400';
  return 'border-l-emerald-500';
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(',').map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

function normalizeProspectRow(row: Record<string, string>) {
  const businessName =
    row.business_name ||
    row.name ||
    row.business ||
    row.company ||
    row.merchant_name ||
    '';
  return {
    business_name: businessName,
    legal_name: row.legal_name || null,
    phone: row.phone || row.phone_number || null,
    email: row.email || null,
    website: row.website || null,
    address_line1: row.address || row.address_line1 || null,
    city: row.city || null,
    state: row.state || null,
    postal_code: row.postal_code || row.zip || null,
    category: row.category || row.vertical || null,
    notes: row.notes || null,
  };
}

interface ProspectQueueProps {
  mode?: 'ceo' | 'cpo';
}

export const ProspectQueue: React.FC<ProspectQueueProps> = ({ mode = 'ceo' }) => {
  const [loading, setLoading] = useState(false);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [selected, setSelected] = useState<Prospect | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProspectStatus>('all');
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [followUpAt, setFollowUpAt] = useState('');
  const [note, setNote] = useState('');
  const [ownerUserId, setOwnerUserId] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | '1' | '2' | '3' | '4' | '5'>('all');
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'snapshot' | 'notes'>('overview');
  const [metrics, setMetrics] = useState<QueueMetrics>({
    targetsInQueue: 0,
    connectedToday: 0,
    qualifiedToday: 0,
    pipelineMovedToday: 0,
    conversionRate7d: 0,
  });
  const structuredPitch = useMemo(() => parseStructuredPitch(selected?.notes), [selected?.notes]);

  const filteredProspects = useMemo(() => {
    return prospects.filter((p) => {
      const q = search.trim().toLowerCase();
      const searchOk = !q
        || p.business_name.toLowerCase().includes(q)
        || (p.phone || '').toLowerCase().includes(q)
        || (p.city || '').toLowerCase().includes(q);
      const statusOk = statusFilter === 'all' || p.status === statusFilter;
      const priorityOk = priorityFilter === 'all' || p.priority === Number(priorityFilter);
      const ownershipOk = !showOnlyMine || (currentUserId && p.owner_user_id === currentUserId);
      const modeOk = mode === 'ceo'
        ? p.delivery_state !== 'archived'
        : p.delivery_state === 'pushed_to_cpo' || p.delivery_state === 'accepted_by_cpo';
      return searchOk && statusOk && priorityOk && ownershipOk && modeOk;
    });
  }, [prospects, search, statusFilter, priorityFilter, showOnlyMine, currentUserId, mode]);

  const loadProspects = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('merchant_prospects')
      .select('*')
      .order('priority', { ascending: false })
      .order('next_call_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
      .limit(500);
    setLoading(false);
    if (error) {
      setMessage(error.message || 'Failed loading prospects.');
      return;
    }
    setProspects((data || []) as Prospect[]);
    if (!selected && data?.length) setSelected(data[0] as Prospect);
  };

  const loadActivities = async (prospectId: string) => {
    const { data, error } = await (supabase as any)
      .from('merchant_prospect_activities')
      .select('*')
      .eq('prospect_id', prospectId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return;
    setActivities((data || []) as Activity[]);
  };

  useEffect(() => {
    loadProspects();
  }, []);

  useEffect(() => {
    const loadCurrentUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data.user?.id || '');
    };
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (selected?.id) loadActivities(selected.id);
    else setActivities([]);
  }, [selected?.id]);

  const handleImportCsv = async () => {
    const parsed = parseCsv(csvText);
    if (parsed.length === 0) {
      setMessage('No valid rows found. Include a header row and at least one data row.');
      return;
    }
    setImporting(true);
    setMessage(null);
    const { data: authData } = await supabase.auth.getUser();
    const uploader = authData.user?.id;
    if (!uploader) {
      setImporting(false);
      setMessage('Must be signed in.');
      return;
    }

    const { data: batch, error: batchErr } = await (supabase as any)
      .from('merchant_prospect_import_batches')
      .insert({
        uploaded_by_user_id: uploader,
        filename: `manual_csv_${new Date().toISOString()}.csv`,
        source_type: 'csv',
        total_rows: parsed.length,
        status: 'processing',
      })
      .select('*')
      .single();
    if (batchErr || !batch) {
      setImporting(false);
      setMessage(batchErr?.message || 'Could not start import batch.');
      return;
    }

    const normalized = parsed.map(normalizeProspectRow).filter((r) => r.business_name);
    const rows = normalized.map((r) => ({
      ...r,
      batch_id: batch.id,
      source: 'import',
      status: 'new',
      priority: 3,
      owner_user_id: ownerUserId || uploader,
      assigned_by_user_id: uploader,
    }));

    const { error: insertErr, data: inserted } = await (supabase as any)
      .from('merchant_prospects')
      .insert(rows)
      .select('id');

    const importedRows = inserted?.length || 0;
    const rejectedRows = Math.max(parsed.length - importedRows, 0);
    await (supabase as any)
      .from('merchant_prospect_import_batches')
      .update({
        status: rejectedRows > 0 ? 'partial' : 'completed',
        imported_rows: importedRows,
        rejected_rows: rejectedRows,
        completed_at: new Date().toISOString(),
      })
      .eq('id', batch.id);

    setImporting(false);
    if (insertErr) {
      setMessage(insertErr.message || 'Import failed.');
      return;
    }
    setMessage(`Imported ${importedRows} prospects (${rejectedRows} rejected).`);
    setCsvText('');
    await loadProspects();
  };

  const logActivity = async (params: {
    activityType: 'call' | 'note' | 'status_change' | 'assignment';
    outcome?: string;
    nextStatus?: ProspectStatus;
    noteText?: string;
    followUpAtText?: string | null;
  }) => {
    if (!selected) return;
    const followUp = params.followUpAtText ? new Date(params.followUpAtText).toISOString() : null;
    const { data, error } = await (supabase as any).rpc('log_merchant_prospect_activity', {
      p_prospect_id: selected.id,
      p_activity_type: params.activityType,
      p_outcome: params.outcome || null,
      p_note: params.noteText || null,
      p_follow_up_at: followUp,
      p_status: params.nextStatus || null,
    });
    if (error || !data?.ok) {
      setMessage(error?.message || 'Could not log activity.');
      return;
    }
    setNote('');
    setFollowUpAt('');
    await loadProspects();
    await loadActivities(selected.id);
    const refreshed = prospects.find((p) => p.id === selected.id);
    if (refreshed) setSelected(refreshed);
  };

  const claimNext = async () => {
    const { data, error } = await (supabase as any).rpc('claim_next_merchant_prospect', {
      p_owner_user_id: ownerUserId || null,
    });
    if (error) {
      setMessage(error.message || 'Could not fetch next prospect.');
      return;
    }
    const next = Array.isArray(data) ? data[0] : null;
    if (!next) {
      setMessage('No queue items found for current filter.');
      return;
    }
    setSelected(next);
    setMessage(`Loaded next prospect: ${next.business_name}`);
  };

  const pushToCpo = async () => {
    if (!selected) return;
    const { data, error } = await (supabase as any).rpc('push_merchant_prospect_to_cpo', {
      p_prospect_id: selected.id,
      p_owner_user_id: ownerUserId || null,
    });
    if (error || !data?.ok) {
      setMessage(error?.message || data?.error || 'Could not push to CPO queue.');
      return;
    }
    setMessage('Prospect pushed to CPO queue.');
    await loadProspects();
  };

  const acceptForExecution = async () => {
    if (!selected) return;
    const { data, error } = await (supabase as any).rpc('accept_merchant_prospect', {
      p_prospect_id: selected.id,
    });
    if (error || !data?.ok) {
      setMessage(error?.message || data?.error || 'Could not accept prospect.');
      return;
    }
    setMessage('Prospect accepted into your execution queue.');
    await loadProspects();
  };

  const convertToPipeline = async () => {
    if (!selected) return;
    const { data, error } = await (supabase as any).rpc('convert_prospect_to_partnership', {
      p_prospect_id: selected.id,
      p_status: 'discovery',
    });
    if (error || !data?.ok) {
      setMessage(error?.message || data?.error || 'Could not convert to pipeline.');
      return;
    }
    setMessage(`Converted to pipeline. Partnership ID: ${data.partnership_id}`);
    await loadProspects();
  };

  const loadQueueMetrics = async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const sevenDayStart = new Date();
    sevenDayStart.setDate(sevenDayStart.getDate() - 7);

    const [connectedTodayResp, qualifiedTodayResp, movedTodayResp, connected7dResp, moved7dResp] = await Promise.all([
      (supabase as any)
        .from('merchant_prospect_activities')
        .select('id', { count: 'exact', head: true })
        .eq('activity_type', 'call')
        .eq('outcome', 'connected')
        .gte('created_at', todayStart.toISOString()),
      (supabase as any)
        .from('merchant_prospect_activities')
        .select('id', { count: 'exact', head: true })
        .eq('outcome', 'qualified')
        .gte('created_at', todayStart.toISOString()),
      (supabase as any)
        .from('merchant_prospect_activities')
        .select('id', { count: 'exact', head: true })
        .eq('outcome', 'converted_to_pipeline')
        .gte('created_at', todayStart.toISOString()),
      (supabase as any)
        .from('merchant_prospect_activities')
        .select('id', { count: 'exact', head: true })
        .eq('activity_type', 'call')
        .eq('outcome', 'connected')
        .gte('created_at', sevenDayStart.toISOString()),
      (supabase as any)
        .from('merchant_prospect_activities')
        .select('id', { count: 'exact', head: true })
        .eq('outcome', 'converted_to_pipeline')
        .gte('created_at', sevenDayStart.toISOString()),
    ]);

    const connectedToday = connectedTodayResp.count || 0;
    const qualifiedToday = qualifiedTodayResp.count || 0;
    const pipelineMovedToday = movedTodayResp.count || 0;
    const connected7d = connected7dResp.count || 0;
    const moved7d = moved7dResp.count || 0;
    const conversionRate7d = connected7d > 0 ? Math.round((moved7d / connected7d) * 100) : 0;

    setMetrics({
      targetsInQueue: filteredProspects.length,
      connectedToday,
      qualifiedToday,
      pipelineMovedToday,
      conversionRate7d,
    });
  };

  useEffect(() => {
    loadQueueMetrics();
  }, [filteredProspects.length]);

  return (
    <div className="space-y-4 bg-[#f8f8f8] p-1">
      <div className="rounded-lg border border-border bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className={mode === 'cpo' ? 'text-[34px] font-semibold leading-tight text-foreground' : 'text-sm font-semibold text-foreground'}>
              {mode === 'ceo' ? 'Prospect Push Queue (CEO)' : 'Prospect Execution Queue (CPO)'}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === 'ceo'
                ? 'Import and prioritize targets, then push assigned outreach into CPO execution.'
                : 'Execute calls, qualify prospects, and build pipeline.'}
            </p>
          </div>
          <button
            onClick={loadProspects}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold"
          >
            Refresh
          </button>
        </div>
      </div>

      {mode === 'cpo' && (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-lg border border-border bg-white p-3">
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-sky-200 text-sky-600">◎</span>Targets in Queue</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{metrics.targetsInQueue}</p>
            <p className="text-[11px] text-muted-foreground">Total</p>
          </div>
          <div className="rounded-lg border border-border bg-white p-3">
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-200 text-emerald-600">◔</span>Connected Today</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{metrics.connectedToday}</p>
            <p className="text-[11px] font-semibold text-emerald-600">18% vs yesterday</p>
          </div>
          <div className="rounded-lg border border-border bg-white p-3">
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-200 text-emerald-600">✓</span>Qualified Today</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{metrics.qualifiedToday}</p>
            <p className="text-[11px] font-semibold text-emerald-600">35% vs yesterday</p>
          </div>
          <div className="rounded-lg border border-border bg-white p-3">
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-sky-200 text-sky-600">⌵</span>Pipeline Moved</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{metrics.pipelineMovedToday}</p>
            <p className="text-[11px] font-semibold text-sky-600">${(metrics.pipelineMovedToday * 2450).toLocaleString()} potential</p>
          </div>
          <div className="rounded-lg border border-border bg-white p-3">
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-sky-200 text-sky-600">▥</span>Conversion Rate</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{metrics.conversionRate7d}%</p>
            <p className="text-[10px] text-muted-foreground">7d trailing</p>
          </div>
        </div>
      )}

      {message && (
        <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground">
          {message}
        </div>
      )}

      <div className="grid gap-3 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
        <aside className="rounded-lg border border-border bg-white p-3 space-y-3">
          <p className="text-sm font-semibold text-foreground">Prospect Queue</p>
          {mode === 'ceo' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Owner User ID (Jason)</label>
              <input
                value={ownerUserId}
                onChange={(e) => setOwnerUserId(e.target.value)}
                placeholder="Optional auth user id; blank = self"
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Search</label>
            <div className="grid grid-cols-[1fr_32px] gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search business, city, phone..."
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              />
              <button className="rounded-md border border-border bg-background text-xs text-muted-foreground">⌕</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              >
                <option value="all">All statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as any)}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              >
                <option value="all">All priorities</option>
                <option value="5">P1</option>
                <option value="4">P2</option>
                <option value="3">P3</option>
                <option value="2">P4</option>
                <option value="1">P5</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={showOnlyMine}
                onChange={(e) => setShowOnlyMine(e.target.checked)}
              />
              Show only my queue
            </label>
            <p className="text-xs text-muted-foreground">{filteredProspects.length} prospects</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Sort: Next Call</span>
              <span>↕</span>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={claimNext}
                className="flex-1 rounded-md border border-orange-500/50 bg-orange-500 px-2 py-1.5 text-xs font-semibold text-white shadow-sm"
              >
                ▷ Load Next Call
              </button>
            </div>
          </div>

          <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
            {loading ? (
              <p className="text-xs text-muted-foreground">Loading queue...</p>
            ) : filteredProspects.length === 0 ? (
              <p className="text-xs text-muted-foreground">No prospects found.</p>
            ) : filteredProspects.map((p) => {
              const isActive = selected?.id === p.id;
              const urgency = p.next_call_at && new Date(p.next_call_at) <= new Date();
              return (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className={`w-full rounded-md border-l-2 px-2 py-2 text-left ${isActive ? 'bg-orange-50/60 ring-1 ring-orange-200' : 'border-border bg-background'} ${queueAccentClasses(p.priority)}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-foreground">{p.business_name}</p>
                    <div className="flex items-center gap-1.5">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${priorityChipClasses(p.priority)}`}>{displayPriority(p.priority)}</span>
                      <span className="text-[10px] text-muted-foreground">{p.status === 'new' ? 'New' : (p.next_call_at ? 'Follow-up' : '')}</span>
                    </div>
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">{p.category || 'Food'} • {p.city || '—'}, {p.state || 'OH'}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      Next Call: {p.next_call_at ? new Date(p.next_call_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Tomorrow'}
                    </span>
                    <span className="text-xs font-semibold text-emerald-600">{Math.max(45, p.priority * 17)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {mode === 'ceo' && (
            <div className="border-t border-border pt-2 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Import prospects (CSV)</p>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                rows={7}
                placeholder="business_name,phone,address,city,state,category,notes"
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              />
              <button
                onClick={handleImportCsv}
                disabled={importing}
                className="w-full rounded-md border border-primary/40 bg-primary/10 px-2 py-1.5 text-xs font-semibold text-primary disabled:opacity-60"
              >
                {importing ? 'Importing…' : 'Import CSV'}
              </button>
            </div>
          )}
        </aside>

        <section className="rounded-lg border border-border bg-white p-3">
          {!selected ? (
            <p className="text-xs text-muted-foreground">Select a prospect from queue.</p>
          ) : (
            <div className="space-y-3">
              <div className="rounded-md border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[44px] font-semibold leading-none text-foreground">{selected.business_name}</h4>
                    <span className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground">{selected.status === 'new' ? 'New' : humanizeStatus(selected.status)}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${priorityChipClasses(selected.priority)}`}>{displayPriority(selected.priority)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {mode === 'cpo' && (
                      <>
                        <button className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground" onClick={acceptForExecution}>Accept</button>
                        <button className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground" onClick={convertToPipeline}>Convert</button>
                      </>
                    )}
                    <button className="rounded-md border border-border px-2 py-1 text-xs">Actions</button>
                  </div>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 text-xs">
                  <p><span className="text-muted-foreground">Phone:</span> {selected.phone || '—'}</p>
                  <p><span className="text-muted-foreground">Email:</span> {selected.email || '—'}</p>
                  <p><span className="text-muted-foreground">Category:</span> {selected.category || '—'}</p>
                  <p><span className="text-muted-foreground">Priority:</span> {selected.priority}</p>
                  <p className="sm:col-span-2">
                    <span className="text-muted-foreground">Address:</span> {[
                      selected.address_line1, selected.city, selected.state, selected.postal_code,
                    ].filter(Boolean).join(', ') || '—'}
                  </p>
                  <p><span className="text-muted-foreground">Next Call:</span> <span className={selected.next_call_at ? 'text-orange-500 font-semibold' : ''}>{selected.next_call_at ? 'Now' : '—'}</span></p>
                  <p><span className="text-muted-foreground">Last Contact:</span> {selected.last_contact_at ? new Date(selected.last_contact_at).toLocaleString() : '—'}</p>
                  <p><span className="text-muted-foreground">Delivery State:</span> {humanizeStatus(selected.delivery_state)}</p>
                  <p><span className="text-muted-foreground">Pipeline:</span> {selected.pipeline_partnership_id || 'Not yet'}</p>
                </div>
                <div className="mt-3 border-b border-border">
                  <div className="flex gap-4 text-xs">
                    <button
                      onClick={() => setActiveDetailTab('overview')}
                      className={`pb-2 ${activeDetailTab === 'overview' ? 'font-semibold text-foreground border-b border-primary' : 'text-muted-foreground'}`}
                    >
                      Overview
                    </button>
                    <button
                      onClick={() => setActiveDetailTab('snapshot')}
                      className={`pb-2 ${activeDetailTab === 'snapshot' ? 'font-semibold text-foreground border-b border-primary' : 'text-muted-foreground'}`}
                    >
                      Target Snapshot
                    </button>
                    <button
                      onClick={() => setActiveDetailTab('notes')}
                      className={`pb-2 ${activeDetailTab === 'notes' ? 'font-semibold text-foreground border-b border-primary' : 'text-muted-foreground'}`}
                    >
                      Notes
                    </button>
                  </div>
                </div>
                {structuredPitch ? (
                  <div className="mt-3 space-y-2">
                    {(activeDetailTab === 'overview' || activeDetailTab === 'snapshot') && (
                      <div className="rounded-md border border-orange-200 bg-orange-50/50 p-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-600">30-Second Pitch</p>
                        {structuredPitch.grabber && (
                          <p className="mt-1 text-xs text-foreground"><span className="font-semibold text-muted-foreground">Grabber:</span> {structuredPitch.grabber}</p>
                        )}
                        {structuredPitch.hook && (
                          <p className="mt-1 text-xs text-foreground"><span className="font-semibold text-muted-foreground">Hook:</span> {structuredPitch.hook}</p>
                        )}
                        {structuredPitch.close && (
                          <p className="mt-1 text-xs text-foreground"><span className="font-semibold text-muted-foreground">Close:</span> {structuredPitch.close}</p>
                        )}
                      </div>
                    )}

                    {(activeDetailTab === 'snapshot' || activeDetailTab === 'overview') && (
                      <div className="rounded-md border border-border bg-muted/20 p-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Target Snapshot</p>
                        <p className="mt-1 text-xs text-foreground">
                          {structuredPitch.header || 'Toledo Sprint'}
                          {structuredPitch.area ? ` • ${structuredPitch.area}` : ''}
                          {structuredPitch.businessType ? ` • ${structuredPitch.businessType}` : ''}
                        </p>
                        {structuredPitch.askFor && (
                          <p className="mt-1 text-xs text-foreground"><span className="font-semibold text-muted-foreground">Ask for:</span> {structuredPitch.askFor}</p>
                        )}
                      </div>
                    )}

                    {activeDetailTab === 'overview' && structuredPitch.objectionHandler && (
                      <div className="rounded-md border border-border bg-background p-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">If They Use Another App</p>
                        <p className="mt-1 text-xs text-foreground">{structuredPitch.objectionHandler}</p>
                      </div>
                    )}
                  </div>
                ) : activeDetailTab === 'notes' ? (
                  <textarea
                    rows={6}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add notes about this prospect..."
                    className="mt-3 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                  />
                ) : selected.notes ? (
                  <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{selected.notes}</p>
                ) : null}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-border bg-white p-3 space-y-3">
          <div className="rounded-md border border-border bg-background p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Call Disposition</p>
            <div className="grid grid-cols-3 gap-2">
              <button className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700" onClick={() => logActivity({ activityType: 'call', outcome: 'connected', nextStatus: 'contacted', noteText: note, followUpAtText: followUpAt || null })}>Connected</button>
              <button className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700" onClick={() => logActivity({ activityType: 'call', outcome: 'voicemail', nextStatus: 'attempted', noteText: note, followUpAtText: followUpAt || null })}>Voicemail</button>
              <button className="rounded-md border border-border px-2 py-1 text-xs" onClick={() => logActivity({ activityType: 'call', outcome: 'no_answer', nextStatus: 'attempted', noteText: note, followUpAtText: followUpAt || null })}>No Answer</button>
              <button className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700" onClick={() => logActivity({ activityType: 'status_change', outcome: 'qualified', nextStatus: 'qualified', noteText: note, followUpAtText: followUpAt || null })}>Qualified</button>
              <button className="rounded-md border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-700" onClick={() => logActivity({ activityType: 'status_change', outcome: 'won', nextStatus: 'won', noteText: note })}>Won</button>
            </div>
            <button className="w-full rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1 text-xs text-destructive" onClick={() => logActivity({ activityType: 'status_change', outcome: 'lost', nextStatus: 'lost', noteText: note })}>Lost</button>
          </div>

          <div className="rounded-md border border-border bg-background p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Follow-up</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={followUpAt ? followUpAt.split('T')[0] : ''}
                onChange={(e) => {
                  const timePart = followUpAt.includes('T') ? followUpAt.split('T')[1] : '09:00';
                  setFollowUpAt(e.target.value ? `${e.target.value}T${timePart}` : '');
                }}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              />
              <input
                type="time"
                value={followUpAt.includes('T') ? followUpAt.split('T')[1] : ''}
                onChange={(e) => {
                  const datePart = followUpAt ? followUpAt.split('T')[0] : new Date().toISOString().slice(0, 10);
                  setFollowUpAt(e.target.value ? `${datePart}T${e.target.value}` : '');
                }}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              />
            </div>
            <select className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs">
              <option>Follow-up Type</option>
              <option>Call Back</option>
              <option>Send Proposal</option>
              <option>Owner Follow-up</option>
            </select>
            <textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Call notes..."
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
            />
            <button
              className="w-full rounded-md border border-orange-500/40 bg-orange-500 px-2 py-1.5 text-xs font-semibold text-white"
              onClick={() => logActivity({ activityType: 'note', noteText: note, followUpAtText: followUpAt || null })}
            >
              Save Follow-up
            </button>
          </div>

          <div className="rounded-md border border-border bg-background p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">Activity Timeline</p>
              <button className="text-[11px] text-sky-600">View all</button>
            </div>
            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
              {activities.length === 0 ? (
                <div className="rounded-md border border-border p-8 text-center">
                  <p className="text-xs font-semibold text-muted-foreground">No activity yet.</p>
                  <p className="mt-1 text-xs text-muted-foreground">Start the first touch to see activity here.</p>
                </div>
              ) : activities.map((a) => (
                <div key={a.id} className="rounded-md border border-border px-2 py-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">{a.activity_type}{a.outcome ? ` · ${a.outcome}` : ''}</span>
                    <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                  {a.note && <p className="mt-1 text-muted-foreground">{a.note}</p>}
                  {a.follow_up_at && (
                    <p className="mt-1 text-muted-foreground">Follow-up: {new Date(a.follow_up_at).toLocaleString()}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {mode === 'ceo' && (
            <div className="rounded-md border border-border bg-background p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Execution Actions</p>
              <button className="w-full rounded-md border border-primary/40 bg-primary/10 px-2 py-1.5 text-xs font-semibold text-primary" onClick={pushToCpo}>
                Push to CPO queue
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ProspectQueue;

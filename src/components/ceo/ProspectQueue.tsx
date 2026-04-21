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

const STATUS_OPTIONS: ProspectStatus[] = ['new', 'attempted', 'contacted', 'qualified', 'won', 'lost', 'do_not_call'];

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

  const filteredProspects = useMemo(() => {
    return prospects.filter((p) => {
      const q = search.trim().toLowerCase();
      const searchOk = !q
        || p.business_name.toLowerCase().includes(q)
        || (p.phone || '').toLowerCase().includes(q)
        || (p.city || '').toLowerCase().includes(q);
      const statusOk = statusFilter === 'all' || p.status === statusFilter;
      const modeOk = mode === 'ceo'
        ? p.delivery_state !== 'archived'
        : p.delivery_state === 'pushed_to_cpo' || p.delivery_state === 'accepted_by_cpo';
      return searchOk && statusOk && modeOk;
    });
  }, [prospects, search, statusFilter, mode]);

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

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border bg-muted/20 p-3">
        <h3 className="text-sm font-semibold text-foreground">
          {mode === 'ceo' ? 'Prospect Push Queue (CEO)' : 'Prospect Execution Queue (CPO)'}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {mode === 'ceo'
            ? 'Import and prioritize targets, then push assigned outreach into CPO execution.'
            : 'Receive pushed targets, execute calls, and convert qualified prospects into CPO pipeline.'}
        </p>
      </div>

      {message && (
        <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground">
          {message}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-md border border-border bg-card p-3 space-y-3">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Owner User ID (Jason)</label>
            <input
              value={ownerUserId}
              onChange={(e) => setOwnerUserId(e.target.value)}
              placeholder="Optional auth user id; blank = self"
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              disabled={mode !== 'ceo'}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Business, phone, city..."
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
            />
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
            <div className="flex gap-2">
              <button
                onClick={claimNext}
                className="flex-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-1.5 text-xs font-semibold text-primary"
              >
                Load Next Call
              </button>
              <button
                onClick={loadProspects}
                className="rounded-md border border-border bg-background px-2 py-1.5 text-xs font-semibold"
              >
                Refresh
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
                  className={`w-full rounded-md border px-2 py-2 text-left ${isActive ? 'border-primary/50 bg-primary/10' : 'border-border bg-background'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-foreground">{p.business_name}</p>
                    <span className="text-[10px] text-muted-foreground">P{p.priority}</span>
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">{p.phone || 'No phone'} • {p.city || '—'}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] capitalize">{p.status.replace(/_/g, ' ')}</span>
                    {urgency && <span className="text-[10px] font-semibold text-destructive">Overdue</span>}
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

        <section className="rounded-md border border-border bg-card p-3">
          {!selected ? (
            <p className="text-xs text-muted-foreground">Select a prospect from queue.</p>
          ) : (
            <div className="space-y-3">
              <div className="rounded-md border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-foreground">{selected.business_name}</h4>
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] capitalize">
                    {selected.status.replace(/_/g, ' ')}
                  </span>
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
                  <p><span className="text-muted-foreground">Next Call:</span> {selected.next_call_at ? new Date(selected.next_call_at).toLocaleString() : '—'}</p>
                  <p><span className="text-muted-foreground">Last Contact:</span> {selected.last_contact_at ? new Date(selected.last_contact_at).toLocaleString() : '—'}</p>
                  <p><span className="text-muted-foreground">Delivery State:</span> {selected.delivery_state.replace(/_/g, ' ')}</p>
                  <p><span className="text-muted-foreground">Pipeline:</span> {selected.pipeline_partnership_id || 'Not yet'}</p>
                </div>
                {selected.notes && (
                  <p className="mt-2 text-xs text-muted-foreground">{selected.notes}</p>
                )}
              </div>

              <div className="rounded-md border border-border bg-background p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Call Actions</p>
                <div className="flex flex-wrap gap-2">
                  {mode === 'ceo' ? (
                    <button className="rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary" onClick={pushToCpo}>
                      Push to CPO queue
                    </button>
                  ) : (
                    <>
                      <button className="rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary" onClick={acceptForExecution}>
                        Accept in CPO queue
                      </button>
                      <button className="rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary" onClick={convertToPipeline}>
                        Convert to pipeline
                      </button>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-md border border-border px-2 py-1 text-xs" onClick={() => logActivity({ activityType: 'call', outcome: 'no_answer', nextStatus: 'attempted', noteText: note, followUpAtText: followUpAt || null })}>No answer</button>
                  <button className="rounded-md border border-border px-2 py-1 text-xs" onClick={() => logActivity({ activityType: 'call', outcome: 'voicemail', nextStatus: 'attempted', noteText: note, followUpAtText: followUpAt || null })}>Voicemail</button>
                  <button className="rounded-md border border-border px-2 py-1 text-xs" onClick={() => logActivity({ activityType: 'call', outcome: 'connected', nextStatus: 'contacted', noteText: note, followUpAtText: followUpAt || null })}>Connected</button>
                  <button className="rounded-md border border-border px-2 py-1 text-xs" onClick={() => logActivity({ activityType: 'status_change', outcome: 'qualified', nextStatus: 'qualified', noteText: note, followUpAtText: followUpAt || null })}>Qualified</button>
                  <button className="rounded-md border border-border px-2 py-1 text-xs" onClick={() => logActivity({ activityType: 'status_change', outcome: 'won', nextStatus: 'won', noteText: note })}>Won</button>
                  <button className="rounded-md border border-border px-2 py-1 text-xs" onClick={() => logActivity({ activityType: 'status_change', outcome: 'lost', nextStatus: 'lost', noteText: note })}>Lost</button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="datetime-local"
                    value={followUpAt}
                    onChange={(e) => setFollowUpAt(e.target.value)}
                    className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                  />
                  <button
                    className="rounded-md border border-primary/40 bg-primary/10 px-2 py-1.5 text-xs font-semibold text-primary"
                    onClick={() => logActivity({ activityType: 'note', noteText: note, followUpAtText: followUpAt || null })}
                  >
                    Save note / follow-up
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Call notes..."
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                />
              </div>

              <div className="rounded-md border border-border bg-background p-3">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Activity Timeline</p>
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {activities.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No activity yet.</p>
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
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ProspectQueue;

// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Flag, AlertTriangle, ShieldCheck, XCircle } from "lucide-react";

const STATUS_TINT: Record<string, string> = {
  pending:    "bg-amber-100 text-amber-800 border-amber-200",
  reviewing:  "bg-blue-100 text-blue-800 border-blue-200",
  upheld:     "bg-red-100 text-red-800 border-red-200",
  dismissed:  "bg-gray-100 text-gray-700 border-gray-200",
};

const SEVERITY_TINT: Record<string, string> = {
  low:      "bg-gray-100 text-gray-700",
  medium:   "bg-amber-100 text-amber-800",
  high:     "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

export default function TrustSafetyQueue() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selected, setSelected] = useState<any | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [resolutionAction, setResolutionAction] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    let q = supabase.from("trust_reports").select("*").order("created_at", { ascending: false }).limit(200);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setReports(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchReports(); }, [statusFilter]);

  const counts = useMemo(() => {
    const c = { pending: 0, reviewing: 0, upheld: 0, dismissed: 0 };
    reports.forEach((r) => { if (c[r.status] != null) c[r.status]++; });
    return c;
  }, [reports]);

  const openReview = (r: any) => {
    setSelected(r);
    setAdminNotes(r.admin_notes || "");
    setResolutionAction(r.resolution_action || "");
  };

  const saveStatus = async (status: "reviewing" | "upheld" | "dismissed") => {
    if (!selected) return;
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("trust_reports")
      .update({
        status,
        admin_notes: adminNotes,
        resolution_action: resolutionAction || null,
        resolved_by: status === "reviewing" ? null : (u.user?.id ?? null),
        resolved_at: status === "reviewing" ? null : new Date().toISOString(),
      })
      .eq("id", selected.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Marked ${status}`);
    setSelected(null);
    fetchReports();
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-orange-600" />
          <h2 className="text-lg font-semibold">Trust &amp; Safety Reports</h2>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Label htmlFor="ts-status" className="text-xs text-muted-foreground">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger id="ts-status" className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewing">Reviewing</SelectItem>
              <SelectItem value="upheld">Upheld</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchReports}>Refresh</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["pending","reviewing","upheld","dismissed"] as const).map((k) => (
          <Card key={k} className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</p>
            <p className="text-2xl font-bold tabular-nums">{counts[k]}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No reports match this filter.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">When</th>
                <th className="text-left px-3 py-2">Reporter</th>
                <th className="text-left px-3 py-2">Reported</th>
                <th className="text-left px-3 py-2">Category</th>
                <th className="text-left px-3 py-2">Severity</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Order</th>
                <th className="text-right px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2 text-xs whitespace-nowrap">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</td>
                  <td className="px-3 py-2 text-xs capitalize">{r.reporter_type}</td>
                  <td className="px-3 py-2 text-xs capitalize">{r.reported_type}</td>
                  <td className="px-3 py-2 text-xs">{r.category}</td>
                  <td className="px-3 py-2"><Badge className={`${SEVERITY_TINT[r.severity] || ""} text-[10px]`}>{r.severity}</Badge></td>
                  <td className="px-3 py-2"><Badge variant="outline" className={`${STATUS_TINT[r.status] || ""} text-[10px]`}>{r.status}</Badge></td>
                  <td className="px-3 py-2 text-[11px] font-mono text-muted-foreground">{r.order_id ? r.order_id.slice(-8).toUpperCase() : "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => openReview(r)}>Review</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Review report</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Reporter" value={`${selected.reporter_type} · ${selected.reporter_id?.slice(0,8)}`} />
                <Field label="Reported" value={`${selected.reported_type} · ${selected.reported_id?.slice(0,8)}`} />
                <Field label="Category" value={selected.category} />
                <Field label="Severity" value={selected.severity} />
                <Field label="Order" value={selected.order_id || "—"} />
                <Field label="Created" value={new Date(selected.created_at).toLocaleString()} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <p className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/30 p-2 text-sm">{selected.description}</p>
              </div>
              <div>
                <Label htmlFor="ts-notes" className="text-xs text-muted-foreground">Admin notes</Label>
                <Textarea id="ts-notes" rows={3} value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ts-action" className="text-xs text-muted-foreground">Resolution action</Label>
                <Select value={resolutionAction} onValueChange={setResolutionAction}>
                  <SelectTrigger id="ts-action"><SelectValue placeholder="No action / select…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warning_issued">Warning issued</SelectItem>
                    <SelectItem value="account_flagged">Account flagged</SelectItem>
                    <SelectItem value="account_suspended">Account suspended</SelectItem>
                    <SelectItem value="account_deactivated">Account deactivated</SelectItem>
                    <SelectItem value="no_action">No action</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={saving} onClick={() => saveStatus("reviewing")}>
              <AlertTriangle className="h-4 w-4 mr-1.5" /> Mark reviewing
            </Button>
            <Button variant="outline" disabled={saving} onClick={() => saveStatus("dismissed")}>
              <XCircle className="h-4 w-4 mr-1.5" /> Dismiss
            </Button>
            <Button disabled={saving} className="bg-orange-600 hover:bg-orange-700" onClick={() => saveStatus("upheld")}>
              <ShieldCheck className="h-4 w-4 mr-1.5" /> Uphold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-medium break-all">{value}</p>
    </div>
  );
}
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { generateInviteCode } from "@/lib/invite-code";
import cravenLogo from "@/assets/craven-logo.png";

type Invite = {
  id: string;
  access_code: string;
  email: string;
  full_name: string | null;
  status: string;
  created_at: string;
  accepted_at: string | null;
  paid_at: string | null;
  paid_amount_cents: number | null;
  expires_at: string | null;
};

export default function HubFoundationalInvitesPage() {
  const navigate = useNavigate();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [relationshipNote, setRelationshipNote] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Prevent any redirects - ensure we stay on this page
  useEffect(() => {
    const currentPath = window.location.pathname;
    console.log('[HubFoundationalInvites] Component mounted, path:', currentPath);
    
    // Verify we're on the correct route
    if (currentPath !== '/hub/foundational/invites') {
      console.log('[HubFoundationalInvites] Path mismatch detected, correcting:', currentPath, '-> /hub/foundational/invites');
      navigate('/hub/foundational/invites', { replace: true });
    } else {
      console.log('[HubFoundationalInvites] Path is correct, staying on page');
    }
  }, [navigate]);

  async function load() {
    try {
      console.log('[HubFoundationalInvites] Loading invites from Supabase');
      const { data, error } = await supabase
        .from('invites')
        .select('id, access_code, email, full_name, status, accepted_at, paid_at, paid_amount_cents, created_at, expires_at')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        console.error('[HubFoundationalInvites] Supabase error:', error);
        setErr(error.message || "Failed to load invites.");
        return;
      }

      console.log('[HubFoundationalInvites] Loaded invites:', data?.length || 0);
      setInvites(data || []);
    } catch (e: any) {
      console.error('[HubFoundationalInvites] Load error:', e);
      setErr(e.message || "Failed to load invites.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createInvite() {
    setErr(null);
    setBusy(true);
    try {
      if (!email.trim()) {
        setErr("Email is required");
        setBusy(false);
        return;
      }

      const accessCode = generateInviteCode();
      const { error } = await supabase
        .from('invites')
        .insert({
          access_code: accessCode,
          email: email.trim().toLowerCase(),
          full_name: fullName.trim() || null,
          relationship_note: relationshipNote.trim() || null,
          status: 'invited',
          min_amount_cents: 5000,
          max_amount_cents: 50000,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        });

      if (error) {
        console.error('[HubFoundationalInvites] Create error:', error);
        throw new Error(error.message || "Failed to create invite.");
      }

      setEmail("");
      setFullName("");
      setRelationshipNote("");
      setExpiresAt("");
      await load();
    } catch (e: any) {
      setErr(e.message || "Failed to create invite.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeInvite(id: string) {
    try {
      const { error } = await supabase
        .from('invites')
        .update({ status: 'revoked' })
        .eq('id', id);

      if (error) {
        console.error('[HubFoundationalInvites] Revoke error:', error);
        throw new Error(error.message || "Failed to revoke invite.");
      }

      await load();
    } catch (e: any) {
      setErr(e.message || "Failed to revoke invite.");
    }
  }

  return (
    <div className="flex h-screen w-full bg-background text-zinc-950">
      {/* Sidebar / Company Navigation */}
      <aside className="w-72 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-3 mb-4">
            <img src={cravenLogo} alt="Crave'n" className="h-7" />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Crave'n Hub
              </span>
              <span className="text-sm font-semibold">Foundational Invites</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/hub")}
            className="w-full justify-start"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Hub
          </Button>
        </div>

        <ScrollArea className="flex-1 px-3">
          <div className="space-y-4 py-4">
            <div className="pt-2 pb-1">
              <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Friends &amp; Family Support
              </h3>
            </div>

            <Button
              variant="secondary"
              className="w-full justify-start"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Foundational Invites Admin
            </Button>
          </div>
        </ScrollArea>
      </aside>

      {/* Main Portal Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Foundational Invites
              </h1>
              <p className="mt-1 text-sm text-zinc-600">
                Manual invites for friends &amp; family support. Enforced range: $50 – $500 per invite.
              </p>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)]">
            {/* Invite Creation Panel */}
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="p-6">
                <h2 className="text-sm font-semibold mb-1">Create Invite</h2>
                <p className="text-xs text-zinc-500 mb-4">
                  Create a single-use access code for a specific relationship. Codes are private and should be
                  shared directly with the recipient.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-zinc-700">Email</label>
                    <input
                      className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-950"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@email.com"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700">Full Name (optional)</label>
                    <input
                      className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-950"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Full legal name"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-zinc-700">Relationship Note (internal)</label>
                    <input
                      className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-950"
                      value={relationshipNote}
                      onChange={(e) => setRelationshipNote(e.target.value)}
                      placeholder="e.g., cousin, childhood friend, former coworker"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700">Expires At (optional)</label>
                    <input
                      type="date"
                      className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-950"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                  </div>
                </div>

                {err && <div className="mt-4 text-sm text-red-600">{err}</div>}

                <div className="mt-5 flex gap-3">
                  <Button
                    disabled={busy}
                    onClick={createInvite}
                    className="rounded-xl"
                  >
                    {busy ? "Creating…" : "Create Invite"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={load}
                    className="rounded-xl"
                  >
                    Refresh
                  </Button>
                </div>
              </div>
            </div>

            {/* Invites Table */}
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold">Invite Registry</h2>
                  <p className="text-xs text-zinc-500">
                    Total invites: <span className="font-medium text-zinc-700">{invites.length}</span>
                  </p>
                </div>

                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-zinc-500">
                      <tr className="border-b border-zinc-200">
                        <th className="py-3 text-left font-medium">Access Code</th>
                        <th className="py-3 text-left font-medium">Email</th>
                        <th className="py-3 text-left font-medium">Status</th>
                        <th className="py-3 text-left font-medium">Paid</th>
                        <th className="py-3 text-left font-medium">Created</th>
                        <th className="py-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invites.map((i) => (
                        <tr key={i.id} className="border-b border-zinc-100">
                          <td className="py-3 font-mono text-xs">{i.access_code}</td>
                          <td className="py-3">{i.email}</td>
                          <td className="py-3">
                            <span className="inline-flex rounded-lg border border-zinc-200 px-2 py-1 text-xs capitalize">
                              {i.status}
                            </span>
                          </td>
                          <td className="py-3">
                            {i.paid_amount_cents ? `$${(i.paid_amount_cents / 100).toFixed(2)}` : "—"}
                          </td>
                          <td className="py-3">{new Date(i.created_at).toLocaleString()}</td>
                          <td className="py-3 text-right">
                            {i.status !== "revoked" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => revokeInvite(i.id)}
                                className="rounded-xl"
                              >
                                Revoke
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {invites.length === 0 && (
                        <tr>
                          <td className="py-6 text-zinc-500 text-center" colSpan={6}>
                            No invites yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 text-xs text-zinc-500">
                  Share access codes directly with trusted contacts. Do not post codes publicly or in any marketing.
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


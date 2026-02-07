import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, DollarSign, Activity, Eye, Clock, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { generateInviteCode } from "@/lib/invite-code";
import { toast } from "sonner";
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
  access_count: number | null;
  last_accessed_at: string | null;
};

type AccessLog = {
  id: string;
  invite_id: string;
  email: string;
  accessed_at: string;
  ip_address: string | null;
  user_agent: string | null;
  page_accessed: string | null;
};

// Helper to parse user agent string into readable format
function parseUserAgent(ua: string): string {
  if (ua.includes('Chrome') && !ua.includes('Edge')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  if (ua.includes('Mobile')) return 'Mobile Browser';
  return 'Browser';
}

export default function HubFoundationalInvitesPage() {
  const navigate = useNavigate();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [relationshipNote, setRelationshipNote] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selectedInviteId, setSelectedInviteId] = useState<string | null>(null);
  const [showAccessLogs, setShowAccessLogs] = useState(false);
  
  // Reminder state
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  
  // Email tester state
  const [testEmail, setTestEmail] = useState("");
  const [testBusy, setTestBusy] = useState(false);
  const [testErr, setTestErr] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [testEmailType, setTestEmailType] = useState<"confirmation" | "invite">("confirmation");

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
        .select('id, access_code, email, full_name, status, accepted_at, paid_at, paid_amount_cents, created_at, expires_at, access_count, last_accessed_at')
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

  async function loadAccessLogs(inviteId?: string) {
    try {
      console.log('[HubFoundationalInvites] Loading access logs');
      let query = supabase
        .from('foundational_access_logs')
        .select('id, invite_id, email, accessed_at, ip_address, user_agent, page_accessed')
        .order('accessed_at', { ascending: false })
        .limit(100);

      if (inviteId) {
        query = query.eq('invite_id', inviteId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[HubFoundationalInvites] Access logs error:', error);
        return;
      }

      console.log('[HubFoundationalInvites] Loaded access logs:', data?.length || 0);
      setAccessLogs(data || []);
    } catch (e: any) {
      console.error('[HubFoundationalInvites] Access logs load error:', e);
    }
  }

  useEffect(() => {
    load();
    loadAccessLogs();
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
      const inviteEmail = email.trim().toLowerCase();
      const inviteName = fullName.trim() || null;
      
      const { error } = await supabase
        .from('invites')
        .insert({
          access_code: accessCode,
          email: inviteEmail,
          full_name: inviteName,
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

      // Send invite email
      try {
        const { error: emailError } = await supabase.functions.invoke(
          "send-foundational-invite-email",
          {
            body: {
              inviteeName: inviteName || "there",
              inviteeEmail: inviteEmail,
              accessCode: accessCode,
            },
          }
        );

        if (emailError) {
          console.error('[HubFoundationalInvites] Error sending invite email:', emailError);
          // Don't fail the invite creation if email fails
        } else {
          console.log('[HubFoundationalInvites] Invite email sent successfully');
        }
      } catch (emailErr) {
        console.error('[HubFoundationalInvites] Unexpected error sending invite email:', emailErr);
        // Don't fail the invite creation if email fails
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
      toast.success("Invite revoked successfully");
    } catch (e: any) {
      setErr(e.message || "Failed to revoke invite.");
      toast.error("Failed to revoke invite");
    }
  }

  async function sendTestEmail() {
    setTestErr(null);
    setTestSuccess(null);
    setTestBusy(true);
    
    try {
      if (!testEmail.trim()) {
        setTestErr("Email is required");
        setTestBusy(false);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(testEmail.trim())) {
        setTestErr("Please enter a valid email address");
        setTestBusy(false);
        return;
      }

      console.log('[HubFoundationalInvites] Sending test', testEmailType, 'email to:', testEmail);

      if (testEmailType === "confirmation") {
        // Mock data for the confirmation email (no attachments for test)
        const mockData = {
          contributorName: "Jordan Smith",
          contributorEmail: testEmail.trim(),
          sharesIssued: 2500,
          certificateNumber: "CS-2025-001",
          issueDate: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          amountDollars: "$250.00",
          documents: [], // No attachments for test emails
        };

        const { data, error } = await supabase.functions.invoke(
          "send-foundational-confirmation-email",
          {
            body: mockData,
          }
        );

        if (error) {
          console.error('[HubFoundationalInvites] Test confirmation email error:', error);
          throw new Error(error.message || "Failed to send test email");
        }

        console.log('[HubFoundationalInvites] Test confirmation email sent successfully:', data);
        setTestSuccess(`Test confirmation email sent successfully to ${testEmail.trim()}!`);
      } else {
        // Mock data for the invite email
        const mockData = {
          inviteeName: "Jordan Smith",
          inviteeEmail: testEmail.trim(),
          accessCode: "CRV-TEST-XXXX-XXXX",
        };

        const { data, error } = await supabase.functions.invoke(
          "send-foundational-invite-email",
          {
            body: mockData,
          }
        );

        if (error) {
          console.error('[HubFoundationalInvites] Test invite email error:', error);
          throw new Error(error.message || "Failed to send test email");
        }

        console.log('[HubFoundationalInvites] Test invite email sent successfully:', data);
        setTestSuccess(`Test invite email sent successfully to ${testEmail.trim()}!`);
      }

      setTestEmail("");
    } catch (e: any) {
      console.error('[HubFoundationalInvites] Test email exception:', e);
      setTestErr(e.message || "Failed to send test email");
    } finally {
      setTestBusy(false);
    }
  }

  async function sendReminder(invite: Invite) {
    if (invite.status === 'revoked') {
      toast.error("Cannot send reminder to revoked invite");
      return;
    }
    
    if (invite.paid_at) {
      toast.error("This invite has already been paid");
      return;
    }

    setSendingReminderId(invite.id);
    
    try {
      console.log('[HubFoundationalInvites] Sending reminder to:', invite.email);
      
      const { data, error } = await supabase.functions.invoke(
        "send-foundational-invite-email",
        {
          body: {
            inviteeName: invite.full_name || "there",
            inviteeEmail: invite.email,
            accessCode: invite.access_code,
          },
        }
      );

      if (error) {
        console.error('[HubFoundationalInvites] Reminder email error:', error);
        throw new Error(error.message || "Failed to send reminder");
      }

      console.log('[HubFoundationalInvites] Reminder sent successfully:', data);
      toast.success(`Reminder sent to ${invite.email}`);
      
      // Reload to refresh any updated data
      await load();
    } catch (e: any) {
      console.error('[HubFoundationalInvites] Reminder exception:', e);
      toast.error(e.message || "Failed to send reminder");
    } finally {
      setSendingReminderId(null);
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

          {/* Create Invite Panel - Compact on top */}
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm mb-6">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold">Create Invite</h2>
                  <p className="text-xs text-zinc-500">
                    Single-use access codes for friends &amp; family.
                  </p>
                </div>
                <div className="flex gap-2">
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

              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <label className="text-xs font-medium text-zinc-700">Email</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-950"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@email.com"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-700">Full Name (optional)</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-950"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full legal name"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-700">Relationship Note (internal)</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-950"
                    value={relationshipNote}
                    onChange={(e) => setRelationshipNote(e.target.value)}
                    placeholder="e.g., cousin, friend"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-700">Expires At (optional)</label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-950"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              </div>

              {err && <div className="mt-3 text-sm text-red-600">{err}</div>}
            </div>
          </div>

          {/* Invites Registry - Full Width */}
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
                        <th className="py-3 text-left font-medium">Access Count</th>
                        <th className="py-3 text-left font-medium">Last Accessed</th>
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
                            {i.access_count ? (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-200 px-2 py-1 text-xs font-medium text-blue-700">
                                {i.access_count} {i.access_count === 1 ? 'time' : 'times'}
                              </span>
                            ) : (
                              <span className="text-zinc-400 text-xs">Never</span>
                            )}
                          </td>
                          <td className="py-3">
                            {i.last_accessed_at ? (
                              <span className="text-xs" title={new Date(i.last_accessed_at).toLocaleString()}>
                                {new Date(i.last_accessed_at).toLocaleDateString()} {new Date(i.last_accessed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            ) : (
                              <span className="text-zinc-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-3">
                            {i.paid_amount_cents ? `$${(i.paid_amount_cents / 100).toFixed(2)}` : "—"}
                          </td>
                          <td className="py-3">{new Date(i.created_at).toLocaleString()}</td>
                          <td className="py-3 text-right space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedInviteId(i.id);
                                loadAccessLogs(i.id);
                                setShowAccessLogs(true);
                              }}
                              className="rounded-xl"
                              title="View access history"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {i.status !== "revoked" && !i.paid_at && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => sendReminder(i)}
                                disabled={sendingReminderId === i.id}
                                className="rounded-xl text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                title="Send reminder email"
                              >
                                {sendingReminderId === i.id ? (
                                  <Send className="h-4 w-4 animate-pulse" />
                                ) : (
                                  <Mail className="h-4 w-4" />
                                )}
                              </Button>
                            )}
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
                          <td className="py-6 text-muted-foreground text-center" colSpan={8}>
                            No invites yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 text-xs text-muted-foreground">
                  Share access codes directly with trusted contacts. Do not post codes publicly or in any marketing.
                </div>
              </div>
            </div>

          {/* Access Activity Log Panel */}
          <div className="mt-6">
            <div className="rounded-2xl border border-border bg-card shadow-sm">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-primary" />
                    <div>
                      <h2 className="text-sm font-semibold">Access Activity Log</h2>
                      <p className="text-xs text-muted-foreground">
                        Track who has accessed their invite codes and when.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedInviteId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedInviteId(null);
                          loadAccessLogs();
                        }}
                        className="rounded-xl text-xs"
                      >
                        Show All
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadAccessLogs(selectedInviteId || undefined)}
                      className="rounded-xl text-xs"
                    >
                      Refresh
                    </Button>
                  </div>
                </div>

                {selectedInviteId && (
                  <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20">
                    <p className="text-xs font-medium text-primary">
                      Filtering by invite: {invites.find(inv => inv.id === selectedInviteId)?.email || selectedInviteId}
                    </p>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr className="border-b border-border">
                        <th className="py-3 text-left font-medium">Email</th>
                        <th className="py-3 text-left font-medium">Accessed At</th>
                        <th className="py-3 text-left font-medium">Page</th>
                        <th className="py-3 text-left font-medium">IP Address</th>
                        <th className="py-3 text-left font-medium">Browser</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accessLogs.map((log) => (
                        <tr key={log.id} className="border-b border-border/50">
                          <td className="py-3 font-medium">{log.email}</td>
                          <td className="py-3">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>
                                {new Date(log.accessed_at).toLocaleDateString()}{' '}
                                {new Date(log.accessed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </td>
                          <td className="py-3">
                            <span className="inline-flex rounded-lg border border-border px-2 py-1 text-xs capitalize">
                              {log.page_accessed || 'access'}
                            </span>
                          </td>
                          <td className="py-3 font-mono text-xs">
                            {log.ip_address || '—'}
                          </td>
                          <td className="py-3 text-xs max-w-[200px] truncate" title={log.user_agent || ''}>
                            {log.user_agent ? parseUserAgent(log.user_agent) : '—'}
                          </td>
                        </tr>
                      ))}
                      {accessLogs.length === 0 && (
                        <tr>
                          <td className="py-8 text-muted-foreground text-center" colSpan={5}>
                            <div className="flex flex-col items-center gap-2">
                              <Activity className="h-8 w-8 text-muted-foreground/50" />
                              <p>No access activity recorded yet.</p>
                              <p className="text-xs">Access events will appear here when invitees use their codes.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {accessLogs.length > 0 && (
                  <div className="mt-4 text-xs text-muted-foreground">
                    Showing {accessLogs.length} access event{accessLogs.length !== 1 ? 's' : ''}.
                    {selectedInviteId ? ' Click "Show All" to see all invites.' : ''}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Email Tester Panel */}
          <div className="mt-8">
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="p-6">
                <h2 className="text-sm font-semibold mb-1">Email Tester</h2>
                <p className="text-xs text-zinc-500 mb-4">
                  Send test emails with mock data to any email address. Useful for previewing email templates.
                </p>

                {/* Email Type Selector */}
                <div className="mb-4 flex gap-2">
                  <Button
                    variant={testEmailType === "confirmation" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setTestEmailType("confirmation");
                      setTestErr(null);
                      setTestSuccess(null);
                    }}
                    className="rounded-xl"
                  >
                    Confirmation Email
                  </Button>
                  <Button
                    variant={testEmailType === "invite" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setTestEmailType("invite");
                      setTestErr(null);
                      setTestSuccess(null);
                    }}
                    className="rounded-xl"
                  >
                    Invite Email
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-zinc-700">Test Email Address</label>
                    <input
                      className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-950"
                      value={testEmail}
                      onChange={(e) => {
                        setTestEmail(e.target.value);
                        setTestErr(null);
                        setTestSuccess(null);
                      }}
                      placeholder="your-email@example.com"
                      type="email"
                    />
                  </div>

                  {testEmailType === "confirmation" ? (
                    <div className="sm:col-span-2 p-4 rounded-xl bg-amber-50 border border-amber-200">
                      <h3 className="text-xs font-semibold text-amber-900 mb-2">Confirmation Email - Mock Data Preview</h3>
                      <div className="text-xs text-amber-800 space-y-1">
                        <div><strong>Name:</strong> Jordan Smith</div>
                        <div><strong>Shares:</strong> 2,500</div>
                        <div><strong>Certificate:</strong> CS-2025-001</div>
                        <div><strong>Amount:</strong> $250.00</div>
                        <div><strong>Note:</strong> Test emails are sent without PDF attachments</div>
                      </div>
                    </div>
                  ) : (
                    <div className="sm:col-span-2 p-4 rounded-xl bg-blue-50 border border-blue-200">
                      <h3 className="text-xs font-semibold text-blue-900 mb-2">Invite Email - Mock Data Preview</h3>
                      <div className="text-xs text-blue-800 space-y-1">
                        <div><strong>Name:</strong> Jordan Smith</div>
                        <div><strong>Email:</strong> {testEmail || "your-email@example.com"}</div>
                        <div><strong>Access Code:</strong> CRV-TEST-XXXX-XXXX</div>
                        <div><strong>Note:</strong> This email includes the access code and instructions for registry access</div>
                      </div>
                    </div>
                  )}
                </div>

                {testErr && (
                  <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-sm text-red-600">{testErr}</p>
                  </div>
                )}

                {testSuccess && (
                  <div className="mt-4 p-3 rounded-xl bg-green-50 border border-green-200">
                    <p className="text-sm text-green-600">{testSuccess}</p>
                  </div>
                )}

                <div className="mt-5">
                  <Button
                    disabled={testBusy}
                    onClick={sendTestEmail}
                    className="rounded-xl"
                  >
                    {testBusy ? "Sending…" : `Send Test ${testEmailType === "confirmation" ? "Confirmation" : "Invite"} Email`}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [relationshipNote, setRelationshipNote] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/hub/invites/list");
      const data = await res.json();
      if (data.error) {
        setErr(data.error);
        return;
      }
      setInvites(data.invites || []);
    } catch (e: any) {
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
      const res = await fetch("/api/hub/invites/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          fullName,
          relationshipNote,
          expiresAt: expiresAt || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create invite.");
      setEmail("");
      setFullName("");
      setRelationshipNote("");
      setExpiresAt("");
      await load();
    } catch (e: any) {
      setErr(e.message || "Failed.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeInvite(id: string) {
    try {
      const res = await fetch("/api/hub/invites/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to revoke invite.");
      }
      await load();
    } catch (e: any) {
      setErr(e.message || "Failed to revoke invite.");
    }
  }

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Crave'n Hub</div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Foundational Invites</h1>
            <p className="mt-2 text-sm text-zinc-600">Manual invite issuance. $50 min. $500 max.</p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="p-6">
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
              <button
                disabled={busy}
                onClick={createInvite}
                className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                {busy ? "Creating…" : "Create Invite"}
              </button>
              <button
                onClick={load}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium hover:border-zinc-950"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="p-6">
            <div className="text-sm font-semibold">Invites</div>

            <div className="mt-4 overflow-x-auto">
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
                        <span className="inline-flex rounded-lg border border-zinc-200 px-2 py-1 text-xs">
                          {i.status}
                        </span>
                      </td>
                      <td className="py-3">
                        {i.paid_amount_cents ? `$${(i.paid_amount_cents / 100).toFixed(2)}` : "—"}
                      </td>
                      <td className="py-3">{new Date(i.created_at).toLocaleString()}</td>
                      <td className="py-3 text-right">
                        {i.status !== "revoked" && (
                          <button
                            onClick={() => revokeInvite(i.id)}
                            className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium hover:border-zinc-950"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {invites.length === 0 && (
                    <tr>
                      <td className="py-6 text-zinc-500" colSpan={6}>
                        No invites yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-xs text-zinc-500">
              Share access codes directly. Do not post codes publicly.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


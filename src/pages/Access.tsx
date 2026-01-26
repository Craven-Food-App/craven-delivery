import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Access() {
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const res = await fetch("/api/support/verify-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessCode: accessCode.toUpperCase().trim(),
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Invalid access code or email.");
      }

      // Store invite info in sessionStorage for allocate page
      sessionStorage.setItem("invite_session", JSON.stringify({
        inviteId: data.invite.id,
        email: data.invite.email,
        minAmount: data.invite.min_amount_cents,
        maxAmount: data.invite.max_amount_cents,
      }));

      navigate(`/allocate?invite_id=${data.invite.id}`);
    } catch (e: any) {
      setError(e.message || "Unable to verify access.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <div className="mx-auto max-w-md px-6 py-16">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Access Portal</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Enter your invitation code and email
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-700">Access Code</label>
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              placeholder="CRV-XXXX-XXXX-XXXX"
              className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm font-mono outline-none focus:border-zinc-950"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@email.com"
              className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-950"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-700">
              Relationship (optional)
            </label>
            <input
              type="text"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="e.g., friend, family member, colleague"
              className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-950"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-zinc-950 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {busy ? "Verifying..." : "Continue"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/support")}
            className="text-sm text-zinc-500 hover:text-zinc-950"
          >
            ← Back to Support
          </button>
        </div>
      </div>
    </div>
  );
}


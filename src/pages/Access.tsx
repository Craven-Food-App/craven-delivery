import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Mail, Key, ArrowRight, ArrowLeft, AlertCircle } from "lucide-react";
import { supportApi } from "@/lib/api-client";

export default function Access() {
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const response = await supportApi.verifyAccess(accessCode, email);

      if (!response.ok) {
        setError(response.error || "Invalid access code or email.");
        return;
      }

      // Store invite info in sessionStorage for allocate page
      sessionStorage.setItem("invite_session", JSON.stringify({
        inviteId: response.data.invite.id,
        email: response.data.invite.email,
        minAmount: response.data.invite.min_amount_cents,
        maxAmount: response.data.invite.max_amount_cents,
      }));

      navigate(`/allocate?invite_id=${response.data.invite.id}`);
    } catch (e: any) {
      setError(e.message || "Unable to verify access.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-[hsl(var(--primary))] via-[hsl(14_95%_48%)] to-[hsl(14_90%_53%)]">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
          <div className="text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
              <Shield className="h-4 w-4" />
              <span>Secure Access</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Access Portal
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/90">
              Enter your invitation code and email to continue
            </p>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="mx-auto max-w-md px-6 py-12">
        <div className="rounded-2xl bg-card p-8 shadow-lg ring-1 ring-border">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="accessCode" className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <Key className="h-4 w-4 text-[hsl(var(--primary))]" />
                Access Code
              </label>
              <input
                id="accessCode"
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="CRV-XXXX-XXXX-XXXX"
                className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-mono outline-none transition-colors focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/20"
                required
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Format: CRV-XXXX-XXXX-XXXX
              </p>
            </div>

            <div>
              <label htmlFor="email" className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <Mail className="h-4 w-4 text-[hsl(var(--primary))]" />
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@email.com"
                className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/20"
                required
                autoComplete="email"
              />
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-xl bg-destructive/10 p-4 text-sm text-destructive ring-1 ring-destructive/20">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="group w-full rounded-xl bg-[hsl(var(--primary))] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:bg-[hsl(14_95%_48%)] hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:ring-offset-2"
            >
              {busy ? (
                <span className="flex items-center justify-center">
                  <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border">
            <button
              onClick={() => navigate("/support")}
              className="flex w-full items-center justify-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Support
            </button>
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-6 rounded-xl bg-muted/50 p-4 text-center">
          <p className="text-xs text-muted-foreground">
            <Shield className="mr-1 inline h-3 w-3" />
            Your information is secure and encrypted
          </p>
        </div>
      </div>
    </div>
  );
}

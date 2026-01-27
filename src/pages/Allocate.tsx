import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DollarSign, CheckCircle2, AlertCircle, ArrowRight, Lock } from "lucide-react";

export default function Allocate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [inviteSession, setInviteSession] = useState<any>(null);
  const [amount, setAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Load invite session from sessionStorage
    const session = sessionStorage.getItem("invite_session");
    if (!session) {
      navigate("/access");
      return;
    }

    try {
      const parsed = JSON.parse(session);
      setInviteSession(parsed);
    } catch {
      navigate("/access");
    }
  }, [navigate]);

  const handleAmountSelect = (value: number) => {
    setAmount(value);
    setCustomAmount("");
  };

  const handleCustomAmount = (value: string) => {
    setCustomAmount(value);
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 50 && num <= 500) {
      setAmount(num);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accepted) {
      setError("Please accept the terms to continue.");
      return;
    }

    if (!inviteSession) {
      setError("Session expired. Please start over.");
      navigate("/access");
      return;
    }

    const finalAmount = amount;
    if (finalAmount < inviteSession.minAmount / 100 || finalAmount > inviteSession.maxAmount / 100) {
      setError(`Amount must be between $${(inviteSession.minAmount / 100).toFixed(2)} and $${(inviteSession.maxAmount / 100).toFixed(2)}.`);
      return;
    }

    setError(null);
    setBusy(true);

    try {
      const res = await fetch("/api/support/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteId: inviteSession.inviteId,
          amountCents: Math.round(finalAmount * 100),
          email: inviteSession.email,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unable to create checkout session.");
      }

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("No checkout URL received.");
      }
    } catch (e: any) {
      setError(e.message || "Unable to proceed to payment.");
      setBusy(false);
    }
  };

  if (!inviteSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--primary))]/10">
            <svg className="h-6 w-6 animate-spin text-[hsl(var(--primary))]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const presetAmounts = [50, 100, 250, 500];
  const minAmount = inviteSession.minAmount / 100;
  const maxAmount = inviteSession.maxAmount / 100;
  const amountCents = Math.round(amount * 100);
  const minAmountCents = inviteSession.minAmount;
  const maxAmountCents = inviteSession.maxAmount;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-[hsl(var(--primary))] via-[hsl(14_95%_48%)] to-[hsl(14_90%_53%)]">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
          <div className="text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
              <DollarSign className="h-4 w-4" />
              <span>Select Amount</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Choose Your Support Amount
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/90">
              Select an amount between ${minAmount.toFixed(2)} and ${maxAmount.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="rounded-2xl bg-card p-8 shadow-lg ring-1 ring-border">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Preset Amounts */}
            <div>
              <label className="mb-4 block text-sm font-medium text-foreground">
                Quick Select
              </label>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {presetAmounts.map((preset) => {
                  const isValid = preset >= minAmount && preset <= maxAmount;
                  if (!isValid) return null;
                  const isSelected = amount === preset && !customAmount;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleAmountSelect(preset)}
                      className={`group relative rounded-xl border-2 px-4 py-4 text-base font-semibold transition-all ${
                        isSelected
                          ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white shadow-lg scale-105"
                          : "border-border bg-background text-foreground hover:border-[hsl(var(--primary))] hover:scale-105"
                      }`}
                    >
                      ${preset}
                      {isSelected && (
                        <CheckCircle2 className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-white text-[hsl(var(--primary))]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Amount */}
            <div>
              <label htmlFor="customAmount" className="mb-2 block text-sm font-medium text-foreground">
                Or Enter Custom Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">
                  $
                </span>
                <input
                  id="customAmount"
                  type="number"
                  value={customAmount}
                  onChange={(e) => handleCustomAmount(e.target.value)}
                  min={minAmount}
                  max={maxAmount}
                  step="1"
                  placeholder="Enter amount"
                  className="w-full rounded-xl border border-input bg-background pl-8 pr-4 py-3 text-base font-medium outline-none transition-colors focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/20"
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Minimum: ${minAmount.toFixed(2)} • Maximum: ${maxAmount.toFixed(2)}
              </p>
            </div>

            {/* Selected Amount Display */}
            {amount > 0 && (
              <div className="rounded-xl bg-[hsl(var(--primary))]/10 p-4 text-center ring-1 ring-[hsl(var(--primary))]/20">
                <p className="text-sm text-muted-foreground">Your Support Amount</p>
                <p className="mt-1 text-3xl font-bold text-[hsl(var(--primary))]">
                  ${amount.toFixed(2)}
                </p>
              </div>
            )}

            {/* Foundational Support Breakdown (securities-neutral) */}
            {amount > 0 && (
              <div className="rounded-2xl border border-border bg-muted/40 p-4">
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  Foundational Support Breakdown
                </h3>
                <dl className="space-y-1 text-sm text-foreground">
                  <div className="flex justify-between">
                    <dt>Your selected amount</dt>
                    <dd>${(amountCents / 100).toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Minimum for this invitation</dt>
                    <dd>${(minAmountCents / 100).toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Maximum for this invitation</dt>
                    <dd>${(maxAmountCents / 100).toFixed(2)}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs text-muted-foreground">
                  This is a private friends &amp; family support program for Crave&apos;n Inc.
                  It is not a public offering. Any additional recognition or benefits from
                  this support are documented separately by Crave&apos;n.
                </p>
              </div>
            )}

            {/* Terms Acceptance */}
            <div className="rounded-xl border border-border bg-muted/50 p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="accept"
                  checked={accepted}
                  onChange={(e) => {
                    setAccepted(e.target.checked);
                    setError(null);
                  }}
                  className="mt-1 h-4 w-4 rounded border-input text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
                />
                <label htmlFor="accept" className="flex-1 text-sm leading-6 text-foreground">
                  I understand this is a friends & family support contribution and I have received the necessary documentation.
                </label>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-xl bg-destructive/10 p-4 text-sm text-destructive ring-1 ring-destructive/20">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !accepted || amount < minAmount || amount > maxAmount}
              className="group w-full rounded-xl bg-[hsl(var(--primary))] px-6 py-4 text-base font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:bg-[hsl(14_95%_48%)] hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:ring-offset-2"
            >
              {busy ? (
                <span className="flex items-center justify-center">
                  <svg className="mr-2 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <Lock className="mr-2 h-5 w-5" />
                  Continue to Secure Payment
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Security Note */}
        <div className="mt-6 rounded-xl bg-muted/50 p-4 text-center">
          <p className="text-xs text-muted-foreground">
            <Lock className="mr-1 inline h-3 w-3" />
            Secure payment processing powered by Stripe
          </p>
        </div>
      </div>
    </div>
  );
}

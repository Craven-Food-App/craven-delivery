import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DollarSign, CheckCircle2, AlertCircle, ArrowRight, Lock } from "lucide-react";
import { supportApi } from "@/lib/api-client";
import foundationalSupportAmountHero from "@/assets/foundational_support_amount.png";

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
      const response = await supportApi.createCheckout(
        inviteSession.inviteId,
        Math.round(finalAmount * 100),
        inviteSession.email
      );

      if (!response.ok) {
        setError(response.error || "Unable to create checkout session.");
        return;
      }

      // Redirect to Stripe Checkout
      if (response.data.checkoutUrl) {
        window.location.href = response.data.checkoutUrl;
      } else {
        setError("No checkout URL received.");
      }
    } catch (e: any) {
      setError(e.message || "Unable to proceed to payment.");
    } finally {
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

  // Tiered equity structure - Fixed share amounts
  const TOTAL_AUTHORIZED_SHARES = 70000000; // 70M shares
  
  const getEquityForAmount = (amount: number): { shares: number; percentage: number; tier: string } => {
    if (amount >= 500) {
      // Tier 4: $500+ → 15,000 shares at 0.0214%
      return { shares: 15000, percentage: 0.021428, tier: "Founder's Circle" };
    } else if (amount >= 250) {
      // Tier 3: $250-$499 → 7,500 shares at 0.0107%
      return { shares: 7500, percentage: 0.010714, tier: "Executive Tier" };
    } else if (amount >= 100) {
      // Tier 2: $100-$249 → 2,500 shares at 0.0036%
      return { shares: 2500, percentage: 0.003571, tier: "Partner Tier" };
    } else {
      // Tier 1: $50-$99 → 1,000 shares at 0.0014%
      return { shares: 1000, percentage: 0.001429, tier: "Supporter Tier" };
    }
  };

  const { shares: sharesAllocated, percentage: equityPercentage, tier: equityTier } = getEquityForAmount(amount);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${foundationalSupportAmountHero})`,
          }}
        />
        
        <div className="relative mx-auto max-w-7xl px-6 py-16 sm:py-20 md:py-24 lg:py-28">
        </div>
      </section>

      {/* Subtitle Section */}
      <div className="mx-auto max-w-7xl px-6 pt-8 pb-4">
        <p className="mx-auto max-w-xl text-center text-base text-black sm:text-lg md:text-xl">
          Select an amount between ${minAmount.toFixed(2)} and ${maxAmount.toFixed(2)}
        </p>
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

            {/* Investment Breakdown */}
            {amount > 0 && (
              <div className="rounded-2xl border border-border bg-muted/40 p-6">
                <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-[hsl(var(--primary))]" />
                  Your Investment Breakdown
                </h3>
                
                <div className="space-y-4">
                  {/* Contribution Amount */}
                  <div className="rounded-lg bg-background p-4 border border-border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-muted-foreground">Contribution Amount</span>
                      <span className="text-2xl font-bold text-[hsl(var(--primary))]">${amount.toFixed(2)}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-border">
                      <span className="text-xs text-muted-foreground">Tier: </span>
                      <span className="text-xs font-semibold text-[hsl(var(--primary))]">{equityTier}</span>
                    </div>
                  </div>

                  {/* Equity Allocation */}
                  <div className="rounded-lg bg-background p-4 border border-border">
                    <h4 className="text-sm font-semibold text-foreground mb-3">Equity Allocation</h4>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Equity Percentage</dt>
                        <dd className="font-medium text-foreground">{equityPercentage.toFixed(4)}%</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Number of Shares</dt>
                        <dd className="font-medium text-foreground">
                          {sharesAllocated.toLocaleString()}
                        </dd>
                      </div>
                      <div className="pt-2 border-t border-border">
                        <div className="flex justify-between items-center">
                          <dt className="text-sm font-medium text-foreground">Total Investment Value</dt>
                          <dd className="text-lg font-bold text-[hsl(var(--primary))]">${amount.toFixed(2)}</dd>
                        </div>
                      </div>
                    </dl>
                  </div>

                  {/* Tier Comparison */}
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-4 border border-blue-200 dark:border-blue-800">
                    <h4 className="text-sm font-semibold text-foreground mb-2">Investment Tiers</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className={amount >= 50 && amount < 100 ? "font-semibold text-[hsl(var(--primary))]" : "text-muted-foreground"}>
                          $50 - $99
                        </span>
                        <span className={amount >= 50 && amount < 100 ? "font-semibold text-[hsl(var(--primary))]" : "text-muted-foreground"}>
                          0.0014% equity (1,000 shares)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={amount >= 100 && amount < 250 ? "font-semibold text-[hsl(var(--primary))]" : "text-muted-foreground"}>
                          $100 - $249
                        </span>
                        <span className={amount >= 100 && amount < 250 ? "font-semibold text-[hsl(var(--primary))]" : "text-muted-foreground"}>
                          0.0036% equity (2,500 shares)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={amount >= 250 && amount < 500 ? "font-semibold text-[hsl(var(--primary))]" : "text-muted-foreground"}>
                          $250 - $499
                        </span>
                        <span className={amount >= 250 && amount < 500 ? "font-semibold text-[hsl(var(--primary))]" : "text-muted-foreground"}>
                          0.0107% equity (7,500 shares)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={amount >= 500 ? "font-semibold text-[hsl(var(--primary))]" : "text-muted-foreground"}>
                          $500+
                        </span>
                        <span className={amount >= 500 ? "font-semibold text-[hsl(var(--primary))]" : "text-muted-foreground"}>
                          0.0214% equity (15,000 shares)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Terms & Conditions */}
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-4 border border-amber-200 dark:border-amber-800">
                    <h4 className="text-sm font-semibold text-foreground mb-2">Important Information</h4>
                    <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                      <li>Equity allocation is based on your contribution tier</li>
                      <li>Shares are subject to the terms outlined in your investment documentation</li>
                      <li>Vesting schedule and additional terms will be detailed in your grant agreement</li>
                      <li>This is a private friends & family offering, not a public securities offering</li>
                    </ul>
                  </div>

                  {/* Limits */}
                  <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                    <span>Minimum: ${minAmount.toFixed(2)}</span>
                    <span>Maximum: ${maxAmount.toFixed(2)}</span>
                  </div>
                </div>
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

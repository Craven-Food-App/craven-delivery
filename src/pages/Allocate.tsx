import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

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
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-600">Loading...</p>
        </div>
      </div>
    );
  }

  const presetAmounts = [50, 100, 250, 500];
  const minAmount = inviteSession.minAmount / 100;
  const maxAmount = inviteSession.maxAmount / 100;

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Select Amount</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Choose your support amount (${minAmount.toFixed(2)} - ${maxAmount.toFixed(2)})
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {presetAmounts.map((preset) => {
              const isValid = preset >= minAmount && preset <= maxAmount;
              if (!isValid) return null;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleAmountSelect(preset)}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                    amount === preset && !customAmount
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-200 hover:border-zinc-950"
                  }`}
                >
                  ${preset}
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            <label className="text-xs font-medium text-zinc-700">Custom Amount</label>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-zinc-500">$</span>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => handleCustomAmount(e.target.value)}
                min={minAmount}
                max={maxAmount}
                step="1"
                placeholder="Enter amount"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-950"
              />
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Minimum: ${minAmount.toFixed(2)} | Maximum: ${maxAmount.toFixed(2)}
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="accept"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5"
              />
              <label htmlFor="accept" className="text-sm text-zinc-700">
                I understand this is a friends & family support contribution and not an investment or equity offering.
              </label>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !accepted || amount < minAmount || amount > maxAmount}
            className="mt-6 w-full rounded-xl bg-zinc-950 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {busy ? "Processing..." : "Continue to Payment"}
          </button>
        </form>
      </div>
    </div>
  );
}


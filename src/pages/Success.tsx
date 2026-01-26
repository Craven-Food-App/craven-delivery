import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Home, Heart, ArrowRight } from "lucide-react";

export default function Success() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const inviteId = searchParams.get("invite_id");

  useEffect(() => {
    // Clear invite session
    sessionStorage.removeItem("invite_session");
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted">
      {/* Success Section */}
      <div className="mx-auto max-w-2xl px-6 py-24 sm:py-32">
        <div className="text-center">
          {/* Success Icon */}
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-[hsl(var(--secondary))]/20 ring-8 ring-[hsl(var(--secondary))]/10">
            <CheckCircle2 className="h-12 w-12 text-[hsl(var(--secondary))]" />
          </div>

          {/* Success Message */}
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Thank You!
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
            Your support contribution has been received successfully. We're grateful for your support of Crave'n.
          </p>

          {/* Confirmation Details */}
          <div className="mx-auto mt-8 max-w-md rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Heart className="h-4 w-4 text-[hsl(var(--primary))]" />
              <span>Payment confirmed</span>
            </div>
            {sessionId && (
              <p className="mt-2 text-xs font-mono text-muted-foreground">
                Session: {sessionId.slice(0, 20)}...
              </p>
            )}
          </div>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={() => navigate("/")}
              className="group flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:scale-105 hover:bg-[hsl(14_95%_48%)] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:ring-offset-2"
            >
              <Home className="h-5 w-5" />
              Return to Home
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* Thank You Message */}
          <div className="mx-auto mt-12 max-w-md rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))]/10 to-[hsl(var(--secondary))]/10 p-6 text-center ring-1 ring-border">
            <p className="text-sm leading-6 text-foreground">
              Your contribution helps us continue building the future of local food delivery. 
              We couldn't do this without friends and family like you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

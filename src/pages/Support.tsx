import { useNavigate } from "react-router-dom";
import { Heart, Shield, Users, ArrowRight } from "lucide-react";

export default function Support() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[hsl(var(--primary))] via-[hsl(14_95%_48%)] to-[hsl(14_90%_53%)]">
        <div 
          className="absolute inset-0 opacity-20" 
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        />
        
        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:py-40">
          <div className="text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
              <Heart className="h-4 w-4" />
              <span>Friends & Family Support</span>
            </div>
            
            <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Support <span className="text-white/90">Crave'n</span>
            </h1>
            
            <p className="mx-auto mt-6 max-w-2xl text-xl leading-8 text-white/90 sm:text-2xl">
              Join our friends and family in supporting the future of local food delivery
            </p>
            
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <button
                onClick={() => navigate("/access")}
                className="group rounded-xl bg-white px-8 py-4 text-base font-semibold text-[hsl(var(--primary))] shadow-lg transition-all hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[hsl(var(--primary))]"
              >
                Access Portal
                <ArrowRight className="ml-2 inline h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            A simple, secure way to support Crave'n's mission
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          <div className="flex flex-col rounded-2xl bg-card p-8 shadow-sm ring-1 ring-border transition-all hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--primary))]/10">
              <Shield className="h-6 w-6 text-[hsl(var(--primary))]" />
            </div>
            <h3 className="mt-6 text-lg font-semibold text-foreground">Secure & Private</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Access is invitation-only. Your information is protected and secure throughout the process.
            </p>
          </div>

          <div className="flex flex-col rounded-2xl bg-card p-8 shadow-sm ring-1 ring-border transition-all hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--secondary))]/10">
              <Users className="h-6 w-6 text-[hsl(var(--secondary))]" />
            </div>
            <h3 className="mt-6 text-lg font-semibold text-foreground">Friends & Family</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This is a support contribution from those closest to us, not an investment or equity offering.
            </p>
          </div>

          <div className="flex flex-col rounded-2xl bg-card p-8 shadow-sm ring-1 ring-border transition-all hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--primary))]/10">
              <Heart className="h-6 w-6 text-[hsl(var(--primary))]" />
            </div>
            <h3 className="mt-6 text-lg font-semibold text-foreground">Flexible Support</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Choose your support amount between $50 and $500. Every contribution helps us grow.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-muted/50">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Ready to Support?
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              If you have an invitation code, click below to access the portal.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <button
                onClick={() => navigate("/access")}
                className="rounded-xl bg-[hsl(var(--primary))] px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:scale-105 hover:bg-[hsl(14_95%_48%)] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:ring-offset-2"
              >
                Access Portal
                <ArrowRight className="ml-2 inline h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Note */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Have questions? Please contact us directly at{" "}
            <a href="mailto:support@cravenusa.com" className="font-medium text-[hsl(var(--primary))] hover:underline">
              support@cravenusa.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

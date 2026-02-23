/**
 * Pricing & Performance — Merchant Portal Settings
 *
 * Flat 15% commission model. No tiers, no upsells.
 * - Delivery: 15% flat (locked, non-editable)
 * - Pickup: 0% commission (payment processing only)
 * - Performance-based reach (earned, not purchased)
 * - Optional flat-fee growth tools
 * - CraveMore referenced as customer membership only
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Lock,
  TrendingUp,
  ShoppingBag,
  Megaphone,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  Info,
  Rocket,
  LayoutGrid,
  MapPin,
} from "lucide-react";
import { useRestaurantData } from "@/hooks/useRestaurantData";
import GrowthToolInfoModal, { type GrowthToolType } from "@/components/merchant/GrowthToolInfoModal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { CraveMoreText } from "@/components/ui/cravemore-text";

/* ──────────────────────────────────────────────
   Performance metrics — placeholder until live data
   ────────────────────────────────────────────── */
interface PerformanceMetrics {
  orderCompletionRate: number; // 0-100
  prepTimeReliability: number; // 0-100
  customerRating: number; // 0-5
  cancellationRate: number; // 0-100 (lower is better)
}

const DEFAULT_METRICS: PerformanceMetrics = {
  orderCompletionRate: 94,
  prepTimeReliability: 88,
  customerRating: 4.6,
  cancellationRate: 3,
};

function reachTier(m: PerformanceMetrics): {
  label: string;
  color: string;
  level: number;
} {
  const score =
    m.orderCompletionRate * 0.3 +
    m.prepTimeReliability * 0.25 +
    (m.customerRating / 5) * 100 * 0.3 +
    (100 - m.cancellationRate) * 0.15;

  if (score >= 90)
    return { label: "Maximum Reach", color: "text-green-600", level: 3 };
  if (score >= 75)
    return { label: "Expanded Reach", color: "text-blue-600", level: 2 };
  return { label: "Standard Reach", color: "text-orange-600", level: 1 };
}

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */
const PricingPlansDashboard = () => {
  const { restaurant, loading } = useRestaurantData();
  const [metrics] = useState<PerformanceMetrics>(DEFAULT_METRICS);
  const tier = reachTier(metrics);
  const [activeGrowthTool, setActiveGrowthTool] = useState<GrowthToolType | null>(null);

  if (loading) {
    return (
      <div className="space-y-6 pb-8">
        <Card>
          <CardContent className="p-20 text-center">
            <p>Loading pricing information...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-10 pb-8 max-w-5xl">
        {/* ═══════════════════════════════════════════
            Header
        ═══════════════════════════════════════════ */}
        <div>
          <h2 className="text-2xl font-bold mb-1">Pricing & Performance</h2>
          <p className="text-muted-foreground">
            Crave'n operates on a flat, merchant-friendly commission. Growth and
            reach are earned through performance, not higher fees.
          </p>
        </div>

        {/* ═══════════════════════════════════════════
            Section 1 — Crave'n Base Commission
        ═══════════════════════════════════════════ */}
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-lg font-bold">Crave'n Base Commission</h3>
            </div>

            {/* Delivery */}
            <div className="flex items-center justify-between py-4 border rounded-lg px-5 bg-muted/30">
              <div>
                <p className="font-semibold">Delivery Orders</p>
                <p className="text-sm text-muted-foreground">
                  Flat rate on every delivery order
                </p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold">15%</span>
                <p className="text-xs text-muted-foreground mt-1">
                  non-tiered · non-upgradable
                </p>
              </div>
            </div>

            {/* Pickup */}
            <div className="flex items-center justify-between py-4 border rounded-lg px-5 bg-green-50 border-green-200">
              <div>
                <p className="font-semibold">Pickup Orders</p>
                <p className="text-sm text-muted-foreground">
                  Software + Payment Processing
                </p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-green-700">0%</span>
                <p className="text-xs text-muted-foreground mt-1">
                  commission-free · processing fees only
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground pt-2">
              Payment processing fees (Stripe) apply to all transactions.
              Commission rate is locked and identical for every merchant on
              Crave'n.
            </p>
          </CardContent>
        </Card>

        {/* ═══════════════════════════════════════════
            Section 2 — Performance-Based Reach
        ═══════════════════════════════════════════ */}
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-muted-foreground" />
                <h3 className="text-lg font-bold">Performance-Based Reach</h3>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground">
                    <Info className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs text-sm">
                  Reach is earned automatically based on your store's
                  performance metrics. It cannot be purchased or upgraded with
                  higher fees.
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Current tier badge */}
            <div className="flex items-center gap-3 py-3 px-4 rounded-lg border bg-muted/20">
              <MapPin className={`w-5 h-5 ${tier.color}`} />
              <div>
                <p className="font-semibold">
                  Current Reach:{" "}
                  <span className={tier.color}>{tier.label}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {tier.level === 3
                    ? "Your store is visible to the widest audience in your region."
                    : tier.level === 2
                    ? "Great performance! Keep it up to unlock maximum reach."
                    : "Improve your metrics below to expand your customer reach."}
                </p>
              </div>
            </div>

            {/* Metric bars */}
            <div className="grid sm:grid-cols-2 gap-5">
              {/* Order Completion Rate */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Order Completion Rate
                  </span>
                  <span className="font-semibold">
                    {metrics.orderCompletionRate}%
                  </span>
                </div>
                <Progress value={metrics.orderCompletionRate} className="h-2" />
              </div>

              {/* Prep Time Reliability */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-600" />
                    Prep Time Reliability
                  </span>
                  <span className="font-semibold">
                    {metrics.prepTimeReliability}%
                  </span>
                </div>
                <Progress
                  value={metrics.prepTimeReliability}
                  className="h-2"
                />
              </div>

              {/* Customer Rating */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-yellow-500" />
                    Customer Rating
                  </span>
                  <span className="font-semibold">
                    {metrics.customerRating} / 5.0
                  </span>
                </div>
                <Progress
                  value={(metrics.customerRating / 5) * 100}
                  className="h-2"
                />
              </div>

              {/* Cancellation Rate */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-red-500" />
                    Cancellation Rate
                  </span>
                  <span className="font-semibold">
                    {metrics.cancellationRate}%
                  </span>
                </div>
                <Progress
                  value={100 - metrics.cancellationRate}
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  Lower is better
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ═══════════════════════════════════════════
            Section 3 — Growth Tools (Optional)
        ═══════════════════════════════════════════ */}
        <Card>
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-1">
                Growth Tools (Optional)
              </h3>
              <p className="text-sm text-muted-foreground">
                Flat-fee promotion tools. These never affect your commission rate
                or pickup fees.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {/* Local Boost */}
              <div className="border rounded-lg p-5 space-y-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <Rocket className="w-5 h-5 text-orange-600" />
                </div>
                <h4 className="font-semibold">Local Boost</h4>
                <p className="text-sm text-muted-foreground">
                  Increased visibility to customers within your delivery radius.
                </p>
                <p className="text-lg font-bold">
                  $39
                  <span className="text-sm font-normal text-muted-foreground">
                    /month
                  </span>
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setActiveGrowthTool("local_boost")}
                >
                  Learn More
                </Button>
              </div>

              {/* Category Feature */}
              <div className="border rounded-lg p-5 space-y-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <LayoutGrid className="w-5 h-5 text-blue-600" />
                </div>
                <h4 className="font-semibold">Category Feature</h4>
                <p className="text-sm text-muted-foreground">
                  Highlighted placement in your cuisine category pages.
                </p>
                <p className="text-lg font-bold">
                  $79
                  <span className="text-sm font-normal text-muted-foreground">
                    /month
                  </span>
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setActiveGrowthTool("category_feature")}
                >
                  Learn More
                </Button>
              </div>

              {/* City Spotlight */}
              <div className="border rounded-lg p-5 space-y-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Megaphone className="w-5 h-5 text-purple-600" />
                </div>
                <h4 className="font-semibold">City Spotlight</h4>
                <p className="text-sm text-muted-foreground">
                  Featured on the Crave'n homepage for your entire city.
                </p>
                <p className="text-lg font-bold">
                  $149
                  <span className="text-sm font-normal text-muted-foreground">
                    /month
                  </span>
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setActiveGrowthTool("city_spotlight")}
                >
                  Learn More
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              All growth tools are optional add-ons billed as flat monthly fees.
              They do not change your base commission or affect pickup pricing.
            </p>
          </CardContent>
        </Card>

        {/* ═══════════════════════════════════════════
            Section 4 — CraveMore (informational only)
        ═══════════════════════════════════════════ */}
        <Card className="bg-muted/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <ShoppingBag className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">
                  About <CraveMoreText />
                </h3>
                <p className="text-sm text-muted-foreground">
                  <CraveMoreText /> is a customer membership program. Members
                  tend to order more frequently and have higher conversion rates.
                  There is no cost or commission change for merchants —{" "}
                  <CraveMoreText /> benefits are funded entirely by customer
                  subscriptions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Growth Tool Info Modal */}
        <GrowthToolInfoModal
          open={activeGrowthTool !== null}
          onClose={() => setActiveGrowthTool(null)}
          toolType={activeGrowthTool}
        />
      </div>
    </TooltipProvider>
  );
};

export default PricingPlansDashboard;

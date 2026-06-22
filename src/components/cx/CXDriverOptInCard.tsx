// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Truck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { CXLogo } from "@/components/cx/CXLogo";

/**
 * Drop into Feeder driver settings/preferences.
 * Lets drivers opt in/out of Crave'N Express (CX) courier jobs.
 */
export function CXDriverOptInCard({ driverId }: { driverId: string }) {
  const [optIn, setOptIn] = useState(false);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!driverId) return;
    (async () => {
      const { data } = await supabase
        .from("driver_preferences").select("cx_opt_in, cx_tier_verified")
        .eq("driver_id", driverId).maybeSingle();
      setOptIn(!!data?.cx_opt_in);
      setVerified(!!data?.cx_tier_verified);
      setLoading(false);
    })();
  }, [driverId]);

  const toggle = async (v: boolean) => {
    setOptIn(v);
    const { error } = await supabase.from("driver_preferences")
      .update({ cx_opt_in: v }).eq("driver_id", driverId);
    if (error) { toast.error("Couldn't update"); setOptIn(!v); return; }
    toast.success(v ? "You'll see CX jobs in your queue" : "CX jobs hidden");
  };

  if (loading) return null;

  return (
    <Card className="p-4 border-orange-200">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-[#0F172A] grid place-items-center text-white font-bold shrink-0">CX</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-semibold">Crave'N Express jobs</div>
            {verified && (
              <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="h-3 w-3 mr-1"/>Tier verified
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
            <Truck className="h-3 w-3"/> Get pickup/dropoff jobs from courier merchants. You control the toggle.
          </p>
        </div>
        <Switch checked={optIn} onCheckedChange={toggle} />
      </div>
    </Card>
  );
}
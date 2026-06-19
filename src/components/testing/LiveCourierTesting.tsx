import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Truck, Send, Clock, AlertTriangle, Car, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { fetchActiveOnlineFeeders, type OnlineFeederRow } from "@/lib/activeOnlineFeeders";

type CourierRow = { id: string; name: string; city: string | null; state: string | null };

export const LiveCourierTesting: React.FC = () => {
  const [couriers, setCouriers] = useState<CourierRow[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<string>("");
  const [feeders, setFeeders] = useState<OnlineFeederRow[]>([]);
  const [selectedFeeder, setSelectedFeeder] = useState<string>("_none_");
  const [payout, setPayout] = useState<string>("18.00");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    void fetchCouriers();
    void fetchFeeders();
  }, []);

  const fetchCouriers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, city, state, business_type")
        .eq("business_type", "courier_service")
        .order("name");
      if (error) throw error;
      setCouriers((data as any) || []);
      if (data && data.length === 1) setSelectedCourier(data[0].id);
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to load courier merchants", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFeeders = async () => {
    const { feeders, error } = await fetchActiveOnlineFeeders();
    if (error) console.warn("active feeders", error);
    setFeeders(feeders || []);
  };

  const sendCourierTest = async () => {
    if (!selectedCourier) {
      toast({ title: "Select a courier", description: "Pick a courier merchant.", variant: "destructive" });
      return;
    }
    const payoutCents = Math.round(parseFloat(payout || "0") * 100);
    if (!payoutCents || payoutCents < 100) {
      toast({ title: "Payout too low", description: "Set at least $1.00 payout.", variant: "destructive" });
      return;
    }
    setIsSending(true);
    try {
      const feederId = selectedFeeder && selectedFeeder !== "_none_" ? selectedFeeder : null;
      const { data, error } = await supabase.functions.invoke("create-courier-test-job", {
        body: { restaurantId: selectedCourier, feederId, payoutCents },
      });
      if (error) {
        throw new Error(
          (data as any)?.error ||
          (error.message === "Edge Function returned a non-2xx status code" ? "CX test job failed on the server" : error.message)
        );
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({
        title: "CX test job created",
        description: feederId
          ? "Job is live in the CX queue and a direct offer was broadcast to the feeder."
          : "Job is live in the CX queue for all opted-in feeders to see.",
        duration: 8000,
      });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to send", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-orange-500" />
            Live courier (CX) test
          </CardTitle>
          <CardDescription>
            Posts a <strong>live test courier gig</strong> from a chosen courier merchant. The job appears in the
            Crave'N Express queue for opted-in feeders. Optionally direct-broadcast it to a specific online feeder so it
            pops as an offer in their app — same flow as the merchant test.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Admin only. Test jobs are real rows in the CX system and visible to feeders.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create CX test job</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Courier merchant (gig creator)</Label>
            <Select value={selectedCourier} onValueChange={setSelectedCourier} disabled={isLoading || couriers.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Loading…" : couriers.length === 0 ? "No courier merchants" : "Select courier…"} />
              </SelectTrigger>
              <SelectContent>
                {couriers.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    <span className="flex items-center gap-2">
                      <Truck className="h-3.5 w-3.5" />
                      {r.name}
                      {r.city && r.state ? ` — ${r.city}, ${r.state}` : null}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="sm" onClick={() => void fetchCouriers()}>
              Refresh list
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Driver payout (USD)</Label>
            <Input value={payout} onChange={(e) => setPayout(e.target.value)} inputMode="decimal" />
            <p className="text-xs text-muted-foreground">Test gig posts 6 deliveries · 70 mi · 2hr 18min ETA.</p>
          </div>

          <div className="space-y-2">
            <Label>Direct broadcast to a feeder (optional)</Label>
            <Select value={selectedFeeder} onValueChange={setSelectedFeeder}>
              <SelectTrigger>
                <SelectValue placeholder="No feeder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">None — broadcast to CX pool</SelectItem>
                {feeders.map((f) => (
                  <SelectItem key={f.user_id} value={f.user_id}>
                    <span className="flex items-center gap-2">
                      <Car className="h-3.5 w-3.5" />
                      {f.full_name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="secondary" size="sm" onClick={() => void fetchFeeders()}>
              Refresh online feeders
            </Button>
          </div>

          <Button onClick={() => void sendCourierTest()} disabled={!selectedCourier || isSending || isLoading} className="w-full" size="lg">
            {isSending ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send CX test job
              </>
            )}
          </Button>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Open the feeder app → <strong>Crave'N Express → Courier jobs</strong> to see the gig. Tap it to view
              the Roadie-style detail sheet and accept.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveCourierTesting;
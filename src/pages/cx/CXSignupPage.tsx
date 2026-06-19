import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  company_name: z.string().trim().min(2).max(120),
  contact_name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(7).max(30),
  service_area: z.string().trim().min(2).max(200),
  fleet_size: z.coerce.number().int().min(0).max(100000),
  notes: z.string().max(1000).optional().default(""),
});

export default function CXSignupPage() {
  const nav = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    company_name: "", contact_name: "", email: "", phone: "",
    service_area: "", fleet_size: 0, notes: "",
  });

  const onChange = (k: string) => (e: any) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Please fix the form");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from("merchant_partnership_requests")
        .insert({
          business_name: parsed.data.company_name,
          contact_name: parsed.data.contact_name,
          email: parsed.data.email,
          phone: parsed.data.phone,
          business_type: "courier_service",
          notes: `[CX] Service area: ${parsed.data.service_area} | Fleet size: ${parsed.data.fleet_size}\n${parsed.data.notes}`,
          status: "pending",
        });
      if (error) throw error;
      toast.success("Application submitted. We'll be in touch within 1 business day.");
      nav("/cx");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      <header className="px-4 sm:px-8 py-5 border-b border-white/10">
        <Link to="/cx" className="text-orange-400 font-semibold tracking-wide text-sm">← Crave'N Express</Link>
      </header>
      <main className="max-w-2xl mx-auto px-4 sm:px-8 py-12">
        <h1 className="text-3xl sm:text-4xl font-extrabold">Apply as a courier service</h1>
        <p className="text-slate-300 mt-2">
          Tell us about your operation. Once approved, you'll get access to the CX portal
          to post jobs and dispatch Crave'N Feeders.
        </p>

        <div className="mt-6 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-5 sm:p-6">
          <h2 className="text-base sm:text-lg font-bold text-orange-300">
            Required to move forward
          </h2>
          <p className="text-sm text-slate-300 mt-1">
            The items below are <span className="font-semibold text-white">mandatory</span>.
            Your account cannot be activated and you will not be able to post jobs until every
            item has been submitted and approved by Crave'N.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-100">
            <li className="flex gap-2"><span className="text-orange-400">●</span> Completed application below (company info, contact, service area, fleet size)</li>
            <li className="flex gap-2"><span className="text-orange-400">●</span> Commercial Auto Insurance Certificate — current, unexpired (PDF or image)</li>
            <li className="flex gap-2"><span className="text-orange-400">●</span> Business License — state or city issued</li>
            <li className="flex gap-2"><span className="text-orange-400">●</span> W-9 — for tax reporting / 1099s</li>
            <li className="flex gap-2"><span className="text-orange-400">●</span> DOT Authority Number — if applicable to your operation</li>
            <li className="flex gap-2"><span className="text-orange-400">●</span> Active Crave'N Express subscription (selected after approval via Stripe)</li>
            <li className="flex gap-2"><span className="text-orange-400">●</span> At least one verified Crave'N Feeder opted into your driver pool</li>
          </ul>
          <p className="text-xs text-slate-400 mt-4">
            Document uploads and billing setup happen inside the CX portal after your application
            is approved. Submissions with missing or expired documents will not be activated.
          </p>
        </div>

        <div className="mt-8 space-y-5 rounded-2xl bg-white/5 border border-white/10 p-5 sm:p-7">
          {[
            ["company_name", "Company name", "Acme Couriers LLC"],
            ["contact_name", "Primary contact", "Jane Smith"],
            ["email", "Work email", "ops@acme.com"],
            ["phone", "Phone", "(555) 555-1234"],
            ["service_area", "Service area / cities", "Tulsa, OKC, Norman"],
          ].map(([k, label, ph]) => (
            <div key={k}>
              <Label htmlFor={k} className="text-slate-200">{label}</Label>
              <Input id={k} value={(form as any)[k]} onChange={onChange(k)} placeholder={ph}
                className="mt-1 bg-black/30 border-white/10 text-white"/>
            </div>
          ))}
          <div>
            <Label htmlFor="fleet_size" className="text-slate-200">Fleet size (drivers you employ)</Label>
            <Input id="fleet_size" type="number" min={0} value={form.fleet_size} onChange={onChange("fleet_size")}
              className="mt-1 bg-black/30 border-white/10 text-white"/>
          </div>
          <div>
            <Label htmlFor="notes" className="text-slate-200">Anything else?</Label>
            <Textarea id="notes" value={form.notes} onChange={onChange("notes")}
              placeholder="Volume, package types, insurance, etc."
              className="mt-1 bg-black/30 border-white/10 text-white min-h-[100px]"/>
          </div>
          <Button onClick={submit} disabled={submitting} size="lg"
            className="w-full bg-orange-500 hover:bg-orange-600">
            {submitting ? "Submitting…" : "Submit application"}
          </Button>
        </div>
      </main>
    </div>
  );
}
// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { CX_REQUIRED_DOCS, type CXDocType } from "@/lib/cx/requiredDocs";
import {
  CX_MSA_TEXT,
  CX_CARRIER_AGREEMENT_TEXT,
  CX_INDEMNIFICATION_TEXT,
} from "@/lib/cx/agreements";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Upload,
  ShieldCheck,
  Building2,
  Users,
  Truck,
  ClipboardCheck,
  PenTool,
} from "lucide-react";

type StepId = 1 | 2 | 3 | 4 | 5 | 6;

const STEPS = [
  { id: 1, label: "Company", icon: Building2 },
  { id: 2, label: "Contacts", icon: Users },
  { id: 3, label: "Operations", icon: Truck },
  { id: 4, label: "Documents", icon: FileText },
  { id: 5, label: "Safety", icon: ShieldCheck },
  { id: 6, label: "Sign", icon: PenTool },
] as const;

const LS_KEY = "cx_app_session";

function loadSession() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveSession(id: string, token: string) {
  localStorage.setItem(LS_KEY, JSON.stringify({ id, token }));
}
function clearSession() { localStorage.removeItem(LS_KEY); }

const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

export default function CXApplyPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [appId, setAppId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState<StepId>(1);
  const [form, setForm] = useState<any>({});
  const [docs, setDocs] = useState<any[]>([]);
  const [refs, setRefs] = useState<any[]>([
    { company_name: "", contact_name: "", contact_email: "", contact_phone: "", relationship: "", years_worked: "" },
    { company_name: "", contact_name: "", contact_email: "", contact_phone: "", relationship: "", years_worked: "" },
    { company_name: "", contact_name: "", contact_email: "", contact_phone: "", relationship: "", years_worked: "" },
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<CXDocType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Bootstrap: load existing draft from URL or localStorage, else create new
  useEffect(() => {
    (async () => {
      let id = params.get("id");
      let tk = params.get("token");
      if (!id || !tk) {
        const s = loadSession();
        if (s) { id = s.id; tk = s.token; }
      }
      if (id && tk) {
        const { data } = await supabase.from("cx_applications").select("*").eq("id", id).eq("edit_token", tk).maybeSingle();
        if (data) {
          setAppId(id); setToken(tk); setForm(data);
          setStep((data.current_step || 1) as StepId);
          const { data: d } = await supabase.from("cx_application_documents").select("*").eq("application_id", id);
          setDocs(d || []);
          const { data: r } = await supabase.from("cx_application_references").select("*").eq("application_id", id).order("created_at");
          if (r && r.length) setRefs(r);
          setLoading(false);
          return;
        }
      }
      // Create new draft
      const { data: created, error } = await supabase
        .from("cx_applications")
        .insert({ status: "draft", current_step: 1 })
        .select()
        .single();
      if (error) { toast.error("Could not start application"); setLoading(false); return; }
      setAppId(created.id); setToken(created.edit_token); setForm(created);
      saveSession(created.id, created.edit_token);
      await supabase.from("cx_application_events").insert({ application_id: created.id, event_type: "created" });
      setLoading(false);
    })();
  }, []);

  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const setBool = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: !!v }));

  async function persistStep(next?: StepId) {
    if (!appId) return;
    setSaving(true);
    const payload: any = { ...form };
    delete payload.id; delete payload.edit_token; delete payload.created_at; delete payload.updated_at;
    if (next) payload.current_step = next;
    const { error } = await supabase.from("cx_applications").update(payload).eq("id", appId);
    setSaving(false);
    if (error) { toast.error("Save failed: " + error.message); return false; }
    return true;
  }

  function validate(s: StepId): string | null {
    if (s === 1) {
      if (!form.legal_name || form.legal_name.length < 2) return "Legal business name is required.";
      if (!form.ein || !/^\d{2}-?\d{7}$/.test(form.ein)) return "Valid EIN (XX-XXXXXXX) is required.";
      if (!form.business_structure) return "Business structure is required.";
      if (!form.state_of_incorporation) return "State of incorporation is required.";
      if (!form.business_address_line1 || !form.business_city || !form.business_state || !form.business_zip) return "Complete business address is required.";
    }
    if (s === 2) {
      if (!form.owner_name || !form.owner_title || !form.owner_email || !form.owner_phone) return "All owner/officer fields are required.";
      if (!/^\S+@\S+\.\S+$/.test(form.owner_email)) return "Valid owner email required.";
      if (!form.dispatch_contact_name || !form.dispatch_contact_phone) return "Dispatch contact is required.";
    }
    if (s === 3) {
      if (!form.service_cities) return "Service cities required.";
      if (!form.fleet_size || form.fleet_size < 1) return "Fleet size must be at least 1.";
      if (!form.daily_volume_capacity || form.daily_volume_capacity < 1) return "Daily volume capacity required.";
      if (!form.hours_of_operation) return "Hours of operation required.";
      if (!form.driver_model) return "Driver model required.";
    }
    if (s === 4) {
      const missing = CX_REQUIRED_DOCS.filter(d => d.required && !docs.find(x => x.doc_type === d.key));
      if (missing.length) return `Missing required documents: ${missing.map(m => m.label).join(", ")}`;
    }
    if (s === 5) {
      if (form.mvr_program == null || form.drug_testing_program == null) return "Answer MVR and drug testing questions.";
      if (!form.driver_onboarding_standards) return "Driver onboarding standards required.";
      if (!form.incident_reporting_process) return "Incident reporting process required.";
      const filled = refs.filter(r => r.company_name && r.contact_name && (r.contact_email || r.contact_phone));
      if (filled.length < 2) return "At least 2 carrier references with contact info are required.";
    }
    if (s === 6) {
      if (!form.signature_typed) return "Please type your full legal name to sign.";
      if (!form.certified_truthful) return "You must certify the information is truthful.";
      if (!form.ach_intent) return "You must acknowledge payout intent.";
    }
    return null;
  }

  async function next() {
    const err = validate(step);
    if (err) { toast.error(err); return; }
    const nextStep = (step + 1) as StepId;
    const ok = await persistStep(nextStep);
    if (!ok) return;
    if (step === 5) {
      // persist references
      await supabase.from("cx_application_references").delete().eq("application_id", appId);
      const rows = refs.filter(r => r.company_name).map(r => ({ ...r, application_id: appId }));
      if (rows.length) await supabase.from("cx_application_references").insert(rows);
    }
    await supabase.from("cx_application_events").insert({ application_id: appId!, event_type: "step_completed", payload: { step } });
    setStep(nextStep);
    window.scrollTo(0, 0);
  }
  async function back() {
    const prev = Math.max(1, step - 1) as StepId;
    await persistStep(prev);
    setStep(prev);
  }

  async function handleUpload(docType: CXDocType, file: File) {
    if (!appId) return;
    setUploading(docType);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("application_id", appId);
      fd.append("doc_type", docType);
      const { data, error } = await supabase.functions.invoke("cx-upload-doc", { body: fd });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${docType.replace(/_/g, " ")} uploaded`);
      const { data: d } = await supabase.from("cx_application_documents").select("*").eq("application_id", appId);
      setDocs(d || []);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function removeDoc(id: string) {
    await supabase.from("cx_application_documents").delete().eq("id", id);
    setDocs(docs.filter(d => d.id !== id));
  }

  async function submit() {
    const err = validate(6);
    if (err) { toast.error(err); return; }
    if (!appId) return;
    setSubmitting(true);
    const now = new Date().toISOString();
    // Capture E-SIGN Act compliance metadata
    let ipAddress: string | null = null;
    try {
      const r = await fetch("https://api.ipify.org?format=json");
      ipAddress = (await r.json())?.ip ?? null;
    } catch { /* non-fatal */ }

    const { error } = await supabase.from("cx_applications").update({
      status: "submitted",
      submitted_at: now,
      signature_typed: form.signature_typed,
      certified_truthful: !!form.certified_truthful,
      ach_intent: !!form.ach_intent,
      msa_signed_at: now,
      carrier_agreement_signed_at: now,
      indemnification_signed_at: now,
      signature_payload: {
        typed_name: form.signature_typed,
        agreements: ["msa", "carrier_agreement", "indemnification"],
        signed_at: now,
        user_agent: navigator.userAgent,
        ip_address: ipAddress,
        consent_text: "I agree to sign electronically under the federal E-SIGN Act (15 U.S.C. § 7001 et seq.) and applicable state UETA. My typed name above is my legally binding signature.",
      },
    }).eq("id", appId);
    if (error) { toast.error(error.message); setSubmitting(false); return; }
    await supabase.from("cx_application_events").insert({ application_id: appId, event_type: "submitted" });
    clearSession();
    setCompleted(true);
    setSubmitting(false);
  }

  if (loading) {
    return <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center">
      <Loader2 className="animate-spin text-orange-500" />
    </div>;
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center px-4">
        <div className="max-w-lg text-center">
          <CheckCircle2 className="mx-auto text-orange-500 mb-4" size={64} />
          <h1 className="text-3xl font-extrabold">Application submitted</h1>
          <p className="text-slate-300 mt-3">
            Thanks {form.owner_name?.split(" ")[0] || "—"}. Our Chief Partnership Officer team will review your
            application, contact your references, and verify your insurance and licensing. You'll hear from us
            within 2 business days.
          </p>
          <div className="mt-6 text-sm text-slate-400">Reference ID: <span className="font-mono text-orange-300">{appId?.slice(0, 8).toUpperCase()}</span></div>
          <Button asChild className="mt-8 bg-orange-500 hover:bg-orange-600"><Link to="/cx">Back to Crave'N Express</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      <header className="px-4 sm:px-8 py-4 border-b border-white/10 flex items-center justify-between">
        <Link to="/cx" className="text-orange-400 font-semibold tracking-wide text-sm">← Crave'N Express</Link>
        <div className="text-xs text-slate-400">{saving ? "Saving…" : "Draft saved"}</div>
      </header>

      {/* Progress rail */}
      <div className="px-4 sm:px-8 pt-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-2">
            {STEPS.map((s, idx) => {
              const active = step === s.id;
              const done = step > s.id;
              const Icon = s.icon;
              return (
                <div key={s.id} className="flex items-center flex-1 last:flex-none">
                  <div className={`flex flex-col items-center gap-1 ${active ? "" : done ? "" : "opacity-50"}`}>
                    <div className={`size-9 rounded-full flex items-center justify-center border ${
                      done ? "bg-orange-500 border-orange-500 text-white" :
                      active ? "bg-orange-500/20 border-orange-500 text-orange-300" :
                      "bg-white/5 border-white/20 text-slate-400"
                    }`}>
                      {done ? <Check size={16} /> : <Icon size={16} />}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider hidden sm:block">{s.label}</div>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`flex-1 h-px mx-2 ${step > s.id ? "bg-orange-500" : "bg-white/10"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
        {step === 1 && <Step1 form={form} set={set} />}
        {step === 2 && <Step2 form={form} set={set} />}
        {step === 3 && <Step3 form={form} set={set} setBool={setBool} />}
        {step === 4 && <Step4 docs={docs} uploading={uploading} onUpload={handleUpload} onRemove={removeDoc} />}
        {step === 5 && <Step5 form={form} set={set} setBool={setBool} refs={refs} setRefs={setRefs} />}
        {step === 6 && <Step6 form={form} set={set} setBool={setBool} />}

        <div className="mt-10 flex items-center justify-between border-t border-white/10 pt-6">
          <Button variant="outline" onClick={back} disabled={step === 1 || saving}
            className="border-white/20 bg-transparent text-white hover:bg-white/10">
            <ChevronLeft size={16} className="mr-1" /> Back
          </Button>
          {step < 6 ? (
            <Button onClick={next} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
              Continue <ChevronRight size={16} className="ml-1" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={submitting} className="bg-orange-500 hover:bg-orange-600">
              {submitting ? <Loader2 className="animate-spin mr-2" size={16} /> : <PenTool size={16} className="mr-2" />}
              Sign & submit application
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

/* ---------- step components ---------- */

function Section({ title, subtitle, children }: any) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5 sm:p-7">
      <h2 className="text-2xl font-extrabold">{title}</h2>
      {subtitle && <p className="text-slate-400 mt-1 text-sm">{subtitle}</p>}
      <div className="mt-6 space-y-5">{children}</div>
    </div>
  );
}
function Field({ label, children, required }: any) {
  return (
    <div>
      <Label className="text-slate-200 text-sm">{label}{required && <span className="text-orange-400 ml-1">*</span>}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
const inputCls = "bg-black/30 border-white/10 text-white placeholder:text-slate-500";

function Step1({ form, set }: any) {
  return (
    <Section title="Company profile" subtitle="Tell us about your legal business entity.">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Legal business name" required><Input className={inputCls} value={form.legal_name || ""} onChange={set("legal_name")} /></Field>
        <Field label="DBA / trade name"><Input className={inputCls} value={form.dba || ""} onChange={set("dba")} /></Field>
        <Field label="EIN" required><Input className={inputCls} placeholder="XX-XXXXXXX" value={form.ein || ""} onChange={set("ein")} /></Field>
        <Field label="Business structure" required>
          <select className={`w-full h-10 rounded-md px-3 ${inputCls}`} value={form.business_structure || ""} onChange={set("business_structure")}>
            <option value="">Select…</option>
            <option>LLC</option><option>S-Corp</option><option>C-Corp</option><option>Sole Proprietor</option><option>Partnership</option>
          </select>
        </Field>
        <Field label="State of incorporation" required>
          <select className={`w-full h-10 rounded-md px-3 ${inputCls}`} value={form.state_of_incorporation || ""} onChange={set("state_of_incorporation")}>
            <option value="">Select…</option>{STATES.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Years in operation"><Input className={inputCls} type="number" min={0} value={form.years_in_operation ?? ""} onChange={set("years_in_operation")} /></Field>
        <Field label="Website"><Input className={inputCls} placeholder="https://" value={form.website || ""} onChange={set("website")} /></Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
        <Field label="Business address line 1" required><Input className={inputCls} value={form.business_address_line1 || ""} onChange={set("business_address_line1")} /></Field>
        <Field label="Address line 2"><Input className={inputCls} value={form.business_address_line2 || ""} onChange={set("business_address_line2")} /></Field>
        <Field label="City" required><Input className={inputCls} value={form.business_city || ""} onChange={set("business_city")} /></Field>
        <Field label="State" required>
          <select className={`w-full h-10 rounded-md px-3 ${inputCls}`} value={form.business_state || ""} onChange={set("business_state")}>
            <option value="">Select…</option>{STATES.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="ZIP" required><Input className={inputCls} value={form.business_zip || ""} onChange={set("business_zip")} /></Field>
      </div>
    </Section>
  );
}

function Step2({ form, set }: any) {
  return (
    <Section title="Contacts & ownership" subtitle="Primary officer plus ops and 24/7 dispatch contacts.">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Owner / officer name" required><Input className={inputCls} value={form.owner_name || ""} onChange={set("owner_name")} /></Field>
        <Field label="Title" required><Input className={inputCls} placeholder="CEO / Owner" value={form.owner_title || ""} onChange={set("owner_title")} /></Field>
        <Field label="Owner email" required><Input className={inputCls} type="email" value={form.owner_email || ""} onChange={set("owner_email")} /></Field>
        <Field label="Owner phone" required><Input className={inputCls} value={form.owner_phone || ""} onChange={set("owner_phone")} /></Field>
        <Field label="Owner mobile"><Input className={inputCls} value={form.owner_mobile || ""} onChange={set("owner_mobile")} /></Field>
        <Field label="Ownership %"><Input className={inputCls} type="number" min={0} max={100} value={form.ownership_pct ?? ""} onChange={set("ownership_pct")} /></Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
        <Field label="Operations contact name"><Input className={inputCls} value={form.ops_contact_name || ""} onChange={set("ops_contact_name")} /></Field>
        <Field label="Operations contact email"><Input className={inputCls} value={form.ops_contact_email || ""} onChange={set("ops_contact_email")} /></Field>
        <Field label="Operations contact phone"><Input className={inputCls} value={form.ops_contact_phone || ""} onChange={set("ops_contact_phone")} /></Field>
        <div />
        <Field label="24/7 dispatch contact name" required><Input className={inputCls} value={form.dispatch_contact_name || ""} onChange={set("dispatch_contact_name")} /></Field>
        <Field label="24/7 dispatch phone" required><Input className={inputCls} value={form.dispatch_contact_phone || ""} onChange={set("dispatch_contact_phone")} /></Field>
      </div>
    </Section>
  );
}

function Step3({ form, set }: any) {
  return (
    <Section title="Operations & service area" subtitle="Where you operate and what you can move.">
      <Field label="Cities / regions served" required>
        <Textarea className={inputCls} placeholder="Tulsa, OKC, Norman" value={form.service_cities || ""} onChange={set("service_cities")} />
      </Field>
      <Field label="ZIP codes served (comma-separated)">
        <Textarea className={inputCls} value={form.service_zips || ""} onChange={set("service_zips")} />
      </Field>
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Fleet size" required><Input className={inputCls} type="number" min={1} value={form.fleet_size ?? ""} onChange={set("fleet_size")} /></Field>
        <Field label="Daily volume capacity" required><Input className={inputCls} type="number" min={1} placeholder="orders/day" value={form.daily_volume_capacity ?? ""} onChange={set("daily_volume_capacity")} /></Field>
        <Field label="Driver model" required>
          <select className={`w-full h-10 rounded-md px-3 ${inputCls}`} value={form.driver_model || ""} onChange={set("driver_model")}>
            <option value="">Select…</option><option value="w2">W-2 employees</option><option value="1099">1099 contractors</option><option value="mixed">Mixed</option>
          </select>
        </Field>
      </div>
      <Field label="Hours of operation" required><Input className={inputCls} placeholder="Mon–Sun 6am–11pm" value={form.hours_of_operation || ""} onChange={set("hours_of_operation")} /></Field>
      <Field label="Vehicle mix (free-form)"><Textarea className={inputCls} placeholder="e.g. 4 sedans, 2 cargo vans, 1 box truck" value={form.vehicle_mix?.notes || ""} onChange={(e: any) => set("vehicle_mix")({ notes: e.target.value })} /></Field>
      <Field label="Current clients / verticals"><Textarea className={inputCls} placeholder="Restaurants, pharmacy, retail…" value={form.current_clients || ""} onChange={set("current_clients")} /></Field>
    </Section>
  );
}

function Step4({ docs, uploading, onUpload, onRemove }: any) {
  return (
    <Section title="Compliance documents" subtitle="Upload PDF or image files. All required documents must be uploaded to continue.">
      <div className="space-y-3">
        {CX_REQUIRED_DOCS.map((d) => {
          const existing = docs.find((x: any) => x.doc_type === d.key);
          const isUploading = uploading === d.key;
          return (
            <div key={d.key} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{d.label}</span>
                    {d.required ? <span className="text-[10px] uppercase tracking-wider bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded">Required</span>
                                : <span className="text-[10px] uppercase tracking-wider bg-white/10 text-slate-300 px-1.5 py-0.5 rounded">Optional</span>}
                    {existing && <span className="text-[10px] uppercase tracking-wider bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded inline-flex items-center gap-1"><Check size={10}/>Uploaded</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{d.description}</p>
                  {existing && <p className="text-xs text-slate-300 mt-2 truncate">{existing.file_name}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {existing && (
                    <Button variant="outline" size="sm" className="border-white/20 bg-transparent text-white hover:bg-white/10" onClick={() => onRemove(existing.id)}>Replace</Button>
                  )}
                  <label className={`inline-flex items-center gap-2 px-3 h-9 rounded-md text-sm cursor-pointer ${isUploading ? "bg-white/10" : "bg-orange-500 hover:bg-orange-600 text-white"}`}>
                    {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {existing ? "Re-upload" : "Upload"}
                    <input type="file" hidden accept="application/pdf,image/*" onChange={(e) => {
                      const f = e.target.files?.[0]; if (f) onUpload(d.key, f); e.currentTarget.value = "";
                    }} />
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function Step5({ form, set, setBool, refs, setRefs }: any) {
  const updateRef = (i: number, k: string, v: string) => {
    setRefs((r: any[]) => r.map((row, idx) => idx === i ? { ...row, [k]: v } : row));
  };
  return (
    <Section title="Safety & references" subtitle="Tell us how you keep drivers and customers safe.">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="MVR (Motor Vehicle Record) program in place?" required>
          <div className="flex gap-2">
            <Button type="button" variant={form.mvr_program ? "default" : "outline"} onClick={() => setBool("mvr_program")(true)} className={form.mvr_program ? "bg-orange-500 hover:bg-orange-600" : "border-white/20 bg-transparent text-white"}>Yes</Button>
            <Button type="button" variant={form.mvr_program === false ? "default" : "outline"} onClick={() => setBool("mvr_program")(false)} className={form.mvr_program === false ? "bg-orange-500 hover:bg-orange-600" : "border-white/20 bg-transparent text-white"}>No</Button>
          </div>
        </Field>
        <Field label="MVR provider (if yes)"><Input className={inputCls} value={form.mvr_provider || ""} onChange={set("mvr_provider")} /></Field>
        <Field label="Drug testing program?" required>
          <div className="flex gap-2">
            <Button type="button" variant={form.drug_testing_program ? "default" : "outline"} onClick={() => setBool("drug_testing_program")(true)} className={form.drug_testing_program ? "bg-orange-500 hover:bg-orange-600" : "border-white/20 bg-transparent text-white"}>Yes</Button>
            <Button type="button" variant={form.drug_testing_program === false ? "default" : "outline"} onClick={() => setBool("drug_testing_program")(false)} className={form.drug_testing_program === false ? "bg-orange-500 hover:bg-orange-600" : "border-white/20 bg-transparent text-white"}>No</Button>
          </div>
        </Field>
      </div>
      <Field label="Driver onboarding & safety standards" required>
        <Textarea className={inputCls} rows={3} value={form.driver_onboarding_standards || ""} onChange={set("driver_onboarding_standards")} />
      </Field>
      <Field label="Incident / accident reporting process" required>
        <Textarea className={inputCls} rows={3} value={form.incident_reporting_process || ""} onChange={set("incident_reporting_process")} />
      </Field>
      <Field label="Claims history (last 24 months)">
        <Textarea className={inputCls} rows={2} placeholder="Number of at-fault claims, total $ paid out, etc." value={form.claims_history || ""} onChange={set("claims_history")} />
      </Field>

      <div className="pt-4 border-t border-white/10">
        <h3 className="font-bold text-lg mb-1">Prior carrier references</h3>
        <p className="text-xs text-slate-400 mb-4">At least 2 references with contact info required.</p>
        <div className="space-y-4">
          {refs.map((r: any, i: number) => (
            <div key={i} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs font-bold uppercase text-orange-300 mb-3">Reference {i + 1}</div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Company name"><Input className={inputCls} value={r.company_name} onChange={(e) => updateRef(i, "company_name", e.target.value)} /></Field>
                <Field label="Contact name"><Input className={inputCls} value={r.contact_name} onChange={(e) => updateRef(i, "contact_name", e.target.value)} /></Field>
                <Field label="Contact email"><Input className={inputCls} value={r.contact_email} onChange={(e) => updateRef(i, "contact_email", e.target.value)} /></Field>
                <Field label="Contact phone"><Input className={inputCls} value={r.contact_phone} onChange={(e) => updateRef(i, "contact_phone", e.target.value)} /></Field>
                <Field label="Relationship"><Input className={inputCls} placeholder="Shipper / broker / customer" value={r.relationship} onChange={(e) => updateRef(i, "relationship", e.target.value)} /></Field>
                <Field label="Years worked together"><Input className={inputCls} value={r.years_worked} onChange={(e) => updateRef(i, "years_worked", e.target.value)} /></Field>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function Step6({ form, set, setBool }: any) {
  return (
    <Section title="Legal & signature" subtitle="Review and sign the agreements to submit your application.">
      <Agreement title="Master Services Agreement" body={CX_MSA_TEXT} />
      <Agreement title="Independent Carrier Agreement" body={CX_CARRIER_AGREEMENT_TEXT} />
      <Agreement title="Indemnification & Insurance Addendum" body={CX_INDEMNIFICATION_TEXT} />

      <div className="pt-2 space-y-3">
        <label className="flex items-start gap-3">
          <Checkbox checked={!!form.certified_truthful} onCheckedChange={(v) => setBool("certified_truthful")(v)} className="mt-1" />
          <span className="text-sm text-slate-200">I certify under penalty of perjury that all information in this application is true and accurate, and I am authorized to bind the company to these agreements.</span>
        </label>
        <label className="flex items-start gap-3">
          <Checkbox checked={!!form.ach_intent} onCheckedChange={(v) => setBool("ach_intent")(v)} className="mt-1" />
          <span className="text-sm text-slate-200">I acknowledge that, upon approval, payouts will be made via ACH/Stripe Connect on Crave'N's standard schedule, and a CX subscription is required to activate dispatch.</span>
        </label>
      </div>

      <div className="pt-4 border-t border-white/10">
        <Label className="text-slate-200">Type your full legal name to sign all three agreements</Label>
        <Input className={`${inputCls} mt-2 text-xl font-serif italic`} placeholder="Your full legal name" value={form.signature_typed || ""} onChange={set("signature_typed")} />
        <p className="text-xs text-slate-400 mt-2">Your typed signature constitutes a legally-binding electronic signature under the federal E-SIGN Act.</p>
      </div>
    </Section>
  );
}

function Agreement({ title, body }: any) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
      <div className="px-4 py-2 bg-white/5 border-b border-white/10 flex items-center gap-2">
        <ClipboardCheck size={14} className="text-orange-400" />
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <div className="p-4 max-h-48 overflow-y-auto text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">{body}</div>
    </div>
  );
}
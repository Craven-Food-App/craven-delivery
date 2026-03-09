import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantData } from "@/hooks/useRestaurantData";
import { toast } from "sonner";
import { POSIntegrationInstructions, type POSProvider } from "@/components/restaurant/dashboard/settings/POSIntegrationInstructions";

const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .field-input {
      width: 100%; border: 1px solid #e5e7eb; border-radius: 7px;
      padding: 9px 12px; font-size: 13.5px;
      font-family: 'IBM Plex Sans', sans-serif;
      color: #111827; background: #fff; outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .field-input:focus { border-color: #ea580c; box-shadow: 0 0 0 3px rgba(234,88,12,0.1); }
    .field-input::placeholder { color: #9ca3af; }
    textarea.field-input { resize: vertical; min-height: 80px; line-height: 1.6; }

    .select-wrap { position: relative; }
    .select-wrap > svg { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; color: #9ca3af; }
    .select-input {
      width: 100%; border: 1px solid #e5e7eb; border-radius: 7px;
      padding: 9px 32px 9px 12px; font-size: 13.5px;
      font-family: 'IBM Plex Sans', sans-serif; color: #111827;
      background: #fff; outline: none; appearance: none; cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .select-input:focus { border-color: #ea580c; box-shadow: 0 0 0 3px rgba(234,88,12,0.1); }

    .save-btn { transition: background 0.15s, box-shadow 0.15s, transform 0.12s; cursor: pointer; }
    .save-btn:hover { background: #c2410c !important; box-shadow: 0 4px 16px rgba(234,88,12,0.28) !important; transform: translateY(-1px); }
    .save-btn:active { transform: translateY(0); }

    .nav-item { transition: background 0.13s, color 0.13s; cursor: pointer; border: none; background: none; font-family: 'IBM Plex Sans', sans-serif; text-align: left; }
    .nav-item:hover { background: #fff7ed !important; color: #ea580c !important; }

    .toggle-track { transition: background 0.2s; cursor: pointer; }
    .toggle-thumb { transition: left 0.2s; }

    .upload-zone { transition: border-color 0.15s, background 0.15s; cursor: pointer; }
    .upload-zone:hover { border-color: #ea580c !important; background: #fff7ed !important; }

    .user-row { transition: background 0.12s; }
    .user-row:hover { background: #fffaf7 !important; }

    .int-card { transition: box-shadow 0.15s, border-color 0.15s; cursor: pointer; }
    .int-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08) !important; border-color: #fed7aa !important; }

    .danger-btn { transition: background 0.15s; cursor: pointer; }
    .danger-btn:hover { background: #dc2626 !important; }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(5px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .fade-up { animation: fadeUp 0.22s ease both; }

    .hours-row:nth-child(even) { background: #fafafa; }
  `}</style>
);

// ── Primitives ────────────────────────────────────────────────────────────────
function Toggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} className="toggle-track"
      style={{ width: 38, height: 21, borderRadius: 99, background: active ? "#ea580c" : "#e5e7eb", position: "relative", flexShrink: 0 }}>
      <div className="toggle-thumb"
        style={{ position: "absolute", top: 2.5, left: active ? 19 : 2.5, width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.18)" }} />
    </div>
  );
}
function FL({ children, required, hint }: { children: React.ReactNode; required?: boolean; hint?: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <label style={{ fontSize: 11.5, fontWeight: 600, color: "#374151", letterSpacing: "0.03em" }}>
        {children}{required && <span style={{ color: "#ea580c", marginLeft: 3 }}>*</span>}
      </label>
      {hint && <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{hint}</p>}
    </div>
  );
}
function Sel({ children }: { children: React.ReactNode }) {
  return (
    <div className="select-wrap">
      {children}
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
  );
}
function SHead({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.13em", textTransform: "uppercase", color: "#9ca3af", display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      {children}<div style={{ flex: 1, height: 1, background: "#f3f4f6" }} />
    </div>
  );
}
function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#f9fafb", border: "1px solid #f3f4f6", borderRadius: 8, padding: "11px 14px", fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
      {children}
    </div>
  );
}
function ToggleRow({ label, desc, active, onToggle }: { label: string; desc?: string; active: boolean; onToggle: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 8, border: "1px solid #f3f4f6", background: "#fff" }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{label}</p>
        {desc && <p style={{ fontSize: 11.5, color: "#6b7280", marginTop: 1 }}>{desc}</p>}
      </div>
      <Toggle active={active} onToggle={onToggle} />
    </div>
  );
}
function SaveBar({ onSave, saving }: { onSave?: () => void; saving?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 16, borderTop: "1px solid #f3f4f6", marginTop: 8 }}>
      <button className="save-btn" onClick={onSave}
        style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", borderRadius: 8, border: "none", background: "#ea580c", color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "inherit", boxShadow: "0 2px 8px rgba(234,88,12,0.2)" }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
        </svg>
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}

// Shared props for tabs that need restaurant data
type RestaurantLike = { id: string; name?: string | null; owner_id?: string } & Record<string, unknown>;
export interface SettingsTabProps {
  restaurant: RestaurantLike | null;
  loading: boolean;
  refetchRestaurant: () => void;
}

// ── TAB: Account ──────────────────────────────────────────────────────────────
function TabAccount({ restaurant, loading: rLoading, refetchRestaurant }: SettingsTabProps) {
  const notes = (restaurant?.verification_notes as Record<string, string> | undefined) || {};
  const [auto, setAuto] = useState(restaurant?.auto_descriptions_enabled ?? true);
  const [chat, setChat] = useState(restaurant?.chat_enabled ?? true);
  const [cravemore, setCravemore] = useState(restaurant?.cravemore_eligible ?? false);
  const [pickupInstructions, setPickupInstructions] = useState(notes.pickup_instructions ?? "");
  const [customerPickupInstructions, setCustomerPickupInstructions] = useState(notes.customer_pickup_instructions ?? "");
  const [saving, setSaving] = useState(false);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [merchantIdLoading, setMerchantIdLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setMerchantIdLoading(true);
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        console.log("[MerchantID] user:", user?.id, user?.email);
        if (!user || cancelled) return;
        const { data: row, error: selectError } = await supabase
          .from("merchant_accounts")
          .select("merchant_id")
          .eq("user_id", user.id)
          .maybeSingle();
        console.log("[MerchantID] select result:", { row, selectError });
        if (cancelled) return;
        if (row?.merchant_id) {
          setMerchantId(row.merchant_id);
          return;
        }
        const { data: ensured, error: rpcError } = await supabase.rpc("ensure_merchant_account", {
          p_user_id: user.id,
        });
        console.log("[MerchantID] ensure_merchant_account result:", { ensured, rpcError });
        if (cancelled) return;
        if (typeof ensured === "string") {
          setMerchantId(ensured);
          return;
        }
        const { data: row2, error: refetchError } = await supabase
          .from("merchant_accounts")
          .select("merchant_id")
          .eq("user_id", user.id)
          .maybeSingle();
        console.log("[MerchantID] re-fetch result:", { row2, refetchError });
        if (!cancelled && row2?.merchant_id) setMerchantId(row2.merchant_id);
      } catch (err) {
        console.error("[MerchantID] unexpected error:", err);
      } finally {
        if (!cancelled) setMerchantIdLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const n = (restaurant?.verification_notes as Record<string, string> | undefined) || {};
    setAuto(restaurant?.auto_descriptions_enabled ?? true);
    setChat(restaurant?.chat_enabled ?? true);
    setCravemore(restaurant?.cravemore_eligible ?? false);
    setPickupInstructions(n.pickup_instructions ?? "");
    setCustomerPickupInstructions(n.customer_pickup_instructions ?? "");
  }, [restaurant?.id, restaurant?.auto_descriptions_enabled, restaurant?.chat_enabled, restaurant?.cravemore_eligible, restaurant?.verification_notes]);

  const handleSave = async () => {
    if (!restaurant?.id) return;
    setSaving(true);
    try {
      const existingNotes = (restaurant.verification_notes as Record<string, unknown>) || {};
      const { error } = await supabase.from("restaurants").update({
        auto_descriptions_enabled: auto,
        chat_enabled: chat,
        cravemore_eligible: cravemore,
        verification_notes: { ...existingNotes, pickup_instructions: pickupInstructions, customer_pickup_instructions: customerPickupInstructions },
      }).eq("id", restaurant.id);
      if (error) throw error;
      toast.success("Settings saved");
      refetchRestaurant();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (rLoading) return <div className="fade-up" style={{ padding: 24, color: "#6b7280" }}>Loading…</div>;

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SHead>Your account</SHead>
      <div style={{ padding: "14px 16px", borderRadius: 10, border: "1.5px solid #f3f4f6", background: "#fafafa" }}>
        <p style={{ fontSize: 11.5, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>Merchant ID</p>
        <p style={{ fontSize: 15, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.05em", color: merchantId ? "#111827" : "#6b7280" }}>
          {merchantIdLoading ? "Loading…" : (merchantId ?? "—")}
        </p>
        <p style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 6 }}>One ID for all your stores. Use the last 4 characters when signing in on the tablet.</p>
      </div>

      <SHead>Menu Settings</SHead>
      <ToggleRow label="Auto-generate Descriptions" desc="AI will automatically generate product descriptions for items missing one." active={auto} onToggle={() => setAuto(!auto)} />

      <SHead>Tablet Settings</SHead>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <ToggleRow label="Enable Customer Chat" desc="Allow customers to message your store directly through the app." active={chat} onToggle={() => setChat(!chat)} />
        <ToggleRow label="CraveMore Eligible" desc="Opt your store into the CraveMore loyalty rewards program." active={cravemore} onToggle={() => setCravemore(!cravemore)} />
      </div>

      <SHead>Pickup Instructions</SHead>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <FL hint="Internal instructions shown to your team on the tablet.">Staff Pickup Instructions</FL>
          <textarea className="field-input" value={pickupInstructions} onChange={e => setPickupInstructions(e.target.value)} />
        </div>
        <div>
          <FL hint="Shown to customers in the app when their order is ready.">Customer Pickup Instructions</FL>
          <textarea className="field-input" value={customerPickupInstructions} onChange={e => setCustomerPickupInstructions(e.target.value)} />
        </div>
      </div>

      <SHead>Tablet PIN</SHead>
      <InfoBox>
        <strong style={{ color: "#374151" }}>Pause PIN</strong> is used to temporarily pause incoming orders from the tablet. <span style={{ color: "#ea580c", fontWeight: 500, cursor: "pointer" }}>Change PIN →</span>
      </InfoBox>

      <SaveBar onSave={handleSave} saving={saving} />
    </div>
  );
}

// ── TAB: Pricing ──────────────────────────────────────────────────────────────
function TabPricing(_props: SettingsTabProps) {
  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SHead>Commission Structure</SHead>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { label: "Delivery Commission", value: "15%", color: "#ea580c", desc: "Applied to all delivery orders" },
          { label: "Pickup Commission",   value: "0%",  color: "#16a34a", desc: "No fee on pickup orders" },
        ].map((c, i) => (
          <div key={i} style={{ padding: "16px 18px", borderRadius: 10, border: `1.5px solid ${i === 0 ? "#fed7aa" : "#a7f3d0"}`, background: i === 0 ? "#fff7ed" : "#ecfdf5" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: i === 0 ? "#c2410c" : "#065f46", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{c.label}</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: c.color, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "-1px" }}>{c.value}</p>
            <p style={{ fontSize: 11.5, color: "#6b7280", marginTop: 4 }}>{c.desc}</p>
          </div>
        ))}
      </div>

      <SHead>Performance Reach</SHead>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { tier: "Standard", desc: "Default reach within your delivery zone" },
          { tier: "Enhanced", desc: "Broader reach with 10+ completed orders/week" },
          { tier: "Premium",  desc: "Maximum reach with 25+ orders/week + 4.5★ rating" },
        ].map((t, i) => (
          <div key={i} style={{ padding: "12px 16px", borderRadius: 8, border: "1.5px solid #f3f4f6", background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{t.tier}</span>
            </div>
            <p style={{ fontSize: 12, color: "#6b7280" }}>{t.desc}</p>
          </div>
        ))}
      </div>

      <SHead>Growth Tools</SHead>
      <InfoBox>
        Growth tools like promoted listings and sponsored placement are available to stores on the Enhanced and Premium tiers. <span style={{ color: "#ea580c", fontWeight: 500, cursor: "pointer" }}>Learn more →</span>
      </InfoBox>
    </div>
  );
}

// ── TAB: Promotions ────────────────────────────────────────────────────────────
function TabPromotions({ restaurant, loading: rLoading }: SettingsTabProps) {
  const [promos, setPromos] = useState<Array<{ id: string; code: string; name: string; type: string; discount_percentage?: number; discount_amount_cents?: number; minimum_order_cents: number; valid_from: string; valid_until?: string | null; usage_limit?: number | null; usage_count: number; is_active: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "percentage" as "percentage" | "fixed_amount",
    discount_percentage: "10",
    discount_amount_cents: "500",
    minimum_order_cents: "0",
    valid_from: new Date().toISOString().slice(0, 16),
    valid_until: "",
    usage_limit: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchPromos = useCallback(() => {
    if (!restaurant?.id) return;
    setLoading(true);
    supabase
      .from("promo_codes")
      .select("id, code, name, type, discount_percentage, discount_amount_cents, minimum_order_cents, valid_from, valid_until, usage_limit, usage_count, is_active")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error) setPromos((data as typeof promos) || []);
      })
      .finally(() => setLoading(false));
  }, [restaurant?.id]);

  useEffect(() => {
    fetchPromos();
  }, [fetchPromos]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("promo_codes").insert({
        restaurant_id: restaurant.id,
        code: form.code.toUpperCase().trim(),
        name: form.name.trim(),
        type: form.type,
        discount_percentage: form.type === "percentage" ? parseFloat(form.discount_percentage) || null : null,
        discount_amount_cents: form.type === "fixed_amount" ? parseInt(form.discount_amount_cents, 10) || null : null,
        minimum_order_cents: parseInt(form.minimum_order_cents, 10) || 0,
        valid_from: new Date(form.valid_from).toISOString(),
        valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
        usage_limit: form.usage_limit ? parseInt(form.usage_limit, 10) : null,
        description: form.description.trim() || null,
        customer_eligibility: "all",
        applicable_to: "all",
        is_active: true,
        per_user_limit: 1,
      });
      if (error) throw error;
      toast.success("Promo created");
      setForm({ code: "", name: "", type: "percentage", discount_percentage: "10", discount_amount_cents: "500", minimum_order_cents: "0", valid_from: new Date().toISOString().slice(0, 16), valid_until: "", usage_limit: "", description: "" });
      setShowForm(false);
      fetchPromos();
    } catch (e) {
      console.error(e);
      toast.error("Failed to create promo");
    } finally {
      setSaving(false);
    }
  };

  if (rLoading) return <div className="fade-up" style={{ padding: 24, color: "#6b7280" }}>Loading…</div>;

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SHead>Your promos</SHead>
      <p style={{ fontSize: 12, color: "#6b7280" }}>Create promo codes for your restaurant. Customers enter the code at checkout.</p>
      <button
        type="button"
        className="save-btn"
        onClick={() => setShowForm(!showForm)}
        style={{ alignSelf: "flex-start", padding: "8px 16px", fontSize: 13, borderRadius: 8, border: "none", background: "#ea580c", color: "#fff", fontWeight: 600, cursor: "pointer" }}
      >
        {showForm ? "Cancel" : "Create promo"}
      </button>
      {showForm && (
        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, border: "1px solid #f3f4f6", borderRadius: 10, background: "#fafafa" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><FL required>Code</FL><input className="field-input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="SAVE10" /></div>
            <div><FL required>Name</FL><input className="field-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="10% off" /></div>
            <div><FL>Type</FL><Sel><select className="select-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as "percentage" | "fixed_amount" }))}><option value="percentage">Percentage off</option><option value="fixed_amount">Fixed amount off</option></select></Sel></div>
            {form.type === "percentage" && <div><FL>Discount %</FL><input type="number" className="field-input" min={1} max={100} value={form.discount_percentage} onChange={e => setForm(f => ({ ...f, discount_percentage: e.target.value }))} /></div>}
            {form.type === "fixed_amount" && <div><FL>Discount ($)</FL><input type="number" className="field-input" step="0.01" min={0} value={Number(form.discount_amount_cents) / 100} onChange={e => setForm(f => ({ ...f, discount_amount_cents: String(Math.round(parseFloat(e.target.value || "0") * 100)) }))} /></div>}
            <div><FL>Min order ($)</FL><input type="number" className="field-input" step="0.01" min={0} value={Number(form.minimum_order_cents) / 100} onChange={e => setForm(f => ({ ...f, minimum_order_cents: String(Math.round(parseFloat(e.target.value || "0") * 100)) }))} /></div>
            <div><FL>Valid from</FL><input type="datetime-local" className="field-input" value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} /></div>
            <div><FL>Valid until</FL><input type="datetime-local" className="field-input" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} /></div>
            <div><FL>Usage limit</FL><input type="number" className="field-input" min={0} placeholder="Unlimited" value={form.usage_limit} onChange={e => setForm(f => ({ ...f, usage_limit: e.target.value }))} /></div>
          </div>
          <div><FL>Description (optional)</FL><textarea className="field-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
          <button type="submit" className="save-btn" disabled={saving} style={{ alignSelf: "flex-start" }}>{saving ? "Saving…" : "Save promo"}</button>
        </form>
      )}
      {loading ? <p style={{ color: "#9ca3af", fontSize: 13 }}>Loading promos…</p> : promos.length === 0 && !showForm ? <p style={{ color: "#9ca3af", fontSize: 13 }}>No promos yet. Create one above.</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {promos.map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 8, border: "1px solid #f3f4f6", background: "#fff" }}>
              <div>
                <span style={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: "#ea580c" }}>{p.code}</span>
                <span style={{ marginLeft: 8, fontSize: 13, color: "#374151" }}>{p.name}</span>
                <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 8 }}>{p.usage_count} uses</span>
              </div>
              <span style={{ fontSize: 11, color: p.is_active ? "#16a34a" : "#9ca3af", fontWeight: 600 }}>{p.is_active ? "Active" : "Inactive"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── TAB: Activity log ──────────────────────────────────────────────────────────
function TabActivity({ restaurant, loading: rLoading }: SettingsTabProps) {
  const [entries, setEntries] = useState<Array<{ id: string; action: string; entity_type: string | null; entity_id: string | null; metadata: unknown; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurant?.id) return;
    setLoading(true);
    supabase
      .from("merchant_activity_log")
      .select("id, action, entity_type, entity_id, metadata, created_at")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!error) setEntries((data as typeof entries) || []);
      })
      .finally(() => setLoading(false));
  }, [restaurant?.id]);

  if (rLoading) return <div className="fade-up" style={{ padding: 24, color: "#6b7280" }}>Loading…</div>;

  const actionLabel = (action: string) => {
    const map: Record<string, string> = {
      store_status_change: "Store status changed",
      full_refund: "Full refund",
      partial_refund: "Partial refund",
    };
    return map[action] || action.replace(/_/g, " ");
  };

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SHead>Recent activity</SHead>
      <p style={{ fontSize: 12, color: "#6b7280" }}>Audit log of recent actions for your store.</p>
      {loading ? (
        <p style={{ color: "#9ca3af", fontSize: 13 }}>Loading…</p>
      ) : entries.length === 0 ? (
        <p style={{ color: "#9ca3af", fontSize: 13 }}>No activity yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {entries.map((e) => (
            <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 12px", borderRadius: 8, border: "1px solid #f3f4f6", background: "#fff", fontSize: 12 }}>
              <div>
                <span style={{ fontWeight: 600, color: "#374151" }}>{actionLabel(e.action)}</span>
                {e.entity_type && <span style={{ color: "#9ca3af", marginLeft: 6 }}>{e.entity_type}</span>}
                {e.entity_id && <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#6b7280", marginLeft: 4 }}>{e.entity_id.slice(0, 8)}…</span>}
              </div>
              <span style={{ color: "#9ca3af", flexShrink: 0 }}>{new Date(e.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── TAB: Store ────────────────────────────────────────────────────────────────
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const STORE_TYPES = [{ value: "full_service", label: "Full Service Restaurant" }, { value: "fast_casual", label: "Fast Casual" }, { value: "quick_service", label: "Quick Service" }, { value: "cafe", label: "Café" }, { value: "bakery", label: "Bakery" }, { value: "retail_store", label: "Retail Store" }, { value: "grocery", label: "Grocery" }];

function TabStore({ restaurant, loading: rLoading, refetchRestaurant }: SettingsTabProps) {
  const [name, setName] = useState("");
  const [storeType, setStoreType] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [description, setDescription] = useState("");
  const [headerPhoto, setHeaderPhoto] = useState<string | null>(null);
  const [logoPhoto, setLogoPhoto] = useState<string | null>(null);
  const [hours, setHours] = useState<{ day: string; open: boolean; from: string; to: string }[]>(DAYS.map(d => ({ day: d, open: true, from: "09:00", to: "21:00" })));
  const [hoursLoading, setHoursLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const headerInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!restaurant) return;
    setName(restaurant.name ?? "");
    setStoreType(restaurant.restaurant_type ?? "");
    setAddress([restaurant.address, restaurant.city, restaurant.state, restaurant.zip_code].filter(Boolean).join(", ") ?? "");
    setPhone(restaurant.phone ?? "");
    setInstagram(restaurant.instagram_handle ?? "");
    setDescription(restaurant.description ?? "");
    setHeaderPhoto((restaurant.header_image_url as string | null) ?? null);
    setLogoPhoto((restaurant.logo_url as string | null) ?? null);
  }, [restaurant?.id, restaurant?.name, restaurant?.restaurant_type, restaurant?.address, restaurant?.city, restaurant?.state, restaurant?.zip_code, restaurant?.phone, restaurant?.instagram_handle, restaurant?.description, (restaurant as any)?.header_image_url, (restaurant as any)?.logo_url]);

  useEffect(() => {
    if (!restaurant?.id) return;
    supabase.from("restaurant_hours").select("day_of_week, open_time, close_time, is_closed").eq("restaurant_id", restaurant.id).order("day_of_week").then(({ data }) => {
      const byDay: Record<number, { open_time: string; close_time: string; is_closed: boolean }> = {};
      data?.forEach((r: { day_of_week: number; open_time: string | null; close_time: string | null; is_closed: boolean }) => { byDay[r.day_of_week] = { open_time: r.open_time ?? "09:00", close_time: r.close_time ?? "21:00", is_closed: r.is_closed }; });
      setHours(DAYS.map((day, i) => {
        const h = byDay[i];
        return { day, open: !h?.is_closed, from: h?.open_time ?? "09:00", to: h?.close_time ?? "21:00" };
      }));
    }).finally(() => setHoursLoading(false));
  }, [restaurant?.id]);

  const handleSave = async () => {
    if (!restaurant?.id) return;
    setSaving(true);
    try {
      await supabase.from("restaurants").update({
        name, restaurant_type: storeType || null, phone: phone || null, instagram_handle: instagram || null, description: description || null,
      }).eq("id", restaurant.id);
      await supabase.from("restaurant_hours").delete().eq("restaurant_id", restaurant.id);
      await supabase.from("restaurant_hours").insert(hours.map((h, i) => ({
        restaurant_id: restaurant.id,
        day_of_week: i,
        open_time: h.open ? h.from : null,
        close_time: h.open ? h.to : null,
        is_closed: !h.open,
      })));
      toast.success("Saved");
      refetchRestaurant();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File, type: "header" | "logo") => {
    if (!restaurant?.id) return;
    try {
      const fileExt = file.name.split(".").pop() || "jpg";
      const fileName = `${restaurant.id}/${type}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("restaurant-images")
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("restaurant-images")
        .getPublicUrl(fileName);

      const updateField = type === "header" ? "header_image_url" : "logo_url";
      const { error: updateError } = await supabase
        .from("restaurants")
        .update({ [updateField]: publicUrl })
        .eq("id", restaurant.id);
      if (updateError) throw updateError;

      if (type === "header") {
        setHeaderPhoto(publicUrl);
      } else {
        setLogoPhoto(publicUrl);
      }

      toast.success(`${type === "header" ? "Store header" : "Store logo"} updated`);
      refetchRestaurant();
    } catch (e) {
      console.error(e);
      toast.error("Failed to upload image");
    }
  };

  const onHeaderFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleImageUpload(file, "header");
    }
    e.target.value = "";
  };

  const onLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleImageUpload(file, "logo");
    }
    e.target.value = "";
  };

  if (rLoading) return <div className="fade-up" style={{ padding: 24, color: "#6b7280" }}>Loading…</div>;

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SHead>Store Details</SHead>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div><FL required>Store Name</FL><input className="field-input" value={name} onChange={e => setName(e.target.value)} /></div>
        <div><FL>Store Type</FL><Sel><select className="select-input" value={storeType} onChange={e => setStoreType(e.target.value)}>{STORE_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Sel></div>
        <div style={{ gridColumn: "1/-1" }}><FL>Address</FL><input className="field-input" value={address} onChange={e => setAddress(e.target.value)} /></div>
        <div><FL>Phone</FL><input className="field-input" value={phone} onChange={e => setPhone(e.target.value)} /></div>
        <div><FL>Instagram Handle</FL><input className="field-input" value={instagram} onChange={e => setInstagram(e.target.value)} /></div>
        <div style={{ gridColumn: "1/-1" }}><FL hint="Shown on your public store page.">Store Description</FL><textarea className="field-input" value={description} onChange={e => setDescription(e.target.value)} /></div>
      </div>

      <SHead>Brand Assets</SHead>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <FL hint="Recommended: 1200×400px (16:9)">Store Header Image</FL>
          <div
            className="upload-zone"
            style={{ border: "1.5px dashed #e5e7eb", borderRadius: 8, padding: "20px", textAlign: "center", background: "#fafafa" }}
            onClick={() => headerInputRef.current?.click()}
          >
            {headerPhoto ? <img src={headerPhoto} alt="Header" style={{ maxWidth: "100%", maxHeight: 120, objectFit: "cover", borderRadius: 8 }} /> : null}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.8" style={{ display: "block", margin: "0 auto 8px" }}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <p style={{ fontSize: 12, color: "#6b7280" }}><span style={{ color: "#ea580c", fontWeight: 600 }}>Upload header</span> or drag & drop</p>
            <input
              ref={headerInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={onHeaderFileChange}
            />
          </div>
        </div>
        <div>
          <FL hint="Recommended: 400×400px (square)">Store Logo</FL>
          <div
            className="upload-zone"
            style={{ border: "1.5px dashed #e5e7eb", borderRadius: 8, padding: "20px", textAlign: "center", background: "#fafafa" }}
            onClick={() => logoInputRef.current?.click()}
          >
            {logoPhoto ? <img src={logoPhoto} alt="Logo" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: "50%" }} /> : null}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.8" style={{ display: "block", margin: "0 auto 8px" }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <p style={{ fontSize: 12, color: "#6b7280" }}><span style={{ color: "#ea580c", fontWeight: 600 }}>Upload logo</span> or drag & drop</p>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={onLogoFileChange}
            />
          </div>
        </div>
      </div>

      <SHead>Business Hours</SHead>
      {hoursLoading ? <p style={{ color: "#6b7280" }}>Loading hours…</p> : (
        <div style={{ borderRadius: 8, border: "1px solid #f3f4f6", overflow: "hidden" }}>
          {hours.map((h, i) => (
            <div key={i} className="hours-row" style={{ display: "grid", gridTemplateColumns: "100px 40px 1fr 20px 1fr", alignItems: "center", gap: 12, padding: "9px 16px", borderBottom: i < hours.length - 1 ? "1px solid #f3f4f6" : "none" }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>{h.day}</span>
              <Toggle active={h.open} onToggle={() => setHours(hours.map((x, j) => j === i ? { ...x, open: !x.open } : x))} />
              <input className="field-input" value={h.from} onChange={e => setHours(hours.map((x, j) => j === i ? { ...x, from: e.target.value } : x))} disabled={!h.open} style={{ opacity: h.open ? 1 : 0.4, padding: "6px 10px", fontSize: 13 }} />
              <span style={{ textAlign: "center", color: "#9ca3af", fontSize: 12 }}>–</span>
              <input className="field-input" value={h.to} onChange={e => setHours(hours.map((x, j) => j === i ? { ...x, to: e.target.value } : x))} disabled={!h.open} style={{ opacity: h.open ? 1 : 0.4, padding: "6px 10px", fontSize: 13 }} />
            </div>
          ))}
        </div>
      )}
      <SaveBar onSave={handleSave} saving={saving} />
    </div>
  );
}

// ── TAB: Users ────────────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = { Owner: { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" }, Manager: { bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" }, Staff: { bg: "#f9fafb", text: "#6b7280", border: "#e5e7eb" }, admin: { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" }, manager: { bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" }, staff: { bg: "#f9fafb", text: "#6b7280", border: "#e5e7eb" } };

function TabUsers({ restaurant, loading: rLoading }: SettingsTabProps) {
  const [users, setUsers] = useState<{ id: string; email: string; first_name?: string; last_name?: string; role: string; status: string; created_at?: string; isOwner?: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirst, setInviteFirst] = useState("");
  const [inviteLast, setInviteLast] = useState("");
  const [inviteRole, setInviteRole] = useState("staff");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!restaurant?.id) return;
    (async () => {
      const { data: { user: me } } = await supabase.auth.getUser();
      const { data: list } = await supabase.from("restaurant_users").select("id, email, first_name, last_name, role, status, created_at").eq("restaurant_id", restaurant.id).order("created_at", { ascending: false });
      const ownerId = restaurant.owner_id;
      const withOwner = (list || []).map(u => ({ ...u, isOwner: u.email === (me?.email ?? "") || ownerId === me?.id }));
      if (me && ownerId === me.id && !withOwner.some(u => u.isOwner)) {
        withOwner.unshift({ id: "owner", email: me.email ?? "", first_name: undefined, last_name: undefined, role: "Owner", status: "active", isOwner: true });
      }
      setUsers(withOwner);
    })().finally(() => setLoading(false));
  }, [restaurant?.id, restaurant?.owner_id]);

  const inviteUser = async () => {
    if (!restaurant?.id || !inviteEmail) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("invite-restaurant-user", { body: { restaurantId: restaurant.id, email: inviteEmail, firstName: inviteFirst, lastName: inviteLast, role: inviteRole } });
      if (error) throw error;
      toast.success("Invitation sent");
      setShowInvite(false);
      setInviteEmail("");
      setInviteFirst("");
      setInviteLast("");
      setInviteRole("staff");
      const { data } = await supabase.from("restaurant_users").select("id, email, first_name, last_name, role, status, created_at").eq("restaurant_id", restaurant.id).order("created_at", { ascending: false });
      setUsers(data || []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to send invitation");
    } finally {
      setSending(false);
    }
  };

  const removeUser = async (id: string) => {
    if (id === "owner") return;
    try {
      const { error } = await supabase.from("restaurant_users").delete().eq("id", id);
      if (error) throw error;
      toast.success("User removed");
      setUsers(users.filter(u => u.id !== id));
    } catch (e) {
      toast.error("Failed to remove user");
    }
  };

  if (rLoading) return <div className="fade-up" style={{ padding: 24, color: "#6b7280" }}>Loading…</div>;

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SHead>Team Members</SHead>
        <button onClick={() => setShowInvite(true)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "#ea580c", background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 7, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Invite User
        </button>
      </div>

      {showInvite && (
        <div style={{ padding: 16, border: "1px solid #f3f4f6", borderRadius: 8, background: "#fafafa" }}>
          <FL required>Email</FL>
          <input className="field-input" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@example.com" style={{ marginBottom: 12 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><FL>First name</FL><input className="field-input" value={inviteFirst} onChange={e => setInviteFirst(e.target.value)} /></div>
            <div><FL>Last name</FL><input className="field-input" value={inviteLast} onChange={e => setInviteLast(e.target.value)} /></div>
          </div>
          <div style={{ marginBottom: 12 }}><FL>Role</FL><Sel><select className="select-input" value={inviteRole} onChange={e => setInviteRole(e.target.value)}><option value="staff">Staff</option><option value="manager">Manager</option><option value="admin">Admin</option></select></Sel></div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="save-btn" onClick={inviteUser} disabled={sending || !inviteEmail} style={{ padding: "8px 16px", fontSize: 12 }}>{sending ? "Sending…" : "Send invitation"}</button>
            <button onClick={() => setShowInvite(false)} style={{ padding: "8px 16px", fontSize: 12, background: "#f3f4f6", border: "none", borderRadius: 8, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ borderRadius: 8, border: "1px solid #f3f4f6", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 100px 80px", padding: "8px 16px", background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
          {["User","Email","Role","Status",""].map((h, i) => (
            <span key={i} style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9ca3af" }}>{h}</span>
          ))}
        </div>
        {loading ? <div style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>Loading…</div> : users.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>No team members yet. Invite users to get started.</div>
        ) : users.map((u, i) => {
          const rc = ROLE_COLORS[u.role] ?? ROLE_COLORS.Staff;
          const displayName = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email?.split("@")[0] || "—";
          const initials = (u.first_name?.[0] ?? "") + (u.last_name?.[0] ?? "") || (u.email?.[0] ?? "?");
          return (
            <div key={u.id} className="user-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 100px 80px", padding: "11px 16px", borderBottom: i < users.length - 1 ? "1px solid #f9fafb" : "none", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: rc.bg, border: `1.5px solid ${rc.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: rc.text, flexShrink: 0 }}>{initials}</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{displayName}</span>
              </div>
              <span style={{ fontSize: 12.5, color: "#6b7280" }}>{u.email}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 99, background: rc.bg, color: rc.text, border: `1px solid ${rc.border}`, display: "inline-block" }}>{u.role}</span>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>{u.status}</span>
              {!u.isOwner ? (
                <button onClick={() => removeUser(u.id)} style={{ fontSize: 11.5, fontWeight: 600, padding: "4px 10px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", cursor: "pointer", fontFamily: "inherit" }}>Remove</button>
              ) : <span />}
            </div>
          );
        })}
      </div>

      <SHead>Role Permissions</SHead>
      <div style={{ borderRadius: 8, border: "1px solid #f3f4f6", overflow: "hidden" }}>
        {[
          { perm: "View Orders",      owner: true, manager: true, staff: true },
          { perm: "Manage Products",  owner: true, manager: true, staff: false },
          { perm: "Access Financials",owner: true, manager: false,staff: false },
          { perm: "Manage Users",     owner: true, manager: false,staff: false },
          { perm: "Edit Store Settings",owner: true, manager: true, staff: false },
        ].map((row, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px", padding: "10px 16px", borderBottom: i < 4 ? "1px solid #f9fafb" : "none", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#374151" }}>{row.perm}</span>
            {[row.owner, row.manager, row.staff].map((v, j) => (
              <div key={j} style={{ display: "flex", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={v ? "#16a34a" : "#d1d5db"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  {v ? <polyline points="20 6 9 17 4 12"/> : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
                </svg>
              </div>
            ))}
          </div>
        ))}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px", padding: "7px 16px", background: "#f9fafb", borderTop: "1px solid #f3f4f6" }}>
          <span />
          {["Owner","Manager","Staff"].map(r => <span key={r} style={{ fontSize: 10.5, fontWeight: 600, color: "#9ca3af", textAlign: "center" }}>{r}</span>)}
        </div>
      </div>
    </div>
  );
}

// ── TAB: Communications ───────────────────────────────────────────────────────
function TabCommunications({ restaurant, loading: rLoading, refetchRestaurant }: SettingsTabProps) {
  const notes = (restaurant?.verification_notes as Record<string, boolean | string> | undefined) || {};
  const [s, setS] = useState({
    newOrder: notes.notif_newOrder !== false,
    newOrderSound: notes.notif_newOrderSound !== false,
    lowStock: notes.notif_lowStock !== false,
    reviews: notes.notif_reviews === true,
    payouts: notes.notif_payouts !== false,
    promos: notes.notif_promos === true,
    sms: notes.notif_sms !== false,
    email: notes.notif_email !== false,
    push: notes.notif_push === true,
  });
  const [notificationEmail, setNotificationEmail] = useState((notes.notification_email as string) ?? "");
  const [notificationPhone, setNotificationPhone] = useState((notes.notification_phone as string) ?? (restaurant?.phone as string) ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const n = (restaurant?.verification_notes as Record<string, boolean | string> | undefined) || {};
    setS({
      newOrder: n.notif_newOrder !== false,
      newOrderSound: n.notif_newOrderSound !== false,
      lowStock: n.notif_lowStock !== false,
      reviews: n.notif_reviews === true,
      payouts: n.notif_payouts !== false,
      promos: n.notif_promos === true,
      sms: n.notif_sms !== false,
      email: n.notif_email !== false,
      push: n.notif_push === true,
    });
    setNotificationEmail((n.notification_email as string) ?? "");
    setNotificationPhone((n.notification_phone as string) ?? (restaurant?.phone as string) ?? "");
  }, [restaurant?.id, restaurant?.verification_notes, restaurant?.phone]);

  const tog = (k: keyof typeof s) => setS(p => ({ ...p, [k]: !p[k] }));

  const handleSave = async () => {
    if (!restaurant?.id) return;
    setSaving(true);
    try {
      const existing = (restaurant.verification_notes as Record<string, unknown>) || {};
      const { error } = await supabase.from("restaurants").update({
        verification_notes: {
          ...existing,
          notif_newOrder: s.newOrder,
          notif_newOrderSound: s.newOrderSound,
          notif_lowStock: s.lowStock,
          notif_reviews: s.reviews,
          notif_payouts: s.payouts,
          notif_promos: s.promos,
          notif_sms: s.sms,
          notif_email: s.email,
          notif_push: s.push,
          notification_email: notificationEmail,
          notification_phone: notificationPhone,
        },
      }).eq("id", restaurant.id);
      if (error) throw error;
      toast.success("Saved");
      refetchRestaurant();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (rLoading) return <div className="fade-up" style={{ padding: 24, color: "#6b7280" }}>Loading…</div>;

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SHead>Notification Events</SHead>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <ToggleRow label="New Order Received"      desc="Get notified immediately when a customer places an order." active={s.newOrder} onToggle={() => tog("newOrder")} />
        <ToggleRow label="Play sound for new orders" desc="Play a short sound when a new order arrives (Merchant Portal)." active={s.newOrderSound} onToggle={() => tog("newOrderSound")} />
        <ToggleRow label="Low Stock Alert"         desc="Receive alerts when a product variant drops below 5 units." active={s.lowStock} onToggle={() => tog("lowStock")} />
        <ToggleRow label="New Customer Review"     desc="Be notified when a customer leaves a rating or review." active={s.reviews}  onToggle={() => tog("reviews")} />
        <ToggleRow label="Payout Processed"        desc="Confirmation when your weekly payout has been sent." active={s.payouts}  onToggle={() => tog("payouts")} />
        <ToggleRow label="Promotional Opportunities" desc="Tips and promotions to help grow your store reach." active={s.promos} onToggle={() => tog("promos")} />
      </div>

      <SHead>Delivery Channels</SHead>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <ToggleRow label="SMS Notifications"   desc="Text alerts sent to your registered phone number." active={s.sms}   onToggle={() => tog("sms")} />
        <ToggleRow label="Email Notifications" desc="Daily summaries and real-time alerts via email." active={s.email} onToggle={() => tog("email")} />
        <ToggleRow label="Push Notifications"  desc="In-app and browser push alerts." active={s.push}  onToggle={() => tog("push")} />
      </div>

      <SHead>Contact Information</SHead>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div><FL>Notification Email</FL><input className="field-input" value={notificationEmail} onChange={e => setNotificationEmail(e.target.value)} /></div>
        <div><FL>Notification Phone</FL><input className="field-input" value={notificationPhone} onChange={e => setNotificationPhone(e.target.value)} /></div>
      </div>
      <SaveBar onSave={handleSave} saving={saving} />
    </div>
  );
}

// ── TAB: Bank ─────────────────────────────────────────────────────────────────
function TabBank({ restaurant, loading: rLoading }: SettingsTabProps) {
  const [stripeStatus, setStripeStatus] = useState<{ hasAccount?: boolean; onboardingComplete?: boolean; payoutsEnabled?: boolean; externalAccounts?: { last4?: string; bank_name?: string; routing_number?: string }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingLink, setCreatingLink] = useState(false);

  useEffect(() => {
    if (!restaurant?.id) { setLoading(false); return; }
    supabase.functions.invoke("get-stripe-connect-status").then(({ data, error }) => {
      if (error) console.error(error);
      else setStripeStatus(data ?? null);
    }).finally(() => setLoading(false));
  }, [restaurant?.id]);

  const handleSetup = async () => {
    if (!restaurant?.id) return;
    setCreatingLink(true);
    try {
      const returnUrl = `${window.location.origin}/merchant-portal?tab=settings&subtab=bank`;
      const { data, error } = await supabase.functions.invoke("create-stripe-connect-link", { body: { returnUrl, refreshUrl: returnUrl, restaurantId: restaurant.id } });
      if (error) throw error;
      if (data?.url) { toast.success("Redirecting…"); window.location.href = data.url; }
      else throw new Error("No redirect URL");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to open setup");
    } finally {
      setCreatingLink(false);
    }
  };

  if (rLoading) return <div className="fade-up" style={{ padding: 24, color: "#6b7280" }}>Loading…</div>;

  const bank = stripeStatus?.externalAccounts?.[0];
  const isVerified = stripeStatus?.onboardingComplete && stripeStatus?.payoutsEnabled;

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SHead>Connected Account</SHead>
      {loading ? <p style={{ color: "#6b7280" }}>Loading…</p> : stripeStatus?.hasAccount ? (
        <div style={{ padding: "16px 18px", borderRadius: 10, border: `1.5px solid ${isVerified ? "#a7f3d0" : "#fde68a"}`, background: isVerified ? "#ecfdf5" : "#fffbeb", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "#fff", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{bank?.bank_name ?? "Bank account"}</p>
              <p style={{ fontSize: 12, color: "#6b7280", fontFamily: "'IBM Plex Mono', monospace" }}>Account ending in ••••{bank?.last4 ?? "****"}</p>
            </div>
          </div>
          <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: isVerified ? "#dcfce7" : "#fef3c7", color: isVerified ? "#15803d" : "#b45309", border: `1px solid ${isVerified ? "#a7f3d0" : "#fde68a"}` }}>{isVerified ? "Verified" : "Pending"}</span>
        </div>
      ) : (
        <div style={{ padding: "16px 18px", borderRadius: 10, border: "1.5px solid #e5e7eb", background: "#f9fafb" }}>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>No bank account connected. Set up banking to receive payouts.</p>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="save-btn" onClick={handleSetup} disabled={creatingLink || !restaurant?.id} style={{ padding: "9px 20px", fontSize: 13 }}>
          {creatingLink ? "Loading…" : stripeStatus?.hasAccount ? "Edit bank account" : "Setup Banking"}
        </button>
      </div>

      <SHead>Payout Schedule</SHead>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[["Schedule", "Weekly"], ["Currency", "USD"]].map(([k, v], i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderRadius: 8, border: "1px solid #f3f4f6", background: "#f9fafb" }}>
            <span style={{ fontSize: 12, color: "#6b7280" }}>{k}</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "#374151", fontFamily: "'IBM Plex Mono', monospace" }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── TAB: Integrations ─────────────────────────────────────────────────────────
const INTEGRATION_OPTIONS: Array<{
  name: string;
  desc: string;
  color: string;
  icon: string;
  posOAuth?: boolean;
  providerKey?: POSProvider;
}> = [
  { name: "Google Business",  desc: "Sync your store info and hours to your Google listing.", color: "#4285F4", icon: "G" },
  { name: "Meta / Instagram", desc: "Enable product catalog sync to your Instagram shop.", color: "#E1306C", icon: "M" },
  { name: "Square POS",       desc: "Connect Square to sync inventory and in-person sales.", color: "#006AFF", icon: "S", posOAuth: true, providerKey: "square" },
  { name: "Toast",            desc: "Connect Toast POS to sync menu and orders.", color: "#D7262C", icon: "T", posOAuth: true, providerKey: "toast" },
  { name: "Clover",           desc: "Connect Clover POS to sync menu and orders.", color: "#00B140", icon: "C", posOAuth: true, providerKey: "clover" },
  { name: "Mailchimp",        desc: "Export customer emails to your Mailchimp audience.", color: "#FFE01B", icon: "✉" },
  { name: "Zapier",           desc: "Automate workflows across 5,000+ apps.", color: "#FF4A00", icon: "Z" },
  { name: "Google Analytics", desc: "Track store visits and conversions in GA4.", color: "#F9AB00", icon: "A" },
];
function TabIntegrations({ restaurant, loading: rLoading }: SettingsTabProps) {
  const [connected, setConnected] = useState<{ provider_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [oauthStarting, setOauthStarting] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurant?.id) return;
    supabase.from("restaurant_integrations").select("provider_name").eq("restaurant_id", restaurant.id).eq("status", "connected").then(({ data }) => {
      setConnected(data ?? []);
    }).finally(() => setLoading(false));
  }, [restaurant?.id]);

  // Show success/error toast when returning from POS OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pos = params.get("pos");
    const provider = params.get("provider");
    const message = params.get("message");
    if (pos === "connected" && provider) {
      toast.success(`Successfully connected to ${provider === "square" ? "Square" : provider === "toast" ? "Toast" : "Clover"}`);
      window.history.replaceState({}, "", window.location.pathname + window.location.hash);
    } else if (pos === "error" && message) {
      toast.error("Connection failed. Please try again or contact support.");
      window.history.replaceState({}, "", window.location.pathname + window.location.hash);
    }
  }, []);

  const isConnected = (name: string) => connected.some(c => c.provider_name === name);

  const connect = async (name: string) => {
    if (!restaurant?.id) return;
    const int = INTEGRATION_OPTIONS.find((o) => o.name === name);
    if (int?.posOAuth && int.providerKey) {
      setOauthStarting(name);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          toast.error("Please sign in to connect.");
          return;
        }
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://xaxbucnjlrfkccsfiddq.supabase.co";
        const res = await fetch(`${supabaseUrl}/functions/v1/pos-oauth-start`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
          body: JSON.stringify({ provider: int.providerKey, restaurant_id: restaurant.id }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data.error || "Failed to start connection");
          return;
        }
        if (data.url) window.location.href = data.url;
        else toast.error("Invalid response from server");
      } catch (e) {
        toast.error("Failed to start connection");
      } finally {
        setOauthStarting(null);
      }
      return;
    }
    try {
      const { error } = await supabase.from("restaurant_integrations").insert({ restaurant_id: restaurant.id, integration_type: "pos", provider_name: name, status: "connected" });
      if (error) throw error;
      toast.success(`Connected to ${name}`);
      setConnected(prev => [...prev, { provider_name: name }]);
    } catch (e) {
      toast.error("Failed to connect");
    }
  };

  const disconnect = async (name: string) => {
    if (!restaurant?.id) return;
    try {
      const { error } = await supabase.from("restaurant_integrations").delete().eq("restaurant_id", restaurant.id).eq("provider_name", name);
      if (error) throw error;
      toast.success("Disconnected");
      setConnected(prev => prev.filter(c => c.provider_name !== name));
    } catch (e) {
      toast.error("Failed to disconnect");
    }
  };

  if (rLoading) return <div className="fade-up" style={{ padding: 24, color: "#6b7280" }}>Loading…</div>;

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SHead>Connected Apps</SHead>
      <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
        Connect your point-of-sale (Square, Toast, Clover) for real sync. Follow the instructions for each to complete setup.
      </p>
      {loading ? <p style={{ color: "#6b7280" }}>Loading…</p> : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {INTEGRATION_OPTIONS.map((int, i) => {
            const connected_ = isConnected(int.name);
            const isPosOAuth = int.posOAuth && int.providerKey;
            return (
              <div key={i} className="int-card" style={{ padding: "14px 16px", borderRadius: 10, border: "1.5px solid #f3f4f6", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 12, alignItems: "stretch" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: int.color + "18", border: `1.5px solid ${int.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: int.color, flexShrink: 0 }}>{int.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{int.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: connected_ ? "#ecfdf5" : "#f9fafb", color: connected_ ? "#065f46" : "#9ca3af", border: `1px solid ${connected_ ? "#a7f3d0" : "#e5e7eb"}` }}>
                        {connected_ ? "Connected" : "Not Connected"}
                      </span>
                    </div>
                    <p style={{ fontSize: 11.5, color: "#6b7280", lineHeight: 1.5 }}>{int.desc}</p>
                  </div>
                </div>
                {isPosOAuth ? (
                  <POSIntegrationInstructions
                    provider={int.providerKey!}
                    isConnected={connected_}
                    onConnect={() => connect(int.name)}
                    onDisconnect={() => disconnect(int.name)}
                    connectLabel={oauthStarting === int.name ? "Redirecting…" : "Connect"}
                    connectDisabled={oauthStarting === int.name}
                    compact
                  />
                ) : (
                  <button
                    onClick={() => connected_ ? disconnect(int.name) : connect(int.name)}
                    style={{ marginTop: 0, fontSize: 11.5, fontWeight: 600, padding: "6px 12px", borderRadius: 6, border: `1px solid ${connected_ ? "#e5e7eb" : "#fed7aa"}`, background: connected_ ? "#fff" : "#fff7ed", color: connected_ ? "#6b7280" : "#ea580c", cursor: "pointer", fontFamily: "inherit", alignSelf: "flex-start" }}
                  >
                    {connected_ ? "Disconnect" : "Connect"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── TAB: Inventory ────────────────────────────────────────────────────────────
function TabInventory({ restaurant, loading: rLoading }: SettingsTabProps) {
  const [stats, setStats] = useState<{ totalSkus: number; inStock: number; lowStock: number; outOfStock: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const threshold = (restaurant?.verification_notes as Record<string, number> | undefined)?.low_stock_threshold ?? 5;
  const [thresholdVal, setThresholdVal] = useState(String(threshold));
  const [alertsEnabled, setAlertsEnabled] = useState((restaurant?.verification_notes as Record<string, boolean> | undefined)?.low_stock_alerts_enabled !== false);

  useEffect(() => {
    if (!restaurant?.id) return;
    (async () => {
      const { data: menuItems } = await supabase.from("menu_items").select("id").eq("restaurant_id", restaurant.id);
      const menuIds = (menuItems ?? []).map(m => m.id);
      if (menuIds.length === 0) {
        setStats({ totalSkus: 0, inStock: 0, lowStock: 0, outOfStock: 0 });
        return;
      }
      const th = threshold;
      const { count: totalSkus } = await supabase.from("product_variants").select("id", { count: "exact", head: true }).in("menu_item_id", menuIds);
      const { count: inStock } = await supabase.from("product_variants").select("id", { count: "exact", head: true }).in("menu_item_id", menuIds).gt("quantity_on_hand", 0);
      const { count: lowStock } = await supabase.from("product_variants").select("id", { count: "exact", head: true }).in("menu_item_id", menuIds).lte("quantity_on_hand", th).gt("quantity_on_hand", 0);
      const { count: outOfStock } = await supabase.from("product_variants").select("id", { count: "exact", head: true }).in("menu_item_id", menuIds).lte("quantity_on_hand", 0);
      setStats({
        totalSkus: totalSkus ?? 0,
        inStock: inStock ?? 0,
        lowStock: lowStock ?? 0,
        outOfStock: outOfStock ?? 0,
      });
    })().catch(() => setStats({ totalSkus: 0, inStock: 0, lowStock: 0, outOfStock: 0 })).finally(() => setLoading(false));
  }, [restaurant?.id, threshold]);

  if (rLoading) return <div className="fade-up" style={{ padding: 24, color: "#6b7280" }}>Loading…</div>;

  const rows = stats ? [
    ["Total SKUs", String(stats.totalSkus), "products"],
    ["In Stock", String(stats.inStock), "SKUs"],
    ["Low Stock", String(stats.lowStock), "< 5 units"],
    ["Out of Stock", String(stats.outOfStock), "SKUs"],
  ] : [];

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SHead>Stock Overview</SHead>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        {loading ? <p style={{ gridColumn: "1/-1", color: "#6b7280" }}>Loading…</p> : rows.length ? rows.map(([l, v, s], i) => (
          <div key={i} style={{ padding: "14px 16px", borderRadius: 10, border: "1px solid #f3f4f6", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <p style={{ fontSize: 20, fontWeight: 700, color: i === 2 ? "#f59e0b" : i === 3 ? "#ef4444" : "#111827", fontFamily: "'IBM Plex Mono', monospace" }}>{v}</p>
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>{l} · {s}</p>
          </div>
        )) : (
          <div style={{ gridColumn: "1/-1", padding: 16, color: "#6b7280" }}>No inventory data. Use the Inventory tab in the sidebar to add products.</div>
        )}
      </div>
      <SHead>Low Stock Alerts</SHead>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <ToggleRow label="Enable Low Stock Alerts" desc="Get notified when any variant drops below your threshold." active={alertsEnabled} onToggle={() => setAlertsEnabled(!alertsEnabled)} />
        <div><FL hint="Trigger alert when stock falls at or below this number.">Alert Threshold (units)</FL><input className="field-input" value={thresholdVal} onChange={e => setThresholdVal(e.target.value)} style={{ maxWidth: 140 }} /></div>
      </div>
      <InfoBox>
        For full stock management, use the <strong style={{ color: "#374151" }}>Inventory</strong> tab in the main sidebar navigation.
      </InfoBox>
    </div>
  );
}

// ── TAB: Delete Store ─────────────────────────────────────────────────────────
function TabDeleteStore(_props: SettingsTabProps) {
  const [restaurants, setRestaurants] = useState<{ id: string; name: string; address: string | null; city: string | null; state: string | null; created_at: string }[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      supabase.from("restaurants").select("id, name, address, city, state, created_at").eq("owner_id", user.id).order("created_at", { ascending: false }).then(({ data, error }) => {
        if (error) console.error(error);
        setRestaurants(data ?? []);
      }).finally(() => setLoading(false));
    });
  }, []);

  const selected = restaurants.find(r => r.id === selectedId);
  const ready = confirm === "DELETE" && selectedId;

  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("restaurants").delete().eq("id", selectedId);
      if (error) throw error;
      toast.success(`Store "${selected.name}" deleted`);
      setRestaurants(restaurants.filter(r => r.id !== selectedId));
      setSelectedId("");
      setConfirm("");
    } catch (e) {
      toast.error("Failed to delete store");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="fade-up" style={{ padding: 24, color: "#6b7280" }}>Loading…</div>;
  if (restaurants.length === 0) return <div className="fade-up" style={{ padding: 24, color: "#6b7280" }}>No stores to delete.</div>;

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ padding: "14px 18px", borderRadius: 10, background: "#fef2f2", border: "1.5px solid #fecaca", display: "flex", gap: 12, alignItems: "flex-start" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#991b1b" }}>Danger Zone</p>
          <p style={{ fontSize: 12.5, color: "#6b7280", marginTop: 2, lineHeight: 1.6 }}>Deleting a store is <strong>permanent and irreversible</strong>. All orders, products, settings, and data associated with this store will be permanently removed.</p>
        </div>
      </div>

      <SHead>Select Store to Delete</SHead>
      <Sel>
        <select className="select-input" value={selectedId} onChange={e => { setSelectedId(e.target.value); setConfirm(""); }}>
          <option value="">Choose a store…</option>
          {restaurants.map(r => (
            <option key={r.id} value={r.id}>{r.name} — {r.city ?? ""}, {r.state ?? ""}</option>
          ))}
        </select>
      </Sel>

      {selected && (
        <div style={{ padding: "14px 18px", borderRadius: 8, background: "#f9fafb", border: "1px solid #f3f4f6" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{selected.name}</p>
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{[selected.address, selected.city, selected.state].filter(Boolean).join(", ")}</p>
          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 3, fontFamily: "'IBM Plex Mono', monospace" }}>ID: {selected.id}</p>
        </div>
      )}

      <SHead>Confirm Deletion</SHead>
      <div>
        <FL hint={<>Type <strong style={{ fontFamily: "'IBM Plex Mono', monospace" }}>DELETE</strong> in all caps to confirm.</>}>Confirmation</FL>
        <input className="field-input" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Type DELETE here" style={{ fontFamily: "'IBM Plex Mono', monospace", maxWidth: 280 }} />
        {confirm && confirm !== "DELETE" && <p style={{ fontSize: 11.5, color: "#ef4444", marginTop: 5 }}>Must match exactly: DELETE</p>}
        {ready && <p style={{ fontSize: 11.5, color: "#16a34a", marginTop: 5 }}>✓ Confirmation matches</p>}
      </div>

      <button className="danger-btn" disabled={!ready || deleting} onClick={handleDelete}
        style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 20px", borderRadius: 8, border: "none", background: ready ? "#ef4444" : "#f3f4f6", color: ready ? "#fff" : "#9ca3af", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: ready ? "pointer" : "not-allowed", width: "fit-content", transition: "background 0.15s" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
        {deleting ? "Deleting…" : "Permanently Delete Store"}
      </button>
    </div>
  );
}

// ── TAB: Delete Account ───────────────────────────────────────────────────────
function TabDeleteAccount(_props: SettingsTabProps) {
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const ready = confirm === "DELETE MY ACCOUNT";

  const handleDeleteAccount = async () => {
    if (!ready) return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Please sign in to continue.");
        return;
      }
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://xaxbucnjlrfkccsfiddq.supabase.co";
      const res = await fetch(`${supabaseUrl}/functions/v1/delete-merchant-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to delete account");
        return;
      }
      toast.success("Account deleted. Signing out…");
      await supabase.auth.signOut();
      window.location.href = "/restaurant/auth";
    } catch (e) {
      toast.error("Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ padding: "14px 18px", borderRadius: 10, background: "#fef2f2", border: "1.5px solid #fecaca", display: "flex", gap: 12, alignItems: "flex-start" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#991b1b" }}>Delete account</p>
          <p style={{ fontSize: 12.5, color: "#6b7280", marginTop: 2, lineHeight: 1.6 }}>
            Permanently delete your merchant account. This will remove <strong>all your stores</strong>, menu items, and account data. This action <strong>cannot be undone</strong>. You will be signed out and redirected to the login page.
          </p>
        </div>
      </div>

      <SHead>Confirm account deletion</SHead>
      <div>
        <FL hint={<>Type <strong style={{ fontFamily: "'IBM Plex Mono', monospace" }}>DELETE MY ACCOUNT</strong> exactly to confirm.</>}>Confirmation</FL>
        <input className="field-input" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Type DELETE MY ACCOUNT here" style={{ fontFamily: "'IBM Plex Mono', monospace", maxWidth: 360 }} />
        {confirm && confirm !== "DELETE MY ACCOUNT" && <p style={{ fontSize: 11.5, color: "#ef4444", marginTop: 5 }}>Must match exactly: DELETE MY ACCOUNT</p>}
        {ready && <p style={{ fontSize: 11.5, color: "#16a34a", marginTop: 5 }}>✓ Confirmation matches</p>}
      </div>

      <button className="danger-btn" disabled={!ready || deleting} onClick={handleDeleteAccount}
        style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 20px", borderRadius: 8, border: "none", background: ready ? "#dc2626" : "#f3f4f6", color: ready ? "#fff" : "#9ca3af", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: ready ? "pointer" : "not-allowed", width: "fit-content", transition: "background 0.15s" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        {deleting ? "Deleting account…" : "Permanently delete my account"}
      </button>
    </div>
  );
}

// ── Nav items ──────────────────────────────────────────────────────────────────
const NAV: { id: string; label: string; icon: React.ReactNode; danger?: boolean }[] = [
  { id: "account",        label: "Account Settings",     icon: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></> },
  { id: "pricing",        label: "Pricing & Performance",icon: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></> },
  { id: "promotions",     label: "Promotions",            icon: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></> },
  { id: "store",          label: "Store Settings",        icon: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></> },
  { id: "users",          label: "Manage Users",          icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></> },
  { id: "communications", label: "Communications",        icon: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></> },
  { id: "bank",           label: "Bank Account",          icon: <><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></> },
  { id: "inventory",      label: "Inventory",             icon: <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></> },
  { id: "integrations",   label: "Integrations",          icon: <><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></> },
  { id: "activity",       label: "Activity log",          icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></> },
  { id: "delete-store",   label: "Delete Store",          icon: <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>, danger: true },
  { id: "delete-account", label: "Delete Account",        icon: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>, danger: true },
];

const CONTENT: Record<string, (p: SettingsTabProps) => React.ReactElement> = {
  account: TabAccount,
  pricing: TabPricing,
  promotions: TabPromotions,
  store: TabStore,
  users: TabUsers,
  communications: TabCommunications,
  bank: TabBank,
  inventory: TabInventory,
  integrations: TabIntegrations,
  activity: TabActivity,
  "delete-store": TabDeleteStore,
  "delete-account": TabDeleteAccount,
};

// ── Main ──────────────────────────────────────────────────────────────────────
interface SettingsDashboardProps {
  defaultTab?: string;
  restaurantId?: string;
  onSettingsTabChange?: (tab: string) => void;
}

export default function SettingsDashboard({ defaultTab = "account", restaurantId, onSettingsTabChange }: SettingsDashboardProps) {
  const [active, setActive] = useState(defaultTab);
  const { restaurant, loading, refetch } = useRestaurantData(restaurantId);
  useEffect(() => setActive(defaultTab), [defaultTab]);
  const Content = CONTENT[active] ?? TabAccount;
  const tabProps: SettingsTabProps = { restaurant, loading, refetchRestaurant: refetch };

  return (
    <>
      <FontLoader />
      <div className="settings-dashboard-root" style={{ fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif", background: "#fff", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb", borderRadius: 0, boxShadow: "none", width: "100%", margin: "32px 0 0 0", overflow: "hidden", display: "grid", gridTemplateColumns: "220px 1fr", minHeight: 600 }}>

        {/* ── Left nav ── */}
        <div style={{ borderRight: "1px solid #f3f4f6", background: "#fafafa", display: "flex", flexDirection: "column" }}>
          <nav style={{ padding: "10px 10px", flex: 1 }}>
            {NAV.map(item => {
              const isActive = active === item.id;
              const navStyle = { width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", borderRadius: 8, marginBottom: 2, fontSize: 13, fontWeight: isActive ? 600 : 500, color: item.danger ? (isActive ? "#dc2626" : "#ef4444") : isActive ? "#ea580c" : "#374151", background: isActive ? (item.danger ? "#fef2f2" : "#fff7ed") : "transparent", borderLeft: isActive ? `3px solid ${item.danger ? "#ef4444" : "#ea580c"}` : "3px solid transparent", textDecoration: "none" } as const;
              if (item.id === "delete-account") {
                return (
                  <Link key={item.id} to="/merchant-portal/delete-account" className="nav-item" style={navStyle}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }}>
                      {item.icon}
                    </svg>
                    {item.label}
                  </Link>
                );
              }
              return (
                <button key={item.id} className="nav-item" onClick={() => { setActive(item.id); onSettingsTabChange?.(item.id); }}
                  style={{ ...navStyle, textDecoration: undefined }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }}>
                    {item.icon}
                  </svg>
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ── Content ── */}
        <div style={{ padding: "24px 28px", overflowY: "auto", maxHeight: 720 }}>
          <Content {...tabProps} />
        </div>

      </div>
    </>
  );
}

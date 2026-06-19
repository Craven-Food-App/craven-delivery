// @ts-nocheck
/**
 * Crave'n Feeder — Driving Info
 * Multi-vehicle + license management. Mobile-first, brand orange.
 */
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notifications } from "@mantine/notifications";
import { Loader, Switch } from "@mantine/core";
import {
  IconX,
  IconArrowLeft,
  IconChevronRight,
  IconPlus,
  IconPencil,
  IconId,
  IconCar,
  IconTruck,
  IconShieldCheck,
  IconUpload,
  IconCamera,
} from "@tabler/icons-react";

const C = {
  orange: "#E8622A",
  orangeBg: "#FFF1EA",
  text: "#111111",
  muted: "#777777",
  muted2: "#999999",
  border: "#EEEEEE",
  bg: "#FFFFFF",
  bgMuted: "#F6F7F8",
  green: "#2E7D32",
  greenBg: "#E6F4EA",
  red: "#C62828",
};

type Vehicle = {
  id: string;
  make: string;
  model: string;
  year: number | null;
  color: string | null;
  license_plate: string | null;
  plate_state: string | null;
  vehicle_type: string;
  is_active: boolean;
  insurance_doc_url: string | null;
  insurance_expiration: string | null;
};

type License = {
  id?: string;
  license_number: string | null;
  license_state: string | null;
  expiration_date: string | null;
  front_image_url: string | null;
  back_image_url: string | null;
  selfie_image_url: string | null;
  verified: boolean;
  last_updated_at: string | null;
};

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

const Header: React.FC<{ title: string; onBack: () => void; closeIcon?: boolean }> = ({ title, onBack, closeIcon }) => (
  <div style={{ background: C.orange, color: "#fff", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10 }}>
    <button onClick={onBack} style={{ background: "transparent", border: 0, color: "#fff", padding: 4, display: "flex", cursor: "pointer" }} aria-label="Back">
      {closeIcon ? <IconX size={22} /> : <IconArrowLeft size={22} />}
    </button>
    <div style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: 600, marginRight: 30 }}>{title}</div>
  </div>
);

const Row: React.FC<{
  icon: React.ReactNode; title: React.ReactNode; subtitle?: React.ReactNode;
  badge?: React.ReactNode; rightIcon?: React.ReactNode; onClick?: () => void;
}> = ({ icon, title, subtitle, badge, rightIcon, onClick }) => (
  <button onClick={onClick} style={{
    width: "100%", display: "flex", alignItems: "center", gap: 14,
    padding: "16px 16px", background: C.bg, border: 0, borderBottom: `1px solid ${C.border}`,
    textAlign: "left", cursor: onClick ? "pointer" : "default",
  }}>
    <div style={{ width: 40, height: 40, borderRadius: 999, background: C.orangeBg, display: "flex", alignItems: "center", justifyContent: "center", color: C.orange, flexShrink: 0 }}>
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      {badge && <div style={{ marginBottom: 4 }}>{badge}</div>}
      <div style={{ fontSize: 16, fontWeight: 600, color: C.text, lineHeight: 1.2 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: C.muted, marginTop: 2, lineHeight: 1.3 }}>{subtitle}</div>}
    </div>
    {rightIcon ?? <IconChevronRight size={20} color={C.muted2} />}
  </button>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ padding: "16px 16px 8px", fontSize: 12, color: C.muted, letterSpacing: 1.2, background: C.bgMuted, textTransform: "uppercase", fontWeight: 600 }}>
    {children}
  </div>
);

const ActiveBadge: React.FC = () => (
  <span style={{ display: "inline-block", background: C.green, color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, padding: "3px 8px", borderRadius: 4 }}>
    ACTIVE
  </span>
);

const vehicleIcon = (type: string) =>
  type === "truck" || type === "suv" ? <IconTruck size={22} /> : <IconCar size={22} />;

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
type View =
  | { name: "list" }
  | { name: "license" }
  | { name: "vehicle"; id: string | "new" };

const DrivingInfoPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [view, setView] = useState<View>({ name: "list" });
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [license, setLicense] = useState<License | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);
    const [{ data: vs }, { data: lic }] = await Promise.all([
      supabase.from("driver_vehicles").select("*").eq("user_id", user.id).order("is_active", { ascending: false }).order("created_at", { ascending: true }),
      supabase.from("driver_licenses").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    setVehicles((vs as Vehicle[]) || []);
    setLicense((lic as License) || null);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.bgMuted, display: "flex", flexDirection: "column" }}>
        <Header title="Driving Info" onBack={onBack} closeIcon />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Loader color="orange" />
        </div>
      </div>
    );
  }

  if (view.name === "license") {
    return <LicenseInfoView license={license} userId={userId!} onBack={() => setView({ name: "list" })} onSaved={load} />;
  }
  if (view.name === "vehicle") {
    const v = view.id === "new" ? null : vehicles.find(x => x.id === view.id) || null;
    return <VehicleDetailView vehicle={v} userId={userId!} hasOthers={vehicles.length > 1} onBack={() => setView({ name: "list" })} onSaved={load} />;
  }

  // LIST
  const licenseSubtitle = license?.license_number
    ? `${license.license_state || ""} License ending in ${license.license_number.slice(-4)}${license.expiration_date ? `, EXP on ${formatDate(license.expiration_date)}` : ""}`
    : "Add your driver's license to start driving";

  return (
    <div style={{ minHeight: "100vh", background: C.bgMuted, display: "flex", flexDirection: "column" }}>
      <Header title="Driving Info" onBack={onBack} closeIcon />
      <div style={{ background: C.bg }}>
        <Row
          icon={<IconId size={22} />}
          title="License Info"
          subtitle={licenseSubtitle}
          rightIcon={<IconPencil size={18} color={C.orange} />}
          onClick={() => setView({ name: "license" })}
        />
      </div>

      <SectionLabel>Vehicles</SectionLabel>
      <div style={{ background: C.bg }}>
        {vehicles.map(v => (
          <Row
            key={v.id}
            icon={vehicleIcon(v.vehicle_type)}
            title={`${v.make.toUpperCase()} ${v.model}`}
            badge={v.is_active ? <ActiveBadge /> : null}
            onClick={() => setView({ name: "vehicle", id: v.id })}
          />
        ))}
        <button
          onClick={() => setView({ name: "vehicle", id: "new" })}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10,
            padding: "16px", background: C.bg, border: 0,
            color: C.orange, fontSize: 14, fontWeight: 700, letterSpacing: 1,
            cursor: "pointer",
          }}
        >
          <IconPlus size={20} />
          ADD NEW VEHICLE
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// LICENSE VIEW
// ─────────────────────────────────────────────────────────────
const LicenseInfoView: React.FC<{ license: License | null; userId: string; onBack: () => void; onSaved: () => void }> = ({ license, userId, onBack, onSaved }) => {
  const [step, setStep] = useState<"intro" | "form">("intro");
  const [number, setNumber] = useState(license?.license_number || "");
  const [state, setState] = useState(license?.license_state || "");
  const [exp, setExp] = useState(license?.expiration_date || "");
  const [front, setFront] = useState<string | null>(license?.front_image_url || null);
  const [back, setBack] = useState<string | null>(license?.back_image_url || null);
  const [selfie, setSelfie] = useState<string | null>(license?.selfie_image_url || null);
  const [saving, setSaving] = useState(false);

  const cooldownDays = license?.last_updated_at
    ? Math.max(0, 90 - Math.floor((Date.now() - new Date(license.last_updated_at).getTime()) / 86400000))
    : 0;
  const lockedByCooldown = cooldownDays > 0;

  const uploadImage = async (file: File, kind: string) => {
    const path = `${userId}/license_${kind}_${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("documents").upload(path, file, { upsert: true });
    if (error) { notifications.show({ title: "Upload failed", message: error.message, color: "red" }); return null; }
    const { data } = supabase.storage.from("documents").getPublicUrl(path);
    return data.publicUrl;
  };

  const handlePick = (kind: "front" | "back" | "selfie") => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const url = await uploadImage(f, kind);
    if (!url) return;
    if (kind === "front") setFront(url);
    if (kind === "back") setBack(url);
    if (kind === "selfie") setSelfie(url);
  };

  const save = async () => {
    if (!number || !state || !exp) { notifications.show({ title: "Missing info", message: "Number, state and expiration are required", color: "red" }); return; }
    setSaving(true);
    const payload = {
      user_id: userId,
      license_number: number,
      license_state: state,
      expiration_date: exp,
      front_image_url: front,
      back_image_url: back,
      selfie_image_url: selfie,
      last_updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("driver_licenses").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) { notifications.show({ title: "Save failed", message: error.message, color: "red" }); return; }
    notifications.show({ title: "License updated", message: "", color: "green" });
    onSaved(); onBack();
  };

  if (step === "intro") {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
        <Header title="Driving Info" onBack={onBack} closeIcon />
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 24 }}>
            <div style={{ width: 48, height: 48, borderRadius: 999, background: C.orangeBg, color: C.orange, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <IconId size={24} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>License Info</div>
              {license?.license_number && (
                <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
                  {license.license_state} License ending in {license.license_number.slice(-4)}
                  {license.expiration_date && <>, EXP on {formatDate(license.expiration_date)}</>}
                </div>
              )}
            </div>
          </div>

          <div style={{ fontSize: 16, color: C.text, marginBottom: 20 }}>
            To update your license information, complete the steps below.
          </div>

          {[
            "Capture front of license",
            "Capture back of license",
            "Take a selfie",
          ].map((label, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 0" }}>
              <div style={{ width: 32, height: 32, borderRadius: 999, background: C.orange, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{i + 1}</div>
              <div style={{ fontSize: 16, color: C.text }}>{label}</div>
            </div>
          ))}

          <div style={{ marginTop: 24, fontSize: 14, color: C.muted, lineHeight: 1.5 }}>
            For security purposes, license information can be updated only once every 90 days.
            {lockedByCooldown && (
              <div style={{ marginTop: 8, color: C.red, fontWeight: 600 }}>
                Next update available in {cooldownDays} day{cooldownDays === 1 ? "" : "s"}.
              </div>
            )}
          </div>

          <button
            disabled={lockedByCooldown}
            onClick={() => setStep("form")}
            style={{
              width: "100%", marginTop: 28, padding: "16px",
              background: lockedByCooldown ? "#CCC" : C.orange,
              color: "#fff", border: 0, borderRadius: 8,
              fontSize: 15, fontWeight: 700, letterSpacing: 1,
              cursor: lockedByCooldown ? "not-allowed" : "pointer",
            }}
          >
            {license?.license_number ? "UPDATE LICENSE" : "ADD LICENSE"}
          </button>

          <div style={{ marginTop: 20, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
            By tapping "{license?.license_number ? "Update" : "Add"} License" above, you agree that we and our vendors may collect and use your image to verify your identity. See our Privacy Policy for more details.
          </div>
        </div>
      </div>
    );
  }

  // FORM
  return (
    <div style={{ minHeight: "100vh", background: C.bgMuted, display: "flex", flexDirection: "column", paddingBottom: 100 }}>
      <Header title="License Details" onBack={() => setStep("intro")} />
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>

        <PhotoCard label="Front of License" url={front} onChange={handlePick("front")} />
        <PhotoCard label="Back of License" url={back} onChange={handlePick("back")} />
        <PhotoCard label="Selfie" url={selfie} onChange={handlePick("selfie")} useCamera />

        <Field label="License Number">
          <input value={number} onChange={e => setNumber(e.target.value)} style={inputStyle} placeholder="e.g. 123456789" />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="State">
            <select value={state} onChange={e => setState(e.target.value)} style={inputStyle}>
              <option value="">--</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Expiration">
            <input type="date" value={exp} onChange={e => setExp(e.target.value)} style={inputStyle} />
          </Field>
        </div>
      </div>

      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, padding: 16, background: C.bg, borderTop: `1px solid ${C.border}` }}>
        <button disabled={saving} onClick={save} style={primaryBtn(saving)}>{saving ? "Saving..." : "SAVE LICENSE"}</button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// VEHICLE DETAIL VIEW
// ─────────────────────────────────────────────────────────────
const VehicleDetailView: React.FC<{
  vehicle: Vehicle | null;
  userId: string;
  hasOthers: boolean;
  onBack: () => void;
  onSaved: () => void;
}> = ({ vehicle, userId, hasOthers, onBack, onSaved }) => {
  const isNew = !vehicle;
  const [make, setMake] = useState(vehicle?.make || "");
  const [model, setModel] = useState(vehicle?.model || "");
  const [year, setYear] = useState<string>(vehicle?.year ? String(vehicle.year) : "");
  const [color, setColor] = useState(vehicle?.color || "");
  const [plate, setPlate] = useState(vehicle?.license_plate || "");
  const [plateState, setPlateState] = useState(vehicle?.plate_state || "");
  const [vehicleType, setVehicleType] = useState(vehicle?.vehicle_type || "car");
  const [isActive, setIsActive] = useState(vehicle?.is_active ?? isNew);
  const [insuranceUrl, setInsuranceUrl] = useState<string | null>(vehicle?.insurance_doc_url || null);
  const [insuranceExp, setInsuranceExp] = useState<string>(vehicle?.insurance_expiration || "");
  const [saving, setSaving] = useState(false);

  const uploadInsurance = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const path = `${userId}/insurance_${Date.now()}.${f.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("documents").upload(path, f, { upsert: true });
    if (error) { notifications.show({ title: "Upload failed", message: error.message, color: "red" }); return; }
    const { data } = supabase.storage.from("documents").getPublicUrl(path);
    setInsuranceUrl(data.publicUrl);
    notifications.show({ title: "Insurance uploaded", message: "", color: "green" });
  };

  const save = async () => {
    if (!make || !model) { notifications.show({ title: "Missing info", message: "Make and model are required", color: "red" }); return; }
    setSaving(true);
    // If marking active, clear other actives first to satisfy unique partial index
    if (isActive) {
      await supabase.from("driver_vehicles").update({ is_active: false }).eq("user_id", userId).neq("id", vehicle?.id || "00000000-0000-0000-0000-000000000000");
    }
    const payload: any = {
      user_id: userId,
      make, model,
      year: year ? parseInt(year) : null,
      color: color || null,
      license_plate: plate || null,
      plate_state: plateState || null,
      vehicle_type: vehicleType,
      is_active: isActive,
      insurance_doc_url: insuranceUrl,
      insurance_expiration: insuranceExp || null,
    };
    const { error } = isNew
      ? await supabase.from("driver_vehicles").insert(payload)
      : await supabase.from("driver_vehicles").update(payload).eq("id", vehicle!.id);
    setSaving(false);
    if (error) { notifications.show({ title: "Save failed", message: error.message, color: "red" }); return; }
    notifications.show({ title: isNew ? "Vehicle added" : "Vehicle saved", message: "", color: "green" });
    onSaved(); onBack();
  };

  const remove = async () => {
    if (!vehicle) return;
    if (!confirm("Delete this vehicle?")) return;
    const { error } = await supabase.from("driver_vehicles").delete().eq("id", vehicle.id);
    if (error) { notifications.show({ title: "Delete failed", message: error.message, color: "red" }); return; }
    notifications.show({ title: "Vehicle deleted", message: "", color: "green" });
    onSaved(); onBack();
  };

  const canDelete = !isNew && hasOthers && !isActive;

  return (
    <div style={{ minHeight: "100vh", background: C.bgMuted, paddingBottom: 120 }}>
      <Header title="Vehicle Info" onBack={onBack} />

      <div style={{ background: C.bg, padding: 20, display: "flex", alignItems: "center", gap: 14, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ width: 56, height: 56, borderRadius: 999, background: C.orangeBg, color: C.orange, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {vehicleIcon(vehicleType)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text, lineHeight: 1.1 }}>
            {make ? `${make.toUpperCase()} ${model}` : "New Vehicle"}
          </div>
          {(year || color) && (
            <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>
              {year}{year && color ? " | " : ""}{color}
            </div>
          )}
        </div>
      </div>

      {!isNew && (
        <div style={{ background: C.bg, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, borderBottom: `1px solid ${C.border}`, marginTop: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>Active Vehicle</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 1.3 }}>
              This vehicle will be used to offer on Gigs when turned on. Set a different vehicle to 'Active' to turn this one off.
            </div>
          </div>
          <Switch checked={isActive} onChange={e => setIsActive(e.currentTarget.checked)} color="orange" size="md" />
        </div>
      )}

      <SectionLabel>Vehicle Info</SectionLabel>
      <div style={{ background: C.bg, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Make"><input value={make} onChange={e => setMake(e.target.value)} style={inputStyle} placeholder="Ford" /></Field>
          <Field label="Model"><input value={model} onChange={e => setModel(e.target.value)} style={inputStyle} placeholder="Expedition" /></Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Year"><input value={year} onChange={e => setYear(e.target.value)} style={inputStyle} inputMode="numeric" placeholder="2017" /></Field>
          <Field label="Color"><input value={color} onChange={e => setColor(e.target.value)} style={inputStyle} placeholder="Black" /></Field>
          <Field label="Type">
            <select value={vehicleType} onChange={e => setVehicleType(e.target.value)} style={inputStyle}>
              <option value="car">Car</option>
              <option value="suv">SUV</option>
              <option value="truck">Truck</option>
              <option value="motorcycle">Motorcycle</option>
              <option value="bike">Bike</option>
              <option value="scooter">Scooter</option>
            </select>
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
          <Field label="License Plate"><input value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} style={inputStyle} placeholder="ABC1234" /></Field>
          <Field label="State">
            <select value={plateState} onChange={e => setPlateState(e.target.value)} style={inputStyle}>
              <option value="">--</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
      </div>

      <SectionLabel>Documents</SectionLabel>
      <div style={{ background: C.bg }}>
        <label style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
          <div style={{ width: 40, height: 40, borderRadius: 999, background: C.orangeBg, color: C.orange, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IconShieldCheck size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>Proof of Insurance</div>
            <div style={{ fontSize: 13, color: insuranceUrl ? C.green : C.muted, marginTop: 2 }}>
              {insuranceUrl ? (insuranceExp ? `Expiration: ${formatDate(insuranceExp)}` : "Uploaded") : "Tap to upload"}
            </div>
          </div>
          <IconUpload size={20} color={C.muted2} />
          <input type="file" accept="image/*,application/pdf" onChange={uploadInsurance} style={{ display: "none" }} />
        </label>
        {insuranceUrl && (
          <div style={{ padding: 16, borderBottom: `1px solid ${C.border}` }}>
            <Field label="Insurance Expiration">
              <input type="date" value={insuranceExp} onChange={e => setInsuranceExp(e.target.value)} style={inputStyle} />
            </Field>
          </div>
        )}
      </div>

      {!isNew && (
        <div style={{ padding: "20px 16px 0", textAlign: "center" }}>
          {!canDelete && (
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 10, lineHeight: 1.4 }}>
              {isActive
                ? "Active vehicles cannot be deleted. Set a different vehicle to 'Active' to delete this one."
                : "You must have at least one vehicle."}
            </div>
          )}
          <button
            disabled={!canDelete}
            onClick={remove}
            style={{
              width: "100%", padding: "14px",
              background: canDelete ? C.bg : "#F1F1F1",
              color: canDelete ? C.red : C.muted2,
              border: `1px solid ${canDelete ? C.red : C.border}`,
              borderRadius: 6, fontSize: 14, fontWeight: 700, letterSpacing: 1,
              cursor: canDelete ? "pointer" : "not-allowed",
            }}
          >
            DELETE VEHICLE
          </button>
        </div>
      )}

      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, padding: 16, background: C.bg, borderTop: `1px solid ${C.border}` }}>
        <button disabled={saving} onClick={save} style={primaryBtn(saving)}>{saving ? "Saving..." : (isNew ? "ADD VEHICLE" : "SAVE")}</button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <span style={{ fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: 0.3 }}>{label}</span>
    {children}
  </label>
);

const inputStyle: React.CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: "12px 14px",
  fontSize: 16,
  color: C.text,
  background: C.bg,
  width: "100%",
  outline: "none",
  appearance: "none",
};

const primaryBtn = (disabled: boolean): React.CSSProperties => ({
  width: "100%", padding: "16px",
  background: disabled ? "#CCC" : C.orange,
  color: "#fff", border: 0, borderRadius: 8,
  fontSize: 15, fontWeight: 700, letterSpacing: 1,
  cursor: disabled ? "not-allowed" : "pointer",
});

const PhotoCard: React.FC<{ label: string; url: string | null; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; useCamera?: boolean }> = ({ label, url, onChange, useCamera }) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{label}</span>
        <button onClick={() => ref.current?.click()} style={{ background: "transparent", border: 0, color: C.orange, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          {useCamera ? <IconCamera size={16} /> : <IconUpload size={16} />}
          {url ? "REPLACE" : "UPLOAD"}
        </button>
      </div>
      <div style={{ height: 140, borderRadius: 8, background: C.bgMuted, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {url
          ? <img src={url} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ color: C.muted2, fontSize: 13 }}>No photo</span>}
      </div>
      <input ref={ref} type="file" accept="image/*" capture={useCamera ? "user" : undefined} onChange={onChange} style={{ display: "none" }} />
    </div>
  );
};

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
  } catch { return iso; }
}

export default DrivingInfoPage;
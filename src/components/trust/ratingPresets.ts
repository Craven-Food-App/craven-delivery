/**
 * Preset compliment tags and report categories used by the 3-way
 * Crave'N rating + trust system. Keep wording neutral and platform-agnostic.
 */

import type { Database } from "@/integrations/supabase/types";

export type PartyType = "customer" | "feeder" | "merchant";

/** Preset compliment tags per ratee type. Shown when stars >= 4. */
export const COMPLIMENT_TAGS: Record<PartyType, { id: string; label: string; icon: string }[]> = {
  feeder: [
    { id: "fast",            label: "Super fast",          icon: "⚡" },
    { id: "friendly",        label: "Friendly",            icon: "😊" },
    { id: "professional",    label: "Professional",        icon: "👔" },
    { id: "careful",         label: "Careful with food",   icon: "🍱" },
    { id: "communicative",   label: "Great communication", icon: "💬" },
    { id: "followed_instr",  label: "Followed instructions", icon: "📝" },
  ],
  merchant: [
    { id: "fresh",           label: "Fresh & hot",         icon: "🔥" },
    { id: "accurate",        label: "Order was accurate",  icon: "✅" },
    { id: "packaged_well",   label: "Packaged well",       icon: "📦" },
    { id: "quick_prep",      label: "Quick prep",          icon: "⚡" },
    { id: "great_value",     label: "Great value",         icon: "💰" },
    { id: "great_taste",     label: "Tasted great",        icon: "😋" },
  ],
  customer: [
    { id: "polite",          label: "Polite",              icon: "🙏" },
    { id: "easy_handoff",    label: "Easy handoff",        icon: "🤝" },
    { id: "clear_address",   label: "Clear address",       icon: "📍" },
    { id: "good_tipper",     label: "Generous",            icon: "💚" },
    { id: "responsive",      label: "Quick to respond",    icon: "💬" },
  ],
};

/** Preset issue tags per ratee type. Shown when stars <= 3. */
export const ISSUE_TAGS: Record<PartyType, { id: string; label: string }[]> = {
  feeder: [
    { id: "late",            label: "Arrived late" },
    { id: "rude",            label: "Rude behavior" },
    { id: "wrong_address",   label: "Went to wrong address" },
    { id: "no_communication", label: "No communication" },
    { id: "food_damaged",    label: "Food damaged in transit" },
  ],
  merchant: [
    { id: "missing_items",   label: "Missing items" },
    { id: "wrong_items",     label: "Wrong items" },
    { id: "cold_food",       label: "Food was cold" },
    { id: "long_prep",       label: "Long prep time" },
    { id: "poor_quality",    label: "Poor food quality" },
    { id: "packaging",       label: "Poor packaging" },
  ],
  customer: [
    { id: "no_show",         label: "Customer no-show" },
    { id: "unreachable",     label: "Couldn't reach customer" },
    { id: "bad_address",     label: "Address was wrong" },
    { id: "rude",            label: "Rude behavior" },
    { id: "unsafe_location", label: "Unsafe drop-off location" },
  ],
};

/** Categorized report reasons, shared across all three party types. */
export const REPORT_CATEGORIES = [
  { id: "safety",       label: "Safety concern",          severity: "high"     as const },
  { id: "harassment",   label: "Harassment or abuse",     severity: "high"     as const },
  { id: "fraud",        label: "Fraud or theft",          severity: "high"     as const },
  { id: "no_show",      label: "No-show / unresponsive",  severity: "medium"   as const },
  { id: "wrong_order",  label: "Wrong or damaged order",  severity: "medium"   as const },
  { id: "policy",       label: "Policy violation",        severity: "medium"   as const },
  { id: "other",        label: "Other",                   severity: "low"      as const },
];

export type TrustReportSeverity = Database["public"]["Enums"]["trust_report_severity"];
export type TrustReportStatus   = Database["public"]["Enums"]["trust_report_status"];
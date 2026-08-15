import { supabase } from "@root/integrations/supabase/client";

/** Resolve a courier_service restaurant for this user (owner or linked). */
export async function resolveCourierRestaurant(userId: string): Promise<
  | { ok: true; restaurant: Record<string, unknown> }
  | { ok: false; error: string }
> {
  const { data: owned } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", userId)
    .eq("business_type", "courier_service")
    .maybeSingle();

  if (owned) return { ok: true, restaurant: owned as Record<string, unknown> };

  const { data: linkedRows } = await supabase
    .from("restaurant_users")
    .select("restaurant_id, restaurants(*)")
    .eq("user_id", userId);

  const linked = (linkedRows || []).find((row: any) => {
    const r = row?.restaurants;
    return r && r.business_type === "courier_service";
  });

  if (linked?.restaurants) {
    return { ok: true, restaurant: linked.restaurants as Record<string, unknown> };
  }

  return {
    ok: false,
    error: "This app is for Crave'n CX courier accounts.",
  };
}

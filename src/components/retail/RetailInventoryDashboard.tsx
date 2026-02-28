import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { getMerchantLabels } from "@/utils/merchantCategoryLabels";
import { Loader2 } from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────
interface InventoryItem {
  id: string;
  restaurant_id: string;
  menu_item_id: string | null;
  sku: string | null;
  barcode: string | null;
  quantity_on_hand: number;
  quantity_reserved: number;
  reorder_point: number;
  is_perishable: boolean;
  expiry_date: string | null;
  unit_of_measure: string;
  cost_cents: number | null;
  last_restocked_at: string | null;
  created_at: string;
  updated_at: string;
  product_name?: string;
  product_price_cents?: number;
  product_image_url?: string | null;
  product_is_available?: boolean;
  category_name?: string;
}

interface MenuItemOption {
  id: string;
  name: string;
  price_cents: number;
}

interface VariantStock {
  id: string;
  menu_item_id: string;
  product_name: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  price_cents: number;
  quantity_on_hand: number;
  quantity_reserved: number;
  reorder_point: number;
  is_available: boolean;
  image_url: string | null;
  option1_value?: string | null;
  option2_value?: string | null;
}

interface RetailInventoryDashboardProps {
  restaurantId: string;
  restaurantType?: string | null;
}

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1611996575749-79a3a250f948?w=80&q=80";

// ── FontLoader & styles ─────────────────────────────────────────────────────
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .inv-row { transition: background 0.12s; cursor: pointer; }
    .inv-row:hover { background: #fffaf7 !important; }
    .inv-row.alert-row { background: #fffaf7; border-left: 3px solid #ef4444 !important; }
    .inv-row .cell-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }

    .stat-card { transition: box-shadow 0.15s, transform 0.14s; cursor: default; }
    .stat-card:hover { box-shadow: 0 4px 18px rgba(0,0,0,0.08) !important; transform: translateY(-1px); }

    .tab-btn { transition: color 0.15s; cursor: pointer; background: none; border: none; font-family: 'IBM Plex Sans', sans-serif; }
    .tab-btn:hover { color: #ea580c !important; }

    .icon-btn { transition: background 0.12s, color 0.12s; cursor: pointer; border: none; background: none; border-radius: 6px; padding: 5px 6px; display: flex; align-items: center; justify-content: center; font-family: 'IBM Plex Sans', sans-serif; }
    .icon-btn.add:hover    { background: #ecfdf5; color: #16a34a !important; }
    .icon-btn.sub:hover    { background: #fef2f2; color: #ef4444 !important; }
    .icon-btn.edit:hover   { background: #f3f4f6; color: #374151 !important; }
    .icon-btn.del:hover    { background: #fef2f2; color: #ef4444 !important; }

    .search-input { border: 1px solid #e5e7eb; border-radius: 8px; padding: 9px 12px 9px 36px; font-size: 13px; font-family: 'IBM Plex Sans', sans-serif; color: #111827; width: 100%; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
    .search-input:focus { border-color: #ea580c; box-shadow: 0 0 0 3px rgba(234,88,12,0.09); }
    .search-input::placeholder { color: #9ca3af; }

    .select-wrap { position: relative; display: inline-flex; align-items: center; }
    .select-wrap > svg { position: absolute; right: 9px; pointer-events: none; color: #9ca3af; }
    .select-input { border: 1px solid #e5e7eb; border-radius: 7px; padding: 8px 28px 8px 11px; font-size: 12.5px; font-family: 'IBM Plex Sans', sans-serif; color: #374151; background: #fff; outline: none; appearance: none; cursor: pointer; transition: border-color 0.15s; }
    .select-input:focus { border-color: #ea580c; }

    .action-btn-main { transition: background 0.15s, box-shadow 0.14s, transform 0.12s; cursor: pointer; }
    .action-btn-main:hover { background: #c2410c !important; box-shadow: 0 4px 14px rgba(234,88,12,0.28) !important; transform: translateY(-1px); }

    .ghost-btn { transition: background 0.12s; cursor: pointer; }
    .ghost-btn:hover { background: #f3f4f6 !important; }

    @keyframes fadeUp { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }
    .fade-up { animation: fadeUp 0.22s ease both; }

    .qty-input { width: 44px; max-width: 100%; border: 1px solid #e5e7eb; border-radius: 6px; padding: 4px 4px; font-size: 13px; font-family: 'IBM Plex Mono', monospace; text-align: center; outline: none; transition: border-color 0.15s; box-sizing: border-box; }
    .qty-input:focus { border-color: #ea580c; }
  `}</style>
);

const CAT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Apparel:     { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  Accessories: { bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" },
};
const DEFAULT_CAT_COLOR = { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" };

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  active:   { label: "In Stock",     bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0", dot: "#16a34a" },
  low:      { label: "Low Stock",    bg: "#fefce8", text: "#854d0e", border: "#fef08a", dot: "#ca8a04" },
  out:      { label: "Out of Stock", bg: "#fef2f2", text: "#991b1b", border: "#fecaca", dot: "#ef4444" },
};

function getCatColor(categoryName: string) {
  return CAT_COLORS[categoryName] ?? DEFAULT_CAT_COLOR;
}

function getProductStatus(item: InventoryItem) {
  const available = Math.max(0, item.quantity_on_hand - item.quantity_reserved);
  const reorder = item.reorder_point ?? 0;
  if (available <= 0) return "out";
  if (available <= reorder) return "low";
  return "active";
}

function getVariantStatus(v: VariantStock): "active" | "low" | "out" {
  const available = Math.max(0, v.quantity_on_hand - v.quantity_reserved);
  const reorder = v.reorder_point ?? 0;
  if (available <= 0) return "out";
  if (available <= reorder) return "low";
  return "active";
}

// ── Primitives ───────────────────────────────────────────────────────────────
function Chevron() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
}

function StatusBadge({ status }: { status: "active" | "low" | "out" }) {
  const s = STATUS_CFG[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: s.bg, color: s.text, border: `1px solid ${s.border}`, whiteSpace: "nowrap" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, display: "inline-block", flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

// ── Product Stock Tab ─────────────────────────────────────────────────────────
function TabProductStock({
  items,
  search,
  filterCat,
  sort,
  onQtyChange,
  onAdjust,
  onEdit,
  onDelete,
}: {
  items: InventoryItem[];
  search: string;
  filterCat: string;
  sort: string;
  onQtyChange: (itemId: string, newQty: number) => void;
  onAdjust: (itemId: string, delta: number) => void;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
}) {
  const filtered = items
    .filter((p) => {
      const name = (p.product_name || "").toLowerCase();
      const sku = (p.sku || "").toLowerCase();
      const matchSearch = name.includes(search.toLowerCase()) || sku.includes(search.toLowerCase());
      const cat = (p.category_name || "").toLowerCase();
      const matchCat = filterCat === "all" || cat === filterCat;
      return matchSearch && matchCat;
    })
    .sort((a, b) => {
      if (sort === "name") return (a.product_name || "").localeCompare(b.product_name || "");
      const availA = Math.max(0, a.quantity_on_hand - a.quantity_reserved);
      const availB = Math.max(0, b.quantity_on_hand - b.quantity_reserved);
      return availB - availA; // stock: highest first
    });

  const COLS = "44px minmax(0, 2.4fr) 56px minmax(0, 1.6fr) minmax(96px, 1fr) 56px 56px 72px 72px 110px";
  const HEADERS = ["", "Product", "On Hand", "SKU", "Category", "Reserved", "Avail", "Unit Cost", "Price", "Actions"];
  const ALIGN: (React.CSSProperties["textAlign"])[] = ["center", "left", "center", "center", "left", "center", "center", "right", "right", "center"];

  return (
    <div className="fade-up" style={{ borderRadius: 8, border: "1px solid #f3f4f6", overflow: "hidden", minWidth: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: COLS, padding: "8px 20px", background: "#f9fafb", borderBottom: "1px solid #f3f4f6", alignItems: "center" }}>
        {HEADERS.map((h, i) => (
          <span key={i} style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9ca3af", whiteSpace: "nowrap", textAlign: ALIGN[i], paddingLeft: i === 1 ? 10 : undefined }}>{h}</span>
        ))}
      </div>

      {filtered.map((item, i) => {
        const available = Math.max(0, item.quantity_on_hand - item.quantity_reserved);
        const status = getProductStatus(item);
        const cc = getCatColor(item.category_name || "");
        const reorder = item.reorder_point ?? 0;

        return (
          <div
            key={item.id}
            className={`inv-row${status === "out" ? " alert-row" : ""}`}
            style={{
              display: "grid",
              gridTemplateColumns: COLS,
              padding: "11px 20px",
              borderBottom: i < filtered.length - 1 ? "1px solid #f9fafb" : "none",
              alignItems: "center",
              borderLeft: status === "out" ? "3px solid #ef4444" : "3px solid transparent",
              minWidth: 0,
            }}
          >
            <div style={{ width: 34, height: 34, borderRadius: 8, overflow: "hidden", border: "1px solid #f3f4f6", flexShrink: 0, minWidth: 34 }}>
              <img
                src={item.product_image_url || PLACEHOLDER_IMG}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
            <div style={{ paddingLeft: 10, minWidth: 0, overflow: "hidden" }}>
              <p className="cell-truncate" title={item.product_name || "—"} style={{ fontSize: 13, fontWeight: 600, color: "#111827", lineHeight: 1.3 }}>{item.product_name || "—"}</p>
              <p className="cell-truncate" title={`Reorder at ${reorder} units`} style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 1 }}>Reorder at {reorder} units</p>
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <input
                className="qty-input"
                type="number"
                min={0}
                value={item.quantity_on_hand}
                onChange={(e) => onQtyChange(item.id, Math.max(0, parseInt(e.target.value, 10) || 0))}
                onBlur={(e) => {
                  const v = Math.max(0, parseInt((e.target as HTMLInputElement).value, 10) || 0);
                  onQtyChange(item.id, v);
                }}
                style={{ color: status === "out" ? "#ef4444" : status === "low" ? "#ca8a04" : "#111827", fontWeight: 700 }}
              />
            </div>
            <span className="cell-truncate" title={item.sku || "—"} style={{ fontSize: 11.5, fontFamily: "'IBM Plex Mono', monospace", color: "#6b7280", textAlign: "center" }}>{item.sku || "—"}</span>
            <span className="cell-truncate" title={item.category_name || "Uncategorized"} style={{ display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 99, background: cc.bg, color: cc.text, border: `1px solid ${cc.border}` }}>{item.category_name || "Uncategorized"}</span>
            <span style={{ fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", color: "#9ca3af", textAlign: "center" }}>{item.quantity_reserved || "—"}</span>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: available <= 0 ? "#ef4444" : available <= reorder ? "#ca8a04" : "#111827", textAlign: "center" }}>{available}</span>
            <span style={{ fontSize: 12.5, fontFamily: "'IBM Plex Mono', monospace", color: "#6b7280", textAlign: "right" }}>{item.cost_cents != null ? `$${(item.cost_cents / 100).toFixed(2)}` : "—"}</span>
            <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", color: "#111827", textAlign: "right" }}>{item.product_price_cents != null ? `$${(item.product_price_cents / 100).toFixed(2)}` : "—"}</span>
            <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
              <button type="button" className="icon-btn add" onClick={() => onAdjust(item.id, 1)} style={{ color: "#16a34a", fontSize: 16, fontWeight: 700 }}>+</button>
              <button type="button" className="icon-btn sub" onClick={() => onAdjust(item.id, -1)} style={{ color: "#ef4444", fontSize: 16, fontWeight: 700 }}>−</button>
              <button type="button" className="icon-btn edit" onClick={() => onEdit(item)} style={{ color: "#9ca3af" }} title="Edit">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button type="button" className="icon-btn del" onClick={() => onDelete(item)} style={{ color: "#ef4444" }} title="Remove from tracking">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Variant Stock Tab ───────────────────────────────────────────────────────
function TabVariantStock({ variants, search }: { variants: VariantStock[]; search: string }) {
  const filtered = variants.filter(
    (v) =>
      v.product_name.toLowerCase().includes(search.toLowerCase()) ||
      (v.sku || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-up" style={{ borderRadius: 8, border: "1px solid #f3f4f6", overflow: "hidden", minWidth: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1.6fr) 80px 80px 80px 80px 80px 100px 100px", padding: "8px 20px", background: "#f9fafb", borderBottom: "1px solid #f3f4f6", alignItems: "center" }}>
        {["Product", "SKU", "Size", "Color", "On Hand", "Reserved", "Avail", "Price", "Status"].map((h, i) => (
          <span key={i} style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9ca3af", whiteSpace: "nowrap" }}>{h}</span>
        ))}
      </div>

      {filtered.map((v, i) => {
        const status = getVariantStatus(v);
        const available = Math.max(0, v.quantity_on_hand - v.quantity_reserved);
        const size = v.option1_value || "—";
        const color = v.option2_value || "—";
        const colorDot = color.toLowerCase() === "black" ? "#111827" : color.toLowerCase() === "white" ? "#f9fafb" : "#94a3b8";
        return (
          <div
            key={v.id}
            className="inv-row"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1.6fr) 80px 80px 80px 80px 80px 100px 100px",
              padding: "10px 20px",
              borderBottom: i < filtered.length - 1 ? "1px solid #f9fafb" : "none",
              alignItems: "center",
              borderLeft: `3px solid ${status === "out" ? "#ef4444" : status === "low" ? "#ca8a04" : "transparent"}`,
              minWidth: 0,
            }}
          >
            <span className="cell-truncate" title={v.product_name} style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{v.product_name}</span>
            <span className="cell-truncate" title={v.sku || "—"} style={{ fontSize: 11.5, fontFamily: "'IBM Plex Mono', monospace", color: "#6b7280" }}>{v.sku || "—"}</span>
            <span className="cell-truncate" title={size} style={{ fontSize: 12.5, fontWeight: 600, color: "#374151", textAlign: "center" }}>{size}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: colorDot, border: "1px solid #e5e7eb", flexShrink: 0 }} />
              <span className="cell-truncate" title={color} style={{ fontSize: 12, color: "#374151" }}>{color}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: v.quantity_on_hand === 0 ? "#ef4444" : v.quantity_on_hand <= (v.reorder_point ?? 0) ? "#ca8a04" : "#111827", textAlign: "center" }}>{v.quantity_on_hand}</span>
            <span style={{ fontSize: 12.5, fontFamily: "'IBM Plex Mono', monospace", color: "#9ca3af", textAlign: "center" }}>{v.quantity_reserved || "—"}</span>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: available <= 0 ? "#ef4444" : "#111827", textAlign: "center" }}>{available}</span>
            <span style={{ fontSize: 12.5, fontFamily: "'IBM Plex Mono', monospace", color: "#374151" }}>${(v.price_cents / 100).toFixed(2)}</span>
            <StatusBadge status={status} />
          </div>
        );
      })}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function RetailInventoryDashboard({ restaurantId, restaurantType }: RetailInventoryDashboardProps) {
  const labels = getMerchantLabels(restaurantType);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [variantStock, setVariantStock] = useState<VariantStock[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"products" | "variants">("products");
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [sortBy, setSortBy] = useState("name");

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    menu_item_id: "",
    sku: "",
    barcode: "",
    quantity_on_hand: 0,
    reorder_point: 5,
    cost_cents: 0,
    unit_of_measure: "each",
    is_perishable: false,
    expiry_date: "",
  });

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [editForm, setEditForm] = useState({
    sku: "",
    barcode: "",
    reorder_point: 5,
    cost_cents: 0,
    unit_of_measure: "each",
    is_perishable: false,
    expiry_date: "",
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  const fetchInventory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("merchant_inventory")
        .select(`
          *,
          menu_items (
            name,
            price_cents,
            image_url,
            is_available,
            menu_categories ( name )
          )
        `)
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: InventoryItem[] = (data || []).map((row: Record<string, unknown>) => ({
        ...row,
        id: row.id as string,
        quantity_on_hand: (row.quantity_on_hand as number) ?? 0,
        quantity_reserved: (row.quantity_reserved as number) ?? 0,
        reorder_point: (row.reorder_point as number) ?? 0,
        product_name: (row.menu_items as { name?: string } | null)?.name || (row.sku as string) || "Unknown Product",
        product_price_cents: (row.menu_items as { price_cents?: number } | null)?.price_cents ?? 0,
        product_image_url: (row.menu_items as { image_url?: string | null } | null)?.image_url ?? null,
        product_is_available: (row.menu_items as { is_available?: boolean } | null)?.is_available,
        category_name: (row.menu_items as { menu_categories?: { name?: string } | null } | null)?.menu_categories?.name || "Uncategorized",
      })) as InventoryItem;

      setItems(mapped);

      const existingMenuItemIds = mapped.filter((i) => i.menu_item_id).map((i) => i.menu_item_id);
      const { data: allMenuItems } = await supabase
        .from("menu_items")
        .select("id, name, price_cents")
        .eq("restaurant_id", restaurantId)
        .order("name");

      const unlinked = (allMenuItems || []).filter((mi: { id: string }) => !existingMenuItemIds.includes(mi.id));
      setMenuItems(unlinked);

      const { data: varData } = await supabase
        .from("product_variants")
        .select(`
          id,
          menu_item_id,
          title,
          sku,
          barcode,
          price_cents,
          quantity_on_hand,
          quantity_reserved,
          reorder_point,
          is_available,
          image_url,
          option1_value,
          option2_value,
          menu_items ( name )
        `)
        .in("menu_item_id", (allMenuItems || []).map((mi: { id: string }) => mi.id))
        .order("display_order");

      const mappedVariants: VariantStock[] = (varData || []).map((v: Record<string, unknown>) => ({
        id: v.id as string,
        menu_item_id: v.menu_item_id as string,
        product_name: (v.menu_items as { name?: string } | null)?.name || "Unknown",
        title: v.title as string,
        sku: (v.sku as string | null) ?? null,
        barcode: (v.barcode as string | null) ?? null,
        price_cents: v.price_cents as number,
        quantity_on_hand: (v.quantity_on_hand as number) ?? 0,
        quantity_reserved: (v.quantity_reserved as number) ?? 0,
        reorder_point: (v.reorder_point as number) ?? 0,
        is_available: (v.is_available as boolean) ?? true,
        image_url: (v.image_url as string | null) ?? null,
        option1_value: (v.option1_value as string | null) ?? null,
        option2_value: (v.option2_value as string | null) ?? null,
      }));
      setVariantStock(mappedVariants);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const totalOnHand = items.reduce((a, p) => a + p.quantity_on_hand, 0);
  const inStock = items.filter((p) => getProductStatus(p) === "active").length;
  const lowStock = items.filter((p) => getProductStatus(p) === "low").length;
  const outOfStock = items.filter((p) => getProductStatus(p) === "out").length;
  const costValue = items.reduce((a, p) => a + (p.cost_cents || 0) * Math.max(0, p.quantity_on_hand - p.quantity_reserved), 0) / 100;
  const retailValue = items.reduce((a, p) => a + (p.product_price_cents || 0) * Math.max(0, p.quantity_on_hand - p.quantity_reserved), 0) / 100;

  const variantAlerts = variantStock.filter((v) => getVariantStatus(v) === "out" || getVariantStatus(v) === "low").length;
  const alertItems = items.filter((p) => getProductStatus(p) === "out");

  const STATS = [
    { label: "Tracked Items", value: items.length, color: "#2563eb", icon: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></> },
    { label: "In Stock", value: inStock, color: "#16a34a", icon: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/></> },
    { label: "Low Stock", value: lowStock, color: "#ca8a04", icon: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></> },
    { label: "Out of Stock", value: outOfStock, color: "#ef4444", icon: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></> },
    { label: "Cost Value", value: `$${costValue.toFixed(2)}`, color: "#7c3aed", mono: true, icon: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></> },
    { label: "Retail Value", value: `$${retailValue.toFixed(2)}`, color: "#ea580c", mono: true, icon: <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></> },
  ];

  const handleQtyChange = async (itemId: string, newQty: number) => {
    const prev = items.find((i) => i.id === itemId);
    if (!prev || prev.quantity_on_hand === newQty) return;
    setItems((prevItems) => prevItems.map((i) => (i.id === itemId ? { ...i, quantity_on_hand: newQty } : i)));
    try {
      const { error } = await supabase
        .from("merchant_inventory")
        .update({
          quantity_on_hand: newQty,
          updated_at: new Date().toISOString(),
          ...(newQty > prev.quantity_on_hand ? { last_restocked_at: new Date().toISOString() } : {}),
        })
        .eq("id", itemId);
      if (error) throw error;
      toast.success("Quantity updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update quantity");
      fetchInventory();
    }
  };

  const handleAdjust = (itemId: string, delta: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const newQty = Math.max(0, item.quantity_on_hand + delta);
    handleQtyChange(itemId, newQty);
  };

  const handleEditClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setEditForm({
      sku: item.sku || "",
      barcode: item.barcode || "",
      reorder_point: item.reorder_point ?? 0,
      cost_cents: item.cost_cents ?? 0,
      unit_of_measure: item.unit_of_measure || "each",
      is_perishable: item.is_perishable || false,
      expiry_date: item.expiry_date || "",
    });
    setEditDialogOpen(true);
  };

  const handleEditItem = async () => {
    if (!selectedItem) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("merchant_inventory")
        .update({
          sku: editForm.sku || null,
          barcode: editForm.barcode || null,
          reorder_point: editForm.reorder_point,
          cost_cents: editForm.cost_cents || null,
          unit_of_measure: editForm.unit_of_measure,
          is_perishable: editForm.is_perishable,
          expiry_date: editForm.expiry_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedItem.id);
      if (error) throw error;
      toast.success(`Inventory ${labels.itemNoun} updated`);
      setEditDialogOpen(false);
      fetchInventory();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update item");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      const { error } = await supabase.from("merchant_inventory").delete().eq("id", itemToDelete.id);
      if (error) throw error;
      toast.success(`Inventory ${labels.itemNoun} removed`);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      fetchInventory();
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove item");
    }
  };

  const handleAddItem = async () => {
    if (!addForm.menu_item_id && !addForm.sku) {
      toast.error(`Select a ${labels.itemNoun} or enter a SKU`);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("merchant_inventory").insert({
        restaurant_id: restaurantId,
        menu_item_id: addForm.menu_item_id || null,
        sku: addForm.sku || `SKU-${Date.now().toString(36).toUpperCase()}`,
        barcode: addForm.barcode || null,
        quantity_on_hand: addForm.quantity_on_hand,
        reorder_point: addForm.reorder_point,
        cost_cents: addForm.cost_cents || null,
        unit_of_measure: addForm.unit_of_measure,
        is_perishable: addForm.is_perishable,
        expiry_date: addForm.expiry_date || null,
        last_restocked_at: addForm.quantity_on_hand > 0 ? new Date().toISOString() : null,
      });
      if (error) throw error;
      toast.success(`Inventory ${labels.itemNoun} added`);
      setAddDialogOpen(false);
      setAddForm({ menu_item_id: "", sku: "", barcode: "", quantity_on_hand: 0, reorder_point: 5, cost_cents: 0, unit_of_measure: "each", is_perishable: false, expiry_date: "" });
      fetchInventory();
    } catch (err: unknown) {
      console.error(err);
      toast.error((err as { message?: string })?.message || "Failed to add inventory item");
    } finally {
      setSaving(false);
    }
  };

  const handleSeedInventory = async () => {
    if (menuItems.length === 0) {
      toast.info(`All ${labels.itemNounPlural} already have inventory records`);
      return;
    }
    setSaving(true);
    try {
      const rows = menuItems.map((mi) => ({
        restaurant_id: restaurantId,
        menu_item_id: mi.id,
        sku: `SKU-${mi.id.slice(0, 8).toUpperCase()}`,
        quantity_on_hand: 0,
        reorder_point: 5,
        unit_of_measure: "each",
      }));
      const { error } = await supabase.from("merchant_inventory").insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} inventory records created`);
      fetchInventory();
    } catch (err) {
      console.error(err);
      toast.error("Failed to seed inventory");
    } finally {
      setSaving(false);
    }
  };

  const exportInventory = () => {
    const csv = [
      "SKU,Product,Category,On Hand,Reserved,Available,Reorder Point,Unit Cost,Retail Price,Status",
      ...items.map((i) => {
        const avail = Math.max(0, i.quantity_on_hand - i.quantity_reserved);
        return `${i.sku || ""},${i.product_name || ""},${i.category_name || ""},${i.quantity_on_hand},${i.quantity_reserved},${avail},${i.reorder_point ?? 0},$${((i.cost_cents || 0) / 100).toFixed(2)},$${((i.product_price_cents || 0) / 100).toFixed(2)},${getProductStatus(i)}`;
      }),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Inventory exported to CSV");
  };

  const categoriesForFilter = Array.from(new Set(items.map((i) => (i.category_name || "").toLowerCase()).filter(Boolean)));

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48, fontFamily: "'IBM Plex Sans', sans-serif", color: "#9ca3af" }}>
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading inventory...
      </div>
    );
  }

  return (
    <>
      <FontLoader />
      <div style={{ fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif", background: "#fff", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb", borderRadius: 0, boxShadow: "none", width: "100%", margin: "32px 0 0 0", overflow: "hidden" }}>
        <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
          {items.length === 0 && !loading ? (
            <div style={{ padding: 48, textAlign: "center", border: "1px dashed #e5e7eb", borderRadius: 12, background: "#fafafa" }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#374151", marginBottom: 8 }}>No inventory yet</p>
              <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>Start tracking stock — add items one by one or track all {labels.itemNounPlural} at once.</p>
              {menuItems.length > 0 && (
                <button type="button" className="action-btn-main" onClick={handleSeedInventory} disabled={saving} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#ea580c", color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>
                  Track All {labels.itemNounPlural} ({menuItems.length})
                </button>
              )}
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10 }}>
                {STATS.map((s, i) => (
                  <div key={i} className="stat-card" style={{ padding: "14px 16px", borderRadius: 10, border: "1px solid #f3f4f6", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em" }}>{s.label}</span>
                      <div style={{ width: 26, height: 26, borderRadius: 7, background: `${s.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{s.icon}</svg>
                      </div>
                    </div>
                    <p style={{ fontSize: i >= 4 ? 16 : 22, fontWeight: 800, color: s.color, fontFamily: (s as { mono?: boolean }).mono ? "'IBM Plex Mono', monospace" : undefined, letterSpacing: "-0.5px" }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {alertItems.length > 0 && (
                <div style={{ padding: "12px 16px", borderRadius: 9, background: "#fefce8", border: "1.5px solid #fef08a", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, flex: 1 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "#854d0e" }}>Stock Alerts — {alertItems.length} item{alertItems.length > 1 ? "s" : ""} need attention</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {alertItems.slice(0, 8).map((p) => (
                      <span key={p.id} style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "#ef4444", color: "#fff" }}>{p.product_name}: 0 left</span>
                    ))}
                    {alertItems.length > 8 && <span style={{ fontSize: 11.5, color: "#854d0e" }}>+{alertItems.length - 8} more</span>}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, borderBottom: "1px solid #f3f4f6", paddingBottom: 0 }}>
                <div style={{ display: "flex", gap: 4 }}>
                  {[
                    { id: "products" as const, label: `Product Stock (${items.length})` },
                    { id: "variants" as const, label: "Variant Stock", badge: variantAlerts },
                  ].map((t) => {
                    const active = tab === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        className="tab-btn"
                        onClick={() => setTab(t.id)}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", fontSize: 13, fontWeight: active ? 600 : 500, color: active ? "#ea580c" : "#6b7280", borderBottom: active ? "2px solid #ea580c" : "2px solid transparent", marginBottom: -1 }}
                      >
                        {t.label}
                        {"badge" in t && t.badge > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: "#ef4444", color: "#fff" }}>{t.badge}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button type="button" className="ghost-btn" onClick={exportInventory} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12.5, fontWeight: 600, color: "#374151", fontFamily: "inherit" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Export
                  </button>
                  <button type="button" className="ghost-btn" onClick={() => fetchInventory()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12.5, fontWeight: 600, color: "#374151", fontFamily: "inherit" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                    Refresh
                  </button>
                  {menuItems.length > 0 && (
                    <button type="button" className="ghost-btn" onClick={handleSeedInventory} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12.5, fontWeight: 600, color: "#374151", fontFamily: "inherit" }}>
                      Track All {labels.itemNounPlural} ({menuItems.length})
                    </button>
                  )}
                  <button type="button" className="action-btn-main" onClick={() => setAddDialogOpen(true)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 8, border: "none", background: "#ea580c", color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "inherit", boxShadow: "0 2px 8px rgba(234,88,12,0.22)" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add Item
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input className="search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, SKU, or barcode…" />
                </div>
                {tab === "products" && (
                  <>
                    <div className="select-wrap">
                      <select className="select-input" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
                        <option value="all">All Items</option>
                        {categoriesForFilter.map((c) => (
                          <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                        ))}
                      </select>
                      <Chevron />
                    </div>
                    <div className="select-wrap">
                      <select className="select-input" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="name">Sort: Name</option>
                        <option value="stock">Sort: Stock Level</option>
                      </select>
                      <Chevron />
                    </div>
                  </>
                )}
              </div>

              {tab === "products" ? (
                <TabProductStock
                  items={items}
                  search={search}
                  filterCat={filterCat}
                  sort={sortBy}
                  onQtyChange={handleQtyChange}
                  onAdjust={handleAdjust}
                  onEdit={handleEditClick}
                  onDelete={(item) => { setItemToDelete(item); setDeleteDialogOpen(true); }}
                />
              ) : (
                <TabVariantStock variants={variantStock} search={search} />
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid #f3f4f6" }}>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>Showing {tab === "products" ? items.length : variantStock.length} items</span>
                <span style={{ fontSize: 11.5, color: "#9ca3af" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                  Click + / − to adjust quantities inline. Changes are saved automatically.
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Inventory {labels.itemNoun.charAt(0).toUpperCase() + labels.itemNoun.slice(1)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {menuItems.length > 0 && (
              <div>
                <Label>Link to {labels.itemNoun.charAt(0).toUpperCase() + labels.itemNoun.slice(1)}</Label>
                <Select value={addForm.menu_item_id} onValueChange={(v) => setAddForm({ ...addForm, menu_item_id: v })}>
                  <SelectTrigger><SelectValue placeholder={`Select a ${labels.itemNoun}...`} /></SelectTrigger>
                  <SelectContent>
                    {menuItems.map((mi) => (
                      <SelectItem key={mi.id} value={mi.id}>{mi.name} — ${(mi.price_cents / 100).toFixed(2)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Only {labels.itemNounPlural} without inventory records are shown</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div><Label>SKU</Label><Input placeholder="Auto-generated if blank" value={addForm.sku} onChange={(e) => setAddForm({ ...addForm, sku: e.target.value })} /></div>
              <div><Label>Barcode</Label><Input placeholder="Optional" value={addForm.barcode} onChange={(e) => setAddForm({ ...addForm, barcode: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Initial Qty</Label><Input type="number" min={0} value={addForm.quantity_on_hand} onChange={(e) => setAddForm({ ...addForm, quantity_on_hand: parseInt(e.target.value, 10) || 0 })} /></div>
              <div><Label>Reorder Point</Label><Input type="number" min={0} value={addForm.reorder_point} onChange={(e) => setAddForm({ ...addForm, reorder_point: parseInt(e.target.value, 10) || 0 })} /></div>
              <div><Label>Unit Cost ($)</Label><Input type="number" step="0.01" min={0} value={(addForm.cost_cents / 100).toFixed(2)} onChange={(e) => setAddForm({ ...addForm, cost_cents: Math.round(parseFloat(e.target.value || "0") * 100) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Unit of Measure</Label>
                <Select value={addForm.unit_of_measure} onValueChange={(v) => setAddForm({ ...addForm, unit_of_measure: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["each", "lb", "oz", "kg", "g", "case", "pack", "box"].map((u) => (
                      <SelectItem key={u} value={u}>{u === "each" ? "Each" : u === "lb" ? "Pound (lb)" : u === "oz" ? "Ounce (oz)" : u === "kg" ? "Kilogram (kg)" : u === "g" ? "Gram (g)" : u === "case" ? "Case" : u === "pack" ? "Pack" : "Box"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={addForm.is_perishable} onCheckedChange={(v) => setAddForm({ ...addForm, is_perishable: v })} />
                  <Label>Perishable</Label>
                </div>
              </div>
            </div>
            {addForm.is_perishable && (
              <div><Label>Expiry Date</Label><Input type="date" value={addForm.expiry_date} onChange={(e) => setAddForm({ ...addForm, expiry_date: e.target.value })} /></div>
            )}
            <Button onClick={handleAddItem} disabled={saving} className="w-full">{saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Add to Inventory</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit — {selectedItem?.product_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>SKU</Label><Input value={editForm.sku} onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })} /></div>
              <div><Label>Barcode</Label><Input value={editForm.barcode} onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Reorder Point</Label><Input type="number" min={0} value={editForm.reorder_point} onChange={(e) => setEditForm({ ...editForm, reorder_point: parseInt(e.target.value, 10) || 0 })} /></div>
              <div><Label>Unit Cost ($)</Label><Input type="number" step="0.01" min={0} value={(editForm.cost_cents / 100).toFixed(2)} onChange={(e) => setEditForm({ ...editForm, cost_cents: Math.round(parseFloat(e.target.value || "0") * 100) })} /></div>
              <div>
                <Label>Unit of Measure</Label>
                <Select value={editForm.unit_of_measure} onValueChange={(v) => setEditForm({ ...editForm, unit_of_measure: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["each", "lb", "oz", "kg", "g", "case", "pack", "box"].map((u) => (
                      <SelectItem key={u} value={u}>{u === "each" ? "Each" : u === "lb" ? "Pound (lb)" : u === "oz" ? "Ounce (oz)" : u === "kg" ? "Kilogram (kg)" : u === "g" ? "Gram (g)" : u === "case" ? "Case" : u === "pack" ? "Pack" : "Box"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={editForm.is_perishable} onCheckedChange={(v) => setEditForm({ ...editForm, is_perishable: v })} />
                <Label>Perishable</Label>
              </div>
              {editForm.is_perishable && <div className="flex-1"><Input type="date" value={editForm.expiry_date} onChange={(e) => setEditForm({ ...editForm, expiry_date: e.target.value })} placeholder="Expiry date" /></div>}
            </div>
            <Button onClick={handleEditItem} disabled={saving} className="w-full">{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Inventory {labels.itemNoun.charAt(0).toUpperCase() + labels.itemNoun.slice(1)}</AlertDialogTitle>
            <AlertDialogDescription>
              Remove &quot;{itemToDelete?.product_name}&quot; from inventory tracking? The {labels.itemNoun} itself won&apos;t be deleted — only the inventory record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} className="bg-red-600 hover:bg-red-700">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import RetailProductEditor from "./RetailProductEditor";

// ── Types ───────────────────────────────────────────────────────────────────
interface Product {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  compare_at_price_cents: number | null;
  category_id: string;
  category_name: string;
  is_available: boolean;
  image_url?: string | null;
  brand?: string | null;
  tags?: string[] | null;
  has_variants?: boolean;
  variant_count: number;
  display_order: number;
}

interface Category {
  id: string;
  name: string;
  description?: string | null;
  display_order: number;
  is_active: boolean;
  product_count: number;
}

interface RetailProductCatalogProps {
  restaurantId: string;
  restaurantType?: string | null;
}

// Display shape for list/card (derived from Product)
type ProductDisplay = {
  id: string;
  name: string;
  brand: string;
  collection: string;
  price: number;
  variants: number;
  status: "active" | "draft";
  tags: string[];
  img: string;
  compare_at_price_cents: number | null;
  price_cents: number;
};

// ── FontLoader & styles ─────────────────────────────────────────────────────
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .product-row { transition: background 0.12s; cursor: pointer; }
    .product-row:hover { background: #fffaf7 !important; }

    .product-card { transition: box-shadow 0.15s, transform 0.15s, border-color 0.15s; cursor: pointer; }
    .product-card:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.09) !important; transform: translateY(-2px); border-color: #fed7aa !important; }

    .action-btn { transition: background 0.12s, color 0.12s; cursor: pointer; border: none; background: none; display: flex; align-items: center; justify-content: center; border-radius: 6px; padding: 5px; }
    .action-btn:hover { background: #f3f4f6; }
    .action-btn.danger:hover { background: #fef2f2; color: #ef4444 !important; }

    .tab-btn { transition: color 0.15s, border-color 0.15s; cursor: pointer; background: none; border: none; font-family: 'IBM Plex Sans', sans-serif; }
    .tab-btn:hover { color: #ea580c !important; }

    .select-wrap { position: relative; display: inline-flex; }
    .select-wrap > svg { position: absolute; right: 9px; top: 50%; transform: translateY(-50%); pointer-events: none; color: #9ca3af; }
    .select-input { border: 1px solid #e5e7eb; border-radius: 7px; padding: 7px 28px 7px 11px; font-size: 12.5px; font-family: 'IBM Plex Sans', sans-serif; color: #374151; background: #fff; outline: none; appearance: none; cursor: pointer; transition: border-color 0.15s; }
    .select-input:focus { border-color: #ea580c; }

    .search-input { border: 1px solid #e5e7eb; border-radius: 8px; padding: 9px 12px 9px 36px; font-size: 13px; font-family: 'IBM Plex Sans', sans-serif; color: #111827; width: 100%; outline: none; transition: border-color 0.15s, box-shadow 0.15s; background: #fff; }
    .search-input:focus { border-color: #ea580c; box-shadow: 0 0 0 3px rgba(234,88,12,0.09); }
    .search-input::placeholder { color: #9ca3af; }

    .add-btn { transition: background 0.15s, box-shadow 0.15s, transform 0.12s; cursor: pointer; }
    .add-btn:hover { background: #c2410c !important; box-shadow: 0 4px 16px rgba(234,88,12,0.28) !important; transform: translateY(-1px); }

    .view-toggle { transition: background 0.12s; cursor: pointer; border: none; display: flex; align-items: center; justify-content: center; }
    .view-toggle:hover { background: #fff7ed !important; }

    .stat-card { transition: box-shadow 0.15s; }
    .stat-card:hover { box-shadow: 0 3px 14px rgba(0,0,0,0.07) !important; }

    .tag-chip { display: inline-flex; align-items: center; font-size: 10.5px; font-weight: 500; padding: 1px 7px; border-radius: 4px; background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }

    @keyframes fadeUp { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }
    .fade-up { animation: fadeUp 0.22s ease both; }

    .col-badge { display: inline-flex; align-items: center; font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 99px; letter-spacing: 0.03em; }
  `}</style>
);

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=120&q=80";

const COLLECTION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Apparel:     { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  Accessories: { bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" },
};
const DEFAULT_COLLECTION_COLOR = { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" };
const STATUS_COLORS = {
  active: { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0", dot: "#16a34a" },
  draft:  { bg: "#f9fafb", text: "#6b7280", border: "#e5e7eb", dot: "#9ca3af" },
};

function getCollectionColor(collectionName: string) {
  return COLLECTION_COLORS[collectionName] ?? DEFAULT_COLLECTION_COLOR;
}

// ── Shared components ───────────────────────────────────────────────────────
function Chevron() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
}

function ActionIcon({
  path,
  danger,
  title,
  onClick,
}: {
  path: React.ReactNode;
  danger?: boolean;
  title: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      className={`action-btn${danger ? " danger" : ""}`}
      title={title}
      style={{ color: danger ? "#ef4444" : "#9ca3af" }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {path}
      </svg>
    </button>
  );
}

// ── List Row ─────────────────────────────────────────────────────────────────
function ProductRow({
  p,
  onEdit,
  onToggle,
  onDuplicate,
  onDelete,
}: {
  p: ProductDisplay;
  onEdit: (id: string) => void;
  onToggle: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const cc = getCollectionColor(p.collection);
  const sc = STATUS_COLORS[p.status];
  return (
    <div
      className="product-row"
      role="row"
      style={{ display: "grid", gridTemplateColumns: "48px 2.4fr 1fr 90px 80px 100px 110px", alignItems: "center", gap: 0, padding: "11px 20px", borderBottom: "1px solid #f9fafb" }}
      onClick={() => onEdit(p.id)}
    >
      <div style={{ width: 36, height: 36, borderRadius: 8, overflow: "hidden", border: "1px solid #f3f4f6", flexShrink: 0 }}>
        <img src={p.img} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      </div>
      <div style={{ paddingLeft: 14, minWidth: 0 }}>
        <p style={{ fontSize: 13.5, fontWeight: 600, color: "#111827", marginBottom: 1, letterSpacing: "-0.1px" }}>{p.name}</p>
        <p style={{ fontSize: 11.5, color: "#9ca3af", marginBottom: 4 }}>{p.brand || "—"}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {(p.tags || []).map((t, i) => (
            <span key={i} className="tag-chip">{t}</span>
          ))}
        </div>
      </div>
      <span className="col-badge" style={{ background: cc.bg, color: cc.text, border: `1px solid ${cc.border}` }}>{p.collection}</span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: "#111827", fontFamily: "'IBM Plex Mono', monospace", textAlign: "right", paddingRight: 12 }}>${p.price.toFixed(2)}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "center" }}>
        {p.variants > 0 ? (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            <span style={{ fontSize: 12.5, fontFamily: "'IBM Plex Mono', monospace", color: "#374151", fontWeight: 600 }}>{p.variants}</span>
          </>
        ) : <span style={{ color: "#d1d5db", fontSize: 14 }}>—</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: sc.dot, flexShrink: 0 }} />
        <span style={{ fontSize: 11.5, fontWeight: 600, color: sc.text, textTransform: "capitalize" }}>{p.status}</span>
      </div>
      <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
        <ActionIcon title={p.status === "active" ? "Hide" : "Publish"} path={<><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>} onClick={() => onToggle(p.id)} />
        <ActionIcon title="Edit" path={<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>} onClick={() => onEdit(p.id)} />
        <ActionIcon title="Duplicate" path={<><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>} onClick={() => onDuplicate(p.id)} />
        <ActionIcon title="Delete" danger path={<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>} onClick={() => onDelete(p.id)} />
      </div>
    </div>
  );
}

// ── Grid Card ───────────────────────────────────────────────────────────────
function ProductCard({
  p,
  onEdit,
  onDelete,
}: {
  p: ProductDisplay;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const cc = getCollectionColor(p.collection);
  const sc = STATUS_COLORS[p.status];
  return (
    <div
      className="product-card"
      role="button"
      tabIndex={0}
      style={{ border: "1px solid #f3f4f6", borderRadius: 12, overflow: "hidden", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column" }}
      onClick={() => onEdit(p.id)}
      onKeyDown={(e) => e.key === "Enter" && onEdit(p.id)}
    >
      <div style={{ aspectRatio: "4/3", background: "#f9fafb", overflow: "hidden", position: "relative" }}>
        <img src={p.img} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.background = "#f3f4f6"; }} />
        <div style={{ position: "absolute", top: 8, left: 8 }}>
          <span className="col-badge" style={{ background: cc.bg, color: cc.text, border: `1px solid ${cc.border}`, fontSize: 10 }}>{p.collection}</span>
        </div>
        <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4 }}>
          <ActionIcon title="Edit" path={<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>} onClick={() => onEdit(p.id)} />
          <ActionIcon title="Delete" danger path={<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>} onClick={() => onDelete(p.id)} />
        </div>
      </div>
      <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <p style={{ fontSize: 13.5, fontWeight: 700, color: "#111827", letterSpacing: "-0.1px", lineHeight: 1.3 }}>{p.name}</p>
        <p style={{ fontSize: 11.5, color: "#9ca3af" }}>{p.brand || "—"}</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 8, borderTop: "1px solid #f9fafb" }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#111827", fontFamily: "'IBM Plex Mono', monospace" }}>${p.price.toFixed(2)}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: sc.dot }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: sc.text, textTransform: "capitalize" }}>{p.status}</span>
          </div>
        </div>
        {p.variants > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
            </svg>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>{p.variants} variants</span>
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
          {(p.tags || []).slice(0, 2).map((t, i) => <span key={i} className="tag-chip">{t}</span>)}
          {(p.tags?.length ?? 0) > 2 && <span className="tag-chip">+{(p.tags?.length ?? 0) - 2}</span>}
        </div>
      </div>
    </div>
  );
}

// ── Collections Tab ────────────────────────────────────────────────────────
function TabCollections({
  categories,
  products,
  onManage,
  onCreateCollection,
}: {
  categories: Category[];
  products: Product[];
  onManage: (categoryId: string) => void;
  onCreateCollection: () => void;
}) {
  const collectionImage = (categoryId: string) => {
    const first = products.find((p) => p.category_id === categoryId);
    return first?.image_url || PLACEHOLDER_IMG;
  };
  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {categories.map((c) => (
        <div
          key={c.id}
          className="product-card"
          style={{ display: "grid", gridTemplateColumns: "100px 1fr auto", border: "1px solid #f3f4f6", borderRadius: 12, overflow: "hidden", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
        >
          <img src={collectionImage(c.id)} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ padding: "16px 20px" }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 3 }}>{c.name}</p>
            <p style={{ fontSize: 12.5, color: "#6b7280", marginBottom: 8 }}>{c.description || `${c.product_count} products in this collection.`}</p>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{c.product_count} products</span>
          </div>
          <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", borderLeft: "1px solid #f9fafb" }}>
            <p style={{ fontSize: 10.5, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Revenue</p>
            <p style={{ fontSize: 17, fontWeight: 700, color: "#111827", fontFamily: "'IBM Plex Mono', monospace" }}>—</p>
            <button
              type="button"
              style={{ marginTop: 10, fontSize: 11.5, fontWeight: 600, color: "#ea580c", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontFamily: "inherit" }}
              onClick={() => onManage(c.id)}
            >
              Manage →
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#ea580c", background: "#fff7ed", border: "1.5px dashed #fed7aa", borderRadius: 10, padding: "12px 20px", cursor: "pointer", fontFamily: "inherit", justifyContent: "center" }}
        onClick={onCreateCollection}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Create New Collection
      </button>
    </div>
  );
}

// ── Pricing Tab ──────────────────────────────────────────────────────────────
function TabPricing({ products }: { products: ProductDisplay[] }) {
  const scActive = STATUS_COLORS.active;
  const scDraft = STATUS_COLORS.draft;
  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 0, borderRadius: 8, border: "1px solid #f3f4f6", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 100px 110px 110px 100px", padding: "8px 20px", background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
        {["Product", "Base Price", "Compare-at", "Margin", "Status"].map((h, i) => (
          <span key={i} style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9ca3af" }}>{h}</span>
        ))}
      </div>
      {products.map((p, i) => {
        const compareAt = p.compare_at_price_cents != null ? (p.compare_at_price_cents / 100).toFixed(2) : (p.price * 1.28).toFixed(2);
        const margin = "—";
        const sc = p.status === "active" ? scActive : scDraft;
        return (
          <div
            key={p.id}
            className="product-row"
            style={{ display: "grid", gridTemplateColumns: "2fr 100px 110px 110px 100px", padding: "11px 20px", borderBottom: i < products.length - 1 ? "1px solid #f9fafb" : "none", alignItems: "center" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 7, overflow: "hidden", border: "1px solid #f3f4f6", flexShrink: 0 }}>
                <img src={p.img} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{p.name}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#111827", fontFamily: "'IBM Plex Mono', monospace" }}>${p.price.toFixed(2)}</span>
            <span style={{ fontSize: 12.5, color: "#9ca3af", fontFamily: "'IBM Plex Mono', monospace", textDecoration: "line-through" }}>${compareAt}</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "#16a34a", fontFamily: "'IBM Plex Mono', monospace" }}>{margin}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: sc.dot }} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: sc.text, textTransform: "capitalize" }}>{p.status}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function RetailProductCatalog({ restaurantId, restaurantType }: RetailProductCatalogProps) {
  const labels = getMerchantLabels(restaurantType);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("products");
  const [view, setView] = useState<"list" | "grid">("list");
  const [search, setSearch] = useState("");
  const [collection, setCollection] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data: catData, error: catError } = await supabase
        .from("menu_categories")
        .select("id, name, description, display_order, is_active")
        .eq("restaurant_id", restaurantId)
        .order("display_order");

      if (catError) throw catError;

      const { data: prodData, error: prodError } = await supabase
        .from("menu_items")
        .select(`
          id, name, description, price_cents, compare_at_price_cents, category_id, is_available, image_url, brand, tags, has_variants, display_order, order_count,
          menu_categories(name)
        `)
        .eq("restaurant_id", restaurantId)
        .order("display_order");

      if (prodError) throw prodError;

      let variantCounts: Record<string, number> = {};
      if (prodData && prodData.length > 0) {
        const { data: varData } = await supabase
          .from("product_variants")
          .select("menu_item_id")
          .in("menu_item_id", prodData.map((p: { id: string }) => p.id));
        if (varData) {
          varData.forEach((v: { menu_item_id: string }) => {
            variantCounts[v.menu_item_id] = (variantCounts[v.menu_item_id] || 0) + 1;
          });
        }
      }

      const mappedProducts: Product[] = (prodData || []).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        name: p.name as string,
        description: (p.description as string) || "",
        price_cents: p.price_cents as number,
        compare_at_price_cents: (p.compare_at_price_cents as number | null) ?? null,
        category_id: (p.category_id as string) || "",
        category_name: (p.menu_categories as { name?: string } | null)?.name || "Uncategorized",
        is_available: (p.is_available as boolean) ?? true,
        image_url: (p.image_url as string | null) ?? null,
        brand: (p.brand as string | null) ?? null,
        tags: (p.tags as string[] | null) ?? [],
        has_variants: (p.has_variants as boolean) ?? false,
        variant_count: variantCounts[(p.id as string)] || 0,
        display_order: (p.display_order as number) ?? 0,
      }));

      const catCounts: Record<string, number> = {};
      mappedProducts.forEach((p) => {
        catCounts[p.category_id] = (catCounts[p.category_id] || 0) + 1;
      });

      const mappedCats: Category[] = (catData || []).map((c: Record<string, unknown>) => ({
        id: c.id as string,
        name: c.name as string,
        description: (c.description as string | null) ?? null,
        display_order: (c.display_order as number) ?? 0,
        is_active: (c.is_active as boolean) ?? true,
        product_count: catCounts[(c.id as string)] || 0,
      }));

      setCategories(mappedCats);
      setProducts(mappedProducts);
    } catch (error) {
      console.error("Error fetching catalog:", error);
      toast.error("Failed to load product catalog");
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toDisplay = (p: Product): ProductDisplay => ({
    id: p.id,
    name: p.name,
    brand: p.brand || "",
    collection: p.category_name,
    price: p.price_cents / 100,
    variants: p.variant_count,
    status: p.is_available ? "active" : "draft",
    tags: p.tags || [],
    img: p.image_url || PLACEHOLDER_IMG,
    compare_at_price_cents: p.compare_at_price_cents,
    price_cents: p.price_cents,
  });

  const filtered = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(search.toLowerCase())) ||
      (p.tags && p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())));
    const matchCol = collection === "all" || p.category_id === collection;
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && p.is_available) ||
      (statusFilter === "draft" && !p.is_available);
    return matchSearch && matchCol && matchStatus;
  });

  const filteredDisplay = filtered.map(toDisplay);

  const stats = [
    { label: "Total", value: products.length, color: "#111827" },
    { label: "Active", value: products.filter((p) => p.is_available).length, color: "#16a34a" },
    { label: "Draft", value: products.filter((p) => !p.is_available).length, color: "#9ca3af" },
    { label: "With Variants", value: products.filter((p) => p.variant_count > 0).length, color: "#2563eb" },
    { label: "Collections", value: categories.length, color: "#ea580c" },
  ];

  const handleEdit = (productId: string) => {
    setEditingProductId(productId);
    setEditorOpen(true);
  };

  const handleCreate = () => {
    setEditingProductId(null);
    setEditorOpen(true);
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;
    try {
      const { error } = await supabase.from("menu_items").delete().eq("id", selectedProduct.id);
      if (error) throw error;
      toast.success("Product deleted");
      setDeleteDialogOpen(false);
      setSelectedProduct(null);
      fetchData();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  const handleToggleAvailability = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    supabase
      .from("menu_items")
      .update({ is_available: !product.is_available })
      .eq("id", product.id)
      .then(({ error }) => {
        if (error) { console.error(error); toast.error("Failed to update product"); return; }
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, is_available: !p.is_available } : p))
        );
        toast.success(`${product.name} is now ${!product.is_available ? "active" : "hidden"}`);
      });
  };

  const handleDuplicate = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    try {
      const { data: original } = await supabase.from("menu_items").select("*").eq("id", product.id).single();
      if (!original) return;
      const { id: _id, created_at: _c, updated_at: _u, order_count: _o, ...rest } = original as Record<string, unknown>;
      const { data: newProd, error } = await supabase
        .from("menu_items")
        .insert({
          ...rest,
          name: `${rest.name as string} (Copy)`,
          is_available: false,
        } as any)
        .select()
        .single();
      if (error) throw error;
      if (newProd) {
        const { data: imgData } = await supabase.from("product_images").select("*").eq("menu_item_id", product.id);
        if (imgData?.length) {
          await supabase.from("product_images").insert(
            imgData.map((img: Record<string, unknown>) => ({
              menu_item_id: (newProd as { id: string }).id,
              image_url: img.image_url as string,
              alt_text: img.alt_text as string,
              display_order: img.display_order as number,
              is_primary: img.is_primary as boolean,
            }))
          );
        }
        const { data: optData } = await supabase.from("product_options").select("*").eq("menu_item_id", product.id);
        if (optData?.length) {
          await supabase.from("product_options").insert(
            optData.map((o: Record<string, unknown>) => ({
              menu_item_id: (newProd as { id: string }).id,
              name: o.name as string,
              position: o.position as number,
              values: o.values as string[],
            }))
          );
        }
        const { data: varData } = await supabase.from("product_variants").select("*").eq("menu_item_id", product.id);
        if (varData?.length) {
          await supabase.from("product_variants").insert(
            varData.map((v: Record<string, unknown>) => ({
              menu_item_id: (newProd as { id: string }).id,
              title: v.title,
              option1_name: v.option1_name,
              option1_value: v.option1_value,
              option2_name: v.option2_name,
              option2_value: v.option2_value,
              option3_name: v.option3_name,
              option3_value: v.option3_value,
              sku: (v.sku as string) ? `${v.sku}-COPY` : null,
              barcode: null,
              price_cents: v.price_cents,
              compare_at_price_cents: v.compare_at_price_cents,
              cost_price_cents: v.cost_price_cents,
              quantity_on_hand: 0,
              is_available: v.is_available,
              display_order: v.display_order,
            }))
          );
        }
      }
      toast.success("Product duplicated");
      fetchData();
    } catch (error) {
      console.error("Error duplicating product:", error);
      toast.error("Failed to duplicate product");
    }
  };

  const handleDelete = (productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (p) {
      setSelectedProduct(p);
      setDeleteDialogOpen(true);
    }
  };

  const handleManageCollection = (categoryId: string) => {
    setTab("products");
    setCollection(categoryId);
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontFamily: "'IBM Plex Sans', sans-serif" }}>
        Loading product catalog...
      </div>
    );
  }

  return (
    <>
      <FontLoader />
      <div
        style={{
          fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
          background: "#fff",
          borderTop: "1px solid #e5e7eb",
          borderBottom: "1px solid #e5e7eb",
          borderRadius: 0,
          boxShadow: "none",
          width: "100%",
          margin: "32px 0 0 0",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "20px 28px 0", borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: -1 }}>
            <div style={{ display: "flex", gap: 0 }}>
              {[
                { id: "products", label: `All ${labels.itemNounPlural}` },
                { id: "collections", label: "Collections" },
                { id: "pricing", label: "Pricing" },
              ].map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    className="tab-btn"
                    onClick={() => setTab(t.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "10px 16px",
                      fontSize: 13,
                      fontWeight: active ? 600 : 500,
                      color: active ? "#ea580c" : "#6b7280",
                      borderBottom: active ? "2px solid #ea580c" : "2px solid transparent",
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>{products.length} {labels.itemNounPlural.toLowerCase()} across {categories.length} collection{categories.length !== 1 ? "s" : ""}</p>
              <button
              type="button"
              className="add-btn"
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 9, border: "none", background: "#ea580c", color: "#fff", fontSize: 13.5, fontWeight: 600, fontFamily: "inherit", boxShadow: "0 2px 8px rgba(234,88,12,0.22)" }}
              onClick={handleCreate}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add {labels.itemNoun.charAt(0).toUpperCase() + labels.itemNoun.slice(1)}
            </button>
            </div>
          </div>
        </div>

        <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
          {tab === "products" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
              {stats.map((s, i) => (
                <div key={i} className="stat-card" style={{ padding: "13px 16px", borderRadius: 10, border: "1px solid #f3f4f6", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <p style={{ fontSize: 10.5, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>{s.label}</p>
                  <p style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "'IBM Plex Mono', monospace" }}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {tab === "products" && (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input className="search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, brand, or tag…" />
              </div>
              <div className="select-wrap">
                <select className="select-input" value={collection} onChange={(e) => setCollection(e.target.value)}>
                  <option value="all">All Collections</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <Chevron />
              </div>
              <div className="select-wrap">
                <select className="select-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                </select>
                <Chevron />
              </div>
              <div style={{ display: "flex", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                {[
                  { v: "list" as const, icon: <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></> },
                  { v: "grid" as const, icon: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></> },
                ].map((btn) => (
                  <button
                    key={btn.v}
                    type="button"
                    className="view-toggle"
                    onClick={() => setView(btn.v)}
                    style={{ padding: "7px 10px", background: view === btn.v ? "#ea580c" : "#fff", border: "none", color: view === btn.v ? "#fff" : "#9ca3af", transition: "background 0.15s, color 0.15s" }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{btn.icon}</svg>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="fade-up">
            {tab === "products" && (
              <>
                {view === "list" ? (
                  <div style={{ borderRadius: 8, border: "1px solid #f3f4f6", overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "48px 2.4fr 1fr 90px 80px 100px 110px", padding: "8px 20px", background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                      {["", "Product", "Collection", "Price", "Variants", "Status", "Actions"].map((h, i) => (
                        <span key={i} style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9ca3af" }}>{h}</span>
                      ))}
                    </div>
                    {filteredDisplay.length === 0 ? (
                      <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No products match your search.</div>
                    ) : (
                      filteredDisplay.map((p) => (
                        <ProductRow
                          key={p.id}
                          p={p}
                          onEdit={handleEdit}
                          onToggle={handleToggleAvailability}
                          onDuplicate={handleDuplicate}
                          onDelete={handleDelete}
                        />
                      ))
                    )}
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                    {filteredDisplay.map((p) => (
                      <ProductCard key={p.id} p={p} onEdit={handleEdit} onDelete={handleDelete} />
                    ))}
                  </div>
                )}
              </>
            )}
            {tab === "collections" && (
              <TabCollections
                categories={categories}
                products={products}
                onManage={handleManageCollection}
                onCreateCollection={() => { setTab("products"); handleCreate(); }}
              />
            )}
            {tab === "pricing" && <TabPricing products={filteredDisplay} />}
          </div>

          {tab === "products" && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1px solid #f3f4f6" }}>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>Showing {filteredDisplay.length} of {products.length} {labels.itemNounPlural.toLowerCase()}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" style={{ width: 28, height: 28, borderRadius: 6, border: "1.5px solid #ea580c", background: "#fff7ed", color: "#ea580c", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>1</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <RetailProductEditor
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        productId={editingProductId}
        restaurantId={restaurantId}
        onSave={() => fetchData()}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedProduct?.name}&quot;? This will also delete all images, variants, and inventory tracking. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-red-600 hover:bg-red-700">
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Loader2,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";
import ProductImageUploader, { ProductImage } from "./ProductImageUploader";
import VariantManager, { OptionDef, VariantRow } from "./VariantManager";

// ── Add Product design: styles & primitives ─────────────────────────────────

const ProductEditorStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
    .product-editor * { box-sizing: border-box; }
    .product-editor .field-input {
      width: 100%; border: 1px solid #e5e7eb; border-radius: 7px;
      padding: 9px 12px; font-size: 13.5px;
      font-family: 'IBM Plex Sans', 'Segoe UI', sans-serif;
      color: #111827; background: #fff; outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .product-editor .field-input:focus { border-color: #ea580c; box-shadow: 0 0 0 3px rgba(234,88,12,0.1); }
    .product-editor .field-input::placeholder { color: #9ca3af; }
    .product-editor textarea.field-input { resize: vertical; min-height: 88px; line-height: 1.6; }
    .product-editor .mono-input { font-family: 'IBM Plex Mono', monospace !important; font-size: 13px !important; }
    .product-editor .select-wrap { position: relative; }
    .product-editor .select-wrap svg.chevron { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; color: #9ca3af; }
    .product-editor .select-input {
      width: 100%; border: 1px solid #e5e7eb; border-radius: 7px;
      padding: 9px 32px 9px 12px; font-size: 13.5px;
      font-family: 'IBM Plex Sans', 'Segoe UI', sans-serif;
      color: #111827; background: #fff; outline: none; appearance: none; cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .product-editor .select-input:focus { border-color: #ea580c; box-shadow: 0 0 0 3px rgba(234,88,12,0.1); }
    .product-editor .save-btn { transition: background 0.15s, box-shadow 0.15s, transform 0.12s; cursor: pointer; }
    .product-editor .save-btn:hover { background: #c2410c !important; box-shadow: 0 4px 16px rgba(234,88,12,0.3) !important; transform: translateY(-1px); }
    .product-editor .tab-btn { transition: color 0.15s; cursor: pointer; background: none; border: none; font-family: 'IBM Plex Sans', sans-serif; }
    .product-editor .tab-btn:hover { color: #ea580c !important; }
    .product-editor .section-head {
      font-size: 10px; font-weight: 600; letter-spacing: 0.13em;
      text-transform: uppercase; color: #9ca3af; margin-bottom: 12px;
      display: flex; align-items: center; gap: 6px;
    }
    .product-editor .section-head::after { content: ''; flex: 1; height: 1px; background: #f3f4f6; }
    .product-editor .stat-card { border-radius: 8px; border: 1px solid #f3f4f6; padding: 10px 14px; background: #f9fafb; }
    .product-editor .info-box { background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px; padding: 12px 14px; }
    .product-editor .toggle-track { transition: background 0.2s; cursor: pointer; }
    .product-editor .toggle-thumb { transition: left 0.2s; }
    .product-editor .tag-chip { transition: background 0.12s; cursor: default; }
    .product-editor .tag-chip:hover { background: #fee2e2 !important; }
    .product-editor .upload-zone { transition: border-color 0.15s, background 0.15s; cursor: pointer; }
    .product-editor .upload-zone:hover { border-color: #ea580c !important; background: #fff7ed !important; }
  `}</style>
);

function Toggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      className="toggle-track"
      style={{
        width: 38,
        height: 21,
        borderRadius: 99,
        background: active ? "#ea580c" : "#e5e7eb",
        position: "relative",
        flexShrink: 0,
      }}
    >
      <div
        className="toggle-thumb"
        style={{
          position: "absolute",
          top: 2.5,
          left: active ? 19 : 2.5,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
        }}
      />
    </div>
  );
}

function FieldLabel({
  children,
  required,
  hint,
}: {
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div style={{ marginBottom: 6 }}>
      <label style={{ fontSize: 11.5, fontWeight: 600, color: "#374151", letterSpacing: "0.04em" }}>
        {children}
        {required && <span style={{ color: "#ea580c", marginLeft: 3 }}>*</span>}
      </label>
      {hint && <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{hint}</p>}
    </div>
  );
}

function SelectWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="select-wrap" style={{ width: "100%" }}>
      {children}
      <svg
        className="chevron"
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return <div className="section-head">{children}</div>;
}

const TAB_ICONS: Record<string, React.ReactNode> = {
  general: <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  images: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </>
  ),
  variants: (
    <>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </>
  ),
  pricing: (
    <>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </>
  ),
  shipping: (
    <>
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </>
  ),
  organization: (
    <>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </>
  ),
};

const TABS = [
  { id: "general", label: "General", badge: null as number | null },
  { id: "images", label: "Images", badge: null as number | null },
  { id: "variants", label: "Variants", badge: null as number | null },
  { id: "pricing", label: "Pricing", badge: null as number | null },
  { id: "shipping", label: "Shipping", badge: null as number | null },
  { id: "organization", label: "Organization", badge: null as number | null },
];

// ── Types ──────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
}

interface ProductFormData {
  name: string;
  description: string;
  price_cents: number;
  compare_at_price_cents: number | null;
  cost_price_cents: number | null;
  category_id: string | null;
  brand: string;
  manufacturer: string;
  vendor: string;
  barcode: string;
  tags: string[];
  product_type: string;
  weight_value: number | null;
  weight_unit: string;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  requires_shipping: boolean;
  tax_rate: number;
  is_available: boolean;
}

interface RetailProductEditorProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: string | null; // null = create new
  restaurantId: string;
  onSave: () => void;
}

// ── Main Component ─────────────────────────────────────

const RetailProductEditor = ({
  isOpen,
  onClose,
  productId,
  restaurantId,
  onSave,
}: RetailProductEditorProps) => {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [categories, setCategories] = useState<Category[]>([]);
  const [newTag, setNewTag] = useState("");

  // Form data
  const [form, setForm] = useState<ProductFormData>({
    name: "",
    description: "",
    price_cents: 0,
    compare_at_price_cents: null,
    cost_price_cents: null,
    category_id: null,
    brand: "",
    manufacturer: "",
    vendor: "",
    barcode: "",
    tags: [],
    product_type: "physical",
    weight_value: null,
    weight_unit: "lb",
    length_cm: null,
    width_cm: null,
    height_cm: null,
    requires_shipping: true,
    tax_rate: 0,
    is_available: true,
  });

  // Images
  const [images, setImages] = useState<ProductImage[]>([]);

  // Variants
  const [hasVariants, setHasVariants] = useState(false);
  const [options, setOptions] = useState<OptionDef[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);

  // ── Load data ────────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      if (productId) {
        loadProduct(productId);
      } else {
        resetForm();
      }
    }
  }, [isOpen, productId]);

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      price_cents: 0,
      compare_at_price_cents: null,
      cost_price_cents: null,
      category_id: null,
      brand: "",
      manufacturer: "",
      vendor: "",
      barcode: "",
      tags: [],
      product_type: "physical",
      weight_value: null,
      weight_unit: "lb",
      length_cm: null,
      width_cm: null,
      height_cm: null,
      requires_shipping: true,
      tax_rate: 0,
      is_available: true,
    });
    setImages([]);
    setHasVariants(false);
    setOptions([]);
    setVariants([]);
    setActiveTab("general");
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("menu_categories")
      .select("id, name")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .order("display_order");
    setCategories(data || []);
  };

  const loadProduct = async (id: string) => {
    setLoading(true);
    try {
      // Load product
      const { data: product, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setForm({
        name: product.name || "",
        description: product.description || "",
        price_cents: product.price_cents || 0,
        compare_at_price_cents: product.compare_at_price_cents || null,
        cost_price_cents: product.cost_price_cents || null,
        category_id: product.category_id || null,
        brand: product.brand || "",
        manufacturer: product.manufacturer || "",
        vendor: product.vendor || "",
        barcode: product.barcode || "",
        tags: product.tags || [],
        product_type: product.product_type || "physical",
        weight_value: product.weight_value || null,
        weight_unit: product.weight_unit || "lb",
        length_cm: product.length_cm || null,
        width_cm: product.width_cm || null,
        height_cm: product.height_cm || null,
        requires_shipping: product.requires_shipping ?? true,
        tax_rate: product.tax_rate || 0,
        is_available: product.is_available ?? true,
      });

      // Load images
      const { data: imgData } = await supabase
        .from("product_images")
        .select("*")
        .eq("menu_item_id", id)
        .order("display_order");

      if (imgData && imgData.length > 0) {
        setImages(
          imgData.map((img: any) => ({
            id: img.id,
            image_url: img.image_url,
            alt_text: img.alt_text,
            display_order: img.display_order,
            is_primary: img.is_primary,
          }))
        );
      } else if (product.image_url) {
        // Legacy single image
        setImages([
          {
            image_url: product.image_url,
            alt_text: product.name,
            display_order: 0,
            is_primary: true,
          },
        ]);
      }

      // Load options
      const { data: optData } = await supabase
        .from("product_options")
        .select("*")
        .eq("menu_item_id", id)
        .order("position");

      if (optData && optData.length > 0) {
        setHasVariants(true);
        setOptions(
          optData.map((o: any) => ({
            name: o.name,
            values: o.values || [],
          }))
        );
      }

      // Load variants
      const { data: varData } = await supabase
        .from("product_variants")
        .select("*")
        .eq("menu_item_id", id)
        .order("display_order");

      if (varData && varData.length > 0) {
        setVariants(
          varData.map((v: any) => ({
            id: v.id,
            title: v.title,
            option1_name: v.option1_name,
            option1_value: v.option1_value,
            option2_name: v.option2_name,
            option2_value: v.option2_value,
            option3_name: v.option3_name,
            option3_value: v.option3_value,
            sku: v.sku || "",
            barcode: v.barcode || "",
            price_cents: v.price_cents,
            compare_at_price_cents: v.compare_at_price_cents,
            cost_price_cents: v.cost_price_cents,
            quantity_on_hand: v.quantity_on_hand,
            is_available: v.is_available,
          }))
        );
      }
    } catch (error) {
      console.error("Error loading product:", error);
      toast.error("Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  // ── Form helpers ─────────────────────────────────────

  const updateField = (field: keyof ProductFormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    if (form.tags.includes(newTag.trim())) return;
    updateField("tags", [...form.tags, newTag.trim()]);
    setNewTag("");
  };

  const removeTag = (tag: string) => {
    updateField(
      "tags",
      form.tags.filter((t) => t !== tag)
    );
  };

  const profitMargin = useCallback(() => {
    if (!form.cost_price_cents || !form.price_cents) return null;
    const margin =
      ((form.price_cents - form.cost_price_cents) / form.price_cents) * 100;
    return margin.toFixed(1);
  }, [form.cost_price_cents, form.price_cents]);

  // ── Save ─────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Product name is required");
      setActiveTab("general");
      return;
    }
    if (form.price_cents <= 0 && !hasVariants) {
      toast.error("Price must be greater than 0");
      setActiveTab("general");
      return;
    }

    setSaving(true);
    try {
      // Primary image for the main image_url field
      const primaryImage = images.find((i) => i.is_primary) || images[0];

      const productData: Record<string, any> = {
        restaurant_id: restaurantId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        price_cents: form.price_cents,
        compare_at_price_cents: form.compare_at_price_cents || null,
        cost_price_cents: form.cost_price_cents || null,
        category_id: form.category_id || null,
        brand: form.brand.trim() || null,
        manufacturer: form.manufacturer.trim() || null,
        vendor: form.vendor.trim() || null,
        barcode: form.barcode?.trim() || null,
        tags: form.tags || [],
        product_type: form.product_type,
        weight_value: form.weight_value || null,
        weight_unit: form.weight_unit,
        length_cm: form.length_cm || null,
        width_cm: form.width_cm || null,
        height_cm: form.height_cm || null,
        requires_shipping: form.requires_shipping,
        tax_rate: form.tax_rate,
        is_available: form.is_available,
        has_variants: hasVariants && variants.length > 0,
        image_url: primaryImage?.image_url || null,
      };

      let itemId = productId;

      if (productId) {
        // Update
        const { error } = await supabase
          .from("menu_items")
          .update(productData)
          .eq("id", productId);
        if (error) throw error;
      } else {
        // Insert
        const { data, error } = await supabase
          .from("menu_items")
          .insert([productData])
          .select()
          .single();
        if (error) throw error;
        itemId = data.id;
      }

      if (!itemId) throw new Error("No product ID");

      // ── Save images ────────────────────────────────
      // Delete existing images for this product
      await supabase.from("product_images").delete().eq("menu_item_id", itemId);

      if (images.length > 0) {
        const imageRows = images.map((img, i) => ({
          menu_item_id: itemId!,
          image_url: img.image_url,
          alt_text: img.alt_text || null,
          display_order: i,
          is_primary: img.is_primary,
        }));
        const { error: imgError } = await supabase
          .from("product_images")
          .insert(imageRows);
        if (imgError) console.error("Error saving images:", imgError);
      }

      // ── Save options ───────────────────────────────
      await supabase.from("product_options").delete().eq("menu_item_id", itemId);

      if (hasVariants && options.length > 0) {
        const optionRows = options.map((opt, i) => ({
          menu_item_id: itemId!,
          name: opt.name,
          position: i,
          values: opt.values,
        }));
        const { error: optError } = await supabase
          .from("product_options")
          .insert(optionRows);
        if (optError) console.error("Error saving options:", optError);
      }

      // ── Save variants ──────────────────────────────
      await supabase.from("product_variants").delete().eq("menu_item_id", itemId);

      if (hasVariants && variants.length > 0) {
        const variantRows = variants.map((v, i) => ({
          menu_item_id: itemId!,
          title: v.title,
          option1_name: v.option1_name || null,
          option1_value: v.option1_value || null,
          option2_name: v.option2_name || null,
          option2_value: v.option2_value || null,
          option3_name: v.option3_name || null,
          option3_value: v.option3_value || null,
          sku: v.sku || null,
          barcode: v.barcode || null,
          price_cents: v.price_cents,
          compare_at_price_cents: v.compare_at_price_cents || null,
          cost_price_cents: v.cost_price_cents || null,
          quantity_on_hand: v.quantity_on_hand,
          is_available: v.is_available,
          display_order: i,
        }));
        const { error: varError } = await supabase
          .from("product_variants")
          .insert(variantRows);
        if (varError) console.error("Error saving variants:", varError);
      }

      toast.success(productId ? "Product updated" : "Product created");
      onSave();
      onClose();
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast.error("Failed to save: " + (error.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  // ── Right panel (per tab) ─────────────────────────────────────────────────
  const primaryImage = images.find((i) => i.is_primary) || images[0];
  const RightPanelContent = () => {
    const panels: Record<string, React.ReactNode> = {
      general: (
        <>
          <div
            style={{
              borderRadius: 10,
              overflow: "hidden",
              border: "1px solid #f3f4f6",
              position: "relative",
              aspectRatio: "3/4",
              marginBottom: 14,
              cursor: "pointer",
            }}
            onClick={() => setActiveTab("images")}
          >
            {primaryImage ? (
              <img
                src={primaryImage.image_url}
                alt="Product"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "#f9fafb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#9ca3af",
                  fontSize: 12,
                }}
              >
                No image
              </div>
            )}
            <div
              style={{
                position: "absolute",
                top: 10,
                left: 10,
                fontSize: 10,
                fontWeight: 700,
                padding: "3px 9px",
                borderRadius: 99,
                background: form.is_available ? "#ecfdf5" : "#f1f5f9",
                color: form.is_available ? "#065f46" : "#6b7280",
                border: `1px solid ${form.is_available ? "#a7f3d0" : "#e2e8f0"}`,
              }}
            >
              {form.is_available ? "● Active" : "○ Inactive"}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              ["Variants", hasVariants ? String(variants.length) : "0", "options"],
              ["In Stock", String(variants.reduce((s, v) => s + (v.quantity_on_hand || 0), 0)), "units"],
              ["Images", String(images.length), "uploaded"],
              ["Price", `$${(form.price_cents / 100).toFixed(2)}`, "base"],
            ].map(([l, v, s], i) => (
              <div key={i} className="stat-card">
                <p style={{ fontSize: 16, fontWeight: 700, color: "#111827", fontFamily: "'IBM Plex Mono', monospace" }}>{v}</p>
                <p style={{ fontSize: 10.5, color: "#9ca3af" }}>{l} · {s}</p>
              </div>
            ))}
          </div>
        </>
      ),
      images: (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9ca3af" }}>Image Guidelines</p>
          {[
            ["Min resolution", "1000 × 1000px"],
            ["Aspect ratio", "1:1 or 3:4"],
            ["Max file size", "10MB"],
            ["Formats", "PNG, JPG, WEBP"],
            ["Background", "White preferred"],
            ["Max images", "20 per product"],
          ].map(([k, v], i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid #f9fafb" }}>
              <span style={{ fontSize: 12, color: "#6b7280" }}>{k}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", fontFamily: "'IBM Plex Mono', monospace" }}>{v}</span>
            </div>
          ))}
        </div>
      ),
      variants: (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9ca3af" }}>Inventory Summary</p>
          {[
            ["Total Variants", String(variants.length)],
            ["In Stock", String(variants.filter((v) => (v.quantity_on_hand || 0) > 0).length)],
            ["Out of Stock", String(variants.filter((v) => (v.quantity_on_hand || 0) === 0).length)],
            ["Total Units", String(variants.reduce((s, v) => s + (v.quantity_on_hand || 0), 0))],
          ].map(([k, v], i) => (
            <div key={i} className="stat-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12.5, color: "#374151" }}>{k}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#111827", fontFamily: "'IBM Plex Mono', monospace" }}>{v}</span>
            </div>
          ))}
        </div>
      ),
      pricing: (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9ca3af" }}>Pricing Summary</p>
          {[
            ["Retail Price", `$${(form.price_cents / 100).toFixed(2)}`],
            ["Compare-at", form.compare_at_price_cents ? `$${(form.compare_at_price_cents / 100).toFixed(2)}` : "—"],
            ["Cost", form.cost_price_cents ? `$${(form.cost_price_cents / 100).toFixed(2)}` : "—"],
            ["Gross Margin", profitMargin() != null ? `${profitMargin()}%` : "—"],
          ].map(([k, v], i) => (
            <div key={i} className="stat-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12.5, color: "#374151" }}>{k}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: i === 3 ? "#16a34a" : "#111827", fontFamily: "'IBM Plex Mono', monospace" }}>{v}</span>
            </div>
          ))}
        </div>
      ),
      shipping: (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9ca3af" }}>Package Summary</p>
          {[
            ["Weight", form.weight_value != null ? `${form.weight_value} ${form.weight_unit}` : "—"],
            ["Dimensions", [form.length_cm, form.width_cm, form.height_cm].every((n) => n != null) ? `${form.length_cm} × ${form.width_cm} × ${form.height_cm} cm` : "—"],
          ].map(([k, v], i) => (
            <div key={i} className="stat-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12.5, color: "#374151" }}>{k}</span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "#111827", fontFamily: "'IBM Plex Mono', monospace" }}>{v}</span>
            </div>
          ))}
        </div>
      ),
      organization: (
        <div className="info-box" style={{ marginTop: 4 }}>
          <p style={{ fontSize: 11.5, color: "#6b7280", lineHeight: 1.6 }}>
            Tags: <strong style={{ color: "#374151" }}>{form.tags.length}</strong>. Brand: <strong style={{ color: "#374151" }}>{form.brand || "—"}</strong>. Vendor: <strong style={{ color: "#374151" }}>{form.vendor || "—"}</strong>.
          </p>
        </div>
      ),
    };
    return panels[activeTab] || null;
  };

  // ── Render ───────────────────────────────────────────

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl [&>button]:hidden">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px" }}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#9ca3af" }} />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const tabsWithBadges = TABS.map((t) =>
    t.id === "images" ? { ...t, badge: images.length } : t.id === "variants" ? { ...t, badge: variants.length } : t
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="product-editor p-0 border-0 max-w-[980px] w-full max-h-[92vh] flex flex-col overflow-hidden shadow-xl [&>button]:hidden"
        style={{ fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif", background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb" }}
      >
        <ProductEditorStyles />
        <div className="product-editor" style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid #f3f4f6" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
                <div style={{ width: 3, height: 12, background: "#ea580c", borderRadius: 2 }} />
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.13em", textTransform: "uppercase", color: "#9ca3af" }}>Product Management</span>
              </div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "#111827", letterSpacing: "-0.3px", margin: 0 }}>{productId ? "Edit Product" : "New Product"}</h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: form.is_available ? "#111827" : "#9ca3af" }}>{form.is_available ? "Active" : "Inactive"}</span>
                <Toggle active={form.is_available} onToggle={() => updateField("is_available", !form.is_available)} />
              </div>
              <div style={{ width: 1, height: 22, background: "#f3f4f6" }} />
              <button
                type="button"
                className="save-btn"
                onClick={handleSave}
                disabled={saving}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "9px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: "#ea580c",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  boxShadow: "0 2px 8px rgba(234,88,12,0.22)",
                }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save style={{ width: 13, height: 13 }} />}
                {saving ? "Saving..." : "Save Product"}
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4, display: "flex" }}
                aria-label="Close"
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", padding: "0 24px", borderBottom: "1px solid #f3f4f6", background: "#fafafa", overflowX: "auto" }}>
            {tabsWithBadges.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className="tab-btn"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "11px 14px",
                    fontSize: 12.5,
                    fontWeight: active ? 600 : 500,
                    color: active ? "#ea580c" : "#6b7280",
                    borderBottom: active ? "2px solid #ea580c" : "2px solid transparent",
                    marginBottom: -1,
                    whiteSpace: "nowrap",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: active ? 1 : 0.5 }}>
                    {TAB_ICONS[tab.id]}
                  </svg>
                  {tab.label}
                  {"badge" in tab && tab.badge != null && tab.badge > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: active ? "#ea580c" : "#e5e7eb", color: active ? "#fff" : "#6b7280" }}>{tab.badge}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Body */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", minHeight: 520, flex: 1, overflow: "hidden" }}>
            <div style={{ padding: "22px 24px", borderRight: "1px solid #f3f4f6", overflowY: "auto" }}>
              {activeTab === "general" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <SectionHead>Basic Information</SectionHead>
                  <div>
                    <FieldLabel required>Product Name</FieldLabel>
                    <input
                      className="field-input"
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder="Enter product name"
                    />
                  </div>
                  <div>
                    <FieldLabel hint="Shown on product pages and search results.">Description</FieldLabel>
                    <textarea
                      className="field-input"
                      value={form.description}
                      onChange={(e) => updateField("description", e.target.value)}
                      placeholder="Describe your product"
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <FieldLabel>Collection</FieldLabel>
                      <SelectWrap>
                        <select
                          className="select-input"
                          value={form.category_id || ""}
                          onChange={(e) => updateField("category_id", e.target.value || null)}
                        >
                          <option value="">None</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </SelectWrap>
                    </div>
                    <div>
                      <FieldLabel>Product Type</FieldLabel>
                      <SelectWrap>
                        <select
                          className="select-input"
                          value={form.product_type}
                          onChange={(e) => updateField("product_type", e.target.value)}
                        >
                          <option value="physical">Physical</option>
                          <option value="digital">Digital</option>
                          <option value="gift_card">Gift Card</option>
                          <option value="service">Service</option>
                        </select>
                      </SelectWrap>
                    </div>
                  </div>
                  <div>
                    <FieldLabel hint="UPC, EAN, or ISBN">Barcode / UPC</FieldLabel>
                    <input
                      className="field-input mono-input"
                      value={form.barcode}
                      onChange={(e) => updateField("barcode", e.target.value)}
                      placeholder="Optional barcode"
                    />
                  </div>
                  <SectionHead>Tags</SectionHead>
                  <div>
                    <FieldLabel hint="Press Enter to add a tag.">Product Tags</FieldLabel>
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 7, padding: "7px 10px", display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {form.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="tag-chip"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 11.5,
                            fontWeight: 500,
                            padding: "3px 9px",
                            borderRadius: 5,
                            background: "#f1f5f9",
                            color: "#374151",
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          {tag}
                          <span
                            onClick={() => removeTag(tag)}
                            style={{ cursor: "pointer", color: "#9ca3af", fontWeight: 700, fontSize: 13, lineHeight: 1 }}
                          >
                            ×
                          </span>
                        </span>
                      ))}
                      <input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                        placeholder="Add tag…"
                        style={{
                          border: "none",
                          outline: "none",
                          fontSize: 13,
                          color: "#111827",
                          minWidth: 80,
                          flex: 1,
                          fontFamily: "'IBM Plex Sans', sans-serif",
                          background: "transparent",
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "images" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <SectionHead>Product Images</SectionHead>
                  <ProductImageUploader restaurantId={restaurantId} images={images} onChange={setImages} />
                  <div className="info-box">
                    <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
                      <strong style={{ color: "#374151" }}>Tip:</strong> Click an image to set it as the primary. Recommended size: 1000×1000px minimum.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "variants" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 8, border: "1px solid #f3f4f6", background: "#fafafa" }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>This product has multiple options</p>
                      <p style={{ fontSize: 11.5, color: "#6b7280" }}>Add variants like sizes, colors, or materials.</p>
                    </div>
                    <Toggle active={hasVariants} onToggle={() => setHasVariants(!hasVariants)} />
                  </div>
                  {hasVariants && (
                    <VariantManager
                      options={options}
                      variants={variants}
                      basePrice={form.price_cents}
                      onOptionsChange={setOptions}
                      onVariantsChange={setVariants}
                    />
                  )}
                  {!hasVariants && (
                    <div style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Enable variants above to add size, color, and other options.</div>
                  )}
                </div>
              )}

              {activeTab === "pricing" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <SectionHead>Base Pricing</SectionHead>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                    <div>
                      <FieldLabel required>Base Price</FieldLabel>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#9ca3af", fontWeight: 600 }}>$</span>
                        <input
                          className="field-input mono-input"
                          type="text"
                          value={form.price_cents ? (form.price_cents / 100).toFixed(2) : ""}
                          onChange={(e) => updateField("price_cents", Math.round(parseFloat(e.target.value || "0") * 100))}
                          style={{ paddingLeft: 22 }}
                        />
                      </div>
                    </div>
                    <div>
                      <FieldLabel hint="Shown as strikethrough.">Compare-at Price</FieldLabel>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#9ca3af", fontWeight: 600 }}>$</span>
                        <input
                          className="field-input mono-input"
                          type="text"
                          value={form.compare_at_price_cents != null ? (form.compare_at_price_cents / 100).toFixed(2) : ""}
                          onChange={(e) =>
                            updateField("compare_at_price_cents", e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null)
                          }
                          style={{ paddingLeft: 22 }}
                        />
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Cost per Item</FieldLabel>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#9ca3af", fontWeight: 600 }}>$</span>
                        <input
                          className="field-input mono-input"
                          type="text"
                          value={form.cost_price_cents != null ? (form.cost_price_cents / 100).toFixed(2) : ""}
                          onChange={(e) =>
                            updateField("cost_price_cents", e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null)
                          }
                          style={{ paddingLeft: 22 }}
                        />
                      </div>
                    </div>
                  </div>
                  {profitMargin() != null && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                      {[
                        { label: "Margin", value: `${profitMargin()}%`, color: "#16a34a" },
                        {
                          label: "Profit per Unit",
                          value: `$${((form.price_cents - (form.cost_price_cents || 0)) / 100).toFixed(2)}`,
                          color: "#16a34a",
                        },
                        {
                          label: "Discount",
                          value:
                            form.compare_at_price_cents && form.compare_at_price_cents > form.price_cents
                              ? `${Math.round(((form.compare_at_price_cents - form.price_cents) / form.compare_at_price_cents) * 100)}% off`
                              : "—",
                          color: "#ea580c",
                        },
                      ].map((s, i) => (
                        <div key={i} className="stat-card">
                          <p style={{ fontSize: 17, fontWeight: 700, color: s.color, fontFamily: "'IBM Plex Mono', monospace" }}>{s.value}</p>
                          <p style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 2 }}>{s.label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <SectionHead>Tax & Compliance</SectionHead>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 8, border: "1px solid #f3f4f6", background: "#fafafa" }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Charge Tax on Product</p>
                        <p style={{ fontSize: 11.5, color: "#6b7280" }}>Tax will be calculated at checkout based on customer location.</p>
                      </div>
                      <Toggle active={form.tax_rate > 0} onToggle={() => updateField("tax_rate", form.tax_rate > 0 ? 0 : 0.07)} />
                    </div>
                    <div>
                      <FieldLabel>Tax Rate (%)</FieldLabel>
                      <input
                        className="field-input mono-input"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={form.tax_rate ? (form.tax_rate * 100).toFixed(2) : ""}
                        onChange={(e) => updateField("tax_rate", parseFloat(e.target.value || "0") / 100)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "shipping" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 8, border: "1px solid #f3f4f6", background: "#fafafa" }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>This product requires shipping</p>
                      <p style={{ fontSize: 11.5, color: "#6b7280" }}>Disable for digital or virtual products.</p>
                    </div>
                    <Toggle active={form.requires_shipping} onToggle={() => updateField("requires_shipping", !form.requires_shipping)} />
                  </div>
                  {form.requires_shipping && (
                    <>
                      <SectionHead>Package Dimensions</SectionHead>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
                        {[
                          ["Weight", form.weight_value ?? "", form.weight_unit || "lb"],
                          ["Length", form.length_cm ?? "", "cm"],
                          ["Width", form.width_cm ?? "", "cm"],
                          ["Height", form.height_cm ?? "", "cm"],
                        ].map(([label, val, unit], i) => (
                          <div key={i}>
                            <FieldLabel>{label}</FieldLabel>
                            <div style={{ position: "relative" }}>
                              <input
                                className="field-input mono-input"
                                type="number"
                                step="0.1"
                                value={val}
                                onChange={(e) => {
                                  const key = label === "Weight" ? "weight_value" : label === "Length" ? "length_cm" : label === "Width" ? "width_cm" : "height_cm";
                                  updateField(key, e.target.value ? parseFloat(e.target.value) : null);
                                }}
                                style={{ paddingRight: 32 }}
                              />
                              <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>{unit}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === "organization" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <SectionHead>Catalog Organization</SectionHead>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <FieldLabel>Brand</FieldLabel>
                      <input className="field-input" value={form.brand} onChange={(e) => updateField("brand", e.target.value)} placeholder="Brand name" />
                    </div>
                    <div>
                      <FieldLabel>Vendor</FieldLabel>
                      <input className="field-input" value={form.vendor} onChange={(e) => updateField("vendor", e.target.value)} placeholder="Vendor or supplier" />
                    </div>
                    <div>
                      <FieldLabel>Manufacturer</FieldLabel>
                      <input className="field-input" value={form.manufacturer} onChange={(e) => updateField("manufacturer", e.target.value)} placeholder="Manufacturer" />
                    </div>
                    <div>
                      <FieldLabel>Barcode (UPC / EAN)</FieldLabel>
                      <input className="field-input mono-input" value={form.barcode} onChange={(e) => updateField("barcode", e.target.value)} placeholder="Optional barcode" />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding: "22px 20px", overflowY: "auto", background: "#fafafa" }}>
              <RightPanelContent />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RetailProductEditor;


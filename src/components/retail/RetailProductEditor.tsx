// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Loader2,
  Save,
  Package,
  Image as ImageIcon,
  Tag,
  Layers,
  Truck,
  DollarSign,
  X,
  Plus,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import ProductImageUploader, { ProductImage } from "./ProductImageUploader";
import VariantManager, { OptionDef, VariantRow } from "./VariantManager";

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
  sku: string;
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
    sku: "",
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
      sku: "",
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
        sku: "",
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
        barcode: form.barcode.trim() || null,
        tags: form.tags,
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

  // ── Render ───────────────────────────────────────────

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              {productId ? "Edit Product" : "New Product"}
            </DialogTitle>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="avail-switch" className="text-sm">
                  {form.is_available ? "Active" : "Draft"}
                </Label>
                <Switch
                  id="avail-switch"
                  checked={form.is_available}
                  onCheckedChange={(v) => updateField("is_available", v)}
                />
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saving ? "Saving..." : "Save Product"}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-6 border-b">
            <TabsList className="bg-transparent h-auto p-0 gap-6">
              <TabsTrigger
                value="general"
                className="border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-3"
              >
                <Package className="w-4 h-4 mr-2" /> General
              </TabsTrigger>
              <TabsTrigger
                value="images"
                className="border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-3"
              >
                <ImageIcon className="w-4 h-4 mr-2" /> Images
                {images.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 text-xs">
                    {images.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="variants"
                className="border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-3"
              >
                <Layers className="w-4 h-4 mr-2" /> Variants
                {variants.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 text-xs">
                    {variants.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="pricing"
                className="border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-3"
              >
                <DollarSign className="w-4 h-4 mr-2" /> Pricing
              </TabsTrigger>
              <TabsTrigger
                value="shipping"
                className="border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-3"
              >
                <Truck className="w-4 h-4 mr-2" /> Shipping
              </TabsTrigger>
              <TabsTrigger
                value="organization"
                className="border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-3"
              >
                <Tag className="w-4 h-4 mr-2" /> Organization
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {/* ── General ─────────────────────────── */}
            <TabsContent value="general" className="mt-0 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left column */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">
                      Product Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder="e.g. Classic Cotton T-Shirt"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="desc">Description</Label>
                    <Textarea
                      id="desc"
                      value={form.description}
                      onChange={(e) => updateField("description", e.target.value)}
                      placeholder="Describe your product..."
                      rows={5}
                      className="mt-1.5"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Collection</Label>
                      <Select
                        value={form.category_id || "none"}
                        onValueChange={(v) =>
                          updateField("category_id", v === "none" ? null : v)
                        }
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Select collection" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Product Type</Label>
                      <Select
                        value={form.product_type}
                        onValueChange={(v) => updateField("product_type", v)}
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="physical">Physical</SelectItem>
                          <SelectItem value="digital">Digital</SelectItem>
                          <SelectItem value="gift_card">Gift Card</SelectItem>
                          <SelectItem value="service">Service</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Right column — quick image preview */}
                <div className="space-y-4">
                  <Label>Primary Image</Label>
                  <div
                    className="aspect-square border-2 border-dashed rounded-lg overflow-hidden cursor-pointer hover:border-primary transition-colors flex items-center justify-center bg-muted"
                    onClick={() => setActiveTab("images")}
                  >
                    {images.length > 0 ? (
                      <img
                        src={
                          (images.find((i) => i.is_primary) || images[0])
                            .image_url
                        }
                        alt="Product"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Click to add images
                        </p>
                      </div>
                    )}
                  </div>
                  {images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {images.slice(0, 5).map((img, i) => (
                        <div
                          key={i}
                          className={`w-16 h-16 rounded border-2 flex-shrink-0 overflow-hidden cursor-pointer ${
                            img.is_primary ? "border-primary" : "border-border"
                          }`}
                          onClick={() => setActiveTab("images")}
                        >
                          <img
                            src={img.image_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {images.length > 5 && (
                        <div
                          className="w-16 h-16 rounded border bg-muted flex items-center justify-center text-sm font-medium cursor-pointer"
                          onClick={() => setActiveTab("images")}
                        >
                          +{images.length - 5}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ── Images ──────────────────────────── */}
            <TabsContent value="images" className="mt-0">
              <ProductImageUploader
                restaurantId={restaurantId}
                images={images}
                onChange={setImages}
              />
            </TabsContent>

            {/* ── Variants ────────────────────────── */}
            <TabsContent value="variants" className="mt-0 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Switch
                  checked={hasVariants}
                  onCheckedChange={setHasVariants}
                />
                <div>
                  <p className="font-medium">
                    This product has multiple options
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Add variants like different sizes, colors, or materials
                  </p>
                </div>
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
                <div className="border rounded-lg p-6 text-center text-muted-foreground">
                  <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Enable variants to add size, color, and other options</p>
                </div>
              )}
            </TabsContent>

            {/* ── Pricing ─────────────────────────── */}
            <TabsContent value="pricing" className="mt-0 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>
                    Price ($) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price_cents ? (form.price_cents / 100).toFixed(2) : ""}
                    onChange={(e) =>
                      updateField(
                        "price_cents",
                        Math.round(parseFloat(e.target.value || "0") * 100)
                      )
                    }
                    placeholder="0.00"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Compare At Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={
                      form.compare_at_price_cents
                        ? (form.compare_at_price_cents / 100).toFixed(2)
                        : ""
                    }
                    onChange={(e) =>
                      updateField(
                        "compare_at_price_cents",
                        e.target.value
                          ? Math.round(parseFloat(e.target.value) * 100)
                          : null
                      )
                    }
                    placeholder="Original price"
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Shows as strikethrough on store page
                  </p>
                </div>
                <div>
                  <Label>Cost Per Item ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={
                      form.cost_price_cents
                        ? (form.cost_price_cents / 100).toFixed(2)
                        : ""
                    }
                    onChange={(e) =>
                      updateField(
                        "cost_price_cents",
                        e.target.value
                          ? Math.round(parseFloat(e.target.value) * 100)
                          : null
                      )
                    }
                    placeholder="Your cost"
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Customers won't see this
                  </p>
                </div>
              </div>

              {/* Profit margin display */}
              {profitMargin() !== null && (
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <Info className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm">
                      <span className="font-medium">Profit margin:</span>{" "}
                      <span
                        className={
                          parseFloat(profitMargin()!) > 0
                            ? "text-green-600 font-semibold"
                            : "text-destructive font-semibold"
                        }
                      >
                        {profitMargin()}%
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Profit per unit: $
                      {(
                        (form.price_cents - (form.cost_price_cents || 0)) /
                        100
                      ).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {/* Sale badge preview */}
              {form.compare_at_price_cents &&
                form.compare_at_price_cents > form.price_cents && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <Tag className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="text-sm">
                        <span className="line-through text-muted-foreground mr-2">
                          ${(form.compare_at_price_cents / 100).toFixed(2)}
                        </span>
                        <span className="font-bold text-red-600">
                          ${(form.price_cents / 100).toFixed(2)}
                        </span>
                        <Badge
                          variant="destructive"
                          className="ml-2 text-xs"
                        >
                          Save{" "}
                          {Math.round(
                            ((form.compare_at_price_cents - form.price_cents) /
                              form.compare_at_price_cents) *
                              100
                          )}
                          %
                        </Badge>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        This is how the sale will appear to customers
                      </p>
                    </div>
                  </div>
                )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tax Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={form.tax_rate ? (form.tax_rate * 100).toFixed(2) : ""}
                    onChange={(e) =>
                      updateField(
                        "tax_rate",
                        parseFloat(e.target.value || "0") / 100
                      )
                    }
                    placeholder="0.00"
                    className="mt-1.5"
                  />
                </div>
              </div>
            </TabsContent>

            {/* ── Shipping ────────────────────────── */}
            <TabsContent value="shipping" className="mt-0 space-y-6">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Switch
                  checked={form.requires_shipping}
                  onCheckedChange={(v) => updateField("requires_shipping", v)}
                />
                <div>
                  <p className="font-medium">This is a physical product</p>
                  <p className="text-sm text-muted-foreground">
                    Requires shipping or local delivery
                  </p>
                </div>
              </div>

              {form.requires_shipping && (
                <>
                  <div>
                    <Label className="text-base font-semibold">Weight</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Used to calculate shipping rates
                    </p>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={form.weight_value || ""}
                          onChange={(e) =>
                            updateField(
                              "weight_value",
                              e.target.value
                                ? parseFloat(e.target.value)
                                : null
                            )
                          }
                          placeholder="Weight"
                        />
                      </div>
                      <Select
                        value={form.weight_unit}
                        onValueChange={(v) => updateField("weight_unit", v)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="oz">oz</SelectItem>
                          <SelectItem value="lb">lb</SelectItem>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-semibold">
                      Dimensions (cm)
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Used for box fitting and shipping quotes
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Length</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={form.length_cm || ""}
                          onChange={(e) =>
                            updateField(
                              "length_cm",
                              e.target.value
                                ? parseFloat(e.target.value)
                                : null
                            )
                          }
                          placeholder="L"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Width</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={form.width_cm || ""}
                          onChange={(e) =>
                            updateField(
                              "width_cm",
                              e.target.value
                                ? parseFloat(e.target.value)
                                : null
                            )
                          }
                          placeholder="W"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Height</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={form.height_cm || ""}
                          onChange={(e) =>
                            updateField(
                              "height_cm",
                              e.target.value
                                ? parseFloat(e.target.value)
                                : null
                            )
                          }
                          placeholder="H"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* ── Organization ────────────────────── */}
            <TabsContent value="organization" className="mt-0 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Brand</Label>
                  <Input
                    value={form.brand}
                    onChange={(e) => updateField("brand", e.target.value)}
                    placeholder="e.g. Nike, Apple"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Manufacturer</Label>
                  <Input
                    value={form.manufacturer}
                    onChange={(e) => updateField("manufacturer", e.target.value)}
                    placeholder="Who makes this product"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Vendor / Supplier</Label>
                  <Input
                    value={form.vendor}
                    onChange={(e) => updateField("vendor", e.target.value)}
                    placeholder="Where you buy it from"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Barcode (UPC / EAN / ISBN)</Label>
                  <Input
                    value={form.barcode}
                    onChange={(e) => updateField("barcode", e.target.value)}
                    placeholder="e.g. 012345678901"
                    className="mt-1.5"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <Label className="text-base font-semibold">Tags</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Used for search, filtering, and automated collections
                </p>

                <div className="flex flex-wrap gap-2 mb-3">
                  {form.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {tag}
                      <button
                        className="ml-1 hover:text-destructive"
                        onClick={() => removeTag(tag)}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    className="max-w-xs"
                  />
                  <Button variant="outline" onClick={addTag}>
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>

                {/* Suggested tags */}
                {form.tags.length < 5 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      Suggested:
                    </span>
                    {[
                      "sale",
                      "bestseller",
                      "new-arrival",
                      "clearance",
                      "seasonal",
                      "featured",
                      "gift-idea",
                      "limited-edition",
                    ]
                      .filter((t) => !form.tags.includes(t))
                      .slice(0, 5)
                      .map((tag) => (
                        <button
                          key={tag}
                          className="text-xs px-2 py-0.5 rounded-full border hover:bg-muted transition-colors"
                          onClick={() =>
                            updateField("tags", [...form.tags, tag])
                          }
                        >
                          + {tag}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default RetailProductEditor;


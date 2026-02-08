import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Package,
  Tag,
  Grid3X3,
  List,
  Image,
  ShoppingBag,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import RetailProductEditor from "./RetailProductEditor";

interface Product {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  compare_at_price_cents: number | null;
  category_id: string;
  category_name: string;
  is_available: boolean;
  image_url?: string;
  brand?: string;
  tags?: string[];
  has_variants?: boolean;
  variant_count: number;
  display_order: number;
}

interface Category {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  product_count: number;
}

interface RetailProductCatalogProps {
  restaurantId: string;
}

const RetailProductCatalog = ({ restaurantId }: RetailProductCatalogProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const fetchData = useCallback(async () => {
    try {
      // Fetch categories
      const { data: catData, error: catError } = await supabase
        .from("menu_categories")
        .select("id, name, display_order, is_active")
        .eq("restaurant_id", restaurantId)
        .order("display_order");

      if (catError) throw catError;

      // Fetch products with variant counts
      const { data: prodData, error: prodError } = await supabase
        .from("menu_items")
        .select(`
          id,
          name,
          description,
          price_cents,
          compare_at_price_cents,
          category_id,
          is_available,
          image_url,
          brand,
          tags,
          has_variants,
          display_order,
          order_count,
          menu_categories(name)
        `)
        .eq("restaurant_id", restaurantId)
        .order("display_order");

      if (prodError) throw prodError;

      // Fetch variant counts
      let variantCounts: Record<string, number> = {};
      if (prodData && prodData.length > 0) {
        const { data: varData } = await supabase
          .from("product_variants")
          .select("menu_item_id")
          .in("menu_item_id", prodData.map((p: any) => p.id));

        if (varData) {
          varData.forEach((v: any) => {
            variantCounts[v.menu_item_id] = (variantCounts[v.menu_item_id] || 0) + 1;
          });
        }
      }

      const mappedProducts: Product[] = (prodData || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || "",
        price_cents: p.price_cents,
        compare_at_price_cents: p.compare_at_price_cents || null,
        category_id: p.category_id || "",
        category_name: p.menu_categories?.name || "Uncategorized",
        is_available: p.is_available,
        image_url: p.image_url,
        brand: p.brand || "",
        tags: p.tags || [],
        has_variants: p.has_variants || false,
        variant_count: variantCounts[p.id] || 0,
        display_order: p.display_order,
      }));

      // Count products per category
      const catCounts: Record<string, number> = {};
      mappedProducts.forEach((p) => {
        catCounts[p.category_id] = (catCounts[p.category_id] || 0) + 1;
      });

      const mappedCats: Category[] = (catData || []).map((c: any) => ({
        ...c,
        product_count: catCounts[c.id] || 0,
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

  const filteredProducts = products.filter((p) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      (p.brand && p.brand.toLowerCase().includes(query)) ||
      (p.tags && p.tags.some((t) => t.toLowerCase().includes(query)));
    const matchesCategory =
      selectedCategory === "all" || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
      const { error } = await supabase
        .from("menu_items")
        .delete()
        .eq("id", selectedProduct.id);
      if (error) throw error;
      toast.success("Product deleted");
      setDeleteDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  const handleToggleAvailability = async (product: Product) => {
    try {
      const { error } = await supabase
        .from("menu_items")
        .update({ is_available: !product.is_available })
        .eq("id", product.id);
      if (error) throw error;
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, is_available: !p.is_available } : p
        )
      );
      toast.success(
        `${product.name} is now ${!product.is_available ? "active" : "hidden"}`
      );
    } catch (error) {
      console.error("Error toggling availability:", error);
      toast.error("Failed to update product");
    }
  };

  const handleDuplicate = async (product: Product) => {
    try {
      const { data: original } = await supabase
        .from("menu_items")
        .select("*")
        .eq("id", product.id)
        .single();

      if (!original) return;

      const { id, created_at, updated_at, order_count, ...rest } = original as any;
      const { data: newProd, error } = await supabase
        .from("menu_items")
        .insert({
          ...rest,
          name: `${rest.name} (Copy)`,
          is_available: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Duplicate images
      if (newProd) {
        const { data: imgData } = await supabase
          .from("product_images")
          .select("*")
          .eq("menu_item_id", product.id);

        if (imgData && imgData.length > 0) {
          await supabase.from("product_images").insert(
            imgData.map((img: any) => ({
              menu_item_id: newProd.id,
              image_url: img.image_url,
              alt_text: img.alt_text,
              display_order: img.display_order,
              is_primary: img.is_primary,
            }))
          );
        }

        // Duplicate options
        const { data: optData } = await supabase
          .from("product_options")
          .select("*")
          .eq("menu_item_id", product.id);

        if (optData && optData.length > 0) {
          await supabase.from("product_options").insert(
            optData.map((o: any) => ({
              menu_item_id: newProd.id,
              name: o.name,
              position: o.position,
              values: o.values,
            }))
          );
        }

        // Duplicate variants
        const { data: varData } = await supabase
          .from("product_variants")
          .select("*")
          .eq("menu_item_id", product.id);

        if (varData && varData.length > 0) {
          await supabase.from("product_variants").insert(
            varData.map((v: any) => ({
              menu_item_id: newProd.id,
              title: v.title,
              option1_name: v.option1_name,
              option1_value: v.option1_value,
              option2_name: v.option2_name,
              option2_value: v.option2_value,
              option3_name: v.option3_name,
              option3_value: v.option3_value,
              sku: v.sku ? `${v.sku}-COPY` : null,
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

      toast.success("Product duplicated (with images, options & variants)");
      fetchData();
    } catch (error) {
      console.error("Error duplicating product:", error);
      toast.error("Failed to duplicate product");
    }
  };

  const totalValue = products.reduce((sum, p) => sum + p.price_cents, 0);
  const activeProducts = products.filter((p) => p.is_available).length;
  const variantProducts = products.filter((p) => p.has_variants).length;

  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading product catalog...
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-background">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Product Catalog</h1>
            <p className="text-sm text-muted-foreground">
              {products.length} product{products.length !== 1 ? "s" : ""} across{" "}
              {categories.length} collection{categories.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>

        {/* Sub-Tabs */}
        <Tabs defaultValue="products" className="w-full">
          <TabsList className="bg-muted mb-6">
            <TabsTrigger value="products">
              <ShoppingBag className="w-4 h-4 mr-2" /> All Products
            </TabsTrigger>
            <TabsTrigger value="collections">
              <Grid3X3 className="w-4 h-4 mr-2" /> Collections
            </TabsTrigger>
            <TabsTrigger value="pricing">
              <Tag className="w-4 h-4 mr-2" /> Pricing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{products.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-green-600">
                    {activeProducts}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Draft</p>
                  <p className="text-2xl font-bold text-gray-400">
                    {products.length - activeProducts}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">With Variants</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {variantProducts}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Collections</p>
                  <p className="text-2xl font-bold">{categories.length}</p>
                </CardContent>
              </Card>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, brand, or tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Collections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Collections</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name} ({cat.product_count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setViewMode("table")}
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Empty state */}
            {products.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">
                    No products yet
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Start building your catalog — add your first product with
                    images, variants, pricing, and more.
                  </p>
                  <Button onClick={handleCreate}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Product
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Table View */}
            {viewMode === "table" && filteredProducts.length > 0 && (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14"></TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Collection</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-center">Variants</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => (
                        <TableRow
                          key={product.id}
                          className={`cursor-pointer ${!product.is_available ? "opacity-60" : ""}`}
                          onClick={() => handleEdit(product.id)}
                        >
                          <TableCell>
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-10 h-10 rounded object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                <Image className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              {product.brand && (
                                <p className="text-xs text-muted-foreground">
                                  {product.brand}
                                </p>
                              )}
                              {product.tags && product.tags.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  {product.tags.slice(0, 3).map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant="outline"
                                      className="text-[10px] h-4 px-1"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                  {product.tags.length > 3 && (
                                    <span className="text-[10px] text-muted-foreground">
                                      +{product.tags.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-normal">
                              {product.category_name}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div>
                              <span className="font-semibold">
                                ${(product.price_cents / 100).toFixed(2)}
                              </span>
                              {product.compare_at_price_cents &&
                                product.compare_at_price_cents >
                                  product.price_cents && (
                                  <span className="text-xs text-muted-foreground line-through ml-1">
                                    $
                                    {(
                                      product.compare_at_price_cents / 100
                                    ).toFixed(2)}
                                  </span>
                                )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {product.variant_count > 0 ? (
                              <Badge variant="outline" className="gap-1">
                                <Layers className="w-3 h-3" />
                                {product.variant_count}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={
                                product.is_available ? "default" : "secondary"
                              }
                              className={
                                product.is_available
                                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                                  : ""
                              }
                            >
                              {product.is_available ? "Active" : "Draft"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div
                              className="flex justify-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  handleToggleAvailability(product)
                                }
                                title={
                                  product.is_available ? "Set Draft" : "Publish"
                                }
                              >
                                {product.is_available ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(product.id)}
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDuplicate(product)}
                                title="Duplicate"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-700"
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setDeleteDialogOpen(true);
                                }}
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Grid View */}
            {viewMode === "grid" && filteredProducts.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow ${!product.is_available ? "opacity-60" : ""}`}
                    onClick={() => handleEdit(product.id)}
                  >
                    <CardContent className="p-0">
                      <div className="relative">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-40 object-cover rounded-t"
                          />
                        ) : (
                          <div className="w-full h-40 bg-muted flex items-center justify-center rounded-t">
                            <Package className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        {product.compare_at_price_cents &&
                          product.compare_at_price_cents >
                            product.price_cents && (
                            <Badge
                              variant="destructive"
                              className="absolute top-2 left-2 text-xs"
                            >
                              Sale
                            </Badge>
                          )}
                        {product.variant_count > 0 && (
                          <Badge
                            variant="secondary"
                            className="absolute top-2 right-2 text-xs gap-1"
                          >
                            <Layers className="w-3 h-3" />
                            {product.variant_count}
                          </Badge>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="font-medium truncate">{product.name}</p>
                        {product.brand && (
                          <p className="text-xs text-muted-foreground">
                            {product.brand}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <div>
                            <span className="font-bold text-lg">
                              ${(product.price_cents / 100).toFixed(2)}
                            </span>
                            {product.compare_at_price_cents &&
                              product.compare_at_price_cents >
                                product.price_cents && (
                                <span className="text-xs text-muted-foreground line-through ml-1">
                                  $
                                  {(
                                    product.compare_at_price_cents / 100
                                  ).toFixed(2)}
                                </span>
                              )}
                          </div>
                          <Badge
                            variant={
                              product.is_available ? "default" : "secondary"
                            }
                            className={
                              product.is_available
                                ? "bg-green-100 text-green-800 hover:bg-green-100 text-xs"
                                : "text-xs"
                            }
                          >
                            {product.is_available ? "Active" : "Draft"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="collections">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <Card
                  key={cat.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{cat.name}</CardTitle>
                      <Badge
                        variant={cat.is_active ? "default" : "secondary"}
                        className={
                          cat.is_active
                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                            : ""
                        }
                      >
                        {cat.is_active ? "Active" : "Hidden"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {cat.product_count} product
                        {cat.product_count !== 1 ? "s" : ""}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCategory(cat.id)}
                      >
                        View Products →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {categories.length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Grid3X3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>
                      No collections yet. Add categories to organize your
                      products.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <CardTitle>Pricing Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="border rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold">
                      $
                      {products.length > 0
                        ? (totalValue / products.length / 100).toFixed(2)
                        : "0.00"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Average Price
                    </p>
                  </div>
                  <div className="border rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold">
                      $
                      {products.length > 0
                        ? (
                            Math.min(
                              ...products.map((p) => p.price_cents)
                            ) / 100
                          ).toFixed(2)
                        : "0.00"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Lowest Price
                    </p>
                  </div>
                  <div className="border rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold">
                      $
                      {products.length > 0
                        ? (
                            Math.max(
                              ...products.map((p) => p.price_cents)
                            ) / 100
                          ).toFixed(2)
                        : "0.00"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Highest Price
                    </p>
                  </div>
                </div>

                {products.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Collection</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">
                          Compare At
                        </TableHead>
                        <TableHead className="text-right">Margin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products
                        .sort((a, b) => b.price_cents - a.price_cents)
                        .map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">
                              {product.name}
                            </TableCell>
                            <TableCell>{product.category_name}</TableCell>
                            <TableCell className="text-right font-semibold">
                              ${(product.price_cents / 100).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              {product.compare_at_price_cents ? (
                                <span className="line-through text-muted-foreground">
                                  $
                                  {(
                                    product.compare_at_price_cents / 100
                                  ).toFixed(2)}
                                </span>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="text-right">—</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Full Retail Product Editor */}
      <RetailProductEditor
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        productId={editingProductId}
        restaurantId={restaurantId}
        onSave={() => {
          fetchData();
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedProduct?.name}"? This
              will also delete all images, variants, and inventory tracking.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RetailProductCatalog;

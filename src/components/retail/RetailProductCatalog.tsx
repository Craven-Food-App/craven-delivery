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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  BarChart3,
  Grid3X3,
  List,
  Image,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  category_id: string;
  category_name: string;
  is_available: boolean;
  image_url?: string;
  sku: string;
  barcode?: string;
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    price_cents: 0,
    category_id: "",
    is_available: true,
  });

  const fetchData = useCallback(async () => {
    try {
      // Fetch categories
      const { data: catData, error: catError } = await supabase
        .from("menu_categories")
        .select("id, name, display_order, is_active")
        .eq("restaurant_id", restaurantId)
        .order("display_order");

      if (catError) throw catError;

      // Fetch products
      const { data: prodData, error: prodError } = await supabase
        .from("menu_items")
        .select(`
          id,
          name,
          description,
          price_cents,
          category_id,
          is_available,
          image_url,
          display_order,
          order_count,
          menu_categories(name)
        `)
        .eq("restaurant_id", restaurantId)
        .order("display_order");

      if (prodError) throw prodError;

      const mappedProducts: Product[] = (prodData || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || "",
        price_cents: p.price_cents,
        category_id: p.category_id || "",
        category_name: p.menu_categories?.name || "Uncategorized",
        is_available: p.is_available,
        image_url: p.image_url,
        sku: `SKU-${p.id.slice(0, 8).toUpperCase()}`,
        barcode: `${restaurantId.slice(0, 4)}${p.id.slice(0, 8)}`.toUpperCase(),
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
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setEditForm({
      name: product.name,
      description: product.description,
      price_cents: product.price_cents,
      category_id: product.category_id,
      is_available: product.is_available,
    });
    setEditDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!editForm.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (editForm.price_cents <= 0) {
      toast.error("Price must be greater than $0");
      return;
    }

    try {
      if (selectedProduct) {
        // Update existing
        const { error } = await supabase
          .from("menu_items")
          .update({
            name: editForm.name,
            description: editForm.description,
            price_cents: editForm.price_cents,
            category_id: editForm.category_id || null,
            is_available: editForm.is_available,
          })
          .eq("id", selectedProduct.id);

        if (error) throw error;
        toast.success("Product updated");
      } else {
        // Create new product
        const { error } = await supabase
          .from("menu_items")
          .insert({
            name: editForm.name,
            description: editForm.description,
            price_cents: editForm.price_cents,
            category_id: editForm.category_id || null,
            is_available: editForm.is_available,
            restaurant_id: restaurantId,
          });

        if (error) throw error;
        toast.success("Product created");
      }

      setEditDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Failed to save product");
    }
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
        `${product.name} is now ${!product.is_available ? "available" : "unavailable"}`
      );
    } catch (error) {
      console.error("Error toggling availability:", error);
      toast.error("Failed to update product");
    }
  };

  const handleDuplicateProduct = async (product: Product) => {
    try {
      const { error } = await supabase.from("menu_items").insert({
        name: `${product.name} (Copy)`,
        description: product.description,
        price_cents: product.price_cents,
        category_id: product.category_id || null,
        is_available: false,
        restaurant_id: restaurantId,
        display_order: product.display_order + 1,
      });

      if (error) throw error;

      toast.success("Product duplicated");
      fetchData();
    } catch (error) {
      console.error("Error duplicating product:", error);
      toast.error("Failed to duplicate product");
    }
  };

  const totalValue = products.reduce((sum, p) => sum + p.price_cents, 0);
  const activeProducts = products.filter((p) => p.is_available).length;

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
              {products.length} products across {categories.length} collections
            </p>
          </div>
          <Button onClick={() => {
            setSelectedProduct(null);
            setEditForm({ name: "", description: "", price_cents: 0, category_id: "", is_available: true });
            setEditDialogOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>

        {/* Tabs for sub-sections */}
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Total Products</p>
                  <p className="text-2xl font-bold">{products.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-green-600">{activeProducts}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Hidden</p>
                  <p className="text-2xl font-bold text-gray-400">
                    {products.length - activeProducts}
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
                  placeholder="Search products by name or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
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

            {/* Product Table View */}
            {viewMode === "table" ? (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Collection</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No products found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredProducts.map((product) => (
                          <TableRow
                            key={product.id}
                            className={!product.is_available ? "opacity-60" : ""}
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
                                {product.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-1">
                                    {product.description}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="font-normal">
                                {product.category_name}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              ${(product.price_cents / 100).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={product.is_available ? "default" : "secondary"}
                                className={
                                  product.is_available
                                    ? "bg-green-100 text-green-800 hover:bg-green-100"
                                    : ""
                                }
                              >
                                {product.is_available ? "Active" : "Hidden"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleToggleAvailability(product)}
                                  title={product.is_available ? "Hide" : "Show"}
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
                                  onClick={() => handleEditProduct(product)}
                                  title="Edit"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDuplicateProduct(product)}
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
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              /* Grid View */
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow ${!product.is_available ? "opacity-60" : ""}`}
                    onClick={() => handleEditProduct(product)}
                  >
                    <CardContent className="p-0">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-32 object-cover rounded-t"
                        />
                      ) : (
                        <div className="w-full h-32 bg-muted flex items-center justify-center rounded-t">
                          <Package className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="p-3">
                        <p className="font-medium truncate">{product.name}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="font-bold text-lg">
                            ${(product.price_cents / 100).toFixed(2)}
                          </p>
                          <Badge
                            variant={product.is_available ? "default" : "secondary"}
                            className={
                              product.is_available
                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                : ""
                            }
                          >
                            {product.is_available ? "Active" : "Hidden"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mt-1">
                          {product.sku}
                        </p>
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
                <Card key={cat.id} className="hover:shadow-md transition-shadow">
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
                        {cat.product_count} product{cat.product_count !== 1 ? "s" : ""}
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
                    <p>No collections yet. Add categories to organize your products.</p>
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
                      ${(totalValue / products.length / 100 || 0).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">Average Price</p>
                  </div>
                  <div className="border rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold">
                      ${(Math.min(...products.map((p) => p.price_cents)) / 100).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">Lowest Price</p>
                  </div>
                  <div className="border rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold">
                      ${(Math.max(...products.map((p) => p.price_cents)) / 100).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">Highest Price</p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Collection</TableHead>
                      <TableHead className="text-right">Current Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products
                      .sort((a, b) => b.price_cents - a.price_cents)
                      .map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.category_name}</TableCell>
                          <TableCell className="text-right font-semibold">
                            ${(product.price_cents / 100).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Product Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedProduct?.sku && (
              <p className="text-sm font-mono text-muted-foreground">
                {selectedProduct.sku} • {selectedProduct.barcode}
              </p>
            )}

            <div>
              <Label>Product Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={(editForm.price_cents / 100).toFixed(2)}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      price_cents: Math.round(parseFloat(e.target.value || "0") * 100),
                    })
                  }
                />
              </div>
              <div>
                <Label>Collection</Label>
                <Select
                  value={editForm.category_id}
                  onValueChange={(v) => setEditForm({ ...editForm, category_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select collection" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Available for purchase</Label>
              <Switch
                checked={editForm.is_available}
                onCheckedChange={(checked) =>
                  setEditForm({ ...editForm, is_available: checked })
                }
              />
            </div>

            <Button onClick={handleSaveProduct} className="w-full">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedProduct?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RetailProductCatalog;


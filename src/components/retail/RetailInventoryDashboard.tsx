import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  AlertTriangle,
  TrendingDown,
  Search,
  ArrowUpDown,
  Plus,
  Minus,
  RotateCcw,
  Download,
  Filter,
  BarChart3,
  BoxIcon,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
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
  // Joined from menu_items
  product_name?: string;
  product_price_cents?: number;
  product_image_url?: string;
  product_is_available?: boolean;
  category_name?: string;
}

interface MenuItemOption {
  id: string;
  name: string;
  price_cents: number;
}

interface RetailInventoryDashboardProps {
  restaurantId: string;
}

const RetailInventoryDashboard = ({ restaurantId }: RetailInventoryDashboardProps) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock">("all");
  const [sortBy, setSortBy] = useState<"name" | "stock" | "value">("name");

  // Adjust stock dialog
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState(0);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove" | "set">("add");
  const [adjustmentReason, setAdjustmentReason] = useState("");

  // Add item dialog
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

  // Edit item dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    sku: "",
    barcode: "",
    reorder_point: 5,
    cost_cents: 0,
    unit_of_measure: "each",
    is_perishable: false,
    expiry_date: "",
  });

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  const fetchInventory = useCallback(async () => {
    try {
      // Fetch inventory with joined menu item data
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

      const mapped: InventoryItem[] = (data || []).map((row: any) => ({
        ...row,
        product_name: row.menu_items?.name || row.sku || "Unknown Product",
        product_price_cents: row.menu_items?.price_cents || 0,
        product_image_url: row.menu_items?.image_url,
        product_is_available: row.menu_items?.is_available,
        category_name: row.menu_items?.menu_categories?.name || "Uncategorized",
      }));

      setItems(mapped);

      // Fetch menu items that don't have inventory rows yet (for "Add" dropdown)
      const existingMenuItemIds = mapped
        .filter((i) => i.menu_item_id)
        .map((i) => i.menu_item_id);

      const { data: allMenuItems } = await supabase
        .from("menu_items")
        .select("id, name, price_cents")
        .eq("restaurant_id", restaurantId)
        .order("name");

      const unlinked = (allMenuItems || []).filter(
        (mi: any) => !existingMenuItemIds.includes(mi.id)
      );
      setMenuItems(unlinked);
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

  // ——— Stock status helpers ———
  const getStockStatus = (item: InventoryItem) => {
    const available = item.quantity_on_hand - item.quantity_reserved;
    if (available <= 0) return "out_of_stock";
    if (available <= item.reorder_point) return "low_stock";
    return "in_stock";
  };

  const getAvailable = (item: InventoryItem) =>
    Math.max(0, item.quantity_on_hand - item.quantity_reserved);

  // ——— Filtering & sorting ———
  const filteredItems = items
    .filter((item) => {
      const name = item.product_name || item.sku || "";
      const matchesSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.sku || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.barcode || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter =
        filterStatus === "all" || getStockStatus(item) === filterStatus;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === "name")
        return (a.product_name || "").localeCompare(b.product_name || "");
      if (sortBy === "stock") return getAvailable(a) - getAvailable(b);
      if (sortBy === "value")
        return (
          getAvailable(b) * (b.cost_cents || 0) -
          getAvailable(a) * (a.cost_cents || 0)
        );
      return 0;
    });

  // ——— Summary stats ———
  const totalProducts = items.length;
  const totalInStock = items.filter((i) => getStockStatus(i) === "in_stock").length;
  const lowStockCount = items.filter((i) => getStockStatus(i) === "low_stock").length;
  const outOfStockCount = items.filter((i) => getStockStatus(i) === "out_of_stock").length;
  const totalCostValue = items.reduce(
    (sum, i) => sum + getAvailable(i) * (i.cost_cents || 0),
    0
  );
  const totalRetailValue = items.reduce(
    (sum, i) => sum + getAvailable(i) * (i.product_price_cents || 0),
    0
  );

  // ——— Add inventory item ———
  const handleAddItem = async () => {
    if (!addForm.menu_item_id && !addForm.sku) {
      toast.error("Select a product or enter a SKU");
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

      toast.success("Inventory item added");
      setAddDialogOpen(false);
      setAddForm({
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
      fetchInventory();
    } catch (error: any) {
      console.error("Error adding inventory:", error);
      toast.error(error.message || "Failed to add inventory item");
    } finally {
      setSaving(false);
    }
  };

  // ——— Adjust stock (add/remove/set) ———
  const handleAdjustStock = async () => {
    if (!selectedItem) return;

    let newQty = selectedItem.quantity_on_hand;
    if (adjustmentType === "add") newQty += adjustmentQty;
    else if (adjustmentType === "remove") newQty = Math.max(0, newQty - adjustmentQty);
    else if (adjustmentType === "set") newQty = adjustmentQty;

    setSaving(true);
    try {
      const updateData: any = {
        quantity_on_hand: newQty,
        updated_at: new Date().toISOString(),
      };

      if (adjustmentType === "add") {
        updateData.last_restocked_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("merchant_inventory")
        .update(updateData)
        .eq("id", selectedItem.id);

      if (error) throw error;

      toast.success(
        `Stock updated: ${selectedItem.product_name} → ${newQty} ${selectedItem.unit_of_measure}`
      );
      setAdjustDialogOpen(false);
      setAdjustmentQty(0);
      setAdjustmentReason("");
      fetchInventory();
    } catch (error: any) {
      console.error("Error adjusting stock:", error);
      toast.error(error.message || "Failed to adjust stock");
    } finally {
      setSaving(false);
    }
  };

  // ——— Edit inventory details ———
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

      toast.success("Inventory item updated");
      setEditDialogOpen(false);
      fetchInventory();
    } catch (error: any) {
      console.error("Error updating inventory:", error);
      toast.error(error.message || "Failed to update item");
    } finally {
      setSaving(false);
    }
  };

  // ——— Delete inventory item ———
  const handleDeleteItem = async () => {
    if (!itemToDelete) return;

    try {
      const { error } = await supabase
        .from("merchant_inventory")
        .delete()
        .eq("id", itemToDelete.id);

      if (error) throw error;

      toast.success("Inventory item removed");
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      fetchInventory();
    } catch (error: any) {
      console.error("Error deleting inventory:", error);
      toast.error(error.message || "Failed to delete item");
    }
  };

  // ——— Seed all menu items that don't have inventory rows ———
  const handleSeedInventory = async () => {
    if (menuItems.length === 0) {
      toast.info("All products already have inventory records");
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
    } catch (error: any) {
      console.error("Error seeding inventory:", error);
      toast.error(error.message || "Failed to seed inventory");
    } finally {
      setSaving(false);
    }
  };

  // ——— Export CSV ———
  const exportInventory = () => {
    const csv = [
      "SKU,Product,Category,On Hand,Reserved,Available,Reorder Point,Unit Cost,Retail Price,Status,Barcode,Perishable,Expiry",
      ...items.map((i) => {
        const avail = getAvailable(i);
        return `${i.sku || ""},${i.product_name || ""},${i.category_name || ""},${i.quantity_on_hand},${i.quantity_reserved},${avail},${i.reorder_point},$${((i.cost_cents || 0) / 100).toFixed(2)},$${((i.product_price_cents || 0) / 100).toFixed(2)},${getStockStatus(i)},${i.barcode || ""},${i.is_perishable},${i.expiry_date || ""}`;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading inventory...
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-background">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Inventory Management</h1>
            <p className="text-sm text-muted-foreground">
              Track stock levels, manage products, and set reorder alerts
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportInventory}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={fetchInventory}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            {menuItems.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleSeedInventory} disabled={saving}>
                <Package className="w-4 h-4 mr-2" />
                Track All Products ({menuItems.length})
              </Button>
            )}
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        {/* Empty state */}
        {items.length === 0 ? (
          <Card className="py-16">
            <CardContent className="text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-xl font-semibold mb-2">No inventory yet</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Start tracking stock for your products. You can add items one by one, or click
                "Track All Products" to create inventory records for all your existing products at once.
              </p>
              <div className="flex gap-3 justify-center">
                {menuItems.length > 0 && (
                  <Button onClick={handleSeedInventory} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Package className="w-4 h-4 mr-2" />}
                    Track All Products ({menuItems.length})
                  </Button>
                )}
                <Button variant="outline" onClick={() => setAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Single Item
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <BoxIcon className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                  <p className="text-2xl font-bold">{totalProducts}</p>
                  <p className="text-xs text-muted-foreground">Tracked Items</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Package className="w-5 h-5 mx-auto mb-1 text-green-500" />
                  <p className="text-2xl font-bold text-green-600">{totalInStock}</p>
                  <p className="text-xs text-muted-foreground">In Stock</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
                  <p className="text-2xl font-bold text-yellow-600">{lowStockCount}</p>
                  <p className="text-xs text-muted-foreground">Low Stock</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingDown className="w-5 h-5 mx-auto mb-1 text-red-500" />
                  <p className="text-2xl font-bold text-red-600">{outOfStockCount}</p>
                  <p className="text-xs text-muted-foreground">Out of Stock</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <BarChart3 className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                  <p className="text-2xl font-bold">${(totalCostValue / 100).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Cost Value</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <BarChart3 className="w-5 h-5 mx-auto mb-1 text-orange-500" />
                  <p className="text-2xl font-bold">${(totalRetailValue / 100).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Retail Value</p>
                </CardContent>
              </Card>
            </div>

            {/* Low Stock Alerts */}
            {lowStockCount + outOfStockCount > 0 && (
              <Card className="mb-6 border-yellow-200 bg-yellow-50/50 dark:bg-yellow-900/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Stock Alerts ({lowStockCount + outOfStockCount} items need attention)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {items
                      .filter((i) => getStockStatus(i) !== "in_stock")
                      .slice(0, 10)
                      .map((item) => (
                        <Badge
                          key={item.id}
                          variant={getStockStatus(item) === "out_of_stock" ? "destructive" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedItem(item);
                            setAdjustmentType("add");
                            setAdjustDialogOpen(true);
                          }}
                        >
                          {item.product_name}: {getAvailable(item)} left
                        </Badge>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, SKU, or barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-[160px]">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="stock">Stock Level</SelectItem>
                  <SelectItem value="value">Inventory Value</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Inventory Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-center">On Hand</TableHead>
                      <TableHead className="text-center">Reserved</TableHead>
                      <TableHead className="text-center">Available</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                          {searchQuery ? "No items match your search" : "No inventory items"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredItems.map((item) => {
                        const status = getStockStatus(item);
                        const available = getAvailable(item);
                        return (
                          <TableRow
                            key={item.id}
                            className={
                              status === "out_of_stock"
                                ? "bg-red-50/50 dark:bg-red-900/10"
                                : status === "low_stock"
                                ? "bg-yellow-50/50 dark:bg-yellow-900/10"
                                : ""
                            }
                          >
                            <TableCell>
                              {item.product_image_url ? (
                                <img
                                  src={item.product_image_url}
                                  alt={item.product_name}
                                  className="w-10 h-10 rounded object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                  <Package className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.product_name}</p>
                                {item.barcode && (
                                  <p className="text-xs text-muted-foreground font-mono">
                                    {item.barcode}
                                  </p>
                                )}
                                {item.is_perishable && (
                                  <Badge variant="outline" className="text-xs mt-0.5">
                                    Perishable
                                    {item.expiry_date && ` • Exp: ${item.expiry_date}`}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{item.sku || "—"}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="font-normal">
                                {item.category_name}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              {item.quantity_on_hand}
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground">
                              {item.quantity_reserved}
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              {available}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={
                                  status === "in_stock"
                                    ? "default"
                                    : status === "low_stock"
                                    ? "outline"
                                    : "destructive"
                                }
                                className={
                                  status === "in_stock"
                                    ? "bg-green-100 text-green-800 hover:bg-green-100"
                                    : status === "low_stock"
                                    ? "border-yellow-500 text-yellow-700"
                                    : ""
                                }
                              >
                                {status === "in_stock"
                                  ? "In Stock"
                                  : status === "low_stock"
                                  ? "Low Stock"
                                  : "Out of Stock"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {item.cost_cents
                                ? `$${(item.cost_cents / 100).toFixed(2)}`
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {item.product_price_cents
                                ? `$${(item.product_price_cents / 100).toFixed(2)}`
                                : "—"}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Add stock"
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setAdjustmentType("add");
                                    setAdjustDialogOpen(true);
                                  }}
                                >
                                  <Plus className="w-4 h-4 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Remove stock"
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setAdjustmentType("remove");
                                    setAdjustDialogOpen(true);
                                  }}
                                >
                                  <Minus className="w-4 h-4 text-red-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Edit details"
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setEditForm({
                                      sku: item.sku || "",
                                      barcode: item.barcode || "",
                                      reorder_point: item.reorder_point,
                                      cost_cents: item.cost_cents || 0,
                                      unit_of_measure: item.unit_of_measure,
                                      is_perishable: item.is_perishable,
                                      expiry_date: item.expiry_date || "",
                                    });
                                    setEditDialogOpen(true);
                                  }}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:text-red-700"
                                  title="Delete"
                                  onClick={() => {
                                    setItemToDelete(item);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground mt-4 text-center">
              Showing {filteredItems.length} of {totalProducts} tracked items
            </p>
          </>
        )}
      </div>

      {/* ==================== ADD ITEM DIALOG ==================== */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Inventory Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {menuItems.length > 0 && (
              <div>
                <Label>Link to Product</Label>
                <Select
                  value={addForm.menu_item_id}
                  onValueChange={(v) => setAddForm({ ...addForm, menu_item_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {menuItems.map((mi) => (
                      <SelectItem key={mi.id} value={mi.id}>
                        {mi.name} — ${(mi.price_cents / 100).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Only products without inventory records are shown
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>SKU</Label>
                <Input
                  placeholder="Auto-generated if blank"
                  value={addForm.sku}
                  onChange={(e) => setAddForm({ ...addForm, sku: e.target.value })}
                />
              </div>
              <div>
                <Label>Barcode</Label>
                <Input
                  placeholder="Optional"
                  value={addForm.barcode}
                  onChange={(e) => setAddForm({ ...addForm, barcode: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Initial Qty</Label>
                <Input
                  type="number"
                  min={0}
                  value={addForm.quantity_on_hand}
                  onChange={(e) =>
                    setAddForm({ ...addForm, quantity_on_hand: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label>Reorder Point</Label>
                <Input
                  type="number"
                  min={0}
                  value={addForm.reorder_point}
                  onChange={(e) =>
                    setAddForm({ ...addForm, reorder_point: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label>Unit Cost ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={(addForm.cost_cents / 100).toFixed(2)}
                  onChange={(e) =>
                    setAddForm({
                      ...addForm,
                      cost_cents: Math.round(parseFloat(e.target.value || "0") * 100),
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Unit of Measure</Label>
                <Select
                  value={addForm.unit_of_measure}
                  onValueChange={(v) => setAddForm({ ...addForm, unit_of_measure: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="each">Each</SelectItem>
                    <SelectItem value="lb">Pound (lb)</SelectItem>
                    <SelectItem value="oz">Ounce (oz)</SelectItem>
                    <SelectItem value="kg">Kilogram (kg)</SelectItem>
                    <SelectItem value="g">Gram (g)</SelectItem>
                    <SelectItem value="case">Case</SelectItem>
                    <SelectItem value="pack">Pack</SelectItem>
                    <SelectItem value="box">Box</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={addForm.is_perishable}
                    onCheckedChange={(v) => setAddForm({ ...addForm, is_perishable: v })}
                  />
                  <Label>Perishable</Label>
                </div>
              </div>
            </div>

            {addForm.is_perishable && (
              <div>
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={addForm.expiry_date}
                  onChange={(e) => setAddForm({ ...addForm, expiry_date: e.target.value })}
                />
              </div>
            )}

            <Button onClick={handleAddItem} disabled={saving} className="w-full">
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add to Inventory
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== ADJUST STOCK DIALOG ==================== */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock — {selectedItem?.product_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
              <div className="text-center flex-1">
                <p className="text-2xl font-bold">{selectedItem?.quantity_on_hand}</p>
                <p className="text-xs text-muted-foreground">On Hand</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-2xl font-bold">{selectedItem?.quantity_reserved}</p>
                <p className="text-xs text-muted-foreground">Reserved</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-2xl font-bold">
                  {selectedItem ? getAvailable(selectedItem) : 0}
                </p>
                <p className="text-xs text-muted-foreground">Available</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-sm font-mono">{selectedItem?.sku || "—"}</p>
                <p className="text-xs text-muted-foreground">SKU</p>
              </div>
            </div>

            <div>
              <Label>Adjustment Type</Label>
              <Select value={adjustmentType} onValueChange={(v: any) => setAdjustmentType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add Stock (Restock)</SelectItem>
                  <SelectItem value="remove">Remove Stock (Damage/Loss)</SelectItem>
                  <SelectItem value="set">Set Exact Count (Audit)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                min={0}
                value={adjustmentQty}
                onChange={(e) => setAdjustmentQty(parseInt(e.target.value) || 0)}
              />
              {selectedItem && adjustmentQty > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  New on-hand will be:{" "}
                  <strong>
                    {adjustmentType === "add"
                      ? selectedItem.quantity_on_hand + adjustmentQty
                      : adjustmentType === "remove"
                      ? Math.max(0, selectedItem.quantity_on_hand - adjustmentQty)
                      : adjustmentQty}
                  </strong>{" "}
                  {selectedItem.unit_of_measure}
                </p>
              )}
            </div>

            <div>
              <Label>Reason (optional)</Label>
              <Input
                placeholder="e.g. Weekly restock, damaged items, inventory count..."
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
              />
            </div>

            <Button onClick={handleAdjustStock} disabled={adjustmentQty <= 0 || saving} className="w-full">
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : adjustmentType === "add" ? (
                <Plus className="w-4 h-4 mr-2" />
              ) : adjustmentType === "remove" ? (
                <Minus className="w-4 h-4 mr-2" />
              ) : null}
              {adjustmentType === "add"
                ? `Add ${adjustmentQty} ${selectedItem?.unit_of_measure || "units"}`
                : adjustmentType === "remove"
                ? `Remove ${adjustmentQty} ${selectedItem?.unit_of_measure || "units"}`
                : `Set to ${adjustmentQty} ${selectedItem?.unit_of_measure || "units"}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== EDIT ITEM DIALOG ==================== */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit — {selectedItem?.product_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>SKU</Label>
                <Input
                  value={editForm.sku}
                  onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                />
              </div>
              <div>
                <Label>Barcode</Label>
                <Input
                  value={editForm.barcode}
                  onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Reorder Point</Label>
                <Input
                  type="number"
                  min={0}
                  value={editForm.reorder_point}
                  onChange={(e) =>
                    setEditForm({ ...editForm, reorder_point: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label>Unit Cost ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={(editForm.cost_cents / 100).toFixed(2)}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      cost_cents: Math.round(parseFloat(e.target.value || "0") * 100),
                    })
                  }
                />
              </div>
              <div>
                <Label>Unit of Measure</Label>
                <Select
                  value={editForm.unit_of_measure}
                  onValueChange={(v) => setEditForm({ ...editForm, unit_of_measure: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="each">Each</SelectItem>
                    <SelectItem value="lb">Pound (lb)</SelectItem>
                    <SelectItem value="oz">Ounce (oz)</SelectItem>
                    <SelectItem value="kg">Kilogram (kg)</SelectItem>
                    <SelectItem value="g">Gram (g)</SelectItem>
                    <SelectItem value="case">Case</SelectItem>
                    <SelectItem value="pack">Pack</SelectItem>
                    <SelectItem value="box">Box</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={editForm.is_perishable}
                  onCheckedChange={(v) => setEditForm({ ...editForm, is_perishable: v })}
                />
                <Label>Perishable</Label>
              </div>
              {editForm.is_perishable && (
                <div className="flex-1">
                  <Input
                    type="date"
                    value={editForm.expiry_date}
                    onChange={(e) => setEditForm({ ...editForm, expiry_date: e.target.value })}
                    placeholder="Expiry date"
                  />
                </div>
              )}
            </div>

            <Button onClick={handleEditItem} disabled={saving} className="w-full">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== DELETE CONFIRMATION ==================== */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Inventory Item</AlertDialogTitle>
            <AlertDialogDescription>
              Remove "{itemToDelete?.product_name}" from inventory tracking? The product itself
              won't be deleted — only the inventory record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RetailInventoryDashboard;

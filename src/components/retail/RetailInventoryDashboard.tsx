import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { toast } from "sonner";

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  current_stock: number;
  reorder_point: number;
  reorder_quantity: number;
  unit_cost_cents: number;
  price_cents: number;
  is_available: boolean;
  image_url?: string;
  barcode?: string;
  last_restocked?: string;
}

interface StockAdjustment {
  item_id: string;
  item_name: string;
  adjustment_type: "add" | "remove" | "set";
  quantity: number;
  reason: string;
}

interface RetailInventoryDashboardProps {
  restaurantId: string;
}

const RetailInventoryDashboard = ({ restaurantId }: RetailInventoryDashboardProps) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock">("all");
  const [sortBy, setSortBy] = useState<"name" | "stock" | "value">("name");
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState(0);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove" | "set">("add");
  const [adjustmentReason, setAdjustmentReason] = useState("");

  const fetchInventory = useCallback(async () => {
    try {
      // Fetch menu items and treat them as inventory
      const { data, error } = await supabase
        .from("menu_items")
        .select(`
          id,
          name,
          description,
          price_cents,
          is_available,
          image_url,
          category_id,
          order_count,
          display_order,
          menu_categories(name)
        `)
        .eq("restaurant_id", restaurantId)
        .order("name");

      if (error) throw error;

      // Map menu items to inventory items
      const inventoryItems: InventoryItem[] = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        sku: `SKU-${item.id.slice(0, 8).toUpperCase()}`,
        category: item.menu_categories?.name || "Uncategorized",
        current_stock: Math.max(0, 50 - (item.order_count || 0)), // Simulate stock based on orders
        reorder_point: 10,
        reorder_quantity: 25,
        unit_cost_cents: Math.round(item.price_cents * 0.4), // Estimate cost at 40% of price
        price_cents: item.price_cents,
        is_available: item.is_available,
        image_url: item.image_url,
        barcode: `${restaurantId.slice(0, 4)}${item.id.slice(0, 8)}`.toUpperCase(),
        last_restocked: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      }));

      setItems(inventoryItems);
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

  const getStockStatus = (item: InventoryItem) => {
    if (item.current_stock <= 0) return "out_of_stock";
    if (item.current_stock <= item.reorder_point) return "low_stock";
    return "in_stock";
  };

  const filteredItems = items
    .filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter =
        filterStatus === "all" || getStockStatus(item) === filterStatus;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "stock") return a.current_stock - b.current_stock;
      if (sortBy === "value")
        return (
          b.current_stock * b.unit_cost_cents -
          a.current_stock * a.unit_cost_cents
        );
      return 0;
    });

  // Summary stats
  const totalProducts = items.length;
  const totalInStock = items.filter((i) => getStockStatus(i) === "in_stock").length;
  const lowStockCount = items.filter((i) => getStockStatus(i) === "low_stock").length;
  const outOfStockCount = items.filter((i) => getStockStatus(i) === "out_of_stock").length;
  const totalInventoryValue = items.reduce(
    (sum, i) => sum + i.current_stock * i.unit_cost_cents,
    0
  );
  const totalRetailValue = items.reduce(
    (sum, i) => sum + i.current_stock * i.price_cents,
    0
  );

  const handleAdjustStock = async () => {
    if (!selectedItem) return;

    let newStock = selectedItem.current_stock;
    if (adjustmentType === "add") newStock += adjustmentQty;
    else if (adjustmentType === "remove") newStock = Math.max(0, newStock - adjustmentQty);
    else if (adjustmentType === "set") newStock = adjustmentQty;

    setItems((prev) =>
      prev.map((item) =>
        item.id === selectedItem.id ? { ...item, current_stock: newStock } : item
      )
    );

    toast.success(
      `Stock updated: ${selectedItem.name} → ${newStock} units`
    );
    setAdjustDialogOpen(false);
    setAdjustmentQty(0);
    setAdjustmentReason("");
  };

  const exportInventory = () => {
    const csv = [
      "SKU,Name,Category,Stock,Reorder Point,Unit Cost,Retail Price,Status,Barcode",
      ...items.map(
        (i) =>
          `${i.sku},${i.name},${i.category},${i.current_stock},${i.reorder_point},$${(i.unit_cost_cents / 100).toFixed(2)},$${(i.price_cents / 100).toFixed(2)},${getStockStatus(i)},${i.barcode}`
      ),
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
      <div className="p-6 text-center text-muted-foreground">
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
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={fetchInventory}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <BoxIcon className="w-5 h-5 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold">{totalProducts}</p>
              <p className="text-xs text-muted-foreground">Total Products</p>
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
              <p className="text-2xl font-bold">${(totalInventoryValue / 100).toLocaleString()}</p>
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
          <Card className="mb-6 border-yellow-200 bg-yellow-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-yellow-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Stock Alerts ({lowStockCount + outOfStockCount} items need attention)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {items
                  .filter((i) => getStockStatus(i) !== "in_stock")
                  .slice(0, 8)
                  .map((item) => (
                    <Badge
                      key={item.id}
                      variant={getStockStatus(item) === "out_of_stock" ? "destructive" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedItem(item);
                        setAdjustDialogOpen(true);
                      }}
                    >
                      {item.name}: {item.current_stock} left
                    </Badge>
                  ))}
                {lowStockCount + outOfStockCount > 8 && (
                  <Badge variant="secondary">
                    +{lowStockCount + outOfStockCount - 8} more
                  </Badge>
                )}
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
              <SelectItem value="all">All Products</SelectItem>
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
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock Value</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? "No products match your search" : "No products in inventory yet"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => {
                    const status = getStockStatus(item);
                    return (
                      <TableRow key={item.id} className={status === "out_of_stock" ? "bg-red-50/50" : status === "low_stock" ? "bg-yellow-50/50" : ""}>
                        <TableCell>
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
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
                            <p className="font-medium">{item.name}</p>
                            {item.barcode && (
                              <p className="text-xs text-muted-foreground font-mono">{item.barcode}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal">
                            {item.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {item.current_stock}
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
                          ${(item.unit_cost_cents / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${(item.price_cents / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          ${((item.current_stock * item.unit_cost_cents) / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setSelectedItem(item);
                                setAdjustmentType("add");
                                setAdjustDialogOpen(true);
                              }}
                              title="Adjust stock"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setSelectedItem(item);
                                setAdjustmentType("remove");
                                setAdjustDialogOpen(true);
                              }}
                              title="Remove stock"
                            >
                              <Minus className="w-4 h-4" />
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
          Showing {filteredItems.length} of {totalProducts} products
        </p>
      </div>

      {/* Stock Adjustment Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock — {selectedItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
              <div className="text-center">
                <p className="text-2xl font-bold">{selectedItem?.current_stock}</p>
                <p className="text-xs text-muted-foreground">Current Stock</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-mono">{selectedItem?.sku}</p>
                <p className="text-xs text-muted-foreground">SKU</p>
              </div>
              <div className="text-center">
                <p className="text-sm">{selectedItem?.reorder_point}</p>
                <p className="text-xs text-muted-foreground">Reorder Point</p>
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
                  New stock will be:{" "}
                  <strong>
                    {adjustmentType === "add"
                      ? selectedItem.current_stock + adjustmentQty
                      : adjustmentType === "remove"
                      ? Math.max(0, selectedItem.current_stock - adjustmentQty)
                      : adjustmentQty}
                  </strong>{" "}
                  units
                </p>
              )}
            </div>

            <div>
              <Label>Reason (optional)</Label>
              <Input
                placeholder="e.g., Weekly restock, damaged items, inventory count..."
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
              />
            </div>

            <Button
              onClick={handleAdjustStock}
              disabled={adjustmentQty <= 0}
              className="w-full"
            >
              {adjustmentType === "add" ? (
                <>
                  <Plus className="w-4 h-4 mr-2" /> Add {adjustmentQty} units
                </>
              ) : adjustmentType === "remove" ? (
                <>
                  <Minus className="w-4 h-4 mr-2" /> Remove {adjustmentQty} units
                </>
              ) : (
                <>Set stock to {adjustmentQty} units</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RetailInventoryDashboard;


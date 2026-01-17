import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, TrendingUp, TrendingDown, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantData } from "@/hooks/useRestaurantData";

const ProductMixDashboard = () => {
  const { restaurant } = useRestaurantData();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState("last7");
  const [productData, setProductData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (restaurant?.id) {
      fetchProductMixData();
    }
  }, [restaurant?.id, dateRange]);

  const fetchProductMixData = async () => {
    try {
      setLoading(true);
      const days = dateRange === "last7" ? 7 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Fetch order items with menu item details
      const { data: orderItems, error } = await supabase
        .from("order_items")
        .select(`
          id,
          menu_item_id,
          quantity,
          price_cents,
          menu_items!inner(name),
          orders!inner(created_at, restaurant_id, status)
        `)
        .eq("orders.restaurant_id", restaurant?.id)
        .eq("orders.status", "completed")
        .gte("orders.created_at", startDate.toISOString());

      if (error) throw error;

      // Aggregate by menu item
      const itemMap = new Map();
      orderItems?.forEach((item: any) => {
        const itemName = item.menu_items.name;
        if (!itemMap.has(itemName)) {
          itemMap.set(itemName, {
            name: itemName,
            totalSold: 0,
            grossSales: 0,
            netPrice: 0,
          });
        }
        const aggregated = itemMap.get(itemName);
        aggregated.totalSold += item.quantity;
        aggregated.grossSales += (item.price_cents / 100) * item.quantity;
        aggregated.netPrice = item.price_cents / 100;
      });

      const products = Array.from(itemMap.values()).map((item, index) => ({
        id: `item-${index}`,
        name: item.name,
        totalSold: item.totalSold,
        totalSoldChange: 0, // Would need previous period comparison
        grossSales: item.grossSales,
        grossSalesChange: 0,
        netPrice: item.netPrice,
        priceChanges: 0,
        customerDiscounts: 0,
      }));

      setProductData(products.sort((a, b) => b.totalSold - a.totalSold));
    } catch (error) {
      console.error("Error fetching product mix data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading product mix data...</div>;
  }

  const filteredData = productData.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last7">Last 7 days</SelectItem>
            <SelectItem value="last30">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search for an item"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Data Table */}
      {filteredData.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium text-sm">Items</th>
                    <th className="text-right p-4 font-medium text-sm">Total sold</th>
                    <th className="text-right p-4 font-medium text-sm">Change</th>
                    <th className="text-right p-4 font-medium text-sm">Gross sales</th>
                    <th className="text-right p-4 font-medium text-sm">Change</th>
                    <th className="text-right p-4 font-medium text-sm">Net price</th>
                    <th className="text-right p-4 font-medium text-sm">Price changes</th>
                    <th className="text-right p-4 font-medium text-sm">Customer discounts</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-muted/30">
                      <td className="p-4">{item.name}</td>
                      <td className="text-right p-4">{item.totalSold}</td>
                      <td className="text-right p-4">
                        <div className={`flex items-center justify-end gap-1 ${item.totalSoldChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.totalSoldChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          <span>{Math.abs(item.totalSoldChange)}%</span>
                        </div>
                      </td>
                      <td className="text-right p-4">${item.grossSales.toFixed(2)}</td>
                      <td className="text-right p-4">
                        <div className={`flex items-center justify-end gap-1 ${item.grossSalesChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.grossSalesChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          <span>{Math.abs(item.grossSalesChange)}%</span>
                        </div>
                      </td>
                      <td className="text-right p-4">${item.netPrice.toFixed(2)}</td>
                      <td className="text-right p-4">{item.priceChanges}</td>
                      <td className="text-right p-4">${item.customerDiscounts.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No results found</h3>
            <p className="text-sm text-muted-foreground">Try adjusting your search</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProductMixDashboard;

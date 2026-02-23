import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Search,
  Eye,
  Printer,
  Settings,
  Plus,
  Copy,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import MenuItemEditorDialog from "./MenuItemEditorDialog";
import AvailabilityDropdown from "./AvailabilityDropdown";

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price_cents: number;
  category?: string;
  category_id?: string;
  is_available: boolean;
  image_url?: string;
  tax_rate?: number;
}

interface MenuCategory {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
}

interface MenuManagerDashboardProps {
  restaurantId: string;
}

const MenuManagerDashboard = ({ restaurantId }: MenuManagerDashboardProps) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!restaurantId) {
      console.warn("MenuManagerDashboard: No restaurantId provided");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log("MenuManagerDashboard: Fetching menu data for restaurant:", restaurantId);
      
      const [itemsResponse, categoriesResponse] = await Promise.all([
        supabase
          .from("menu_items")
          .select(`
            *,
            menu_categories!left (
              name
            )
          `)
          .eq("restaurant_id", restaurantId)
          .order("created_at", { ascending: false }),
        supabase
          .from("menu_categories")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
      ]);

      if (itemsResponse.error) {
        console.error("MenuManagerDashboard: Error fetching menu items:", itemsResponse.error);
        throw itemsResponse.error;
      }
      if (categoriesResponse.error) {
        console.error("MenuManagerDashboard: Error fetching categories:", categoriesResponse.error);
        throw categoriesResponse.error;
      }

      console.log("MenuManagerDashboard: Fetched items:", itemsResponse.data?.length || 0);
      console.log("MenuManagerDashboard: Raw items response:", itemsResponse.data);
      console.log("MenuManagerDashboard: Fetched categories:", categoriesResponse.data?.length || 0);

      const formattedItems = itemsResponse.data?.map((item) => {
        // Handle category - it could be an object (from join) or array
        let categoryName = "Uncategorized";
        if (item.menu_categories) {
          if (Array.isArray(item.menu_categories)) {
            categoryName = item.menu_categories[0]?.name || "Uncategorized";
          } else {
            categoryName = item.menu_categories.name || "Uncategorized";
          }
        }
        
        return {
          id: item.id,
          name: item.name,
          description: item.description,
          price_cents: item.price_cents,
          category: categoryName,
          category_id: item.category_id,
          is_available: item.is_available,
          image_url: item.image_url,
        };
      }) || [];

      console.log("MenuManagerDashboard: Formatted items:", formattedItems);
      setMenuItems(formattedItems);
      setCategories(categoriesResponse.data || []);
      
      if (formattedItems.length === 0) {
        console.warn("MenuManagerDashboard: No menu items found for restaurant:", restaurantId);
        console.warn("MenuManagerDashboard: Check if items exist in database for this restaurant_id");
      } else {
        console.log("MenuManagerDashboard: Successfully loaded", formattedItems.length, "menu items");
      }
    } catch (error) {
      console.error("MenuManagerDashboard: Error fetching data:", error);
      toast.error("Failed to load menu data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) {
      fetchData();
    }
  }, [restaurantId, fetchData]);

  const handleCopyItem = async (item: MenuItem) => {
    const copiedItem = {
      ...item,
      id: undefined,
      name: `${item.name} (Copy)`,
    };
    setSelectedItem(copiedItem as MenuItem);
    setIsEditorOpen(true);
  };

  const handleEditItem = (item: MenuItem) => {
    setSelectedItem(item);
    setIsEditorOpen(true);
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;

    try {
      const { error } = await supabase
        .from("menu_items")
        .delete()
        .eq("id", itemToDelete);

      if (error) throw error;

      toast.success("Item deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Failed to delete item");
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const toggleCategory = (categoryName: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  };

  const filteredItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const itemsByCategory = filteredItems.reduce((acc, item) => {
    const category = item.category || "Uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const categoryList = Object.keys(itemsByCategory);

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="relative flex-1 min-w-0 max-w-[400px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for an item"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Eye className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Printer className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-[#DC2626] hover:bg-[#B91C1C] text-white ml-2">
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background">
                <DropdownMenuItem onClick={() => {
                  setSelectedItem(null);
                  setIsEditorOpen(true);
                }}>
                  Add Item
                </DropdownMenuItem>
                <DropdownMenuItem>Add Category</DropdownMenuItem>
                <DropdownMenuItem>Import Menu</DropdownMenuItem>
                <DropdownMenuItem>Bulk Upload</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-x-auto">
          <Table className="w-full min-w-[640px]">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[40%]">Item</TableHead>
                <TableHead className="w-[20%] text-right">Price</TableHead>
                <TableHead className="w-[25%] text-center">Item Availability</TableHead>
                <TableHead className="w-[15%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoryList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                    No menu items found. Click "Add" to create your first item.
                  </TableCell>
                </TableRow>
              ) : (
                categoryList.map((categoryName) => {
                  const items = itemsByCategory[categoryName];
                  const isCollapsed = collapsedCategories.has(categoryName);

                  return (
                    <React.Fragment key={categoryName}>
                      {/* Category Header */}
                      <TableRow
                        className="bg-muted/30 hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleCategory(categoryName)}
                      >
                        <TableCell colSpan={4} className="font-semibold">
                          <div className="flex items-center justify-between">
                            <span>
                              {categoryName} - Available Category - {items.length} items
                            </span>
                            {isCollapsed ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronUp className="h-4 w-4" />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Category Items */}
                      {!isCollapsed &&
                        items.map((item) => (
                          <TableRow
                            key={item.id}
                            className="hover:bg-muted/50 cursor-pointer"
                            onClick={() => handleEditItem(item)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {item.image_url ? (
                                  <img
                                    src={item.image_url}
                                    alt={item.name}
                                    className="w-10 h-10 object-cover rounded"
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                                    <span className="text-xs text-muted-foreground">No img</span>
                                  </div>
                                )}
                                <span className="font-medium">{item.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              ${(item.price_cents / 100).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-center">
                                <AvailabilityDropdown
                                  itemId={item.id}
                                  currentStatus={item.is_available}
                                  onUpdate={fetchData}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyItem(item);
                                  }}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditItem(item);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setItemToDelete(item.id);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Editor Dialog */}
      <MenuItemEditorDialog
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        restaurantId={restaurantId}
        onSave={fetchData}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Menu Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MenuManagerDashboard;

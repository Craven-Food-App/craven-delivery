import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, ChevronDown, ChevronUp, Settings } from "lucide-react";
import { toast } from "sonner";

interface ModifierGroup {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string;
  is_required: boolean;
  min_selections: number;
  max_selections?: number;
  display_order: number;
  is_active: boolean;
  items?: ModifierGroupItem[];
}

interface ModifierGroupItem {
  id: string;
  modifier_group_id: string;
  name: string;
  description?: string;
  price_cents: number;
  is_available: boolean;
  display_order: number;
}

interface ModifierGroupsManagerProps {
  restaurantId: string;
}

const ModifierGroupsManager = ({ restaurantId }: ModifierGroupsManagerProps) => {
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ModifierGroup | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);

  // Form state for modifier group
  const [groupForm, setGroupForm] = useState({
    name: "",
    description: "",
    is_required: false,
    min_selections: 0,
    max_selections: undefined as number | undefined,
    display_order: 0,
    is_active: true,
  });

  // Form state for modifier group item
  const [itemForm, setItemForm] = useState({
    name: "",
    description: "",
    price_cents: 0,
    is_available: true,
    display_order: 0,
  });

  useEffect(() => {
    fetchModifierGroups();
  }, [restaurantId]);

  const fetchModifierGroups = async () => {
    try {
      setLoading(true);
      const { data: groupsData, error: groupsError } = await supabase
        .from("modifier_groups")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("display_order", { ascending: true });

      if (groupsError) throw groupsError;

      // Fetch items for each group
      const groupsWithItems = await Promise.all(
        (groupsData || []).map(async (group) => {
          const { data: itemsData, error: itemsError } = await supabase
            .from("modifier_group_items")
            .select("*")
            .eq("modifier_group_id", group.id)
            .order("display_order", { ascending: true });

          if (itemsError) throw itemsError;

          return {
            ...group,
            items: itemsData || [],
          };
        })
      );

      setGroups(groupsWithItems);
    } catch (error: any) {
      console.error("Error fetching modifier groups:", error);
      toast.error("Failed to load modifier groups");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = () => {
    setSelectedGroup(null);
    setGroupForm({
      name: "",
      description: "",
      is_required: false,
      min_selections: 0,
      max_selections: undefined,
      display_order: groups.length,
      is_active: true,
    });
    setIsGroupDialogOpen(true);
  };

  const handleEditGroup = (group: ModifierGroup) => {
    setSelectedGroup(group);
    setGroupForm({
      name: group.name,
      description: group.description || "",
      is_required: group.is_required,
      min_selections: group.min_selections,
      max_selections: group.max_selections,
      display_order: group.display_order,
      is_active: group.is_active,
    });
    setIsGroupDialogOpen(true);
  };

  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) {
      toast.error("Group name is required");
      return;
    }

    try {
      const groupData = {
        restaurant_id: restaurantId,
        name: groupForm.name.trim(),
        description: groupForm.description.trim() || null,
        is_required: groupForm.is_required,
        min_selections: groupForm.is_required ? Math.max(1, groupForm.min_selections) : groupForm.min_selections,
        max_selections: groupForm.max_selections || null,
        display_order: groupForm.display_order,
        is_active: groupForm.is_active,
      };

      if (selectedGroup) {
        // Update existing group
        const { error } = await supabase
          .from("modifier_groups")
          .update(groupData)
          .eq("id", selectedGroup.id);

        if (error) throw error;
        toast.success("Modifier group updated successfully");
      } else {
        // Create new group
        const { error } = await supabase
          .from("modifier_groups")
          .insert([groupData]);

        if (error) throw error;
        toast.success("Modifier group created successfully");
      }

      setIsGroupDialogOpen(false);
      fetchModifierGroups();
    } catch (error: any) {
      console.error("Error saving modifier group:", error);
      toast.error("Failed to save modifier group");
    }
  };

  const handleAddItem = (group: ModifierGroup) => {
    setSelectedGroup(group);
    setItemForm({
      name: "",
      description: "",
      price_cents: 0,
      is_available: true,
      display_order: (group.items?.length || 0),
    });
    setIsItemDialogOpen(true);
  };

  const handleEditItem = (group: ModifierGroup, item: ModifierGroupItem) => {
    setSelectedGroup(group);
    setItemForm({
      name: item.name,
      description: item.description || "",
      price_cents: item.price_cents,
      is_available: item.is_available,
      display_order: item.display_order,
    });
    setItemToDelete(item.id);
    setIsItemDialogOpen(true);
  };

  const handleSaveItem = async () => {
    if (!selectedGroup || !itemForm.name.trim()) {
      toast.error("Item name is required");
      return;
    }

    try {
      const itemData = {
        modifier_group_id: selectedGroup.id,
        name: itemForm.name.trim(),
        description: itemForm.description.trim() || null,
        price_cents: Math.round(itemForm.price_cents), // Already in cents
        is_available: itemForm.is_available,
        display_order: itemForm.display_order,
      };

      if (itemToDelete) {
        // Update existing item
        const { error } = await supabase
          .from("modifier_group_items")
          .update(itemData)
          .eq("id", itemToDelete);

        if (error) throw error;
        toast.success("Modifier item updated successfully");
      } else {
        // Create new item
        const { error } = await supabase
          .from("modifier_group_items")
          .insert([itemData]);

        if (error) throw error;
        toast.success("Modifier item added successfully");
      }

      setIsItemDialogOpen(false);
      setItemToDelete(null);
      fetchModifierGroups();
    } catch (error: any) {
      console.error("Error saving modifier item:", error);
      toast.error("Failed to save modifier item");
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;

    try {
      const { error } = await supabase
        .from("modifier_groups")
        .delete()
        .eq("id", groupToDelete);

      if (error) throw error;

      toast.success("Modifier group deleted successfully");
      setGroupToDelete(null);
      setDeleteDialogOpen(false);
      fetchModifierGroups();
    } catch (error: any) {
      console.error("Error deleting modifier group:", error);
      toast.error("Failed to delete modifier group");
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;

    try {
      const { error } = await supabase
        .from("modifier_group_items")
        .delete()
        .eq("id", itemToDelete);

      if (error) throw error;

      toast.success("Modifier item deleted successfully");
      setItemToDelete(null);
      setDeleteDialogOpen(false);
      fetchModifierGroups();
    } catch (error: any) {
      console.error("Error deleting modifier item:", error);
      toast.error("Failed to delete modifier item");
    }
  };

  const toggleGroupExpansion = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading modifier groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Modifier Groups</h2>
          <p className="text-muted-foreground">
            Create groups of modifiers that customers can select when ordering (e.g., Size, Toppings, Extras)
          </p>
        </div>
        <Button onClick={handleCreateGroup}>
          <Plus className="h-4 w-4 mr-2" />
          Create Modifier Group
        </Button>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No modifier groups yet</p>
            <Button onClick={handleCreateGroup}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Modifier Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleGroupExpansion(group.id)}
                    >
                      {expandedGroups.has(group.id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    <div>
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      {group.description && (
                        <CardDescription>{group.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {group.is_required && (
                        <Badge variant="destructive">Required</Badge>
                      )}
                      {!group.is_required && (
                        <Badge variant="secondary">Optional</Badge>
                      )}
                      {!group.is_active && (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditGroup(group)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setGroupToDelete(group.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-4 text-sm text-muted-foreground mt-2">
                  <span>
                    Min: {group.min_selections} | Max: {group.max_selections || "∞"}
                  </span>
                  <span>Items: {group.items?.length || 0}</span>
                </div>
              </CardHeader>
              {expandedGroups.has(group.id) && (
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Modifier Items</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddItem(group)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                  {group.items && group.items.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Order</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {item.description || "-"}
                            </TableCell>
                            <TableCell>{formatPrice(item.price_cents)}</TableCell>
                            <TableCell>
                              {item.is_available ? (
                                <Badge variant="default">Available</Badge>
                              ) : (
                                <Badge variant="secondary">Unavailable</Badge>
                              )}
                            </TableCell>
                            <TableCell>{item.display_order}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditItem(group, item)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setItemToDelete(item.id);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No items in this group yet. Add items to allow customers to make selections.
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Modifier Group Dialog */}
      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedGroup ? "Edit Modifier Group" : "Create Modifier Group"}
            </DialogTitle>
            <DialogDescription>
              Create a group of modifiers that customers can select (e.g., "Size", "Toppings", "Extras")
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name *</Label>
              <Input
                id="group-name"
                value={groupForm.name}
                onChange={(e) =>
                  setGroupForm({ ...groupForm, name: e.target.value })
                }
                placeholder="e.g., Size, Toppings, Extras"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-description">Description</Label>
              <Textarea
                id="group-description"
                value={groupForm.description}
                onChange={(e) =>
                  setGroupForm({ ...groupForm, description: e.target.value })
                }
                placeholder="Optional description for this modifier group"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is-required"
                checked={groupForm.is_required}
                onCheckedChange={(checked) =>
                  setGroupForm({
                    ...groupForm,
                    is_required: checked,
                    min_selections: checked ? 1 : 0,
                  })
                }
              />
              <Label htmlFor="is-required">Required (customer must select at least one)</Label>
            </div>
            {groupForm.is_required && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min-selections">Minimum Selections</Label>
                  <Input
                    id="min-selections"
                    type="number"
                    min="0"
                    value={groupForm.min_selections}
                    onChange={(e) =>
                      setGroupForm({
                        ...groupForm,
                        min_selections: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-selections">Maximum Selections (leave empty for unlimited)</Label>
                  <Input
                    id="max-selections"
                    type="number"
                    min="1"
                    value={groupForm.max_selections || ""}
                    onChange={(e) =>
                      setGroupForm({
                        ...groupForm,
                        max_selections: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    placeholder="Unlimited"
                  />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="display-order">Display Order</Label>
                <Input
                  id="display-order"
                  type="number"
                  value={groupForm.display_order}
                  onChange={(e) =>
                    setGroupForm({
                      ...groupForm,
                      display_order: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  id="is-active"
                  checked={groupForm.is_active}
                  onCheckedChange={(checked) =>
                    setGroupForm({ ...groupForm, is_active: checked })
                  }
                />
                <Label htmlFor="is-active">Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGroupDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveGroup}>Save Group</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modifier Item Dialog */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {itemToDelete ? "Edit Modifier Item" : "Add Modifier Item"}
            </DialogTitle>
            <DialogDescription>
              Add an option to the "{selectedGroup?.name}" group
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="item-name">Item Name *</Label>
              <Input
                id="item-name"
                value={itemForm.name}
                onChange={(e) =>
                  setItemForm({ ...itemForm, name: e.target.value })
                }
                placeholder="e.g., Small, Extra Cheese, No Onions"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-description">Description</Label>
              <Textarea
                id="item-description"
                value={itemForm.description}
                onChange={(e) =>
                  setItemForm({ ...itemForm, description: e.target.value })
                }
                placeholder="Optional description"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item-price">Additional Price ($)</Label>
                <Input
                  id="item-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemForm.price_cents / 100}
                  onChange={(e) =>
                    setItemForm({
                      ...itemForm,
                      price_cents: parseFloat(e.target.value) * 100 || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-order">Display Order</Label>
                <Input
                  id="item-order"
                  type="number"
                  value={itemForm.display_order}
                  onChange={(e) =>
                    setItemForm({
                      ...itemForm,
                      display_order: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="item-available"
                checked={itemForm.is_available}
                onCheckedChange={(checked) =>
                  setItemForm({ ...itemForm, is_available: checked })
                }
              />
              <Label htmlFor="item-available">Available</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveItem}>
              {itemToDelete ? "Update" : "Add"} Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {groupToDelete
                ? "This will permanently delete the modifier group and all its items. This action cannot be undone."
                : "This will permanently delete the modifier item. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (groupToDelete) {
                  handleDeleteGroup();
                } else if (itemToDelete) {
                  handleDeleteItem();
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ModifierGroupsManager;


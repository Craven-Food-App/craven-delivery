import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Check, MoreVertical, X, Upload } from "lucide-react";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";

interface MenuItem {
  id?: string;
  name: string;
  description?: string;
  price_cents: number;
  image_url?: string;
  is_available: boolean;
  category_id?: string;
}

interface MenuItemEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item?: MenuItem | null;
  restaurantId: string;
  onSave: () => void;
}

export default function MenuItemEditorDialog({
  isOpen,
  onClose,
  item,
  restaurantId,
  onSave,
}: MenuItemEditorDialogProps) {
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(item?.image_url || null);
  const [isUploading, setIsUploading] = useState(false);
  const [availability, setAvailability] = useState(item?.is_available ?? true);
  const [modifierGroups, setModifierGroups] = useState<any[]>([]);
  const [selectedModifierGroups, setSelectedModifierGroups] = useState<string[]>([]);

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<MenuItem>({
    defaultValues: item || {
      name: "",
      description: "",
      price_cents: 0,
      is_available: true,
    },
  });

  useEffect(() => {
    fetchAllModifierGroups();
    if (item) {
      reset(item);
      setImagePreview(item.image_url || null);
      setAvailability(item.is_available);
      fetchModifierGroupsForItem();
    } else {
      setSelectedModifierGroups([]);
    }
  }, [item, reset, restaurantId]);

  const fetchAllModifierGroups = async () => {
    try {
      const { data, error } = await supabase
        .from("modifier_groups")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setModifierGroups(data || []);
    } catch (error) {
      console.error("Error fetching modifier groups:", error);
    }
  };

  const fetchModifierGroupsForItem = async () => {
    if (!item?.id) return;

    try {
      // Fetch all available modifier groups
      const { data: allGroups, error: groupsError } = await supabase
        .from("modifier_groups")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (groupsError) throw groupsError;

      // Fetch modifier groups associated with this menu item
      const { data: associatedGroups, error: associatedError } = await supabase
        .from("menu_item_modifier_groups")
        .select("modifier_group_id")
        .eq("menu_item_id", item.id);

      if (associatedError) throw associatedError;

      setModifierGroups(allGroups || []);
      setSelectedModifierGroups(
        associatedGroups?.map((g) => g.modifier_group_id) || []
      );
    } catch (error) {
      console.error("Error fetching modifier groups for item:", error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return imagePreview;

    const fileExt = imageFile.name.split(".").pop();
    const fileName = `${restaurantId}/${Date.now()}.${fileExt}`;

    const { error: uploadError, data } = await supabase.storage
      .from("menu-images")
      .upload(fileName, imageFile);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("menu-images")
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const onSubmit = async (data: MenuItem) => {
    setIsUploading(true);

    try {
      const imageUrl = await uploadImage();

      const itemData = {
        restaurant_id: restaurantId,
        name: data.name,
        description: data.description || null,
        price_cents: Math.round(parseFloat(data.price_cents.toString()) * 100),
        image_url: imageUrl,
        is_available: availability,
      };

      let menuItemId: string;

      if (item?.id) {
        const { error } = await supabase
          .from("menu_items")
          .update(itemData)
          .eq("id", item.id);

        if (error) throw error;
        menuItemId = item.id;

        toast({
          title: "Item updated",
          description: "Menu item has been updated successfully.",
        });
      } else {
        const { data: insertedData, error } = await supabase
          .from("menu_items")
          .insert([itemData])
          .select()
          .single();

        if (error) throw error;
        menuItemId = insertedData.id;

        toast({
          title: "Item created",
          description: "New menu item has been added.",
        });
      }

      // Update modifier group associations
      if (menuItemId) {
        // Delete existing associations
        await supabase
          .from("menu_item_modifier_groups")
          .delete()
          .eq("menu_item_id", menuItemId);

        // Insert new associations
        if (selectedModifierGroups.length > 0) {
          const associations = selectedModifierGroups.map((groupId, index) => ({
            menu_item_id: menuItemId,
            modifier_group_id: groupId,
            display_order: index,
          }));

          const { error: assocError } = await supabase
            .from("menu_item_modifier_groups")
            .insert(associations);

          if (assocError) {
            console.error("Error saving modifier group associations:", assocError);
            // Don't fail the whole operation, just log the error
          }
        }
      }

      onSave();
      onClose();
      reset();
      setImageFile(null);
      setImagePreview(null);
    } catch (error) {
      console.error("Error saving item:", error);
      toast({
        title: "Error",
        description: "Failed to save menu item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleMarkUnavailable = async () => {
    setAvailability(false);
    if (item?.id) {
      await supabase
        .from("menu_items")
        .update({ is_available: false })
        .eq("id", item.id);
      toast({
        title: "Item marked unavailable",
        description: "This item is now unavailable for today.",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Item</span>
              <DialogTitle className="text-xl font-bold mt-1">
                {item?.name || "New Menu Item"}
              </DialogTitle>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="border-b pb-4">
          <div className="flex items-start gap-3 mb-3">
            {availability ? (
              <Check className="h-5 w-5 text-green-600 mt-0.5" />
            ) : (
              <X className="h-5 w-5 text-destructive mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-semibold">
                {availability ? "Available" : "Unavailable"}
              </div>
              <div className="text-sm text-muted-foreground">
                {availability
                  ? "Customers can view and order this item during store hours"
                  : "This item is currently unavailable"}
              </div>
            </div>
            {availability && (
              <Button
                variant="outline"
                onClick={handleMarkUnavailable}
                className="ml-auto"
              >
                Mark as Unavailable for Today
              </Button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="name">Name</Label>
                  <span className="text-xs text-muted-foreground">Required</span>
                </div>
                <Input
                  id="name"
                  {...register("name", { required: "Name is required" })}
                  placeholder="Item name"
                />
                {errors.name && (
                  <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  {...register("price_cents", { required: "Price is required" })}
                  placeholder="0.00"
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    setValue("price_cents", value);
                  }}
                  defaultValue={item ? (item.price_cents / 100).toFixed(2) : ""}
                />
                {errors.price_cents && (
                  <p className="text-xs text-destructive mt-1">{errors.price_cents.message}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="description">Description</Label>
                  <span className="text-xs text-muted-foreground">Optional</span>
                </div>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Add a description..."
                  rows={4}
                />
              </div>
            </div>

            <div>
              <Label>Product Image</Label>
              <div className="relative mt-2 aspect-square bg-muted rounded-lg overflow-hidden border-2 border-dashed border-border hover:border-primary transition-colors">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Upload className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {imagePreview && (
                  <div className="absolute top-2 right-2 bg-background rounded-full p-1.5 shadow-md">
                    <Upload className="h-4 w-4" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modifier Groups Section */}
          {modifierGroups.length > 0 && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <Label className="text-base font-semibold">Modifier Groups</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Select which modifier groups customers can choose from when ordering this item
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto p-4 border rounded-lg bg-muted/50">
                {modifierGroups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-start space-x-3 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={`modifier-${group.id}`}
                      checked={selectedModifierGroups.includes(group.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedModifierGroups([...selectedModifierGroups, group.id]);
                        } else {
                          setSelectedModifierGroups(
                            selectedModifierGroups.filter((id) => id !== group.id)
                          );
                        }
                      }}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={`modifier-${group.id}`}
                          className="font-medium cursor-pointer"
                        >
                          {group.name}
                        </Label>
                        {group.is_required && (
                          <Badge variant="destructive" className="text-xs">
                            Required
                          </Badge>
                        )}
                        {!group.is_required && (
                          <Badge variant="secondary" className="text-xs">
                            Optional
                          </Badge>
                        )}
                      </div>
                      {group.description && (
                        <p className="text-sm text-muted-foreground">
                          {group.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Min: {group.min_selections} | Max: {group.max_selections || "∞"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {modifierGroups.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No modifier groups available. Create modifier groups in the "Modifier Groups" tab.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUploading}
              className="bg-[#DC2626] hover:bg-[#B91C1C] text-white"
            >
              {isUploading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

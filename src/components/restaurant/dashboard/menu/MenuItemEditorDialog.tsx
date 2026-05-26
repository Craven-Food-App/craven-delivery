import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Check, MoreVertical, X, Upload } from "lucide-react";
import { useForm } from "react-hook-form";
import InlineModifierBuilder, {
  DraftModifierGroup,
} from "./InlineModifierBuilder";

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
  const [library, setLibrary] = useState<DraftModifierGroup[]>([]);
  const [draftGroups, setDraftGroups] = useState<DraftModifierGroup[]>([]);

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<MenuItem>({
    defaultValues: item || {
      name: "",
      description: "",
      price_cents: 0,
      is_available: true,
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    loadModifiers();
    if (item) {
      reset(item);
      setImagePreview(item.image_url || null);
      setAvailability(item.is_available);
    } else {
      setDraftGroups([]);
      setImagePreview(null);
      setImageFile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, isOpen, restaurantId]);

  const loadModifiers = async () => {
    try {
      const { data: groupsData, error: gErr } = await supabase
        .from("modifier_groups")
        .select("*, modifier_group_items(*)")
        .eq("restaurant_id", restaurantId)
        .order("display_order", { ascending: true });
      if (gErr) throw gErr;

      const lib: DraftModifierGroup[] = (groupsData || []).map((g: any) => ({
        id: g.id,
        tempId: g.id,
        name: g.name,
        description: g.description || "",
        is_required: g.is_required,
        min_selections: g.min_selections ?? 0,
        max_selections: g.max_selections ?? null,
        display_order: g.display_order ?? 0,
        is_active: g.is_active,
        items: (g.modifier_group_items || [])
          .sort((a: any, b: any) => a.display_order - b.display_order)
          .map((it: any) => ({
            id: it.id,
            tempId: it.id,
            name: it.name,
            description: it.description || "",
            price_cents: it.price_cents,
            is_available: it.is_available,
            display_order: it.display_order,
          })),
      }));
      setLibrary(lib);

      if (item?.id) {
        const { data: assoc, error: aErr } = await supabase
          .from("menu_item_modifier_groups")
          .select("modifier_group_id, display_order")
          .eq("menu_item_id", item.id)
          .order("display_order", { ascending: true });
        if (aErr) throw aErr;
        const ids = (assoc || []).map((a: any) => a.modifier_group_id);
        const attached = ids
          .map((id, idx) => {
            const g = lib.find((l) => l.id === id);
            return g ? { ...g, display_order: idx } : null;
          })
          .filter(Boolean) as DraftModifierGroup[];
        setDraftGroups(attached);
      } else {
        setDraftGroups([]);
      }
    } catch (e) {
      console.error("Error loading modifiers:", e);
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

      // Persist modifier groups + items
      if (menuItemId) {
        await persistModifierGroups(menuItemId);
      }

      onSave();
      onClose();
      reset();
      setImageFile(null);
      setImagePreview(null);
      setDraftGroups([]);
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

  const persistModifierGroups = async (menuItemId: string) => {
    // Validate
    for (const g of draftGroups) {
      if (!g.name.trim()) {
        throw new Error("All modifier groups need a name");
      }
      const visible = g.items.filter((i) => !i._deleted);
      if (visible.length === 0) {
        throw new Error(`Group "${g.name}" needs at least one option`);
      }
      if (visible.some((i) => !i.name.trim())) {
        throw new Error(`Group "${g.name}" has an option missing a name`);
      }
      if (
        g.max_selections != null &&
        g.max_selections < (g.min_selections || 0)
      ) {
        throw new Error(`Group "${g.name}" max must be ≥ min`);
      }
    }

    const associationRows: { menu_item_id: string; modifier_group_id: string; display_order: number }[] = [];

    for (let gi = 0; gi < draftGroups.length; gi++) {
      const g = draftGroups[gi];
      let groupId = g.id;

      const groupPayload = {
        restaurant_id: restaurantId,
        name: g.name.trim(),
        description: g.description?.trim() || null,
        is_required: g.is_required,
        min_selections: g.is_required
          ? Math.max(1, g.min_selections || 1)
          : g.min_selections || 0,
        max_selections: g.max_selections ?? null,
        display_order: gi,
        is_active: g.is_active,
      };

      if (!groupId) {
        const { data: ins, error } = await supabase
          .from("modifier_groups")
          .insert(groupPayload)
          .select("id")
          .single();
        if (error) throw error;
        groupId = ins.id;
      } else {
        const { error } = await supabase
          .from("modifier_groups")
          .update(groupPayload)
          .eq("id", groupId);
        if (error) throw error;
      }

      // Items: delete flagged, upsert rest
      const toDelete = g.items.filter((i) => i._deleted && i.id).map((i) => i.id!);
      if (toDelete.length > 0) {
        await supabase
          .from("modifier_group_items")
          .delete()
          .in("id", toDelete);
      }

      const visible = g.items.filter((i) => !i._deleted);
      const inserts: any[] = [];
      for (let ii = 0; ii < visible.length; ii++) {
        const it = visible[ii];
        const payload = {
          modifier_group_id: groupId,
          name: it.name.trim(),
          description: it.description?.trim() || null,
          price_cents: Math.round(it.price_cents),
          is_available: it.is_available,
          display_order: ii,
        };
        if (it.id) {
          const { error } = await supabase
            .from("modifier_group_items")
            .update(payload)
            .eq("id", it.id);
          if (error) throw error;
        } else {
          inserts.push(payload);
        }
      }
      if (inserts.length > 0) {
        const { error } = await supabase
          .from("modifier_group_items")
          .insert(inserts);
        if (error) throw error;
      }

      associationRows.push({
        menu_item_id: menuItemId,
        modifier_group_id: groupId!,
        display_order: gi,
      });
    }

    // Replace associations
    await supabase
      .from("menu_item_modifier_groups")
      .delete()
      .eq("menu_item_id", menuItemId);
    if (associationRows.length > 0) {
      const { error } = await supabase
        .from("menu_item_modifier_groups")
        .insert(associationRows);
      if (error) throw error;
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

          {/* Inline Modifier Builder */}
          <div className="pt-4 border-t">
            <InlineModifierBuilder
              groups={draftGroups}
              onChange={setDraftGroups}
              existingLibrary={library}
            />
          </div>

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

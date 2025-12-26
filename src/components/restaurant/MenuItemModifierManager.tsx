import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Settings, DollarSign } from "lucide-react";

interface Modifier {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  modifier_type: string;
  is_required: boolean;
  is_available: boolean;
  display_order: number;
  max_selections: number | null;
  is_recommended: boolean;
}

interface MenuItemModifierManagerProps {
  menuItemId: string;
  menuItemName: string;
  isOpen: boolean;
  onClose: () => void;
}

const MODIFIER_TYPES = [
  { value: 'addon', label: 'Add-on', description: 'Extra items that can be added' },
  { value: 'removal', label: 'Removal', description: 'Items that can be removed' },
  { value: 'substitution', label: 'Substitution', description: 'Items that can be substituted' },
  { value: 'size', label: 'Size', description: 'Different size options' },
  { value: 'preparation', label: 'Preparation', description: 'Cooking preferences' }
];

export const MenuItemModifierManager = ({ 
  menuItemId, 
  menuItemName, 
  isOpen, 
  onClose 
}: MenuItemModifierManagerProps) => {
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingModifier, setIsAddingModifier] = useState(false);
  const [editingModifier, setEditingModifier] = useState<Modifier | null>(null);
  const { toast } = useToast();

  const [newModifier, setNewModifier] = useState({
    name: "",
    description: "",
    price_cents: 0,
    modifier_type: "addon" as const,
    is_required: false,
    is_available: true,
    max_selections: 1,
    is_recommended: false,
  });

  useEffect(() => {
    if (isOpen && menuItemId) {
      fetchModifiers();
    }
  }, [isOpen, menuItemId]);

  const fetchModifiers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("menu_item_modifiers")
        .select("*")
        .eq("menu_item_id", menuItemId)
        .order("display_order");

      if (error) throw error;
      setModifiers(data || []);
    } catch (error) {
      console.error("Error fetching modifiers:", error);
      toast({
        title: "Error",
        description: "Failed to load modifiers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addModifier = async () => {
    try {
      const { error } = await supabase
        .from("menu_item_modifiers")
        .insert({
          ...newModifier,
          menu_item_id: menuItemId,
          display_order: modifiers.length,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Modifier added successfully",
      });

      setNewModifier({
        name: "",
        description: "",
        price_cents: 0,
        modifier_type: "addon",
        is_required: false,
        is_available: true,
        max_selections: 1,
        is_recommended: false,
      });
      setIsAddingModifier(false);
      fetchModifiers();
    } catch (error) {
      console.error("Error adding modifier:", error);
      toast({
        title: "Error",
        description: "Failed to add modifier",
        variant: "destructive",
      });
    }
  };

  const updateModifier = async (modifier: Modifier) => {
    try {
      const { error } = await supabase
        .from("menu_item_modifiers")
        .update(modifier)
        .eq("id", modifier.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Modifier updated successfully",
      });

      setEditingModifier(null);
      fetchModifiers();
    } catch (error) {
      console.error("Error updating modifier:", error);
      toast({
        title: "Error",
        description: "Failed to update modifier",
        variant: "destructive",
      });
    }
  };

  const deleteModifier = async (modifierId: string) => {
    try {
      const { error } = await supabase
        .from("menu_item_modifiers")
        .delete()
        .eq("id", modifierId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Modifier deleted successfully",
      });

      fetchModifiers();
    } catch (error) {
      console.error("Error deleting modifier:", error);
      toast({
        title: "Error",
        description: "Failed to delete modifier",
        variant: "destructive",
      });
    }
  };

  const toggleModifierAvailability = async (modifierId: string, isAvailable: boolean) => {
    try {
      const { error } = await supabase
        .from("menu_item_modifiers")
        .update({ is_available: isAvailable })
        .eq("id", modifierId);

      if (error) throw error;
      fetchModifiers();
    } catch (error) {
      console.error("Error updating availability:", error);
      toast({
        title: "Error",
        description: "Failed to update availability",
        variant: "destructive",
      });
    }
  };

  const getModifierTypeColor = (type: string) => {
    switch (type) {
      case 'addon': return 'bg-green-100 text-green-800';
      case 'removal': return 'bg-red-100 text-red-800';
      case 'substitution': return 'bg-blue-100 text-blue-800';
      case 'size': return 'bg-purple-100 text-purple-800';
      case 'preparation': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPrice = (cents: number) => {
    const dollars = cents / 100;
    return dollars >= 0 ? `+$${dollars.toFixed(2)}` : `-$${Math.abs(dollars).toFixed(2)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Manage Options for "{menuItemName}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add New Modifier Button */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Configure customization options that customers can select for this menu item.
            </p>
            <Dialog open={isAddingModifier} onOpenChange={setIsAddingModifier}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Option</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="modifier-name">Option Name</Label>
                    <Input
                      id="modifier-name"
                      value={newModifier.name}
                      onChange={(e) => setNewModifier({ ...newModifier, name: e.target.value })}
                      placeholder="e.g., Extra Cheese, Large Size, No Onions"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="modifier-description">Description (Optional)</Label>
                    <Textarea
                      id="modifier-description"
                      value={newModifier.description}
                      onChange={(e) => setNewModifier({ ...newModifier, description: e.target.value })}
                      placeholder="Additional details about this option"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="modifier-type">Option Type</Label>
                    <Select 
                      value={newModifier.modifier_type} 
                      onValueChange={(value: any) => setNewModifier({ ...newModifier, modifier_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MODIFIER_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div>
                              <div className="font-medium">{type.label}</div>
                              <div className="text-xs text-muted-foreground">{type.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="modifier-price">Price Adjustment ($)</Label>
                    <Input
                      id="modifier-price"
                      type="number"
                      step="0.01"
                      value={newModifier.price_cents / 100}
                      onChange={(e) => setNewModifier({ 
                        ...newModifier, 
                        price_cents: Math.round(parseFloat(e.target.value || '0') * 100) 
                      })}
                      placeholder="Enter positive for extra cost, negative for discount"
                    />
                  </div>
                  <div className="flex gap-4 flex-wrap">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="required"
                        checked={newModifier.is_required}
                        onCheckedChange={(checked) => setNewModifier({ ...newModifier, is_required: checked })}
                      />
                      <Label htmlFor="required">Required Selection</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="recommended"
                        checked={newModifier.is_recommended}
                        onCheckedChange={(checked) => setNewModifier({ ...newModifier, is_recommended: checked })}
                      />
                      <Label htmlFor="recommended">Recommended (Pre-selected)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="available"
                        checked={newModifier.is_available}
                        onCheckedChange={(checked) => setNewModifier({ ...newModifier, is_available: checked })}
                      />
                      <Label htmlFor="available">Available</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={addModifier} disabled={!newModifier.name.trim()}>
                    Add Option
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Modifiers List */}
          {loading ? (
            <div className="text-center py-8">Loading options...</div>
          ) : modifiers.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No options configured yet.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add options like sizes, add-ons, or preparation styles for this menu item.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {modifiers.map((modifier) => (
                <Card key={modifier.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium">{modifier.name}</h4>
                          <Badge 
                            variant="outline" 
                            className={getModifierTypeColor(modifier.modifier_type)}
                          >
                            {MODIFIER_TYPES.find(t => t.value === modifier.modifier_type)?.label}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            <span className="text-sm font-medium">
                              {formatPrice(modifier.price_cents)}
                            </span>
                          </div>
                          {modifier.is_required && (
                            <Badge variant="destructive" className="text-xs">Required</Badge>
                          )}
                          {modifier.is_recommended && (
                            <Badge variant="default" className="text-xs bg-orange-500">Recommended</Badge>
                          )}
                          <Badge 
                            variant={modifier.is_available ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {modifier.is_available ? "Available" : "Unavailable"}
                          </Badge>
                        </div>
                        {modifier.description && (
                          <p className="text-sm text-muted-foreground">{modifier.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={modifier.is_available}
                          onCheckedChange={(checked) => toggleModifierAvailability(modifier.id, checked)}
                        />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setEditingModifier(modifier)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => deleteModifier(modifier.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Edit Modifier Dialog */}
          {editingModifier && (
            <Dialog open={!!editingModifier} onOpenChange={() => setEditingModifier(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Option</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-name">Option Name</Label>
                    <Input
                      id="edit-name"
                      value={editingModifier.name}
                      onChange={(e) => setEditingModifier({ ...editingModifier, name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      value={editingModifier.description || ""}
                      onChange={(e) => setEditingModifier({ ...editingModifier, description: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-type">Option Type</Label>
                    <Select 
                      value={editingModifier.modifier_type} 
                      onValueChange={(value: any) => setEditingModifier({ ...editingModifier, modifier_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MODIFIER_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div>
                              <div className="font-medium">{type.label}</div>
                              <div className="text-xs text-muted-foreground">{type.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-price">Price Adjustment ($)</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      step="0.01"
                      value={editingModifier.price_cents / 100}
                      onChange={(e) => setEditingModifier({ 
                        ...editingModifier, 
                        price_cents: Math.round(parseFloat(e.target.value || '0') * 100) 
                      })}
                    />
                  </div>
                  <div className="flex gap-4 flex-wrap">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-required"
                        checked={editingModifier.is_required}
                        onCheckedChange={(checked) => setEditingModifier({ ...editingModifier, is_required: checked })}
                      />
                      <Label htmlFor="edit-required">Required Selection</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-recommended"
                        checked={editingModifier.is_recommended}
                        onCheckedChange={(checked) => setEditingModifier({ ...editingModifier, is_recommended: checked })}
                      />
                      <Label htmlFor="edit-recommended">Recommended (Pre-selected)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-available"
                        checked={editingModifier.is_available}
                        onCheckedChange={(checked) => setEditingModifier({ ...editingModifier, is_available: checked })}
                      />
                      <Label htmlFor="edit-available">Available</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => updateModifier(editingModifier)} disabled={!editingModifier.name.trim()}>
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileCheck, Plus, Trash2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { uploadFileForOnboarding } from '../utils/authHelper';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  category: string;
  imageUrl?: string;
  isAvailable: boolean;
}

interface MenuBuilderStepProps {
  data: any;
  updateData: (updates: any) => void;
  onNext: () => void;
  onBack: () => void;
}

export function MenuBuilderStep({ data, updateData, onNext, onBack }: MenuBuilderStepProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(data.menuItems || []);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showItemForm, setShowItemForm] = useState(false);

  const uploadFile = async (file: File, fileType: string) => {
    if (!data.contactEmail) {
      toast.error('Please enter your email address first before uploading images');
      return null;
    }

    setUploading(fileType);
    
    try {
      const publicUrl = await uploadFileForOnboarding(file, fileType, data.contactEmail);
      
      if (publicUrl) {
        toast.success('Image uploaded successfully');
        return publicUrl;
      }
      
      return null;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload file');
      return null;
    } finally {
      setUploading(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileType: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await uploadFile(file, fileType);
      if (url) {
        updateData({ [fileType]: url });
      }
    }
  };

  const handleItemImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingItem) {
      const url = await uploadFile(file, `menu_item_${editingItem.id}`);
      if (url) {
        setEditingItem({ ...editingItem, imageUrl: url });
      }
    }
  };

  const saveMenuItem = () => {
    if (!editingItem?.name || !editingItem?.priceCents || !editingItem?.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    const updatedItems = editingItem.id === 'new'
      ? [...menuItems, { ...editingItem, id: Date.now().toString() }]
      : menuItems.map(item => item.id === editingItem.id ? editingItem : item);

    setMenuItems(updatedItems);
    updateData({ menuItems: updatedItems });
    setEditingItem(null);
    setShowItemForm(false);
    toast.success('Menu item saved');
  };

  const deleteMenuItem = (id: string) => {
    const updatedItems = menuItems.filter(item => item.id !== id);
    setMenuItems(updatedItems);
    updateData({ menuItems: updatedItems });
    toast.success('Menu item deleted');
  };

  const categories = ['Appetizers', 'Main Courses', 'Sides', 'Desserts', 'Beverages', 'Specials'];

  const isValid = 
    data.logoUrl &&
    data.coverImageUrl &&
    menuItems.length >= 3; // Require at least 3 menu items

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Menu & Photos</h2>
        <p className="text-gray-600">Upload your restaurant photos and build your menu</p>
      </div>

      <div className="space-y-6">
        {/* Restaurant Photos */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="logoUrl">Restaurant Logo *</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
              {data.logoUrl ? (
                <div className="space-y-2">
                  <img src={data.logoUrl} alt="Logo" className="w-32 h-32 mx-auto object-cover rounded-lg" />
                  <p className="text-sm text-green-600 font-medium">Logo Uploaded</p>
                </div>
              ) : (
                <div className="space-y-2 py-4">
                  <ImageIcon className="w-8 h-8 mx-auto text-gray-400" />
                  <div className="text-sm text-gray-600">
                    <label htmlFor="logoUrl" className="cursor-pointer text-primary hover:text-primary/80">
                      Upload logo
                    </label>
                  </div>
                </div>
              )}
              <input
                id="logoUrl"
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'logoUrl')}
                disabled={uploading === 'logoUrl'}
                className="hidden"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coverImageUrl">Cover Photo *</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
              {data.coverImageUrl ? (
                <div className="space-y-2">
                  <img src={data.coverImageUrl} alt="Cover" className="w-full h-32 object-cover rounded-lg" />
                  <p className="text-sm text-green-600 font-medium">Cover Uploaded</p>
                </div>
              ) : (
                <div className="space-y-2 py-4">
                  <ImageIcon className="w-8 h-8 mx-auto text-gray-400" />
                  <div className="text-sm text-gray-600">
                    <label htmlFor="coverImageUrl" className="cursor-pointer text-primary hover:text-primary/80">
                      Upload cover
                    </label>
                  </div>
                </div>
              )}
              <input
                id="coverImageUrl"
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'coverImageUrl')}
                disabled={uploading === 'coverImageUrl'}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Menu Items</h3>
              <p className="text-sm text-gray-600">Add at least 3 items to continue</p>
            </div>
            <Button
              onClick={() => {
                setEditingItem({
                  id: 'new',
                  name: '',
                  description: '',
                  priceCents: 0,
                  category: '',
                  isAvailable: true
                });
                setShowItemForm(true);
              }}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>

          {/* Menu Items List */}
          {menuItems.length > 0 && (
            <div className="space-y-2">
              {menuItems.map(item => (
                <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.name} className="w-16 h-16 object-cover rounded" />
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-sm text-gray-600">{item.category}</p>
                    <p className="text-sm font-semibold text-primary">${(item.priceCents / 100).toFixed(2)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingItem(item);
                        setShowItemForm(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMenuItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add/Edit Item Form */}
          {showItemForm && editingItem && (
            <div className="border-2 border-primary/20 rounded-lg p-6 space-y-4 bg-primary/5">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{editingItem.id === 'new' ? 'Add' : 'Edit'} Menu Item</h4>
                <Button variant="ghost" size="sm" onClick={() => {
                  setShowItemForm(false);
                  setEditingItem(null);
                }}>
                  Cancel
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Item Name *</Label>
                  <Input
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    placeholder="e.g., Margherita Pizza"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Price *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(editingItem.priceCents / 100).toFixed(2)}
                    onChange={(e) => setEditingItem({ 
                      ...editingItem, 
                      priceCents: Math.round(parseFloat(e.target.value) * 100) 
                    })}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select
                    value={editingItem.category}
                    onValueChange={(value) => setEditingItem({ ...editingItem, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Item Photo (Optional)</Label>
                  <div className="border-2 border-dashed rounded-lg p-2 text-center hover:border-primary/50 transition-colors">
                    {editingItem.imageUrl ? (
                      <div className="flex items-center gap-2">
                        <img src={editingItem.imageUrl} alt="Item" className="w-12 h-12 object-cover rounded" />
                        <span className="text-xs text-green-600">Uploaded</span>
                      </div>
                    ) : (
                      <label htmlFor="itemImage" className="cursor-pointer text-xs text-primary">
                        Upload photo
                        <input
                          id="itemImage"
                          type="file"
                          accept="image/*"
                          onChange={handleItemImageUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editingItem.description}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                    placeholder="Brief description of the item..."
                    rows={2}
                  />
                </div>
              </div>

              <Button onClick={saveMenuItem} className="w-full">
                Save Item
              </Button>
            </div>
          )}

          {menuItems.length === 0 && !showItemForm && (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600">No menu items yet. Add at least 3 to continue.</p>
            </div>
          )}
        </div>

        {/* Optional Menu PDF */}
        <div className="space-y-2 pt-4 border-t">
          <Label htmlFor="menuPdfUrl">Full Menu PDF (Optional)</Label>
          <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
            {data.menuPdfUrl ? (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <FileCheck className="w-5 h-5" />
                <span className="text-sm font-medium">Menu PDF Uploaded</span>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-6 h-6 mx-auto text-gray-400" />
                <div className="text-sm text-gray-600">
                  <label htmlFor="menuPdfUrl" className="cursor-pointer text-primary hover:text-primary/80">
                    Upload full menu
                  </label>
                </div>
                <p className="text-xs text-gray-500">PDF only (max 10MB)</p>
              </div>
            )}
            <input
              id="menuPdfUrl"
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileUpload(e, 'menuPdfUrl')}
              disabled={uploading === 'menuPdfUrl'}
              className="hidden"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!isValid || uploading !== null}>
          {uploading ? 'Uploading...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}

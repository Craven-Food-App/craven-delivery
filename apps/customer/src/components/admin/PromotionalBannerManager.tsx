import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Calendar as CalendarIcon,
  Upload,
  X,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';

interface PromotionalBanner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
  target_audience: 'all' | 'new_users' | 'existing_users';
  valid_from: string;
  valid_until?: string;
  action_url?: string;
  action_type: 'none' | 'url' | 'promo_code' | 'restaurant';
  created_at: string;
  updated_at: string;
}

interface BannerFormData {
  title: string;
  subtitle: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
  target_audience: 'all' | 'new_users' | 'existing_users';
  valid_from: Date;
  valid_until?: Date;
  action_url: string;
  action_type: 'none' | 'url' | 'promo_code' | 'restaurant';
}

const initialFormData: BannerFormData = {
  title: '',
  subtitle: '',
  image_url: '',
  display_order: 0,
  is_active: true,
  target_audience: 'all',
  valid_from: new Date(),
  valid_until: undefined,
  action_url: '',
  action_type: 'none',
};

export const PromotionalBannerManager: React.FC = () => {
  const [banners, setBanners] = useState<PromotionalBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<PromotionalBanner | null>(null);
  const [formData, setFormData] = useState<BannerFormData>(initialFormData);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('promotional_banners')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setBanners((data as PromotionalBanner[]) || []);
    } catch (error) {
      console.error('Error fetching banners:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch promotional banners',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  useEffect(() => {
    // Set preview when formData.image_url changes
    if (formData.image_url && !imageFile) {
      setImagePreview(formData.image_url);
    }
  }, [formData.image_url, imageFile]);

  const handleImageUpload = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload an image smaller than 10MB',
        variant: 'destructive',
      });
      return;
    }

    setUploadingImage(true);
    setImageFile(file);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);

      // Create unique filename
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('promotional-banners')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('promotional-banners')
        .getPublicUrl(fileName);

      // Update form data with the public URL
      setFormData({ ...formData, image_url: publicUrl });
      
      toast({
        title: 'Success',
        description: 'Image uploaded successfully',
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload image',
        variant: 'destructive',
      });
      setImagePreview(null);
      setImageFile(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageFile(null);
    setFormData({ ...formData, image_url: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const bannerData = {
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim(),
        image_url: formData.image_url.trim(),
        display_order: formData.display_order,
        is_active: formData.is_active,
        target_audience: formData.target_audience,
        valid_from: formData.valid_from.toISOString(),
        valid_until: formData.valid_until?.toISOString() || null,
        action_url: formData.action_url.trim() || null,
        action_type: formData.action_type,
        created_by: user.id,
      };

      let result;
      if (editingBanner) {
        result = await supabase
          .from('promotional_banners')
          .update(bannerData)
          .eq('id', editingBanner.id);
      } else {
        result = await supabase
          .from('promotional_banners')
          .insert([bannerData]);
      }

      if (result.error) throw result.error;

      toast({
        title: 'Success',
        description: `Promotional banner ${editingBanner ? 'updated' : 'created'} successfully`,
      });

      setIsDialogOpen(false);
      setEditingBanner(null);
      setFormData(initialFormData);
      fetchBanners();
    } catch (error: any) {
      console.error('Error saving banner:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save promotional banner',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (banner: PromotionalBanner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle,
      image_url: banner.image_url,
      display_order: banner.display_order,
      is_active: banner.is_active,
      target_audience: banner.target_audience,
      valid_from: new Date(banner.valid_from),
      valid_until: banner.valid_until ? new Date(banner.valid_until) : undefined,
      action_url: banner.action_url || '',
      action_type: banner.action_type,
    });
    setImagePreview(banner.image_url);
    setImageFile(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;

    try {
      const { error } = await supabase
        .from('promotional_banners')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Banner deleted successfully',
      });

      fetchBanners();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete banner',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (banner: PromotionalBanner) => {
    try {
      const { error } = await supabase
        .from('promotional_banners')
        .update({ is_active: !banner.is_active })
        .eq('id', banner.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Banner ${!banner.is_active ? 'activated' : 'deactivated'}`,
      });

      fetchBanners();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update banner',
        variant: 'destructive',
      });
    }
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const banner = banners.find(b => b.id === id);
    if (!banner) return;

    const currentIndex = banners.findIndex(b => b.id === id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= banners.length) return;

    const targetBanner = banners[newIndex];
    
    try {
      // Swap display orders
      const { error: error1 } = await supabase
        .from('promotional_banners')
        .update({ display_order: targetBanner.display_order })
        .eq('id', id);

      if (error1) throw error1;

      const { error: error2 } = await supabase
        .from('promotional_banners')
        .update({ display_order: banner.display_order })
        .eq('id', targetBanner.id);

      if (error2) throw error2;

      fetchBanners();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reorder banner',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>Loading banners...</p>
        </CardContent>
      </Card>
    );
  }

  const activeBanners = banners.filter(b => b.is_active);
  const inactiveBanners = banners.filter(b => !b.is_active);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Promotional Banners</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage promotional carousel cards displayed on the mobile restaurants page
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingBanner(null);
            setFormData(initialFormData);
            setImagePreview(null);
            setImageFile(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button 
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setEditingBanner(null);
                setFormData(initialFormData);
              }}
            >
              <Plus className="h-3 w-3 mr-1.5" />
              Create Banner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-lg">
                {editingBanner ? 'Edit' : 'Create'} Promotional Banner
              </DialogTitle>
              <DialogDescription className="text-xs">
                Create promotional cards that appear in the mobile app carousel
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs">Title *</Label>
                <Input
                  id="title"
                  className="h-8 text-sm"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Exclusive: 20% Off All Sushi Orders"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subtitle" className="text-xs">Subtitle *</Label>
                <Textarea
                  id="subtitle"
                  className="text-sm min-h-[60px]"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="Limited to the first 500 customers. Code: LUXURY20"
                  required
                  rows={2}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="image" className="text-xs">Banner Image *</Label>
                
                {/* Upload Section */}
                <div className="space-y-1.5">
                  {!imagePreview ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                      <input
                        ref={fileInputRef}
                        type="file"
                        id="image"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                      <label htmlFor="image" className="cursor-pointer">
                        <div className="flex flex-col items-center justify-center">
                          {uploadingImage ? (
                            <>
                              <Loader2 className="h-6 w-6 animate-spin text-gray-400 mb-1.5" />
                              <p className="text-xs text-gray-600">Uploading...</p>
                            </>
                          ) : (
                            <>
                              <Upload className="h-6 w-6 text-gray-400 mb-1.5" />
                              <p className="text-xs font-medium text-gray-700">
                                Click to upload or drag and drop
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                PNG, JPG, WEBP up to 10MB
                              </p>
                            </>
                          )}
                        </div>
                      </label>
                    </div>
                  ) : (
                    <div className="relative">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-40 object-cover rounded-md border"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1.5 right-1.5 h-6 w-6 p-0"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  
                  {/* URL Input as Alternative */}
                  <div className="mt-1.5">
                    <p className="text-xs text-gray-500 mb-1">Or enter image URL:</p>
                    <Input
                      id="image_url"
                      className="h-8 text-sm"
                      type="url"
                      value={formData.image_url}
                      onChange={(e) => {
                        setFormData({ ...formData, image_url: e.target.value });
                        if (e.target.value) {
                          setImagePreview(e.target.value);
                          setImageFile(null);
                        }
                      }}
                      placeholder="https://images.unsplash.com/photo-..."
                      disabled={uploadingImage}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="display_order" className="text-xs">Display Order</Label>
                  <Input
                    id="display_order"
                    className="h-8 text-sm"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                  <p className="text-xs text-gray-500">Lower numbers appear first</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="target_audience" className="text-xs">Target Audience</Label>
                  <Select
                    value={formData.target_audience}
                    onValueChange={(value: 'all' | 'new_users' | 'existing_users') => 
                      setFormData({ ...formData, target_audience: value })
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="new_users">New Users Only</SelectItem>
                      <SelectItem value="existing_users">Existing Users Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Valid From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full h-8 justify-start text-left font-normal text-sm">
                        <CalendarIcon className="mr-1.5 h-3 w-3" />
                        {formData.valid_from ? format(formData.valid_from, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.valid_from}
                        onSelect={(date) => date && setFormData({ ...formData, valid_from: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Valid Until (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full h-8 justify-start text-left font-normal text-sm">
                        <CalendarIcon className="mr-1.5 h-3 w-3" />
                        {formData.valid_until ? format(formData.valid_until, 'PPP') : 'No expiration'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.valid_until}
                        onSelect={(date) => setFormData({ ...formData, valid_until: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="action_type" className="text-xs">Action Type</Label>
                <Select
                  value={formData.action_type}
                  onValueChange={(value: 'none' | 'url' | 'promo_code' | 'restaurant') => 
                    setFormData({ ...formData, action_type: value })
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Action</SelectItem>
                    <SelectItem value="url">Navigate to URL</SelectItem>
                    <SelectItem value="promo_code">Apply Promo Code</SelectItem>
                    <SelectItem value="restaurant">Open Restaurant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.action_type === 'url' && (
                <div className="space-y-1.5">
                  <Label htmlFor="action_url" className="text-xs">Action URL</Label>
                  <Input
                    id="action_url"
                    className="h-8 text-sm"
                    type="url"
                    value={formData.action_url}
                    onChange={(e) => setFormData({ ...formData, action_url: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active" className="text-xs">Active</Label>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="h-8 text-xs" disabled={uploadingImage || !formData.image_url}>
                  {uploadingImage ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      {editingBanner ? 'Update' : 'Create'} Banner
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Banners */}
      {activeBanners.length > 0 && (
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-base">Active Banners ({activeBanners.length})</CardTitle>
            <CardDescription className="text-xs">
              These banners are currently displayed in the mobile app carousel
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8 py-2 px-3 text-xs">Preview</TableHead>
                  <TableHead className="h-8 py-2 px-3 text-xs">Title</TableHead>
                  <TableHead className="h-8 py-2 px-3 text-xs">Order</TableHead>
                  <TableHead className="h-8 py-2 px-3 text-xs">Status</TableHead>
                  <TableHead className="h-8 py-2 px-3 text-xs">Valid Period</TableHead>
                  <TableHead className="h-8 py-2 px-3 text-right text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeBanners.map((banner, index) => (
                  <TableRow key={banner.id}>
                    <TableCell className="py-2 px-3">
                      <img 
                        src={banner.image_url} 
                        alt={banner.title}
                        className="w-12 h-12 object-cover rounded"
                        onError={(e) => {
                          e.currentTarget.src = 'https://placehold.co/48x48/f5f5f5/333?text=Image';
                        }}
                      />
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <div>
                        <div className="text-xs font-medium">{banner.title}</div>
                        <div className="text-xs text-gray-500">{banner.subtitle}</div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleReorder(banner.id, 'up')}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <span className="px-1.5 text-xs">{banner.display_order}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleReorder(banner.id, 'down')}
                          disabled={index === activeBanners.length - 1}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <Badge variant="default" className="text-xs">Active</Badge>
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <div className="text-xs">
                        <div>{format(new Date(banner.valid_from), 'MMM d, yyyy')}</div>
                        {banner.valid_until && (
                          <div className="text-gray-500">
                            until {format(new Date(banner.valid_until), 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleToggleActive(banner)}
                        >
                          <EyeOff className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleEdit(banner)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleDelete(banner.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Inactive Banners */}
      {inactiveBanners.length > 0 && (
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-base">Inactive Banners ({inactiveBanners.length})</CardTitle>
            <CardDescription className="text-xs">
              These banners are not currently displayed
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8 py-2 px-3 text-xs">Preview</TableHead>
                  <TableHead className="h-8 py-2 px-3 text-xs">Title</TableHead>
                  <TableHead className="h-8 py-2 px-3 text-xs">Order</TableHead>
                  <TableHead className="h-8 py-2 px-3 text-xs">Status</TableHead>
                  <TableHead className="h-8 py-2 px-3 text-right text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inactiveBanners.map((banner) => (
                  <TableRow key={banner.id}>
                    <TableCell className="py-2 px-3">
                      <img 
                        src={banner.image_url} 
                        alt={banner.title}
                        className="w-12 h-12 object-cover rounded opacity-50"
                        onError={(e) => {
                          e.currentTarget.src = 'https://placehold.co/48x48/f5f5f5/333?text=Image';
                        }}
                      />
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <div>
                        <div className="text-xs font-medium">{banner.title}</div>
                        <div className="text-xs text-gray-500">{banner.subtitle}</div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-3 text-xs">{banner.display_order}</TableCell>
                    <TableCell className="py-2 px-3">
                      <Badge variant="secondary" className="text-xs">Inactive</Badge>
                    </TableCell>
                    <TableCell className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleToggleActive(banner)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleEdit(banner)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleDelete(banner.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {banners.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <ImageIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <h3 className="text-sm font-semibold mb-1">No promotional banners</h3>
            <p className="text-xs text-gray-600 mb-3">
              Create your first promotional banner to display in the mobile app carousel
            </p>
            <Button size="sm" className="h-8 text-xs" onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-3 w-3 mr-1.5" />
              Create Banner
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};


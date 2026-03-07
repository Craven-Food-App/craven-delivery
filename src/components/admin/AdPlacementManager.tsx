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
  Eye,
  EyeOff,
  Calendar as CalendarIcon,
  Upload,
  X,
  Loader2,
  Code,
  Link as LinkIcon
} from 'lucide-react';
import { format } from 'date-fns';

interface AdPlacement {
  id: string;
  page_path: string;
  placement_key: string;
  placement_name: string;
  image_url?: string;
  ad_code?: string;
  click_url?: string;
  width: number;
  height: number;
  is_active: boolean;
  display_order: number;
  target_audience: 'all' | 'new_users' | 'existing_users';
  valid_from: string;
  valid_until?: string;
  created_at: string;
  updated_at: string;
}

interface AdFormData {
  page_path: string;
  placement_key: string;
  placement_name: string;
  image_url: string;
  ad_code: string;
  click_url: string;
  width: number;
  height: number;
  is_active: boolean;
  display_order: number;
  target_audience: 'all' | 'new_users' | 'existing_users';
  valid_from: Date;
  valid_until?: Date;
}

const initialFormData: AdFormData = {
  page_path: '/restaurants',
  placement_key: 'below_quick_picks',
  placement_name: 'Below Quick Picks',
  image_url: '',
  ad_code: '',
  click_url: '',
  width: 380,
  height: 200,
  is_active: true,
  display_order: 0,
  target_audience: 'all',
  valid_from: new Date(),
  valid_until: undefined,
};

const PAGE_PATHS = [
  { value: '/restaurants', label: 'Restaurants Page' },
  { value: '/', label: 'Homepage' },
  { value: '/restaurant/:id', label: 'Restaurant Detail' },
];

const PLACEMENT_KEYS = [
  { value: 'main_customer_ad', label: 'Main Customer Ad (Above Quick Picks)' },
  { value: 'below_quick_picks', label: 'Below Quick Picks' },
  { value: 'above_premium', label: 'Above Premium Selections' },
  { value: 'sidebar', label: 'Sidebar' },
  { value: 'header', label: 'Header' },
  { value: 'footer', label: 'Footer' },
];

export const AdPlacementManager: React.FC = () => {
  const [placements, setPlacements] = useState<AdPlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlacement, setEditingPlacement] = useState<AdPlacement | null>(null);
  const [formData, setFormData] = useState<AdFormData>(initialFormData);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchPlacements = async () => {
    try {
      const { data, error } = await supabase
        .from('ad_placements')
        .select('*')
        .order('page_path', { ascending: true })
        .order('display_order', { ascending: true });

      if (error) throw error;
      setPlacements((data as AdPlacement[]) || []);
    } catch (error) {
      console.error('Error fetching ad placements:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch ad placements',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlacements();
  }, []);

  useEffect(() => {
    if (formData.image_url && !imageFile) {
      setImagePreview(formData.image_url);
    }
  }, [formData.image_url, imageFile]);

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Image must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `ad-placements/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('promotional-banners')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('promotional-banners')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: data.publicUrl });
      setImagePreview(data.publicUrl);
      setImageFile(null);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
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

      const placementData = {
        page_path: formData.page_path.trim(),
        placement_key: formData.placement_key.trim(),
        placement_name: formData.placement_name.trim(),
        image_url: formData.image_url.trim() || null,
        ad_code: formData.ad_code.trim() || null,
        click_url: formData.click_url.trim() || null,
        width: formData.width,
        height: formData.height,
        is_active: formData.is_active,
        display_order: formData.display_order,
        target_audience: formData.target_audience,
        valid_from: formData.valid_from.toISOString(),
        valid_until: formData.valid_until?.toISOString() || null,
        created_by: user.id,
      };

      let result;
      if (editingPlacement) {
        result = await supabase
          .from('ad_placements')
          .update(placementData)
          .eq('id', editingPlacement.id);
      } else {
        result = await supabase
          .from('ad_placements')
          .insert([placementData]);
      }

      if (result.error) throw result.error;

      toast({
        title: 'Success',
        description: `Ad placement ${editingPlacement ? 'updated' : 'created'} successfully`,
      });

      setIsDialogOpen(false);
      setEditingPlacement(null);
      setFormData(initialFormData);
      setImagePreview(null);
      fetchPlacements();
    } catch (error: any) {
      console.error('Error saving ad placement:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save ad placement',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (placement: AdPlacement) => {
    setEditingPlacement(placement);
    setFormData({
      page_path: placement.page_path,
      placement_key: placement.placement_key,
      placement_name: placement.placement_name,
      image_url: placement.image_url || '',
      ad_code: placement.ad_code || '',
      click_url: placement.click_url || '',
      width: placement.width,
      height: placement.height,
      is_active: placement.is_active,
      display_order: placement.display_order,
      target_audience: placement.target_audience,
      valid_from: new Date(placement.valid_from),
      valid_until: placement.valid_until ? new Date(placement.valid_until) : undefined,
    });
    setImagePreview(placement.image_url || null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ad placement?')) return;

    try {
      const { error } = await supabase
        .from('ad_placements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Ad placement deleted successfully',
      });

      fetchPlacements();
    } catch (error: any) {
      console.error('Error deleting ad placement:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete ad placement',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (placement: AdPlacement) => {
    try {
      const { error } = await supabase
        .from('ad_placements')
        .update({ is_active: !placement.is_active })
        .eq('id', placement.id);

      if (error) throw error;

      fetchPlacements();
    } catch (error: any) {
      console.error('Error toggling ad placement:', error);
      toast({
        title: 'Error',
        description: 'Failed to update ad placement',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Ad Placement Manager</h2>
          <p className="text-muted-foreground">Manage advertisement locations across your site</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingPlacement(null);
              setFormData(initialFormData);
              setImagePreview(null);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              New Ad Placement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPlacement ? 'Edit' : 'Create'} Ad Placement</DialogTitle>
              <DialogDescription>
                Configure where and how ads appear on your pages
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="page_path">Page Path</Label>
                  <Select
                    value={formData.page_path}
                    onValueChange={(value) => setFormData({ ...formData, page_path: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select page" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_PATHS.map((path) => (
                        <SelectItem key={path.value} value={path.value}>
                          {path.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="placement_key">Placement Location</Label>
                  <Select
                    value={formData.placement_key}
                    onValueChange={(value) => {
                      const placement = PLACEMENT_KEYS.find(p => p.value === value);
                      setFormData({ 
                        ...formData, 
                        placement_key: value,
                        placement_name: placement?.label || formData.placement_name
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLACEMENT_KEYS.map((key) => (
                        <SelectItem key={key.value} value={key.value}>
                          {key.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="placement_name">Placement Name</Label>
                <Input
                  id="placement_name"
                  value={formData.placement_name}
                  onChange={(e) => setFormData({ ...formData, placement_name: e.target.value })}
                  placeholder="e.g., Below Quick Picks"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="width">Width (px)</Label>
                  <Input
                    id="width"
                    type="number"
                    value={formData.width}
                    onChange={(e) => setFormData({ ...formData, width: parseInt(e.target.value) || 380 })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height (px)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: parseInt(e.target.value) || 200 })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ad Image</Label>
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="w-full h-48 object-contain border rounded" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Image
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url">Or Image URL</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://example.com/ad.jpg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ad_code">Ad Code (HTML/JS)</Label>
                <Textarea
                  id="ad_code"
                  value={formData.ad_code}
                  onChange={(e) => setFormData({ ...formData, ad_code: e.target.value })}
                  placeholder="Paste ad network code here..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Use this for third-party ad networks (Google AdSense, etc.)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="click_url">Click URL</Label>
                <Input
                  id="click_url"
                  value={formData.click_url}
                  onChange={(e) => setFormData({ ...formData, click_url: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="display_order">Display Order</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target_audience">Target Audience</Label>
                  <Select
                    value={formData.target_audience}
                    onValueChange={(value: 'all' | 'new_users' | 'existing_users') => 
                      setFormData({ ...formData, target_audience: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="new_users">New Users</SelectItem>
                      <SelectItem value="existing_users">Existing Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valid From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.valid_from ? format(formData.valid_from, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.valid_from}
                        onSelect={(date) => date && setFormData({ ...formData, valid_from: date })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Valid Until (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.valid_until ? format(formData.valid_until, 'PPP') : 'No expiration'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.valid_until}
                        onSelect={(date) => setFormData({ ...formData, valid_until: date })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPlacement ? 'Update' : 'Create'} Placement
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ad Placements</CardTitle>
          <CardDescription>Manage where ads appear on your pages</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {placements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No ad placements configured. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                placements.map((placement) => (
                  <TableRow key={placement.id}>
                    <TableCell className="font-medium">{placement.page_path}</TableCell>
                    <TableCell>{placement.placement_name}</TableCell>
                    <TableCell>{placement.width} × {placement.height}</TableCell>
                    <TableCell>
                      <Badge variant={placement.is_active ? 'default' : 'secondary'}>
                        {placement.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>{placement.display_order}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(placement)}
                        >
                          {placement.is_active ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(placement)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(placement.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};


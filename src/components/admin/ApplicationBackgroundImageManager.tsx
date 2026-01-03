import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Upload,
  X,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';

export const ApplicationBackgroundImageManager: React.FC = () => {
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchBackgroundImage = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('marketing_settings')
        .select('application_background_image_url')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        // Handle case where column might not exist yet
        if (error.code === '42703' && error.message.includes('column "application_background_image_url" does not exist')) {
          console.warn('Column application_background_image_url does not exist. Skipping fetch.');
          setBackgroundImageUrl('');
          setImagePreview(null);
          return;
        }
        throw error;
      }
      
      const imageUrl = data?.application_background_image_url || '';
      setBackgroundImageUrl(imageUrl);
      setImagePreview(imageUrl || null);
    } catch (error: any) {
      console.error('Error fetching application background image:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch application background image settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackgroundImage();
  }, []);

  useEffect(() => {
    // Set preview when backgroundImageUrl changes
    if (backgroundImageUrl && !imageFile) {
      setImagePreview(backgroundImageUrl);
    }
  }, [backgroundImageUrl, imageFile]);

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
      const fileName = `application-background/${Date.now()}.${fileExt}`;

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

      // Update settings with the public URL
      setBackgroundImageUrl(publicUrl);
      
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
    setBackgroundImageUrl('');
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if a row exists
      const { data: existing } = await supabase
        .from('marketing_settings')
        .select('id')
        .limit(1)
        .single();

      let error;
      if (existing) {
        // Update existing row
        const { error: updateError } = await supabase
          .from('marketing_settings')
          .update({
            application_background_image_url: backgroundImageUrl || null,
            updated_by: user.id,
          })
          .eq('id', existing.id);
        error = updateError;
      } else {
        // Insert new row
        const { error: insertError } = await supabase
          .from('marketing_settings')
          .insert({
            application_background_image_url: backgroundImageUrl || null,
            updated_by: user.id,
          });
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Application background image updated successfully',
      });

      fetchBackgroundImage();
    } catch (error: any) {
      console.error('Error saving application background image:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save application background image',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !backgroundImageUrl) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="p-3">
          <CardTitle className="text-base">Application Background Image</CardTitle>
          <CardDescription className="text-xs">
            Set the background image displayed on the "Apply to Drive with Crave'n" application page (/driver-onboarding/apply)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          {/* Upload Section */}
          <div className="space-y-1.5">
            <Label className="text-xs">Background Image</Label>
            
            {!imagePreview ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="application-background-image"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploadingImage}
                />
                <label htmlFor="application-background-image" className="cursor-pointer">
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
                  alt="Application Background Preview" 
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
                id="application_background_image_url"
                className="h-8 text-sm"
                type="url"
                value={backgroundImageUrl}
                onChange={(e) => {
                  setBackgroundImageUrl(e.target.value);
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

          {/* Preview Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> This image will be used as the full-page background on the application page. 
              If no image is set, a default orange gradient will be displayed. 
              Recommended dimensions: 1920x1080px or similar landscape orientation for best display.
            </p>
          </div>

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            disabled={uploadingImage || loading}
            size="sm"
            className="w-full h-8 text-xs"
          >
            {uploadingImage || loading ? (
              <>
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                {uploadingImage ? 'Uploading...' : 'Saving...'}
              </>
            ) : (
              'Save Application Background Image'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};



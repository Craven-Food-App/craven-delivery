import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, ArrowLeft, Upload, X, ImageIcon, FileText } from 'lucide-react';
import { OnboardingData } from '../RestaurantOnboardingWizard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface MenuSetupStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function MenuSetupStep({ data, updateData, onNext, onBack }: MenuSetupStepProps) {
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (file: File, type: 'logo' | 'cover' | 'menu'): Promise<string | null> => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Authentication required',
          description: 'Please sign in to upload files',
          variant: 'destructive',
        });
        return null;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select a file smaller than 10MB',
          variant: 'destructive',
        });
        return null;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${type}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('restaurant-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('restaurant-images')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error?.message || 'Failed to upload file',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover' | 'menu') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = await uploadFile(file, type);
    if (url) {
      if (type === 'logo') updateData({ logoUrl: url });
      else if (type === 'cover') updateData({ coverImageUrl: url });
      else if (type === 'menu') updateData({ menuPdfUrl: url });
    }
  };

  const isValid = data.logoUrl && data.coverImageUrl;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <ImageIcon className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-bold mb-2">Menu & Photos</h2>
        <p className="text-muted-foreground">
          Help customers see what makes your restaurant special
        </p>
      </div>

      <div className="space-y-6">
        {/* Logo Upload */}
        <div>
          <Label>Restaurant Logo * (Square format recommended)</Label>
          <div className="mt-2">
            {data.logoUrl ? (
              <div className="relative inline-block">
                <img
                  src={data.logoUrl}
                  alt="Logo"
                  className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                  onClick={() => updateData({ logoUrl: '' })}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">Click to upload logo</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'logo')}
                  disabled={uploading}
                />
              </label>
            )}
          </div>
        </div>

        {/* Cover Image Upload */}
        <div>
          <Label>Cover Photo * (16:9 format recommended)</Label>
          <div className="mt-2">
            {data.coverImageUrl ? (
              <div className="relative inline-block w-full">
                <img
                  src={data.coverImageUrl}
                  alt="Cover"
                  className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 h-8 w-8 rounded-full p-0"
                  onClick={() => updateData({ coverImageUrl: '' })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">Click to upload cover photo</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'cover')}
                  disabled={uploading}
                />
              </label>
            )}
          </div>
        </div>

        {/* Menu Upload (Optional) */}
        <div>
          <Label>Menu (Optional - PDF or Image)</Label>
          <div className="mt-2">
            {data.menuPdfUrl ? (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-primary" />
                  <span className="text-sm">Menu uploaded</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => updateData({ menuPdfUrl: '' })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary transition-colors">
                <Upload className="w-6 h-6 text-gray-400 mb-1" />
                <span className="text-sm text-gray-500">Click to upload menu</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileUpload(e, 'menu')}
                  disabled={uploading}
                />
              </label>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            You can add individual menu items later in the dashboard
          </p>
        </div>
      </div>

      {uploading && (
        <div className="text-center py-4">
          <Upload className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Uploading...</p>
        </div>
      )}

      <div className="flex justify-between pt-6 border-t">
        <Button onClick={onBack} variant="outline" size="lg" disabled={uploading}>
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!isValid || uploading} size="lg">
          Continue
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

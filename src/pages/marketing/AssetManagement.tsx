/**
 * Document & Asset Management
 * Store and manage marketing assets
 */

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Folder, Image as ImageIcon, FileText, Video, X, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Asset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'pdf' | 'other';
  url: string;
  folder: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  uploadedByName?: string;
  thumbnailUrl?: string;
}

const AssetManagement: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string>('All');
  const [folders] = useState<string[]>(['All', 'Campaigns', 'Merchants', 'Brand Guidelines', 'Social Media']);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const getFolderName = (folder: string): string => {
    if (folder === 'All') return 'general';
    const folderMap: { [key: string]: string } = {
      'Campaigns': 'campaigns',
      'Merchants': 'merchants',
      'Brand Guidelines': 'brand_guidelines',
      'Social Media': 'social_media',
    };
    return folderMap[folder] || folder.toLowerCase().replace(' ', '_');
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const { data: assetsData, error } = await supabase
        .from('marketing_assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          console.warn('marketing_assets table not found. Run migration 20250131000013_create_marketing_assets_table.sql');
          setAssets([]);
          return;
        }
        throw error;
      }

      const transformedAssets: Asset[] = (assetsData || []).map((asset) => ({
        id: asset.id,
        name: asset.name,
        type: asset.file_type as 'image' | 'video' | 'pdf' | 'other',
        url: asset.file_url,
        folder: asset.folder,
        size: asset.file_size_bytes,
        uploadedAt: asset.created_at,
        uploadedBy: asset.uploaded_by || '',
        uploadedByName: asset.uploaded_by_name || 'Unknown',
        thumbnailUrl: asset.thumbnail_url || undefined,
      }));

      setAssets(transformedAssets);
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Failed to load assets');
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const generateVideoThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      let videoUrl: string | null = null;

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      const cleanup = () => {
        if (videoUrl) {
          URL.revokeObjectURL(videoUrl);
          videoUrl = null;
        }
        video.src = '';
        video.load();
      };

      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = () => {
        const seekTime = Math.min(1, video.duration * 0.1);
        video.currentTime = seekTime;
      };

      video.onseeked = () => {
        try {
          const maxWidth = 400;
          const aspectRatio = video.videoWidth / video.videoHeight;
          const width = Math.min(maxWidth, video.videoWidth);
          const height = width / aspectRatio;

          canvas.width = width;
          canvas.height = height;

          ctx.drawImage(video, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const reader = new FileReader();
                reader.onloadend = () => {
                  cleanup();
                  resolve(reader.result as string);
                };
                reader.onerror = () => {
                  cleanup();
                  reject(new Error('Failed to read thumbnail'));
                };
                reader.readAsDataURL(blob);
              } else {
                cleanup();
                reject(new Error('Failed to create thumbnail blob'));
              }
            },
            'image/jpeg',
            0.8
          );
        } catch (error) {
          cleanup();
          reject(error);
        }
      };

      video.onerror = () => {
        cleanup();
        reject(new Error('Failed to load video for thumbnail generation'));
      };

      videoUrl = URL.createObjectURL(file);
      video.src = videoUrl;
    });
  };

  const uploadThumbnail = async (thumbnailDataUrl: string, folderName: string, baseFileName: string): Promise<string> => {
    const response = await fetch(thumbnailDataUrl);
    const blob = await response.blob();

    const thumbnailFileName = `${baseFileName.replace(/\.[^/.]+$/, '')}_thumb.jpg`;
    const thumbnailPath = `${folderName}/thumbnails/${thumbnailFileName}`;

    const { data: thumbnailUpload, error: thumbnailError } = await supabase.storage
      .from('marketing-assets')
      .upload(thumbnailPath, blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg',
      });

    if (thumbnailError) {
      throw thumbnailError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('marketing-assets')
      .getPublicUrl(thumbnailPath);

    return publicUrl;
  };

  const handleFileUpload = async (file: File) => {
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size must be less than 10MB');
      return;
    }

    const fileType = file.type.startsWith('image/') ? 'image' :
                    file.type.startsWith('video/') ? 'video' :
                    file.type === 'application/pdf' ? 'pdf' : 'other';

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to upload assets');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      const userName = profile?.full_name || user.email || 'Unknown';

      const folderName = currentFolder === 'All' ? 'general' : getFolderName(currentFolder);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `${folderName}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('marketing-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('does not exist')) {
          toast.error('Storage bucket "marketing-assets" not found. Please create it in Supabase Storage.');
          console.error('Storage bucket error:', uploadError);
          return;
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('marketing-assets')
        .getPublicUrl(filePath);

      let thumbnailUrl: string | null = null;
      if (fileType === 'video') {
        try {
          const thumbnailDataUrl = await generateVideoThumbnail(file);
          thumbnailUrl = await uploadThumbnail(thumbnailDataUrl, folderName, fileName);
        } catch (thumbnailError) {
          console.warn('Failed to generate video thumbnail:', thumbnailError);
        }
      }

      const { data: assetData, error: dbError } = await supabase
        .from('marketing_assets')
        .insert({
          name: file.name,
          file_name: fileName,
          file_path: filePath,
          file_url: publicUrl,
          file_type: fileType,
          mime_type: file.type,
          file_size_bytes: file.size,
          folder: folderName,
          thumbnail_url: thumbnailUrl,
          uploaded_by: user.id,
          uploaded_by_name: userName,
        })
        .select()
        .single();

      if (dbError) {
        if (dbError.code === 'PGRST116' || dbError.message.includes('does not exist')) {
          console.warn('marketing_assets table not found. File uploaded but metadata not saved.');
          toast.warning('File uploaded but metadata not saved. Run migration to enable full functionality.');
        } else {
          throw dbError;
        }
      } else {
        const newAsset: Asset = {
          id: assetData.id,
          name: assetData.name,
          type: assetData.file_type as 'image' | 'video' | 'pdf' | 'other',
          url: assetData.file_url,
          folder: assetData.folder,
          size: assetData.file_size_bytes,
          uploadedAt: assetData.created_at,
          uploadedBy: assetData.uploaded_by || '',
          uploadedByName: assetData.uploaded_by_name || 'Unknown',
          thumbnailUrl: assetData.thumbnail_url || undefined,
        };
        setAssets([newAsset, ...assets]);
        toast.success('Asset uploaded successfully!');
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload asset: ' + (error.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const filteredAssets = currentFolder === 'All'
    ? assets
    : assets.filter(a => a.folder === getFolderName(currentFolder));

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Asset Management</h2>
          <p className="text-xs text-gray-500 mt-0.5">Store and organize marketing assets and documents</p>
        </div>
        <Button onClick={() => setShowUpload(true)} size="sm" className="h-7 px-2.5 text-xs bg-orange-500 hover:bg-orange-600">
          <Upload className="h-3 w-3 mr-1.5" />
          Upload Asset
        </Button>
      </div>

      {/* Compact Folders */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {folders.map((folder) => (
          <Button
            key={folder}
            variant={currentFolder === folder ? 'default' : 'outline'}
            onClick={() => setCurrentFolder(folder)}
            size="sm"
            className={`h-7 px-2.5 text-xs ${currentFolder === folder ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
          >
            <Folder className="h-3 w-3 mr-1.5" />
            {folder}
          </Button>
        ))}
      </div>

      {/* Upload Modal - Compact */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Upload Asset</DialogTitle>
            <DialogDescription className="text-xs">
              Upload marketing assets to organize and use in your campaigns. Supported formats: images, videos, and PDFs (max 10MB).
            </DialogDescription>
          </DialogHeader>
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-300 bg-gray-50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {uploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="h-10 w-10 mx-auto text-orange-600 mb-3 animate-spin" />
                <p className="text-xs font-medium text-gray-700">Uploading...</p>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                <p className="text-xs font-medium text-gray-700 mb-1">
                  Drop files here or click to upload
                </p>
                <p className="text-[10px] text-gray-500 mb-3">
                  Supports images, videos, PDFs (max 10MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileInputChange}
                  className="hidden"
                  accept="image/*,video/*,.pdf"
                  disabled={uploading}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  size="sm"
                  className="h-7 px-2.5 text-xs bg-orange-500 hover:bg-orange-600"
                >
                  Select Files
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Assets Grid - Compact */}
      {loading ? (
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 mx-auto text-orange-600 mb-3 animate-spin" />
            <p className="text-xs text-gray-600">Loading assets...</p>
          </CardContent>
        </Card>
      ) : filteredAssets.length === 0 ? (
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-8 text-center">
            <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <h3 className="text-sm font-semibold text-gray-900 mb-1">No assets in this folder</h3>
            <p className="text-xs text-gray-600 mb-3">Upload your first marketing asset to get started</p>
            <Button onClick={() => setShowUpload(true)} size="sm" className="h-7 px-2.5 text-xs bg-orange-500 hover:bg-orange-600">
              <Upload className="h-3 w-3 mr-1.5" />
              Upload Asset
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {filteredAssets.map((asset) => (
            <Card key={asset.id} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-2">
              <div className="aspect-square bg-gray-100 rounded-md mb-1.5 flex items-center justify-center overflow-hidden relative">
                {asset.type === 'image' ? (
                  <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                ) : asset.type === 'video' ? (
                  <>
                    {asset.thumbnailUrl ? (
                      <div className="relative w-full h-full">
                        <img 
                          src={asset.thumbnailUrl} 
                          alt={asset.name} 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                          <Video className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    ) : (
                      <Video className="h-8 w-8 text-gray-400" />
                    )}
                  </>
                ) : (
                  <FileText className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <p className="text-[10px] font-medium text-gray-900 truncate mb-0.5" title={asset.name}>
                {asset.name}
              </p>
              <p className="text-[10px] text-gray-500 mb-1.5">
                {(asset.size / 1024).toFixed(1)} KB
              </p>
              <Button variant="outline" size="sm" className="w-full h-6 px-1.5 text-[10px]" asChild>
                <a href={asset.url} download target="_blank" rel="noopener noreferrer">
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </a>
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssetManagement;

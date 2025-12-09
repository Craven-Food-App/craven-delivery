/**
 * Document & Asset Management
 * Store and manage marketing assets
 */

import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
        // If table doesn't exist, show warning
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          console.warn('marketing_assets table not found. Run migration 20250131000013_create_marketing_assets_table.sql');
          setAssets([]);
          return;
        }
        throw error;
      }

      // Transform to Asset format
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

  // Generate thumbnail from video file
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

      // Cleanup function
      const cleanup = () => {
        if (videoUrl) {
          URL.revokeObjectURL(videoUrl);
          videoUrl = null;
        }
        video.src = '';
        video.load();
      };

      video.preload = 'metadata';
      video.muted = true; // Required for autoplay in some browsers
      video.playsInline = true;

      video.onloadedmetadata = () => {
        // Seek to 1 second (or 10% of video, whichever is smaller)
        const seekTime = Math.min(1, video.duration * 0.1);
        video.currentTime = seekTime;
      };

      video.onseeked = () => {
        try {
          // Set canvas dimensions (maintain aspect ratio, max 400px width)
          const maxWidth = 400;
          const aspectRatio = video.videoWidth / video.videoHeight;
          const width = Math.min(maxWidth, video.videoWidth);
          const height = width / aspectRatio;

          canvas.width = width;
          canvas.height = height;

          // Draw video frame to canvas
          ctx.drawImage(video, 0, 0, width, height);

          // Convert to blob then to data URL
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

      // Create object URL for video
      videoUrl = URL.createObjectURL(file);
      video.src = videoUrl;
    });
  };

  // Upload thumbnail image to storage
  const uploadThumbnail = async (thumbnailDataUrl: string, folderName: string, baseFileName: string): Promise<string> => {
    // Convert data URL to blob
    const response = await fetch(thumbnailDataUrl);
    const blob = await response.blob();

    // Create thumbnail file name
    const thumbnailFileName = `${baseFileName.replace(/\.[^/.]+$/, '')}_thumb.jpg`;
    const thumbnailPath = `${folderName}/thumbnails/${thumbnailFileName}`;

    // Upload thumbnail
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

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('marketing-assets')
      .getPublicUrl(thumbnailPath);

    return publicUrl;
  };

  const handleFileUpload = async (file: File) => {
    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 10MB');
      return;
    }

    const fileType = file.type.startsWith('image/') ? 'image' :
                    file.type.startsWith('video/') ? 'video' :
                    file.type === 'application/pdf' ? 'pdf' : 'other';

    setUploading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to upload assets');
        return;
      }

      // Get user profile for name
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      const userName = profile?.full_name || user.email || 'Unknown';

      // Prepare file path
      const folderName = currentFolder === 'All' ? 'general' : getFolderName(currentFolder);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `${folderName}/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('marketing-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        // If bucket doesn't exist, create it via API or show helpful message
        if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('does not exist')) {
          toast.error('Storage bucket "marketing-assets" not found. Please create it in Supabase Storage.');
          console.error('Storage bucket error:', uploadError);
          return;
        }
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('marketing-assets')
        .getPublicUrl(filePath);

      // Generate and upload thumbnail for videos
      let thumbnailUrl: string | null = null;
      if (fileType === 'video') {
        try {
          const thumbnailDataUrl = await generateVideoThumbnail(file);
          thumbnailUrl = await uploadThumbnail(thumbnailDataUrl, folderName, fileName);
        } catch (thumbnailError) {
          console.warn('Failed to generate video thumbnail:', thumbnailError);
          // Continue without thumbnail - not critical
        }
      }

      // Save metadata to database
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
        // If table doesn't exist, still show success but warn
        if (dbError.code === 'PGRST116' || dbError.message.includes('does not exist')) {
          console.warn('marketing_assets table not found. File uploaded but metadata not saved.');
          toast.warning('File uploaded but metadata not saved. Run migration to enable full functionality.');
        } else {
          throw dbError;
        }
      } else {
        // Add to assets list
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

      // Reset file input
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Asset Management</h2>
          <p className="text-gray-600 mt-1">Store and organize marketing assets and documents</p>
        </div>
        <Button onClick={() => setShowUpload(true)} className="bg-orange-600 hover:bg-orange-700">
          <Upload className="h-4 w-4 mr-2" />
          Upload Asset
        </Button>
      </div>

      {/* Folders */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {folders.map((folder) => (
          <Button
            key={folder}
            variant={currentFolder === folder ? 'default' : 'outline'}
            onClick={() => setCurrentFolder(folder)}
            className={currentFolder === folder ? 'bg-orange-600' : ''}
          >
            <Folder className="h-4 w-4 mr-2" />
            {folder}
          </Button>
        ))}
      </div>

      {/* Upload Modal */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Asset</DialogTitle>
            <DialogDescription>
              Upload marketing assets to organize and use in your campaigns. Supported formats: images, videos, and PDFs (max 10MB).
            </DialogDescription>
          </DialogHeader>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
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
                <Loader2 className="h-12 w-12 mx-auto text-orange-600 mb-4 animate-spin" />
                <p className="text-sm font-medium text-gray-700">Uploading...</p>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Drop files here or click to upload
                </p>
                <p className="text-xs text-gray-500 mb-4">
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
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Select Files
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Assets Grid */}
      {loading ? (
        <Card className="p-12 text-center">
          <Loader2 className="h-12 w-12 mx-auto text-orange-600 mb-4 animate-spin" />
          <p className="text-gray-600">Loading assets...</p>
        </Card>
      ) : filteredAssets.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No assets in this folder</h3>
          <p className="text-gray-600 mb-4">Upload your first marketing asset to get started</p>
          <Button onClick={() => setShowUpload(true)} className="bg-orange-600 hover:bg-orange-700">
            <Upload className="h-4 w-4 mr-2" />
            Upload Asset
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredAssets.map((asset) => (
            <Card key={asset.id} className="p-3 hover:shadow-lg transition-shadow">
              <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden relative">
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
                          <Video className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    ) : (
                      <Video className="h-12 w-12 text-gray-400" />
                    )}
                  </>
                ) : (
                  <FileText className="h-12 w-12 text-gray-400" />
                )}
              </div>
              <p className="text-xs font-medium text-gray-900 truncate" title={asset.name}>
                {asset.name}
              </p>
              <p className="text-xs text-gray-500">
                {(asset.size / 1024).toFixed(1)} KB
              </p>
              <div className="flex gap-1 mt-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
                  <a href={asset.url} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssetManagement;


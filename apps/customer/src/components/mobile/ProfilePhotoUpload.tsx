import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Check, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProfilePhotoUploadProps {
  currentPhotoUrl?: string;
  onPhotoUpdate: (url: string) => void;
}

export const ProfilePhotoUpload: React.FC<ProfilePhotoUploadProps> = ({
  currentPhotoUrl,
  onPhotoUpdate
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
      setShowCropper(true);
      setCropPosition({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
    };
    reader.readAsDataURL(file);
  };

  const handleCrop = useCallback(() => {
    if (!imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    const size = 400; // Output size - perfect circle
    canvas.width = size;
    canvas.height = size;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);
    
    // Save context state
    ctx.save();

    // Create circular clipping path FIRST
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Calculate the minimum dimension to ensure we cover the circle
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;
    const minDim = Math.min(imgWidth, imgHeight);
    
    // Calculate scale to fill the circle
    const baseScale = size / minDim;
    const finalScale = baseScale * zoom;
    
    const scaledWidth = imgWidth * finalScale;
    const scaledHeight = imgHeight * finalScale;

    // Center the image
    const centerX = size / 2;
    const centerY = size / 2;

    // Apply transformations
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(
      img,
      -scaledWidth / 2,
      -scaledHeight / 2,
      scaledWidth,
      scaledHeight
    );
    
    ctx.restore();

    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setCroppedImage(url);
      }
    }, 'image/jpeg', 0.95);
  }, [zoom, rotation]);

  const handleSave = async () => {
    if (!canvasRef.current) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvasRef.current?.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/jpeg', 0.95);
      });

      // Upload to Supabase Storage
      const fileName = `${user.id}-${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      // Update user profile
      const { error: updateError } = await supabase
        .from('craver_applications')
        .update({ profile_photo: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Also update user_profiles if it exists
      await supabase
        .from('user_profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      onPhotoUpdate(publicUrl);
      setShowCropper(false);
      setSelectedImage(null);
      toast.success('Profile photo updated successfully');
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast.error(error.message || 'Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setShowCropper(false);
    setSelectedImage(null);
    setCroppedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Photo Display and Upload Button */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-100 border-4 border-white shadow-lg">
            {currentPhotoUrl ? (
              <img
                src={currentPhotoUrl}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-400 to-orange-600">
                <Camera className="h-12 w-12 text-white" />
              </div>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-lg hover:bg-orange-700 transition-colors"
          >
            <Upload className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-slate-600 text-center">
          Click the icon to upload a new photo
        </p>
      </div>

      {/* Cropper Modal */}
      {showCropper && selectedImage && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col">
          {/* Header */}
          <div className="bg-white px-4 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Adjust Photo</h2>
            <button
              onClick={handleCancel}
              className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center"
            >
              <X className="h-5 w-5 text-slate-700" />
            </button>
          </div>

          {/* Image Preview Area with Circle Crop Overlay */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
            {/* Darkened overlay with circle cutout */}
            <div className="absolute inset-0 pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <mask id="circle-mask">
                    <rect width="100" height="100" fill="white" />
                    <circle cx="50" cy="50" r="30" fill="black" />
                  </mask>
                </defs>
                <rect width="100" height="100" fill="black" opacity="0.6" mask="url(#circle-mask)" />
                <circle cx="50" cy="50" r="30" fill="none" stroke="white" strokeWidth="0.5" />
              </svg>
            </div>
            
            {/* Image Container */}
            <div className="relative w-full max-w-sm aspect-square flex items-center justify-center">
              <img
                ref={imageRef}
                src={selectedImage}
                alt="Crop preview"
                className="max-w-full max-h-full object-contain"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.1s ease-out'
                }}
                onLoad={handleCrop}
              />
            </div>
          </div>

          {/* Hidden canvas for cropping */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Controls */}
          <div className="bg-white px-4 py-6 space-y-4">
            {/* Zoom Control */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Zoom</label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={zoom}
                onChange={(e) => {
                  setZoom(parseFloat(e.target.value));
                  setTimeout(handleCrop, 50);
                }}
                className="w-full"
              />
            </div>

            {/* Rotation Control */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Rotate</label>
              <div className="flex gap-2">
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="15"
                  value={rotation}
                  onChange={(e) => {
                    setRotation(parseInt(e.target.value));
                    setTimeout(handleCrop, 50);
                  }}
                  className="flex-1"
                />
                <button
                  onClick={() => {
                    setRotation((prev) => (prev + 90) % 360);
                    setTimeout(handleCrop, 50);
                  }}
                  className="px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={handleSave}
                className="flex-1"
                disabled={isUploading}
              >
                {isUploading ? (
                  <>Uploading...</>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save Photo
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};


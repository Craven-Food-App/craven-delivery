/**
 * Leave At Door Photo Component
 * Allows drivers to take proof of delivery photos for contactless deliveries
 * Competes with DoorDash contactless delivery photo feature
 */

import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Camera, Upload, X, CheckCircle, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface LeaveAtDoorPhotoProps {
  orderId: string;
  onPhotoUploaded: (photoUrl: string) => void;
}

export function LeaveAtDoorPhoto({ orderId, onPhotoUploaded }: LeaveAtDoorPhotoProps) {
  const { toast } = useToast();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [usingCamera, setUsingCamera] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please select an image file',
        variant: 'destructive'
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setUsingCamera(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: 'Camera Error',
        description: 'Could not access camera. Please upload a photo instead.',
        variant: 'destructive'
      });
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setPhotoPreview(dataUrl);
      
      // Stop camera
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      setUsingCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setUsingCamera(false);
    }
  };

  const getCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        console.error('Error getting location:', error);
      }
    );
  };

  const handleUpload = async () => {
    if (!photoPreview) {
      toast({
        title: 'No Photo',
        description: 'Please take or select a photo first',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);

    try {
      // Get current location
      if (!location) {
        await new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude
              });
              resolve();
            },
            (error) => {
              console.error('Location error:', error);
              resolve(); // Continue without location
            }
          );
        });
      }

      // Convert data URL to blob
      const response = await fetch(photoPreview);
      const blob = await response.blob();

      // Create unique filename
      const fileName = `${orderId}/${Date.now()}.jpg`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('delivery-photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('delivery-photos')
        .getPublicUrl(data.path);

      const publicUrl = urlData.publicUrl;

      // Update order with photo URL
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          delivery_photo_url: publicUrl,
          delivery_photo_timestamp: new Date().toISOString(),
          delivery_instructions: notes || null,
          order_status: 'delivered'
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      setUploaded(true);
      onPhotoUploaded(publicUrl);

      toast({
        title: 'Photo Uploaded',
        description: 'Delivery proof uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload delivery photo',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  if (uploaded) {
    return (
      <Card className="p-6 bg-green-50 border-green-200">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
          <h3 className="text-xl font-bold mb-2">Delivery Complete!</h3>
          <p className="text-gray-600 mb-4">Photo proof uploaded successfully</p>
          {photoPreview && (
            <img 
              src={photoPreview} 
              alt="Delivery proof"
              className="max-w-full h-64 object-cover rounded-lg mx-auto"
            />
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold mb-2">Leave At Door - Take Photo</h3>
          <p className="text-gray-600">Take a photo to confirm delivery location</p>
        </div>

        {/* Camera View */}
        {usingCamera && (
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-96 object-cover rounded-lg bg-black"
            />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
              <Button
                size="lg"
                onClick={capturePhoto}
                className="bg-white text-black hover:bg-gray-200"
              >
                <Camera className="w-6 h-6" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={stopCamera}
                className="bg-white"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
          </div>
        )}

        {/* Photo Preview */}
        {photoPreview && !usingCamera && (
          <div className="relative">
            <img 
              src={photoPreview} 
              alt="Delivery preview"
              className="w-full h-96 object-cover rounded-lg"
            />
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setPhotoPreview(null)}
              className="absolute top-2 right-2"
            >
              <X className="w-4 h-4 mr-1" />
              Remove
            </Button>
          </div>
        )}

        {/* Camera/Upload Buttons */}
        {!photoPreview && !usingCamera && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={startCamera}
              variant="outline"
              className="h-32 flex-col gap-2"
            >
              <Camera className="w-8 h-8" />
              <span>Take Photo</span>
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="h-32 flex-col gap-2"
            >
              <Upload className="w-8 h-8" />
              <span>Upload Photo</span>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* Delivery Notes */}
        {photoPreview && (
          <div>
            <Label htmlFor="notes">Delivery Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Left at front door, Handed to customer, etc."
              rows={3}
              className="mt-2"
            />
          </div>
        )}

        {/* Location */}
        {location && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>Location: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}</span>
          </div>
        )}

        {/* Upload Button */}
        {photoPreview && (
          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500"
            size="lg"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Complete Delivery
              </>
            )}
          </Button>
        )}

        {/* Guidelines */}
        <Card className="p-3 bg-blue-50 border-blue-200">
          <h4 className="font-semibold text-sm mb-2">Photo Guidelines:</h4>
          <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
            <li>Show the delivery location clearly</li>
            <li>Include the order package in frame</li>
            <li>Ensure the photo is well-lit and in focus</li>
            <li>Don't include people's faces for privacy</li>
          </ul>
        </Card>
      </div>
    </Card>
  );
}


import React, { useState, useRef } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { RotateCw, Crop as CropIcon, Download } from "lucide-react";
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropperProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedImageBlob: Blob) => void;
  aspectRatio?: number;
  cropShape?: 'rect' | 'round';
}

const ImageCropper: React.FC<ImageCropperProps> = ({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete,
  aspectRatio,
  cropShape = 'rect'
}) => {
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    x: 10,
    y: 10,
    width: 80,
    height: 80,
  });
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const baseWidthPct = 80;
    let widthPct = baseWidthPct;
    let heightPct = baseWidthPct;

    if (aspectRatio && aspectRatio > 0) {
      const imageAspect = width / height; // W/H
      heightPct = baseWidthPct * (imageAspect / aspectRatio);
    }

    // Clamp to sensible bounds
    widthPct = Math.max(10, Math.min(100, widthPct));
    heightPct = Math.max(10, Math.min(100, heightPct));

    const newCrop: Crop = {
      unit: '%',
      x: (100 - widthPct) / 2,
      y: (100 - heightPct) / 2,
      width: widthPct,
      height: heightPct,
    };
    setCrop(newCrop);
  };

  const getCroppedImg = async (
    image: HTMLImageElement,
    crop: PixelCrop,
    scale: number = 1,
    rotate: number = 0
  ): Promise<Blob> => {
    const canvas = canvasRef.current;
    if (!canvas || !crop.width || !crop.height) {
      throw new Error('Canvas or crop dimensions not available');
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No 2d context');
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const pixelRatio = window.devicePixelRatio;
    canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
    canvas.height = Math.floor(crop.height * scaleY * pixelRatio);

    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingQuality = 'high';

    const cropX = crop.x * scaleX;
    const cropY = crop.y * scaleY;
    const centerX = image.naturalWidth / 2;
    const centerY = image.naturalHeight / 2;

    ctx.save();

    ctx.translate(-cropX, -cropY);
    ctx.translate(centerX, centerY);
    ctx.rotate((rotate * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);
    ctx.drawImage(
      image,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight
    );

    ctx.restore();

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/jpeg',
        0.9
      );
    });
  };

  const handleCropComplete = async () => {
    if (!imgRef.current || !crop.width || !crop.height) return;

    try {
      const pixelCrop: PixelCrop = {
        x: (crop.x / 100) * imgRef.current.width,
        y: (crop.y / 100) * imgRef.current.height,
        width: (crop.width / 100) * imgRef.current.width,
        height: (crop.height / 100) * imgRef.current.height,
        unit: 'px'
      };

      const croppedImageBlob = await getCroppedImg(
        imgRef.current,
        pixelCrop,
        scale,
        rotation
      );
      
      onCropComplete(croppedImageBlob);
      onClose();
    } catch (error) {
      console.error('Error cropping image:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CropIcon className="h-5 w-5" />
            Crop & Adjust Image
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Scale: {scale.toFixed(2)}</Label>
              <Slider
                value={[scale]}
                onValueChange={(value) => setScale(value[0])}
                min={0.5}
                max={3}
                step={0.1}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Rotation: {rotation}°</Label>
              <Slider
                value={[rotation]}
                onValueChange={(value) => setRotation(value[0])}
                min={-180}
                max={180}
                step={1}
                className="w-full"
              />
            </div>
          </div>

          {/* Image with crop overlay */}
          <div className="flex justify-center">
            <div className="max-w-full max-h-[60vh] overflow-auto">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                aspect={aspectRatio}
                circularCrop={cropShape === 'round'}
                className="max-w-full"
              >
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Crop me"
                  style={{
                    transform: `scale(${scale}) rotate(${rotation}deg)`,
                    maxWidth: '100%',
                    maxHeight: '400px'
                  }}
                  onLoad={onImageLoad}
                />
              </ReactCrop>
            </div>
          </div>

          {/* Hidden canvas for processing */}
          <canvas
            ref={canvasRef}
            style={{ display: 'none' }}
          />
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCropComplete}>
            <Download className="mr-2 h-4 w-4" />
            Apply Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropper;
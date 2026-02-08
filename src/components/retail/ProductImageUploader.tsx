import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Upload,
  X,
  Star,
  GripVertical,
  Loader2,
  ImagePlus,
} from "lucide-react";
import { toast } from "sonner";

export interface ProductImage {
  id?: string;
  image_url: string;
  alt_text?: string;
  display_order: number;
  is_primary: boolean;
  file?: File; // For unsaved uploads
}

interface ProductImageUploaderProps {
  restaurantId: string;
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  maxImages?: number;
}

const ProductImageUploader = ({
  restaurantId,
  images,
  onChange,
  maxImages = 10,
}: ProductImageUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${restaurantId}/product-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("menu-images")
      .upload(fileName, file, { contentType: file.type });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("menu-images").getPublicUrl(fileName);

    return publicUrl;
  };

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const remaining = maxImages - images.length;

      if (remaining <= 0) {
        toast.error(`Maximum ${maxImages} images allowed`);
        return;
      }

      const filesToUpload = fileArray.slice(0, remaining);
      setUploading(true);

      try {
        const newImages: ProductImage[] = [];

        for (const file of filesToUpload) {
          if (!file.type.startsWith("image/")) {
            toast.error(`${file.name} is not an image`);
            continue;
          }
          if (file.size > 10 * 1024 * 1024) {
            toast.error(`${file.name} is too large (max 10MB)`);
            continue;
          }

          const url = await uploadFile(file);
          if (url) {
            newImages.push({
              image_url: url,
              alt_text: file.name.split(".")[0],
              display_order: images.length + newImages.length,
              is_primary: images.length === 0 && newImages.length === 0,
            });
          }
        }

        if (newImages.length > 0) {
          onChange([...images, ...newImages]);
          toast.success(
            `${newImages.length} image${newImages.length > 1 ? "s" : ""} uploaded`
          );
        }
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Failed to upload images");
      } finally {
        setUploading(false);
      }
    },
    [images, maxImages, onChange, restaurantId]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleRemove = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    // If we removed the primary, make the first one primary
    if (images[index].is_primary && updated.length > 0) {
      updated[0].is_primary = true;
    }
    // Fix display orders
    updated.forEach((img, i) => (img.display_order = i));
    onChange(updated);
  };

  const handleSetPrimary = (index: number) => {
    const updated = images.map((img, i) => ({
      ...img,
      is_primary: i === index,
    }));
    onChange(updated);
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    const updated = [...images];
    const [dragged] = updated.splice(dragIndex, 1);
    updated.splice(index, 0, dragged);
    updated.forEach((img, i) => (img.display_order = i));
    setDragIndex(index);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <ImagePlus className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              Drag & drop images or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG, WebP up to 10MB • {images.length}/{maxImages} images
            </p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Image gallery */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img, index) => (
            <div
              key={img.image_url + index}
              className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                img.is_primary
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border"
              }`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={() => setDragIndex(null)}
            >
              <div className="aspect-square">
                <img
                  src={img.image_url}
                  alt={img.alt_text || "Product image"}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Overlay controls */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-start justify-between p-1.5 opacity-0 group-hover:opacity-100">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetPrimary(index);
                  }}
                  title="Set as primary"
                >
                  <Star
                    className={`w-3.5 h-3.5 ${
                      img.is_primary ? "fill-yellow-400 text-yellow-400" : ""
                    }`}
                  />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(index);
                  }}
                  title="Remove"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Primary badge */}
              {img.is_primary && (
                <div className="absolute bottom-0 left-0 right-0 bg-primary text-primary-foreground text-xs text-center py-0.5 font-medium">
                  Primary
                </div>
              )}

              {/* Drag handle */}
              <div className="absolute top-1/2 left-1 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab">
                <GripVertical className="w-4 h-4 text-white drop-shadow" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImageUploader;


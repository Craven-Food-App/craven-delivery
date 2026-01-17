import React, { useRef, useState, useCallback } from "react";
import { Camera, X, RotateCcw } from "lucide-react";

interface DeliveryCameraProps {
  onPhotoCapture: (photo: Blob) => void;
  onCancel: () => void;
  isUploading?: boolean;
}

export const DeliveryCamera: React.FC<DeliveryCameraProps> = ({
  onPhotoCapture,
  onCancel,
  isUploading = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
    } catch (err) {
      console.error("Camera error:", err);
      alert("Unable to access camera.");
    }
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setPhoto(url);
        onPhotoCapture(blob);
      }
    }, "image/jpeg", 0.9);

    // Stop the camera stream after capture
    const stream = video.srcObject as MediaStream;
    stream.getTracks().forEach((t) => t.stop());
  }, [onPhotoCapture]);

  const retakePhoto = useCallback(() => {
    setPhoto(null);
    startCamera();
  }, [startCamera]);

  React.useEffect(() => {
    startCamera();
  }, [startCamera]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-orange-600">
      {!photo ? (
        <>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
          {/* Package Frame Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-4 border-white/70 w-3/4 h-1/2 rounded-lg" />
          </div>
          {/* Controls */}
          <div className="absolute bottom-10 w-full flex justify-center items-center gap-10">
            <button
              onClick={onCancel}
              className="bg-white p-4 rounded-full shadow-lg"
            >
              <X className="h-6 w-6 text-black" />
            </button>

            <button
              onClick={capturePhoto}
              className="bg-white p-6 rounded-full border-4 border-orange-500 shadow-lg"
            >
              <Camera className="h-6 w-6 text-orange-500" />
            </button>

            <div className="w-12 h-12" />
          </div>
        </>
      ) : (
        <>
          <img
            src={photo}
            alt="Captured"
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-10 w-full flex justify-center items-center gap-10">
            <button
              onClick={retakePhoto}
              className="bg-white p-4 rounded-full shadow-lg"
            >
              <RotateCcw className="h-6 w-6 text-orange-500" />
            </button>

            <button
              onClick={onCancel}
              className="bg-white p-4 rounded-full shadow-lg"
            >
              <X className="h-6 w-6 text-black" />
            </button>
          </div>
        </>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

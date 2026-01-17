import React from 'react';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CameraTapToStartProps {
  onStartCamera: () => void;
  isLoading: boolean;
}

export const CameraTapToStart: React.FC<CameraTapToStartProps> = ({ 
  onStartCamera, 
  isLoading 
}) => {
  return (
    <div className="w-full h-full flex items-center justify-center flex-col text-white bg-black/80">
      <Camera className="h-16 w-16 mb-6 opacity-80" />
      <h3 className="text-xl font-semibold mb-4">Camera Access Required</h3>
      <p className="text-center px-4 mb-6 opacity-90">
        Take a photo to confirm your delivery
      </p>
      <Button
        onClick={onStartCamera}
        disabled={isLoading}
        className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-xl font-medium"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Starting Camera...
          </>
        ) : (
          <>
            <Camera className="h-5 w-5 mr-2" />
            Start Camera
          </>
        )}
      </Button>
      <p className="text-xs opacity-70 mt-4 text-center px-4">
        This helps ensure safe deliveries for all users
      </p>
    </div>
  );
};
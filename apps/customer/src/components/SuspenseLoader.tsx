import React from 'react';

interface SuspenseLoaderProps {
  message?: string;
}

const SuspenseLoader: React.FC<SuspenseLoaderProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      <div className="flex flex-col items-center space-y-4">
        {/* Spinner */}
        <div className="relative">
          <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
        </div>
        
        {/* Loading text */}
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">{message}</h2>
          <p className="text-sm text-gray-600">Please wait a moment</p>
        </div>
      </div>
    </div>
  );
};

export default SuspenseLoader;


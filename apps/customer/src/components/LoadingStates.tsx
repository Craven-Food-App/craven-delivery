import React from 'react';
import { Loader2, MapPin, Car, Package, Clock } from 'lucide-react';

interface LoadingStateProps {
  type?: 'default' | 'map' | 'delivery' | 'order' | 'location';
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  type = 'default',
  message,
  size = 'md'
}) => {
  const getIcon = () => {
    switch (type) {
      case 'map':
        return <MapPin className="h-6 w-6 text-orange-500" />;
      case 'delivery':
        return <Car className="h-6 w-6 text-orange-500" />;
      case 'order':
        return <Package className="h-6 w-6 text-orange-500" />;
      case 'location':
        return <MapPin className="h-6 w-6 text-orange-500" />;
      default:
        return <Loader2 className="h-6 w-6 text-orange-500 animate-spin" />;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-4 w-4';
      case 'lg':
        return 'h-8 w-8';
      default:
        return 'h-6 w-6';
    }
  };

  const getMessage = () => {
    if (message) return message;
    
    switch (type) {
      case 'map':
        return 'Loading map...';
      case 'delivery':
        return 'Processing delivery...';
      case 'order':
        return 'Loading order details...';
      case 'location':
        return 'Getting your location...';
      default:
        return 'Loading...';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className={`${getSizeClasses()} mb-2`}>
        {getIcon()}
      </div>
      <p className="text-sm text-gray-600 text-center">
        {getMessage()}
      </p>
    </div>
  );
};

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  lines = 1 
}) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-4 bg-gray-200 rounded mb-2"
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  );
};

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message,
  children
}) => {
  if (!isLoading) return <>{children}</>;

  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <Loader2 className="h-8 w-8 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{message || 'Loading...'}</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingState;

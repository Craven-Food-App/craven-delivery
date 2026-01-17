import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface OfflineIndicatorProps {
  showWhenOnline?: boolean;
  position?: 'top' | 'bottom';
  className?: string;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  showWhenOnline = false,
  position = 'top',
  className = ''
}) => {
  const { isOnline, isSlowConnection, connectionType } = useNetworkStatus();
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowIndicator(true);
    } else if (isSlowConnection) {
      setShowIndicator(true);
      // Hide slow connection warning after 3 seconds
      const timer = setTimeout(() => setShowIndicator(false), 3000);
      return () => clearTimeout(timer);
    } else if (showWhenOnline) {
      setShowIndicator(true);
      // Hide online indicator after 2 seconds
      const timer = setTimeout(() => setShowIndicator(false), 2000);
      return () => clearTimeout(timer);
    } else {
      setShowIndicator(false);
    }
  }, [isOnline, isSlowConnection, showWhenOnline]);

  if (!showIndicator) return null;

  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        message: 'You\'re offline',
        description: 'Some features may be limited',
        bgColor: 'bg-red-500',
        textColor: 'text-white'
      };
    }
    
    if (isSlowConnection) {
      return {
        icon: AlertTriangle,
        message: 'Slow connection',
        description: `Connection type: ${connectionType}`,
        bgColor: 'bg-yellow-500',
        textColor: 'text-white'
      };
    }
    
    return {
      icon: Wifi,
      message: 'Back online',
      description: 'All features available',
      bgColor: 'bg-green-500',
      textColor: 'text-white'
    };
  };

  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;

  const positionClasses = position === 'top' 
    ? 'top-0 left-0 right-0' 
    : 'bottom-0 left-0 right-0';

  return (
    <div className={`fixed ${positionClasses} z-50 ${className}`}>
      <div className={`${statusInfo.bgColor} ${statusInfo.textColor} px-4 py-2 shadow-lg`}>
        <div className="flex items-center justify-center space-x-2">
          <Icon className="h-4 w-4" />
          <span className="font-medium">{statusInfo.message}</span>
          <span className="text-sm opacity-90">{statusInfo.description}</span>
        </div>
      </div>
    </div>
  );
};

export default OfflineIndicator;

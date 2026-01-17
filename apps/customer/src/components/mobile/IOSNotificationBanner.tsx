import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface IOSNotificationBannerProps {
  title: string;
  message: string;
  duration?: number;
  onDismiss: () => void;
}

export const IOSNotificationBanner: React.FC<IOSNotificationBannerProps> = ({
  title,
  message,
  duration = 5000,
  onDismiss
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Show animation
    const showTimer = setTimeout(() => setIsVisible(true), 100);

    // Auto dismiss after duration
    const dismissTimer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(dismissTimer);
    };
  }, [duration]);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onDismiss();
    }, 300);
  };

  return (
    <div className={`
      fixed top-0 left-0 right-0 z-[9999] transition-all duration-300 ease-out
      ${isVisible && !isLeaving ? 'translate-y-0' : '-translate-y-full'}
    `}>
      {/* Safe area background */}
      <div className="bg-background/95 backdrop-blur-md">
        {/* Status bar height padding */}
        <div className="h-12"></div>
        
        {/* Banner content */}
        <div 
          className="mx-4 mb-2 bg-card/95 backdrop-blur-sm rounded-2xl shadow-lg border border-border/20 overflow-hidden"
          onClick={handleDismiss}
        >
          <div className="flex items-start p-4 gap-3">
            {/* App icon */}
            <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <img 
                src="/craven-logo.png" 
                alt="Crave'N" 
                className="w-6 h-6 rounded-md"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {title}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    now
                  </p>
                </div>
                
                {/* Dismiss button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss();
                  }}
                  className="ml-2 p-1 rounded-full hover:bg-muted/50 transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
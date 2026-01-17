import React from 'react';

interface FlamingTextProps {
  children: string;
  className?: string;
}

export const FlamingText: React.FC<FlamingTextProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`relative inline-block ${className}`}>
      <svg 
        className="absolute inset-0 w-full h-full pointer-events-none" 
        style={{ zIndex: -1 }}
      >
        <defs>
          <filter id="fire">
            <feTurbulence 
              baseFrequency="0.1 0.1" 
              numOctaves="2" 
              seed="3"
            >
              <animate
                attributeName="baseFrequency"
                dur="3s"
                values="0.1 0.1;0.12 0.13"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" scale="15" />
            <feGaussianBlur stdDeviation="2" />
          </filter>
          
          <linearGradient id="fireGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="30%" stopColor="#ffeb3b" />
            <stop offset="60%" stopColor="#ff9800" />
            <stop offset="100%" stopColor="#ff5722" />
          </linearGradient>
        </defs>
      </svg>
      
      <div
        className="font-bold"
        style={{
          color: 'transparent',
          background: 'linear-gradient(to bottom, #fff 0%, #ffeb3b 30%, #ff9800 60%, #ff5722 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          filter: 'url(#fire)',
          textShadow: '0 0 20px rgba(255, 87, 34, 0.8), 0 0 30px rgba(255, 152, 0, 0.6)',
        }}
      >
        {children}
      </div>
    </div>
  );
};



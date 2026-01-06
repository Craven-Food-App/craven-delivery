import React from 'react';
import { FlamingText } from '@/components/ui/FlamingText';

interface CravingWheelProps {
  currentPoints: number;
  maxPoints: number;
  isOnFire: boolean;
  className?: string;
}

const getCravingState = (progress: number) => {
  if (progress >= 100) return { text: "ON FIRE", flaming: true };
  if (progress >= 80) return { text: "FEEDING", flaming: false };
  if (progress >= 60) return { text: "HUNGRY", flaming: false };
  if (progress >= 40) return { text: "CRAVING", flaming: false };
  if (progress >= 20) return { text: "PECKISH", flaming: false };
  return { text: "IDLE", flaming: false };
};

export const CravingWheel: React.FC<CravingWheelProps> = ({ 
  currentPoints,
  maxPoints,
  isOnFire,
  className = '' 
}) => {
  const progress = Math.min((currentPoints / maxPoints) * 100, 100);
  const state = getCravingState(progress);
  
  const size = 140;
  const strokeWidth = 12;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = -circumference * (progress / 100);

  const getWheelColor = (prog: number) => {
    if (prog >= 80) return "#ff5722";
    if (prog >= 60) return "#ff9800";
    if (prog >= 40) return "#ffc107";
    return "#ffeb3b";
  };

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="absolute inset-0"
        style={{ transform: 'rotate(90deg)' }}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
        />
        
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={getWheelColor(progress)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.5s ease, stroke 0.5s ease',
            filter: `drop-shadow(0 0 10px ${getWheelColor(progress)}80)`,
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {state.flaming ? (
          <>
            <FlamingText className="text-sm leading-tight">
              ON
            </FlamingText>
            <FlamingText className="text-sm leading-tight">
              FIRE
            </FlamingText>
            <div className="text-[10px] font-semibold text-orange-500 mt-1">
              100%
            </div>
          </>
        ) : (
          <>
            <div className="text-xs font-bold text-white tracking-wider">
              {state.text}
            </div>
            <div className="text-[10px] font-semibold text-orange-500 mt-1">
              {Math.floor(progress)}%
            </div>
          </>
        )}
      </div>
    </div>
  );
};



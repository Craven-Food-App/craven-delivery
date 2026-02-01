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
  // Calculate offset: at 0% show nothing (full offset), at 100% show full ring (0 offset)
  // strokeDashoffset = circumference means hide everything, 0 means show everything
  const strokeDashoffset = circumference * (1 - progress / 100);

  const getWheelColor = (prog: number, onFire: boolean) => {
    if (prog === 0) return "#9e9e9e"; // Grey when at 0%
    if (onFire && prog >= 100) return "#ffeb3b"; // Yellow when on fire at 100%
    if (prog >= 80) return "#ff5722";
    if (prog >= 60) return "#ff9800";
    if (prog >= 40) return "#ffc107";
    if (prog >= 20) return "#ffc107";
    // Gradually transition from grey to yellow as progress increases from 0-20%
    const greyToYellow = prog / 20; // 0 to 1 as progress goes from 0 to 20%
    const greyR = 158;
    const greyG = 158;
    const greyB = 158;
    const yellowR = 255;
    const yellowG = 235;
    const yellowB = 59;
    const r = Math.round(greyR + (yellowR - greyR) * greyToYellow);
    const g = Math.round(greyG + (yellowG - greyG) * greyToYellow);
    const b = Math.round(greyB + (yellowB - greyB) * greyToYellow);
    return `rgb(${r}, ${g}, ${b})`;
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
          stroke={progress === 0 ? "#e0e0e0" : "rgba(255, 255, 255, 0.1)"}
          strokeWidth={strokeWidth}
        />
        
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={getWheelColor(progress, isOnFire)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.5s ease, stroke 0.5s ease',
            filter: progress === 0 ? 'none' : `drop-shadow(0 0 10px ${getWheelColor(progress, isOnFire)}80)`,
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
            <div className="text-base font-black tracking-wider" style={{ color: '#FF6A00' }}>
              {state.text}
            </div>
            <div className="text-sm font-bold mt-1" style={{ color: '#FF6A00' }}>
              {Math.floor(progress)}%
            </div>
          </>
        )}
      </div>
    </div>
  );
};



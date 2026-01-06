import React, { useEffect, useState } from 'react';
import { FlamingText } from '@/components/ui/FlamingText';

interface NextShiftCountdownProps {
  nextShiftTime: Date;
  scheduledAt: Date;
  className?: string;
}

export const NextShiftCountdown: React.FC<NextShiftCountdownProps> = ({ 
  nextShiftTime,
  scheduledAt,
  className = '' 
}) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [hoursRemaining, setHoursRemaining] = useState(0);
  const [minutesRemaining, setMinutesRemaining] = useState(0);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const shiftTime = new Date(nextShiftTime).getTime();
      const difference = shiftTime - now;

      if (difference <= 0) {
        setTimeRemaining(0);
        setHoursRemaining(0);
        setMinutesRemaining(0);
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeRemaining(difference);
      setHoursRemaining(hours);
      setMinutesRemaining(minutes);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [nextShiftTime, scheduledAt]);

  const scheduledTime = new Date(scheduledAt).getTime();
  const shiftTime = new Date(nextShiftTime).getTime();
  const totalDuration = shiftTime - scheduledTime;
  const totalHoursForShift = totalDuration / (1000 * 60 * 60);

  const currentTimeRemaining = hoursRemaining + (minutesRemaining / 60);
  const progress = timeRemaining > 0 
    ? currentTimeRemaining / totalHoursForShift
    : 0;
  
  const size = 120;
  const strokeWidth = 8;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = -circumference * progress;

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
          stroke="#FF6B35"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 1s linear',
            filter: 'drop-shadow(0 0 8px rgba(255, 107, 53, 0.6))',
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {progress === 0 ? (
          <>
            <FlamingText className="text-[10px] leading-tight">
              ON
            </FlamingText>
            <FlamingText className="text-[10px] leading-tight">
              FIRE
            </FlamingText>
          </>
        ) : (
          <>
            <div className="text-[10px] font-bold text-white tracking-wider">
              NEXT
            </div>
            <div className="text-[10px] font-bold text-white tracking-wider">
              SHIFT
            </div>
            <div className="text-xs font-semibold text-orange-500 mt-1">
              {hoursRemaining}h {minutesRemaining}m
            </div>
          </>
        )}
      </div>
    </div>
  );
};


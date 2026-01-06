import React, { useEffect, useState } from 'react';

interface NextShiftCountdownProps {
  nextShiftTime: Date; // When the shift starts
  scheduledAt: Date; // When the shift was scheduled/countdown started
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

  // Calculate total duration from when countdown started to shift time
  const scheduledTime = new Date(scheduledAt).getTime();
  const shiftTime = new Date(nextShiftTime).getTime();
  const totalDurationMs = shiftTime - scheduledTime;
  
  // Calculate progress: 1.0 = full ring (shift far away), 0.0 = empty ring (shift arrived)
  // Progress = timeRemaining / totalDuration
  const now = new Date().getTime();
  const progress = totalDurationMs > 0 && timeRemaining > 0
    ? timeRemaining / totalDurationMs
    : 0;
  
  // Clamp progress between 0 and 1
  const clampedProgress = Math.max(0, Math.min(1, progress));
  
  // SVG circle parameters
  const size = 120;
  const strokeWidth = 8;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate stroke offset for counter-clockwise countdown
  // When progress is 1.0 (full time remaining), ring is full (offset = 0)
  // When progress is 0.0 (shift arrived), ring is empty (offset = -circumference)
  const strokeDashoffset = -circumference * (1 - clampedProgress);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* SVG Circle */}
      <svg
        width={size}
        height={size}
        className="absolute inset-0"
        style={{ transform: 'rotate(90deg)' }}
      >
        {/* Background circle (optional, for visual reference) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
        />
        
        {/* Progress circle (opaque portion that disappears counter-clockwise) */}
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

      {/* Center content - STATIC TEXT */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[10px] font-bold text-white tracking-wider">
          NEXT
        </div>
        <div className="text-[10px] font-bold text-white tracking-wider">
          SHIFT
        </div>
        {/* Only show time if there's a valid future shift */}
        {timeRemaining > 0 && (
          <div className="text-xs font-semibold text-orange-500 mt-1">
            {hoursRemaining}h {minutesRemaining}m
          </div>
        )}
      </div>
    </div>
  );
};


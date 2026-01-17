import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SpeedLimitSignProps {
  currentSpeed?: number; // in mph
  location?: {
    latitude: number;
    longitude: number;
  };
  className?: string;
}

export const SpeedLimitSign: React.FC<SpeedLimitSignProps> = ({
  currentSpeed = 0,
  location,
  className = ""
}) => {
  const [speedLimit, setSpeedLimit] = useState<number | null>(null);
  const [isOverLimit, setIsOverLimit] = useState(false);

  // Fetch actual posted speed limit for current location
  useEffect(() => {
    if (!location) return;

    const fetchSpeedLimit = async () => {
      try {
        // Try to get actual speed limit from OpenStreetMap Overpass API
        const overpassQuery = `
          [out:json][timeout:10];
          (
            way(around:50,${location.latitude},${location.longitude})[highway][maxspeed];
            way(around:100,${location.latitude},${location.longitude})[highway][maxspeed];
          );
          out geom;
        `;
        
        const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
        
        let realSpeedLimit = null;
        
        try {
          const overpassResponse = await fetch(overpassUrl);
          const overpassData = await overpassResponse.json();
          
          if (overpassData.elements && overpassData.elements.length > 0) {
            // Find the closest road with speed limit data
            let closestWay = null;
            let minDistance = Infinity;
            
            overpassData.elements.forEach((way: any) => {
              if (way.tags?.maxspeed && way.geometry) {
                // Calculate approximate distance to way
                const wayCenter = way.geometry[Math.floor(way.geometry.length / 2)];
                const distance = Math.sqrt(
                  Math.pow(wayCenter.lat - location.latitude, 2) + 
                  Math.pow(wayCenter.lon - location.longitude, 2)
                );
                
                if (distance < minDistance) {
                  minDistance = distance;
                  closestWay = way;
                }
              }
            });
            
            if (closestWay?.tags?.maxspeed) {
              // Parse speed limit (handle formats like "30 mph", "50", "30 km/h")
              const maxspeedStr = closestWay.tags.maxspeed;
              const speedMatch = maxspeedStr.match(/(\d+)/);
              if (speedMatch) {
                let speed = parseInt(speedMatch[1]);
                // Convert km/h to mph if needed
                if (maxspeedStr.toLowerCase().includes('km') || (!maxspeedStr.includes('mph') && speed > 80)) {
                  speed = Math.round(speed * 0.621371); // km/h to mph
                }
                realSpeedLimit = speed;
              }
            }
          }
        } catch (overpassError) {
          console.warn('OpenStreetMap Overpass API failed:', overpassError);
        }
        
        // If we got real data, use it
        if (realSpeedLimit) {
          setSpeedLimit(realSpeedLimit);
          return;
        }
        
        // Fallback: Use geocoding for road type estimation
        const { data } = await supabase.functions.invoke('get-mapbox-token');
        if (data?.token) {
          const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${location.longitude},${location.latitude}.json?access_token=${data.token}`;
          const response = await fetch(geocodeUrl);
          const geocodeData = await response.json();
          
          const place = geocodeData.features?.[0];
          let estimatedLimit = 25; // Default city limit
          
          // Estimate based on road type from geocoding
          if (place?.place_name?.toLowerCase().includes('highway') || 
              place?.place_name?.toLowerCase().includes('interstate')) {
            estimatedLimit = 65;
          } else if (place?.place_name?.toLowerCase().includes('boulevard') ||
                     place?.place_name?.toLowerCase().includes('avenue')) {
            estimatedLimit = 35;
          } else if (place?.context?.some((c: any) => c.id?.includes('neighborhood'))) {
            estimatedLimit = 25;
          } else {
            estimatedLimit = 30;
          }
          
          setSpeedLimit(estimatedLimit);
        } else {
          // Final fallback
          setSpeedLimit(25);
        }
        
      } catch (error) {
        console.warn('Could not fetch speed limit:', error);
        setSpeedLimit(25);
      }
    };

    fetchSpeedLimit();
  }, [location]);

  // Check if over speed limit
  useEffect(() => {
    if (speedLimit && currentSpeed > speedLimit + 5) { // 5 mph buffer
      setIsOverLimit(true);
    } else {
      setIsOverLimit(false);
    }
  }, [currentSpeed, speedLimit]);

  if (!speedLimit) {
    return null; // Don't show until we have speed limit data
  }

  return (
    <div className={`${className}`}>
      {/* Speed Limit Sign - Smaller for mobile */}
      <div className={`relative bg-white border-2 border-black rounded-md shadow-md transition-all duration-300 ${
        isOverLimit ? 'border-red-500 bg-red-50' : 'border-black bg-white'
      }`} style={{ width: '50px', height: '65px' }}>
        
        {/* Speed Limit Header */}
        <div className="text-center py-0.5 border-b border-black">
          <div className="text-[6px] font-bold text-black leading-none">SPEED</div>
          <div className="text-[6px] font-bold text-black leading-none">LIMIT</div>
        </div>
        
        {/* Speed Limit Number */}
        <div className="flex-1 flex items-center justify-center py-1">
          <div className="text-2xl font-black text-black leading-none">
            {speedLimit}
          </div>
        </div>
        
        {/* Warning indicator if over speed */}
        {isOverLimit && (
          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full animate-pulse">
            <div className="w-full h-full bg-red-600 rounded-full animate-ping"></div>
          </div>
        )}
      </div>

      {/* Current Speed Display - Smaller */}
      <div className={`mt-1 bg-black/80 text-white rounded-md px-2 py-1 text-center transition-all duration-300 ${
        isOverLimit ? 'bg-red-600/90 animate-pulse' : 'bg-black/80'
      }`}>
        <div className="text-[8px] font-medium">YOUR SPEED</div>
        <div className="text-lg font-bold">
          {Math.round(currentSpeed)}
          <span className="text-xs ml-0.5">mph</span>
        </div>
        
        {/* Speed status */}
        <div className="text-[8px] mt-0.5">
          {currentSpeed === 0 ? (
            <span className="text-gray-300">STOPPED</span>
          ) : isOverLimit ? (
            <span className="text-red-200 font-bold">OVER!</span>
          ) : currentSpeed > speedLimit - 5 ? (
            <span className="text-yellow-200">CLOSE</span>
          ) : (
            <span className="text-green-200">SAFE</span>
          )}
        </div>
      </div>
    </div>
  );
};
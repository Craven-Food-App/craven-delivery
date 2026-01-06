import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DailyData {
  day: string;
  earnings: number;
  deliveries: number;
  wheelsFilled: number;
  date: string;
}

interface DailyEarningsGraphProps {
  userId: string;
  className?: string;
}

export const DailyEarningsGraph: React.FC<DailyEarningsGraphProps> = ({ 
  userId,
  className = '' 
}) => {
  const [weekData, setWeekData] = useState<DailyData[]>([]);
  const [maxEarnings, setMaxEarnings] = useState(100);

  useEffect(() => {
    const loadWeekData = async () => {
      const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      const today = new Date();
      const data: DailyData[] = [];

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const { data: performance } = await supabase
          .from('daily_performance')
          .select('*')
          .eq('user_id', userId)
          .eq('date', dateStr)
          .maybeSingle();

        data.push({
          day: days[date.getDay()],
          earnings: performance?.earnings || 0,
          deliveries: performance?.deliveries || 0,
          wheelsFilled: performance?.wheels_filled || 0,
          date: dateStr,
        });
      }

      setWeekData(data);
      setMaxEarnings(Math.max(...data.map(d => d.earnings), 100));
    };

    if (userId) {
      loadWeekData();
    }
  }, [userId]);

  const getBarColor = (wheelsFilled: number) => {
    if (wheelsFilled >= 3) return '#ff5722';
    if (wheelsFilled >= 2) return '#ff9800';
    if (wheelsFilled >= 1) return '#ffc107';
    return '#ffeb3b';
  };

  return (
    <div className={`bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 ${className}`}>
      <h3 className="text-white font-semibold text-sm mb-4">Daily Earnings</h3>
      
      <div className="flex items-end justify-between gap-2 h-32">
        {weekData.map((data, index) => {
          const height = maxEarnings > 0 ? (data.earnings / maxEarnings) * 100 : 0;
          const color = getBarColor(data.wheelsFilled);
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                <div
                  className="w-full rounded-t transition-all duration-300"
                  style={{
                    height: `${height}%`,
                    backgroundColor: color,
                    minHeight: data.earnings > 0 ? '8px' : '0px',
                  }}
                />
              </div>
              <span className="text-white text-xs font-semibold">{data.day}</span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/20">
        <div className="text-center flex-1">
          <div className="text-2xl font-bold text-white">
            ${weekData.reduce((sum, d) => sum + d.earnings, 0).toFixed(2)}
          </div>
          <div className="text-xs text-white/80">Daily Earnings</div>
        </div>
        <div className="text-center flex-1">
          <div className="text-2xl font-bold text-white">
            ${weekData[weekData.length - 1]?.earnings?.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-white/80">Tips</div>
        </div>
      </div>
    </div>
  );
};



import React from 'react';
import { ChevronRight } from 'lucide-react';

// --- Mock Component for Dependencies (Required for Single-File React) ---

/**
 * A mock implementation of a button component, similar to one found in shadcn/ui.
 */
const Button = ({ children, className = '', variant = 'default', size = 'md', ...props }) => {
  const baseStyle = "font-medium transition-all duration-150 rounded-lg active:scale-[0.98] focus:ring-2 focus:ring-offset-2 focus:ring-orange-500";
  let style;

  switch (variant) {
    case 'ghost':
      style = "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700";
      break;
    case 'primary':
    default:
      // Updated primary color to orange
      style = "bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/30";
      break;
  }
  
  let sizeStyle;
  switch (size) {
    case 'sm':
      sizeStyle = 'h-8 px-3 text-sm';
      break;
    case 'md':
    default:
      sizeStyle = 'h-10 px-4 py-2';
      break;
  }

  return (
    <button className={`${baseStyle} ${style} ${sizeStyle} ${className}`} {...props}>
      {children}
    </button>
  );
};


// --- Popular Times Chart Component ---

interface PopularTimesChartProps {
  className?: string;
}

const PopularTimesChart: React.FC<PopularTimesChartProps> = ({ className = '' }) => {
  // Mock data for popular delivery times (0-100 scale)
  const timeData = [
    { time: '6a', value: 25 },
    { time: '9a', value: 45 },
    { time: '12p', value: 85 },
    { time: '3p', value: 60 },
    { time: '6p', value: 95 }, 
    { time: '9p', value: 75 },
  ];

  // Calculate the max value and its index for dynamic highlighting
  const maxValue = Math.max(...timeData.map(d => d.value));
  const maxTime = timeData.find(d => d.value === maxValue)?.time;
  const maxIndex = timeData.findIndex(d => d.value === maxValue);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">Popular Offer Times</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Highest demand for offers is currently at <strong className="text-orange-500 dark:text-orange-400">{maxTime}</strong>.
          </p>
        </div>
        {/* Accessible button for navigation */}
        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-orange-500 dark:text-orange-400" aria-label="View additional days and historical data">
          View Days
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
      
      {/* Chart visualization container - The bars are visually anchored here. 
          The border-b class acts as the X-Axis line that the bars must touch.
      */}
      <div className="flex justify-between h-48 gap-4 border-b border-dashed border-gray-300 dark:border-gray-600">
        {timeData.map((data, index) => {
          // Calculate height relative to the max value, ensuring a minimum visual size
          const barHeightPercentage = (data.value / maxValue) * 100;
          const isMax = index === maxIndex;
          
          return (
            // This wrapper is h-full and relative, serving as the column for absolute children
            <div 
              key={data.time} 
              className="flex-1 min-w-0 group cursor-pointer relative h-full"
            >
              {/* Tooltip on Hover */}
              <span className="absolute bottom-full mb-3 p-1 px-2 text-xs font-bold text-white bg-gray-900 dark:bg-gray-200 dark:text-gray-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-xl left-1/2 -translate-x-1/2">
                {data.value} / 100
              </span>

              {/* Bar element: Now explicitly positioned at the bottom of its relative parent (h-full column) */}
              <div 
                role="progressbar"
                aria-valuenow={data.value}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Popularity at ${data.time}: ${data.value} out of 100`}
                className={`w-full absolute bottom-0 rounded-t-lg transition-all duration-300 transform group-hover:scale-105 ${
                  isMax
                    // Updated primary color for the peak bar
                    ? 'bg-orange-500 shadow-orange-500/50 shadow-xl'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
                style={{ 
                  height: `${barHeightPercentage}%`,
                  minHeight: '8px' // Ensure visibility for small values
                }}
              />
            </div>
          );
        })}
      </div>
      
      {/* Time Labels Row: Perfectly aligned beneath the chart container */}
      <div className="flex justify-between gap-4 mt-2">
        {timeData.map((data, index) => {
          const isMax = index === maxIndex;
          return (
            <div key={data.time} className="flex-1 text-center min-w-0">
              <span className={`text-sm font-semibold transition-colors duration-150 ${isMax ? 'text-orange-500 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {data.time}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend/Indicator */}
      <div className="mt-4 flex justify-end text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center">
          {/* Updated legend color */}
          <span className="w-2 h-2 rounded-full bg-orange-500 mr-1.5"></span>
          Peak Demand Time
        </span>
      </div>
    </div>
  );
};


/**
 * Main application component to render the chart in a centered, styled container.
 */
const App = () => {
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-xl">
                {/* Title for the application context */}
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-8 text-center">
                    Demand Forecasting Dashboard
                </h1>
                
                {/* Render the main chart component */}
                <PopularTimesChart className="w-full" />
            </div>
        </div>
    );
};

export default App;

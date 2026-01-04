import React from 'react';
import { X, MessageSquare, Pause, ChevronRight, Home, Settings, BookOpen, Shield } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface ActiveFeedingMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onPauseOrders: () => void;
  onEndFeeding: () => void;
  onGoHome: () => void;
  currentEarnings?: number;
  isPaused?: boolean;
}

export const ActiveFeedingMenu: React.FC<ActiveFeedingMenuProps> = ({
  isOpen,
  onClose,
  onPauseOrders,
  onEndFeeding,
  onGoHome,
  currentEarnings = 0,
  isPaused = false,
}) => {
  const [readInstructions, setReadInstructions] = React.useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-white safe-area-top">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
        <button onClick={onClose} className="p-2 -ml-2">
          <X className="w-6 h-6 text-gray-900" />
        </button>
        <div className="flex-1" />
        <button className="p-2 -mr-2">
          <MessageSquare className="w-6 h-6 text-gray-900" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-2">
        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Current Feed</h1>

        {/* Pause Orders */}
        <button 
          onClick={onPauseOrders}
          className="w-full flex items-center justify-between py-4 border-b border-gray-100"
        >
          <div className="flex items-center gap-3">
            <Pause className="w-6 h-6 text-gray-700" />
            <span className="text-base text-gray-900">{isPaused ? 'Resume orders' : 'Pause orders'}</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        {/* Earnings Section */}
        <div className="py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Earnings</h2>
          <div className="flex items-center justify-between">
            <span className="text-base text-gray-700">This feed</span>
            <span className="text-base font-semibold text-gray-900">${currentEarnings.toFixed(2)}</span>
          </div>
        </div>

        {/* End Feeding Button */}
        <div className="py-4 border-b border-gray-100">
          <button 
            onClick={onEndFeeding}
            className="w-full py-4 bg-gray-100 rounded-full text-center"
          >
            <span className="text-base font-semibold text-gray-900">End Feed</span>
          </button>
        </div>

        {/* Other Section */}
        <div className="py-4">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Other</h2>
          
          {/* Go to home screen */}
          <button 
            onClick={() => {
              onGoHome();
              onClose();
            }}
            className="w-full flex items-center justify-between py-4 border-b border-gray-100"
          >
            <div className="flex items-center gap-3">
              <Home className="w-5 h-5 text-gray-700" />
              <span className="text-base text-gray-900">Go to home screen</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          {/* Feed Preferences */}
          <button 
            className="w-full flex items-center justify-between py-4 border-b border-gray-100"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-gray-700" />
              <span className="text-base text-gray-900">Feed Preferences</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          {/* Read instructions on arrival */}
          <div className="w-full flex items-center justify-between py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-gray-700" />
              <span className="text-base text-gray-900">Read instructions on arrival</span>
            </div>
            <Switch 
              checked={readInstructions} 
              onCheckedChange={setReadInstructions}
            />
          </div>

          {/* Safe driving features */}
          <button 
            className="w-full flex items-center justify-between py-4 border-b border-gray-100"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-700" />
              <span className="text-base text-gray-900">Safe driving features</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Bottom Black Bar - Android Navigation Bar Height */}
      <div className="absolute bottom-0 left-0 right-0 bg-black" style={{ height: '48px' }} />
    </div>
  );
};

export default ActiveFeedingMenu;


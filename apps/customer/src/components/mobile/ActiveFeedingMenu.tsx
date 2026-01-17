import React, { useEffect } from 'react';
import { X, MessageSquare, Pause, ChevronRight, Home, Settings, Volume2, Shield } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

// Key for localStorage
const READ_INSTRUCTIONS_KEY = 'feeder_read_instructions_out_loud';

// Text-to-speech utility for reading delivery instructions
export const speakDeliveryInstructions = (instructions: string) => {
  // Check if the setting is enabled
  const isEnabled = localStorage.getItem(READ_INSTRUCTIONS_KEY) === 'true';
  if (!isEnabled || !instructions) return;

  // Check if speech synthesis is available
  if ('speechSynthesis' in window) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(instructions);
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // Try to use a natural-sounding voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Natural')) 
      || voices.find(v => v.lang.startsWith('en-US'))
      || voices[0];
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);
  }
};

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
  // Load saved preference from localStorage
  const [readInstructions, setReadInstructions] = React.useState(() => {
    const saved = localStorage.getItem(READ_INSTRUCTIONS_KEY);
    return saved !== null ? saved === 'true' : true; // Default to true
  });

  // Save preference when it changes
  useEffect(() => {
    localStorage.setItem(READ_INSTRUCTIONS_KEY, String(readInstructions));
  }, [readInstructions]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-white" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
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
            <span className={`text-base ${isPaused ? 'text-green-600' : 'text-red-500'}`}>{isPaused ? 'Resume Feeding' : 'Take a Break'}</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        {/* Money Section */}
        <div className="py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Money</h2>
          <div className="flex items-center justify-between">
            <span className="text-base text-gray-700">So Far You've Earned</span>
            <span className="text-base font-semibold text-gray-900">${currentEarnings.toFixed(2)}</span>
          </div>
        </div>

        {/* End Feeding Button */}
        <div className="py-4 border-b border-gray-100">
          <button 
            onClick={onEndFeeding}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full text-center shadow-lg"
          >
            <span className="text-base font-semibold text-white">End Feed</span>
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
              <Volume2 className="w-5 h-5 text-gray-700" />
              <span className="text-base text-gray-900">Read instructions out loud</span>
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


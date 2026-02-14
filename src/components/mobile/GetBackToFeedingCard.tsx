import React from 'react';
import { Button } from '@/components/ui/button';
import { useFeederDarkMode } from '@/contexts/FeederDarkModeContext';

interface GetBackToFeedingCardProps {
  onContinueFeeding: () => void;
}

export const GetBackToFeedingCard: React.FC<GetBackToFeedingCardProps> = ({
  onContinueFeeding,
}) => {
  const { colors: C } = useFeederDarkMode();
  
  return (
    <div className="rounded-2xl p-6 shadow-lg" style={{ background: C.card, borderColor: C.border, borderWidth: 1, borderStyle: 'solid' }}>
      {/* Header */}
      <h2 className="text-2xl font-bold text-orange-500 mb-1">
        GET BACK TO IT
      </h2>
      
      {/* Subheader */}
      <p className="text-base mb-6" style={{ color: C.muted }}>
        They're Waiting
      </p>
      
      {/* Continue Feeding Button */}
      <Button 
        onClick={onContinueFeeding}
        className="w-full h-14 text-lg font-bold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg rounded-2xl"
      >
        Continue Feeding
      </Button>
    </div>
  );
};

export default GetBackToFeedingCard;

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, DollarSign, MapPin } from 'lucide-react';

type EarningMode = 'perHour' | 'perOffer';

interface EarningModeToggleProps {
  mode: EarningMode;
  onModeChange: (mode: EarningMode) => void;
}

export const EarningModeToggle: React.FC<EarningModeToggleProps> = ({
  mode,
  onModeChange
}) => {
  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-green-500" />
          <h3 className="text-lg font-semibold">Choose Your Earning Mode</h3>
        </div>
        
        <div className="space-y-3">
          <Button
            variant={mode === 'perHour' ? 'default' : 'outline'}
            size="lg"
            className="w-full h-auto p-4 justify-start"
            onClick={() => onModeChange('perHour')}
          >
            <div className="flex items-center justify-between w-full">
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">Per Hour</span>
                  <Badge variant="secondary" className="text-xs">Guaranteed</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  $18/hour + 100% of tips
                </p>
              </div>
            </div>
          </Button>
          
          <Button
            variant={mode === 'perOffer' ? 'default' : 'outline'}
            size="lg"
            className="w-full h-auto p-4 justify-start"
            onClick={() => onModeChange('perOffer')}
          >
            <div className="flex items-center justify-between w-full">
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="font-medium">Per Offer</span>
                  <Badge variant="secondary" className="text-xs">Higher earnings</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  See offers by pay + distance
                </p>
              </div>
            </div>
          </Button>
        </div>
        
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground text-center">
            {mode === 'perHour' 
              ? "You'll earn a consistent hourly rate plus all customer tips"
              : "View each offer's payout before accepting - potential for higher earnings"
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
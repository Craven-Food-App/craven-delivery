import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ChevronRight,
  ChevronLeft,
  Zap,
  Trophy,
  CheckCircle,
  XCircle,
  SkipForward,
  Keyboard
} from 'lucide-react';
import { toast } from 'sonner';
import type { RestaurantOnboardingData } from '../types';

interface QueueModeProps {
  restaurants: RestaurantOnboardingData[];
  currentRestaurant: RestaurantOnboardingData | null;
  onSelectRestaurant: (restaurant: RestaurantOnboardingData) => void;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  sessionStats: {
    reviewed: number;
    approved: number;
    rejected: number;
    skipped: number;
  };
}

export function QueueMode({
  restaurants,
  currentRestaurant,
  onSelectRestaurant,
  onNext,
  onPrevious,
  onSkip,
  sessionStats
}: QueueModeProps) {
  const [showKeyboardHints, setShowKeyboardHints] = useState(false);

  const currentIndex = currentRestaurant 
    ? restaurants.findIndex(r => r.id === currentRestaurant.id)
    : -1;
  
  const totalInQueue = restaurants.length;
  const progressPercentage = totalInQueue > 0 
    ? ((sessionStats.reviewed / totalInQueue) * 100) 
    : 0;

  // Keyboard shortcuts
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    // Only trigger if not typing in an input/textarea
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'n':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          onNext();
        }
        break;
      case 'p':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          onPrevious();
        }
        break;
      case 's':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          onSkip();
        }
        break;
      case '?':
        setShowKeyboardHints(!showKeyboardHints);
        break;
    }
  }, [onNext, onPrevious, onSkip, showKeyboardHints]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  return (
    <div className="space-y-4">
      {/* Queue Progress Header */}
      <Card className="border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Queue Mode Active</h3>
                <p className="text-sm text-muted-foreground">
                  {currentIndex + 1} of {totalInQueue} • {totalInQueue - sessionStats.reviewed} remaining
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowKeyboardHints(!showKeyboardHints)}
            >
              <Keyboard className="h-4 w-4 mr-2" />
              Shortcuts (?)
            </Button>
          </div>

          {/* Progress Bar */}
          <Progress value={progressPercentage} className="h-3 mb-3" />

          {/* Session Stats */}
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-2 bg-white rounded-lg border">
              <p className="text-2xl font-bold text-blue-600">{sessionStats.reviewed}</p>
              <p className="text-xs text-muted-foreground">Reviewed</p>
            </div>
            <div className="text-center p-2 bg-white rounded-lg border">
              <p className="text-2xl font-bold text-green-600">{sessionStats.approved}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
            <div className="text-center p-2 bg-white rounded-lg border">
              <p className="text-2xl font-bold text-red-600">{sessionStats.rejected}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </div>
            <div className="text-center p-2 bg-white rounded-lg border">
              <p className="text-2xl font-bold text-gray-600">{sessionStats.skipped}</p>
              <p className="text-xs text-muted-foreground">Skipped</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={currentIndex <= 0}
          className="flex-1"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <Button
          variant="outline"
          onClick={onSkip}
          disabled={!currentRestaurant}
        >
          <SkipForward className="h-4 w-4 mr-2" />
          Skip
        </Button>

        <Button
          variant="default"
          onClick={onNext}
          disabled={currentIndex >= totalInQueue - 1}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Keyboard Shortcuts Panel */}
      {showKeyboardHints && (
        <Card className="border-purple-300 bg-purple-50">
          <CardContent className="pt-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              Keyboard Shortcuts
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">Ctrl+N</Badge>
                <span>Next restaurant</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">Ctrl+P</Badge>
                <span>Previous restaurant</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">Ctrl+S</Badge>
                <span>Skip restaurant</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">?</Badge>
                <span>Toggle shortcuts</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              💡 Tip: Complete the checklist, then use decision buttons. Next restaurant loads automatically!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Achievement Milestones */}
      {sessionStats.reviewed > 0 && sessionStats.reviewed % 10 === 0 && (
        <Card className="border-yellow-300 bg-yellow-50 animate-pulse">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-600" />
              <div>
                <h4 className="font-bold text-yellow-900">Milestone Reached!</h4>
                <p className="text-sm text-yellow-700">
                  You've reviewed {sessionStats.reviewed} restaurants! Keep up the great work! 🎉
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


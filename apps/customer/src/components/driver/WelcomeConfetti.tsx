import React, { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, Rocket, ArrowRight, Star, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface WelcomeConfettiProps {
  firstName: string;
  onComplete: () => void;
}

export const WelcomeConfetti: React.FC<WelcomeConfettiProps> = ({ firstName, onComplete }) => {
  const navigate = useNavigate();
  const [windowDimensions, setWindowDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    // Track window dimensions for responsive confetti
    const handleResize = () => {
      setWindowDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);

    // Stop confetti after 6 seconds
    const confettiTimer = setTimeout(() => {
      setShowConfetti(false);
    }, 6000);

    // Mark welcome screen as shown
    markWelcomeScreenShown();

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(confettiTimer);
    };
  }, []);

  const markWelcomeScreenShown = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('craver_applications')
          .update({ welcome_screen_shown: true })
          .eq('user_id', user.id);
      }
    } catch (error) {
      console.error('Error marking welcome screen shown:', error);
    }
  };

  const handleContinue = () => {
    onComplete();
    navigate('/driver/post-waitlist-onboarding');
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-orange-50 to-orange-100 z-50 flex items-center justify-center overflow-hidden">
      {/* React Confetti */}
      {showConfetti && (
        <Confetti
          width={windowDimensions.width}
          height={windowDimensions.height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.2}
          initialVelocityY={20}
          colors={['#FF6B35', '#F7931E', '#FFB700', '#FFA500', '#FF8C00', '#4CAF50', '#2196F3']}
        />
      )}

      {/* Main Content Card - Mobile First */}
      <Card className="max-w-2xl w-full mx-4 p-6 sm:p-8 md:p-12 shadow-2xl relative z-10 bg-white/95 backdrop-blur-sm">
        <div className="text-center space-y-4 sm:space-y-6">
          {/* Success Icon - Mobile First */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg animate-bounce-slow">
                <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-white" strokeWidth={2.5} />
              </div>
              <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2">
                <Star className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 fill-yellow-400 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Welcome Message - Mobile First */}
          <div className="space-y-2 sm:space-y-3">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
              Congratulations, {firstName}! 🎉
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800">
              You're Cleared to Drive!
            </p>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 px-2">
              Welcome to the Feeder family – you're now part of something amazing!
            </p>
          </div>

          {/* Stats Preview - Mobile First */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 py-4 sm:py-6">
            <div className="text-center p-3 sm:p-4 bg-orange-50 rounded-lg">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-orange-600">$15-25</div>
              <div className="text-xs text-gray-600">Per Hour</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">Flexible</div>
              <div className="text-xs text-gray-600">Schedule</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600">Weekly</div>
              <div className="text-xs text-gray-600">Payouts</div>
            </div>
          </div>

          {/* Quick Checklist - Mobile First */}
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl p-4 sm:p-6 text-left">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Rocket className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
              <h3 className="font-semibold text-sm sm:text-base text-gray-800">What's Next?</h3>
            </div>
            <ul className="space-y-2 sm:space-y-3">
              <li className="flex items-start gap-2 sm:gap-3">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-xs sm:text-sm text-gray-800">Complete Quick Orientation</p>
                  <p className="text-xs text-gray-600">Watch a short video and pass a safety quiz (5 min)</p>
                </div>
              </li>
              <li className="flex items-start gap-2 sm:gap-3">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-xs sm:text-sm text-gray-800">Set Up Your Payment</p>
                  <p className="text-xs text-gray-600">Add your bank account for weekly payouts</p>
                </div>
              </li>
              <li className="flex items-start gap-2 sm:gap-3">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-xs sm:text-sm text-gray-800">Start Feeding Today!</p>
                  <p className="text-xs text-gray-600">Go online and accept your first delivery</p>
                </div>
              </li>
            </ul>
          </div>

          {/* CTA Button - Mobile First */}
          <Button 
            onClick={handleContinue}
            size="lg"
            className="w-full text-sm sm:text-base md:text-lg py-4 sm:py-6 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 shadow-lg"
          >
            Let's Get Started!
            <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
          </Button>

          <p className="text-xs sm:text-sm text-gray-500">
            This will only take a few minutes to complete
          </p>
        </div>
      </Card>

      {/* Floating particles for extra effect */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        {[...Array(20)].map((_, i) => (
          <div
            key={`particle-${i}`}
            className="absolute w-2 h-2 bg-orange-400 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      <style>
        {`
          @keyframes float {
            0%, 100% {
              transform: translateY(0px) translateX(0px);
            }
            50% {
              transform: translateY(-20px) translateX(10px);
            }
          }
          .animate-float {
            animation: float ease-in-out infinite;
          }
          @keyframes bounce-slow {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-10px);
            }
          }
          .animate-bounce-slow {
            animation: bounce-slow 2s ease-in-out infinite;
          }
        `}
      </style>
    </div>
  );
};


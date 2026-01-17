import { useState, useEffect } from 'react';
import { X, Apple } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const InstallAppBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if already installed (running in standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Show banner if iOS and not installed and not dismissed
    const dismissed = localStorage.getItem('install-banner-dismissed');
    const dismissedTime = localStorage.getItem('install-banner-dismissed-time');
    
    // Reset dismissal after 7 days
    if (dismissedTime) {
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      if (parseInt(dismissedTime) < sevenDaysAgo) {
        localStorage.removeItem('install-banner-dismissed');
        localStorage.removeItem('install-banner-dismissed-time');
      }
    }

    if (iOS && !standalone && !dismissed) {
      // Show after 3 seconds
      setTimeout(() => setShowBanner(true), 3000);
    }
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('install-banner-dismissed', 'true');
    localStorage.setItem('install-banner-dismissed-time', Date.now().toString());
  };

  const handleInstall = () => {
    setShowInstructions(true);
  };

  if (!showBanner || !isIOS || isStandalone) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe animate-slide-up">
      <Card className="relative bg-gradient-to-r from-primary to-primary-glow text-white shadow-2xl border-0">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-white stroke-[2.5]" />
        </button>

        <div className="p-4 flex items-center gap-4">
          <div className="flex-shrink-0 w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <img src="/craven-logo.png" alt="Crave'N" className="w-12 h-12 rounded-lg" />
          </div>

          <div className="flex-1">
            <h3 className="font-bold text-lg">Install Crave'N App</h3>
            <p className="text-sm text-white/90">Get the full app experience</p>
          </div>

          <Button
            onClick={handleInstall}
            variant="secondary"
            size="sm"
            className="bg-white text-primary hover:bg-gray-100 font-semibold"
          >
            <Apple className="h-5 w-5 mr-2" />
            Install
          </Button>
        </div>

        {/* Instructions popup */}
        {showInstructions && (
          <div className="px-4 pb-4 text-sm border-t border-white/20 mt-3 pt-3 space-y-2">
            <p className="flex items-center gap-2">
              <span className="text-2xl">1️⃣</span>
              <span>Tap the <strong>Share</strong> button <span className="inline-block">⎋</span> in Safari (at the bottom)</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="text-2xl">2️⃣</span>
              <span>Scroll down and select <strong>"Add to Home Screen"</strong></span>
            </p>
            <p className="flex items-center gap-2">
              <span className="text-2xl">3️⃣</span>
              <span>Tap <strong>"Add"</strong> and find Crave'N on your home screen!</span>
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};


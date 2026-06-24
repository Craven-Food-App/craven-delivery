import { Apple, Share, Plus, Check, Chrome, Smartphone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const DownloadApp = () => {
  const navigate = useNavigate();
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as any).standalone === true;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Hero */}
        <div className="text-center space-y-4 py-8">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-orange-500 to-red-500 rounded-3xl flex items-center justify-center shadow-2xl">
            <img src="/craven-logo.png" alt="Crave'n" className="w-20 h-20 rounded-2xl" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">Get the Crave'n App</h1>
          <p className="text-lg text-gray-600">
            Install the app for the best on-demand experience, food, grocery, retail, convenience, and courier (CX), all in one place.
          </p>
          
          {isStandalone && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full">
              <Check className="h-5 w-5" />
              <span className="font-semibold">Already Installed!</span>
            </div>
          )}
        </div>

        {/* Benefits */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-xl font-bold mb-4">Why Install?</h2>
            <div className="flex items-start gap-3">
              <Check className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold">Works Like a Real App</h3>
                <p className="text-sm text-gray-600">Full screen experience, app icon on home screen, no browser bars</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold">Works Offline</h3>
                <p className="text-sm text-gray-600">Browse menus and view your orders even without internet</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold">Push Notifications</h3>
                <p className="text-sm text-gray-600">Get instant updates on your orders and special offers</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold">No App Store Required</h3>
                <p className="text-sm text-gray-600">Install directly from your browser - no download needed</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold">Faster Performance</h3>
                <p className="text-sm text-gray-600">Optimized loading and smoother animations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Installation Instructions for iOS */}
        {isIOS && (
          <Card className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Apple className="h-8 w-8" />
                Install on iPhone/iPad
              </h2>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                  <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg">
                    1
                  </div>
                  <div>
                    <p className="font-semibold mb-2">Open in Safari</p>
                    <p className="text-sm text-white/90">
                      Make sure you're viewing this page in Safari browser (not Chrome or other browsers)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                  <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg">
                    2
                  </div>
                  <div>
                    <p className="font-semibold mb-2">Tap the Share Button</p>
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <Share className="h-5 w-5" />
                      <span>Look for the share icon at the bottom of Safari</span>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2 text-xs">
                      💡 Tip: The share button looks like a square with an arrow pointing up
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                  <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg">
                    3
                  </div>
                  <div>
                    <p className="font-semibold mb-2">Add to Home Screen</p>
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <Plus className="h-5 w-5" />
                      <span>Scroll down in the menu and tap "Add to Home Screen"</span>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2 text-xs">
                      💡 Tip: You might need to scroll down past other sharing options
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                  <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg">
                    4
                  </div>
                  <div>
                    <p className="font-semibold mb-2">Confirm & Launch</p>
                    <p className="text-sm text-white/90">
                      Tap "Add" in the top right, then find Crave'n icon on your home screen!
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 text-center border-t border-white/20">
                <p className="text-white/90 text-sm mb-4">
                  🎉 That's it! Open Crave'n from your home screen like any other app
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Installation Instructions for Android */}
        {isAndroid && (
          <Card className="bg-gradient-to-r from-green-500 to-teal-500 text-white border-0">
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Smartphone className="h-8 w-8" />
                Install on Android
              </h2>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                  <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg">
                    1
                  </div>
                  <div>
                    <p className="font-semibold mb-2">Look for the Install Prompt</p>
                    <p className="text-sm text-white/90">
                      A banner should appear at the bottom asking to "Add Crave'n to Home screen"
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                  <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg">
                    2
                  </div>
                  <div>
                    <p className="font-semibold mb-2">Or Use the Menu</p>
                    <div className="text-sm space-y-1 text-white/90">
                      <p>• Tap the three dots (⋮) in your browser</p>
                      <p>• Select "Install app" or "Add to Home screen"</p>
                      <p>• Tap "Install" when prompted</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 text-center border-t border-white/20">
                <p className="text-white/90 text-sm">
                  🎉 Find the Crave'n icon on your home screen!
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Desktop */}
        {!isIOS && !isAndroid && (
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <Chrome className="h-16 w-16 mx-auto text-gray-400" />
              <h2 className="text-2xl font-bold">Desktop Installation</h2>
              <p className="text-gray-600">
                While you're on desktop, you can still install Crave'n for quick access!
              </p>
              <div className="text-left max-w-md mx-auto space-y-2 text-sm">
                <p>• Look for an install icon <Smartphone className="inline h-4 w-4" /> in your browser's address bar</p>
                <p>• Or check your browser menu for "Install Crave'n" option</p>
                <p>• For best mobile experience, open this page on your phone!</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="flex-1"
          >
            Back to Home
          </Button>
          <Button
            onClick={() => navigate('/restaurants')}
            className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
          >
            Start Ordering
          </Button>
        </div>
      </div>
    </div>
  );
};


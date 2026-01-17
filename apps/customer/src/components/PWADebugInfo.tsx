import { useEffect, useState } from 'react';

export function PWADebugInfo() {
  const [debugInfo, setDebugInfo] = useState({
    isStandalone: false,
    hasPWAClass: false,
    safeAreaTop: '0px',
    userAgent: '',
    viewport: { width: 0, height: 0 }
  });

  useEffect(() => {
    const checkPWAStatus = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                          (window.navigator && (window.navigator as any).standalone === true);
      const hasPWAClass = document.body.classList.contains('pwa-standalone');
      
      // Get computed safe-area value
      const testDiv = document.createElement('div');
      testDiv.style.paddingTop = 'env(safe-area-inset-top, 0px)';
      document.body.appendChild(testDiv);
      const safeAreaTop = window.getComputedStyle(testDiv).paddingTop;
      document.body.removeChild(testDiv);

      setDebugInfo({
        isStandalone,
        hasPWAClass,
        safeAreaTop,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      });
    };

    checkPWAStatus();
    
    // Recheck on resize
    window.addEventListener('resize', checkPWAStatus);
    return () => window.removeEventListener('resize', checkPWAStatus);
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-black/90 text-white p-4 text-xs font-mono overflow-auto max-h-48">
      <div className="space-y-1">
        <div><strong>PWA Mode:</strong> {debugInfo.isStandalone ? '✅ YES' : '❌ NO'}</div>
        <div><strong>PWA Class Applied:</strong> {debugInfo.hasPWAClass ? '✅ YES' : '❌ NO'}</div>
        <div><strong>Safe Area Top:</strong> {debugInfo.safeAreaTop}</div>
        <div><strong>Viewport:</strong> {debugInfo.viewport.width}x{debugInfo.viewport.height}</div>
        <div><strong>Body Classes:</strong> {document.body.className || 'none'}</div>
        <div className="text-xs opacity-60 mt-2">
          {debugInfo.userAgent.substring(0, 60)}...
        </div>
      </div>
    </div>
  );
}


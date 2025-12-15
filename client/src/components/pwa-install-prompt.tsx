import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isInStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                          (window.navigator as any).standalone === true;
    
    setIsIOS(isIOSDevice);
    setIsStandalone(isInStandalone);

    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

    if (isInStandalone || (dismissed && daysSinceDismissed < 7)) {
      return;
    }

    if (isIOSDevice) {
      setTimeout(() => setShowPrompt(true), 3000);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div 
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-50 animate-in slide-in-from-bottom-4"
      data-testid="pwa-install-prompt"
    >
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        data-testid="button-dismiss-install"
        aria-label="Dismiss"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
          <Download className="h-6 w-6 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white text-base" data-testid="text-install-title">
            Install Athlete360
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1" data-testid="text-install-description">
            {isIOS 
              ? "Add to your home screen for quick access and offline use."
              : "Install our app for a better experience with offline access."}
          </p>
        </div>
      </div>

      {isIOS ? (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2" data-testid="text-ios-instructions">
            <span>Tap</span>
            <Share className="h-4 w-4" />
            <span>then "Add to Home Screen"</span>
          </p>
        </div>
      ) : (
        <div className="mt-4 flex gap-2">
          <Button
            onClick={handleInstall}
            className="flex-1"
            data-testid="button-install-app"
          >
            <Download className="h-4 w-4 mr-2" />
            Install
          </Button>
          <Button
            onClick={handleDismiss}
            variant="outline"
            data-testid="button-not-now"
          >
            Not now
          </Button>
        </div>
      )}
    </div>
  );
}

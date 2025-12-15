import { useState, useEffect } from 'react';
import { X, Download, Share, Globe, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const translations = {
  en: {
    title: "Install Athlete360 App",
    iosDescription: "Add to your home screen for quick access and offline use.",
    androidDescription: "Install our app for a better experience with offline access.",
    install: "Install",
    notNow: "Not now",
    iosStep1: "Tap the",
    iosStep2: "Share",
    iosStep3: "button below",
    iosStep4: 'Select "Add to Home Screen"',
    iosStep5: 'Tap "Add" to confirm',
    androidStep1: "Tap Install below",
    androidStep2: "Follow the prompts to add to home screen",
    androidStep3: "Open anytime from your home screen",
  },
  ar: {
    title: "تثبيت تطبيق Athlete360",
    iosDescription: "أضف إلى شاشتك الرئيسية للوصول السريع والاستخدام بدون إنترنت.",
    androidDescription: "ثبّت تطبيقنا للحصول على تجربة أفضل مع إمكانية الوصول بدون إنترنت.",
    install: "تثبيت",
    notNow: "ليس الآن",
    iosStep1: "اضغط على زر",
    iosStep2: "المشاركة",
    iosStep3: "في الأسفل",
    iosStep4: '"اختر "إضافة إلى الشاشة الرئيسية',
    iosStep5: '"اضغط "إضافة" للتأكيد',
    androidStep1: "اضغط على تثبيت أدناه",
    androidStep2: "اتبع التعليمات لإضافته إلى الشاشة الرئيسية",
    androidStep3: "افتح التطبيق في أي وقت من شاشتك الرئيسية",
  }
};

type Language = 'en' | 'ar';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [previewMode, setPreviewMode] = useState<'ios' | 'android' | null>(null);

  const isDev = import.meta.env.DEV;
  const t = translations[language];
  const isRTL = language === 'ar';

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
      if (!isDev) return;
    }

    if (isIOSDevice) {
      setTimeout(() => setShowPrompt(true), 1000);
      return;
    }

    if (isDev) {
      setTimeout(() => setShowPrompt(true), 1000);
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
  }, [isDev]);

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
    if (!isDev) {
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    }
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'ar' : 'en');
  };

  const showIOSInstructions = previewMode === 'ios' || (previewMode === null && isIOS);
  const showAndroidInstructions = previewMode === 'android' || (previewMode === null && !isIOS);

  if (!showPrompt || isStandalone) return null;

  return (
    <div 
      className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[420px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 animate-in slide-in-from-bottom-4 overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`}
      data-testid="pwa-install-prompt"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center">
              <Download className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white text-lg drop-shadow-sm" data-testid="text-install-title">
                {t.title}
              </h3>
              <p className="text-gray-300 text-sm">
                {showIOSInstructions ? t.iosDescription : t.androidDescription}
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            data-testid="button-dismiss-install"
            aria-label="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <Button
            onClick={toggleLanguage}
            variant="outline"
            size="sm"
            className="gap-2"
            data-testid="button-toggle-language"
          >
            <Globe className="h-4 w-4" />
            {language === 'en' ? 'العربية' : 'English'}
          </Button>

          {isDev && (
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setPreviewMode('ios')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                  showIOSInstructions 
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                data-testid="button-preview-ios"
              >
                <Smartphone className="h-3.5 w-3.5" />
                iOS
              </button>
              <button
                onClick={() => setPreviewMode('android')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                  showAndroidInstructions 
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                data-testid="button-preview-android"
              >
                <Smartphone className="h-3.5 w-3.5" />
                Android
              </button>
            </div>
          )}
        </div>

        {showIOSInstructions ? (
          <div className="space-y-3" data-testid="ios-instructions">
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                1
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2 flex-wrap">
                <span>{t.iosStep1}</span>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-700 rounded-md shadow-sm">
                  <Share className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{t.iosStep2}</span>
                </span>
                <span>{t.iosStep3}</span>
              </p>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                2
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {t.iosStep4}
              </p>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                3
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {t.iosStep5}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3" data-testid="android-instructions">
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                1
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {t.androidStep1}
              </p>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                2
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {t.androidStep2}
              </p>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                3
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {t.androidStep3}
              </p>
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                onClick={handleInstall}
                className="flex-1"
                size="lg"
                data-testid="button-install-app"
              >
                <Download className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {t.install}
              </Button>
              <Button
                onClick={handleDismiss}
                variant="outline"
                size="lg"
                data-testid="button-not-now"
              >
                {t.notNow}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

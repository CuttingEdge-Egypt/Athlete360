import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ICU from 'i18next-icu';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation resources
import commonEn from '../locales/en/common.json';
import navEn from '../locales/en/nav.json';
import homeEn from '../locales/en/home.json';
import videoAnalysisEn from '../locales/en/videoAnalysis.json';

import commonAr from '../locales/ar/common.json';
import navAr from '../locales/ar/nav.json';
import homeAr from '../locales/ar/home.json';
import videoAnalysisAr from '../locales/ar/videoAnalysis.json';

// Define the resources
const resources = {
  en: {
    common: commonEn,
    nav: navEn,
    home: homeEn,
    videoAnalysis: videoAnalysisEn,
  },
  ar: {
    common: commonAr,
    nav: navAr,
    home: homeAr,
    videoAnalysis: videoAnalysisAr,
  },
};

// Configure i18next
i18n
  .use(ICU) // For complex pluralization (supports Arabic)
  .use(LanguageDetector) // Automatic language detection
  .use(initReactI18next) // React integration
  .init({
    resources,
    fallbackLng: 'en',
    
    // Namespace configuration
    ns: ['common', 'nav', 'home', 'videoAnalysis'],
    defaultNS: 'common',
    
    // Language detection configuration
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    
    // Interpolation configuration
    interpolation: {
      escapeValue: false, // React already does XSS protection, true causes double-escaping
    },
    
    // Arabic pluralization support
    pluralSeparator: '_',
    contextSeparator: '_',
    
    // Development configuration
    debug: import.meta.env.DEV,
    
    // Missing key behavior
    missingKeyHandler: (lng, ns, key) => {
      if (import.meta.env.DEV) {
        console.warn(`Missing translation key: ${ns}:${key} for language: ${lng}`);
      }
    },
    
    // Ensure proper RTL support
    react: {
      useSuspense: true,
    },
  });

// Helper function to get text direction
export const getDirection = (language?: string): 'ltr' | 'rtl' => {
  const lng = language || i18n.language;
  return lng === 'ar' ? 'rtl' : 'ltr';
};

// Helper function to check if current language is RTL
export const isRTL = (language?: string): boolean => {
  return getDirection(language) === 'rtl';
};

export default i18n;
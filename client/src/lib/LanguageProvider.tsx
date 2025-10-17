import { useEffect, useState, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { getDirection, isRTL } from './i18n';
import { LanguageContext, LanguageContextType } from '@/hooks/useLanguage';

// Available languages configuration
const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
];

// Language Provider component
interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const { i18n } = useTranslation();
  const [language, setLanguage] = useState(i18n.language || 'en');
  const [direction, setDirection] = useState<'ltr' | 'rtl'>(getDirection(i18n.language));

  // Update HTML attributes and state when language changes
  const updateLanguageAttributes = (lng: string) => {
    const dir = getDirection(lng);
    
    // Update HTML attributes
    document.documentElement.lang = lng;
    document.documentElement.dir = dir;
    document.body.dir = dir;
    
    // Update state
    setLanguage(lng);
    setDirection(dir);
    
    // Store in localStorage
    localStorage.setItem('i18nextLng', lng);
  };

  // Language change handler
  const changeLanguage = async (newLanguage: string) => {
    try {
      await i18n.changeLanguage(newLanguage);
      updateLanguageAttributes(newLanguage);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  // Initialize language on mount
  useEffect(() => {
    const storedLanguage = localStorage.getItem('i18nextLng') || 'en';
    updateLanguageAttributes(storedLanguage);
    
    // Ensure i18n is also set to the stored language
    if (i18n.language !== storedLanguage) {
      i18n.changeLanguage(storedLanguage);
    }
  }, [i18n]);

  // Listen for i18n language changes
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      updateLanguageAttributes(lng);
    };

    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  // Context value
  const value: LanguageContextType = {
    language,
    direction,
    isRTL: isRTL(language),
    changeLanguage,
    availableLanguages: AVAILABLE_LANGUAGES,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
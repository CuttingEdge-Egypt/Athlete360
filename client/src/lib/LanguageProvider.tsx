import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { getDirection, isRTL } from './i18n';

// Language context type
interface LanguageContextType {
  language: string;
  direction: 'ltr' | 'rtl';
  isRTL: boolean;
  changeLanguage: (language: string) => void;
  availableLanguages: { code: string; name: string; nativeName: string }[];
}

// Create context
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

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

// Custom hook to use language context
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Helper hook for RTL-aware styling
export const useRTL = () => {
  const { isRTL, direction } = useLanguage();
  
  // Helper function to get RTL-aware styles
  const rtlStyle = (ltrStyle: any, rtlStyle: any) => {
    return isRTL ? rtlStyle : ltrStyle;
  };
  
  // Helper function to get margin/padding directions
  const getMargin = (start: number, end: number, top?: number, bottom?: number) => {
    if (isRTL) {
      return {
        marginRight: start,
        marginLeft: end,
        ...(top !== undefined && { marginTop: top }),
        ...(bottom !== undefined && { marginBottom: bottom }),
      };
    }
    return {
      marginLeft: start,
      marginRight: end,
      ...(top !== undefined && { marginTop: top }),
      ...(bottom !== undefined && { marginBottom: bottom }),
    };
  };
  
  const getPadding = (start: number, end: number, top?: number, bottom?: number) => {
    if (isRTL) {
      return {
        paddingRight: start,
        paddingLeft: end,
        ...(top !== undefined && { paddingTop: top }),
        ...(bottom !== undefined && { paddingBottom: bottom }),
      };
    }
    return {
      paddingLeft: start,
      paddingRight: end,
      ...(top !== undefined && { paddingTop: top }),
      ...(bottom !== undefined && { paddingBottom: bottom }),
    };
  };
  
  return {
    isRTL,
    direction,
    rtlStyle,
    getMargin,
    getPadding,
  };
};
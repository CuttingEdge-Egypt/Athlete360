import { createContext, useContext } from 'react';

// Language context type
export interface LanguageContextType {
  language: string;
  direction: 'ltr' | 'rtl';
  isRTL: boolean;
  changeLanguage: (language: string) => void;
  availableLanguages: { code: string; name: string; nativeName: string }[];
}

// Create context
export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

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

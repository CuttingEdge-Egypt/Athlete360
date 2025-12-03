// Arabic PDF utilities for RTL text processing and font support
import { jsPDF } from 'jspdf';
import { amiriRegularBase64 } from './fonts/amiri-font';

// Arabic font configuration
export const ARABIC_FONTS = {
  regular: 'Amiri',
  bold: 'Amiri'
};

// Check if text contains Arabic characters
export const containsArabic = (text: string): boolean => {
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicRegex.test(text);
};

// Process Arabic text for proper rendering in PDFs
export const processArabicText = (text: string): string => {
  if (!text || typeof text !== 'string') return text;
  
  // Only process if text contains Arabic characters
  if (containsArabic(text)) {
    try {
      // Return the original text - the Amiri font will handle proper Arabic rendering
      return text;
    } catch (error) {
      console.warn('Arabic text processing failed, using original text:', error);
      return text;
    }
  }
  
  return text;
};

// Convert Arabic-Indic numerals to Western numerals if needed
export const normalizeNumbers = (text: string, useArabicNumerals: boolean = false): string => {
  if (!useArabicNumerals) return text;
  
  // Arabic-Indic numerals mapping
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  
  return text.replace(/[0-9]/g, (digit) => {
    return arabicNumerals[parseInt(digit)];
  });
};

// Sanitize text while preserving Arabic characters and diacritics
export const sanitizeArabicText = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  
  // Remove unwanted characters but preserve Arabic diacritics and marks
  return text
    .replace(/[\r\n\t]/g, ' ') // Replace line breaks with spaces
    .replace(/\s+/g, ' ') // Normalize multiple spaces
    .trim();
};

// RTL-aware text alignment helpers
export const getRTLTextAlign = (locale: string, defaultAlign: 'left' | 'center' | 'right' = 'left') => {
  if (locale === 'ar') {
    return defaultAlign === 'left' ? 'right' : defaultAlign;
  }
  return defaultAlign;
};

// Calculate X position for RTL text
export const getRTLXPosition = (
  pageWidth: number, 
  textWidth: number, 
  align: 'left' | 'center' | 'right',
  margin: number = 20
): number => {
  switch (align) {
    case 'right':
      return pageWidth - margin;
    case 'center':
      return pageWidth / 2;
    case 'left':
    default:
      return margin;
  }
};

// Format dates for Arabic locale
export const formatDateForLocale = (date: Date, locale: string): string => {
  if (locale === 'ar') {
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Track if Arabic fonts have been loaded to avoid duplicate loading
let arabicFontsLoaded = false;

// Load Arabic fonts into jsPDF
export const loadArabicFonts = async (pdf: jsPDF): Promise<boolean> => {
  try {
    // Check if fonts are already loaded globally
    if (arabicFontsLoaded) {
      // Set the font if already loaded
      try {
        pdf.setFont('Amiri', 'normal');
      } catch (e) {
        // Font might need to be re-added to this PDF instance
        pdf.addFileToVFS('Amiri-Regular.ttf', amiriRegularBase64);
        pdf.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
        pdf.setFont('Amiri', 'normal');
      }
      return true;
    }

    console.log('Loading Amiri Arabic font for PDF generation...');

    // Add the Amiri font to the PDF
    pdf.addFileToVFS('Amiri-Regular.ttf', amiriRegularBase64);
    pdf.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
    pdf.setFont('Amiri', 'normal');
    
    arabicFontsLoaded = true;
    console.log('Amiri Arabic font loaded successfully');
    return true;

  } catch (error) {
    console.error('Failed to load Arabic fonts:', error);
    arabicFontsLoaded = true; // Prevent retry loops
    return false;
  }
};

// Set appropriate font for text based on locale
export const setTextFont = (pdf: jsPDF, locale: string, weight: 'normal' | 'bold' = 'normal') => {
  if (locale === 'ar') {
    try {
      // Use Amiri font for Arabic text
      pdf.setFont('Amiri', 'normal');
    } catch (error) {
      console.warn('Amiri font not available, attempting to load...');
      // Try to load the font
      try {
        pdf.addFileToVFS('Amiri-Regular.ttf', amiriRegularBase64);
        pdf.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
        pdf.setFont('Amiri', 'normal');
      } catch (e) {
        console.error('Failed to load Amiri font:', e);
        // Final fallback to helvetica
        pdf.setFont('helvetica', weight);
      }
    }
  } else {
    // Use Times for English (existing behavior)
    pdf.setFont('times', weight);
  }
};

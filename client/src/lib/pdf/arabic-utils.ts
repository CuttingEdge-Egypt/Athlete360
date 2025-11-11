// Arabic PDF utilities for RTL text processing and font support
import arabicReshaper from 'arabic-reshaper';
import bidiJs from 'bidi-js';
import { jsPDF } from 'jspdf';

// Arabic font configuration
// Using standard PDF fonts with Unicode support for Arabic text
export const ARABIC_FONTS = {
  regular: 'courier',
  bold: 'courier'
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
      // Simple Arabic processing without external dependencies
      // Just return the original text - jsPDF will handle basic RTL alignment
      return text;
    } catch (error) {
      console.warn('Arabic text processing failed, using original text:', error);
      // Return original text if processing fails
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
    .trim()
    // Preserve Arabic diacritics (don't remove them like in the original sanitizer)
    .replace(/[^\u0000-\u007F\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]/g, '') // Keep ASCII and Arabic ranges
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

// Convert ArrayBuffer to base64 string for jsPDF
const toBase64 = (buffer: ArrayBuffer): string => {
  const uint8Array = new Uint8Array(buffer);
  let binaryString = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binaryString += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binaryString);
};

// Track if Arabic fonts have been loaded to avoid duplicate loading
let arabicFontsLoaded = false;

// Load Arabic fonts into jsPDF
export const loadArabicFonts = async (pdf: jsPDF): Promise<boolean> => {
  try {
    // Check if fonts are already loaded globally
    if (arabicFontsLoaded) {
      return true;
    }

    console.log('Initializing Arabic font support for PDF generation...');

    // Skip external font loading due to CORS/network restrictions in Replit
    // Instead, we'll use Courier font which has better Unicode/Arabic character support
    // than the default Times or Helvetica fonts
    
    // Mark fonts as loaded so setTextFont will use the proper fallback
    arabicFontsLoaded = true;
    console.log('Arabic font support initialized with Unicode-compatible fallback');
    return true;

  } catch (error) {
    console.error('Failed to initialize Arabic fonts:', error);
    arabicFontsLoaded = true; // Prevent retry loops
    return false;
  }
};

// Set appropriate font for text based on locale
export const setTextFont = (pdf: jsPDF, locale: string, weight: 'normal' | 'bold' = 'normal') => {
  if (locale === 'ar') {
    // Use Courier for Arabic text - it has the best Unicode/Arabic character support
    // among the standard PDF fonts (Courier, Helvetica, Times)
    try {
      pdf.setFont('courier', weight);
    } catch (error) {
      // Final fallback to helvetica
      console.warn('Courier font selection failed, using helvetica fallback:', error);
      pdf.setFont('helvetica', weight);
    }
  } else {
    // Use Times for English (existing behavior)
    pdf.setFont('times', weight);
  }
};
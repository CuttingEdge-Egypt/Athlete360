import jsPDF from 'jspdf';
import 'jspdf-autotable';
import athleteLogoUrl from '@assets/image_1758650668171.png';
import { 
  processArabicText, 
  sanitizeArabicText, 
  getRTLTextAlign, 
  getRTLXPosition,
  formatDateForLocale,
  setTextFont,
  normalizeNumbers,
  loadArabicFonts
} from './arabic-utils';
import i18n from '../i18n';

// Professional PDF theme
const pdfTheme = {
  colors: {
    primary: '#000000',      // Black for text
    headerBg: '#0f1729',     // Dark blue for header background to match logo
    secondary: '#333333',    // Dark gray for subheadings
    text: '#000000',         // Black for body text
    lightGray: '#f5f5f5',    // Light gray for backgrounds
    accent: '#2563eb',       // Blue accent (minimal use)
    border: '#0f1729',       // Dark blue for page borders to match header
  },
  fonts: {
    primary: 'times',
    sizes: {
      header: 16,
      subheader: 14,
      body: 12,
      small: 10,
    }
  },
  spacing: {
    margin: 15,  // Better margins to respect page borders
    lineHeight: 7,  // Better line height for text spacing
    sectionGap: 15,
    paragraphGap: 12,
  },
  layout: {
    pageWidth: 210,
    pageHeight: 297,
    borderWidth: 1,
  }
};

// Extend jsPDF interface for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

// Locale-aware text sanitizer for PDF generation
const sanitizeText = (text: string, locale: string = 'en', bypassArabicProcessing: boolean = false): string => {
  if (!text || typeof text !== 'string') return '';
  
  // For Arabic locale, bypass processing if it's raw API content (already properly formatted)
  if (locale === 'ar' && !bypassArabicProcessing) {
    let arabicText = sanitizeArabicText(text);
    arabicText = processArabicText(arabicText);
    arabicText = normalizeNumbers(arabicText, true);
    return arabicText;
  }
  
  // For Arabic with bypass enabled, return text as-is (for rawResponse content)
  if (locale === 'ar' && bypassArabicProcessing) {
    return text;
  }
  
  // Original sanitization for English/LTR languages
  let cleaned = text;
  
  // First normalize Unicode characters to ASCII
  cleaned = cleaned.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' '); // Unicode spaces to regular space
  cleaned = cleaned.replace(/[\uFF08\uFF09]/g, match => match === '\uFF08' ? '(' : ')'); // Full-width parentheses
  cleaned = cleaned.replace(/[\uFF3B\uFF3D]/g, match => match === '\uFF3B' ? '[' : ']'); // Full-width brackets
  cleaned = cleaned.replace(/[\uFF5B\uFF5D]/g, match => match === '\uFF5B' ? '{' : '}'); // Full-width braces
  
  // Remove entire bracketed groups containing URLs BEFORE removing standalone URLs
  // This prevents leaving empty brackets behind
  cleaned = cleaned.replace(/\([^()]*?(https?:\/\/|www\.|[\w.-]+\.[A-Za-z]{2,})[^()]*?\)/g, '');
  cleaned = cleaned.replace(/\[[^\[\]]*?(https?:\/\/|www\.|[\w.-]+\.[A-Za-z]{2,})[^\[\]]*?\]/g, '');
  cleaned = cleaned.replace(/\{[^{}]*?(https?:\/\/|www\.|[\w.-]+\.[A-Za-z]{2,})[^{}]*?\}/g, '');
  cleaned = cleaned.replace(/<[^<>]*?(https?:\/\/|www\.|[\w.-]+\.[A-Za-z]{2,})[^<>]*?>/g, '');
  
  // Remove any remaining standalone URLs
  cleaned = cleaned.replace(/(https?:\/\/[^\s\)\]\}]+)/g, '');
  cleaned = cleaned.replace(/www\.[^\s\)\]\}]+/g, '');
  
  // Remove any now-empty bracket pairs (including Unicode spaces)
  cleaned = cleaned.replace(/[\(\[\{<]\s*[>\}\]\)]/g, '');
  
  // Replace arrows with "then" to fix spacing issues
  cleaned = cleaned.replace(/→/g, 'then');
  cleaned = cleaned.replace(/->/g, 'then');
  
  // Add space after every period that isn't already followed by a space
  cleaned = cleaned.replace(/\.(?! )/g, '. ');
  
  // Apply all the other normalizations from normalizeText
  cleaned = cleaned.replace(/[\u200B-\u200D\u2060\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069\uFEFF]/g, '');
  cleaned = cleaned.replace(/[\u2010-\u2014\u2212\u2015]/g, '-');
  cleaned = cleaned.replace(/[\u2022\u2023\u25E6\u2043\u2219\u00B7]/g, '*');
  cleaned = cleaned.replace(/[\u2018\u2019\u201A\u2039\u203A]/g, "'");
  cleaned = cleaned.replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"');
  cleaned = cleaned.replace(/!\s*[''"]\s*/g, "! ");
  cleaned = cleaned.replace(/[''"]\s*!\s*/g, "! ");
  cleaned = cleaned.replace(/[\u2026]/g, '...');
  cleaned = cleaned.replace(/([A-Z0-9])\s*[!]\s*['"]\s*([A-Z0-9])/g, '$1 ! $2');
  
  // Clean up extra spaces and normalize
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  cleaned = cleaned.trim();
  
  return cleaned;
};

// Locale-aware translation helper - uses scoped translation to avoid global state mutations
const t = (key: string, locale: string = 'en'): string => {
  try {
    // Use getFixedT to avoid global state mutations
    const fixedT = i18n.getFixedT(locale, 'common');
    const translation = fixedT(`pdf.${key}`);
    return translation !== `pdf.${key}` ? translation : key;
  } catch (error) {
    console.warn(`Translation failed for key: pdf.${key}`, error);
    return key;
  }
};

// Check if we need a new page (with safety margin)
const checkPageBreak = (pdf: jsPDF, currentY: number, requiredSpace: number = 20): number => {
  const pageBottomMargin = pdfTheme.layout.pageHeight - pdfTheme.spacing.margin - 10; // 10mm safety margin from bottom
  
  if (currentY + requiredSpace > pageBottomMargin) {
    pdf.addPage();
    
    // Draw page border on new page
    pdf.setDrawColor(pdfTheme.colors.border);
    pdf.setLineWidth(pdfTheme.layout.borderWidth);
    pdf.rect(
      pdfTheme.spacing.margin, 
      pdfTheme.spacing.margin, 
      pdfTheme.layout.pageWidth - (pdfTheme.spacing.margin * 2), 
      pdfTheme.layout.pageHeight - (pdfTheme.spacing.margin * 2)
    );
    
    return pdfTheme.spacing.margin + 10; // Start near top of new page
  }
  
  return currentY;
};

// RTL-aware text positioning helper with automatic page breaks
const addText = (
  pdf: jsPDF, 
  text: string, 
  y: number, 
  options: { 
    indent?: number; 
    fontSize?: number; 
    locale?: string;
    align?: 'left' | 'center' | 'right';
    weight?: 'normal' | 'bold';
    extraSpacing?: number;
    sanitize?: boolean;
    bypassArabicProcessing?: boolean; // For rawResponse content
  } = {}
): number => {
  const { 
    indent = 0, 
    fontSize = pdfTheme.fonts.sizes.body, 
    locale = 'en', 
    align = 'left',
    weight = 'normal',
    extraSpacing = 0,
    bypassArabicProcessing = false
  } = options;
  
  if (!text || text.trim() === '') return y;
  
  pdf.setFontSize(fontSize);
  
  // For Arabic with bypass enabled, use default font to match UI display
  if (locale === 'ar' && bypassArabicProcessing) {
    pdf.setFont('helvetica', weight); // Use default font that works like in UI
  } else {
    setTextFont(pdf, locale, weight);
  }
  
  // For Arabic with bypass enabled, use text as-is without ANY processing
  let processedText: string;
  if (locale === 'ar' && bypassArabicProcessing) {
    processedText = text; // Use raw text without any sanitization
  } else {
    processedText = sanitizeText(text, locale, bypassArabicProcessing);
  }
  
  const isRTL = locale === 'ar';
  const textAlign = getRTLTextAlign(locale, align);
  
  // Conservative text width calculation to prevent overflow
  const maxWidth = pdfTheme.layout.pageWidth - 2 * pdfTheme.spacing.margin - indent - 10; // Extra 10mm safety margin
  
  // Break extremely long words that can't be wrapped - skip for Arabic with bypass
  let textForSplitting = processedText;
  if (textForSplitting && !(locale === 'ar' && bypassArabicProcessing)) {
    textForSplitting = textForSplitting.replace(/(\S{25,})/g, (match) => {
      // Break very long words by inserting spaces every 25 characters
      return match.replace(/(.{25})/g, '$1 ');
    });
  }
  
  const splitText = pdf.splitTextToSize(textForSplitting, maxWidth);
  
  // Calculate total space needed for this text block
  const totalSpaceNeeded = splitText.length * pdfTheme.spacing.lineHeight + extraSpacing;
  
  // Check if we need a page break before adding text
  let currentY = checkPageBreak(pdf, y, totalSpaceNeeded);
  
  splitText.forEach((line: string, index: number) => {
    // Double-check page break for each line (in case of very long text blocks)
    currentY = checkPageBreak(pdf, currentY, pdfTheme.spacing.lineHeight);
    
    let xPosition: number;
    
    if (isRTL && textAlign === 'right') {
      xPosition = pdfTheme.layout.pageWidth - pdfTheme.spacing.margin - indent;
    } else if (textAlign === 'center') {
      xPosition = pdfTheme.layout.pageWidth / 2;
    } else {
      xPosition = pdfTheme.spacing.margin + indent;
    }
    
    pdf.text(line, xPosition, currentY, { align: textAlign });
    currentY += pdfTheme.spacing.lineHeight;
  });
  
  return currentY + extraSpacing;
};

// RTL-aware text with bold label helper with automatic page breaks
const addTextWithBoldLabel = (
  pdf: jsPDF,
  label: string,
  value: string,
  y: number,
  options: { 
    indent?: number; 
    locale?: string;
    fontSize?: number;
    extraSpacing?: number;
  } = {}
): number => {
  const { 
    indent = 0, 
    locale = 'en', 
    fontSize = pdfTheme.fonts.sizes.body, 
    extraSpacing = 0 
  } = options;
  const isRTL = locale === 'ar';
  
  // Check if we need a page break before adding this label/value pair
  let currentY = checkPageBreak(pdf, y, pdfTheme.spacing.lineHeight + extraSpacing);
  
  pdf.setFontSize(fontSize);
  
  if (isRTL) {
    // For RTL: value first, then label (reversed order)
    setTextFont(pdf, locale, 'normal');
    const processedValue = value ? sanitizeText(value, locale) : '';
    const valueWidth = pdf.getTextWidth(processedValue);
    const rightX = pdfTheme.layout.pageWidth - pdfTheme.spacing.margin - indent;
    
    if (processedValue) {
      pdf.text(processedValue, rightX, currentY, { align: 'right' });
    }
    
    setTextFont(pdf, locale, 'bold');
    const translatedLabel = t(label.replace(':', ''), locale);
    const processedLabel = sanitizeText(translatedLabel, locale);
    const labelX = rightX - valueWidth - (processedValue ? 5 : 0);
    pdf.text(processedLabel, labelX, currentY, { align: 'right' });
  } else {
    // For LTR: label first, then value (normal order)
    setTextFont(pdf, locale, 'bold');
    const labelWidth = pdf.getTextWidth(label);
    const leftX = pdfTheme.spacing.margin + indent;
    
    pdf.text(label, leftX, currentY);
    
    if (value) {
      setTextFont(pdf, locale, 'normal');
      pdf.text(value, leftX + labelWidth + 5, currentY);
    }
  }
  
  return currentY + pdfTheme.spacing.lineHeight + extraSpacing;
};

const capitalizeName = (name: string): string => {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .split(/\s+/)
    .map(word => {
      // Handle hyphenated names
      return word.split('-').map(part => {
        if (part.length === 0) return part;
        return part.charAt(0).toUpperCase() + part.slice(1);
      }).join('-');
    })
    .join(' ');
};

// Text normalization function to fix Unicode and spacing issues
const normalizeText = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  
  // Aggressive normalization to prevent character spacing issues
  let normalized = text;
  
  // Remove all problematic Unicode control characters
  normalized = normalized.replace(/[\u200B-\u200D\u2060\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069\uFEFF]/g, '');
  
  // Convert all Unicode spaces to regular ASCII space
  normalized = normalized.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ');
  
  // Replace problematic dashes and hyphens
  normalized = normalized.replace(/[\u2010-\u2014\u2212\u2015]/g, '-');
  
  // Replace bullets and similar characters
  normalized = normalized.replace(/[\u2022\u2023\u25E6\u2043\u2219\u00B7]/g, '*');
  
  // Fix quotes and apostrophes - be more aggressive
  normalized = normalized.replace(/[\u2018\u2019\u201A\u2039\u203A]/g, "'");
  normalized = normalized.replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"');
  
  // Fix the specific problematic sequence "!' " that appears in "R1 !' R2"
  normalized = normalized.replace(/!\s*[''"]\s*/g, "! ");
  normalized = normalized.replace(/[''"]\s*!\s*/g, "! ");
  
  // Remove any remaining non-ASCII punctuation that might cause issues
  normalized = normalized.replace(/[\u2026]/g, '...');
  
  // Clean up any remaining problematic character combinations
  normalized = normalized.replace(/([A-Z0-9])\s*[!]\s*['"]\s*([A-Z0-9])/g, '$1 ! $2');
  
  // Collapse multiple spaces and clean up
  normalized = normalized.replace(/\s{2,}/g, ' ');
  
  return normalized.trim();
};

// Function to render text with inline bold numbered labels
const renderTextWithBoldLabels = (pdf: jsPDF, text: string, currentY: number, options: any = {}): number => {
  const { margin } = pdfTheme.spacing;
  const { pageWidth } = pdfTheme.layout;
  const leftIndent = options.indent || 10;
  const maxWidth = pageWidth - (margin * 2) - leftIndent - 5;
  const startX = margin + leftIndent;
  
  // Clean and sanitize the text first
  const sanitizedText = sanitizeText(text);
  
  // Set base font properties
  pdf.setFontSize(options.fontSize || pdfTheme.fonts.sizes.body);
  
  // Split text by numbered labels while preserving them
  const parts = sanitizedText.split(/(\d+\))/);
  
  let currentX = startX;
  let currentLineY = currentY;
  let wordsOnCurrentLine: string[] = [];
  
  const lineHeight = pdfTheme.spacing.lineHeight;
  
  // Ensure we have space for at least one line
  currentLineY = ensurePageSpace(pdf, currentLineY, lineHeight);
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part.trim()) continue;
    
    const isNumberedLabel = /^\d+\)$/.test(part);
    
    if (isNumberedLabel) {
      // Render numbered label in bold
      setTextFont(pdf, options.locale || 'en', 'bold');
      const labelText = part + ' ';
      const labelWidth = pdf.getTextWidth(labelText);
      
      // Check if label fits on current line
      if (currentX + labelWidth > startX + maxWidth && currentX > startX) {
        // Move to next line
        currentLineY += lineHeight;
        currentLineY = ensurePageSpace(pdf, currentLineY, lineHeight);
        currentX = startX;
      }
      
      pdf.text(labelText, currentX, currentLineY);
      currentX += labelWidth;
      
    } else {
      // Render regular text in normal font
      setTextFont(pdf, options.locale || 'en', options.weight || 'normal');
      const words = part.trim().split(/\s+/);
      
      for (const word of words) {
        if (!word) continue;
        
        const wordText = (currentX > startX ? ' ' : '') + word;
        const wordWidth = pdf.getTextWidth(wordText);
        
        // Check if word fits on current line
        if (currentX + wordWidth > startX + maxWidth && currentX > startX) {
          // Move to next line
          currentLineY += lineHeight;
          currentLineY = ensurePageSpace(pdf, currentLineY, lineHeight);
          currentX = startX;
          pdf.text(word, currentX, currentLineY);
          currentX += pdf.getTextWidth(word);
        } else {
          pdf.text(wordText, currentX, currentLineY);
          currentX += wordWidth;
        }
      }
    }
  }
  
  return currentLineY + lineHeight + (options.extraSpacing || 0);
};

// Alternative text rendering for problematic text
const renderTextSafely = (pdf: jsPDF, text: string, x: number, y: number): void => {
  try {
    // Split into individual words and render separately to avoid spacing issues
    const words = text.split(' ');
    let currentX = x;
    const spaceWidth = pdf.getTextWidth(' ');
    
    words.forEach((word, index) => {
      if (word.trim()) {
        pdf.text(word, currentX, y);
        currentX += pdf.getTextWidth(word);
        if (index < words.length - 1) {
          currentX += spaceWidth;
        }
      }
    });
  } catch (e) {
    // Fallback to regular text rendering
    pdf.text(text, x, y);
  }
};


// Page space checking function
const ensurePageSpace = (pdf: jsPDF, currentY: number, blockHeight: number): number => {
  const { margin } = pdfTheme.spacing;
  const { pageHeight } = pdfTheme.layout;
  
  // Leave more space for footer (add 20mm buffer)
  const footerSpace = 20;
  
  if (currentY + blockHeight > pageHeight - margin - footerSpace) {
    pdf.addPage();
    drawPageFrame(pdf);
    return margin + 35; // Start with proper margin from top after header
  }
  return currentY;
};

// Check if header and content can fit on same page
const ensureHeaderAndContentTogether = (pdf: jsPDF, currentY: number, headerHeight: number, contentPreviewHeight: number): number => {
  const { margin } = pdfTheme.spacing;
  const { pageHeight } = pdfTheme.layout;
  const footerSpace = 20;
  
  // If header + some content won't fit, start a new page
  if (currentY + headerHeight + Math.min(contentPreviewHeight, 30) > pageHeight - margin - footerSpace) {
    pdf.addPage();
    drawPageFrame(pdf);
    return margin + 35;
  }
  return currentY;
};

// Layout helper functions
const drawPageFrame = (pdf: jsPDF) => {
  const { margin } = pdfTheme.spacing;
  const { pageWidth, pageHeight, borderWidth } = pdfTheme.layout;
  
  pdf.setDrawColor(pdfTheme.colors.border);
  pdf.setLineWidth(borderWidth);
  pdf.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);
};

// Helper function to convert hex color to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

// Cache for the logo data URL
let logoDataUrl: string | null = null;

// Function to load the logo as data URL (cached)
const loadLogoDataUrl = async (): Promise<string> => {
  if (logoDataUrl) return logoDataUrl;
  
  try {
    const response = await fetch(athleteLogoUrl);
    const blob = await response.blob();
    
    logoDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    
    return logoDataUrl;
  } catch (error) {
    console.log('Error loading logo:', error);
    throw error;
  }
};

// Function to add Athlete360 logo to PDF header
const addLogoToHeader = async (pdf: jsPDF, x: number, y: number, width: number, height: number) => {
  try {
    // Load the actual provided Athlete360 logo
    const dataUrl = await loadLogoDataUrl();
    
    // Add the real logo to the PDF
    pdf.addImage(dataUrl, 'PNG', x, y, width, height, undefined, 'FAST');
  } catch (error) {
    console.log('Logo could not be added to PDF:', error);
    // Fallback to text if logo loading fails
    try {
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      pdf.text('Athlete360', x + 5, y + 12);
    } catch (e) {
      // Even fallback failed, but don't break PDF generation
    }
  }
};

const drawHeaderBar = async (pdf: jsPDF, title: string, subtitle: string) => {
  const { margin } = pdfTheme.spacing;
  const { pageWidth } = pdfTheme.layout;
  
  // Normalize text and calculate text width for wrapping (leave space for logo)
  const normalizedTitle = normalizeText(title);
  const logoSpace = 60; // Reserve space for logo on the right
  const headerTextWidth = pageWidth - 2 * margin - 20 - logoSpace - 10; // Extra safety margin to prevent overflow
  
  // Split title to fit within header bar - use locale if provided globally
  setTextFont(pdf, (globalThis as any).__pdfLocale || 'en', 'bold');
  pdf.setFontSize(pdfTheme.fonts.sizes.header);
  const titleLines = pdf.splitTextToSize(normalizedTitle, headerTextWidth);
  
  // Calculate header bar height based only on title lines (no subtitle)
  const lineHeight = 6;
  const baseHeight = 35; // Much taller header
  const headerHeight = baseHeight + (titleLines.length * lineHeight);
  
  // Dark blue header rectangle to match logo background - full width
  const headerColor = pdfTheme.colors.headerBg;
  const rgb = hexToRgb(headerColor);
  pdf.setFillColor(rgb.r, rgb.g, rgb.b);
  pdf.rect(0, 0, pageWidth, headerHeight, 'F');
  
  // Add Athlete360 logo in the center top of header
  try {
    const logoWidth = 50;
    const logoHeight = 20;
    // Center logo horizontally
    const logoX = (pageWidth - logoWidth) / 2;
    // Position logo in upper part of header
    const logoY = 5;
    
    // Add the actual provided logo
    await addLogoToHeader(pdf, logoX, logoY, logoWidth, logoHeight);
  } catch (error) {
    console.log('Logo could not be added to PDF');
  }
  
  // White text on dark background
  pdf.setTextColor(255, 255, 255);
  
  // Draw title lines on the left but vertically centered
  setTextFont(pdf, (globalThis as any).__pdfLocale || 'en', 'bold');
  pdf.setFontSize(pdfTheme.fonts.sizes.header);
  
  // Position text below the logo and center it horizontally
  let currentY = 30; // Start below the logo
  
  titleLines.forEach((line: string) => {
    const textWidth = pdf.getTextWidth(line);
    const centeredX = (pageWidth - textWidth) / 2;
    pdf.text(line, centeredX, currentY); // Center aligned below logo
    currentY += lineHeight;
  });
  
  // Reset text color
  pdf.setTextColor(pdfTheme.colors.text);
};

const addFooter = (pdf: jsPDF, pageNum: number, totalPages?: number) => {
  const { margin } = pdfTheme.spacing;
  const { pageHeight, pageWidth } = pdfTheme.layout;
  
  setTextFont(pdf, (globalThis as any).__pdfLocale || 'en', 'normal');
  pdf.setFontSize(pdfTheme.fonts.sizes.small);
  pdf.setTextColor(pdfTheme.colors.secondary);
  
  const footerY = pageHeight - margin + 5;
  
  // Add generation date on the left
  const generationDate = new Date().toLocaleDateString();
  pdf.text(`Generated on ${generationDate}`, margin, footerY);
  
  // Center the page number
  const pageText = totalPages ? `Page ${pageNum} of ${totalPages}` : `Page ${pageNum}`;
  const pageTextWidth = pdf.getTextWidth(pageText);
  const centerX = (pageWidth - pageTextWidth) / 2;
  pdf.text(pageText, centerX, footerY);
  
  // Add "Generated by Athlete360" on the right
  const brandingText = "Generated by Athlete360";
  const brandingTextWidth = pdf.getTextWidth(brandingText);
  const rightX = pageWidth - margin - brandingTextWidth;
  pdf.text(brandingText, rightX, footerY);
  
  // Reset text color
  pdf.setTextColor(pdfTheme.colors.text);
};


const addSectionHeader = (pdf: jsPDF, title: string, currentY: number, estimatedContentHeight: number = 40): number => {
  const normalizedTitle = normalizeText(title);
  const { margin } = pdfTheme.spacing;
  
  // Calculate header height including underline and spacing
  const headerHeight = pdfTheme.fonts.sizes.subheader + pdfTheme.spacing.sectionGap + 5;
  
  // Ensure header and some content stay together
  currentY = ensureHeaderAndContentTogether(pdf, currentY, headerHeight, estimatedContentHeight);
  
  setTextFont(pdf, (globalThis as any).__pdfLocale || 'en', 'bold');
  pdf.setFontSize(pdfTheme.fonts.sizes.subheader);
  pdf.setTextColor(pdfTheme.colors.text);
  
  // Position header with proper margins
  const xPosition = margin + 5;
  pdf.text(normalizedTitle, xPosition, currentY);
  
  // Add underline that respects margins
  const textWidth = pdf.getTextWidth(normalizedTitle);
  const maxLineWidth = pdfTheme.layout.pageWidth - (margin * 2) - 10;
  const lineWidth = Math.min(textWidth, maxLineWidth);
  
  pdf.setDrawColor(pdfTheme.colors.text);
  pdf.setLineWidth(0.5);
  pdf.line(xPosition, currentY + 2, xPosition + lineWidth, currentY + 2);
  
  return currentY + pdfTheme.spacing.sectionGap;
};


// Data extraction functions
const extractAthleteInfo = (data: any, athleteName?: string) => {
  let athleteInfo = {
    name: '',
    country: '',
    sport: '',
    rank: '',
    achievements: [] as any[]
  };

  if (data.data) {
    const bioData = data.data;
    athleteInfo.name = capitalizeName(bioData.personalInfo?.name || bioData.name || '');
    athleteInfo.country = bioData.personalInfo?.nationality || bioData.nationality || bioData.country || '';
    athleteInfo.sport = bioData.personalInfo?.sport || bioData.sport || '';
    athleteInfo.rank = bioData.personalInfo?.worldRanking || bioData.worldRanking || bioData.rank || '';
    athleteInfo.achievements = bioData.personalInfo?.majorAchievements || bioData.majorAchievements || bioData.achievements || [];
  } else if (data.athlete_name || data.nationality || data.sport) {
    athleteInfo.name = capitalizeName(data.athlete_name || '');
    athleteInfo.country = data.nationality || '';
    athleteInfo.sport = data.sport || '';
  }

  // Check for additional possible locations of sport information
  if (!athleteInfo.sport) {
    athleteInfo.sport = data.sport || data.athleteSport || '';
  }

  // Check for additional possible locations of country information  
  if (!athleteInfo.country) {
    athleteInfo.country = data.country || data.nationality || '';
  }

  // Check structured fields first for ranking information
  if (!athleteInfo.rank) {
    athleteInfo.rank = data.resultData?.rank || 
                      data.ranking?.currentRank || 
                      data.rank || 
                      data.currentStatus?.rank || 
                      '';
  }

  // Extract rank from bio text if not found in structured data
  if (!athleteInfo.rank) {
    // Build candidate text from any available fields
    const candidateText = data.resultData?.bio || 
                         data.data?.resultData?.bio || 
                         data.data?.bio || 
                         data.bio || '';
    
    if (candidateText) {
      // Sanitize the text before pattern matching
      const sanitizedText = sanitizeText(candidateText);
      
      console.log('DEBUG: Looking for rank in text snippet:', sanitizedText.substring(0, 200));
      
      // Look for ranking patterns with robust regex patterns
      const rankPatterns = [
        /Career\s*Rank\s*[:#]?\s*#?\s*(\d+)/i,
        /Career\s*Ranking\s*[:#]?\s*#?\s*(\d+)/i,
        /\b(World|Global|National)\s*(No\.?|Rank)\s*[:#]?\s*#?\s*(\d+)/i,
        /\bRank\s*[:#]?\s*#?\s*(\d+)\b/i,
        /No\.?\s*(\d+)\b/i,
        /ranking.*?(\d+(?:,\d+)*)/i,
        /ranked.*?(\d+(?:,\d+)*)/i,
        /position.*?(\d+(?:,\d+)*)/i
      ];
      
      for (const pattern of rankPatterns) {
        const match = sanitizedText.match(pattern);
        if (match) {
          // Extract the rank number (could be in capture group 1 or 3 depending on pattern)
          const rankNumber = match[3] || match[1];
          if (rankNumber) {
            athleteInfo.rank = rankNumber;
            console.log('DEBUG: Found rank:', rankNumber, 'using pattern:', pattern);
            break;
          }
        }
      }
    }
  }

  // Use the athleteName parameter as fallback if name is still empty
  if (!athleteInfo.name && athleteName) {
    athleteInfo.name = capitalizeName(athleteName);
  }

  return athleteInfo;
};

const extractCompetitions = (data: any) => {
  let competitions: any[] = [];
  
  if (data.career_phases && Array.isArray(data.career_phases)) {
    data.career_phases.forEach((phase: any) => {
      if (phase.key_achievements && Array.isArray(phase.key_achievements)) {
        phase.key_achievements.forEach((achievement: any) => {
          competitions.push({
            year: achievement.year || '',
            event: achievement.event_name || achievement.competition || '',
            result: achievement.result || achievement.medal || '',
            tier: achievement.event_tier || '',
            notes: achievement.notes || ''
          });
        });
      }
    });
  }
  
  return competitions;
};

const parseBioSections = (bioText: string) => {
  if (!bioText) return {};
  
  const sections: any = {};
  
  // Look for introduction - capture multiple paragraphs until we hit a section header
  const lines = bioText.split('\n');
  let introLines = [];
  let foundSectionBreak = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Stop if we hit a clear section header (like "Career Record", "Recent Competitions", etc.)
    if (line.match(/^(Career Record|Recent Competitions|Notable Achievements|Rankings|Competition History):/i)) {
      foundSectionBreak = true;
      break;
    }
    
    // Add non-empty lines to introduction
    if (line) {
      introLines.push(line);
    } else if (introLines.length > 0) {
      // Add paragraph breaks but continue collecting
      introLines.push('');
    }
  }
  
  if (introLines.length > 0) {
    sections.introduction = introLines.join('\n').trim();
  }
  
  // Look for Player's Story section - search for the specific content pattern
  const storyPattern = /has emerged as a dedicated and talented[\s\S]*?rising athlete in Taekwondo/i;
  const storyMatch = bioText.match(storyPattern);
  if (storyMatch) {
    sections.overallStory = storyMatch[0].trim();
  } else {
    // Alternative: look for Player's Story header
    const headerMatch = bioText.match(/Player['']?s Story[\s\S]*?\n([\s\S]*?)(?:\n\n[A-Z]|$)/i);
    if (headerMatch) {
      sections.overallStory = headerMatch[1].trim();
    }
  }
  
  // Look for career record section
  const careerMatch = bioText.match(/career record|rankings|record/i);
  if (careerMatch) {
    const careerText = bioText.substring(careerMatch.index || 0);
    const endMatch = careerText.match(/\n\n/);
    sections.careerRecord = endMatch ? careerText.substring(0, endMatch.index) : careerText;
  }
  
  // Look for notable achievements section - search for specific patterns
  let achievementsText = '';
  
  // Look for "Gold Medal in an Open Tournament" pattern
  const goldMedalMatch = bioText.match(/Gold Medal in an Open Tournament/i);
  if (goldMedalMatch) {
    achievementsText = 'Gold Medal in an Open Tournament';
  }
  
  // Alternative: look for Notable Achievements header
  const achievementsHeaderMatch = bioText.match(/Notable Achievements?:\s*([\s\S]*?)(?:\n\n[A-Z]|$)/i);
  if (achievementsHeaderMatch && !achievementsText) {
    achievementsText = achievementsHeaderMatch[1].trim();
  }
  
  if (achievementsText) {
    sections.notableAchievements = achievementsText;
  }
  
  return sections;
};

// Specific PDF generators
const generateBioPDF = (pdf: jsPDF, data: any, athleteName?: string): number => {
  let currentY = 60;
  
  const athleteInfo = extractAthleteInfo(data, athleteName);
  const bio = data.data?.bio || data.bio || '';
  const bioSections = parseBioSections(bio);
  
  // Athlete Information Section
  currentY = addSectionHeader(pdf, 'Athlete Information', currentY);
  
  if (athleteInfo.name) {
    currentY = addTextWithBoldLabel(pdf, 'Name:', athleteInfo.name, currentY, { indent: 10 });
  }
  currentY = addTextWithBoldLabel(pdf, 'Sport:', athleteInfo.sport || 'N/A', currentY, { indent: 10 });
  currentY = addTextWithBoldLabel(pdf, 'Country:', athleteInfo.country || 'N/A', currentY, { indent: 10 });
  
  currentY += pdfTheme.spacing.sectionGap;
  
  // Current Status Section
  currentY = addSectionHeader(pdf, 'Current Status', currentY);
  
  // Determine active/inactive status based on data
  const isActive = data.data?.active_period?.end_year === "September 2025" || 
                   data.data?.active_period?.end_year === "Present" ||
                   data.active_period?.end_year === "September 2025" ||
                   data.active_period?.end_year === "Present" ||
                   !data.data?.active_period?.end_year ||
                   !data.active_period?.end_year;
  
  const statusText = isActive ? "Active" : "Inactive";
  currentY = addTextWithBoldLabel(pdf, 'Status:', statusText, currentY, { indent: 10 });
  
  if (athleteInfo.rank) {
    currentY = addTextWithBoldLabel(pdf, 'Current Rank:', athleteInfo.rank, currentY, { indent: 10 });
  }
  
  currentY += pdfTheme.spacing.sectionGap;
  
  if (bioSections.introduction) {
    currentY = addSectionHeader(pdf, 'Introduction', currentY);
    currentY = addText(pdf, bioSections.introduction, currentY, { 
      indent: 10,
      extraSpacing: pdfTheme.spacing.paragraphGap 
    });
  }
  
  // Player's Story
  if (bioSections.overallStory) {
    currentY = addSectionHeader(pdf, 'Player\'s Story', currentY);
    currentY = addText(pdf, bioSections.overallStory, currentY, { 
      indent: 10,
      extraSpacing: pdfTheme.spacing.paragraphGap 
    });
  }
  
  // Notable Achievements from bio text
  if (bioSections.notableAchievements) {
    currentY = addSectionHeader(pdf, 'Notable Achievements', currentY);
    currentY = addText(pdf, bioSections.notableAchievements, currentY, { 
      indent: 10,
      extraSpacing: pdfTheme.spacing.paragraphGap 
    });
  }
  
  // Major Achievements from athlete data
  if (athleteInfo.achievements && athleteInfo.achievements.length > 0) {
    currentY = addSectionHeader(pdf, 'Major Achievements', currentY);
    
    athleteInfo.achievements.forEach((achievement: any) => {
      const achievementText = typeof achievement === 'string' ? achievement : 
        `${achievement.year || ''} - ${achievement.event || achievement.competition || ''}: ${achievement.result || achievement.medal || ''}`;
      currentY = addText(pdf, `• ${achievementText}`, currentY, { indent: 15 });
    });
  }
  
  return currentY;
};

const generateRankPDF = (pdf: jsPDF, data: any, athleteName?: string): number => {
  let currentY = 60;
  
  try {
    const athleteInfo = extractAthleteInfo(data, athleteName);
    
    // Athlete Information
    currentY = addSectionHeader(pdf, 'Athlete Information', currentY);
    
    if (athleteInfo.name) {
      currentY = addTextWithBoldLabel(pdf, 'Name:', athleteInfo.name, currentY, { indent: 10 });
    }
    currentY = addTextWithBoldLabel(pdf, 'Sport:', athleteInfo.sport || 'N/A', currentY, { indent: 10 });
    currentY = addTextWithBoldLabel(pdf, 'Country:', athleteInfo.country || 'N/A', currentY, { indent: 10 });
    
    currentY += pdfTheme.spacing.sectionGap;
    
    // Career Phases with individual tables for each phase
    if (data.career_phases && Array.isArray(data.career_phases)) {
      currentY = addSectionHeader(pdf, 'Career Phases & Competition History', currentY);
      
      data.career_phases.forEach((phase: any, phaseIndex: number) => {
        if (phase.period && phase.phase_name) {
          
          // Check if we have competitions data for this phase
          if (phase.key_achievements && Array.isArray(phase.key_achievements) && phase.key_achievements.length > 0) {
            // Calculate total space needed for header + table
            const phaseHeaderHeight = 25; // Approximate height for phase header and description
            const rowHeight = 12;
            const tableHeaderHeight = 14;
            const tableHeight = tableHeaderHeight + (phase.key_achievements.length * rowHeight);
            const totalNeededSpace = phaseHeaderHeight + tableHeight;
            const remainingPageSpace = pdfTheme.layout.pageHeight - currentY - pdfTheme.spacing.margin;
            
            // If header + table won't fit, move to new page BEFORE adding header
            if (totalNeededSpace > remainingPageSpace) {
              pdf.addPage();
              
              // Draw page border on new page
              pdf.setDrawColor(pdfTheme.colors.border);
              pdf.setLineWidth(pdfTheme.layout.borderWidth);
              pdf.rect(
                pdfTheme.spacing.margin, 
                pdfTheme.spacing.margin, 
                pdfTheme.layout.pageWidth - (pdfTheme.spacing.margin * 2), 
                pdfTheme.layout.pageHeight - (pdfTheme.spacing.margin * 2)
              );
              
              currentY = 40; // Start near top of new page
            }
          }
          
          // Phase header (now guaranteed to be on same page as table)
          currentY = addText(pdf, `${phase.period}: ${phase.phase_name}`, currentY, { 
            weight: 'bold', 
            fontSize: pdfTheme.fonts.sizes.subheader,
            indent: 10,
            extraSpacing: 3
          });
          
          if (phase.description) {
            currentY = addText(pdf, phase.description, currentY, { 
              indent: 15,
              extraSpacing: 5
            });
          }
          
          // Generate manual table for this phase's competitions
          if (phase.key_achievements && Array.isArray(phase.key_achievements) && phase.key_achievements.length > 0) {
            try {
              
              // Table configuration - centered table that respects page borders
              const columnWidths = [18, 85, 35, 37]; // Year, Event, Result, Tier - totals 175
              const tableWidth = columnWidths.reduce((a, b) => a + b, 0);
              const pageWidth = pdfTheme.layout.pageWidth;
              const tableStartX = (pageWidth - tableWidth) / 2; // Center the table
              const rowHeight = 12; // Slightly taller rows
              const headerHeight = 14;
              
              const actualTableStartY = currentY;
              
              // Draw table header - match main header color
              const headerRgb = hexToRgb(pdfTheme.colors.headerBg);
              pdf.setFillColor(headerRgb.r, headerRgb.g, headerRgb.b);
              pdf.rect(tableStartX, actualTableStartY, columnWidths.reduce((a, b) => a + b, 0), headerHeight, 'F');
              
              // Header text
              pdf.setTextColor(255, 255, 255); // White text
              pdf.setFont(pdfTheme.fonts.primary, 'bold');
              pdf.setFontSize(9);
              
              let headerX = tableStartX + 2;
              pdf.text(normalizeText('Year'), headerX, actualTableStartY + 8);
              headerX += columnWidths[0];
              pdf.text(normalizeText('Event'), headerX, actualTableStartY + 8);
              headerX += columnWidths[1];
              pdf.text(normalizeText('Result'), headerX, actualTableStartY + 8);
              headerX += columnWidths[2];
              pdf.text(normalizeText('Tier'), headerX, actualTableStartY + 8);
              
              // Reset text color for table content
              pdf.setTextColor(0, 0, 0);
              pdf.setFont(pdfTheme.fonts.primary, 'normal');
              pdf.setFontSize(8);
              
              let currentRowY = actualTableStartY + headerHeight;
              
              // Draw table rows
              phase.key_achievements.forEach((achievement: any, index: number) => {
                const rawRowData = [
                  normalizeText(String(achievement.year || '')),
                  normalizeText(String(achievement.event_name || '')),
                  normalizeText(String(achievement.result || '')),
                  normalizeText(String(achievement.event_tier || ''))
                ];
                
                // Fit text to column widths
                const rowData = rawRowData.map((text, colIndex) => {
                  const maxWidth = columnWidths[colIndex] - 4; // Account for padding
                  const lines = pdf.splitTextToSize(text, maxWidth);
                  return lines.length > 1 ? lines[0] : text; // Use first line if wrapped
                });
                
                // Alternate row background
                if (index % 2 === 1) {
                  pdf.setFillColor(240, 240, 240); // Light gray
                  pdf.rect(tableStartX, currentRowY, columnWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
                }
                
                // Draw cell borders
                pdf.setDrawColor(200, 200, 200);
                pdf.setLineWidth(0.2);
                let cellX = tableStartX;
                columnWidths.forEach((width, colIndex) => {
                  pdf.rect(cellX, currentRowY, width, rowHeight);
                  cellX += width;
                });
                
                // Add text content with proper positioning
                let textX = tableStartX + 2;
                rowData.forEach((text, colIndex) => {
                  // Center text vertically in cell
                  pdf.text(text, textX, currentRowY + (rowHeight / 2) + 2);
                  textX += columnWidths[colIndex];
                });
                
                currentRowY += rowHeight;
              });
              
              // Draw table border
              pdf.setDrawColor(0, 0, 0);
              pdf.setLineWidth(0.5);
              pdf.rect(tableStartX, actualTableStartY, columnWidths.reduce((a, b) => a + b, 0), headerHeight + (phase.key_achievements.length * rowHeight));
              
              currentY = currentRowY + 5;
              
            } catch (tableError) {
              currentY = addText(pdf, `• Competition data for ${phase.period} could not be displayed`, currentY, { indent: 15 });
              currentY += 5;
            }
          } else {
            currentY = addText(pdf, '• No competitions recorded for this phase', currentY, { indent: 15 });
            currentY += 5;
          }
          
          // Add spacing between phases
          if (phaseIndex < data.career_phases.length - 1) {
            currentY += pdfTheme.spacing.sectionGap;
          }
        }
      });
    } else {
      currentY = addText(pdf, 'No career phase information available.', currentY, { indent: 10 });
    }
    
  } catch (error) {
    console.error('Rank PDF generation error:', error);
    currentY = addText(pdf, 'Error generating competitive history report.', currentY, { indent: 10 });
  }
  
  return currentY;
};

const generateStrengthsPDF = (pdf: jsPDF, data: any, athleteName?: string): number => {
  let currentY = 60;
  
  const athleteInfo = extractAthleteInfo(data, athleteName);
  
  // Athlete Information
  currentY = addSectionHeader(pdf, 'Athlete Information', currentY);
  
  if (athleteInfo.name) {
    currentY = addTextWithBoldLabel(pdf, 'Name:', athleteInfo.name, currentY, { indent: 10 });
  }
  currentY = addTextWithBoldLabel(pdf, 'Sport:', athleteInfo.sport || 'N/A', currentY, { indent: 10 });
  currentY = addTextWithBoldLabel(pdf, 'Country:', athleteInfo.country || 'N/A', currentY, { indent: 10 });
  
  currentY += pdfTheme.spacing.sectionGap;
  
  // Strengths Analysis
  let strengths: any[] = [];
  
  if (Array.isArray(data.strengths)) {
    strengths = data.strengths;
  } else if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      strengths = parsed.strengths || [];
    } catch (e) {
      // Handle parsing error
    }
  }
  
  if (strengths.length > 0) {
    currentY = addSectionHeader(pdf, 'Strengths Analysis', currentY, 80);
    
    strengths.forEach((strength: any, index: number) => {
      // Estimate content height for this strength
      const strengthTitle = `${index + 1}. ${strength.title || strength.name || 'Strength'}`;
      const titleHeight = pdfTheme.spacing.lineHeight * 2;
      const descriptionHeight = strength.description ? pdfTheme.spacing.lineHeight * 3 : 0;
      const evidenceHeight = (strength.evidence && Array.isArray(strength.evidence)) ? 
        pdfTheme.spacing.lineHeight * (strength.evidence.length + 1) : 0;
      const estimatedContentHeight = titleHeight + descriptionHeight + evidenceHeight + 20;
      
      // Ensure strength title and content stay together
      currentY = ensureHeaderAndContentTogether(pdf, currentY, titleHeight, estimatedContentHeight);
      
      currentY = addText(pdf, strengthTitle, currentY, { 
        weight: 'bold',
        indent: 10,
        fontSize: pdfTheme.fonts.sizes.body + 1
      });
      
      if (strength.description) {
        currentY = addText(pdf, strength.description, currentY, { indent: 15 });
      }
      
      if (strength.evidence && Array.isArray(strength.evidence)) {
        currentY = addText(pdf, 'Evidence:', currentY, { weight: 'bold', indent: 15 });
        strength.evidence.forEach((evidence: any) => {
          const evidenceText = typeof evidence === 'string' ? evidence : evidence.description || evidence.text || '';
          currentY = addText(pdf, `• ${evidenceText}`, currentY, { indent: 20 });
        });
      }
      
      currentY += pdfTheme.spacing.paragraphGap;
    });
  } else {
    currentY = addText(pdf, 'No strengths data available for analysis.', currentY, { indent: 10 });
  }
  
  return currentY;
};

const generateWeaknessesPDF = (pdf: jsPDF, data: any, athleteName?: string): number => {
  let currentY = 60;
  
  const athleteInfo = extractAthleteInfo(data, athleteName);
  
  // Athlete Information
  currentY = addSectionHeader(pdf, 'Athlete Information', currentY);
  
  if (athleteInfo.name) {
    currentY = addTextWithBoldLabel(pdf, 'Name:', athleteInfo.name, currentY, { indent: 10 });
  }
  currentY = addTextWithBoldLabel(pdf, 'Sport:', athleteInfo.sport || 'N/A', currentY, { indent: 10 });
  currentY = addTextWithBoldLabel(pdf, 'Country:', athleteInfo.country || 'N/A', currentY, { indent: 10 });
  
  currentY += pdfTheme.spacing.sectionGap;
  
  // Weaknesses Analysis
  let weaknesses: any[] = [];
  
  if (Array.isArray(data.weaknesses)) {
    weaknesses = data.weaknesses;
  } else if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      weaknesses = parsed.weaknesses || [];
    } catch (e) {
      // Handle parsing error
    }
  }
  
  if (weaknesses.length > 0) {
    currentY = addSectionHeader(pdf, 'Areas for Improvement', currentY, 80);
    
    weaknesses.forEach((weakness: any, index: number) => {
      // Estimate content height for this weakness
      const weaknessTitle = `${index + 1}. ${weakness.title || weakness.name || 'Area for Improvement'}`;
      const titleHeight = pdfTheme.spacing.lineHeight * 2;
      const descriptionHeight = weakness.description ? pdfTheme.spacing.lineHeight * 3 : 0;
      const evidenceHeight = (weakness.evidence && Array.isArray(weakness.evidence)) ? 
        pdfTheme.spacing.lineHeight * (weakness.evidence.length + 1) : 0;
      const estimatedContentHeight = titleHeight + descriptionHeight + evidenceHeight + 20;
      
      // Ensure weakness title and content stay together
      currentY = ensureHeaderAndContentTogether(pdf, currentY, titleHeight, estimatedContentHeight);
      
      currentY = addText(pdf, weaknessTitle, currentY, { 
        weight: 'bold',
        indent: 10,
        fontSize: pdfTheme.fonts.sizes.body + 1
      });
      
      if (weakness.description) {
        currentY = addText(pdf, weakness.description, currentY, { indent: 15 });
      }
      
      if (weakness.evidence && Array.isArray(weakness.evidence)) {
        currentY = addText(pdf, 'Evidence:', currentY, { weight: 'bold', indent: 15 });
        weakness.evidence.forEach((evidence: any) => {
          const evidenceText = typeof evidence === 'string' ? evidence : evidence.description || evidence.text || '';
          currentY = addText(pdf, `• ${evidenceText}`, currentY, { indent: 20 });
        });
      }
      
      currentY += pdfTheme.spacing.paragraphGap;
    });
  } else {
    currentY = addText(pdf, 'No areas for improvement identified in this analysis.', currentY, { indent: 10 });
  }
  
  return currentY;
};

// Beat Strategies PDF generator
const generateBeatStrategiesPDF = (pdf: jsPDF, data: any, athleteName?: string): number => {
  let currentY = 60;
  
  const athleteInfo = extractAthleteInfo(data, athleteName);
  
  // Athlete Information
  currentY = addSectionHeader(pdf, 'Athlete Information', currentY);
  
  if (athleteInfo.name) {
    currentY = addTextWithBoldLabel(pdf, 'Name:', athleteInfo.name, currentY, { indent: 10 });
  }
  currentY = addTextWithBoldLabel(pdf, 'Sport:', athleteInfo.sport || 'N/A', currentY, { indent: 10 });
  currentY = addTextWithBoldLabel(pdf, 'Country:', athleteInfo.country || 'N/A', currentY, { indent: 10 });
  
  currentY += pdfTheme.spacing.sectionGap;
  
  // Combat Strategies Analysis
  let strategies: any[] = [];
  
  if (Array.isArray(data.strategies)) {
    strategies = data.strategies;
  } else if (data.data?.strategies && Array.isArray(data.data.strategies)) {
    strategies = data.data.strategies;
  } else if (typeof data.data === 'string') {
    try {
      const parsedData = JSON.parse(data.data);
      if (Array.isArray(parsedData.strategies)) {
        strategies = parsedData.strategies;
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }
  
  if (strategies.length > 0) {
    currentY = addSectionHeader(pdf, 'Combat Strategies', currentY, 80);
    
    strategies.forEach((strategy, index) => {
      // Estimate content height for this strategy
      const strategyTitle = `${index + 1}. ${strategy.strategy || `Strategy ${index + 1}`}`;
      const titleHeight = pdfTheme.spacing.lineHeight * 2;
      const descriptionHeight = strategy.description ? pdfTheme.spacing.lineHeight * 3 : 0;
      const estimatedContentHeight = titleHeight + descriptionHeight + 20;
      
      // Ensure strategy title and some content stay together
      currentY = ensureHeaderAndContentTogether(pdf, currentY, titleHeight, estimatedContentHeight);
      
      // Strategy name/title
      currentY = addText(pdf, strategyTitle, currentY, {
        weight: 'bold',
        indent: 10,
        fontSize: pdfTheme.fonts.sizes.body + 1
      });
      
      // Description (without label)
      if (strategy.description) {
        const cleanedDescription = sanitizeText(strategy.description);
        currentY = addText(pdf, cleanedDescription, currentY, { indent: 15 });
      }
      
      // Execution (with bold label)
      if (strategy.execution) {
        const cleanedExecution = sanitizeText(strategy.execution);
        currentY = addText(pdf, 'Execution:', currentY, { 
          indent: 15, 
          weight: 'bold'
        });
        
        // Render execution text with inline bold numbered labels
        currentY = renderTextWithBoldLabels(pdf, cleanedExecution, currentY, { indent: 20 });
      }
      
      // Success Probability & Risk Level
      const metrics = [];
      if (strategy.success_probability) {
        metrics.push(`Success Probability: ${strategy.success_probability}`);
      }
      if (strategy.risk_level) {
        metrics.push(`Risk Level: ${strategy.risk_level}`);
      }
      if (metrics.length > 0) {
        currentY = addText(pdf, metrics.join(' • '), currentY, { 
          indent: 15, 
          fontSize: pdfTheme.fonts.sizes.small,
          weight: 'bold'
        });
      }
      
      currentY += pdfTheme.spacing.paragraphGap;
    });
  } else {
    currentY = addSectionHeader(pdf, 'Combat Strategies', currentY, 50);
    currentY = addText(pdf, 'No strategic analysis data available for this athlete.', currentY, { indent: 10 });
  }
  
  return currentY;
};

// Main professional PDF generator function
export const generateProfessionalPdf = async ({
  type,
  data,
  createdAt,
  athleteName
}: {
  type: string;
  data: any;
  createdAt?: string;
  athleteName?: string;
}): Promise<Blob> => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  // Reset character spacing to prevent spacing issues
  try {
    if (typeof (pdf as any).setCharSpace === 'function') {
      (pdf as any).setCharSpace(0);
    }
  } catch (e) {
    // Ignore if setCharSpace is not available
  }
  
  // Draw page frame (border)
  drawPageFrame(pdf);
  
  // Add header with title and subtitle
  const title = getReportTitle(type);
  const subtitle = `${athleteName || 'Athlete Analysis'} • ${new Date(createdAt || Date.now()).toLocaleDateString()}`;
  await drawHeaderBar(pdf, title, subtitle);
  
  // Generate content based on type
  let finalY: number;
  switch (type) {
    case 'bio':
      finalY = generateBioPDF(pdf, data, athleteName);
      break;
    case 'rank':
      finalY = generateRankPDF(pdf, data, athleteName);
      break;
    case 'strengths':
      finalY = generateStrengthsPDF(pdf, data, athleteName);
      break;
    case 'weaknesses':
      finalY = generateWeaknessesPDF(pdf, data, athleteName);
      break;
    case 'beat':
    case 'beat-strategies':
      finalY = generateBeatStrategiesPDF(pdf, data, athleteName);
      break;
    default:
      finalY = addText(pdf, 'Analysis type not supported for PDF export.', 60);
  }
  
  // Add footer with correct page numbering
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    addFooter(pdf, i, totalPages);
  }
  
  return pdf.output('blob');
};

const generateComparisonPDF = (pdf: jsPDF, data: any, athlete1Name?: string, athlete2Name?: string, locale: string = 'en'): number => {
  let currentY = 60;
  
  // Parse comparison data
  const athlete1 = data.athlete1 || { name: athlete1Name || 'Athlete 1', country: 'Unknown', rank: "N/A" };
  const athlete2 = data.athlete2 || { name: athlete2Name || 'Athlete 2', country: 'Unknown', rank: "N/A" };
  
  // Athlete Headers - Side by side comparison
  currentY = addSectionHeader(pdf, 'Athletes Overview', currentY);
  
  // Athlete 1 Information
  currentY = addTextWithBoldLabel(pdf, 'Athlete 1:', capitalizeName(athlete1.name), currentY, { indent: 10, fontSize: pdfTheme.fonts.sizes.body + 2, locale });
  currentY = addTextWithBoldLabel(pdf, 'Country:', athlete1.country || 'N/A', currentY, { indent: 15, locale });
  currentY = addTextWithBoldLabel(pdf, 'Rank:', athlete1.rank || 'N/A', currentY, { indent: 15, locale });
  
  currentY += 10;
  
  // Athlete 2 Information  
  currentY = addTextWithBoldLabel(pdf, 'Athlete 2:', capitalizeName(athlete2.name), currentY, { indent: 10, fontSize: pdfTheme.fonts.sizes.body + 2, locale });
  currentY = addTextWithBoldLabel(pdf, 'Country:', athlete2.country || 'N/A', currentY, { indent: 15, locale });
  currentY = addTextWithBoldLabel(pdf, 'Rank:', athlete2.rank || 'N/A', currentY, { indent: 15, locale });
  
  currentY += pdfTheme.spacing.sectionGap;
  
  // 1. Overview Tab
  currentY = addSectionHeader(pdf, '1. Overview', currentY);
  if (data.overallAnalysis?.summary) {
    currentY = addText(pdf, data.overallAnalysis.summary, currentY, { indent: 10, locale });
  } else {
    currentY = addText(pdf, 'Overall analysis not available for this comparison.', currentY, { indent: 10, locale });
  }
  currentY += pdfTheme.spacing.sectionGap;
  
  // 2. Strengths Tab
  currentY = addSectionHeader(pdf, '2. Strengths', currentY);
  if (data.strengths) {
    if (data.strengths.athlete1 && data.strengths.athlete1.length > 0) {
      currentY = addTextWithBoldLabel(pdf, `${capitalizeName(athlete1.name)} Strengths:`, '', currentY, { indent: 10, locale });
      data.strengths.athlete1.forEach((strength: any, index: number) => {
        const strengthText = typeof strength === 'string' ? strength : (strength.title || strength.description);
        if (strengthText) {
          const indexText = normalizeNumbers(`${index + 1}`, locale === 'ar');
          currentY = addText(pdf, `${indexText}. ${strengthText}`, currentY, { indent: 15, locale });
        }
      });
      currentY += 10;
    }
    
    if (data.strengths.athlete2 && data.strengths.athlete2.length > 0) {
      currentY = addTextWithBoldLabel(pdf, `${capitalizeName(athlete2.name)} Strengths:`, '', currentY, { indent: 10, locale });
      data.strengths.athlete2.forEach((strength: any, index: number) => {
        const strengthText = typeof strength === 'string' ? strength : (strength.title || strength.description);
        if (strengthText) {
          const indexText = normalizeNumbers(`${index + 1}`, locale === 'ar');
          currentY = addText(pdf, `${indexText}. ${strengthText}`, currentY, { indent: 15, locale });
        }
      });
    }
  } else {
    currentY = addText(pdf, 'Strengths analysis not available for this comparison.', currentY, { indent: 10, locale });
  }
  currentY += pdfTheme.spacing.sectionGap;
  
  // 3. Weaknesses Tab
  currentY = addSectionHeader(pdf, '3. Weaknesses', currentY);
  if (data.weaknesses) {
    if (data.weaknesses.athlete1 && data.weaknesses.athlete1.length > 0) {
      currentY = addTextWithBoldLabel(pdf, `${capitalizeName(athlete1.name)} Areas for Improvement:`, '', currentY, { indent: 10, locale });
      data.weaknesses.athlete1.forEach((weakness: any, index: number) => {
        const weaknessText = typeof weakness === 'string' ? weakness : (weakness.title || weakness.description);
        if (weaknessText) {
          currentY = addText(pdf, `${index + 1}. ${weaknessText}`, currentY, { indent: 15, locale });
        }
      });
      currentY += 10;
    }
    
    if (data.weaknesses.athlete2 && data.weaknesses.athlete2.length > 0) {
      currentY = addTextWithBoldLabel(pdf, `${capitalizeName(athlete2.name)} Areas for Improvement:`, '', currentY, { indent: 10, locale });
      data.weaknesses.athlete2.forEach((weakness: any, index: number) => {
        const weaknessText = typeof weakness === 'string' ? weakness : (weakness.title || weakness.description);
        if (weaknessText) {
          currentY = addText(pdf, `${index + 1}. ${weaknessText}`, currentY, { indent: 15, locale });
        }
      });
    }
  } else {
    currentY = addText(pdf, 'Weaknesses analysis not available for this comparison.', currentY, { indent: 10, locale });
  }
  currentY += pdfTheme.spacing.sectionGap;
  
  // 4. Competition History Tab
  currentY = addSectionHeader(pdf, '4. Competition History', currentY);
  if (data.ranking) {
    if (data.ranking.competitiveEdge) {
      const advantageHolder = data.ranking.competitiveEdge === 'athlete1' ? capitalizeName(athlete1.name) :
                             data.ranking.competitiveEdge === 'athlete2' ? capitalizeName(athlete2.name) : 'Even';
      currentY = addTextWithBoldLabel(pdf, 'Ranking Advantage:', advantageHolder, currentY, { indent: 10 });
    }
    
    if (data.ranking.analysis) {
      currentY = addText(pdf, sanitizeText(data.ranking.analysis), currentY, { indent: 10 });
    }
  } else {
    currentY = addText(pdf, 'Competition history analysis not available for this comparison.', currentY, { indent: 10 });
  }
  currentY += pdfTheme.spacing.sectionGap;
  
  // 5. Head-to-Head Tab
  currentY = addSectionHeader(pdf, '5. Head-to-Head', currentY);
  if (data.headToHead) {
    if (data.headToHead.prediction) {
      let predictedWinner = 'Even Match';
      
      // Check if prediction matches athlete names
      const prediction = data.headToHead.prediction.toLowerCase();
      const athlete1NameLower = athlete1.name.toLowerCase();
      const athlete2NameLower = athlete2.name.toLowerCase();
      
      if (prediction === 'athlete1' || prediction.includes(athlete1NameLower)) {
        predictedWinner = capitalizeName(athlete1.name);
      } else if (prediction === 'athlete2' || prediction.includes(athlete2NameLower)) {
        predictedWinner = capitalizeName(athlete2.name);
      } else if (prediction === 'even' || prediction === 'tie' || prediction === 'draw') {
        predictedWinner = 'Even Match';
      } else {
        // If it's an athlete name, try to match it
        predictedWinner = capitalizeName(data.headToHead.prediction);
      }
      
      currentY = addTextWithBoldLabel(pdf, 'Predicted Winner:', predictedWinner, currentY, { indent: 10, locale });
    }
    
    if (data.headToHead.confidence) {
      const confidenceText = normalizeNumbers(`${data.headToHead.confidence}%`, locale === 'ar');
      currentY = addTextWithBoldLabel(pdf, 'Confidence:', confidenceText, currentY, { indent: 10, locale });
    }
    
    if (data.headToHead.analysis) {
      currentY = addText(pdf, sanitizeText(data.headToHead.analysis, locale), currentY, { indent: 10, locale });
    }
    
    // Key Factors
    if (data.headToHead.keyFactors) {
      currentY += 10;
      currentY = addTextWithBoldLabel(pdf, 'Key Factors:', '', currentY, { indent: 10 });
      if (Array.isArray(data.headToHead.keyFactors)) {
        data.headToHead.keyFactors.forEach((factor: string) => {
          currentY = addText(pdf, `• ${sanitizeText(factor)}`, currentY, { indent: 20 });
        });
      } else if (typeof data.headToHead.keyFactors === 'string') {
        currentY = addText(pdf, sanitizeText(data.headToHead.keyFactors), currentY, { indent: 20 });
      }
    }
    
    // Match Scenario
    if (data.headToHead.matchScenario) {
      currentY += 10;
      currentY = addTextWithBoldLabel(pdf, 'Match Scenario:', '', currentY, { indent: 10 });
      currentY = addText(pdf, sanitizeText(data.headToHead.matchScenario), currentY, { indent: 20 });
    }
    
    // Advice for Athletes
    if (data.headToHead.adviceAthlete1) {
      currentY += 10;
      currentY = addTextWithBoldLabel(pdf, `Advice for ${capitalizeName(athlete1.name)}:`, '', currentY, { indent: 10 });
      currentY = addText(pdf, sanitizeText(data.headToHead.adviceAthlete1), currentY, { indent: 20 });
    }
    
    if (data.headToHead.adviceAthlete2) {
      currentY += 10;
      currentY = addTextWithBoldLabel(pdf, `Advice for ${capitalizeName(athlete2.name)}:`, '', currentY, { indent: 10 });
      currentY = addText(pdf, sanitizeText(data.headToHead.adviceAthlete2), currentY, { indent: 20 });
    }
    
    // Historical Context
    if (data.headToHead.historicalContext) {
      currentY += 10;
      currentY = addTextWithBoldLabel(pdf, 'Historical Context:', '', currentY, { indent: 10 });
      currentY = addText(pdf, sanitizeText(data.headToHead.historicalContext), currentY, { indent: 20 });
    }
    
    // Expert Predictions
    if (data.headToHead.expertPredictions) {
      currentY += 10;
      currentY = addTextWithBoldLabel(pdf, 'Expert Predictions:', '', currentY, { indent: 10 });
      currentY = addText(pdf, sanitizeText(data.headToHead.expertPredictions), currentY, { indent: 20 });
    }
    
    // Strategic Matchup Analysis
    if (data.headToHead.strategicMatchupAnalysis) {
      currentY += 10;
      currentY = addTextWithBoldLabel(pdf, 'Strategic Matchup Analysis:', '', currentY, { indent: 10 });
      currentY = addText(pdf, sanitizeText(data.headToHead.strategicMatchupAnalysis), currentY, { indent: 20 });
    }
  } else {
    currentY = addText(pdf, 'Head-to-head analysis not available for this comparison.', currentY, { indent: 10 });
  }
  currentY += pdfTheme.spacing.sectionGap;
  
  // 6. Details Tab
  currentY = addSectionHeader(pdf, '6. Details', currentY);
  if (data.detailedAnalysis) {
    if (data.detailedAnalysis.summary) {
      currentY = addText(pdf, sanitizeText(data.detailedAnalysis.summary), currentY, { indent: 10 });
    }
    
    // Add detailed breakdown if available
    if (data.detailedAnalysis.athlete1 || data.detailedAnalysis.athlete2) {
      if (data.detailedAnalysis.athlete1) {
        currentY = addTextWithBoldLabel(pdf, `${capitalizeName(athlete1.name)} Details:`, '', currentY, { indent: 10 });
        if (data.detailedAnalysis.athlete1.physicalAttributes) {
          const attrs = data.detailedAnalysis.athlete1.physicalAttributes;
          if (attrs.height) currentY = addTextWithBoldLabel(pdf, 'Height:', attrs.height, currentY, { indent: 15 });
          if (attrs.weight) currentY = addTextWithBoldLabel(pdf, 'Weight:', attrs.weight, currentY, { indent: 15 });
          if (attrs.stance) currentY = addTextWithBoldLabel(pdf, 'Stance:', attrs.stance, currentY, { indent: 15 });
        }
        currentY += 10;
      }
      
      if (data.detailedAnalysis.athlete2) {
        currentY = addTextWithBoldLabel(pdf, `${capitalizeName(athlete2.name)} Details:`, '', currentY, { indent: 10 });
        if (data.detailedAnalysis.athlete2.physicalAttributes) {
          const attrs = data.detailedAnalysis.athlete2.physicalAttributes;
          if (attrs.height) currentY = addTextWithBoldLabel(pdf, 'Height:', attrs.height, currentY, { indent: 15 });
          if (attrs.weight) currentY = addTextWithBoldLabel(pdf, 'Weight:', attrs.weight, currentY, { indent: 15 });
          if (attrs.stance) currentY = addTextWithBoldLabel(pdf, 'Stance:', attrs.stance, currentY, { indent: 15 });
        }
      }
    }
  } else {
    currentY = addText(pdf, 'Detailed analysis not available for this comparison.', currentY, { indent: 10 });
  }
  
  return currentY;
};


export const generateComparisonReport = async (
  data: any, 
  athlete1Name?: string, 
  athlete2Name?: string, 
  locale: string = 'en'
): Promise<Blob> => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  // Set global locale context for consistent font usage
  (globalThis as any).__pdfLocale = locale;
  
  // Load Arabic fonts for Arabic locale
  if (locale === 'ar') {
    await loadArabicFonts(pdf);
  }
  
  // Reset character spacing to prevent spacing issues
  try {
    if (typeof (pdf as any).setCharSpace === 'function') {
      (pdf as any).setCharSpace(0);
    }
  } catch (e) {
    // Ignore if setCharSpace is not available
  }
  
  // Draw page frame (border)
  drawPageFrame(pdf);
  
  // Add header with title and subtitle
  const title = 'Athlete Comparison Report';
  const formattedDate = formatDateForLocale(new Date(), locale);
  const subtitle = `${capitalizeName(athlete1Name || 'Athlete 1')} vs ${capitalizeName(athlete2Name || 'Athlete 2')} • ${formattedDate}`;
  await drawHeaderBar(pdf, title, subtitle);
  
  // Generate comparison content with locale
  generateComparisonPDF(pdf, data, athlete1Name, athlete2Name, locale);
  
  // Add footer with correct page numbering
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    addFooter(pdf, i, totalPages);
  }
  
  return pdf.output('blob');
};

// Helper function to get report title
const getReportTitle = (type: string): string => {
  const titles: { [key: string]: string } = {
    bio: 'Bio Analysis Report',
    rank: 'Competitive History Report',
    strengths: 'Strengths Analysis Report',
    weaknesses: 'Areas for Improvement Report',
    development: 'Development Plan Report',
    nutrition: 'Nutrition Plan Report',
    beat: 'Combat Strategies'
  };
  
  return titles[type] || 'Analysis Report';
};
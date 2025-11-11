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

// Use the same professional PDF theme as other reports
const pdfTheme = {
  colors: {
    primary: '#000000',      // Black for text
    headerBg: '#0f1729',     // Dark blue for header background to match logo
    secondary: '#333333',    // Dark gray for subheadings
    text: '#000000',         // Black for body text
    lightGray: '#f5f5f5',    // Light gray for backgrounds
    accent: '#2563eb',       // Blue accent (minimal use)
    border: '#0f1729',       // Dark blue for page borders to match header
    dayHeaderBg: '#e6fffa',  // Light mint green for day headers
    caloriesText: '#10b981', // Green color for calories text
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

interface NutritionPlanDay {
  day: {
    date: string;
    name: string;
  };
  meals: {
    calories_intake: string;
    meal_description: string[];
  }[];
  explanation: string;
  total_calories_intake: string;
}

interface StructuredNutritionPlan {
  instructions?: string;
  days: NutritionPlanDay[];
}

interface NutritionStats {
  totalDays: number;
  totalWeeks: number;
  avgCaloriesPerDay: number;
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

// Text normalization function to fix Unicode and spacing issues
const normalizeText = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  
  // First, replace various Unicode characters with their ASCII equivalents
  let normalized = text
    .replace(/[\u2013\u2014]/g, '-')      // En dash, Em dash
    .replace(/[\u2018\u2019]/g, "'")      // Smart quotes
    .replace(/[\u201C\u201D]/g, '"')      // Smart double quotes
    .replace(/[\u00A0]/g, ' ')           // Non-breaking space
    .replace(/[\u2026]/g, '...')         // Ellipsis
    .replace(/[\u2022]/g, '*')           // Bullet
    .replace(/[\u00AE]/g, '(R)')         // Registered trademark
    .replace(/[\u00A9]/g, '(C)')         // Copyright
    .replace(/[\u2122]/g, '(TM)')        // Trademark
    .replace(/[\u00B0]/g, ' degrees')    // Degree symbol
    .replace(/[\u00BD]/g, '1/2')         // Fraction 1/2
    .replace(/[\u00BC]/g, '1/4')         // Fraction 1/4
    .replace(/[\u00BE]/g, '3/4');        // Fraction 3/4
  
  // Clean up multiple spaces and trim
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
};

// Helper to convert hex color to RGB
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

// Locale-aware translation helper
const t = (key: string, locale: string = 'en'): string => {
  try {
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

// Cache for the logo data URL
let logoDataUrl: string | null = null;

// Function to load the logo as data URL (cached)
const loadLogoDataUrl = async (): Promise<string> => {
  if (logoDataUrl) return logoDataUrl;
  
  try {
    // Convert the imported logo URL to a data URL
    logoDataUrl = await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = athleteLogoUrl;
    });
    
    return logoDataUrl;
  } catch (error) {
    console.log('Error loading logo:', error);
    throw error;
  }
};

// Function to add logo to PDF header
const addLogoToHeader = async (pdf: jsPDF, x: number, y: number, width: number, height: number) => {
  try {
    const dataUrl = await loadLogoDataUrl();
    pdf.addImage(dataUrl, 'PNG', x, y, width, height, undefined, 'FAST');
  } catch (error) {
    console.log('Logo could not be added to PDF:', error);
    try {
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      pdf.text('Athlete360', x + 5, y + 12);
    } catch (e) {
      // Even fallback failed, but don't break PDF generation
    }
  }
};

// Draw header bar with logo and title (same as main generator)
const drawHeaderBar = async (pdf: jsPDF, title: string, subtitle: string) => {
  const { margin } = pdfTheme.spacing;
  const { pageWidth } = pdfTheme.layout;
  
  // Normalize text and calculate text width for wrapping (leave space for logo)
  const normalizedTitle = normalizeText(title);
  const logoSpace = 60; // Reserve space for logo on the right
  const headerTextWidth = pageWidth - 2 * margin - 20 - logoSpace - 10; // Extra safety margin to prevent overflow
  
  // Split title to fit within header bar
  setTextFont(pdf, 'en', 'bold');
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
  
  // Add logo in the center top of header
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
  setTextFont(pdf, 'en', 'bold');
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

// Add footer (same as main generator)
const addFooter = (pdf: jsPDF, pageNum: number, totalPages?: number) => {
  const { margin } = pdfTheme.spacing;
  const { pageHeight, pageWidth } = pdfTheme.layout;
  
  setTextFont(pdf, 'en', 'normal');
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

// Check if header and content can fit on same page
const ensureHeaderAndContentTogether = (pdf: jsPDF, currentY: number, headerHeight: number, contentPreviewHeight: number): number => {
  const { margin } = pdfTheme.spacing;
  const pageHeight = pdfTheme.layout.pageHeight;
  const footerSpace = 20; // Space reserved for footer
  
  // If header + some content won't fit, start a new page
  if (currentY + headerHeight + Math.min(contentPreviewHeight, 30) > pageHeight - margin - footerSpace) {
    pdf.addPage();
    
    // Draw page border on new page
    pdf.setDrawColor(pdfTheme.colors.border);
    pdf.setLineWidth(pdfTheme.layout.borderWidth);
    pdf.rect(
      margin, 
      margin, 
      pdfTheme.layout.pageWidth - (margin * 2), 
      pageHeight - (margin * 2)
    );
    
    return margin + 35; // Start with proper margin from top after header
  }
  
  return currentY;
};

// Add section header (same as main generator)
const addSectionHeader = (pdf: jsPDF, title: string, currentY: number, estimatedContentHeight: number = 40): number => {
  const normalizedTitle = normalizeText(title);
  const { margin } = pdfTheme.spacing;
  
  // Calculate header height including underline and spacing
  const headerHeight = pdfTheme.fonts.sizes.subheader + pdfTheme.spacing.sectionGap + 5;
  
  // Ensure header and some content stay together
  currentY = ensureHeaderAndContentTogether(pdf, currentY, headerHeight, estimatedContentHeight);
  
  setTextFont(pdf, 'en', 'bold');
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

// Add styled week header with dark blue background
const addWeekHeader = (pdf: jsPDF, title: string, currentY: number, estimatedContentHeight: number = 80): number => {
  const { margin } = pdfTheme.spacing;
  const headerHeight = 20;
  
  // Ensure header and some content stay together
  currentY = ensureHeaderAndContentTogether(pdf, currentY, headerHeight, estimatedContentHeight);
  
  // Draw background rectangle
  const rgb = hexToRgb(pdfTheme.colors.headerBg);
  pdf.setFillColor(rgb.r, rgb.g, rgb.b);
  pdf.rect(margin + 5, currentY - 5, pdfTheme.layout.pageWidth - (margin * 2) - 10, headerHeight, 'F');
  
  // Add title text in white
  setTextFont(pdf, 'en', 'bold');
  pdf.setFontSize(pdfTheme.fonts.sizes.subheader);
  pdf.setTextColor(255, 255, 255); // White text
  
  const xPosition = margin + 10;
  pdf.text(title, xPosition, currentY + 5);
  
  // Reset text color to black for subsequent text
  pdf.setTextColor(pdfTheme.colors.text);
  
  return currentY + headerHeight + 5;
};

// Add styled day header with light green background (matching the image style)
const addDayHeader = (pdf: jsPDF, dayTitle: string, date: string, totalCalories: string, currentY: number): number => {
  const { margin } = pdfTheme.spacing;
  const headerHeight = 18;
  
  // Ensure header fits on page
  currentY = ensureHeaderAndContentTogether(pdf, currentY, headerHeight, 40);
  
  // Draw light green background rectangle
  const dayBgRgb = hexToRgb(pdfTheme.colors.dayHeaderBg);
  pdf.setFillColor(dayBgRgb.r, dayBgRgb.g, dayBgRgb.b);
  pdf.rect(margin + 5, currentY - 3, pdfTheme.layout.pageWidth - (margin * 2) - 10, headerHeight, 'F');
  
  // Day title on the left (black text)
  setTextFont(pdf, 'en', 'bold');
  pdf.setFontSize(pdfTheme.fonts.sizes.subheader);
  pdf.setTextColor(pdfTheme.colors.text);
  
  const leftX = margin + 10;
  pdf.text(dayTitle, leftX, currentY + 8);
  
  // Date on the top right (smaller, black text)
  setTextFont(pdf, 'en', 'normal');
  pdf.setFontSize(pdfTheme.fonts.sizes.small);
  pdf.setTextColor(pdfTheme.colors.text);
  
  const dateWidth = pdf.getTextWidth(date);
  const dateX = pdfTheme.layout.pageWidth - margin - 10 - dateWidth;
  pdf.text(date, dateX, currentY + 4);
  
  // Total calories on the right (green text)
  setTextFont(pdf, 'en', 'bold');
  pdf.setFontSize(pdfTheme.fonts.sizes.body);
  const caloriesRgb = hexToRgb(pdfTheme.colors.caloriesText);
  pdf.setTextColor(caloriesRgb.r, caloriesRgb.g, caloriesRgb.b);
  
  const caloriesText = `Total: ${totalCalories}`;
  const caloriesWidth = pdf.getTextWidth(caloriesText);
  const caloriesX = pdfTheme.layout.pageWidth - margin - 10 - caloriesWidth;
  pdf.text(caloriesText, caloriesX, currentY + 12);
  
  // Reset text color to black for subsequent text
  pdf.setTextColor(pdfTheme.colors.text);
  
  return currentY + headerHeight + 5;
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
    bypassArabicProcessing?: boolean;
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


// Main function to generate nutrition plan PDF (using standard layout)
export const generateNutritionPlanPDF = async (
  nutritionData: StructuredNutritionPlan,
  stats: NutritionStats
): Promise<Blob> => {
  const pdf = new jsPDF('portrait', 'mm', 'a4');
  
  // Draw page border first (before header so header is on top)
  pdf.setDrawColor(pdfTheme.colors.border);
  pdf.setLineWidth(pdfTheme.layout.borderWidth);
  pdf.rect(
    pdfTheme.spacing.margin,
    pdfTheme.spacing.margin,
    pdfTheme.layout.pageWidth - (pdfTheme.spacing.margin * 2),
    pdfTheme.layout.pageHeight - (pdfTheme.spacing.margin * 2)
  );
  
  // Add header with title and subtitle (on top of border)
  const title = `Personalized Nutrition Plan`;
  const subtitle = `${stats.totalDays} Days • ${stats.totalWeeks} Weeks • ${stats.avgCaloriesPerDay} Cal/Day Average`;
  
  await drawHeaderBar(pdf, title, subtitle);
  
  let currentY = pdfTheme.spacing.margin + 60; // Start below header
  
  // Add personalized instructions as first section
  if (nutritionData.instructions) {
    currentY = addSectionHeader(pdf, 'Instructions', currentY, 50);
    currentY = addText(pdf, nutritionData.instructions, currentY, {
      indent: 10,
      extraSpacing: 15
    });
  }
  
  // Group days into weeks for better organization
  const weeks: NutritionPlanDay[][] = [];
  for (let i = 0; i < nutritionData.days.length; i += 7) {
    weeks.push(nutritionData.days.slice(i, i + 7));
  }
  
  // Add each week
  weeks.forEach((weekDays, weekIndex) => {
    const weekNumber = weekIndex + 1;
    
    // Week header with dark blue background
    currentY = addWeekHeader(pdf, `Week ${weekNumber}`, currentY, 80);
    
    if (weekDays.length > 0) {
      const startDate = weekDays[0].day.date;
      const endDate = weekDays[weekDays.length - 1].day.date;
      currentY = addText(pdf, `${startDate} - ${endDate}`, currentY, {
        indent: 10,
        fontSize: pdfTheme.fonts.sizes.small,
        weight: 'bold',
        extraSpacing: 10
      });
    }
    
    // Add all days in this week
    weekDays.forEach((day, dayIndexInWeek) => {
      const overallDayNumber = (weekIndex * 7) + dayIndexInWeek + 1;
      
      // Day header with light green background (matching image style)
      const dayTitle = `Day ${overallDayNumber}: ${day.day.name}`;
      currentY = addDayHeader(pdf, dayTitle, day.day.date, day.total_calories_intake, currentY);
      
      // Meals
      day.meals.forEach((meal, mealIndex) => {
        // Meal header
        const mealTitle = `Meal ${mealIndex + 1} - ${meal.calories_intake}`;
        currentY = addText(pdf, mealTitle, currentY, {
          indent: 15,
          fontSize: pdfTheme.fonts.sizes.body,
          weight: 'bold',
          extraSpacing: 5
        });
        
        // Meal descriptions
        meal.meal_description.forEach(description => {
          currentY = addText(pdf, `• ${description}`, currentY, {
            indent: 20,
            fontSize: pdfTheme.fonts.sizes.body,
            extraSpacing: 2
          });
        });
        
        currentY += 5; // Space between meals
      });
      
      // Daily Focus/Explanation
      if (day.explanation && day.explanation.trim()) {
        currentY = addText(pdf, 'Daily Focus:', currentY, {
          indent: 10,
          fontSize: pdfTheme.fonts.sizes.body,
          weight: 'bold',
          extraSpacing: 5
        });
        
        currentY = addText(pdf, day.explanation, currentY, {
          indent: 15,
          fontSize: pdfTheme.fonts.sizes.body,
          extraSpacing: 15
        });
      }
      
      currentY += 10; // Space between days
    });
    
    currentY += 10; // Extra space between weeks
  });
  
  // Add footer to all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    addFooter(pdf, i, totalPages);
  }
  
  return pdf.output('blob');
};
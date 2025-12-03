import jsPDF from 'jspdf';
import 'jspdf-autotable';
import athleteLogoUrl from '@assets/Athlete360Logo-removebg-preview_1764432432230.png';
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
    goalHeaderBg: '#e6fffa', // Light mint green for goal headers
    exerciseText: '#10b981', // Green color for exercise details
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

interface Exercise {
  title: { en: string; ar?: string };
  description: { en: string; ar?: string };
  targetAreas: string[];
  prescription?: {
    sets?: number;
    reps?: string;
    restSec?: number;
    intensity?: string;
  };
  videoUrl?: string;
}

interface GoalArea {
  area: string;
  description: string;
  exercises: Exercise[];
}

interface GoalBasedPlan {
  version: string;
  id: string;
  title: { en: string; ar?: string };
  overview?: string;
  goalAnalysis: GoalArea[];
  exercises?: Exercise[];
  counts?: {
    goals: number;
    exercises: number;
    videos: number;
  };
  intro?: {
    overview: string;
    structure: string;
  };
}

// Helper function to convert hex color to RGB
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

// Locale-aware text sanitizer for PDF generation
const sanitizeText = (text: string, locale: string = 'en'): string => {
  if (!text || typeof text !== 'string') return '';
  
  // For Arabic locale, apply Arabic text processing
  if (locale === 'ar') {
    let arabicText = sanitizeArabicText(text);
    arabicText = processArabicText(arabicText);
    arabicText = normalizeNumbers(arabicText, true);
    return arabicText;
  }
  
  // Original sanitization for English/LTR languages
  let cleaned = text;
  
  // First normalize Unicode characters to ASCII
  cleaned = cleaned.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' '); // Unicode spaces to regular space
  cleaned = cleaned.replace(/[\uFF08\uFF09]/g, match => match === '\uFF08' ? '(' : ')'); // Full-width parentheses
  cleaned = cleaned.replace(/[\uFF3B\uFF3D]/g, match => match === '\uFF3B' ? '[' : ']'); // Full-width brackets
  cleaned = cleaned.replace(/[\uFF5B\uFF5D]/g, match => match === '\uFF5B' ? '{' : '}'); // Full-width braces
  
  // Remove URLs and unwanted patterns
  cleaned = cleaned.replace(/\([^()]*?(https?:\/\/|www\.|[\w.-]+\.[A-Za-z]{2,})[^()]*?\)/g, '');
  cleaned = cleaned.replace(/\[[^\[\]]*?(https?:\/\/|www\.|[\w.-]+\.[A-Za-z]{2,})[^\[\]]*?\]/g, '');
  cleaned = cleaned.replace(/\{[^{}]*?(https?:\/\/|www\.|[\w.-]+\.[A-Za-z]{2,})[^{}]*?\}/g, '');
  
  // Clean up remaining patterns
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.trim();
  
  return cleaned;
};

// Normalize text for consistent display
const normalizeText = (text: string): string => {
  if (!text) return '';
  return text.toString().trim();
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
    const logoData = await loadLogoDataUrl();
    pdf.addImage(logoData, 'PNG', x, y, width, height);
  } catch (error) {
    console.log('Could not add logo to PDF:', error);
    // Continue without logo
  }
};

// Standard header function (same as other PDFs)
const drawHeaderBar = async (pdf: jsPDF, title: string, subtitle: string) => {
  const { margin } = pdfTheme.spacing;
  const { pageWidth } = pdfTheme.layout;
  
  // Normalize text and calculate text width for wrapping (leave space for logo)
  const normalizedTitle = title;
  const logoSpace = 60; // Reserve space for logo on the right
  const headerTextWidth = pageWidth - 2 * margin - 20 - logoSpace - 10; // Extra safety margin to prevent overflow
  
  // Split title to fit within header bar
  setTextFont(pdf, 'en', 'bold');
  pdf.setFontSize(pdfTheme.fonts.sizes.header);
  const titleLines = pdf.splitTextToSize(normalizedTitle, headerTextWidth);
  
  // Calculate header bar height based only on title lines
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
  
  // Draw title lines centered below the logo
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

// Standard footer function (same as other PDFs)
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

// Check if content will fit on current page, add new page if needed
const checkPageBreak = (pdf: jsPDF, currentY: number, requiredHeight: number = 20): number => {
  const { margin } = pdfTheme.spacing;
  const { pageHeight } = pdfTheme.layout;
  const footerSpace = 20;
  
  if (currentY + requiredHeight > pageHeight - margin - footerSpace) {
    pdf.addPage();
    drawPageFrame(pdf);
    return margin + 35; // Start with proper margin from top after header
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

// Add section header with underline (for Overview, etc.)
const addSectionHeader = (pdf: jsPDF, title: string, currentY: number, estimatedContentHeight: number = 40): number => {
  const { margin } = pdfTheme.spacing;
  
  // Calculate header height including underline and spacing
  const headerHeight = pdfTheme.fonts.sizes.subheader + pdfTheme.spacing.sectionGap + 5;
  
  // Ensure header and some content stay together
  currentY = checkPageBreak(pdf, currentY, headerHeight + estimatedContentHeight);
  
  setTextFont(pdf, 'en', 'bold');
  pdf.setFontSize(pdfTheme.fonts.sizes.subheader);
  pdf.setTextColor(pdfTheme.colors.text);
  
  // Position header with proper margins
  const xPosition = margin + 5;
  pdf.text(title, xPosition, currentY);
  
  // Add underline that respects margins
  const textWidth = pdf.getTextWidth(title);
  const maxLineWidth = pdfTheme.layout.pageWidth - (margin * 2) - 10;
  const lineWidth = Math.min(textWidth, maxLineWidth);
  
  pdf.setDrawColor(pdfTheme.colors.text);
  pdf.setLineWidth(0.5);
  pdf.line(xPosition, currentY + 2, xPosition + lineWidth, currentY + 2);
  
  return currentY + pdfTheme.spacing.sectionGap;
};

// Add styled goal header with light green background and proper text wrapping
const addGoalHeader = (pdf: jsPDF, goalTitle: string, goalDescription: string, currentY: number): number => {
  const { margin } = pdfTheme.spacing;
  
  // Calculate the maximum width for text inside the green header
  const maxTextWidth = pdfTheme.layout.pageWidth - (margin * 2) - 20; // Extra margin inside the header
  
  // Wrap the description text to fit within the header
  setTextFont(pdf, 'en', 'normal');
  pdf.setFontSize(pdfTheme.fonts.sizes.small);
  const descriptionLines = pdf.splitTextToSize(goalDescription, maxTextWidth);
  
  // Calculate header height based on content (title + description lines + padding)
  const titleHeight = 8;
  const lineHeight = 5;
  const padding = 12; // Top and bottom padding
  const headerHeight = titleHeight + (descriptionLines.length * lineHeight) + padding;
  
  // Ensure header fits on page
  currentY = checkPageBreak(pdf, currentY, headerHeight + 30);
  
  // Draw light green background rectangle with calculated height
  const goalBgRgb = hexToRgb(pdfTheme.colors.goalHeaderBg);
  pdf.setFillColor(goalBgRgb.r, goalBgRgb.g, goalBgRgb.b);
  pdf.rect(margin + 5, currentY - 3, pdfTheme.layout.pageWidth - (margin * 2) - 10, headerHeight, 'F');
  
  // Goal title (bold, black text)
  setTextFont(pdf, 'en', 'bold');
  pdf.setFontSize(pdfTheme.fonts.sizes.subheader);
  pdf.setTextColor(pdfTheme.colors.text);
  
  const leftX = margin + 10;
  pdf.text(goalTitle, leftX, currentY + 8);
  
  // Goal description (smaller, black text, wrapped)
  setTextFont(pdf, 'en', 'normal');
  pdf.setFontSize(pdfTheme.fonts.sizes.small);
  pdf.setTextColor(pdfTheme.colors.secondary);
  
  let descY = currentY + 16;
  descriptionLines.forEach((line: string) => {
    pdf.text(line, leftX, descY);
    descY += lineHeight;
  });
  
  // Reset text color to black for subsequent text
  pdf.setTextColor(pdfTheme.colors.text);
  
  return currentY + headerHeight + 10;
};

// Add text with automatic line wrapping and page breaks
const addText = (pdf: jsPDF, text: string, y: number, options: { 
  indent?: number; 
  fontSize?: number; 
  weight?: 'normal' | 'bold';
  extraSpacing?: number;
  textColor?: string;
} = {}): number => {
  const { 
    indent = 0, 
    fontSize = pdfTheme.fonts.sizes.body, 
    weight = 'normal',
    extraSpacing = 0,
    textColor = pdfTheme.colors.text
  } = options;
  
  if (!text || text.trim() === '') return y;
  
  pdf.setFontSize(fontSize);
  setTextFont(pdf, 'en', weight);
  
  // Set text color
  if (textColor !== pdfTheme.colors.text) {
    const rgb = hexToRgb(textColor);
    pdf.setTextColor(rgb.r, rgb.g, rgb.b);
  } else {
    pdf.setTextColor(pdfTheme.colors.text);
  }
  
  let currentY = y;
  const processedText = sanitizeText(text, 'en');
  
  // Split into lines based on available width
  const maxWidth = pdfTheme.layout.pageWidth - (pdfTheme.spacing.margin * 2) - indent - 10;
  const lines = pdf.splitTextToSize(processedText, maxWidth);
  
  lines.forEach((line: string) => {
    // Check page break for each line
    currentY = checkPageBreak(pdf, currentY, pdfTheme.spacing.lineHeight);
    
    const xPosition = pdfTheme.spacing.margin + indent;
    pdf.text(line, xPosition, currentY);
    currentY += pdfTheme.spacing.lineHeight;
  });
  
  // Reset text color
  pdf.setTextColor(pdfTheme.colors.text);
  
  return currentY + extraSpacing;
};

// Helper function to get localized text with fallback
function getLocalizedText(text: { en: string; ar?: string }, language: string): string {
  if (language === 'ar' && text.ar) {
    return text.ar;
  }
  return text.en;
}

// Helper function to get exercise prescription display text
function getExercisePrescriptionText(exercise: Exercise): string {
  if (!exercise.prescription) return '';
  
  const parts: string[] = [];
  
  if (exercise.prescription.sets) {
    parts.push(`${exercise.prescription.sets} sets`);
  }
  
  if (exercise.prescription.reps) {
    parts.push(`${exercise.prescription.reps} reps`);
  }
  
  if (exercise.prescription.restSec) {
    const minutes = Math.floor(exercise.prescription.restSec / 60);
    const seconds = exercise.prescription.restSec % 60;
    if (minutes > 0) {
      parts.push(`${minutes}:${seconds.toString().padStart(2, '0')} rest`);
    } else {
      parts.push(`${seconds}s rest`);
    }
  }
  
  if (exercise.prescription.intensity) {
    parts.push(exercise.prescription.intensity);
  }
  
  return parts.join(' • ');
}

// Main function to generate development plan PDF
export const generateDevelopmentPlanPDF = async (
  planData: GoalBasedPlan,
  language: string = 'en'
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
  const title = getLocalizedText(planData.title, language);
  const subtitle = `${planData.counts?.goals || planData.goalAnalysis.length} Goal Areas • ${planData.counts?.exercises || 0} Exercises • Generated on ${new Date().toLocaleDateString()}`;
  
  await drawHeaderBar(pdf, title, subtitle);
  
  let currentY = pdfTheme.spacing.margin + 60; // Start below header
  
  // Add overview if available with underlined header and proper margins
  if (planData.intro?.overview) {
    currentY = addSectionHeader(pdf, 'Overview', currentY, 50);
    currentY = addText(pdf, planData.intro.overview, currentY, {
      indent: 5,
      extraSpacing: 15
    });
  }
  
  // Add each goal area with its exercises
  planData.goalAnalysis.forEach((goal, goalIndex) => {
    // Goal header
    currentY = addGoalHeader(pdf, goal.area, goal.description, currentY);
    
    // Add exercises for this goal
    goal.exercises.forEach((exercise, exerciseIndex) => {
      const exerciseTitle = getLocalizedText(exercise.title, language);
      const exerciseDescription = getLocalizedText(exercise.description, language);
      
      // Exercise title
      currentY = addText(pdf, `Exercise ${exerciseIndex + 1}: ${exerciseTitle}`, currentY, {
        indent: 10,
        fontSize: pdfTheme.fonts.sizes.body,
        weight: 'bold',
        extraSpacing: 3
      });
      
      // Exercise description
      currentY = addText(pdf, exerciseDescription, currentY, {
        indent: 15,
        fontSize: pdfTheme.fonts.sizes.body,
        extraSpacing: 5
      });
      
      // Exercise prescription
      const prescription = getExercisePrescriptionText(exercise);
      if (prescription) {
        currentY = addText(pdf, prescription, currentY, {
          indent: 15,
          fontSize: pdfTheme.fonts.sizes.small,
          textColor: pdfTheme.colors.exerciseText,
          extraSpacing: 5
        });
      }
      
      // Target areas
      if (exercise.targetAreas && exercise.targetAreas.length > 0) {
        currentY = addText(pdf, `Target Areas: ${exercise.targetAreas.join(', ')}`, currentY, {
          indent: 15,
          fontSize: pdfTheme.fonts.sizes.small,
          textColor: pdfTheme.colors.secondary,
          extraSpacing: 10
        });
      }
    });
    
    currentY += 10; // Extra space between goals
  });
  
  // Add footer to all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    addFooter(pdf, i, totalPages);
  }
  
  return pdf.output('blob');
};
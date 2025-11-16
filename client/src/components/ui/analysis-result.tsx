import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RankChart } from "./rank-chart";
import { VideoAnalysisResults } from "./video-analysis-results";
import { Download, Share2, User, Trophy, Star, AlertTriangle, Calendar, Swords, Video, Award, TrendingUp, Clock, Target, PlayCircle, Zap, Shield, CheckCircle, BarChart, Medal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AnalysisResultProps {
  type: string;
  data: any;
  createdAt?: string;
  shared?: boolean;
  shareUrl?: string;
  athlete?: any;
}

export function AnalysisResult({ type, data, createdAt, shared, shareUrl, athlete }: AnalysisResultProps) {
  const { toast } = useToast();

  // Utility function to parse data that might be stored as JSON strings
  const parseAnalysisData = (rawData: any) => {
    if (typeof rawData === 'string') {
      try {
        return JSON.parse(rawData);
      } catch (e) {
        return rawData;
      }
    }
    return rawData;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'bio': return <User className="text-athlete-accent" size={24} />;
      case 'rank': return <Trophy className="text-athlete-warning" size={24} />;
      case 'strengths': return <Star className="text-athlete-success" size={24} />;
      case 'weaknesses': return <AlertTriangle className="text-athlete-danger" size={24} />;
      case 'development': return <Calendar className="text-purple-400" size={24} />;

      case 'beat': return <Swords className="text-red-400" size={24} />;
      case 'video': return <Video className="text-indigo-400" size={24} />;
      default: return <User className="text-athlete-accent" size={24} />;
    }
  };

  const getTitle = (type: string) => {
    switch (type) {
      case 'bio': return 'Athlete Biography';
      case 'rank': return 'Ranking Analysis';
      case 'strengths': return 'Strengths Analysis';
      case 'weaknesses': return 'Weaknesses Analysis';
      case 'development': return 'Development Plan';

      case 'beat': return 'Beat Strategies';
      case 'video': return 'Video Analysis';
      default: return 'Analysis Result';
    }
  };

  // Professional PDF Theme System
  const pdfTheme = {
    colors: {
      black: '#000000',
      textPrimary: '#222222',
      textSecondary: '#555555',
      line: '#D9D9D9',
      accent: '#1E3A8A',
      background: '#FFFFFF'
    },
    fonts: {
      title: 16,
      h1: 14,
      h2: 12,
      body: 10,
      small: 9
    },
    spacing: {
      pageMargin: 18,
      sectionGap: 8,
      lineHeight: 5,
      headerHeight: 10
    }
  };

  const handleExport = async () => {
    toast({
      title: "Export Started",
      description: "Your PDF export is being generated...",
    });

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Parse the analysis data and extract identity info
      const parsedData = parseAnalysisData(data);
      const identity = extractIdentity(parsedData);
      
      // Generate PDF content based on analysis type
      await generateProfessionalPDF(pdf, type, parsedData, identity, createdAt);

      // Generate filename based on type and current date
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const cleanAthleteName = identity.name ? identity.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Athlete';
      const filename = `${cleanAthleteName}_${getTitle(type).replace(/\s+/g, '_')}_${dateStr}.pdf`;

      // Save the PDF
      pdf.save(filename);

      toast({
        title: "Export Successful",
        description: `PDF has been downloaded as ${filename}`,
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: "Export Failed",
        description: "There was an error generating the PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Data Extraction Functions
  const extractIdentity = (data: any) => {
    // Try multiple data paths for athlete information
    let name = '';
    let country = '';
    let sport = '';

    // Check various possible data paths
    if (data.athlete_name) name = data.athlete_name;
    if (data.nationality) country = data.nationality;
    if (data.sport) sport = data.sport;
    
    // For bio analysis, check nested data
    if (data.data && typeof data.data === 'object') {
      if (data.data.name) name = data.data.name;
      if (data.data.country) country = data.data.country;
      if (data.data.sport) sport = data.data.sport;
    }

    // Extract from bio text if available
    if (data.bio && typeof data.bio === 'string') {
      const bioMatch = data.bio.match(/(\w+(?:\s+\w+)*)\s+is a\s+(\w+)\s+athlete from\s+(\w+)/i);
      if (bioMatch) {
        name = bioMatch[1];
        sport = bioMatch[2];
        country = bioMatch[3];
      }
    }

    return { name, country, sport };
  };

  const extractRank = (data: any) => {
    let currentRank = 'N/A';
    let peakRank = 'N/A';
    
    if (data.current_ranking) currentRank = data.current_ranking;
    if (data.peak_ranking) peakRank = data.peak_ranking;
    if (data.currentRank) currentRank = data.currentRank;
    if (data.peakRank) peakRank = data.peakRank;
    
    return { currentRank, peakRank };
  };

  const extractAchievements = (data: any) => {
    let achievements: any[] = [];
    
    if (data.data && data.data.achievements && Array.isArray(data.data.achievements)) {
      achievements = data.data.achievements;
    } else if (data.achievements && Array.isArray(data.achievements)) {
      achievements = data.achievements;
    }
    
    return achievements;
  };

  const extractCareerPhases = (data: any) => {
    if (data.career_phases && Array.isArray(data.career_phases)) {
      return data.career_phases;
    }
    return [];
  };

  // PDF Layout Helper Functions
  const drawPageFrame = (pdf: jsPDF) => {
    const margin = pdfTheme.spacing.pageMargin;
    pdf.setDrawColor(pdfTheme.colors.black);
    pdf.setLineWidth(0.5);
    pdf.rect(margin - 2, margin - 2, 210 - (margin - 2) * 2, 297 - (margin - 2) * 2);
  };

  const drawHeaderBar = (pdf: jsPDF, title: string, subtitle?: string) => {
    const margin = pdfTheme.spacing.pageMargin;
    const headerHeight = pdfTheme.spacing.headerHeight;
    
    // Draw black rectangle
    pdf.setFillColor(pdfTheme.colors.black);
    pdf.rect(margin, margin, 210 - margin * 2, headerHeight, 'F');
    
    // Add white title text
    pdf.setTextColor(pdfTheme.colors.background);
    pdf.setFontSize(pdfTheme.fonts.title);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin + 5, margin + 6);
    
    // Add subtitle if provided
    if (subtitle) {
      pdf.setFontSize(pdfTheme.fonts.small);
      pdf.setFont('helvetica', 'normal');
      pdf.text(subtitle, margin + 5, margin + 8.5);
    }
    
    // Reset text color
    pdf.setTextColor(pdfTheme.colors.textPrimary);
    
    return margin + headerHeight + pdfTheme.spacing.sectionGap;
  };

  const addIdentitySection = (pdf: jsPDF, identity: any, currentY: number) => {
    const margin = pdfTheme.spacing.pageMargin;
    
    pdf.setFontSize(pdfTheme.fonts.h2);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Athlete Information', margin, currentY);
    currentY += 6;
    
    pdf.setFontSize(pdfTheme.fonts.body);
    pdf.setFont('helvetica', 'normal');
    
    if (identity.name) {
      pdf.text(`Name: ${identity.name}`, margin + 5, currentY);
      currentY += pdfTheme.spacing.lineHeight;
    }
    
    if (identity.country) {
      pdf.text(`Country: ${identity.country}`, margin + 5, currentY);
      currentY += pdfTheme.spacing.lineHeight;
    }
    
    if (identity.sport) {
      pdf.text(`Sport: ${identity.sport}`, margin + 5, currentY);
      currentY += pdfTheme.spacing.lineHeight;
    }
    
    return currentY + pdfTheme.spacing.sectionGap;
  };

  const addSection = (pdf: jsPDF, title: string, currentY: number, content?: string) => {
    const margin = pdfTheme.spacing.pageMargin;
    const maxWidth = 210 - margin * 2 - 10;
    
    // Check if we need a new page
    if (currentY > 250) {
      pdf.addPage();
      drawPageFrame(pdf);
      currentY = margin + 5;
    }
    
    pdf.setFontSize(pdfTheme.fonts.h2);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(pdfTheme.colors.textPrimary);
    pdf.text(title, margin, currentY);
    currentY += 6;
    
    if (content) {
      pdf.setFontSize(pdfTheme.fonts.body);
      pdf.setFont('helvetica', 'normal');
      
      const lines = pdf.splitTextToSize(content, maxWidth);
      for (const line of lines) {
        if (currentY > 270) {
          pdf.addPage();
          drawPageFrame(pdf);
          currentY = margin + 5;
        }
        pdf.text(line, margin + 5, currentY);
        currentY += pdfTheme.spacing.lineHeight;
      }
    }
    
    return currentY + pdfTheme.spacing.sectionGap;
  };

  const addBulletList = (pdf: jsPDF, items: string[], currentY: number) => {
    const margin = pdfTheme.spacing.pageMargin;
    const maxWidth = 210 - margin * 2 - 15;
    
    pdf.setFontSize(pdfTheme.fonts.body);
    pdf.setFont('helvetica', 'normal');
    
    for (const item of items) {
      if (currentY > 270) {
        pdf.addPage();
        drawPageFrame(pdf);
        currentY = margin + 5;
      }
      
      const lines = pdf.splitTextToSize(`• ${item}`, maxWidth);
      for (const line of lines) {
        pdf.text(line, margin + 5, currentY);
        currentY += pdfTheme.spacing.lineHeight;
      }
      currentY += 2;
    }
    
    return currentY;
  };

  const addResultTag = (pdf: jsPDF, text: string, x: number, y: number) => {
    pdf.setFillColor(pdfTheme.colors.accent);
    pdf.setTextColor(pdfTheme.colors.background);
    pdf.setFontSize(pdfTheme.fonts.small);
    pdf.setFont('helvetica', 'bold');
    
    const textWidth = pdf.getTextWidth(text);
    pdf.roundedRect(x, y - 3, textWidth + 4, 5, 1, 1, 'F');
    pdf.text(text, x + 2, y);
    
    pdf.setTextColor(pdfTheme.colors.textPrimary);
  };

  const addFooter = (pdf: jsPDF, reportType: string, athleteName: string) => {
    const totalPages = pdf.getNumberOfPages();
    
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      
      const footerY = 287;
      const margin = pdfTheme.spacing.pageMargin;
      
      pdf.setFontSize(pdfTheme.fonts.small);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(pdfTheme.colors.textSecondary);
      
      const leftText = `Athlete360 | ${reportType}`;
      const centerText = athleteName;
      const rightText = `Page ${i} of ${totalPages} | Generated ${new Date().toLocaleDateString()}`;
      
      pdf.text(leftText, margin, footerY);
      pdf.text(centerText, 105, footerY, { align: 'center' });
      pdf.text(rightText, 210 - margin, footerY, { align: 'right' });
      
      drawPageFrame(pdf);
    }
  };

  // Main Professional PDF Generator
  const generateProfessionalPDF = async (pdf: jsPDF, analysisType: string, data: any, identity: any, createdAt?: string) => {
    // Initialize first page with header and frame
    let currentY = drawHeaderBar(pdf, getTitle(analysisType));
    drawPageFrame(pdf);
    
    // Add athlete identity section
    currentY = addIdentitySection(pdf, identity, currentY);
    
    // Add ranking information if available for bio and rank reports
    if ((analysisType === 'bio' || analysisType === 'rank') && data) {
      const rankInfo = extractRank(data);
      if (rankInfo.currentRank !== 'N/A' || rankInfo.peakRank !== 'N/A') {
        const margin = pdfTheme.spacing.pageMargin;
        pdf.setFontSize(pdfTheme.fonts.body);
        pdf.setFont('helvetica', 'normal');
        
        if (rankInfo.currentRank !== 'N/A') {
          pdf.text(`Current Rank: `, margin + 5, currentY);
          addResultTag(pdf, rankInfo.currentRank, margin + 50, currentY);
          currentY += pdfTheme.spacing.lineHeight + 2;
        }
        
        if (rankInfo.peakRank !== 'N/A') {
          pdf.text(`Peak Rank: `, margin + 5, currentY);
          addResultTag(pdf, rankInfo.peakRank, margin + 45, currentY);
          currentY += pdfTheme.spacing.lineHeight + 2;
        }
        
        currentY += pdfTheme.spacing.sectionGap;
      }
    }
    
    // Generate content based on analysis type
    switch (analysisType) {
      case 'bio':
        currentY = await generateBioPDF(pdf, data, currentY);
        break;
      case 'rank':
        currentY = await generateCompetitiveHistoryPDF(pdf, data, currentY);
        break;
      case 'strengths':
        currentY = await generateStrengthsPDF(pdf, data, currentY);
        break;
      case 'weaknesses':
        currentY = await generateWeaknessesPDF(pdf, data, currentY);
        break;
      default:
        currentY = addSection(pdf, 'Analysis Content', currentY, 'Analysis data not available for PDF export.');
    }
    
    // Add footer with pagination
    addFooter(pdf, getTitle(analysisType), identity.name || 'Athlete');
  };

  // Bio Analysis PDF Generator
  const generateBioPDF = async (pdf: jsPDF, data: any, currentY: number) => {
    // Extract bio data
    let bioData = data.data || data;
    
    if (typeof bioData === 'string') {
      try {
        bioData = JSON.parse(bioData);
      } catch (e) {
        bioData = { bio: bioData };
      }
    }

    const bio = bioData.bio || '';
    const achievements = extractAchievements(data);

    // Parse bio sections
    const bioSections = parseBioSections(bio);

    // Introduction section
    if (bioSections.introduction) {
      currentY = addSection(pdf, 'Introduction', currentY, bioSections.introduction);
    }

    // Player's story section
    if (bioSections.overallStory) {
      currentY = addSection(pdf, "Player's Story", currentY, bioSections.overallStory);
    }

    // Career record section
    if (bioSections.careerRecord) {
      currentY = addSection(pdf, 'Career Record and Rankings', currentY, bioSections.careerRecord);
    }

    // Notable achievements
    if (achievements.length > 0) {
      currentY = addSection(pdf, 'Notable Achievements', currentY);
      
      const achievementStrings = achievements.map((achievement: any) => {
        const text = achievement?.achievement || achievement?.text || '';
        const medal = achievement?.medal || 'Participation';
        return text ? `${medal}: ${text}` : '';
      }).filter(Boolean);
      
      currentY = addBulletList(pdf, achievementStrings, currentY);
    }

    return currentY;
  };

  // Helper function to parse bio sections
  const parseBioSections = (bioText: string) => {
    if (!bioText) return {};
    
    const sections: any = {};
    
    // Extract introduction (first paragraph)
    const introMatch = bioText.match(/^(.*?)\n\n/);
    if (introMatch) {
      sections.introduction = introMatch[1].trim();
    }
    
    // Extract player's story
    const storyMatch = bioText.match(/Players' overall story and what they're known for[\s\S]*?\n\n([\s\S]*?)(?:\n\n|$)/);
    if (storyMatch) {
      sections.overallStory = storyMatch[1].trim();
    } else {
      // Fallback: use middle sections
      const parts = bioText.split('\n\n');
      if (parts.length > 2) {
        sections.overallStory = parts.slice(1, -1).join('\n\n');
      }
    }
    
    // Extract career record information
    const careerMatch = bioText.match(/career record|rankings|record/i);
    if (careerMatch) {
      const careerText = bioText.substring(careerMatch.index || 0);
      const endMatch = careerText.match(/\n\n/);
      sections.careerRecord = endMatch ? careerText.substring(0, endMatch.index) : careerText;
    }
    
    return sections;
  };

  // Competitive History PDF Generator
  const generateCompetitiveHistoryPDF = async (pdf: jsPDF, data: any, currentY: number) => {
    const careerPhases = extractCareerPhases(data);
    
    if (careerPhases.length === 0) {
      return addSection(pdf, 'Career Phases', currentY, 'No competitive history data available.');
    }

    // Career phases overview
    currentY = addSection(pdf, 'Career Overview', currentY);
    
    for (const phase of careerPhases) {
      currentY = addSection(pdf, `${phase.phase_name} (${phase.period})`, currentY);
      
      // Add key achievements table for this phase
      if (phase.key_achievements && phase.key_achievements.length > 0) {
        const margin = pdfTheme.spacing.pageMargin;
        
        // Create table data
        const tableData = phase.key_achievements.map((achievement: any) => [
          achievement.year || 'N/A',
          achievement.event_name || 'Event',
          achievement.result || 'Result',
          achievement.event_tier || 'Tier'
        ]);

        // Use jspdf-autotable for professional table
        autoTable(pdf, {
          startY: currentY,
          head: [['Year', 'Competition', 'Result', 'Tier']],
          body: tableData,
          theme: 'grid',
          headStyles: {
            fillColor: [0, 0, 0],
            textColor: [255, 255, 255],
            fontSize: pdfTheme.fonts.small,
            fontStyle: 'bold'
          },
          bodyStyles: {
            fontSize: pdfTheme.fonts.small,
            textColor: [34, 34, 34]
          },
          margin: { left: margin, right: margin },
          styles: {
            cellPadding: 2,
            lineColor: [217, 217, 217],
            lineWidth: 0.5
          }
        });
        
        currentY = (pdf as any).lastAutoTable.finalY + pdfTheme.spacing.sectionGap;
        
        // Add notes if available
        const notesItems = phase.key_achievements
          .filter((achievement: any) => achievement.notes)
          .map((achievement: any) => `${achievement.year}: ${achievement.notes}`);
          
        if (notesItems.length > 0) {
          currentY = addSection(pdf, 'Key Notes', currentY);
          currentY = addBulletList(pdf, notesItems, currentY);
        }
      }
    }

    return currentY;
  };

  // Strengths Analysis PDF Generator
  const generateStrengthsPDF = async (pdf: jsPDF, data: any, currentY: number) => {
    let strengths: any[] = [];
    
    if (data.strengths && Array.isArray(data.strengths)) {
      strengths = data.strengths;
    } else if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        strengths = parsed.strengths || [];
      } catch (e) {
        return addSection(pdf, 'Strengths', currentY, 'Could not parse strengths data for PDF export.');
      }
    }

    if (strengths.length === 0) {
      return addSection(pdf, 'Strengths', currentY, 'No strengths data available for PDF export.');
    }

    currentY = addSection(pdf, 'Strengths Analysis', currentY);

    for (let i = 0; i < strengths.length; i++) {
      const strength = strengths[i];
      const margin = pdfTheme.spacing.pageMargin;
      
      // Check for page break
      if (currentY > 250) {
        pdf.addPage();
        drawPageFrame(pdf);
        currentY = margin + 5;
      }
      
      // Strength title with rating
      pdf.setFontSize(pdfTheme.fonts.h2);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${i + 1}. ${strength.title}`, margin, currentY);
      
      // Rating tag
      if (strength.rating) {
        addResultTag(pdf, `${strength.rating}/100`, 210 - margin - 25, currentY);
      }
      
      currentY += 6;
      
      // Category
      if (strength.category) {
        pdf.setFontSize(pdfTheme.fonts.small);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(pdfTheme.colors.textSecondary);
        pdf.text(`Category: ${strength.category}`, margin + 5, currentY);
        currentY += 4;
      }
      
      // Description
      if (strength.description) {
        pdf.setFontSize(pdfTheme.fonts.body);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(pdfTheme.colors.textPrimary);
        
        const lines = pdf.splitTextToSize(strength.description, 210 - margin * 2 - 10);
        for (const line of lines) {
          pdf.text(line, margin + 5, currentY);
          currentY += pdfTheme.spacing.lineHeight;
        }
        currentY += 3;
      }
      
      // Evidence section
      if (strength.evidence) {
        pdf.setFontSize(pdfTheme.fonts.small);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(pdfTheme.colors.textSecondary);
        pdf.text('Evidence:', margin + 5, currentY);
        currentY += 4;
        
        pdf.setFont('helvetica', 'normal');
        const evidenceLines = pdf.splitTextToSize(strength.evidence, 210 - margin * 2 - 15);
        for (const line of evidenceLines) {
          if (currentY > 270) {
            pdf.addPage();
            drawPageFrame(pdf);
            currentY = margin + 5;
          }
          pdf.text(line, margin + 10, currentY);
          currentY += pdfTheme.spacing.lineHeight;
        }
      }
      
      currentY += pdfTheme.spacing.sectionGap;
    }

    return currentY;
  };

  // Weaknesses Analysis PDF Generator
  const generateWeaknessesPDF = async (pdf: jsPDF, data: any, currentY: number) => {
    let weaknesses: any[] = [];
    
    if (data.weaknesses && Array.isArray(data.weaknesses)) {
      weaknesses = data.weaknesses;
    } else if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        weaknesses = parsed.weaknesses || [];
      } catch (e) {
        return addSection(pdf, 'Weaknesses', currentY, 'Could not parse weaknesses data for PDF export.');
      }
    }

    if (weaknesses.length === 0) {
      return addSection(pdf, 'Weaknesses', currentY, 'No weaknesses data available for PDF export.');
    }

    currentY = addSection(pdf, 'Weaknesses Analysis', currentY);

    for (let i = 0; i < weaknesses.length; i++) {
      const weakness = weaknesses[i];
      const margin = pdfTheme.spacing.pageMargin;
      
      // Check for page break
      if (currentY > 250) {
        pdf.addPage();
        drawPageFrame(pdf);
        currentY = margin + 5;
      }
      
      // Weakness title with severity
      pdf.setFontSize(pdfTheme.fonts.h2);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${i + 1}. ${weakness.title}`, margin, currentY);
      
      // Severity tag
      if (weakness.severity) {
        addResultTag(pdf, `${weakness.severity}/100`, 210 - margin - 25, currentY);
      }
      
      currentY += 6;
      
      // Category
      if (weakness.category) {
        pdf.setFontSize(pdfTheme.fonts.small);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(pdfTheme.colors.textSecondary);
        pdf.text(`Category: ${weakness.category}`, margin + 5, currentY);
        currentY += 4;
      }
      
      // Description
      if (weakness.description) {
        pdf.setFontSize(pdfTheme.fonts.body);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(pdfTheme.colors.textPrimary);
        
        const lines = pdf.splitTextToSize(weakness.description, 210 - margin * 2 - 10);
        for (const line of lines) {
          pdf.text(line, margin + 5, currentY);
          currentY += pdfTheme.spacing.lineHeight;
        }
        currentY += 3;
      }
      
      // Evidence section
      if (weakness.evidence) {
        pdf.setFontSize(pdfTheme.fonts.small);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(pdfTheme.colors.textSecondary);
        pdf.text('Evidence:', margin + 5, currentY);
        currentY += 4;
        
        pdf.setFont('helvetica', 'normal');
        const evidenceLines = pdf.splitTextToSize(weakness.evidence, 210 - margin * 2 - 15);
        for (const line of evidenceLines) {
          if (currentY > 270) {
            pdf.addPage();
            drawPageFrame(pdf);
            currentY = margin + 5;
          }
          pdf.text(line, margin + 10, currentY);
          currentY += pdfTheme.spacing.lineHeight;
        }
      }
      
      currentY += pdfTheme.spacing.sectionGap;
    }

    return currentY;
  };


  const handleShare = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link Copied",
        description: "Share link has been copied to clipboard",
      });
    } else {
      const generatedUrl = `${window.location.origin}/shared/${Date.now()}`;
      navigator.clipboard.writeText(generatedUrl);
      toast({
        title: "Share Link Generated",
        description: "Your analysis share link has been copied to clipboard",
      });
    }
  };

  // Helper function to parse bio sections from the text for display
  const parseBioSectionsForDisplay = (bioText: string) => {
    if (!bioText) return {};
    
    const sections: any = {};
    
    // Look for introduction (current status)
    const introMatch = bioText.match(/^(.*?)\n\n/);
    if (introMatch) {
      sections.introduction = introMatch[1].trim();
    }
    
    // Look for overall story section
    const storyMatch = bioText.match(/Players' overall story and what they're known for[\s\S]*?\n\n([\s\S]*?)(?:\n\n|$)/);
    if (storyMatch) {
      sections.overallStory = storyMatch[1].trim();
    } else {
      // Fallback - use the middle portion of bio
      const parts = bioText.split('\n\n');
      if (parts.length > 1) {
        sections.overallStory = parts.slice(1, -1).join('\n\n');
      }
    }
    
    // Look for career record section
    const careerMatch = bioText.match(/career record|rankings|record/i);
    if (careerMatch) {
      const careerText = bioText.substring(careerMatch.index || 0);
      const endMatch = careerText.match(/\n\n/);
      sections.careerRecord = endMatch ? careerText.substring(0, endMatch.index) : careerText;
    }
    
    return sections;
  };

  // Helper function to get medal icon based on medal type
  const getMedalIcon = (medal: string) => {
    if (medal === 'Gold') {
      return <Medal className="w-5 h-5 text-yellow-500" />;
    } else if (medal === 'Silver') {
      return <Medal className="w-5 h-5 text-gray-300" />;
    } else if (medal === 'Bronze') {
      return <Medal className="w-5 h-5 text-amber-600" />;
    } else {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
  };

  const renderBioAnalysis = (data: any) => {
    // Parse the data first using the utility function
    const parsedData = parseAnalysisData(data);
    
    // Access the nested data object where the actual bio information is
    let bioData = parsedData.data;
    
    // If it's still a string, try to extract structured information
    if (typeof bioData === 'string') {
      try {
        // Try one more JSON parse attempt
        bioData = JSON.parse(bioData);
      } catch (e) {
        // Create a basic structure for display
        bioData = {
          name: "Athlete Biography",
          bio: bioData,
          rank: "N/A",
          achievements: [],
          personalInfo: { recentNews: [] }
        };
      }
    }
    
    // Ensure we have the minimum required structure
    if (!bioData || typeof bioData !== 'object') {
      bioData = {
        name: "Athlete Biography",
        bio: "Analysis data could not be parsed properly",
        rank: "N/A",
        achievements: [],
        personalInfo: { recentNews: [] }
      };
    }
    
    // Extract data with safe fallbacks
    const name = bioData.name || "Athlete Profile";
    const bio = bioData.bio || "";
    const playersStory = bioData.playersStory || "";
    const rank = bioData.currentRank || bioData.rank || "N/A";
    
    // Parse achievements properly
    const achievements = Array.isArray(bioData.achievements) ? bioData.achievements : [];
    
    const recentNews = bioData.personalInfo?.recentNews || bioData.recentNews || [];
    const profileImageUrl = bioData.profileImageUrl;
    
    // Extract personal information for beautiful display
    const personalInfo = bioData.personalInfo || {};
    const age = personalInfo.age;
    const dateOfBirth = personalInfo.dateOfBirth;
    const height = personalInfo.height;
    const position = personalInfo.position;
    const educationalBackground = personalInfo.educationalBackground;
    
    
    // Parse bio content to extract different sections
    const bioSections = parseBioSectionsForDisplay(bio);

    // Always render structured sections - never show raw JSON
    return (
      <div className="space-y-8">
        {/* Athlete Profile Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            {profileImageUrl && !profileImageUrl.includes('Habiba Wael') ? (
              <img 
                src={profileImageUrl} 
                alt={name}
                className="w-40 h-40 rounded-full object-cover border-4 border-athlete-accent shadow-lg"
              />
            ) : (
              <div className="w-40 h-40 bg-athlete-gray-600 rounded-full flex items-center justify-center border-4 border-athlete-accent shadow-lg">
                <User className="w-20 h-20 text-athlete-accent" />
              </div>
            )}
          </div>
          <h2 className="text-4xl font-bold text-athlete-accent mb-3">{name}</h2>
          {athlete?.rankings?.categories && athlete.rankings.categories.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex flex-wrap justify-center gap-3">
                {athlete.rankings.categories.map((rankingCategory: any, index: number) => {
                  // Determine color based on category type
                  const isOlympic = rankingCategory.category.toLowerCase().includes('olympic');
                  const isContinental = rankingCategory.category.toLowerCase().includes('continental') || 
                                       rankingCategory.category.toLowerCase().includes('europe') ||
                                       rankingCategory.category.toLowerCase().includes('asia') ||
                                       rankingCategory.category.toLowerCase().includes('africa') ||
                                       rankingCategory.category.toLowerCase().includes('americas');
                  const isNational = rankingCategory.category.toLowerCase().includes('national');
                  
                  // Default to World (orange) if no specific category is detected
                  let bgGradient = 'from-orange-400 via-orange-500 to-orange-600';
                  let textColor = 'text-white';
                  
                  if (isOlympic) {
                    bgGradient = 'from-yellow-400 via-yellow-500 to-amber-500';
                    textColor = 'text-gray-900';
                  } else if (isContinental) {
                    bgGradient = 'from-green-400 via-green-500 to-green-600';
                    textColor = 'text-white';
                  } else if (isNational) {
                    bgGradient = 'from-blue-400 via-blue-500 to-blue-600';
                    textColor = 'text-white';
                  }
                  
                  return (
                    <div 
                      key={index}
                      className={`flex flex-col items-center px-5 py-3 bg-gradient-to-br ${bgGradient} rounded-xl shadow-lg hover:shadow-xl transition-shadow`}
                      data-testid={`badge-rank-${index}`}
                    >
                      <div className="flex items-center gap-2">
                        <Trophy className={`w-5 h-5 ${textColor}`} />
                        <span className={`font-black text-2xl ${textColor}`}>#{!isNaN(Number(rankingCategory.rank)) ? Math.floor(Number(rankingCategory.rank)) : rankingCategory.rank}</span>
                      </div>
                      <div className={`text-xs font-semibold mt-1 text-center max-w-[200px] line-clamp-2 ${textColor}`}>
                        {rankingCategory.category}
                      </div>
                      {rankingCategory.points && (
                        <div className={`text-xs font-medium mt-1 opacity-80 ${textColor}`}>
                          {rankingCategory.points} pts
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Personal Information Section */}
        {(age || dateOfBirth || height || position || educationalBackground) && (
          <Card className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl text-blue-300 flex items-center gap-3">
                <User className="w-6 h-6" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {age && (
                  <div className="flex items-center gap-3 p-4 bg-gray-800/60 rounded-lg border border-gray-600/50 hover:border-blue-400/50 transition-colors">
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-500/20 rounded-full">
                      <Calendar className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 font-medium">Age</p>
                      <p className="text-lg font-bold text-white" data-testid="text-age">{age}</p>
                    </div>
                  </div>
                )}
                
                {dateOfBirth && (
                  <div className="flex items-center gap-3 p-4 bg-gray-800/60 rounded-lg border border-gray-600/50 hover:border-green-400/50 transition-colors">
                    <div className="flex items-center justify-center w-10 h-10 bg-green-500/20 rounded-full">
                      <Calendar className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 font-medium">Born</p>
                      <p className="text-lg font-bold text-white" data-testid="text-dateofbirth">{dateOfBirth}</p>
                    </div>
                  </div>
                )}
                
                {height && (
                  <div className="flex items-center gap-3 p-4 bg-gray-800/60 rounded-lg border border-gray-600/50 hover:border-yellow-400/50 transition-colors">
                    <div className="flex items-center justify-center w-10 h-10 bg-yellow-500/20 rounded-full">
                      <User className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 font-medium">Height</p>
                      <p className="text-lg font-bold text-white" data-testid="text-height">{height}</p>
                    </div>
                  </div>
                )}
                
                {position && (
                  <div className="flex items-center gap-3 p-4 bg-gray-800/60 rounded-lg border border-gray-600/50 hover:border-purple-400/50 transition-colors">
                    <div className="flex items-center justify-center w-10 h-10 bg-purple-500/20 rounded-full">
                      <Trophy className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 font-medium">Position</p>
                      <p className="text-lg font-bold text-white" data-testid="text-position">{position}</p>
                    </div>
                  </div>
                )}
                
                {educationalBackground && (
                  <div className="flex items-center gap-3 p-4 bg-gray-800/60 rounded-lg border border-gray-600/50 hover:border-emerald-400/50 transition-colors">
                    <div className="flex items-center justify-center w-10 h-10 bg-emerald-500/20 rounded-full">
                      <Award className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 font-medium">Education</p>
                      <p className="text-lg font-bold text-white" data-testid="text-education">{educationalBackground}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Introduction Section */}
        {bioSections.introduction && (
          <Card className="bg-gradient-to-r from-athlete-gray-800 to-athlete-gray-700 border-l-4 border-l-athlete-accent border-gray-600 shadow-xl">
            <CardContent className="p-8">
              <h3 className={`text-3xl font-bold text-emerald-400 mb-8 flex items-center ${(data?.language === 'ar' || data?.generationLanguage === 'ar') ? 'flex-row-reverse' : ''}`}>
                <User className={`text-emerald-400 ${(data?.language === 'ar' || data?.generationLanguage === 'ar') ? 'ml-4' : 'mr-4'}`} size={32} />
                {(data?.language === 'ar' || data?.generationLanguage === 'ar') ? 'المقدمة' : 'Introduction'}
              </h3>
              <div className="prose prose-invert max-w-none space-y-5">
                {bioSections.introduction.split(/\n\n|\n/).filter((para: string) => para.trim()).map((paragraph: string, index: number) => {
                  const trimmedPara = paragraph.trim();
                  
                  // Check if this paragraph is a title we want to exclude from Introduction
                  const excludedTitles = [
                    'Notable Achievements:',
                    'Notable Achievements',
                    "Player's Story:",
                    "Player's Story",
                    "Players' Story:",
                    "Players' Story"
                  ];
                  
                  if (excludedTitles.some(title => trimmedPara === title || trimmedPara.startsWith(title))) {
                    return null; // Skip this paragraph
                  }
                  
                  // Check if this paragraph starts with a section title (English and Arabic)
                  const sectionTitles = [
                    'Career Record and Rankings:',
                    'Recent Competitions:',
                    'Notable Achievements:',
                    "Player's Story:",
                    "Players' Story:",
                    "Players' overall story and what they're known for",
                    'السجل المهني والتصنيفات:',
                    'المنافسات الأخيرة:',
                    'الإنجازات البارزة:',
                    'قصة اللاعب:',
                    'القصة الشاملة للاعب'
                  ];
                  
                  const matchedTitle = sectionTitles.find(title => trimmedPara.startsWith(title));
                  
                  if (matchedTitle) {
                    const isArabic = data?.language === 'ar' || data?.generationLanguage === 'ar';
                    return (
                      <p key={index} className={`text-lg ${isArabic ? 'text-right' : ''}`}>
                        <span className="font-bold text-cyan-400 text-xl">{matchedTitle}</span>
                        <span className="text-gray-200 leading-loose"> {trimmedPara.substring(matchedTitle.length)}</span>
                      </p>
                    );
                  }
                  
                  const isArabic = data?.language === 'ar' || data?.generationLanguage === 'ar';
                  return (
                    <p 
                      key={index} 
                      className={`text-gray-200 leading-loose text-lg ${index === 0 ? 'bio-first-letter' : ''} ${isArabic ? 'text-right' : ''}`}
                    >
                      {trimmedPara}
                    </p>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Players' Overall Story Section */}
        {(playersStory && playersStory.trim()) && (
          <Card className="bg-gradient-to-r from-athlete-gray-800 to-athlete-gray-700 border-l-4 border-l-cyan-400 border-gray-600 shadow-xl">
            <CardContent className="p-8">
              <h3 className={`text-3xl font-bold text-cyan-400 mb-8 flex items-center ${(data?.language === 'ar' || data?.generationLanguage === 'ar') ? 'flex-row-reverse' : ''}`}>
                <Star className={`text-cyan-400 ${(data?.language === 'ar' || data?.generationLanguage === 'ar') ? 'ml-4' : 'mr-4'}`} size={32} />
                {(data?.language === 'ar' || data?.generationLanguage === 'ar') ? 'قصة اللاعب' : "Player's Story"}
              </h3>
              <div className="prose prose-invert max-w-none space-y-5">
                {playersStory.split(/\n\n|\n/).filter((para: string) => para.trim()).map((paragraph: string, index: number) => {
                  const isArabic = data?.language === 'ar' || data?.generationLanguage === 'ar';
                  return (
                  <p 
                    key={index} 
                    className={`text-gray-200 leading-loose text-lg ${index === 0 ? 'bio-first-letter' : ''} ${isArabic ? 'text-right' : ''}`}
                  >
                    {paragraph.trim()}
                  </p>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Fallback: Show bioSections.overallStory if playersStory is not available */}
        {(!playersStory || !playersStory.trim()) && bioSections.overallStory && (
          <Card className="bg-gradient-to-r from-athlete-gray-800 to-athlete-gray-700 border-l-4 border-l-cyan-400 border-gray-600 shadow-xl">
            <CardContent className="p-8">
              <h3 className={`text-3xl font-bold text-cyan-400 mb-8 flex items-center ${(data?.language === 'ar' || data?.generationLanguage === 'ar') ? 'flex-row-reverse' : ''}`}>
                <Star className={`text-cyan-400 ${(data?.language === 'ar' || data?.generationLanguage === 'ar') ? 'ml-4' : 'mr-4'}`} size={32} />
                {(data?.language === 'ar' || data?.generationLanguage === 'ar') ? 'قصة اللاعب' : "Player's Story"}
              </h3>
              <div className="prose prose-invert max-w-none space-y-5">
                {bioSections.overallStory.split(/\n\n|\n/).filter((para: string) => para.trim()).map((paragraph: string, index: number) => (
                  <p 
                    key={index} 
                    className={`text-gray-200 leading-loose text-lg ${index === 0 ? 'bio-first-letter' : ''}`}
                  >
                    {paragraph.trim()}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        

        {/* Career Record and Rankings */}
        {bioSections.careerRecord && (
          <Card className="bg-gradient-to-r from-athlete-gray-800 to-athlete-gray-700 border-l-4 border-l-orange-400 border-gray-600 shadow-xl">
            <CardContent className="p-8">
              <h3 className="text-3xl font-bold text-orange-400 mb-8 flex items-center">
                <Trophy className="mr-4 text-orange-400" size={32} />
                Career Record and Rankings
              </h3>
              <div className="prose prose-invert max-w-none space-y-5">
                {bioSections.careerRecord.split(/\n\n|\n/).filter((para: string) => para.trim()).map((paragraph: string, index: number) => {
                  const isArabic = data?.language === 'ar' || data?.generationLanguage === 'ar';
                  return (
                  <p 
                    key={index} 
                    className={`text-gray-200 leading-loose text-lg ${index === 0 ? 'bio-first-letter' : ''} ${isArabic ? 'text-right' : ''}`}
                  >
                    {paragraph.trim()}
                  </p>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notable Achievements Section - Completely Rewritten */}
        {achievements && achievements.length > 0 && (
          <Card className="bg-gradient-to-r from-athlete-gray-800 to-athlete-gray-700 border-l-4 border-l-athlete-warning border-gray-600 shadow-xl">
            <CardContent className="p-8">
              <h3 className={`text-3xl font-bold text-athlete-warning mb-6 flex items-center ${(data?.language === 'ar' || data?.generationLanguage === 'ar') ? 'flex-row-reverse' : ''}`}>
                <Award className={`text-athlete-warning ${(data?.language === 'ar' || data?.generationLanguage === 'ar') ? 'ml-4' : 'mr-4'}`} size={32} />
                {(data?.language === 'ar' || data?.generationLanguage === 'ar') ? 'الإنجازات البارزة' : 'Notable Achievements'}
              </h3>
              <div className="grid gap-4">
                {achievements.map((achievementObj: any, index: number) => {
                  // Extract text and medal directly from object
                  const text = achievementObj?.achievement || '';
                  const medal = achievementObj?.medal || 'Participation';
                  const isArabic = data?.language === 'ar' || data?.generationLanguage === 'ar';
                  
                  return (
                    <div 
                      key={index}
                      className={`flex items-start p-4 bg-athlete-gray-600 rounded-xl border border-athlete-warning/20 ${isArabic ? 'flex-row-reverse space-x-reverse space-x-4' : 'space-x-4'}`}
                      data-testid={`achievement-item-${index}`}
                    >
                      <div className="mt-1 flex-shrink-0">
                        {getMedalIcon(medal)}
                      </div>
                      <p className={`text-gray-200 leading-relaxed text-lg font-medium ${isArabic ? 'text-right' : ''}`}>
                        {text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Competitions Section */}
        {recentNews.length > 0 && (
          <Card className="bg-gradient-to-r from-athlete-gray-800 to-athlete-gray-700 border-l-4 border-l-purple-400 border-gray-600 shadow-xl">
            <CardContent className="p-8">
              <h3 className="text-3xl font-bold text-purple-400 mb-6 flex items-center">
                <Calendar className="mr-4 text-purple-400" size={32} />
                Recent Competitions: (2024–2025 results)
              </h3>
              <div className="space-y-4">
                {recentNews.map((newsItem: string, index: number) => (
                  <div 
                    key={index}
                    className="p-6 bg-athlete-gray-600 rounded-xl border-l-4 border-purple-400 shadow-lg"
                  >
                    <p className="text-gray-200 leading-relaxed text-lg font-medium">
                      {newsItem}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderRankAnalysis = (data: any) => {
    console.log('Frontend Rank Data RECEIVED:', JSON.stringify(data, null, 2));
    
    // Parse data with comprehensive fallback strategies for adaptive UI
    const parsedData = parseAnalysisData(data);
    
    // Handle different data formats and error states
    if (parsedData.error || parsedData.message?.includes('Unable to generate')) {
      return (
        <div className="p-6 text-center">
          <div className="text-red-400 mb-4">⚠ Rank Analysis Unavailable</div>
          <p className="text-gray-300 mb-4">
            {parsedData.message || 'Unable to generate authentic rank history at this time.'}
          </p>
          <p className="text-sm text-gray-400">
            Please try again later or contact support if the issue persists.
          </p>
        </div>
      );
    }

    // Adaptive data extraction for multiple JSON formats
    let athlete, rankingProgression, careerSummary;
    let isDualAnalysis = false;
    let rankAnalysis = null;
    let rankHistoryData = null;
    
    // Check for dual-analysis structure (Taekwondo with rank history)
    if (parsedData.competitiveAnalysis && parsedData.rankAnalysis && parsedData.rankHistoryData) {
      isDualAnalysis = true;
      rankAnalysis = parsedData.rankAnalysis;
      rankHistoryData = parsedData.rankHistoryData;
      
      // Extract competitive analysis data
      const competitiveData = parsedData.competitiveAnalysis;
      if (competitiveData.athlete && competitiveData.rankingProgression !== undefined && competitiveData.careerSummary) {
        athlete = competitiveData.athlete;
        rankingProgression = competitiveData.rankingProgression;
        careerSummary = competitiveData.careerSummary;
      }
    }
    // Format 1: New enhanced structure (athlete, rankingProgression, careerSummary)
    else if (parsedData.athlete && parsedData.rankingProgression !== undefined && parsedData.careerSummary) {
      athlete = parsedData.athlete;
      rankingProgression = parsedData.rankingProgression;
      careerSummary = parsedData.careerSummary;
    }
    // Format 2: Old synthetic structure (currentRank, peakRank, history, recommendations)
    else if (parsedData.currentRank || parsedData.peakRank || parsedData.history) {
      athlete = {
        name: 'Unknown Athlete',
        nationality: 'N/A',
        sport: 'N/A',
        currentRanking: parsedData.currentRank,
        peakRanking: parsedData.peakRank,
        officialRecord: parsedData.competitionRecord || 'N/A',
        isActive: true
      };
      rankingProgression = parsedData.history || [];
      careerSummary = {
        totalCompetitions: 'N/A',
        majorTitles: 'N/A',
        rankingTrend: 'N/A',
        notableAchievements: parsedData.recommendations || [],
        currentForm: 'Legacy data format'
      };
    }
    // Format 3: Unknown/unrecognized structure - show debug info
    else {
      return (
        <div className="p-6">
          <div className="text-yellow-400 mb-4 text-center">⚠ Unrecognized Rank Data Format</div>
          <p className="text-gray-300 mb-4 text-center">
            The ranking data structure is not recognized. Please check the backend response format.
          </p>
          <div className="bg-gray-800 p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-400 mb-2">Raw Data Structure:</h4>
            <pre className="text-xs text-gray-300 overflow-auto max-h-40 whitespace-pre-wrap">
              {JSON.stringify(parsedData, null, 2)}
            </pre>
          </div>
        </div>
      );
    }

    // Helper function to render rank history chart and analysis (for Taekwondo)
    const renderRankHistoryContent = () => {
      const isArabic = parsedData?.language === 'ar' || parsedData?.generationLanguage === 'ar';
      if (!rankHistoryData || rankHistoryData.length === 0) {
        return (
          <div className={`p-6 text-center ${isArabic ? 'text-right' : ''}`}>
            <p className="text-gray-400">{isArabic ? 'لا توجد بيانات تاريخ التصنيف متاحة' : 'No rank history data available'}</p>
          </div>
        );
      }

      // Prepare chart data - reverse to show oldest to newest
      const sortedHistory = [...rankHistoryData].sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const chartData = {
        labels: sortedHistory.map((entry: any) => entry.date),
        datasets: [
          {
            label: 'World Rank',
            data: sortedHistory.map((entry: any) => entry.rank),
            borderColor: 'rgb(251, 146, 60)',
            backgroundColor: 'rgba(251, 146, 60, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 5,
            pointHoverRadius: 7,
          }
        ]
      };

      const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            reverse: true,
            beginAtZero: false,
            ticks: {
              color: 'rgb(156, 163, 175)',
              callback: function(value: any) {
                return '#' + value;
              }
            },
            grid: {
              color: 'rgba(75, 85, 99, 0.3)'
            }
          },
          x: {
            ticks: {
              color: 'rgb(156, 163, 175)',
              maxRotation: 45,
              minRotation: 45
            },
            grid: {
              color: 'rgba(75, 85, 99, 0.3)'
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            labels: {
              color: 'rgb(209, 213, 219)'
            }
          },
          tooltip: {
            callbacks: {
              label: function(context: any) {
                return 'Rank: #' + context.parsed.y;
              }
            }
          }
        }
      };

      return (
        <div className="space-y-6">
          {/* Rank Progression Chart */}
          <Card className="bg-athlete-gray-800 border-gray-600">
            <CardHeader>
              <CardTitle className={`text-2xl text-gray-100 flex items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
                <TrendingUp className={`text-orange-400 ${isArabic ? 'ml-3' : 'mr-3'}`} size={24} />
                {isArabic ? 'تطور التصنيف عبر الزمن' : 'Rank Progression Over Time'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <Line data={chartData} options={chartOptions} />
              </div>
            </CardContent>
          </Card>

          {/* Rank Analysis */}
          {rankAnalysis && (
            <Card className="bg-athlete-gray-800 border-gray-600">
              <CardHeader>
                <CardTitle className={`text-2xl text-gray-100 flex items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
                  <BarChart className={`text-blue-400 ${isArabic ? 'ml-3' : 'mr-3'}`} size={24} />
                  {isArabic ? 'تحليل تاريخ التصنيف' : 'Rank History Analysis'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-invert max-w-none">
                  <div 
                    className={`text-gray-300 leading-relaxed whitespace-pre-wrap ${isArabic ? 'text-right' : ''}`}
                    dangerouslySetInnerHTML={{ 
                      __html: rankAnalysis.replace(/\n/g, '<br/>') 
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      );
    };

    // Helper function to render competitive history content
    const renderCompetitiveHistoryContent = () => {
      const isArabic = parsedData?.language === 'ar' || parsedData?.generationLanguage === 'ar';
      return (
      <div className="space-y-6">
        {/* Career Overview Stats */}
        <Card className="bg-gradient-to-r from-athlete-gray-800 to-athlete-gray-700 border-l-4 border-l-blue-400 border-gray-600">
          <CardContent className="p-6">
            <div className={`flex items-center justify-between mb-6 ${isArabic ? 'flex-row-reverse' : ''}`}>
              <h3 className={`text-3xl font-bold text-blue-400 flex items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
                <Trophy className={`${isArabic ? 'ml-3' : 'mr-3'}`} size={28} />
                {isArabic ? 'نظرة عامة على المسيرة' : 'Career Overview'}
              </h3>
              {athlete.isActive && (
                <Badge variant="default" className="bg-green-600 text-white px-3 py-1">
                  {isArabic ? 'نشط' : 'Active'}
                </Badge>
              )}
            </div>
            
            <div className="grid md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-athlete-gray-600 rounded-lg border border-blue-500/20">
                <div className="text-2xl font-bold text-white">{athlete.currentRanking || 'N/A'}</div>
                <div className="text-sm text-blue-300">{isArabic ? 'التصنيف الحالي' : 'Current Rank'}</div>
              </div>
              <div className="text-center p-4 bg-athlete-gray-600 rounded-lg border border-green-500/20">
                <div className="text-2xl font-bold text-green-400">{athlete.peakRanking || 'N/A'}</div>
                <div className="text-sm text-green-300">{isArabic ? 'أعلى تصنيف' : 'Peak Rank'}</div>
              </div>
              <div className="text-center p-4 bg-athlete-gray-600 rounded-lg border border-yellow-500/20">
                <div className="text-2xl font-bold text-yellow-400">{athlete.officialRecord || 'N/A'}</div>
                <div className="text-sm text-yellow-300">{isArabic ? 'السجل' : 'Record'}</div>
              </div>
              <div className="text-center p-4 bg-athlete-gray-600 rounded-lg border border-purple-500/20">
                <div className="text-2xl font-bold text-purple-400">{careerSummary.totalCompetitions || 'N/A'}</div>
                <div className="text-sm text-purple-300">{isArabic ? 'المنافسات' : 'Competitions'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ranking Progression Timeline */}
        {rankingProgression && rankingProgression.length > 0 && (
          <Card className="bg-athlete-gray-800 border-gray-600">
            <CardHeader>
              <CardTitle className={`text-2xl text-gray-100 flex items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
                <TrendingUp className={`text-blue-400 ${isArabic ? 'ml-3' : 'mr-3'}`} size={24} />
                {isArabic ? 'تطور التصنيف' : 'Ranking Progression'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {rankingProgression.map((entry: any, index: number) => (
                  <div key={index} className={`flex items-center justify-between p-4 bg-athlete-gray-700 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors ${isArabic ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex-1 ${isArabic ? 'text-right' : ''}`}>
                      <div className="font-semibold text-gray-100">
                        {entry.competition || entry.tournament || `Event ${index + 1}`}
                      </div>
                      <div className="text-sm text-gray-400">
                        {entry.date || entry.month || 'Date unknown'} • {entry.result || entry.placement || 'Result unknown'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-white">#{entry.ranking || entry.rank || 'N/A'}</div>
                      {entry.rankingChange && (
                        <div className={`text-sm font-medium ${entry.rankingChange > 0 ? 'text-green-400' : entry.rankingChange < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                          {entry.rankingChange > 0 ? '↑' : entry.rankingChange < 0 ? '↓' : '→'} {Math.abs(entry.rankingChange)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Career Summary and Achievements */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-athlete-gray-800 border-gray-600">
            <CardHeader>
              <CardTitle className={`text-xl text-gray-100 flex items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
                <Award className={`text-yellow-400 ${isArabic ? 'ml-3' : 'mr-3'}`} size={24} />
                {isArabic ? 'ملخص المسيرة' : 'Career Summary'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`flex justify-between items-center py-2 border-b border-gray-600 ${isArabic ? 'flex-row-reverse' : ''}`}>
                <span className="text-gray-300">{isArabic ? 'الألقاب الرئيسية:' : 'Major Titles:'}</span>
                <span className="text-yellow-400 font-semibold">{careerSummary.majorTitles || 'N/A'}</span>
              </div>
              <div className={`flex justify-between items-center py-2 border-b border-gray-600 ${isArabic ? 'flex-row-reverse' : ''}`}>
                <span className="text-gray-300">{isArabic ? 'اتجاه التصنيف:' : 'Ranking Trend:'}</span>
                <span className="text-blue-400 font-semibold">{careerSummary.rankingTrend || 'N/A'}</span>
              </div>
              <div className={`flex justify-between items-center py-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                <span className="text-gray-300">{isArabic ? 'الأداء الحالي:' : 'Current Form:'}</span>
                <span className="text-green-400 font-semibold">{careerSummary.currentForm || (isArabic ? 'البيانات غير متوفرة' : 'Data not available')}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-athlete-gray-800 border-gray-600">
            <CardHeader>
              <CardTitle className={`text-xl text-gray-100 flex items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
                <Star className={`text-purple-400 ${isArabic ? 'ml-3' : 'mr-3'}`} size={24} />
                {isArabic ? 'الإنجازات البارزة' : 'Notable Achievements'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {careerSummary.notableAchievements && careerSummary.notableAchievements.length > 0 ? (
                <ul className="space-y-3">
                  {careerSummary.notableAchievements.map((achievement: string, index: number) => (
                    <li key={index} className={`flex items-start text-gray-300 ${isArabic ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0 ${isArabic ? 'ml-3' : 'mr-3'}`}></div>
                      <span className={`text-sm ${isArabic ? 'text-right' : ''}`}>{achievement}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={`text-gray-400 text-sm ${isArabic ? 'text-right' : ''}`}>{isArabic ? 'لا توجد بيانات إنجازات محددة متاحة' : 'No specific achievements data available'}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
    };

    // Main return: Use tabs if dual-analysis, otherwise show single analysis
    const isArabic = parsedData?.language === 'ar' || parsedData?.generationLanguage === 'ar';
    
    if (isDualAnalysis) {
      return (
        <Tabs defaultValue="competitive" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-athlete-gray-700">
            <TabsTrigger 
              value="competitive"
              data-testid="tab-competitive-history"
              className={`data-[state=active]:bg-athlete-accent ${isArabic ? 'flex-row-reverse' : ''}`}
            >
              <Calendar className={`h-4 w-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
              {isArabic ? 'التاريخ التنافسي' : 'Competitive History'}
            </TabsTrigger>
            <TabsTrigger 
              value="rank"
              data-testid="tab-rank-history"
              className={`data-[state=active]:bg-athlete-accent ${isArabic ? 'flex-row-reverse' : ''}`}
            >
              <TrendingUp className={`h-4 w-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
              {isArabic ? 'تاريخ التصنيف' : 'Rank History'}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="competitive" className="mt-6">
            {renderCompetitiveHistoryContent()}
          </TabsContent>
          
          <TabsContent value="rank" className="mt-6">
            {renderRankHistoryContent()}
          </TabsContent>
        </Tabs>
      );
    }

    return renderCompetitiveHistoryContent();
  };

  const renderStrengthsAnalysis = (data: any) => {
    console.log('Frontend Strengths Data RECEIVED:', JSON.stringify(data, null, 2));
    
    // Parse the data first using the utility function
    const parsedData = parseAnalysisData(data);
    
    // Check for error state first
    if (parsedData.error || parsedData.message?.includes('Unable to generate')) {
      return (
        <div className="p-6 text-center">
          <div className="text-red-400 mb-4">⚠ Analysis Unavailable</div>
          <p className="text-gray-300 mb-4">
            {parsedData.message || 'Unable to generate authentic strengths analysis at this time.'}
          </p>
          <p className="text-sm text-gray-400">
            Please try again later or contact support if the issue persists.
          </p>
        </div>
      );
    }

    // Enhanced error handling for strengths data
    let strengths: any[] = [];
    try {
      strengths = Array.isArray(parsedData.strengths) ? parsedData.strengths : [];
    } catch (error) {
      console.error('Error processing strengths data:', error);
      strengths = [];
    }

    return (
      <div className="space-y-6">
        {strengths.length > 0 ? strengths.map((strength: any, index: number) => {
          // Only render if we have authentic strength data
          if (!strength.title && !strength.description) {
            return null;
          }
          
          const isArabic = parsedData?.language === 'ar' || parsedData?.generationLanguage === 'ar';
          
          return (
            <Card key={index} className="bg-athlete-gray-700 border-gray-600 hover:border-athlete-success/50 transition-colors">
              <CardContent className="p-6">
                <div className={`flex items-start justify-between mb-4 ${isArabic ? 'flex-row-reverse' : ''}`}>
                  <h3 className={`font-bold text-athlete-success text-lg mb-2 flex items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
                    <Star className={`inline-block w-5 h-5 ${isArabic ? 'ml-2' : 'mr-2'}`} />
                    {strength.title}
                  </h3>
                  {strength.rating && (
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="bg-athlete-success/20 text-athlete-success border-athlete-success/30">
                        {strength.rating}/100
                      </Badge>
                      {strength.impact && (
                        <Badge 
                          variant={strength.impact === 'high' ? 'default' : 'secondary'} 
                          className={strength.impact === 'high' 
                            ? 'bg-red-600 text-white' 
                            : strength.impact === 'medium' 
                            ? 'bg-yellow-600 text-white' 
                            : 'bg-gray-600 text-white'
                          }
                        >
                          {strength.impact} impact
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                
                <p className="text-gray-300 leading-relaxed mb-4">
                  {strength.description}
                </p>
                
                {strength.evidence && (
                  <div className={`bg-athlete-gray-800 rounded-lg p-4 border-athlete-success ${isArabic ? 'border-r-4' : 'border-l-4'}`}>
                    <h4 className={`font-semibold text-white mb-2 flex items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
                      <Award className={`w-4 h-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
                      {isArabic ? 'دليل' : 'Evidence'}
                    </h4>
                    <p className="text-sm text-gray-300 italic">
                      {strength.evidence}
                    </p>
                  </div>
                )}
                
                {/* Progress bar for rating visualization */}
                {strength.rating && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-400 mb-1">
                      <span>Strength Level</span>
                      <span>{strength.rating}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div 
                        className="h-3 rounded-full transition-all duration-700 ease-out"
                        style={{ 
                          width: `${Math.min(strength.rating || 0, 100)}%`,
                          background: `linear-gradient(90deg, #10b981 0%, #34d399 50%, #6ee7b7 100%)`
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        }).filter(Boolean) : (
          <div className="text-gray-400 text-center py-8">
            <Star className="w-12 h-12 mx-auto mb-4 text-gray-500" />
            <p>No strengths analysis data available</p>
            <p className="text-sm mt-2">Generate a new analysis to see detailed insights.</p>
          </div>
        )}
      </div>
    );
  };

  const renderWeaknessesAnalysis = (data: any) => {
    const isArabic = data?.language === 'ar' || data?.generationLanguage === 'ar';
    
    return (
      <div className="space-y-4">
        {data.weaknesses?.map((weakness: any, index: number) => (
          <Card key={index} className="bg-athlete-gray-700 border-gray-600">
            <CardContent className="p-4">
              <h5 className={`font-semibold text-athlete-danger mb-2 ${isArabic ? 'text-right' : ''}`}>{weakness.title}</h5>
              <p className={`text-sm text-gray-300 ${isArabic ? 'text-right' : ''}`}>{weakness.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderDevelopmentPlan = (data: any) => {
    console.log('Frontend Development Plan Data RECEIVED:', JSON.stringify(data, null, 2));
    
    // Check for error state first
    if (data.error || data.message?.includes('Unable to generate')) {
      return (
        <div className="p-6 text-center">
          <div className="text-red-400 mb-4">⚠ Analysis Unavailable</div>
          <p className="text-gray-300 mb-4">
            {data.message || 'Unable to generate authentic development plan at this time.'}
          </p>
          <p className="text-sm text-gray-400">
            Please try again later or contact support if the issue persists.
          </p>
        </div>
      );
    }

    // Enhanced error handling for plan data
    let planItems: any[] = [];
    try {
      planItems = Array.isArray(data.plan) ? data.plan : [];
    } catch (error) {
      console.error('Error processing development plan data:', error);
      planItems = [];
    }

    return (
      <div className="space-y-6">
        {/* Header Section with Duration and Overview */}
        {data.duration && (
          <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg p-4 border border-purple-500/30">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Development Program</h3>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="bg-purple-600 text-white px-3 py-1">
                <Clock className="w-3 h-3 mr-1" />
                {data.duration}
              </Badge>
              {planItems.length > 0 && (
                <span className="text-sm text-purple-300">
                  {planItems.length} Phase{planItems.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Progress Timeline */}
        {planItems.length > 0 && (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 to-blue-500 opacity-30"></div>
            
            <div className="space-y-6">
              {planItems.map((item: any, index: number) => {
                const isCurrentPhase = index === 0; // You can add logic to determine current phase
                const phaseNumber = index + 1;
                
                return (
                  <Card 
                    key={index} 
                    className={`relative ml-8 ${
                      isCurrentPhase 
                        ? 'bg-gradient-to-br from-purple-900/50 to-blue-900/50 border-purple-500' 
                        : 'bg-athlete-gray-700 border-gray-600'
                    } hover:border-purple-400 transition-colors`}
                  >
                    {/* Phase Number Indicator */}
                    <div className={`absolute -left-12 top-6 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      isCurrentPhase 
                        ? 'bg-purple-600 text-white ring-4 ring-purple-600/30' 
                        : 'bg-gray-600 text-gray-300'
                    }`}>
                      {phaseNumber}
                    </div>

                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg text-white flex items-center gap-2">
                          <Target className="w-5 h-5 text-purple-400" />
                          {item.title || item.focus || item.phase || item.name || `Phase ${phaseNumber}`}
                        </CardTitle>
                        {isCurrentPhase && (
                          <Badge variant="secondary" className="bg-green-600 text-white">
                            <PlayCircle className="w-3 h-3 mr-1" />
                            Current
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-purple-200 bg-purple-900/30 p-3 rounded-lg italic border-l-4 border-purple-500">
                          {item.description}
                        </p>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Activities Section */}
                      {(item.activities || item.details || item.exercises || []).length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            Training Activities
                          </h4>
                          <div className="grid gap-2">
                            {(item.activities || item.details || item.exercises || []).map((activity: string, idx: number) => (
                              <div key={idx} className="flex items-start gap-3 p-2 bg-gray-800/50 rounded-lg">
                                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                                <span className="text-sm text-gray-300 leading-relaxed">{activity}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Objectives Section */}
                      {item.objectives && (
                        <div>
                          <h4 className="text-sm font-semibold text-blue-300 mb-3 flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Key Objectives
                          </h4>
                          <div className="grid gap-2">
                            {Array.isArray(item.objectives) ? item.objectives.map((objective: string, idx: number) => (
                              <div key={idx} className="flex items-start gap-3 p-2 bg-blue-900/20 rounded-lg border-l-2 border-blue-500">
                                <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-blue-100">{objective}</span>
                              </div>
                            )) : (
                              <div className="flex items-start gap-3 p-2 bg-blue-900/20 rounded-lg border-l-2 border-blue-500">
                                <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-blue-100">{item.objectives}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Metrics Section */}
                      {item.metrics && (
                        <div>
                          <h4 className="text-sm font-semibold text-green-300 mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Success Metrics
                          </h4>
                          <div className="grid gap-2">
                            {Array.isArray(item.metrics) ? item.metrics.map((metric: string, idx: number) => (
                              <div key={idx} className="flex items-start gap-3 p-2 bg-green-900/20 rounded-lg border-l-2 border-green-500">
                                <BarChart className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-green-100">{metric}</span>
                              </div>
                            )) : (
                              <div className="flex items-start gap-3 p-2 bg-green-900/20 rounded-lg border-l-2 border-green-500">
                                <BarChart className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-green-100">{item.metrics}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Duration for individual phases */}
                      {item.duration && (
                        <div className="pt-2 border-t border-gray-600">
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            Duration: {item.duration}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {planItems.length === 0 && (
          <div className="text-gray-400 text-center py-12">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-500" />
            <p className="text-lg font-medium mb-2">No development plan data available</p>
            <p className="text-sm">Generate a new analysis to see your personalized development program.</p>
          </div>
        )}
      </div>
    );
  };


  const renderBeatStrategies = (data: any) => {
    console.log('Frontend Beat Strategies Data RECEIVED:', JSON.stringify(data, null, 2));
    
    // Check for error state first
    if (data.error || data.message?.includes('Unable to generate')) {
      return (
        <div className="p-6 text-center">
          <div className="text-red-400 mb-4">⚠ Analysis Unavailable</div>
          <p className="text-gray-300 mb-4">
            {data.message || 'Unable to generate authentic strategic analysis at this time.'}
          </p>
          <p className="text-sm text-gray-400">
            Please try again later or contact support if the issue persists.
          </p>
        </div>
      );
    }

    // Enhanced error handling for strategies data
    let strategies: any[] = [];
    try {
      strategies = Array.isArray(data.strategies) ? data.strategies : [];
    } catch (error) {
      console.error('Error processing strategies data:', error);
      strategies = [];
    }

    const isArabic = data?.language === 'ar' || data?.generationLanguage === 'ar';

    return (
      <div>
        <div className="grid gap-4 mb-6">
          {strategies.length > 0 ? strategies.map((strategy: any, index: number) => {
            // Only render if we have authentic strategy data, no generic fallbacks
            if (!strategy.strategy && !strategy.title && !strategy.name) {
              return null; // Skip rendering generic entries
            }
            
            return (
              <Card key={index} className="bg-athlete-gray-700 border-gray-600">
                <CardContent className="p-4">
                  <h5 className={`font-semibold text-red-400 mb-2 ${isArabic ? 'text-right' : ''}`}>
                    {strategy.strategy || strategy.title || strategy.name}
                  </h5>
                  {strategy.description && (
                    <p className={`text-sm text-gray-300 ${isArabic ? 'text-right' : ''}`}>
                      {strategy.description}
                    </p>
                  )}
                  {strategy.details && (
                    <p className={`text-sm text-gray-300 mt-2 ${isArabic ? 'text-right' : ''}`}>
                      {strategy.details}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          }).filter(Boolean) : (
            <div className="text-gray-400 text-center py-8">
              No strategic analysis data available
            </div>
          )}
        </div>
        {data.keyWeaknesses && Array.isArray(data.keyWeaknesses) && data.keyWeaknesses.length > 0 && (
          <Card className="bg-athlete-gray-700 border-gray-600">
            <CardContent className="p-4">
              <h5 className={`font-semibold text-athlete-warning mb-2 ${isArabic ? 'text-right' : ''}`}>{isArabic ? 'نقاط الضعف الرئيسية للاستغلال' : 'Key Weaknesses to Exploit'}</h5>
              <ul className="text-sm text-gray-300 space-y-1">
                {data.keyWeaknesses.map((weakness: string, index: number) => (
                  <li key={index}>• {weakness}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderVideoAnalysis = (data: any) => {
    console.log('Frontend Video Analysis Data RECEIVED:', JSON.stringify(data, null, 2));
    
    // Check for error state first
    if (data.error || data.message?.includes('Unable to generate')) {
      return (
        <div className="p-6 text-center">
          <div className="text-red-400 mb-4">⚠ Analysis Unavailable</div>
          <p className="text-gray-300 mb-4">
            {data.message || 'Unable to generate authentic video analysis at this time.'}
          </p>
          <p className="text-sm text-gray-400">
            Please try again later or contact support if the issue persists.
          </p>
        </div>
      );
    }

    // Use the dedicated VideoAnalysisResults component for proper sport-specific rendering
    const sport = data.sport || 'taekwondo';
    return <VideoAnalysisResults analysisData={data} sport={sport} />;
  };

  const renderAnalysisContent = () => {
    if (!data) {
      return <div className="text-gray-400 text-center py-8">Analysis data not available</div>;
    }

    // Parse the data to handle JSON strings consistently
    const parsedData = parseAnalysisData(data);

    switch (type) {
      case 'bio': 
        return renderBioAnalysis(parsedData);
      case 'rank': return renderRankAnalysis(parsedData);
      case 'strengths': return renderStrengthsAnalysis(parsedData);
      case 'weaknesses': return renderWeaknessesAnalysis(parsedData);
      case 'development': return renderDevelopmentPlan(parsedData);

      case 'beat': return renderBeatStrategies(parsedData);
      case 'video': return renderVideoAnalysis(parsedData);
      default: 
        console.log('UNSUPPORTED TYPE - showing raw data:', type);
        return (
          <div className="text-gray-400 text-center py-8">
            <p>Unsupported analysis type: {type}</p>
            <pre className="text-xs mt-4 text-left">{JSON.stringify(data, null, 2)}</pre>
          </div>
        );
    }
  };

  return (
    <Card className="bg-athlete-gray-800 border-gray-700">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {getIcon(type)}
            <div>
              <CardTitle className="text-white">{getTitle(type)}</CardTitle>
              {createdAt && (
                <p className="text-sm text-gray-400 mt-1">
                  Generated on {new Date(createdAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={handleExport}
              data-testid={`button-export-${type}`}
              size="sm"
              className="bg-athlete-success hover:bg-green-600 text-white"
            >
              <Download className="mr-2" size={16} />
              Export PDF
            </Button>
            <Button 
              onClick={handleShare}
              data-testid={`button-share-${type}`}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Share2 className="mr-2" size={16} />
              Share
            </Button>
          </div>
        </div>
        {shared && (
          <Badge variant="secondary" className="w-fit bg-athlete-success text-white">
            Shared
          </Badge>
        )}
      </CardHeader>
      <CardContent data-testid={`analysis-content-${type}`}>
        {renderAnalysisContent()}
      </CardContent>
    </Card>
  );
}

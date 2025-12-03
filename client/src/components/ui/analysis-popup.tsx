import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RankChart } from "./rank-chart";
import { NutritionPlanDisplay } from "./nutrition-plan-display";
import { StrategicCombatDisplay } from "./strategic-combat-display";
import { StatisticsDisplay } from "./statistics-display";
import { DualAnalysisPanel } from "./dual-analysis-panel";
import {
  Download,
  User,
  Trophy,
  Star,
  AlertTriangle,
  Calendar,
  Apple,
  ClipboardList,
  Video,
  Clock,
  Target,
  TrendingUp,
  Award,
  Heart,
  Zap,
  Shield,
  Brain,
  Flame,
  ChevronRight,
  PlayCircle,
  CheckCircle,
  BarChart,
  Medal,
} from "lucide-react";
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
  Filler,
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

import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { generateProfessionalPdf } from "@/lib/pdf/generator";
import { jsPDF } from "jspdf";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VideoAnalysisResults } from "@/components/ui/video-analysis-results";
import { DevelopmentPlanDisplay } from "@/components/ui/development-plan-display";
import { normalizeDevelopmentPlan, normalizeNutritionPlan, normalizeComparison } from "@/lib/normalize";
import { formatNumber } from "@/lib/arabicNumbers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AnalysisPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: string;
  data: any;
  athleteName?: string;
  athleteId?: string;
  athlete?: any;
  createdAt?: string;
  shared?: boolean;
  shareUrl?: string;
  onRefresh?: () => void;
}

export function AnalysisPopup({
  open,
  onOpenChange,
  type,
  data,
  athleteName,
  athleteId,
  athlete,
  createdAt,
  shared,
  shareUrl,
  onRefresh,
}: AnalysisPopupProps) {
  const { t, i18n } = useTranslation(['home', 'common']);

  // Utility function to parse analysis data consistently
  const parseAnalysisData = (rawData: any) => {
    if (!rawData) return rawData;
    
    // If it's already an object, return as is
    if (typeof rawData === 'object' && rawData !== null) {
      return rawData;
    }
    
    // If it's a string, try to parse it as JSON
    if (typeof rawData === 'string') {
      try {
        return JSON.parse(rawData);
      } catch (e) {
        // If JSON parsing fails, return the raw string
        return rawData;
      }
    }
    
    return rawData;
  };

  // Helper function to parse bio sections from the text
  const parseBioSections = (bioText: string) => {
    if (!bioText) return {};
    
    const sections: any = {};
    
    // Look for "Introduction and current status:" pattern
    const introMatch = bioText.match(/Introduction and current status:\s*(.*?)(?=Overall story:|$)/);
    if (introMatch) {
      sections.introduction = introMatch[1].trim();
    }
    
    // Look for "Overall story:" pattern  
    const storyMatch = bioText.match(/Overall story:\s*(.*?)(?=Recent Competitions:|Career Record|Notable Achievements:|$)/);
    if (storyMatch) {
      sections.overallStory = storyMatch[1].trim();
    }
    
    // Look for career record section
    const careerMatch = bioText.match(/Career Record and Rankings:\s*(.*?)(?=Notable Achievements:|Recent Competitions:|$)/);
    if (careerMatch) {
      sections.careerRecord = careerMatch[1].trim();
    }
    
    // If no sections found, display entire bio as introduction
    if (Object.keys(sections).length === 0 && bioText.length > 0) {
      sections.introduction = bioText;
    }
    
    return sections;
  };

  const renderStrengthsAnalysis = (data: any) => {
    console.log('Frontend Strengths Data RECEIVED:', JSON.stringify(data, null, 2));
    
    // Use the original data
    const dataToUse = data;
    
    // Parse the data first using the utility function
    const parsedData = parseAnalysisData(dataToUse);
    
    // Check for error state first
    if (parsedData.error || (parsedData.message && (parsedData.message.includes('Unable to generate') || parsedData.message.includes('تعذر إنشاء')))) {
      return (
        <div className="p-6 text-center">
          <div className="text-red-400 mb-4">{t("analysis.unavailable", "⚠ Analysis Unavailable")}</div>
          <p className="text-muted-foreground mb-4">
            {parsedData.message || t("analysis.strengths.unableToGenerate", "Unable to generate authentic strengths analysis at this time.")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("analysis.tryAgainLater", "Please try again later or contact support if the issue persists.")}
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
        <h3 className={`text-lg font-semibold text-foreground ${i18n.language === 'ar' ? 'text-right' : ''}`}>{t("common:analysis.strengths.athleteStrengths", "Athlete Strengths")}</h3>
        
        {strengths.length > 0 ? strengths.map((strength: any, index: number) => {
          // Only render if we have authentic strength data
          if (!strength.title && !strength.description) {
            return null;
          }
          
          return (
            <Card key={index} className="bg-card border hover:border-athlete-success/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-bold text-green-600 text-lg mb-2">
                    <Star className="inline-block w-5 h-5 mr-2" />
                    {strength.title}
                  </h3>
                  {strength.rating && (
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="bg-athlete-success/20 text-athlete-success border-athlete-success/30" dir="ltr">
                        {formatNumber(strength.rating, i18n.language === 'ar')}/{formatNumber(100, i18n.language === 'ar')}
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
                          {strength.impact}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                
                <p className="text-foreground leading-relaxed mb-4">
                  {strength.description}
                </p>
                
                {strength.evidence && (
                  <div className={`bg-muted rounded-lg p-4 ${i18n.language === 'ar' ? 'border-r-4 border-l-0' : 'border-l-4'} border-green-400`}>
                    <h4 className={`font-semibold text-foreground mb-2 flex items-center ${i18n.language === 'ar' ? 'flex-row-reverse justify-end' : ''}`}>
                      <Award className={`w-4 h-4 ${i18n.language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                      {t("common:analysis.evidence", "Evidence")}
                    </h4>
                    <p className={`text-sm text-foreground italic ${i18n.language === 'ar' ? 'text-right' : ''}`}>
                      {strength.evidence}
                    </p>
                  </div>
                )}
                
                {/* Progress bar for rating visualization */}
                {strength.rating && (
                  <div className="mt-4">
                    <div className={`flex justify-between text-sm text-muted-foreground mb-1 ${i18n.language === 'ar' ? 'flex-row-reverse' : ''}`}>
                      <span>{t("common:analysis.strengths.strengthLevel", "Strength Level")}</span>
                      <span dir={i18n.language === 'ar' ? 'ltr' : 'ltr'}>{formatNumber(strength.rating, i18n.language === 'ar')}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
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
          <div className="text-muted-foreground text-center py-8">
            <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p>{t("analysis.strengths.noData", "No strengths analysis data available")}</p>
            <p className="text-sm mt-2">{t("analysis.strengths.generateNew", "Generate a new analysis to see detailed insights.")}</p>
          </div>
        )}
      </div>
    );
  };

  const renderWeaknessesAnalysis = (data: any) => {
    // Use the original data
    const dataToUse = data;
    
    const parsedData = parseAnalysisData(dataToUse);
    
    if (parsedData.error || (parsedData.message && (parsedData.message.includes('Unable to generate') || parsedData.message.includes('تعذر إنشاء')))) {
      return (
        <div className="p-6 text-center">
          <div className="text-red-400 mb-4">{t("analysis.unavailable", "⚠ Analysis Unavailable")}</div>
          <p className="text-muted-foreground mb-4">
            {parsedData.message || t("analysis.weaknesses.unableToGenerate", "Unable to generate authentic weaknesses analysis at this time.")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("analysis.tryAgainLater", "Please try again later or contact support if the issue persists.")}
          </p>
        </div>
      );
    }

    let weaknesses: any[] = [];
    try {
      weaknesses = Array.isArray(parsedData.weaknesses) ? parsedData.weaknesses : [];
    } catch (error) {
      console.error('Error processing weaknesses data:', error);
      weaknesses = [];
    }

    return (
      <div className="space-y-6">
        <h3 className={`text-lg font-semibold text-foreground ${i18n.language === 'ar' ? 'text-right' : ''}`}>{t("common:analysis.weaknesses.title", "Areas for Improvement")}</h3>
        
        <div className="space-y-4">
          {weaknesses.length > 0 ? weaknesses.map((weakness: any, index: number) => (
            <Card key={index} className="bg-card border hover:border-athlete-danger/50 transition-colors">
              <CardContent className={`p-6 ${i18n.language === 'ar' ? 'text-right' : ''}`}>
                <h3 className={`font-bold text-red-600 text-lg mb-4 flex items-start ${i18n.language === 'ar' ? 'flex-row-reverse text-right justify-end' : ''}`}>
                  <AlertTriangle className={`inline-block w-5 h-5 mt-0.5 flex-shrink-0 ${i18n.language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                  <span>{weakness.title}</span>
                </h3>
                
                <p className={`text-foreground leading-relaxed mb-4 ${i18n.language === 'ar' ? 'text-right' : ''}`}>
                  {weakness.description}
                </p>
                
                {weakness.evidence && (
                  <div className={`bg-muted rounded-lg p-4 ${i18n.language === 'ar' ? 'border-r-4 border-l-0' : 'border-l-4'} border-red-400`}>
                    <h4 className={`font-semibold text-foreground mb-2 flex items-center ${i18n.language === 'ar' ? 'flex-row-reverse justify-end' : ''}`}>
                      <Award className={`w-4 h-4 ${i18n.language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                      {t("common:analysis.evidence", "Evidence")}
                    </h4>
                    <p className={`text-sm text-foreground italic ${i18n.language === 'ar' ? 'text-right' : ''}`}>
                      {weakness.evidence}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )) : (
            <div className="text-muted-foreground text-center py-8">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p>{t("analysis.weaknesses.noData", "No weaknesses analysis data available")}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDevelopmentPlan = (data: any) => {
    const parsedData = parseAnalysisData(data);
    
    if (parsedData.error || (parsedData.message && (parsedData.message.includes('Unable to generate') || parsedData.message.includes('تعذر إنشاء')))) {
      return (
        <div className="p-6 text-center">
          <div className="text-red-400 mb-4">{t("analysis.unavailable", "⚠ Analysis Unavailable")}</div>
          <p className="text-muted-foreground mb-4">
            {parsedData.message || t("analysis.development.unableToGenerate", "Unable to generate authentic development plan at this time.")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("analysis.tryAgainLater", "Please try again later or contact support if the issue persists.")}
          </p>
        </div>
      );
    }

    // Handle the new goal-based development plan structure
    let planItems: any[] = [];
    try {
      // Check for new structure first (goalAnalysis array)
      if (Array.isArray(parsedData.goalAnalysis)) {
        planItems = parsedData.goalAnalysis;
      } else if (Array.isArray(parsedData.plan)) {
        // Fallback to old structure
        planItems = parsedData.plan;
      } else {
        planItems = [];
      }
    } catch (error) {
      console.error('Error processing development plan data:', error);
      planItems = [];
    }

    return (
      <div className="space-y-6">
        {/* Header Section with Duration and Overview */}
        {parsedData.duration && (
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-4 border border-purple-300">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-foreground">{t("analysis.development.program", "Development Program")}</h3>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="bg-purple-600 text-white px-3 py-1">
                <Clock className="w-3 h-3 mr-1" />
                {typeof parsedData.duration === 'string' ? parsedData.duration : 
                 typeof parsedData.duration === 'object' ? (parsedData.duration.description || parsedData.duration.type || t("analysis.development.goalBased", "Goal-based plan")) : 
                 t("analysis.development.plan", "Development Plan")}
              </Badge>
              {planItems.length > 0 && (
                <span className="text-sm text-purple-300">
                  {t("analysis.development.phases", "{{count}} Phase", { count: planItems.length })}
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
                        ? 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-500' 
                        : 'bg-muted border'
                    } hover:border-purple-400 transition-colors`}
                  >
                    {/* Phase Number Indicator */}
                    <div className={`absolute -left-12 top-6 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      isCurrentPhase 
                        ? 'bg-purple-600 text-white ring-4 ring-purple-600/30' 
                        : 'bg-muted-foreground text-foreground'
                    }`}>
                      {phaseNumber}
                    </div>

                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg text-foreground flex items-center gap-2">
                          <Target className="w-5 h-5 text-purple-400" />
                          {item.area || item.title || item.focus || item.phase || item.name || `Goal Area ${phaseNumber}`}
                        </CardTitle>
                        {isCurrentPhase && (
                          <Badge variant="secondary" className="bg-green-600 text-white">
                            <PlayCircle className="w-3 h-3 mr-1" />
                            {t("analysis.development.current", "Current")}
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-purple-700 bg-purple-100 p-3 rounded-lg italic border-l-4 border-purple-500">
                          {typeof item.description === 'string' ? item.description : JSON.stringify(item.description)}
                        </p>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Exercises Section */}
                      {(item.exercises || []).length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            {t("analysis.development.trainingExercises", "Training Exercises")}
                          </h4>
                          <div className="grid gap-2">
                            {(item.exercises || []).map((exercise: any, idx: number) => (
                              <div key={idx} className="flex items-start gap-3 p-2 bg-muted rounded-lg">
                                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-foreground">{exercise.name || exercise.title || `Exercise ${idx + 1}`}</div>
                                  {exercise.description && (
                                    <div className="text-sm text-muted-foreground mt-1">{typeof exercise.description === 'string' ? exercise.description : JSON.stringify(exercise.description)}</div>
                                  )}
                                  {exercise.videoUrl && (
                                    <div className="mt-2">
                                      <Badge variant="outline" className="border-purple-400 text-purple-400 text-xs text-center">
                                        📹 {t("analysis.development.videoAvailable", "Video Available")}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
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
                            {t("analysis.development.keyObjectives", "Key Objectives")}
                          </h4>
                          <div className="grid gap-2">
                            {Array.isArray(item.objectives) ? item.objectives.map((objective: string, idx: number) => (
                              <div key={idx} className="flex items-start gap-3 p-2 bg-blue-900/20 rounded-lg border-l-2 border-blue-500">
                                <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-blue-100">{typeof objective === 'string' ? objective : JSON.stringify(objective)}</span>
                              </div>
                            )) : (
                              <div className="flex items-start gap-3 p-2 bg-blue-900/20 rounded-lg border-l-2 border-blue-500">
                                <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-blue-100">{typeof item.objectives === 'string' ? item.objectives : JSON.stringify(item.objectives)}</span>
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
                                <span className="text-sm text-green-100">{typeof metric === 'string' ? metric : JSON.stringify(metric)}</span>
                              </div>
                            )) : (
                              <div className="flex items-start gap-3 p-2 bg-green-900/20 rounded-lg border-l-2 border-green-500">
                                <BarChart className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-green-100">{typeof item.metrics === 'string' ? item.metrics : JSON.stringify(item.metrics)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Duration for individual phases */}
                      {item.duration && (
                        <div className="pt-2 border-t">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            Duration: {typeof item.duration === 'string' ? item.duration : 
                                     typeof item.duration === 'object' ? (item.duration.description || item.duration.type || 'Duration info') : 
                                     item.duration}
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
          <div className="text-muted-foreground text-center py-12">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">{t("analysis.development.noData", "No development plan data available")}</p>
            <p className="text-sm">{t("analysis.development.generateNew", "Generate a new analysis to see your personalized development program.")}</p>
          </div>
        )}
      </div>
    );
  };

  const renderRankAnalysis = (data: any) => {
    console.log('Frontend Rank Data RECEIVED (Popup):', JSON.stringify(data, null, 2));
    
    // Parse data with comprehensive fallback strategies for adaptive UI
    const parsedData = parseAnalysisData(data);
    
    // Debug: Check for dual-analysis structure
    console.log('🔍 Parsed Data Keys:', Object.keys(parsedData));
    console.log('🔍 Has competitiveAnalysis:', !!parsedData.competitiveAnalysis);
    console.log('🔍 Has rankAnalysis:', !!parsedData.rankAnalysis);
    console.log('🔍 Has rankHistoryData:', !!parsedData.rankHistoryData);
    
    // Check for dual-analysis structure (Taekwondo with rank history)
    if (parsedData.competitiveAnalysis && parsedData.rankAnalysis && parsedData.rankHistoryData) {
      console.log('✅ Dual-analysis structure detected! Rendering DualAnalysisPanel');
      return (
        <DualAnalysisPanel
          competitiveAnalysis={parsedData.competitiveAnalysis}
          rankAnalysis={parsedData.rankAnalysis}
          rankHistoryData={parsedData.rankHistoryData}
          variant="modal"
          defaultTab="competitive"
        />
      );
    }
    
    // Check for Swimming athlete with competitive history data (support English and Arabic)
    const isSwimmingAthlete = parsedData.sport && 
      (parsedData.sport.toLowerCase().includes('swimming') || parsedData.sport.includes('السباحة')) &&
      !parsedData.sport.toLowerCase().includes('artistic') &&
      !parsedData.sport.includes('الفني'); // "artistic" in Arabic
    
    if (isSwimmingAthlete && (parsedData.career_phases || parsedData.rankingProgression)) {
      console.log('✅ Swimming athlete detected! Rendering SwimmingCompetitiveHistory via DualAnalysisPanel');
      return (
        <DualAnalysisPanel
          competitiveAnalysis={parsedData}
          rankAnalysis={null}
          rankHistoryData={null}
          variant="modal"
          defaultTab="competitive"
        />
      );
    }
    
    // Check for Squash athlete with competitive history data (support English and Arabic)
    const isSquashAthlete = parsedData.sport && 
      (parsedData.sport.toLowerCase().includes('squash') || parsedData.sport.includes('سكواش'));
    
    if (isSquashAthlete && (parsedData.career_stats || parsedData.ranking_points || parsedData.recent_results)) {
      console.log('✅ Squash athlete detected! Rendering SquashCompetitiveHistory via DualAnalysisPanel');
      return (
        <DualAnalysisPanel
          competitiveAnalysis={parsedData}
          rankAnalysis={null}
          rankHistoryData={null}
          variant="modal"
          defaultTab="competitive"
        />
      );
    }
    
    // For single-analysis, extract the data normally
    let actualParsedData = parsedData;
    
    // Initialize variables to avoid undefined errors
    let rankingProgression: any[] = [];
    let careerSummary: any = {};
    
    // Handle different data formats and error states
    if (actualParsedData.error || (actualParsedData.message && (actualParsedData.message.includes('Unable to generate') || actualParsedData.message.includes('تعذر إنشاء')))) {
      return (
        <div className="p-6 text-center">
          <div className="text-red-400 mb-4">{t("analysis.rank.unavailable", "⚠ Rank Analysis Unavailable")}</div>
          <p className="text-muted-foreground mb-4">
            {actualParsedData.message || t("analysis.rank.unableToGenerate", "Unable to generate authentic rank history at this time.")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("analysis.tryAgainLater", "Please try again later or contact support if the issue persists.")}
          </p>
        </div>
      );
    }

    // Extract data from the new competitive history analysis structure
    let athleteName, sport, nationality, activePeriod, rankingSystemOverview, careerPhases, analysisNarrative;
    let careerOverview, peakPerformancePeriods, competitionAnalysis, progressionPatterns, notableAchievements, recentForm, insights;
    
    // Handle Gemini professional analysis structure
    if (actualParsedData.success !== false && actualParsedData.athlete_name) {
      athleteName = actualParsedData.athlete_name;
      sport = actualParsedData.sport;
      nationality = actualParsedData.nationality;
      activePeriod = actualParsedData.active_period || {};
      rankingSystemOverview = actualParsedData.ranking_system_overview;
      analysisNarrative = actualParsedData.analysis_narrative;
      
      // Gemini professional analysis fields
      careerOverview = actualParsedData.career_overview;
      peakPerformancePeriods = actualParsedData.peak_performance_periods || [];
      competitionAnalysis = actualParsedData.competition_analysis || {};
      progressionPatterns = actualParsedData.progression_patterns;
      notableAchievements = actualParsedData.notable_achievements || [];
      recentForm = actualParsedData.recent_form;
      insights = actualParsedData.insights || [];
      
      // Career Phases from raw BrowserUse data (athlete.competitiveHistory)
      careerPhases = athlete?.competitiveHistory?.career_phases || actualParsedData.career_phases || [];
    }
    // Handle legacy career_phases structure for backwards compatibility
    else if (actualParsedData.success !== false && actualParsedData.career_phases) {
      careerPhases = actualParsedData.career_phases || [];
      athleteName = actualParsedData.athlete_name;
      sport = actualParsedData.sport;
      nationality = actualParsedData.nationality;
      activePeriod = actualParsedData.active_period || {};
      rankingSystemOverview = actualParsedData.ranking_system_overview;
      analysisNarrative = actualParsedData.analysis_narrative;
    }
    // Fallback to old structure if needed
    else if (actualParsedData.athlete) {
      // Convert old structure to career phases display
      athleteName = actualParsedData.athlete.name;
      sport = actualParsedData.athlete.sport;
      nationality = actualParsedData.athlete.country;
      activePeriod = { start_year: 2017, end_year: "current" };
      rankingSystemOverview = "Traditional ranking system with competition-based progression.";
      careerPhases = [{
        phase_name: "Competition History",
        period: "Career span",
        key_achievements: (actualParsedData.athlete.competitionRankingTimeline || []).map((comp: any) => ({
          year: parseInt(comp.year) || new Date().getFullYear(),
          event_name: comp.competition || "Competition",
          event_tier: comp.competitionLevel || "International",
          result: comp.result || "Participation",
          notes: comp.rankBoostReason || comp.rankingChange || "Competition participation"
        }))
      }];
      analysisNarrative = "Career progression based on competition history and ranking changes.";
    }
    // Format 6: Legacy synthetic structure (currentRank, peakRank, history, recommendations)
    else if (actualParsedData.currentRank || actualParsedData.peakRank || actualParsedData.history) {
      athlete = {
        name: actualParsedData.name || "Athlete",
        currentWorldRank: actualParsedData.currentRank?.toString() || "N/A",
        peakWorldRank: actualParsedData.peakRank?.toString() || "N/A"
      };
      rankingProgression = actualParsedData.history || [];
      careerSummary = {
        firstOfficialRanking: 'Legacy data',
        breakthroughCompetition: 'N/A',
        peakRankingPeriod: 'N/A',
        recentCompetitions: 'N/A',
        nextMajorCompetition: 'N/A'
      };
    }
    // Format 7: Unknown/unrecognized structure - show debug info
    else {
      return (
        <div className="p-6">
          <div className="text-yellow-400 mb-4 text-center">⚠ Unrecognized Rank Data Format</div>
          <p className="text-muted-foreground mb-4 text-center">
            The ranking data structure is not recognized. Please check the backend response format.
          </p>
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-muted-foreground mb-2">Raw Data Structure:</h4>
            <pre className="text-xs text-muted-foreground overflow-auto max-h-40 whitespace-pre-wrap">
              {JSON.stringify(actualParsedData, null, 2)}
            </pre>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* Athlete Header */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-3xl font-bold text-foreground">{athleteName}</h2>
                <p className="text-lg text-blue-300">{sport} • {nationality}</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">{t("common:analysis.careerPhases.careerSpan", "Career Span")}</div>
                <div className="text-xl font-bold text-foreground">
                  {activePeriod.start_year} - {activePeriod.end_year === "current" || activePeriod.end_year?.toString().includes("2025") ? t("common:analysis.careerPhases.present", "Present") : activePeriod.end_year}
                </div>
                {(activePeriod.end_year === "current" || activePeriod.end_year?.toString().includes("2025")) && (
                  <Badge className="bg-green-600 text-white mt-2">Active</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Narrative */}
        {analysisNarrative && (
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-500">
            <CardHeader>
              <CardTitle className="text-xl text-foreground flex items-center">
                <Brain className="mr-3 text-purple-400" size={24} />
                Professional Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="text-foreground leading-relaxed whitespace-pre-line">
                  {analysisNarrative}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Career Phases Timeline */}
        {careerPhases && careerPhases.length > 0 && (
          <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-lg shadow-black/5 border border-white/40 p-6">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-foreground flex items-center">
                <Trophy className="mr-3 text-primary" size={24} />
                {t("common:analysis.careerPhases.title", "Career Phases")}
              </h3>
              <div className="text-sm text-muted-foreground mt-1">{t("common:analysis.careerPhases.subtitle", "Professional career progression through different phases")}</div>
            </div>
            <div>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary to-primary/30 opacity-50"></div>
                
                <div className="space-y-8">
                  {careerPhases.map((phase: any, phaseIndex: number) => (
                    <div key={phaseIndex} className="relative ml-8">
                      {/* Phase Number Indicator */}
                      <div className="absolute -left-12 top-6 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-sm font-bold text-white ring-4 ring-primary/20 shadow-md">
                        {phaseIndex + 1}
                      </div>

                      <div className="bg-white/40 backdrop-blur-sm rounded-2xl shadow-md shadow-black/5 border border-white/50 overflow-hidden">
                        <div className="p-5 border-b border-slate-100">
                          {i18n.language === 'ar' ? (
                            <div dir="rtl" className="flex items-center justify-between">
                              <h4 className="text-xl font-semibold text-foreground">
                                {phase.phase_name?.toLowerCase().includes('international competitive history') 
                                  ? 'المسيرة المهنية الدولية'
                                  : phase.phase_name}
                              </h4>
                              <Badge className="bg-primary/90 text-white shadow-sm">{phase.period}</Badge>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <h4 className="text-xl font-semibold text-foreground">
                                {phase.phase_name}
                              </h4>
                              <Badge className="bg-primary/90 text-white shadow-sm">{phase.period}</Badge>
                            </div>
                          )}
                        </div>
                        <div className={`p-5 ${i18n.language === 'ar' ? 'text-right' : ''}`}>
                          {/* Key Achievements */}
                          {phase.key_achievements && phase.key_achievements.length > 0 && (
                            <div className="divide-y divide-slate-200/80">
                              {phase.key_achievements
                                .slice()
                                .sort((a: any, b: any) => {
                                  // Helper to convert month name to number
                                  const monthToNumber = (monthName: string): number => {
                                    const months: { [key: string]: number } = {
                                      january: 0, jan: 0,
                                      february: 1, feb: 1,
                                      march: 2, mar: 2,
                                      april: 3, apr: 3,
                                      may: 4,
                                      june: 5, jun: 5,
                                      july: 6, jul: 6,
                                      august: 7, aug: 7,
                                      september: 8, sep: 8, sept: 8,
                                      october: 9, oct: 9,
                                      november: 10, nov: 10,
                                      december: 11, dec: 11
                                    };
                                    const normalized = monthName?.toLowerCase().trim() || '';
                                    return months[normalized] ?? 6; // Default to mid-year if no match
                                  };
                                  
                                  // Sort by year first, then by month
                                  const yearA = parseInt(a.year) || 0;
                                  const yearB = parseInt(b.year) || 0;
                                  
                                  if (yearA !== yearB) {
                                    return yearB - yearA; // Most recent year first
                                  }
                                  
                                  // Same year, sort by month
                                  const monthA = monthToNumber(a.month);
                                  const monthB = monthToNumber(b.month);
                                  
                                  return monthB - monthA; // Most recent month first
                                })
                                .map((achievement: any, achievementIndex: number) => {
                                  // Helper function to translate month names to Arabic
                                  const translateMonth = (month: string, year: string) => {
                                    if (!month) return year;
                                    
                                    if (i18n.language === 'ar') {
                                      const monthTranslations: { [key: string]: string } = {
                                        'january': 'يناير',
                                        'february': 'فبراير',
                                        'march': 'مارس',
                                        'april': 'أبريل',
                                        'may': 'مايو',
                                        'june': 'يونيو',
                                        'july': 'يوليو',
                                        'august': 'أغسطس',
                                        'september': 'سبتمبر',
                                        'october': 'أكتوبر',
                                        'november': 'نوفمبر',
                                        'december': 'ديسمبر'
                                      };
                                      const translatedMonth = monthTranslations[month.toLowerCase()] || month;
                                      return `${translatedMonth} ${year}`;
                                    }
                                    
                                    return `${month} ${year}`;
                                  };
                                  
                                  return (
                                    <div key={achievementIndex} className="py-4 first:pt-0 last:pb-0 hover:bg-slate-50/50 transition-colors duration-150">
                                      <div className={`flex items-start justify-between ${i18n.language === 'ar' ? 'flex-row-reverse' : ''}`}>
                                        <div className="flex-1">
                                          <div className={`flex ${i18n.language === 'ar' ? 'flex-row-reverse justify-end gap-2' : 'flex-row gap-3'} items-center mb-1.5`}>
                                            <Badge variant="outline" className="bg-amber-50 border-amber-300 text-amber-700 text-xs text-center shadow-sm">
                                              {translateMonth(achievement.month, achievement.year)}
                                            </Badge>
                                            <span className={`font-semibold text-foreground ${i18n.language === 'ar' ? 'text-right' : ''}`}>{achievement.event_name}</span>
                                          </div>
                                          <div className={`text-sm text-muted-foreground ${i18n.language === 'ar' ? 'text-right' : ''}`}>
                                            {achievement.event_tier}
                                          </div>
                                        </div>
                                        <div className={i18n.language === 'ar' ? 'mr-3' : 'ml-3'}>
                                          {getResultBadge(achievement.result)}
                                        </div>
                                      </div>
                                      
                                      {achievement.notes && 
                                       !["simply compete result", "taekwondodata", "taekwondodata result"].includes(achievement.notes.toLowerCase().trim()) && (
                                        <p className={`text-sm text-muted-foreground leading-relaxed mt-2 ${i18n.language === 'ar' ? 'text-right' : ''}`}>
                                          {achievement.notes}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gemini Professional Analysis */}
        {(careerOverview || peakPerformancePeriods?.length > 0 || notableAchievements?.length > 0 || recentForm) && (
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-500">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground flex items-center">
                <Brain className="mr-3 text-purple-400" size={24} />
                {t('home:competitiveHistory.title')}
              </CardTitle>
              <div className="text-sm text-muted-foreground">{t('home:competitiveHistory.subtitle')}</div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Career Overview */}
              {careerOverview && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                    <Trophy className="mr-2 text-yellow-400" size={20} />
                    {t('home:competitiveHistory.careerOverview')}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">{careerOverview}</p>
                </div>
              )}
              
              {/* Peak Performance Periods */}
              {peakPerformancePeriods && peakPerformancePeriods.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                    <TrendingUp className="mr-2 text-green-400" size={20} />
                    {t('home:competitiveHistory.peakPerformance')}
                  </h3>
                  <div className="space-y-4">
                    {peakPerformancePeriods.map((period: any, index: number) => (
                      <div key={index} className="p-4 bg-muted rounded-lg border border-purple-300">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-purple-600 text-white">{period.period}</Badge>
                        </div>
                        <p className="text-muted-foreground mb-3">{period.description}</p>
                        {period.key_results && period.key_results.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-muted-foreground mb-2">{t('home:competitiveHistory.keyResults')}</p>
                            {period.key_results.map((result: string, idx: number) => (
                              <div key={idx} className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                                <span className="text-sm text-muted-foreground">{result}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Competition Analysis */}
              {competitionAnalysis && Object.keys(competitionAnalysis).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                    <Medal className="mr-2 text-yellow-400" size={20} />
                    {t('home:competitiveHistory.competitionAnalysis')}
                  </h3>
                  <div className="grid gap-3">
                    {competitionAnalysis.grand_prix && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-semibold text-blue-400 mb-1">{t('home:competitiveHistory.grandPrix')}</p>
                        <p className="text-sm text-muted-foreground">{competitionAnalysis.grand_prix}</p>
                      </div>
                    )}
                    {competitionAnalysis.world_championships && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-semibold text-yellow-400 mb-1">{t('home:competitiveHistory.worldChampionships')}</p>
                        <p className="text-sm text-muted-foreground">{competitionAnalysis.world_championships}</p>
                      </div>
                    )}
                    {competitionAnalysis.olympic_games && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-semibold text-gold-400 mb-1">{t('home:competitiveHistory.olympicGames')}</p>
                        <p className="text-sm text-muted-foreground">{competitionAnalysis.olympic_games}</p>
                      </div>
                    )}
                    {competitionAnalysis.continental_events && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-semibold text-green-400 mb-1">{t('home:competitiveHistory.continentalEvents')}</p>
                        <p className="text-sm text-muted-foreground">{competitionAnalysis.continental_events}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Progression Patterns */}
              {progressionPatterns && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                    <BarChart className="mr-2 text-blue-400" size={20} />
                    {t('home:competitiveHistory.progressionPatterns')}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">{progressionPatterns}</p>
                </div>
              )}
              
              {/* Notable Achievements */}
              {notableAchievements && notableAchievements.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                    <Star className="mr-2 text-yellow-400" size={20} />
                    {t('home:competitiveHistory.notableAchievements')}
                  </h3>
                  <div className="space-y-3">
                    {notableAchievements.map((achievement: any, index: number) => (
                      <div key={index} className="p-4 bg-muted rounded-lg border border-yellow-500/30">
                        <p className="font-semibold text-foreground mb-2">{achievement.achievement}</p>
                        <p className="text-sm text-muted-foreground">{achievement.significance}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Recent Form */}
              {recentForm && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                    <TrendingUp className="mr-2 text-emerald-400" size={20} />
                    {t('home:competitiveHistory.recentForm')}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">{recentForm}</p>
                </div>
              )}
              
              {/* Key Insights */}
              {insights && insights.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                    <Brain className="mr-2 text-purple-400" size={20} />
                    {t('home:competitiveHistory.keyInsights')}
                  </h3>
                  <div className="space-y-2">
                    {insights.map((insight: string, index: number) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">{index + 1}</span>
                        </div>
                        <p className="text-muted-foreground">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Ranking System Overview */}
        {rankingSystemOverview && (
          <Card className="bg-card border">
            <CardHeader>
              <CardTitle className="text-xl text-foreground flex items-center">
                <BarChart className="mr-3 text-yellow-400" size={24} />
                {t("analysis.rankingSystem.title", "Ranking System Overview")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">{rankingSystemOverview}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Helper function to get medal icon based on medal type
  const getMedalIcon = (medal: string) => {
    if (medal === 'Gold') {
      return <Medal className="w-5 h-5 text-yellow-500" />;
    } else if (medal === 'Silver') {
      return <Medal className="w-5 h-5 text-muted-foreground" />;
    } else if (medal === 'Bronze') {
      return <Medal className="w-5 h-5 text-amber-600" />;
    } else {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
  };

  // Helper function to format and style competition results
  const getResultBadge = (result: string) => {
    const resultLower = result?.toLowerCase() || '';
    const resultTrimmed = result?.trim() || '';
    
    // Check for 1st place (handles "1st", "gold", "1", "1.")
    if (resultLower.includes('1st') || resultLower.includes('gold') || 
        resultLower === '1' || resultTrimmed === '1.' || resultTrimmed === '1') {
      return (
        <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-gray-900 font-bold text-sm px-4 py-1 shadow-lg">
          🥇 1st
        </Badge>
      );
    }
    
    // Check for 2nd place (handles "2nd", "silver", "2", "2.")
    if (resultLower.includes('2nd') || resultLower.includes('silver') || 
        resultLower === '2' || resultTrimmed === '2.' || resultTrimmed === '2') {
      return (
        <Badge className="bg-gradient-to-r from-gray-300 to-gray-400 text-gray-900 font-bold text-sm px-4 py-1 shadow-lg">
          🥈 2nd
        </Badge>
      );
    }
    
    // Check for 3rd place (handles "3rd", "bronze", "3", "3.")
    if (resultLower.includes('3rd') || resultLower.includes('bronze') || 
        resultLower === '3' || resultTrimmed === '3.' || resultTrimmed === '3') {
      return (
        <Badge className="bg-gradient-to-r from-amber-600 to-amber-700 text-white font-bold text-sm px-4 py-1 shadow-lg">
          🥉 3rd
        </Badge>
      );
    }
    
    // Check for participation (handles "participation", "participated", "PAR")
    if (resultLower.includes('participation') || resultLower.includes('participated') || 
        resultLower === 'par' || resultTrimmed.toUpperCase() === 'PAR') {
      return (
        <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold text-sm px-4 py-1 shadow-md">
          ✓ {t("common:analysis.careerPhases.participated", "Participated")}
        </Badge>
      );
    }
    
    // Default styling for other results
    return (
      <Badge variant="secondary" className="bg-green-600 text-white font-semibold text-sm px-4 py-1">
        {result}
      </Badge>
    );
  };

  const renderBioAnalysis = (data: any) => {
    // Use the original data
    const dataToRender = data;
    
    // Parse the data first using the utility function
    const parsedData = parseAnalysisData(dataToRender);
    
    // Ensure we have a proper object to work with
    let bioData = parsedData;
    
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
    
    // Extract data with safe fallbacks - handle nested data structure
    const actualData = bioData.data || bioData; // Handle case where data is nested under 'data' key
    
    const name = actualData.name || bioData.name || "Athlete Profile";
    const bio = actualData.bio || bioData.bio || "";
    const playersStory = actualData.playersStory || bioData.playersStory || actualData.playerStory || bioData.playerStory || "";
    const rank = actualData.currentRank || actualData.rank || bioData.currentRank || bioData.rank || "N/A";
    const achievements = Array.isArray(actualData.achievements) ? actualData.achievements : 
                        Array.isArray(bioData.achievements) ? bioData.achievements : [];
    const recentNews = actualData.personalInfo?.recentNews || actualData.recentNews || 
                      bioData.personalInfo?.recentNews || bioData.recentNews || [];
    const profileImageUrl = actualData.profileImageUrl || bioData.profileImageUrl;
    
    // Extract athlete data for rankings display (ONLY from bio analysis data, NOT from selected athlete)
    const athleteData = actualData.athlete || bioData.athlete;
    
    // If bio content is empty or just basic text, display it directly
    if (!bio || bio.length < 50) {
      return (
        <div className="space-y-8 max-w-none">
          {/* Bio Analysis Header */}
          <div className="flex items-center space-x-3 mb-6">
            <User className="text-athlete-accent" size={32} />
            <h2 className="text-2xl font-bold text-athlete-accent">{t("analysis.bio.header", "Biography Analysis")}</h2>
          </div>

          <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-l-4 border-l-athlete-accent border-slate-200 shadow-xl">
            <CardContent className="p-8">
              <h3 className="text-3xl font-bold text-emerald-400 mb-6 flex items-center">
                <User className="mr-4 text-emerald-400" size={32} />
                Biography
              </h3>
              <div className="prose max-w-none">
                <p className="text-foreground leading-relaxed text-lg">
                  {bio || t("analysis.bio.noData", "No biography data available.")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Player's Story Section */}
          {playersStory && (
            <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-l-4 border-l-cyan-400 border-slate-200 shadow-xl">
              <CardContent className="p-8">
                <h3 className="text-3xl font-bold text-cyan-400 mb-6 flex items-center">
                  <Star className="mr-4 text-cyan-400" size={32} />
                  {t("common:analysis.bio.playersStory", "Player's Story")}
                </h3>
                <div className="prose max-w-none">
                  <p className="text-foreground leading-relaxed text-lg">{playersStory}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Achievements Section */}
          {achievements.length > 0 && (
            <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-l-4 border-l-athlete-warning border-slate-200 shadow-xl">
              <CardContent className="p-8">
                <h3 className="text-3xl font-bold text-athlete-warning mb-6 flex items-center">
                  <Award className="mr-4 text-athlete-warning" size={32} />
                  {t("analysis.achievements.title", "Notable Achievements")}
                </h3>
                <div className="grid gap-4">
                  {achievements.map((achievementObj: any, index: number) => {
                    // Handle both string and object achievements
                    const text = typeof achievementObj === 'string' ? achievementObj : achievementObj?.achievement || '';
                    const medal = typeof achievementObj === 'object' ? achievementObj?.medal : null;
                    
                    return (
                      <div 
                        key={index}
                        className="flex items-start space-x-4 p-4 bg-muted rounded-xl border border-athlete-warning/20"
                      >
                        <div className="mt-1 flex-shrink-0">
                          {medal ? getMedalIcon(medal) : <div className="w-3 h-3 bg-athlete-warning rounded-full mt-1"></div>}
                        </div>
                        <p className="text-foreground leading-relaxed text-lg font-medium">
                          {text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent News Section */}
          {recentNews.length > 0 && (
            <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-l-4 border-l-purple-400 border-slate-200 shadow-xl">
              <CardContent className="p-8">
                <h3 className="text-3xl font-bold text-purple-400 mb-6 flex items-center">
                  <Calendar className="mr-4 text-purple-400" size={32} />
                  {t("analysis.recentNews.title", "Recent News")}
                </h3>
                <div className="space-y-4">
                  {recentNews.map((news: string, index: number) => (
                    <div 
                      key={index}
                      className="p-6 bg-muted rounded-xl border-l-4 border-purple-400 shadow-lg"
                    >
                      <p className="text-foreground leading-relaxed text-lg font-medium">
                        {typeof news === 'string' ? news : JSON.stringify(news, null, 2)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      );
    }
    
    // Parse bio content to extract different sections
    // Handle both string and object bio formats (Arabic responses come as objects)
    const bioSections = typeof bio === 'string' ? parseBioSections(bio) : bio;

    return (
      <div className="space-y-8 max-w-none">
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
              <div className="w-40 h-40 bg-muted rounded-full flex items-center justify-center border-4 border-athlete-accent shadow-lg">
                <User className="w-20 h-20 text-athlete-accent" />
              </div>
            )}
          </div>
          <h2 className="text-4xl font-bold text-athlete-accent mb-3" data-testid="text-athlete-name">{name}</h2>
          
          {/* Personal Information - Clean Direct Display */}
          {(actualData?.personalInfo || bioData?.personalInfo) && (
            <div className="flex flex-wrap justify-center gap-4 mb-6">
              {((actualData?.personalInfo?.age && actualData.personalInfo.age !== "N/A") || 
                (bioData?.personalInfo?.age && bioData.personalInfo.age !== "N/A")) && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-blue-400/50 hover:border-blue-500 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20 shadow-sm">
                  <div className="flex items-center justify-center w-6 h-6 bg-blue-500/20 rounded-full">
                    <Calendar className="w-3 h-3 text-blue-500" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-blue-600 font-medium">Age</span>
                    <span className="text-sm font-bold text-foreground" data-testid="text-age">{actualData?.personalInfo?.age || bioData?.personalInfo?.age}</span>
                  </div>
                </div>
              )}
              
              {((actualData?.personalInfo?.dateOfBirth && actualData.personalInfo.dateOfBirth !== "N/A") || 
                (bioData?.personalInfo?.dateOfBirth && bioData.personalInfo.dateOfBirth !== "N/A")) && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-green-400/50 hover:border-green-500 transition-all duration-200 hover:shadow-lg hover:shadow-green-500/20 shadow-sm">
                  <div className="flex items-center justify-center w-6 h-6 bg-green-500/20 rounded-full">
                    <Calendar className="w-3 h-3 text-green-500" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-green-600 font-medium">Born</span>
                    <span className="text-sm font-bold text-foreground" data-testid="text-dateofbirth">{actualData?.personalInfo?.dateOfBirth || bioData?.personalInfo?.dateOfBirth}</span>
                  </div>
                </div>
              )}
              
              {((actualData?.personalInfo?.height && actualData.personalInfo.height !== "N/A") || 
                (bioData?.personalInfo?.height && bioData.personalInfo.height !== "N/A")) && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-yellow-400/50 hover:border-yellow-500 transition-all duration-200 hover:shadow-lg hover:shadow-yellow-500/20 shadow-sm">
                  <div className="flex items-center justify-center w-6 h-6 bg-yellow-500/20 rounded-full">
                    <User className="w-3 h-3 text-yellow-500" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-yellow-600 font-medium">Height</span>
                    <span className="text-sm font-bold text-foreground" data-testid="text-height">{actualData?.personalInfo?.height || bioData?.personalInfo?.height}</span>
                  </div>
                </div>
              )}
              
              {((actualData?.personalInfo?.weight && actualData.personalInfo.weight !== "N/A") || 
                (bioData?.personalInfo?.weight && bioData.personalInfo.weight !== "N/A")) && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-orange-400/50 hover:border-orange-500 transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/20 shadow-sm">
                  <div className="flex items-center justify-center w-6 h-6 bg-orange-500/20 rounded-full">
                    <BarChart className="w-3 h-3 text-orange-500" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-orange-600 font-medium">Weight</span>
                    <span className="text-sm font-bold text-foreground" data-testid="text-weight">{actualData?.personalInfo?.weight || bioData?.personalInfo?.weight}</span>
                  </div>
                </div>
              )}
              
              {((actualData?.personalInfo?.position && actualData.personalInfo.position !== "N/A") || 
                (bioData?.personalInfo?.position && bioData.personalInfo.position !== "N/A")) && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-purple-400/50 hover:border-purple-500 transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/20 shadow-sm">
                  <div className="flex items-center justify-center w-6 h-6 bg-purple-500/20 rounded-full">
                    <Trophy className="w-3 h-3 text-purple-500" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-purple-600 font-medium">Position</span>
                    <span className="text-sm font-bold text-foreground" data-testid="text-position">{actualData?.personalInfo?.position || bioData?.personalInfo?.position}</span>
                  </div>
                </div>
              )}
              
              {((actualData?.personalInfo?.educationalBackground && actualData.personalInfo.educationalBackground !== "N/A") || 
                (bioData?.personalInfo?.educationalBackground && bioData.personalInfo.educationalBackground !== "N/A")) && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-emerald-400/50 hover:border-emerald-500 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/20 shadow-sm">
                  <div className="flex items-center justify-center w-6 h-6 bg-emerald-500/20 rounded-full">
                    <Award className="w-3 h-3 text-emerald-500" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-emerald-600 font-medium">Education</span>
                    <span className="text-sm font-bold text-foreground" data-testid="text-education">{actualData?.personalInfo?.educationalBackground || bioData?.personalInfo?.educationalBackground}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Introduction Section */}
        {bioSections.introduction && (
          <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-l-4 border-l-athlete-accent border-slate-200 shadow-xl">
            <CardContent className="p-8">
              <h3 className="text-3xl font-bold text-emerald-400 mb-8 flex items-center">
                <User className="mr-4 text-emerald-400" size={32} />
                {t("common:analysis.bio.introduction", "Introduction")}
              </h3>
              <div className="prose max-w-none space-y-5 [&_strong]:text-foreground [&_strong]:font-semibold" dir={(data?.language === 'ar' || data?.generationLanguage === 'ar') ? 'rtl' : 'ltr'}>
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
                    return (
                      <p key={index} className="text-lg">
                        <span className="font-bold text-cyan-400 text-xl">{matchedTitle}</span>
                        <span className="text-foreground leading-loose"> {trimmedPara.substring(matchedTitle.length)}</span>
                      </p>
                    );
                  }
                  
                  return (
                    <p 
                      key={index} 
                      className={`text-foreground leading-loose text-lg ${index === 0 ? 'bio-first-letter' : ''}`}
                    >
                      {trimmedPara}
                    </p>
                  );
                })}
                
                {/* Previous Sports and Years in Current Sport Info */}
                {actualData.personalInfo && (
                  <div className="mt-8 pt-6 border-t border-slate-200/50">
                    {actualData.personalInfo.previousSports && actualData.personalInfo.previousSports.length > 0 && (
                      <div className="mb-4 p-4 bg-emerald-900/20 rounded-lg border border-emerald-500/20">
                        <span className="text-emerald-400 font-semibold text-base">Previous Sports: </span>
                        <span className="text-muted-foreground text-base">{actualData.personalInfo.previousSports.join(', ')}</span>
                      </div>
                    )}
                    {actualData.personalInfo.yearsInCurrentSport && actualData.personalInfo.yearsInCurrentSport !== "N/A" && (
                      <div className="p-4 bg-emerald-900/20 rounded-lg border border-emerald-500/20">
                        <span className="text-emerald-400 font-semibold text-base">Years in {actualData.sport || 'current sport'}: </span>
                        <span className="text-muted-foreground text-base">{actualData.personalInfo.yearsInCurrentSport}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Player's Story Section */}
        {(playersStory || bioSections.overallStory) && (
          <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-l-4 border-l-cyan-400 border-slate-200 shadow-xl">
            <CardContent className="p-8">
              <h3 className="text-3xl font-bold text-cyan-400 mb-8 flex items-center">
                <Star className="mr-4 text-cyan-400" size={32} />
                {t("common:analysis.bio.playersStory", "Player's Story")}
              </h3>
              <div className="prose max-w-none space-y-5 [&_strong]:text-foreground [&_strong]:font-semibold" dir={(data?.language === 'ar' || data?.generationLanguage === 'ar') ? 'rtl' : 'ltr'}>
                {(playersStory || bioSections.overallStory).split(/\n\n|\n/).filter((para: string) => para.trim()).map((paragraph: string, index: number) => (
                  <p 
                    key={index} 
                    className={`text-foreground leading-loose text-lg ${index === 0 ? 'bio-first-letter' : ''}`}
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
          <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-l-4 border-l-orange-400 border-slate-200 shadow-xl">
            <CardContent className="p-8">
              <h3 className="text-3xl font-bold text-orange-400 mb-8 flex items-center">
                <Trophy className="mr-4 text-orange-400" size={32} />
                Career Record and Rankings
              </h3>
              <div className="prose max-w-none space-y-5 [&_strong]:text-foreground [&_strong]:font-semibold">
                {bioSections.careerRecord.split(/\n\n|\n/).filter((para: string) => para.trim()).map((paragraph: string, index: number) => (
                  <p 
                    key={index} 
                    className={`text-foreground leading-loose text-lg ${index === 0 ? 'bio-first-letter' : ''}`}
                  >
                    {paragraph.trim()}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notable Achievements Section */}
        {achievements.length > 0 && (
          <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-l-4 border-l-athlete-warning border-slate-200 shadow-xl">
            <CardContent className="p-8">
              <h3 className="text-3xl font-bold text-athlete-warning mb-6 flex items-center">
                <Award className="mr-4 text-athlete-warning" size={32} />
                {t("common:analysis.achievements.title", "Notable Achievements")}
              </h3>
              <div className="grid gap-4">
                {achievements.map((achievementObj: any, index: number) => {
                  // Handle both string and object achievements
                  const text = typeof achievementObj === 'string' ? achievementObj : achievementObj?.achievement || '';
                  const medal = typeof achievementObj === 'object' ? achievementObj?.medal : null;
                  
                  return (
                    <div 
                      key={index}
                      className="flex items-start space-x-4 p-4 bg-slate-100 rounded-xl border border-athlete-warning/20"
                    >
                      <div className="mt-1 flex-shrink-0">
                        {medal ? getMedalIcon(medal) : <div className="w-3 h-3 bg-athlete-warning rounded-full mt-1"></div>}
                      </div>
                      <p className="text-foreground leading-relaxed text-lg font-medium">
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
          <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-l-4 border-l-purple-400 border-slate-200 shadow-xl">
            <CardContent className="p-8">
              <h3 className="text-3xl font-bold text-purple-400 mb-6 flex items-center">
                <Calendar className="mr-4 text-purple-400" size={32} />
                Recent Competitions: (2024–2025 results)
              </h3>
              <div className="space-y-4">
                {recentNews.map((news: string, index: number) => (
                  <div 
                    key={index}
                    className="p-6 bg-slate-100 rounded-xl border-l-4 border-purple-400 shadow-lg"
                  >
                    <p className="text-foreground leading-relaxed text-lg font-medium">
                      {typeof news === 'string' ? news : JSON.stringify(news, null, 2)}
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

  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [showInputForm, setShowInputForm] = useState(false);
  const [showCustomizePlanModal, setShowCustomizePlanModal] = useState(false);
  const queryClient = useQueryClient();

  const handleExport = async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    toast({
      title: "Export Started",
      description: "Your PDF export is being generated...",
    });

    try {
      // Parse the analysis data
      const parsedData = parseAnalysisData(data);
      
      // Determine locale - check if data has Arabic content or language property
      const hasArabicContent = (text: string) => /[\u0600-\u06FF]/.test(text || '');
      const dataString = JSON.stringify(parsedData);
      const locale = parsedData?.language === 'ar' || 
                     parsedData?.language === 'arabic' || 
                     hasArabicContent(dataString) ? 'ar' : 'en';
      
      // Use the professional PDF generator
      const pdfBlob = await generateProfessionalPdf({
        type,
        data: parsedData,
        createdAt,
        athleteName,
        locale
      });

      // Generate filename based on type, athlete name and current date
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const cleanAthleteName = athleteName ? athleteName.replace(/[^a-zA-Z0-9]/g, '_') : 'Analysis';
      const filename = `${cleanAthleteName}_${getTitle(type).replace(/\s+/g, '_')}_${dateStr}.pdf`;

      // Create download link and trigger download
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `PDF has been downloaded as ${filename}`,
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: t("analysis.exportFailed", "Export Failed"),
        description: t("analysis.exportError", "There was an error generating the PDF. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Legacy PDF functions (unused - kept for reference)
  const generatePDFContent = async (pdf: any, analysisType: string, data: any, createdAt?: string, athleteName?: string) => {
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);
    let currentY = margin;

    // Helper function to add text with automatic page breaks
    const addText = (text: string, x: number, y: number, options: any = {}) => {
      const lines = pdf.splitTextToSize(text, maxWidth - x + margin);
      
      for (let i = 0; i < lines.length; i++) {
        if (currentY > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
        }
        
        pdf.text(lines[i], x, currentY);
        currentY += options.lineHeight || 7;
      }
      
      return currentY;
    };

    // Add header
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    currentY = addText(getTitle(analysisType), margin, currentY, { lineHeight: 10 });
    
    // Add athlete name if available
    if (athleteName) {
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'normal');
      currentY = addText(`Athlete: ${athleteName}`, margin, currentY + 5, { lineHeight: 8 });
    }
    
    // Add generation date
    if (createdAt) {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      currentY = addText(`Generated on: ${new Date(createdAt).toLocaleDateString()}`, margin, currentY + 3, { lineHeight: 7 });
    }
    
    currentY += 15;

    // Generate content based on analysis type
    switch (analysisType) {
      case 'bio':
        await generateBioPDF(pdf, data, addText, margin, currentY);
        break;
      case 'rank':
        await generateRankPDF(pdf, data, addText, margin, currentY);
        break;
      case 'strengths':
        await generateStrengthsPDF(pdf, data, addText, margin, currentY);
        break;
      case 'weaknesses':
        await generateWeaknessesPDF(pdf, data, addText, margin, currentY);
        break;
      case 'development':
      case 'development-plan':
        await generateDevelopmentPDF(pdf, data, addText, margin, currentY);
        break;
      case 'nutrition':
      case 'nutrition-plan':
        await generateNutritionPDF(pdf, data, addText, margin, currentY);
        break;
      case 'beat':
      case 'beat-strategies':
        await generateBeatStrategiesPDF(pdf, data, addText, margin, currentY);
        break;
      default:
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        addText('Analysis data not available for PDF export.', margin, currentY);
    }
  };

  // Bio analysis PDF generation (same as in analysis-result.tsx)
  const generateBioPDF = async (pdf: jsPDF, data: any, addText: Function, margin: number, startY: number) => {
    let currentY = startY;
    
    let bioData = data.data;
    
    if (typeof bioData === 'string') {
      try {
        bioData = JSON.parse(bioData);
      } catch (e) {
        bioData = { bio: bioData };
      }
    }

    if (!bioData || typeof bioData !== 'object') {
      bioData = { bio: "Analysis data could not be parsed properly" };
    }

    const name = bioData.name || "Athlete Profile";
    const bio = bioData.bio || "";
    const playersStory = bioData.playersStory || "";
    const achievements = Array.isArray(bioData.achievements) ? bioData.achievements : [];
    const recentNews = bioData.personalInfo?.recentNews || bioData.recentNews || [];

    // Parse bio sections
    const parseBioSections = (bioText: string) => {
      if (!bioText) return {};
      
      const sections: any = {};
      
      const introMatch = bioText.match(/^(.*?)\n\n/);
      if (introMatch) {
        sections.introduction = introMatch[1].trim();
      }
      
      const storyMatch = bioText.match(/Players' overall story and what they're known for[\s\S]*?\n\n([\s\S]*?)(?:\n\n|$)/);
      if (storyMatch) {
        sections.overallStory = storyMatch[1].trim();
      } else {
        const parts = bioText.split('\n\n');
        if (parts.length > 1) {
          sections.overallStory = parts.slice(1, -1).join('\n\n');
        }
      }
      
      const careerMatch = bioText.match(/career record|rankings|record/i);
      if (careerMatch) {
        const careerText = bioText.substring(careerMatch.index || 0);
        const endMatch = careerText.match(/\n\n/);
        sections.careerRecord = endMatch ? careerText.substring(0, endMatch.index) : careerText;
      }
      
      return sections;
    };

    // Handle both string and object bio formats (Arabic responses come as objects)
    const bioSections = typeof bio === 'string' ? parseBioSections(bio) : bio;

    // Introduction
    if (bioSections.introduction) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      currentY = addText(t("common:analysis.bio.introduction", "Introduction"), margin, currentY, { lineHeight: 8 });
      currentY += 3;
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      currentY = addText(bioSections.introduction, margin, currentY, { lineHeight: 6 });
      currentY += 8;
    }

    // Player's Story
    const storyText = playersStory && playersStory.trim() ? playersStory : bioSections.overallStory;
    if (storyText) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      currentY = addText(t("common:analysis.bio.playersStory", "Player's Story"), margin, currentY, { lineHeight: 8 });
      currentY += 3;
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      currentY = addText(storyText, margin, currentY, { lineHeight: 6 });
      currentY += 8;
    }

    // Career Record
    if (bioSections.careerRecord) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      currentY = addText("Career Record and Rankings", margin, currentY, { lineHeight: 8 });
      currentY += 3;
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      currentY = addText(bioSections.careerRecord, margin, currentY, { lineHeight: 6 });
      currentY += 8;
    }

    // Achievements
    if (achievements.length > 0) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      currentY = addText(t("analysis.achievements.title", "Notable Achievements"), margin, currentY, { lineHeight: 8 });
      currentY += 3;
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      
      achievements.forEach((achievementObj: any) => {
        const text = achievementObj?.achievement || '';
        const medal = achievementObj?.medal || 'Participation';
        
        if (text) {
          currentY = addText(`• ${medal}: ${text}`, margin + 5, currentY, { lineHeight: 6 });
          currentY += 2;
        }
      });
      currentY += 5;
    }

    // Recent Competitions
    if (recentNews.length > 0) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      currentY = addText("Recent Competitions (2024-2025)", margin, currentY, { lineHeight: 8 });
      currentY += 3;
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      
      recentNews.forEach((newsItem: string) => {
        currentY = addText(`• ${newsItem}`, margin + 5, currentY, { lineHeight: 6 });
        currentY += 2;
      });
    }
  };

  // Additional PDF generation functions for other analysis types
  const generateRankPDF = async (pdf: jsPDF, data: any, addText: Function, margin: number, startY: number) => {
    let currentY = startY;
    
    let athlete, rankingProgression, careerSummary;
    
    if (data.athlete && data.rankingProgression !== undefined && data.careerSummary) {
      athlete = data.athlete;
      rankingProgression = data.rankingProgression;
      careerSummary = data.careerSummary;
    } else if (data.currentRank || data.peakRank || data.history) {
      athlete = {
        name: 'Unknown Athlete',
        currentRanking: data.currentRank,
        peakRanking: data.peakRank,
        officialRecord: data.competitionRecord || 'N/A'
      };
      rankingProgression = data.history || [];
      careerSummary = {
        totalCompetitions: 'N/A',
        majorTitles: 'N/A',
        rankingTrend: 'N/A',
        notableAchievements: data.recommendations || []
      };
    } else {
      currentY = addText("Ranking data not available for PDF export.", margin, currentY);
      return;
    }

    // Career Overview
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    currentY = addText("Career Overview", margin, currentY, { lineHeight: 8 });
    currentY += 5;
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    currentY = addText(`Current Rank: ${athlete.currentRanking || 'N/A'}`, margin, currentY, { lineHeight: 6 });
    currentY = addText(`Peak Rank: ${athlete.peakRanking || 'N/A'}`, margin, currentY, { lineHeight: 6 });
    currentY = addText(`Official Record: ${athlete.officialRecord || 'N/A'}`, margin, currentY, { lineHeight: 6 });
    currentY = addText(`Total Competitions: ${careerSummary.totalCompetitions || 'N/A'}`, margin, currentY, { lineHeight: 6 });
    currentY += 8;

    // Ranking Progression
    if (rankingProgression && rankingProgression.length > 0) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      currentY = addText(t("analysis.rank.progression", "Ranking Progression"), margin, currentY, { lineHeight: 8 });
      currentY += 3;
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      
      rankingProgression.forEach((entry: any) => {
        const competition = entry.competition || entry.tournament || 'Event';
        const date = entry.date || entry.month || 'Date unknown';
        const result = entry.result || entry.placement || 'Result unknown';
        const ranking = entry.ranking || entry.rank || 'N/A';
        
        currentY = addText(`• ${competition} (${date})`, margin + 5, currentY, { lineHeight: 6 });
        currentY = addText(`  Result: ${result} | Rank: #${ranking}`, margin + 10, currentY, { lineHeight: 6 });
        currentY += 2;
      });
      currentY += 5;
    }

    // Career Summary
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    currentY = addText("Career Summary", margin, currentY, { lineHeight: 8 });
    currentY += 3;
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    currentY = addText(`Major Titles: ${careerSummary.majorTitles || 'N/A'}`, margin, currentY, { lineHeight: 6 });
    currentY = addText(`Ranking Trend: ${careerSummary.rankingTrend || 'N/A'}`, margin, currentY, { lineHeight: 6 });
    currentY = addText(`Current Form: ${careerSummary.currentForm || 'N/A'}`, margin, currentY, { lineHeight: 6 });
    
    // Notable Achievements
    if (careerSummary.notableAchievements && careerSummary.notableAchievements.length > 0) {
      currentY += 8;
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      currentY = addText(t("analysis.achievements.title", "Notable Achievements"), margin, currentY, { lineHeight: 8 });
      currentY += 3;
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      
      careerSummary.notableAchievements.forEach((achievement: string) => {
        currentY = addText(`• ${achievement}`, margin + 5, currentY, { lineHeight: 6 });
        currentY += 2;
      });
    }
  };

  const generateStrengthsPDF = async (pdf: jsPDF, data: any, addText: Function, margin: number, startY: number) => {
    let currentY = startY;
    
    let strengths: any[] = [];
    
    if (data.strengths && Array.isArray(data.strengths)) {
      strengths = data.strengths;
    } else if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        strengths = parsed.strengths || [];
      } catch (e) {
        currentY = addText("Could not parse strengths data for PDF export.", margin, currentY);
        return;
      }
    }

    if (strengths.length === 0) {
      currentY = addText(t("analysis.strengths.noPdfData", "No strengths data available for PDF export."), margin, currentY);
      return;
    }

    strengths.forEach((strength: any, index: number) => {
      // Strength title
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      currentY = addText(`${index + 1}. ${strength.title}`, margin, currentY, { lineHeight: 7 });
      
      // Rating and category
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const ratingText = `Rating: ${strength.rating || 'N/A'}/100 | Category: ${strength.category || 'N/A'}`;
      currentY = addText(ratingText, margin + 5, currentY, { lineHeight: 6 });
      currentY += 2;
      
      // Description
      if (strength.description) {
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        currentY = addText(strength.description, margin + 5, currentY, { lineHeight: 6 });
        currentY += 3;
      }
      
      // Evidence
      if (strength.evidence) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'italic');
        currentY = addText(`${t("analysis.evidence", "Evidence")}: ${strength.evidence}`, margin + 5, currentY, { lineHeight: 6 });
        currentY += 5;
      }
    });
  };

  const generateWeaknessesPDF = async (pdf: jsPDF, data: any, addText: Function, margin: number, startY: number) => {
    let currentY = startY;
    
    let weaknesses: any[] = [];
    
    if (data.weaknesses && Array.isArray(data.weaknesses)) {
      weaknesses = data.weaknesses;
    } else if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        weaknesses = parsed.weaknesses || [];
      } catch (e) {
        currentY = addText("Could not parse weaknesses data for PDF export.", margin, currentY);
        return;
      }
    }

    if (weaknesses.length === 0) {
      currentY = addText(t("analysis.weaknesses.noPdfData", "No weaknesses data available for PDF export."), margin, currentY);
      return;
    }

    weaknesses.forEach((weakness: any, index: number) => {
      // Weakness title
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      currentY = addText(`${index + 1}. ${weakness.title}`, margin, currentY, { lineHeight: 7 });
      
      // Severity and category
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const severityText = `Severity: ${weakness.severity || 'N/A'}/100 | Category: ${weakness.category || 'N/A'}`;
      currentY = addText(severityText, margin + 5, currentY, { lineHeight: 6 });
      currentY += 2;
      
      // Description
      if (weakness.description) {
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        currentY = addText(weakness.description, margin + 5, currentY, { lineHeight: 6 });
        currentY += 3;
      }
      
      // Evidence
      if (weakness.evidence) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'italic');
        currentY = addText(`${t("analysis.evidence", "Evidence")}: ${weakness.evidence}`, margin + 5, currentY, { lineHeight: 6 });
        currentY += 5;
      }
    });
  };

  const generateDevelopmentPDF = async (pdf: jsPDF, data: any, addText: Function, margin: number, startY: number) => {
    let currentY = startY;
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    currentY = addText("Development plan content would be formatted here based on the specific data structure.", margin, currentY, { lineHeight: 6 });
  };

  const generateNutritionPDF = async (pdf: jsPDF, data: any, addText: Function, margin: number, startY: number) => {
    let currentY = startY;
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    currentY = addText("Nutrition plan content would be formatted here based on the specific data structure.", margin, currentY, { lineHeight: 6 });
  };

  const generateBeatStrategiesPDF = async (pdf: jsPDF, data: any, addText: Function, margin: number, startY: number) => {
    let currentY = startY;
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    currentY = addText("Beat strategies content would be formatted here based on the specific data structure.", margin, currentY, { lineHeight: 6 });
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




  // User input states for enhanced analysis
  const [developmentDuration, setDevelopmentDuration] = useState("4 weeks");
  const [developmentGoal, setDevelopmentGoal] = useState("");
  const [currentWeight, setCurrentWeight] = useState("70 kg");
  const [age, setAge] = useState("25");
  const [preferredCuisine, setPreferredCuisine] = useState("Mediterranean");

  const getIcon = (type: string) => {
    switch (type) {
      case "bio":
        return <User className="text-athlete-accent" size={28} />;
      case "rank":
        return <Trophy className="text-athlete-warning" size={28} />;
      case "strengths":
        return <Star className="text-athlete-success" size={28} />;
      case "weaknesses":
        return <AlertTriangle className="text-athlete-danger" size={28} />;
      case "development":
      case "development-plan":
        return <Calendar className="text-purple-400" size={28} />;
      case "nutrition":
      case "nutrition-plan":
        return <Apple className="text-green-400" size={28} />;
      case "beat":
      case "beat-strategies":
        return <ClipboardList className="text-purple-500" size={28} />;
      case "video":
      case "video-analysis":
        return <Video className="text-indigo-400" size={28} />;
      default:
        return <User className="text-athlete-accent" size={28} />;
    }
  };

  const getTitle = (type: string) => {
    switch (type) {
      case "bio":
        return t("common:analysis.bio.title", "Complete Athlete Biography");
      case "rank":
        return t("common:analysis.rank.title", "Competitive History");
      case "strengths":
        return t("common:analysis.strengths.title", "Competitive Strengths Profile");
      case "weaknesses":
        return t("common:analysis.weaknesses.title", "Areas for Improvement");
      case "development":
      case "development-plan":
        return t("common:analysis.development.plan", "Development Plan");
      case "nutrition":
      case "nutrition-plan":
        return t("common:analysis.nutrition.plan", "Personalized Nutrition Plan");
      case "beat":
      case "beat-strategies":
        return t("common:analysis.combat.title", "Strategic Combat Analysis");
      case "video":
      case "video-analysis":
        return t("common:analysis.videoAnalysis.dynamicPerformanceAnalysis", "Dynamic Performance Analysis");
      case "comparison":
        // Check if the comparison content is in Arabic
        const isArabicComparison = data?.language === 'arabic' || data?.language === 'ar';
        return isArabicComparison ? "نتائج التحليل" : "Analysis Results";
      default:
        return t("common:analysis.results", "Analysis Results");
    }
  };

  // Video analysis renderer
  const renderVideoAnalysis = (data: any) => {
    if (!data) {
      return <div className="text-muted-foreground text-center py-8">Video analysis data not available</div>;
    }

    // Check if it's an error result
    if (data.error) {
      return (
        <div className="text-center py-8">
          <div className="text-red-400 mb-4">Video Analysis Error</div>
          <p className="text-muted-foreground">{data.errorMessage || "Unable to analyze video"}</p>
        </div>
      );
    }

    return <VideoAnalysisResults analysisData={data} sport={data.sport} />;
  };

  // Helper function to translate comparison section titles to Arabic
  const translateComparisonTitles = (content: string): string => {
    if (!content) return content;
    
    const translations: Record<string, string> = {
      'Overall Analysis:': 'التحليل العام:',
      'Predicted Winner:': 'الفائز المتوقع:',
      'Key Reasons:': 'الأسباب الرئيسية:',
      'Current Rankings:': 'التصنيفات الحالية:',
      'Strengths:': 'نقاط القوة:',
      'Technical Strengths:': 'نقاط القوة التقنية:',
      'Areas for Improvement:': 'مجالات التحسين:',
      'Weaknesses:': 'نقاط الضعف:',
      'Technical Development Areas:': 'مجالات التطوير الفني:',
      'Performance Areas for Development:': 'مجالات تطوير الأداء:',
      'Strategic Development Areas:': 'مجالات التطوير الاستراتيجي:',
      'Head-to-Head Analysis': 'التحليل المباشر',
      'Analysis:': 'التحليل:',
      'Confidence:': 'الثقة:',
      'Key Factors:': 'العوامل الرئيسية:',
      'Match Scenario:': 'سيناريو المباراة:',
      'Tactical Advice:': 'النصائح التكتيكية:',
      'Physical Attributes:': 'الخصائص الجسدية:',
      'Technical Skills:': 'المهارات الفنية:',
      'Recent Performance:': 'الأداء الأخير:',
      'Technical Profile:': 'الملف الفني:',
      'Record:': 'السجل:',
      'Last Competition:': 'آخر منافسة:',
      'Current Form:': 'الحالة الحالية:',
      'Height:': 'الطول:',
      'Weight:': 'الوزن:',
      'Stance:': 'الموقف:',
      'Evidence:': 'الدليل:',
      'Athlete 1 Strengths': 'نقاط قوة الرياضي الأول',
      'Athlete 2 Strengths': 'نقاط قوة الرياضي الثاني',
    };
    
    let translated = content;
    Object.entries(translations).forEach(([english, arabic]) => {
      // Use regex with global flag to replace all occurrences
      const regex = new RegExp(english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      translated = translated.replace(regex, arabic);
    });
    
    return translated;
  };

  // Comparison analysis renderer
  const renderComparisonAnalysis = (data: any) => {
    if (!data) {
      return <div className="text-muted-foreground text-center py-8">Comparison analysis data not available</div>;
    }

    const normalizedComparison = normalizeComparison(data);
    
    // Check if this is an Arabic comparison and translate section titles
    const isArabicComparison = data.language === 'arabic' || data.language === 'ar';
    if (isArabicComparison && normalizedComparison?.tabs) {
      const validKeys = ['overview', 'strengths', 'weaknesses', 'headToHead', 'details'] as const;
      validKeys.forEach(key => {
        if (normalizedComparison.tabs[key] && typeof normalizedComparison.tabs[key] === 'string') {
          normalizedComparison.tabs[key] = translateComparisonTitles(normalizedComparison.tabs[key]!);
        }
      });
    }
    
    if (normalizedComparison && normalizedComparison.tabs) {
      return (
        <div className="space-y-6">
          {/* Athletes Header - Enhanced with Pictures, Country, and Ranks */}
          {normalizedComparison.athlete1 && normalizedComparison.athlete2 ? (
            <div className="grid grid-cols-2 gap-6">
              {/* Athlete 1 */}
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 overflow-hidden border-2 border-slate-200">
                  {normalizedComparison.athlete1.profileImageUrl ? (
                    <img 
                      src={normalizedComparison.athlete1.profileImageUrl} 
                      alt={normalizedComparison.athlete1.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerHTML = '<svg class="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>';
                      }}
                    />
                  ) : (
                    <User className="w-10 h-10 text-muted-foreground" />
                  )}
                </div>
                <h3 className="text-foreground font-semibold text-lg">{normalizedComparison.athlete1.name}</h3>
                <Badge variant="outline" className="mt-2">
                  {normalizedComparison.athlete1.country || "Unknown"}
                </Badge>
                
                {/* Rankings Display - Same as Athlete Comparison */}
                {normalizedComparison.athlete1.rankings?.categories && normalizedComparison.athlete1.rankings.categories.length > 0 && (
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {normalizedComparison.athlete1.rankings.categories.map((rankingCategory: any, index: number) => {
                      // Null-check category before processing
                      if (!rankingCategory.category) return null;
                      
                      const categoryLower = rankingCategory.category.toLowerCase();
                      const isOlympic = categoryLower.includes('olympic');
                      const isContinental = categoryLower.includes('continental') || 
                                           categoryLower.includes('europe') ||
                                           categoryLower.includes('asia') ||
                                           categoryLower.includes('africa') ||
                                           categoryLower.includes('america');
                      const isNational = categoryLower.includes('national');
                      const isWorld = categoryLower.includes('world') && !isOlympic;
                      
                      return (
                        <Badge 
                          key={index}
                          className={
                            isOlympic ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                            isContinental ? "bg-green-500/20 text-green-400 border-green-500/30" :
                            isNational ? "bg-blue-500/20 text-blue-400 border-blue-300" :
                            isWorld ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                            "bg-muted text-muted-foreground border"
                          }
                        >
                          {rankingCategory.category}: #{!isNaN(Number(rankingCategory.rank)) ? Math.floor(Number(rankingCategory.rank)) : rankingCategory.rank}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {/* Athlete 2 */}
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 overflow-hidden border-2 border-purple-300">
                  {normalizedComparison.athlete2.profileImageUrl ? (
                    <img 
                      src={normalizedComparison.athlete2.profileImageUrl} 
                      alt={normalizedComparison.athlete2.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerHTML = '<svg class="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>';
                      }}
                    />
                  ) : (
                    <User className="w-10 h-10 text-muted-foreground" />
                  )}
                </div>
                <h3 className="text-foreground font-semibold text-lg">{normalizedComparison.athlete2.name}</h3>
                <Badge variant="outline" className="mt-2">
                  {normalizedComparison.athlete2.country || "Unknown"}
                </Badge>
                
                {/* Rankings Display - Same as Athlete Comparison */}
                {normalizedComparison.athlete2.rankings?.categories && normalizedComparison.athlete2.rankings.categories.length > 0 && (
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {normalizedComparison.athlete2.rankings.categories.map((rankingCategory: any, index: number) => {
                      // Null-check category before processing
                      if (!rankingCategory.category) return null;
                      
                      const categoryLower = rankingCategory.category.toLowerCase();
                      const isOlympic = categoryLower.includes('olympic');
                      const isContinental = categoryLower.includes('continental') || 
                                           categoryLower.includes('europe') ||
                                           categoryLower.includes('asia') ||
                                           categoryLower.includes('africa') ||
                                           categoryLower.includes('america');
                      const isNational = categoryLower.includes('national');
                      const isWorld = categoryLower.includes('world') && !isOlympic;
                      
                      return (
                        <Badge 
                          key={index}
                          className={
                            isOlympic ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                            isContinental ? "bg-green-500/20 text-green-400 border-green-500/30" :
                            isNational ? "bg-blue-500/20 text-blue-400 border-blue-300" :
                            isWorld ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                            "bg-muted text-muted-foreground border"
                          }
                        >
                          {rankingCategory.category}: #{!isNaN(Number(rankingCategory.rank)) ? Math.floor(Number(rankingCategory.rank)) : rankingCategory.rank}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : normalizedComparison.athleteNames && normalizedComparison.athleteNames.length > 0 && (
            // Fallback header for historical data with only athlete names
            <Card className="bg-card border">
              <CardContent className="p-4">
                <div className="flex items-center justify-center space-x-4">
                  {normalizedComparison.athleteNames.map((name, index) => (
                    <div key={index} className="flex items-center">
                      <User className="mr-2" size={20} />
                      <span className="text-foreground font-medium">{name}</span>
                      {index < normalizedComparison.athleteNames!.length - 1 && (
                        <span className="mx-4 text-muted-foreground">vs</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Overview Tab */}
          {normalizedComparison.tabs.overview && (
            <Card className="bg-card border">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center">
                  <User className="mr-3" size={24} />
                  {t("analysis.comparison.overviewTitle", "Comparison Overview")}
                </h3>
                <div className="prose max-w-none">
                  <div 
                    className="whitespace-pre-wrap text-foreground leading-relaxed [&_strong]:text-foreground [&_strong]:font-semibold"
                    dangerouslySetInnerHTML={{ __html: normalizedComparison.tabs.overview }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Strengths Analysis */}
          {normalizedComparison.tabs.strengths && (
            <Card className="bg-card border">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-green-600 mb-4 flex items-center">
                  <Star className="mr-3" size={24} />
                  {t("analysis.comparison.strengthsTitle", "Strengths Analysis")}
                </h3>
                <div className="prose max-w-none">
                  <div 
                    className="whitespace-pre-wrap text-foreground leading-relaxed [&_strong]:text-foreground [&_strong]:font-semibold"
                    dangerouslySetInnerHTML={{ __html: normalizedComparison.tabs.strengths }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weaknesses Analysis */}
          {normalizedComparison.tabs.weaknesses && (
            <Card className="bg-card border">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-red-600 mb-4 flex items-center">
                  <AlertTriangle className="mr-3" size={24} />
                  {isArabicComparison ? "مجالات التحسين" : t("analysis.weaknesses.title", "Areas for Improvement")}
                </h3>
                <div className="prose max-w-none">
                  <div 
                    className="whitespace-pre-wrap text-foreground leading-relaxed [&_strong]:text-foreground [&_strong]:font-semibold"
                    dangerouslySetInnerHTML={{ __html: normalizedComparison.tabs.weaknesses }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Technical Details */}
          {normalizedComparison.tabs.details && (
            <Card className="bg-card border">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center">
                  <Brain className="mr-3" size={24} />
                  {t("analysis.comparison.detailsTitle", "Technical Details & Analysis")}
                </h3>
                <div className="prose max-w-none">
                  <div 
                    className="whitespace-pre-wrap text-foreground leading-relaxed [&_strong]:text-foreground [&_strong]:font-semibold"
                    dangerouslySetInnerHTML={{ __html: normalizedComparison.tabs.details }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Head-to-Head */}
          {normalizedComparison.tabs.headToHead && (
            <Card className="bg-card border">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center">
                  <Target className="mr-3" size={24} />
                  {t("analysis.comparison.headToHeadTitle", "Head-to-Head Analysis")}
                </h3>
                <div className="prose max-w-none">
                  <div 
                    className="whitespace-pre-wrap text-foreground leading-relaxed [&_strong]:text-foreground [&_strong]:font-semibold"
                    dangerouslySetInnerHTML={{ __html: normalizedComparison.tabs.headToHead }}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      );
    }

    // Fallback for other comparison formats
    return (
      <div className="space-y-6">
        <Card className="bg-card border">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center">
              <User className="mr-3" size={24} />
              Athlete Comparison Analysis
            </h3>
            <div className="text-center py-8">
              <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Comparison data could not be processed.</p>
              <p className="text-muted-foreground text-sm mt-2">Please try generating a new comparison analysis.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderAnalysisContent = () => {
    if (!data) {
      return <div className="text-muted-foreground text-center py-8">Analysis data not available</div>;
    }

    // Special handling for bio analysis
    if (type === "bio") {
      return renderBioAnalysis(data);
    }

    // Special handling for nutrition plans
    if (type === "nutrition" || type === "nutrition-plan") {
      const normalizedPlan = normalizeNutritionPlan(data);
      
      if (normalizedPlan) {
        return <NutritionPlanDisplay plan={normalizedPlan} language={data.language || i18n.language} />;
      } else {
        // Fallback to user-friendly empty state
        return (
          <div className="space-y-6">
            <Card className="bg-card border">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center">
                  <Apple className="mr-3" size={24} />
                  Nutrition Plan Analysis
                </h3>
                <div className="text-center py-8">
                  <Apple className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nutrition plan data could not be processed.</p>
                  <p className="text-muted-foreground text-sm mt-2">Please try generating a new nutrition plan.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }
    }

    // Special handling for strategic combat analysis
    if (type === "beat" || type === "beat-strategies") {
      return <StrategicCombatDisplay data={data} />;
    }

    // Special handling for strengths analysis
    if (type === "strengths") {
      return renderStrengthsAnalysis(data);
    }

    // Special handling for weaknesses analysis
    if (type === "weaknesses") {
      return renderWeaknessesAnalysis(data);
    }

    // Special handling for development plan
    if (type === "development" || type === "development-plan") {
      const normalizedPlan = normalizeDevelopmentPlan(data);
      
      if (normalizedPlan) {
        return <DevelopmentPlanDisplay plan={normalizedPlan} language={data.language || i18n.language} />;
      } else {
        // Fallback to user-friendly empty state
        return (
          <div className="space-y-6">
            <Card className="bg-card border">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center">
                  <Calendar className="mr-3" size={24} />
                  {t("analysis.development.analysisTitle", "Development Plan Analysis")}
                </h3>
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Development plan data could not be processed.</p>
                  <p className="text-muted-foreground text-sm mt-2">Please try generating a new development plan.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }
    }

    // Special handling for video analysis
    if (type === "video" || type === "video-analysis") {
      return renderVideoAnalysis(data);
    }

    // Special handling for comparison analysis
    if (type === "comparison") {
      return renderComparisonAnalysis(data);
    }

    // Special handling for rank analysis
    if (type === "rank") {
      return renderRankAnalysis(data);
    }

    // Special handling for statistics analysis
    if (type === "statistics") {
      return <StatisticsDisplay statistics={data} language={i18n.language} />;
    }

    // Parse the data to handle JSON strings consistently
    const parsedData = parseAnalysisData(data);

    // For other analysis types, show structured display
    return (
      <div className="space-y-6">
        <div className="text-muted-foreground max-w-none">
          {JSON.stringify(parsedData, null, 2)}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[90vw] md:max-w-3xl lg:max-w-5xl max-h-[90vh] overflow-y-auto bg-background border text-foreground">
        <div className={`border-b pb-4 ${i18n.language === 'ar' ? 'pl-12' : 'pr-12'}`}>
          {/* Title and metadata section */}
          <div className={`${i18n.language === 'ar' ? 'text-right' : 'text-left'}`} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
            <DialogTitle className="text-lg sm:text-xl font-bold text-foreground">
              {getTitle(type)}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm mt-1">
              {athleteName && `${t("common:analysis.analysisFor", "Analysis for")} ${athleteName}`}
              {createdAt && ` • ${t("common:analysis.generatedOn", "Generated on")} ${new Date(createdAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric'
              })}`}
            </DialogDescription>
            
            {/* Export PDF button below title */}
            <div className="mt-3">
              <Button 
                onClick={handleExport}
                size="sm"
                className="bg-athlete-success hover:bg-green-600 text-white gap-2"
                disabled={isExporting}
                data-testid="button-export-pdf"
              >
                <Download size={16} />
                {isExporting ? t("common:analysis.exporting", "Exporting...") : t("common:analysis.exportPdf", "Export PDF")}
              </Button>
            </div>
          </div>
        </div>

        <div className="w-full" data-testid={`popup-analysis-content-${type}`}>
          {renderAnalysisContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
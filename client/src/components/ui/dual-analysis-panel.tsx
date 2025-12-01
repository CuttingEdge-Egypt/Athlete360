import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, Trophy, BarChart, Award, Maximize, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Line } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import type { ChartOptions } from 'chart.js';
import { SwimmingCompetitiveHistory } from './swimming-competitive-history';
import { SquashCompetitiveHistory } from './squash-competitive-history';
import { useState, useEffect } from 'react';

interface RankAnalysisDetails {
  trends_and_outlook?: string;
  progression_timeline?: Array<{
    period: string;
    rank_change: string;
    significance?: string;
  }>;
  performance_factors?: string[];
}

interface DualAnalysisPanelProps {
  competitiveAnalysis: any;
  rankAnalysis: string | RankAnalysisDetails | null;
  rankHistoryData: Array<{
    date: string;
    rank: number;
    month?: string;
    year?: number;
    categoryKey?: string;
    categoryLabel?: string;
    points?: number;
  }> | null;
  language?: string;
  generationLanguage?: string;
  variant?: 'full' | 'modal';
  defaultTab?: 'competitive' | 'rank';
  className?: string;
}

export function DualAnalysisPanel({
  competitiveAnalysis,
  rankAnalysis,
  rankHistoryData,
  language,
  generationLanguage,
  variant = 'full',
  defaultTab = 'competitive',
  className = '',
}: DualAnalysisPanelProps) {
  const { t, i18n } = useTranslation('home');
  const contentLanguage = language ?? generationLanguage ?? i18n.language;
  const isArabic = contentLanguage === 'ar';
  const isSiteArabic = i18n.language === 'ar';
  
  const athlete = competitiveAnalysis?.athlete;
  const rankingProgression = competitiveAnalysis?.rankingProgression || [];
  const careerSummary = competitiveAnalysis?.careerSummary || {};

  // Extract unique years from both datasets (needs to be before useState)
  const getAvailableYears = () => {
    const years = new Set<number>();
    
    // From competitive history
    rankingProgression.forEach((comp: any) => {
      if (comp.date) {
        const year = new Date(comp.date).getFullYear();
        if (!isNaN(year) && year > 2000) years.add(year);
      }
    });
    
    // From rank history
    if (rankHistoryData) {
      rankHistoryData.forEach(entry => {
        if (entry.year && entry.year > 2000) years.add(entry.year);
      });
    }
    
    return Array.from(years).sort((a, b) => b - a); // Most recent first
  };

  const availableYears = getAvailableYears();
  const defaultYear = availableYears[0]?.toString() || '2025';

  // Mobile detection and selected point state for mobile interactions
  const [isMobile, setIsMobile] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<{
    category: string;
    date: string;
    rank: number;
  } | null>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState(0); // Track index for navigation
  const [activeMainTab, setActiveMainTab] = useState<string>(defaultTab);
  const [activeYearTab, setActiveYearTab] = useState<string>(defaultYear);
  
  // Fullscreen state (mobile only)
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenPointIndex, setFullscreenPointIndex] = useState(0);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // sm breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Clear selected point when data changes or tab switches
  useEffect(() => {
    setSelectedPoint(null);
    setSelectedPointIndex(0);
  }, [rankHistoryData, activeMainTab, activeYearTab, athlete?.id]);

  // Close fullscreen when data changes or tab switches (mobile only)
  useEffect(() => {
    if (isMobile) {
      setIsFullscreen(false);
      setFullscreenPointIndex(0);
    }
  }, [rankHistoryData, activeMainTab, activeYearTab, athlete?.id, isMobile]);

  // Initialize and reset activeYearTab when defaultYear or athlete changes
  useEffect(() => {
    setActiveYearTab(defaultYear);
  }, [defaultYear, athlete?.id]);

  const renderRankHistoryContent = () => {
    // If swimming athlete, show medals instead of rank history
    if (isSwimmingAthlete) {
      return (
        <SwimmingCompetitiveHistory 
          competitiveHistory={competitiveAnalysis}
          athleteName={athlete.name}
          showMedalsOnly={true}
        />
      );
    }

    if (!rankHistoryData || rankHistoryData.length === 0) {
      return (
        <div className="p-6 text-center">
          <p className="text-muted-foreground">{t('competitiveHistory.noRankData', 'No rank history data available')}</p>
        </div>
      );
    }

    // NEW: Display all 16 months of rank history in a single continuous graph (no year division)
    // Group rank history data by category across ALL entries
    const categoryGroups: { [key: string]: any[] } = {};
    rankHistoryData.forEach((entry: any) => {
      const categoryKey = entry.categoryKey || 'default';
      if (!categoryGroups[categoryKey]) {
        categoryGroups[categoryKey] = [];
      }
      categoryGroups[categoryKey].push(entry);
    });

    // Sort entries within each category by date
    Object.keys(categoryGroups).forEach(key => {
      categoryGroups[key].sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    });

    // Category color palette
    const categoryColors = [
      { border: 'rgb(251, 146, 60)', bg: 'rgba(251, 146, 60, 0.1)' },   // Orange
      { border: 'rgb(59, 130, 246)', bg: 'rgba(59, 130, 246, 0.1)' },   // Blue
      { border: 'rgb(34, 197, 94)', bg: 'rgba(34, 197, 94, 0.1)' },     // Green
      { border: 'rgb(168, 85, 247)', bg: 'rgba(168, 85, 247, 0.1)' },   // Purple
      { border: 'rgb(236, 72, 153)', bg: 'rgba(236, 72, 153, 0.1)' },   // Pink
    ];

    // Create all unique date labels across all categories
    const allDates = new Set<string>();
    Object.values(categoryGroups).forEach(entries => {
      entries.forEach(entry => allDates.add(entry.date));
    });
    const sortedDates = Array.from(allDates).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );
    
    // Format dates as "July 2025" instead of "1-7-2025"
    const formatDateLabel = (dateStr: string) => {
      const date = new Date(dateStr);
      const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      const monthNamesAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      const monthNames = isArabic ? monthNamesAr : monthNamesEn;
      return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    };
    
    const sortedLabels = sortedDates.map(formatDateLabel);

    // Create datasets for each category
    const datasets = Object.keys(categoryGroups).map((categoryKey, index) => {
      const categoryData = categoryGroups[categoryKey];
      const categoryLabel = categoryData[0]?.categoryLabel || categoryKey;
      const colorIndex = index % categoryColors.length;
      const colors = categoryColors[colorIndex];

      // Map data to all dates (null for missing dates)
      const dataPoints = sortedDates.map(dateStr => {
        const entry = categoryData.find(e => e.date === dateStr);
        return entry ? entry.rank : null;
      });

      return {
        label: categoryLabel,
        data: dataPoints,
        borderColor: colors.border,
        backgroundColor: colors.bg,
        fill: true,
        tension: 0.3,
        pointRadius: isMobile ? 8 : 5,
        pointHoverRadius: isMobile ? 10 : 7,
        pointHitRadius: isMobile ? 20 : 10,
        spanGaps: false,
      };
    });

    const chartData = {
      labels: sortedLabels,
      datasets
    };

    // Helper function to collect all data points for navigation
    // Sorted by category first, then by date within each category
    const getAllDataPoints = () => {
      const points: Array<{ category: string; date: string; rank: number; color: string; datasetIndex: number; pointIndex: number }> = [];
      datasets.forEach((dataset, datasetIndex) => {
        const categoryLabel = dataset.label as string;
        const categoryColor = dataset.borderColor as string;
        dataset.data.forEach((rankValue, index) => {
          if (rankValue !== null) {
            points.push({
              category: categoryLabel,
              date: sortedLabels[index],
              rank: rankValue as number,
              color: categoryColor,
              datasetIndex,
              pointIndex: index
            });
          }
        });
      });
      
      // Sort by category first (datasetIndex), then by date within each category
      points.sort((a, b) => {
        if (a.datasetIndex !== b.datasetIndex) {
          return a.datasetIndex - b.datasetIndex;
        }
        // Within same category, sort by pointIndex (which corresponds to date order)
        return a.pointIndex - b.pointIndex;
      });
      
      return points;
    };

    const allPoints = getAllDataPoints();

    const chartOptions: ChartOptions<'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      onClick: isMobile ? (event: any, elements: any, chart: any) => {
        if (elements && elements.length > 0) {
          const element = elements[0];
          const datasetIndex = element.datasetIndex;
          const index = element.index;
          const dataset = chart.data.datasets[datasetIndex];
          const value = dataset.data[index];
          const category = dataset.label;
          const date = chart.data.labels[index];
          
          if (value !== null) {
            // Find the clicked point index in the sorted allPoints array
            const clickedPointIndex = allPoints.findIndex(
              p => p.datasetIndex === datasetIndex && p.pointIndex === index
            );
            
            if (clickedPointIndex !== -1) {
              if (isFullscreen) {
                // In fullscreen mode, update the fullscreen point index
                setFullscreenPointIndex(clickedPointIndex);
              } else {
                // In normal mode, set selected point and index
                setSelectedPoint({
                  category: category as string,
                  date: date as string,
                  rank: value as number
                });
                setSelectedPointIndex(clickedPointIndex);
              }
            }
          }
        }
      } : undefined,
      scales: {
        y: {
          reverse: true,
          beginAtZero: false,
          min: 1,
          ticks: {
            color: 'rgb(156, 163, 175)',
            font: {
              size: isMobile ? 14 : 12
            },
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
            maxRotation: isMobile ? 60 : 45,
            minRotation: isMobile ? 60 : 45,
            font: {
              weight: isArabic ? 'bold' as const : 'normal' as const,
              size: isMobile ? 10 : (isArabic ? 14 : 12)
            }
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
            color: 'rgb(209, 213, 219)',
            font: {
              size: isMobile ? 11 : 12
            },
            padding: isMobile ? 8 : 10,
            boxWidth: isMobile ? 12 : 20,
            boxHeight: isMobile ? 12 : 12
          }
        },
        tooltip: {
          enabled: !isMobile,
          callbacks: {
            label: function(context: any) {
              return 'Rank: #' + context.parsed.y;
            }
          }
        }
      },
      interaction: {
        mode: isMobile ? 'point' : 'nearest',
        intersect: true
      }
    };

    // Calculate unique months for title
    const uniqueMonths = rankHistoryData ? new Set(rankHistoryData.map((entry: any) => `${entry.year}-${entry.month}`)).size : 0;
    
    const currentPoint = allPoints[fullscreenPointIndex];
    const currentMobilePoint = selectedPoint ? allPoints[selectedPointIndex] : null;

    const handlePrevPoint = () => {
      setFullscreenPointIndex(prev => (prev > 0 ? prev - 1 : allPoints.length - 1));
    };

    const handleNextPoint = () => {
      setFullscreenPointIndex(prev => (prev < allPoints.length - 1 ? prev + 1 : 0));
    };

    const handlePrevMobilePoint = () => {
      const newIndex = selectedPointIndex > 0 ? selectedPointIndex - 1 : allPoints.length - 1;
      setSelectedPointIndex(newIndex);
      const point = allPoints[newIndex];
      setSelectedPoint({
        category: point.category,
        date: point.date,
        rank: point.rank
      });
    };

    const handleNextMobilePoint = () => {
      const newIndex = selectedPointIndex < allPoints.length - 1 ? selectedPointIndex + 1 : 0;
      setSelectedPointIndex(newIndex);
      const point = allPoints[newIndex];
      setSelectedPoint({
        category: point.category,
        date: point.date,
        rank: point.rank
      });
    };

    // Custom plugin to highlight selected point in mobile and fullscreen mode
    const highlightPlugin = {
      id: 'highlightSelectedPoint',
      afterDatasetsDraw: (chart: any) => {
        if (!isMobile) return;
        
        // Determine which point to highlight
        const pointToHighlight = isFullscreen ? currentPoint : currentMobilePoint;
        if (!pointToHighlight) return;

        const ctx = chart.ctx;
        const meta = chart.getDatasetMeta(pointToHighlight.datasetIndex);
        const point = meta.data[pointToHighlight.pointIndex];

        if (point) {
          ctx.save();
          
          // Draw larger outer circle
          ctx.beginPath();
          ctx.arc(point.x, point.y, 14, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fill();
          
          // Draw white ring
          ctx.beginPath();
          ctx.arc(point.x, point.y, 10, 0, 2 * Math.PI);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Draw colored center
          ctx.beginPath();
          ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
          ctx.fillStyle = pointToHighlight.color;
          ctx.fill();
          
          ctx.restore();
        }
      }
    };
    
    return (
      <div className="space-y-6">
        <Card className="bg-card border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className={`text-2xl text-foreground flex items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
                <TrendingUp className={`${isArabic ? 'ml-3' : 'mr-3'} text-orange-500`} size={24} />
                {t('competitiveHistory.rankProgressionTitle')} ({uniqueMonths} {t('competitiveHistory.months')})
              </CardTitle>
              {/* Mobile: Fullscreen button */}
              {isMobile && (
                <button
                  onClick={() => {
                    setIsFullscreen(true);
                    setFullscreenPointIndex(0);
                  }}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  aria-label="Fullscreen"
                  data-testid="button-chart-fullscreen"
                >
                  <Maximize size={20} />
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className={isMobile ? "h-80" : "h-96"}>
              <Line data={chartData} options={chartOptions} plugins={[highlightPlugin]} />
            </div>
            
            {/* Mobile: Display selected point data */}
            {isMobile && selectedPoint && currentMobilePoint && (
              <>
                <div 
                  className="mt-4 p-4 bg-muted rounded-lg border-2"
                  style={{ borderColor: currentMobilePoint.color }}
                  data-testid="mobile-selected-point-card"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentMobilePoint.color }}></div>
                    <span className="text-sm font-semibold" style={{ color: currentMobilePoint.color }}>
                      {t('competitiveHistory.selectedPoint', 'Selected Point')} ({selectedPointIndex + 1}/{allPoints.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="text-foreground font-bold text-xl" data-testid="text-selected-rank">
                      {t('competitiveHistory.rank', 'Rank')}: #{selectedPoint.rank}
                    </div>
                    <div className="text-muted-foreground" data-testid="text-selected-category">
                      {selectedPoint.category}
                    </div>
                    <div className="text-muted-foreground text-sm" data-testid="text-selected-date">
                      {selectedPoint.date}
                    </div>
                  </div>
                </div>

                {/* Navigation Arrows for Mobile */}
                <div className="flex items-center justify-between mt-3 gap-2">
                  <button
                    onClick={handlePrevMobilePoint}
                    className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-semibold flex-1 shadow-md hover:shadow-lg"
                    data-testid="button-prev-mobile-point"
                  >
                    <ChevronLeft size={20} />
                    {t('competitiveHistory.previous', 'Previous')}
                  </button>
                  <button
                    onClick={handleNextMobilePoint}
                    className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-semibold flex-1 shadow-md hover:shadow-lg"
                    data-testid="button-next-mobile-point"
                  >
                    {t('competitiveHistory.next', 'Next')}
                    <ChevronRight size={20} />
                  </button>
                </div>
              </>
            )}

            {/* Mobile: Instruction hint */}
            {isMobile && !selectedPoint && (
              <div className="mt-3 text-center text-muted-foreground text-xs" data-testid="text-tap-instruction">
                {t('competitiveHistory.tapToView', 'Tap on any point to view details')}
              </div>
            )}
          </CardContent>
        </Card>

        {rankAnalysis && (
          <Card className="bg-card border">
            <CardHeader>
              <CardTitle className={`text-2xl text-foreground flex items-center ${isSiteArabic ? 'flex-row-reverse' : ''}`}>
                <BarChart className={`${isSiteArabic ? 'ml-3' : 'mr-3'} text-blue-600`} size={24} />
                {t('competitiveHistory.rankHistoryOverview', 'Rank History Overview')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4" dir={isArabic ? 'rtl' : 'ltr'}>
                {typeof rankAnalysis === 'string' ? (
                  <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {rankAnalysis}
                  </div>
                ) : (
                  <>
                    {rankAnalysis.trends_and_outlook && (
                      <div className="bg-muted p-4 rounded-lg">
                        <h4 className={`font-semibold text-foreground mb-2 ${isSiteArabic ? 'text-right' : ''}`}>{t('competitiveHistory.trendsAndOutlook')}</h4>
                        <p className="text-muted-foreground text-sm leading-relaxed">{rankAnalysis.trends_and_outlook}</p>
                      </div>
                    )}
                    {rankAnalysis.progression_timeline && Array.isArray(rankAnalysis.progression_timeline) && rankAnalysis.progression_timeline.length > 0 && (
                      <div className="bg-muted p-5 rounded-lg">
                        <h4 className={`font-bold text-foreground mb-5 text-lg flex items-center ${isSiteArabic ? 'flex-row-reverse text-right' : 'text-left'}`}>
                          <TrendingUp className={`${isSiteArabic ? 'ml-2' : 'mr-2'} text-blue-600`} size={20} />
                          {t('competitiveHistory.progressionTimeline')}
                        </h4>
                        <div className="space-y-4">
                          {rankAnalysis.progression_timeline.map((item: any, index: number) => (
                            <div 
                              key={index} 
                              className={`bg-white rounded-lg p-4 border-l-4 ${isArabic ? 'border-l-0 border-r-4 border-r-blue-500' : 'border-l-blue-500'} hover:bg-gray-50 transition-colors`}
                            >
                              <div className={`font-bold text-blue-600 text-base mb-2 ${isArabic ? 'text-right' : ''}`}>
                                {item.period}
                              </div>
                              <div className={`text-foreground leading-relaxed ${isArabic ? 'text-right text-base' : 'text-sm'}`}>
                                {item.rank_change}
                              </div>
                              {item.significance && (
                                <div className={`text-muted-foreground mt-2 italic leading-relaxed ${isArabic ? 'text-right text-sm' : 'text-xs'}`}>
                                  {item.significance}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {rankAnalysis.performance_factors && Array.isArray(rankAnalysis.performance_factors) && rankAnalysis.performance_factors.length > 0 && (
                      <div className="bg-muted p-4 rounded-lg">
                        <h4 className={`font-semibold text-foreground mb-3 ${isSiteArabic ? 'text-right' : ''}`}>Performance Factors</h4>
                        <div className="space-y-2">
                          {rankAnalysis.performance_factors.map((factor: any, index: number) => (
                            <div key={index} className={`flex items-start ${isArabic ? 'flex-row-reverse space-x-reverse' : ''} space-x-2`}>
                              <Trophy className="w-4 h-4 text-amber-500 mt-1 flex-shrink-0" />
                              <div className="text-muted-foreground text-sm">{factor}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mobile: Fullscreen Modal */}
        {isMobile && isFullscreen && currentPoint && (
          <div 
            className="fixed inset-0 z-50 bg-background flex flex-col"
            data-testid="fullscreen-chart-modal"
          >
            {/* Header with Close Button */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-xl font-bold text-foreground flex items-center">
                <TrendingUp className="mr-2 text-orange-500" size={20} />
                {t('competitiveHistory.rankProgressionTitle')}
              </h3>
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                aria-label="Close Fullscreen"
                data-testid="button-close-fullscreen"
              >
                <X size={24} />
              </button>
            </div>

            {/* Chart Display */}
            <div className="flex-1 p-4 overflow-auto">
              <div className="h-96">
                <Line data={chartData} options={chartOptions} plugins={[highlightPlugin]} />
              </div>
            </div>

            {/* Point Details Card */}
            <div className="p-4 bg-card border-t">
              <div className="bg-muted p-4 rounded-lg border-2" style={{ borderColor: currentPoint.color }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentPoint.color }}></div>
                  <span className="text-sm font-semibold" style={{ color: currentPoint.color }}>
                    {t('competitiveHistory.selectedPoint', 'Selected Point')} ({fullscreenPointIndex + 1}/{allPoints.length})
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="text-foreground font-bold text-xl" data-testid="text-fullscreen-rank">
                    {t('competitiveHistory.rank', 'Rank')}: #{currentPoint.rank}
                  </div>
                  <div className="text-muted-foreground" data-testid="text-fullscreen-category">
                    {currentPoint.category}
                  </div>
                  <div className="text-muted-foreground text-sm" data-testid="text-fullscreen-date">
                    {currentPoint.date}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Arrows */}
            <div className="flex items-center justify-between p-4 bg-card border-t">
              <button
                onClick={handlePrevPoint}
                className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-semibold shadow-md hover:shadow-lg"
                data-testid="button-prev-point"
              >
                <ChevronLeft size={24} />
                {t('competitiveHistory.previous', 'Previous')}
              </button>
              <button
                onClick={handleNextPoint}
                className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-semibold shadow-md hover:shadow-lg"
                data-testid="button-next-point"
              >
                {t('competitiveHistory.next', 'Next')}
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRankHistoryForYear = (year: number) => {
    if (!rankHistoryData) return null;

    // Filter data for this year
    const yearData = rankHistoryData.filter(entry => entry.year === year);

    if (yearData.length === 0) {
      return (
        <div className="p-6 text-center">
          <p className="text-muted-foreground">No rank history data for {year}</p>
        </div>
      );
    }

    // Group rank history data by category for this year
    const categoryGroups: { [key: string]: any[] } = {};
    yearData.forEach((entry: any) => {
      const categoryKey = entry.categoryKey || 'default';
      if (!categoryGroups[categoryKey]) {
        categoryGroups[categoryKey] = [];
      }
      categoryGroups[categoryKey].push(entry);
    });

    // Sort entries within each category by date
    Object.keys(categoryGroups).forEach(key => {
      categoryGroups[key].sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    });

    // Category color palette
    const categoryColors = [
      { border: 'rgb(251, 146, 60)', bg: 'rgba(251, 146, 60, 0.1)' },   // Orange
      { border: 'rgb(59, 130, 246)', bg: 'rgba(59, 130, 246, 0.1)' },   // Blue
      { border: 'rgb(34, 197, 94)', bg: 'rgba(34, 197, 94, 0.1)' },     // Green
      { border: 'rgb(168, 85, 247)', bg: 'rgba(168, 85, 247, 0.1)' },   // Purple
      { border: 'rgb(236, 72, 153)', bg: 'rgba(236, 72, 153, 0.1)' },   // Pink
    ];

    // Create all unique date labels across all categories
    const allDates = new Set<string>();
    Object.values(categoryGroups).forEach(entries => {
      entries.forEach(entry => allDates.add(entry.date));
    });
    const sortedDates = Array.from(allDates).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );
    
    // Format dates as "July 2025" instead of "1-7-2025"
    const formatDateLabel = (dateStr: string) => {
      const date = new Date(dateStr);
      const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      const monthNamesAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      const monthNames = isArabic ? monthNamesAr : monthNamesEn;
      return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    };
    
    const sortedLabels = sortedDates.map(formatDateLabel);

    // Create datasets for each category
    const datasets = Object.keys(categoryGroups).map((categoryKey, index) => {
      const categoryData = categoryGroups[categoryKey];
      const categoryLabel = categoryData[0]?.categoryLabel || categoryKey;
      const colorIndex = index % categoryColors.length;
      const colors = categoryColors[colorIndex];

      // Map data to all dates (null for missing dates)
      const dataPoints = sortedDates.map(dateStr => {
        const entry = categoryData.find(e => e.date === dateStr);
        return entry ? entry.rank : null;
      });

      return {
        label: categoryLabel,
        data: dataPoints,
        borderColor: colors.border,
        backgroundColor: colors.bg,
        fill: true,
        tension: 0.3,
        pointRadius: isMobile ? 8 : 5,
        pointHoverRadius: isMobile ? 10 : 7,
        pointHitRadius: isMobile ? 20 : 10,
        spanGaps: false, // Don't connect points across missing data
      };
    });

    const chartData = {
      labels: sortedLabels,
      datasets
    };

    // Helper function to collect all data points for navigation
    // Sorted by category first, then by date within each category
    const getAllDataPoints = () => {
      const points: Array<{ category: string; date: string; rank: number; color: string; datasetIndex: number; pointIndex: number }> = [];
      datasets.forEach((dataset, datasetIndex) => {
        const categoryLabel = dataset.label as string;
        const categoryColor = dataset.borderColor as string;
        dataset.data.forEach((rankValue, index) => {
          if (rankValue !== null) {
            points.push({
              category: categoryLabel,
              date: sortedLabels[index],
              rank: rankValue as number,
              color: categoryColor,
              datasetIndex,
              pointIndex: index
            });
          }
        });
      });
      
      // Sort by category first (datasetIndex), then by date within each category
      points.sort((a, b) => {
        if (a.datasetIndex !== b.datasetIndex) {
          return a.datasetIndex - b.datasetIndex;
        }
        // Within same category, sort by pointIndex (which corresponds to date order)
        return a.pointIndex - b.pointIndex;
      });
      
      return points;
    };

    const allPoints = getAllDataPoints();

    const chartOptions: ChartOptions<'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      onClick: isMobile ? (event: any, elements: any, chart: any) => {
        if (elements && elements.length > 0) {
          const element = elements[0];
          const datasetIndex = element.datasetIndex;
          const index = element.index;
          const dataset = chart.data.datasets[datasetIndex];
          const value = dataset.data[index];
          const category = dataset.label;
          const date = chart.data.labels[index];
          
          if (value !== null) {
            // Find the clicked point index in the sorted allPoints array
            const clickedPointIndex = allPoints.findIndex(
              p => p.datasetIndex === datasetIndex && p.pointIndex === index
            );
            
            if (clickedPointIndex !== -1) {
              if (isFullscreen) {
                // In fullscreen mode, update the fullscreen point index
                setFullscreenPointIndex(clickedPointIndex);
              } else {
                // In normal mode, set selected point and index
                setSelectedPoint({
                  category: category as string,
                  date: date as string,
                  rank: value as number
                });
                setSelectedPointIndex(clickedPointIndex);
              }
            }
          }
        }
      } : undefined,
      scales: {
        y: {
          reverse: true,
          beginAtZero: false,
          min: 1,
          ticks: {
            color: 'rgb(156, 163, 175)',
            font: {
              size: isMobile ? 14 : 12
            },
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
            maxRotation: isMobile ? 60 : 45,
            minRotation: isMobile ? 60 : 45,
            font: {
              weight: isArabic ? 'bold' as const : 'normal' as const,
              size: isMobile ? 10 : (isArabic ? 14 : 12)
            }
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
            color: 'rgb(209, 213, 219)',
            font: {
              size: isMobile ? 11 : 12
            },
            padding: isMobile ? 8 : 10,
            boxWidth: isMobile ? 12 : 20,
            boxHeight: isMobile ? 12 : 12
          }
        },
        tooltip: {
          enabled: !isMobile,
          callbacks: {
            label: function(context: any) {
              return 'Rank: #' + context.parsed.y;
            }
          }
        }
      },
      interaction: {
        mode: isMobile ? 'point' : 'nearest',
        intersect: true
      }
    };

    const currentPoint = allPoints[fullscreenPointIndex];
    const currentMobilePoint = selectedPoint ? allPoints[selectedPointIndex] : null;

    const handlePrevPoint = () => {
      setFullscreenPointIndex(prev => (prev > 0 ? prev - 1 : allPoints.length - 1));
    };

    const handleNextPoint = () => {
      setFullscreenPointIndex(prev => (prev < allPoints.length - 1 ? prev + 1 : 0));
    };

    const handlePrevMobilePoint = () => {
      const newIndex = selectedPointIndex > 0 ? selectedPointIndex - 1 : allPoints.length - 1;
      setSelectedPointIndex(newIndex);
      const point = allPoints[newIndex];
      setSelectedPoint({
        category: point.category,
        date: point.date,
        rank: point.rank
      });
    };

    const handleNextMobilePoint = () => {
      const newIndex = selectedPointIndex < allPoints.length - 1 ? selectedPointIndex + 1 : 0;
      setSelectedPointIndex(newIndex);
      const point = allPoints[newIndex];
      setSelectedPoint({
        category: point.category,
        date: point.date,
        rank: point.rank
      });
    };

    // Custom plugin to highlight selected point in mobile and fullscreen mode
    const highlightPlugin = {
      id: 'highlightSelectedPoint',
      afterDatasetsDraw: (chart: any) => {
        if (!isMobile) return;
        
        // Determine which point to highlight
        const pointToHighlight = isFullscreen ? currentPoint : currentMobilePoint;
        if (!pointToHighlight) return;

        const ctx = chart.ctx;
        const meta = chart.getDatasetMeta(pointToHighlight.datasetIndex);
        const point = meta.data[pointToHighlight.pointIndex];

        if (point) {
          ctx.save();
          
          // Draw larger outer circle
          ctx.beginPath();
          ctx.arc(point.x, point.y, 14, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fill();
          
          // Draw white ring
          ctx.beginPath();
          ctx.arc(point.x, point.y, 10, 0, 2 * Math.PI);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Draw colored center
          ctx.beginPath();
          ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
          ctx.fillStyle = pointToHighlight.color;
          ctx.fill();
          
          ctx.restore();
        }
      }
    };

    return (
      <div className="space-y-6">
        <Card className="bg-card border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl text-foreground flex items-center">
                <TrendingUp className="mr-3 text-orange-500" size={20} />
                {t('competitiveHistory.rankProgressionOverTime', 'Rank Progression Over Time')}
              </CardTitle>
              {/* Mobile: Fullscreen button */}
              {isMobile && (
                <button
                  onClick={() => {
                    setIsFullscreen(true);
                    setFullscreenPointIndex(0);
                  }}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  aria-label="Fullscreen"
                  data-testid="button-chart-fullscreen"
                >
                  <Maximize size={20} />
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className={isMobile ? "h-80" : "h-96"}>
              <Line data={chartData} options={chartOptions} plugins={[highlightPlugin]} />
            </div>
            
            {/* Mobile: Display selected point data */}
            {isMobile && selectedPoint && currentMobilePoint && (
              <>
                <div 
                  className="mt-4 p-4 bg-muted rounded-lg border-2"
                  style={{ borderColor: currentMobilePoint.color }}
                  data-testid="mobile-selected-point-card"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentMobilePoint.color }}></div>
                    <span className="text-sm font-semibold" style={{ color: currentMobilePoint.color }}>
                      {t('competitiveHistory.selectedPoint', 'Selected Point')} ({selectedPointIndex + 1}/{allPoints.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="text-foreground font-bold text-xl" data-testid="text-selected-rank">
                      {t('competitiveHistory.rank', 'Rank')}: #{selectedPoint.rank}
                    </div>
                    <div className="text-muted-foreground" data-testid="text-selected-category">
                      {selectedPoint.category}
                    </div>
                    <div className="text-muted-foreground text-sm" data-testid="text-selected-date">
                      {selectedPoint.date}
                    </div>
                  </div>
                </div>

                {/* Navigation Arrows for Mobile */}
                <div className="flex items-center justify-between mt-3 gap-2">
                  <button
                    onClick={handlePrevMobilePoint}
                    className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-semibold flex-1 shadow-md hover:shadow-lg"
                    data-testid="button-prev-mobile-point"
                  >
                    <ChevronLeft size={20} />
                    {t('competitiveHistory.previous', 'Previous')}
                  </button>
                  <button
                    onClick={handleNextMobilePoint}
                    className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-semibold flex-1 shadow-md hover:shadow-lg"
                    data-testid="button-next-mobile-point"
                  >
                    {t('competitiveHistory.next', 'Next')}
                    <ChevronRight size={20} />
                  </button>
                </div>
              </>
            )}

            {/* Mobile: Instruction hint */}
            {isMobile && !selectedPoint && (
              <div className="mt-3 text-center text-muted-foreground text-xs" data-testid="text-tap-instruction">
                {t('competitiveHistory.tapToView', 'Tap on any point to view details')}
              </div>
            )}
          </CardContent>
        </Card>

        {rankAnalysis && (
          <Card className="bg-card border">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground flex items-center">
                <BarChart className="mr-3 text-blue-600" size={24} />
                {t('competitiveHistory.rankHistoryAnalysis', 'Rank History Analysis')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {typeof rankAnalysis === 'string' ? (
                  <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {rankAnalysis}
                  </div>
                ) : (
                  <>
                    {rankAnalysis.trends_and_outlook && (
                      <div className="bg-muted p-4 rounded-lg">
                        <h4 className="font-semibold text-foreground mb-2">Trends & Outlook</h4>
                        <p className="text-muted-foreground text-sm leading-relaxed">{rankAnalysis.trends_and_outlook}</p>
                      </div>
                    )}
                    {rankAnalysis.progression_timeline && Array.isArray(rankAnalysis.progression_timeline) && rankAnalysis.progression_timeline.length > 0 && (
                      <div className="bg-muted p-5 rounded-lg">
                        <h4 className={`font-bold text-foreground mb-5 text-lg flex items-center ${isSiteArabic ? 'flex-row-reverse text-right' : 'text-left'}`}>
                          <TrendingUp className={`${isSiteArabic ? 'ml-2' : 'mr-2'} text-blue-600`} size={20} />
                          {t('competitiveHistory.progressionTimeline')}
                        </h4>
                        <div className="space-y-4">
                          {rankAnalysis.progression_timeline.map((item: any, index: number) => (
                            <div 
                              key={index} 
                              className={`bg-white rounded-lg p-4 border-l-4 ${isArabic ? 'border-l-0 border-r-4 border-r-blue-500' : 'border-l-blue-500'} hover:bg-gray-50 transition-colors`}
                            >
                              <div className={`font-bold text-blue-600 text-base mb-2 ${isArabic ? 'text-right' : ''}`}>
                                {item.period}
                              </div>
                              <div className={`text-foreground leading-relaxed ${isArabic ? 'text-right text-base' : 'text-sm'}`}>
                                {item.rank_change}
                              </div>
                              {item.significance && (
                                <div className={`text-muted-foreground mt-2 italic leading-relaxed ${isArabic ? 'text-right text-sm' : 'text-xs'}`}>
                                  {item.significance}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mobile: Fullscreen Modal */}
        {isMobile && isFullscreen && currentPoint && (
          <div 
            className="fixed inset-0 z-50 bg-background flex flex-col"
            data-testid="fullscreen-chart-modal"
          >
            {/* Header with Close Button */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-xl font-bold text-foreground flex items-center">
                <TrendingUp className="mr-2 text-orange-500" size={20} />
                {t('competitiveHistory.rankProgressionOverTime', 'Rank Progression Over Time')}
              </h3>
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                aria-label="Close Fullscreen"
                data-testid="button-close-fullscreen"
              >
                <X size={24} />
              </button>
            </div>

            {/* Chart Display */}
            <div className="flex-1 p-4 overflow-auto">
              <div className="h-96">
                <Line data={chartData} options={chartOptions} plugins={[highlightPlugin]} />
              </div>
            </div>

            {/* Point Details Card */}
            <div className="p-4 bg-card border-t">
              <div className="bg-muted p-4 rounded-lg border-2" style={{ borderColor: currentPoint.color }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentPoint.color }}></div>
                  <span className="text-sm font-semibold" style={{ color: currentPoint.color }}>
                    {t('competitiveHistory.selectedPoint', 'Selected Point')} ({fullscreenPointIndex + 1}/{allPoints.length})
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="text-foreground font-bold text-xl" data-testid="text-fullscreen-rank">
                    {t('competitiveHistory.rank', 'Rank')}: #{currentPoint.rank}
                  </div>
                  <div className="text-muted-foreground" data-testid="text-fullscreen-category">
                    {currentPoint.category}
                  </div>
                  <div className="text-muted-foreground text-sm" data-testid="text-fullscreen-date">
                    {currentPoint.date}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Arrows */}
            <div className="flex items-center justify-between p-4 bg-card border-t">
              <button
                onClick={handlePrevPoint}
                className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-semibold shadow-md hover:shadow-lg"
                data-testid="button-prev-point"
              >
                <ChevronLeft size={24} />
                {t('competitiveHistory.previous', 'Previous')}
              </button>
              <button
                onClick={handleNextPoint}
                className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-semibold shadow-md hover:shadow-lg"
                data-testid="button-next-point"
              >
                {t('competitiveHistory.next', 'Next')}
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Helper function for result badges
  const getResultBadge = (result: string) => {
    if (!result) return null;
    
    const resultLower = result.toLowerCase();
    
    // Extract place number if present (e.g., "17th place" -> "17")
    const placeMatch = result.match(/(\d+)(st|nd|rd|th)/);
    const placeNumber = placeMatch ? placeMatch[1] : null;
    
    if (resultLower.includes('1st') || resultLower.includes('gold') || resultLower.includes('🥇')) {
      return <Badge className="bg-yellow-500 text-white">🥇 {isArabic ? `${t('competitiveHistory.place')} 1` : result}</Badge>;
    } else if (resultLower.includes('2nd') || resultLower.includes('silver') || resultLower.includes('🥈')) {
      return <Badge className="bg-gray-400 text-white">🥈 {isArabic ? `${t('competitiveHistory.place')} 2` : result}</Badge>;
    } else if (resultLower.includes('3rd') || resultLower.includes('bronze') || resultLower.includes('🥉')) {
      return <Badge className="bg-orange-600 text-white">🥉 {isArabic ? `${t('competitiveHistory.place')} 3` : result}</Badge>;
    } else if (placeNumber) {
      return <Badge variant="secondary">✓ {isArabic ? `${t('competitiveHistory.place')} ${placeNumber}` : result}</Badge>;
    } else {
      return <Badge variant="secondary">✓ {result}</Badge>;
    }
  };

  // Check if this is a swimming athlete (for custom UI) - support English and Arabic
  const isSwimmingAthlete = athlete?.sport && 
    (athlete.sport.toLowerCase().includes('swimming') || athlete.sport.includes('السباحة')) &&
    !athlete.sport.toLowerCase().includes('artistic') &&
    !athlete.sport.includes('الفني'); // "artistic" in Arabic

  // Check if this is a squash athlete (for custom UI) - support English and Arabic
  const isSquashAthlete = athlete?.sport && 
    (athlete.sport.toLowerCase().includes('squash') || athlete.sport.includes('سكواش'));

  const renderCompetitiveHistoryContent = () => {
    // If squash athlete, render custom squash UI
    if (isSquashAthlete) {
      return (
        <SquashCompetitiveHistory 
          competitiveHistory={competitiveAnalysis}
          language={generationLanguage || language || 'en'}
        />
      );
    }

    // If swimming athlete, render custom swimming UI with timeline only (no medals)
    if (isSwimmingAthlete) {
      return (
        <SwimmingCompetitiveHistory 
          competitiveHistory={competitiveAnalysis}
          athleteName={athlete.name}
          showTimelineOnly={true}
        />
      );
    }

    // If no years available or no ranking progression, show message
    if (availableYears.length === 0 || !rankingProgression || rankingProgression.length === 0) {
      return (
        <div className="p-6 text-center">
          <p className="text-muted-foreground">No competitive history data available</p>
        </div>
      );
    }

    // Render year tabs
    return (
      <Tabs 
        value={activeYearTab}
        onValueChange={(value) => setActiveYearTab(value)}
        className="w-full"
      >
        <TabsList className="bg-gray-100 border border-gray-200 mb-6">
          {availableYears.map(year => (
            <TabsTrigger
              key={year}
              value={year.toString()}
              data-testid={`tab-competitive-year-${year}`}
              className="data-[state=active]:bg-amber-400 data-[state=active]:text-gray-900"
            >
              {year}
            </TabsTrigger>
          ))}
        </TabsList>

        {availableYears.map(year => (
          <TabsContent key={year} value={year.toString()}>
            {renderCompetitiveHistoryForYear(year)}
          </TabsContent>
        ))}
      </Tabs>
    );
  };

  const renderCompetitiveHistoryForYear = (year: number) => {
    // Extract data from competitiveAnalysis structure
    const careerPhases = competitiveAnalysis?.career_phases || [];
    const careerOverview = competitiveAnalysis?.career_overview;
    const peakPerformancePeriods = competitiveAnalysis?.peak_performance_periods || [];
    const competitionAnalysis = competitiveAnalysis?.competition_analysis || {};
    const progressionPatterns = competitiveAnalysis?.progression_patterns;
    const notableAchievements = competitiveAnalysis?.notable_achievements || [];
    const recentForm = competitiveAnalysis?.recent_form;
    const insights = competitiveAnalysis?.insights || [];

    // Filter competitions for this year
    const yearCompetitions = rankingProgression.filter((comp: any) => {
      if (!comp.date) return false;
      const compYear = new Date(comp.date).getFullYear();
      return compYear === year;
    });

    return (
      <div className="space-y-6">
        {/* Competition Results from API Data for this year */}
        {yearCompetitions && yearCompetitions.length > 0 && (
          <Card className="bg-card border">
            <CardHeader>
              <CardTitle className={`text-2xl text-foreground flex items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
                <Calendar className={`${isArabic ? 'ml-3' : 'mr-3'} text-blue-600`} size={24} />
                {isArabic ? `${t('competitiveHistory.yearTitle')} ${year}` : `${year} ${t('competitiveHistory.yearTitle')}`}
              </CardTitle>
              <Badge className="bg-blue-600 text-white">
                {yearCompetitions.length} {yearCompetitions.length === 1 ? t('competitiveHistory.competition') : t('competitiveHistory.competitions')}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {yearCompetitions
                  .slice()
                  .sort((a: any, b: any) => {
                    const dateA = new Date(a.date || 0).getTime();
                    const dateB = new Date(b.date || 0).getTime();
                    return dateB - dateA; // Most recent first
                  })
                  .map((comp: any, index: number) => {
                    // Parse date for full display (e.g., "27 April 2025" or "27 أبريل 2025")
                    let displayDate = 'Date unknown';
                    if (comp.date && comp.date !== 'Date unknown') {
                      // Check if date is already in full format
                      if (comp.date.includes(' ') && !comp.date.match(/^\d{4}-\d{2}-\d{2}/)) {
                        displayDate = comp.date; // Already formatted like "27 April 2025"
                      } else {
                        // Parse ISO date
                        const compDate = new Date(comp.date);
                        if (!isNaN(compDate.getTime())) {
                          if (isArabic) {
                            const monthNamesAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                              'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
                            displayDate = `${compDate.getDate()} ${monthNamesAr[compDate.getMonth()]} ${compDate.getFullYear()}`;
                          } else {
                            displayDate = compDate.toLocaleDateString('en-US', { 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric' 
                            });
                          }
                        }
                      }
                    }

                    return (
                      <div key={index} className={`p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-primary/40 hover:shadow-md transition-all ${isArabic ? 'text-right' : ''}`}>
                        <div className={`flex items-start justify-between mb-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                          <div className="flex-1">
                            {/* Date Badge - More prominent */}
                            <Badge variant="outline" className="bg-amber-50 border-amber-400 text-amber-700 text-sm mb-2">
                              {displayDate}
                            </Badge>
                            
                            {/* Competition Name */}
                            <div className="font-bold text-primary text-lg leading-tight mb-2">
                              {comp.competition || comp.tournament}
                            </div>

                            {/* Event Type - PROMINENT for World Aquatics */}
                            {comp.event_type && (
                              <div className={`mb-3 ${isArabic ? 'text-right' : ''}`}>
                                <div className="inline-flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-300">
                                  <span className="text-xs text-purple-600">{isArabic ? 'الحدث' : 'Event'}</span>
                                  <span className="text-purple-700 font-bold text-base">{comp.event_type}</span>
                                </div>
                              </div>
                            )}

                            {/* Time Result - VERY PROMINENT for Swimming */}
                            {comp.time_result && (
                              <div className={`mb-3 ${isArabic ? 'text-right' : ''}`}>
                                <div className="inline-flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-lg border border-amber-400">
                                  <span className="text-sm text-amber-600">{isArabic ? 'الوقت' : 'Time'}</span>
                                  <span className="text-amber-700 font-bold text-xl">{comp.time_result}</span>
                                </div>
                              </div>
                            )}

                            {comp.location && (
                              <div className={`text-sm text-muted-foreground mb-2 ${isArabic ? 'text-right' : ''}`}>
                                📍 {comp.location}
                              </div>
                            )}
                            
                            {/* Additional Details */}
                            <div className={`flex items-center gap-4 text-sm flex-wrap ${isArabic ? 'flex-row-reverse' : ''}`}>
                              {comp.pool_type && (
                                <div className="text-muted-foreground">
                                  {isArabic ? (
                                    <><span className="text-primary font-semibold">{comp.pool_type}</span> :{t('competitiveHistory.pool', 'Pool').replace(':', '')}</>
                                  ) : (
                                    <>Pool: <span className="text-primary font-semibold">{comp.pool_type}</span></>
                                  )}
                                </div>
                              )}
                              {comp.distance && (
                                <div className="text-muted-foreground">
                                  {isArabic ? (
                                    <><span className="text-cyan-600 font-semibold">{comp.distance}</span> :{t('competitiveHistory.distance', 'Distance').replace(':', '')}</>
                                  ) : (
                                    <>Distance: <span className="text-cyan-600 font-semibold">{comp.distance}</span></>
                                  )}
                                </div>
                              )}
                              {comp.rankingPoints && (
                                <div className="text-muted-foreground">
                                  {t('competitiveHistory.points')} <span className="text-green-600 font-semibold">{comp.rankingPoints}</span>
                                </div>
                              )}
                              {comp.gRank && (
                                <div className="text-muted-foreground">
                                  {isArabic ? (
                                    <><span className="text-blue-600 font-semibold">{comp.gRank}</span> :{t('competitiveHistory.gRank').replace(':', '')}</>
                                  ) : (
                                    <>{t('competitiveHistory.gRank')} <span className="text-blue-600 font-semibold">{comp.gRank}</span></>
                                  )}
                                </div>
                              )}
                              {comp.ranking && comp.ranking !== 'N/A' && (
                                <div className="text-muted-foreground">
                                  {isArabic ? (
                                    <><span className="text-muted-foreground">{comp.ranking}</span> :{t('competitiveHistory.category').replace(':', '')}</>
                                  ) : (
                                    <>{t('competitiveHistory.category')} <span className="text-muted-foreground">{comp.ranking}</span></>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className={`${isArabic ? 'mr-3' : 'ml-3'}`}>
                            {getResultBadge(comp.result)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Career Phases Timeline */}
        {careerPhases && careerPhases.length > 0 && (
          <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-lg shadow-black/5 border border-white/40 p-6">
            <div className="mb-6">
              <h3 className={`text-2xl font-bold text-foreground flex items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
                <Trophy className={`${isArabic ? 'ml-3' : 'mr-3'} text-primary`} size={24} />
                {t('competitiveHistory.careerPhases', 'Career Phases')}
              </h3>
              <div className={`text-sm text-muted-foreground mt-1 ${isArabic ? 'text-right' : ''}`}>Professional career progression through different phases</div>
            </div>
            <div>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary to-primary/30 opacity-50"></div>
                
                <div className="space-y-8">
                  {careerPhases.map((phase: any, phaseIndex: number) => (
                    <div key={phaseIndex} className="relative ml-8">
                      <div className="absolute -left-12 top-6 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-sm font-bold text-white ring-4 ring-primary/20 shadow-md">
                        {phaseIndex + 1}
                      </div>

                      <div className="bg-white/40 backdrop-blur-sm rounded-2xl shadow-md shadow-black/5 border border-white/50 overflow-hidden">
                        <div className="p-5 border-b border-slate-100">
                          <div className={`flex items-center justify-between ${isArabic ? 'flex-row-reverse' : ''}`}>
                            <h4 className={`text-xl font-semibold text-foreground ${isArabic ? 'text-right' : ''}`}>
                              {phase.phase_name}
                            </h4>
                            <Badge className="bg-primary/90 text-white shadow-sm">{phase.period}</Badge>
                          </div>
                        </div>
                        <div className={`p-5 ${isArabic ? 'text-right' : ''}`}>
                          {phase.key_achievements && phase.key_achievements.length > 0 && (
                            <div className="divide-y divide-slate-200/80">
                              {phase.key_achievements
                                .slice()
                                .sort((a: any, b: any) => {
                                  const yearA = parseInt(a.year) || 0;
                                  const yearB = parseInt(b.year) || 0;
                                  return yearB - yearA;
                                })
                                .map((achievement: any, achievementIndex: number) => {
                                  // Format date with day if available
                                  let achievementDate = `${achievement.month} ${achievement.year}`;
                                  if (achievement.day) {
                                    achievementDate = `${achievement.day} ${achievement.month} ${achievement.year}`;
                                  }
                                  
                                  return (
                                    <div key={achievementIndex} className={`py-4 first:pt-0 last:pb-0 hover:bg-slate-50/50 transition-colors duration-150 ${isArabic ? 'text-right' : ''}`}>
                                      <div className={`flex items-start justify-between ${isArabic ? 'flex-row-reverse' : ''}`}>
                                        <div className="flex-1">
                                          {/* Date Badge */}
                                          <Badge variant="outline" className="bg-amber-50 border-amber-300 text-amber-700 text-sm mb-1.5 shadow-sm">
                                            {achievementDate}
                                          </Badge>
                                          
                                          {/* Event Name */}
                                          <div className="font-semibold text-foreground text-base mb-1">
                                            {achievement.event_name}
                                          </div>

                                          {/* Event Type - PROMINENT for World Aquatics */}
                                          {achievement.event_type && (
                                            <div className={`mb-1.5 ${isArabic ? 'text-right' : ''}`}>
                                              <div className="inline-flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200">
                                                <span className="text-xs text-purple-500">{isArabic ? 'الحدث' : 'Event'}</span>
                                                <span className="text-purple-700 font-bold text-sm">{achievement.event_type}</span>
                                              </div>
                                            </div>
                                          )}

                                          {/* Time Result - VERY PROMINENT for Swimming */}
                                          {achievement.time_result && (
                                            <div className={`mb-1.5 ${isArabic ? 'text-right' : ''}`}>
                                              <div className="inline-flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-300">
                                                <span className="text-sm text-amber-600">{isArabic ? 'الوقت' : 'Time'}</span>
                                                <span className="text-amber-700 font-bold text-lg">{achievement.time_result}</span>
                                              </div>
                                            </div>
                                          )}

                                          <div className={`text-sm text-muted-foreground ${isArabic ? 'text-right' : ''}`}>
                                            {achievement.event_tier}
                                          </div>

                                          {/* Additional aquatics details */}
                                          {(achievement.pool_type || achievement.distance) && (
                                            <div className={`flex items-center gap-3 text-xs flex-wrap mt-1.5 ${isArabic ? 'flex-row-reverse' : ''}`}>
                                              {achievement.pool_type && (
                                                <span className="text-teal-600">Pool: {achievement.pool_type}</span>
                                              )}
                                              {achievement.distance && (
                                                <span className="text-cyan-600">Distance: {achievement.distance}</span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        <div className={`${isArabic ? 'mr-3' : 'ml-3'}`}>
                                          {getResultBadge(achievement.result)}
                                        </div>
                                      </div>
                                      
                                      {achievement.notes && (
                                        <p className={`text-sm text-muted-foreground leading-relaxed mt-2 ${isArabic ? 'text-right' : ''}`}>
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

        {/* Competitive History Analysis - Overall insights for now */}
        {(careerOverview || peakPerformancePeriods?.length > 0 || notableAchievements?.length > 0 || recentForm) && (
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-500">
            <CardHeader>
              <CardTitle className={`text-2xl text-white flex items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
                <Calendar className={`${isArabic ? 'ml-3' : 'mr-3'} text-purple-400`} size={24} />
                {t('competitiveHistory.title')}
              </CardTitle>
              <div className={`text-sm text-muted-foreground ${isArabic ? 'text-right' : ''}`}>{t('competitiveHistory.subtitle')}</div>
            </CardHeader>
            <CardContent className={`space-y-6 ${isArabic ? 'text-right' : ''}`} dir={isArabic ? 'rtl' : 'ltr'}>
              {careerOverview && (
                <div className={isArabic ? 'text-right' : ''}>
                  <h3 className={`text-lg font-semibold text-white mb-3 flex items-center ${isArabic ? 'flex-row-reverse justify-end' : ''}`}>
                    <Trophy className={`${isArabic ? 'ml-2' : 'mr-2'} text-amber-500`} size={20} />
                    {t('competitiveHistory.careerOverview')}
                  </h3>
                  <p className={`text-muted-foreground leading-relaxed ${isArabic ? 'text-right' : ''}`}>{careerOverview}</p>
                </div>
              )}
              
              {peakPerformancePeriods && peakPerformancePeriods.length > 0 && (
                <div className={isArabic ? 'text-right' : ''}>
                  <h3 className={`text-lg font-semibold text-white mb-3 flex items-center ${isArabic ? 'flex-row-reverse justify-end' : ''}`}>
                    <TrendingUp className={`${isArabic ? 'ml-2' : 'mr-2'} text-green-400`} size={20} />
                    {t('competitiveHistory.peakPerformance')}
                  </h3>
                  <div className="space-y-4">
                    {peakPerformancePeriods.map((period: any, index: number) => (
                      <div key={index} className={`p-4 bg-muted rounded-lg border border-purple-300 ${isArabic ? 'text-right' : ''}`}>
                        <div className="flex items-center gap-2 mb-2 w-full">
                          <Badge className={`bg-purple-600 text-white ${isArabic ? 'ml-auto' : ''}`}>{period.period}</Badge>
                        </div>
                        <p className={`text-muted-foreground mb-3 ${isArabic ? 'text-right' : ''}`}>{period.description}</p>
                        {period.key_results && period.key_results.length > 0 && (
                          <div className={`space-y-1 ${isArabic ? 'text-right' : ''}`}>
                            <p className={`text-sm font-semibold text-muted-foreground mb-2 ${isArabic ? 'text-right' : ''}`}>{t('competitiveHistory.keyResults')}</p>
                            {period.key_results.map((result: string, idx: number) => (
                              <div key={idx} className="flex items-start gap-2">
                                <Award className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                <span className={`text-sm text-muted-foreground ${isArabic ? 'text-right' : ''}`}>{result}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Determine second tab label and icon based on sport
  const secondTabLabel = isSwimmingAthlete 
    ? (isArabic ? 'الميداليات' : 'Medal Breakdown')
    : t('competitiveHistory.tabs.rank');
  
  const SecondTabIcon = isSwimmingAthlete ? Trophy : TrendingUp;

  return (
    <Tabs 
      defaultValue={defaultTab} 
      className={`w-full ${className}`}
      onValueChange={(value) => setActiveMainTab(value)}
    >
      <TabsList className="grid w-full grid-cols-2 bg-gray-100 border border-gray-200">
        <TabsTrigger 
          value="competitive"
          data-testid="tab-competitive-history"
          className="data-[state=active]:bg-primary data-[state=active]:text-white"
        >
          <Calendar className={`${isArabic ? 'ml-2' : 'mr-2'} h-4 w-4`} />
          {t('competitiveHistory.tabs.competitive')}
        </TabsTrigger>
        <TabsTrigger 
          value="rank"
          data-testid={isSwimmingAthlete ? "tab-medal-breakdown" : "tab-rank-history"}
          className="data-[state=active]:bg-primary data-[state=active]:text-white"
        >
          <SecondTabIcon className={`${isArabic ? 'ml-2' : 'mr-2'} h-4 w-4`} />
          {secondTabLabel}
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

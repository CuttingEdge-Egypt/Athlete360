import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, Trophy, BarChart, Award } from "lucide-react";
import { Line } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import type { ChartOptions } from 'chart.js';

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
  variant?: 'full' | 'modal';
  defaultTab?: 'competitive' | 'rank';
  className?: string;
}

export function DualAnalysisPanel({
  competitiveAnalysis,
  rankAnalysis,
  rankHistoryData,
  variant = 'full',
  defaultTab = 'competitive',
  className = '',
}: DualAnalysisPanelProps) {
  const { t, i18n } = useTranslation('home');
  const isArabic = i18n.language === 'ar';
  
  const athlete = competitiveAnalysis?.athlete;
  const rankingProgression = competitiveAnalysis?.rankingProgression || [];
  const careerSummary = competitiveAnalysis?.careerSummary || {};

  // Extract unique years from both datasets
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

  const renderRankHistoryContent = () => {
    if (!rankHistoryData || rankHistoryData.length === 0) {
      return (
        <div className="p-6 text-center">
          <p className="text-gray-400">{t('competitiveHistory.noRankData', 'No rank history data available')}</p>
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
        pointRadius: 5,
        pointHoverRadius: 7,
        spanGaps: false,
      };
    });

    const chartData = {
      labels: sortedLabels,
      datasets
    };

    const chartOptions: ChartOptions<'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          reverse: true,
          beginAtZero: false,
          min: 1,
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
            minRotation: 45,
            font: {
              weight: isArabic ? 'bold' as const : 'normal' as const,
              size: isArabic ? 14 : 12
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

    // Calculate unique months for title
    const uniqueMonths = rankHistoryData ? new Set(rankHistoryData.map((entry: any) => `${entry.year}-${entry.month}`)).size : 0;
    
    return (
      <div className="space-y-6">
        <Card className="bg-athlete-gray-800 border-gray-600">
          <CardHeader>
            <CardTitle className={`text-2xl text-gray-100 flex items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
              <TrendingUp className={`${isArabic ? 'ml-3' : 'mr-3'} text-orange-400`} size={24} />
              {t('competitiveHistory.rankProgressionTitle')} ({uniqueMonths} {t('competitiveHistory.months')})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <Line data={chartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        {rankAnalysis && (
          <Card className="bg-athlete-gray-800 border-gray-600">
            <CardHeader>
              <CardTitle className={`text-2xl text-gray-100 flex items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
                <BarChart className={`${isArabic ? 'ml-3' : 'mr-3'} text-blue-400`} size={24} />
                Rank History Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4" dir={isArabic ? 'rtl' : 'ltr'}>
                {typeof rankAnalysis === 'string' ? (
                  <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {rankAnalysis}
                  </div>
                ) : (
                  <>
                    {rankAnalysis.trends_and_outlook && (
                      <div className="bg-athlete-gray-700 p-4 rounded-lg">
                        <h4 className="font-semibold text-white mb-2">{t('competitiveHistory.trendsAndOutlook')}</h4>
                        <p className="text-gray-300 text-sm leading-relaxed">{rankAnalysis.trends_and_outlook}</p>
                      </div>
                    )}
                    {rankAnalysis.progression_timeline && Array.isArray(rankAnalysis.progression_timeline) && rankAnalysis.progression_timeline.length > 0 && (
                      <div className="bg-athlete-gray-700 p-5 rounded-lg">
                        <h4 className={`font-bold text-white mb-5 text-lg flex items-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                          <TrendingUp className="text-blue-400" size={20} />
                          {t('competitiveHistory.progressionTimeline')}
                        </h4>
                        <div className="space-y-4">
                          {rankAnalysis.progression_timeline.map((item: any, index: number) => (
                            <div 
                              key={index} 
                              className={`bg-athlete-gray-800 rounded-lg p-4 border-l-4 ${isArabic ? 'border-l-0 border-r-4 border-r-blue-500' : 'border-l-blue-500'} hover:bg-athlete-gray-750 transition-colors`}
                            >
                              <div className={`font-bold text-blue-400 text-base mb-2 ${isArabic ? 'text-right' : ''}`}>
                                {item.period}
                              </div>
                              <div className={`text-gray-200 leading-relaxed ${isArabic ? 'text-right text-base' : 'text-sm'}`}>
                                {item.rank_change}
                              </div>
                              {item.significance && (
                                <div className={`text-gray-400 mt-2 italic leading-relaxed ${isArabic ? 'text-right text-sm' : 'text-xs'}`}>
                                  {item.significance}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {rankAnalysis.performance_factors && Array.isArray(rankAnalysis.performance_factors) && rankAnalysis.performance_factors.length > 0 && (
                      <div className="bg-athlete-gray-700 p-4 rounded-lg">
                        <h4 className="font-semibold text-white mb-3">Performance Factors</h4>
                        <div className="space-y-2">
                          {rankAnalysis.performance_factors.map((factor: any, index: number) => (
                            <div key={index} className={`flex items-start ${isArabic ? 'flex-row-reverse space-x-reverse' : ''} space-x-2`}>
                              <Trophy className="w-4 h-4 text-yellow-400 mt-1 flex-shrink-0" />
                              <div className="text-gray-300 text-sm">{factor}</div>
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
          <p className="text-gray-400">No rank history data for {year}</p>
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
        pointRadius: 5,
        pointHoverRadius: 7,
        spanGaps: false, // Don't connect points across missing data
      };
    });

    const chartData = {
      labels: sortedLabels,
      datasets
    };

    const chartOptions: ChartOptions<'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          reverse: true,
          beginAtZero: false,
          min: 1,
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
            minRotation: 45,
            font: {
              weight: isArabic ? 'bold' as const : 'normal' as const,
              size: isArabic ? 14 : 12
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
        <Card className="bg-athlete-gray-800 border-gray-600">
          <CardHeader>
            <CardTitle className="text-2xl text-gray-100 flex items-center">
              <TrendingUp className="mr-3 text-orange-400" size={24} />
              Rank Progression Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <Line data={chartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        {rankAnalysis && (
          <Card className="bg-athlete-gray-800 border-gray-600">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-100 flex items-center">
                <BarChart className="mr-3 text-blue-400" size={24} />
                Rank History Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {typeof rankAnalysis === 'string' ? (
                  <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {rankAnalysis}
                  </div>
                ) : (
                  <>
                    {rankAnalysis.trends_and_outlook && (
                      <div className="bg-athlete-gray-700 p-4 rounded-lg">
                        <h4 className="font-semibold text-white mb-2">Trends & Outlook</h4>
                        <p className="text-gray-300 text-sm leading-relaxed">{rankAnalysis.trends_and_outlook}</p>
                      </div>
                    )}
                    {rankAnalysis.progression_timeline && Array.isArray(rankAnalysis.progression_timeline) && rankAnalysis.progression_timeline.length > 0 && (
                      <div className="bg-athlete-gray-700 p-5 rounded-lg">
                        <h4 className={`font-bold text-white mb-5 text-lg flex items-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                          <TrendingUp className="text-blue-400" size={20} />
                          Progression Timeline
                        </h4>
                        <div className="space-y-4">
                          {rankAnalysis.progression_timeline.map((item: any, index: number) => (
                            <div 
                              key={index} 
                              className={`bg-athlete-gray-800 rounded-lg p-4 border-l-4 ${isArabic ? 'border-l-0 border-r-4 border-r-blue-500' : 'border-l-blue-500'} hover:bg-athlete-gray-750 transition-colors`}
                            >
                              <div className={`font-bold text-blue-400 text-base mb-2 ${isArabic ? 'text-right' : ''}`}>
                                {item.period}
                              </div>
                              <div className={`text-gray-200 leading-relaxed ${isArabic ? 'text-right text-base' : 'text-sm'}`}>
                                {item.rank_change}
                              </div>
                              {item.significance && (
                                <div className={`text-gray-400 mt-2 italic leading-relaxed ${isArabic ? 'text-right text-sm' : 'text-xs'}`}>
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

  const renderCompetitiveHistoryContent = () => {
    // If no years available or no ranking progression, show message
    if (availableYears.length === 0 || !rankingProgression || rankingProgression.length === 0) {
      return (
        <div className="p-6 text-center">
          <p className="text-gray-400">No competitive history data available</p>
        </div>
      );
    }

    // Render year tabs
    return (
      <Tabs defaultValue={defaultYear} className="w-full">
        <TabsList className="bg-athlete-gray-700 mb-6">
          {availableYears.map(year => (
            <TabsTrigger
              key={year}
              value={year.toString()}
              data-testid={`tab-competitive-year-${year}`}
              className="data-[state=active]:bg-athlete-accent"
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
          <Card className="bg-athlete-gray-800 border-gray-600">
            <CardHeader>
              <CardTitle className={`text-2xl text-gray-100 flex items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
                <Calendar className={`${isArabic ? 'ml-3' : 'mr-3'} text-blue-400`} size={24} />
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
                      <div key={index} className={`p-4 bg-athlete-gray-700 rounded-lg border border-gray-600 hover:border-blue-500/50 transition-colors ${isArabic ? 'text-right' : ''}`}>
                        <div className={`flex items-start justify-between mb-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                          <div className="flex-1">
                            <div className={`flex items-start gap-3 mb-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                              <Badge variant="outline" className="border-yellow-400 text-yellow-400 text-xs mt-1">
                                {displayDate}
                              </Badge>
                              <span className="font-bold text-white text-lg leading-tight">{comp.competition || comp.tournament}</span>
                            </div>
                            {comp.location && (
                              <div className={`text-sm text-gray-400 mb-2 ${isArabic ? 'text-right' : ''}`}>
                                📍 {comp.location}
                              </div>
                            )}
                            <div className={`flex items-center gap-4 text-sm ${isArabic ? 'flex-row-reverse' : ''}`}>
                              {comp.rankingPoints && (
                                <div className="text-gray-400">
                                  {t('competitiveHistory.points')} <span className="text-green-400 font-semibold">{comp.rankingPoints}</span>
                                </div>
                              )}
                              {comp.gRank && (
                                <div className="text-gray-400">
                                  {isArabic ? (
                                    <><span className="text-blue-400 font-semibold">{comp.gRank}</span> :{t('competitiveHistory.gRank').replace(':', '')}</>
                                  ) : (
                                    <>{t('competitiveHistory.gRank')} <span className="text-blue-400 font-semibold">{comp.gRank}</span></>
                                  )}
                                </div>
                              )}
                              {comp.ranking && comp.ranking !== 'N/A' && (
                                <div className="text-gray-400">
                                  {isArabic ? (
                                    <><span className="text-gray-300">{comp.ranking}</span> :{t('competitiveHistory.category').replace(':', '')}</>
                                  ) : (
                                    <>{t('competitiveHistory.category')} <span className="text-gray-300">{comp.ranking}</span></>
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
          <Card className="bg-athlete-gray-800 border-gray-600">
            <CardHeader>
              <CardTitle className={`text-2xl text-gray-100 flex items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
                <Trophy className={`${isArabic ? 'ml-3' : 'mr-3'} text-blue-400`} size={24} />
                Career Phases
              </CardTitle>
              <div className={`text-sm text-gray-400 ${isArabic ? 'text-right' : ''}`}>Professional career progression through different phases</div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-purple-500 opacity-30"></div>
                
                <div className="space-y-8">
                  {careerPhases.map((phase: any, phaseIndex: number) => (
                    <div key={phaseIndex} className="relative ml-8">
                      <div className="absolute -left-12 top-6 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white ring-4 ring-blue-600/30">
                        {phaseIndex + 1}
                      </div>

                      <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-blue-500/50">
                        <CardHeader>
                          <div className={`flex items-center justify-between ${isArabic ? 'flex-row-reverse' : ''}`}>
                            <CardTitle className={`text-xl text-white ${isArabic ? 'text-right' : ''}`}>
                              {phase.phase_name}
                            </CardTitle>
                            <Badge className="bg-blue-600 text-white">{phase.period}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className={`space-y-4 ${isArabic ? 'text-right' : ''}`}>
                          {phase.key_achievements && phase.key_achievements.length > 0 && (
                            <div className="space-y-3">
                              {phase.key_achievements
                                .slice()
                                .sort((a: any, b: any) => {
                                  const yearA = parseInt(a.year) || 0;
                                  const yearB = parseInt(b.year) || 0;
                                  return yearB - yearA;
                                })
                                .map((achievement: any, achievementIndex: number) => (
                                  <div key={achievementIndex} className={`p-4 bg-athlete-gray-700 rounded-lg border border-gray-600 hover:border-blue-500/50 transition-colors ${isArabic ? 'text-right' : ''}`}>
                                    <div className={`flex items-start justify-between mb-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                                      <div className="flex-1">
                                        <div className={`flex items-center gap-3 mb-2 ${isArabic ? 'flex-row-reverse justify-end' : ''}`}>
                                          <Badge variant="outline" className="border-yellow-400 text-yellow-400 text-xs">
                                            {achievement.month} {achievement.year}
                                          </Badge>
                                          <span className="font-bold text-white">{achievement.event_name}</span>
                                        </div>
                                        <div className={`text-sm text-gray-400 mb-2 ${isArabic ? 'text-right' : ''}`}>
                                          {achievement.event_tier}
                                        </div>
                                      </div>
                                      <div className={`${isArabic ? 'mr-3' : 'ml-3'}`}>
                                        {getResultBadge(achievement.result)}
                                      </div>
                                    </div>
                                    
                                    {achievement.notes && (
                                      <p className={`text-sm text-gray-300 leading-relaxed ${isArabic ? 'text-right' : ''}`}>
                                        {achievement.notes}
                                      </p>
                                    )}
                                  </div>
                                ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Competitive History Analysis - Overall insights for now */}
        {(careerOverview || peakPerformancePeriods?.length > 0 || notableAchievements?.length > 0 || recentForm) && (
          <Card className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-purple-500">
            <CardHeader>
              <CardTitle className={`text-2xl text-white flex items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
                <Calendar className={`${isArabic ? 'ml-3' : 'mr-3'} text-purple-400`} size={24} />
                {t('competitiveHistory.title')}
              </CardTitle>
              <div className={`text-sm text-gray-400 ${isArabic ? 'text-right' : ''}`}>{t('competitiveHistory.subtitle')}</div>
            </CardHeader>
            <CardContent className={`space-y-6 ${isArabic ? 'text-right' : ''}`} dir={isArabic ? 'rtl' : 'ltr'}>
              {careerOverview && (
                <div className={isArabic ? 'text-right' : ''}>
                  <h3 className={`text-lg font-semibold text-white mb-3 flex items-center ${isArabic ? 'flex-row-reverse justify-end' : ''}`}>
                    <Trophy className={`${isArabic ? 'ml-2' : 'mr-2'} text-yellow-400`} size={20} />
                    {t('competitiveHistory.careerOverview')}
                  </h3>
                  <p className={`text-gray-300 leading-relaxed ${isArabic ? 'text-right' : ''}`}>{careerOverview}</p>
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
                      <div key={index} className={`p-4 bg-athlete-gray-700 rounded-lg border border-purple-500/30 ${isArabic ? 'text-right' : ''}`}>
                        <div className={`flex items-center gap-2 mb-2 w-full ${isArabic ? 'justify-end flex-row-reverse' : ''}`}>
                          <Badge className="bg-purple-600 text-white">{period.period}</Badge>
                        </div>
                        <p className={`text-gray-300 mb-3 ${isArabic ? 'text-right' : ''}`}>{period.description}</p>
                        {period.key_results && period.key_results.length > 0 && (
                          <div className={`space-y-1 ${isArabic ? 'text-right' : ''}`}>
                            <p className={`text-sm font-semibold text-gray-400 mb-2 ${isArabic ? 'text-right' : ''}`}>{t('competitiveHistory.keyResults')}</p>
                            {period.key_results.map((result: string, idx: number) => (
                              <div key={idx} className="flex items-start gap-2">
                                <Award className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                <span className={`text-sm text-gray-300 ${isArabic ? 'text-right' : ''}`}>{result}</span>
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

  return (
    <Tabs defaultValue={defaultTab} className={`w-full ${className}`}>
      <TabsList className="grid w-full grid-cols-2 bg-athlete-gray-700">
        <TabsTrigger 
          value="competitive"
          data-testid="tab-competitive-history"
          className="data-[state=active]:bg-athlete-accent"
        >
          <Calendar className={`${isArabic ? 'ml-2' : 'mr-2'} h-4 w-4`} />
          {t('competitiveHistory.tabs.competitive')}
        </TabsTrigger>
        <TabsTrigger 
          value="rank"
          data-testid="tab-rank-history"
          className="data-[state=active]:bg-athlete-accent"
        >
          <TrendingUp className={`${isArabic ? 'ml-2' : 'mr-2'} h-4 w-4`} />
          {t('competitiveHistory.tabs.rank')}
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

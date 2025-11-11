import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, Trophy, BarChart, Award } from "lucide-react";
import { Line } from 'react-chartjs-2';

interface DualAnalysisPanelProps {
  competitiveAnalysis: any;
  rankAnalysis: string | null;
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
  const athlete = competitiveAnalysis?.athlete;
  const rankingProgression = competitiveAnalysis?.rankingProgression || [];
  const careerSummary = competitiveAnalysis?.careerSummary || {};

  const renderRankHistoryContent = () => {
    if (!rankHistoryData || rankHistoryData.length === 0) {
      return (
        <div className="p-6 text-center">
          <p className="text-gray-400">No rank history data available</p>
        </div>
      );
    }

    // Group rank history data by category
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
    const sortedLabels = Array.from(allDates).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );

    // Create datasets for each category
    const datasets = Object.keys(categoryGroups).map((categoryKey, index) => {
      const categoryData = categoryGroups[categoryKey];
      const categoryLabel = categoryData[0]?.categoryLabel || categoryKey;
      const colorIndex = index % categoryColors.length;
      const colors = categoryColors[colorIndex];

      // Map data to all dates (null for missing dates)
      const dataPoints = sortedLabels.map(label => {
        const entry = categoryData.find(e => e.date === label);
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
                      <div className="bg-athlete-gray-700 p-4 rounded-lg">
                        <h4 className="font-semibold text-white mb-3">Progression Timeline</h4>
                        <div className="space-y-2">
                          {rankAnalysis.progression_timeline.map((item: any, index: number) => (
                            <div key={index} className="border-l-2 border-blue-400 pl-3 py-1">
                              <div className="font-medium text-blue-300 text-sm">{item.period}</div>
                              <div className="text-gray-300 text-sm">{item.rank_change}</div>
                              {item.significance && (
                                <div className="text-gray-400 text-xs mt-1 italic">{item.significance}</div>
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

  const renderCompetitiveHistoryContent = () => {
    // Extract data from competitiveAnalysis structure
    const careerPhases = competitiveAnalysis?.career_phases || [];
    const careerOverview = competitiveAnalysis?.career_overview;
    const peakPerformancePeriods = competitiveAnalysis?.peak_performance_periods || [];
    const competitionAnalysis = competitiveAnalysis?.competition_analysis || {};
    const progressionPatterns = competitiveAnalysis?.progression_patterns;
    const notableAchievements = competitiveAnalysis?.notable_achievements || [];
    const recentForm = competitiveAnalysis?.recent_form;
    const insights = competitiveAnalysis?.insights || [];

    // Helper function for result badges
    const getResultBadge = (result: string) => {
      if (!result) return null;
      
      const resultLower = result.toLowerCase();
      if (resultLower.includes('1st') || resultLower.includes('gold') || resultLower.includes('🥇')) {
        return <Badge className="bg-yellow-500 text-white">🥇 {result}</Badge>;
      } else if (resultLower.includes('2nd') || resultLower.includes('silver') || resultLower.includes('🥈')) {
        return <Badge className="bg-gray-400 text-white">🥈 {result}</Badge>;
      } else if (resultLower.includes('3rd') || resultLower.includes('bronze') || resultLower.includes('🥉')) {
        return <Badge className="bg-orange-600 text-white">🥉 {result}</Badge>;
      } else {
        return <Badge variant="secondary">✓ {result}</Badge>;
      }
    };

    return (
      <div className="space-y-6">
        {/* Competition Results from API Data */}
        {rankingProgression && rankingProgression.length > 0 && (
          <Card className="bg-athlete-gray-800 border-gray-600">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-100 flex items-center">
                <Calendar className="mr-3 text-blue-400" size={24} />
                International Competitive History
              </CardTitle>
              <Badge className="bg-blue-600 text-white">
                {rankingProgression[0]?.date ? new Date(rankingProgression[0].date).getFullYear() : 'Recent'}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rankingProgression
                  .slice()
                  .sort((a: any, b: any) => {
                    const dateA = new Date(a.date || 0).getTime();
                    const dateB = new Date(b.date || 0).getTime();
                    return dateB - dateA; // Most recent first
                  })
                  .map((comp: any, index: number) => {
                    // Parse date for display
                    const compDate = comp.date ? new Date(comp.date) : null;
                    const monthYear = compDate 
                      ? compDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                      : 'Date unknown';

                    return (
                      <div key={index} className="p-4 bg-athlete-gray-700 rounded-lg border border-gray-600 hover:border-blue-500/50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge variant="outline" className="border-yellow-400 text-yellow-400 text-xs">
                                {monthYear}
                              </Badge>
                              <span className="font-bold text-white text-lg">{comp.competition || comp.tournament}</span>
                            </div>
                            {comp.location && (
                              <div className="text-sm text-gray-400 mb-2">
                                📍 {comp.location}
                              </div>
                            )}
                            {comp.ranking && comp.ranking !== 'N/A' && (
                              <div className="text-sm text-gray-400">
                                Category: {comp.ranking}
                              </div>
                            )}
                          </div>
                          <div className="ml-3">
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
              <CardTitle className="text-2xl text-gray-100 flex items-center">
                <Trophy className="mr-3 text-blue-400" size={24} />
                Career Phases
              </CardTitle>
              <div className="text-sm text-gray-400">Professional career progression through different phases</div>
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
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-xl text-white">
                              {phase.phase_name}
                            </CardTitle>
                            <Badge className="bg-blue-600 text-white">{phase.period}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
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
                                  <div key={achievementIndex} className="p-4 bg-athlete-gray-700 rounded-lg border border-gray-600 hover:border-blue-500/50 transition-colors">
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                          <Badge variant="outline" className="border-yellow-400 text-yellow-400 text-xs">
                                            {achievement.month} {achievement.year}
                                          </Badge>
                                          <span className="font-bold text-white">{achievement.event_name}</span>
                                        </div>
                                        <div className="text-sm text-gray-400 mb-2">
                                          {achievement.event_tier}
                                        </div>
                                      </div>
                                      <div className="ml-3">
                                        {getResultBadge(achievement.result)}
                                      </div>
                                    </div>
                                    
                                    {achievement.notes && (
                                      <p className="text-sm text-gray-300 leading-relaxed">
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

        {/* Competitive History Analysis */}
        {(careerOverview || peakPerformancePeriods?.length > 0 || notableAchievements?.length > 0 || recentForm) && (
          <Card className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-purple-500">
            <CardHeader>
              <CardTitle className="text-2xl text-white flex items-center">
                <Calendar className="mr-3 text-purple-400" size={24} />
                Competitive History Analysis
              </CardTitle>
              <div className="text-sm text-gray-400">Professional analysis of career progression and achievements</div>
            </CardHeader>
            <CardContent className="space-y-6">
              {careerOverview && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                    <Trophy className="mr-2 text-yellow-400" size={20} />
                    Career Overview
                  </h3>
                  <p className="text-gray-300 leading-relaxed">{careerOverview}</p>
                </div>
              )}
              
              {peakPerformancePeriods && peakPerformancePeriods.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                    <TrendingUp className="mr-2 text-green-400" size={20} />
                    Peak Performance Periods
                  </h3>
                  <div className="space-y-4">
                    {peakPerformancePeriods.map((period: any, index: number) => (
                      <div key={index} className="p-4 bg-athlete-gray-700 rounded-lg border border-purple-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-purple-600 text-white">{period.period}</Badge>
                        </div>
                        <p className="text-gray-300 mb-3">{period.description}</p>
                        {period.key_results && period.key_results.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-gray-400 mb-2">Key Results:</p>
                            {period.key_results.map((result: string, idx: number) => (
                              <div key={idx} className="flex items-start gap-2">
                                <Award className="w-4 h-4 text-green-400 mt-0.5" />
                                <span className="text-sm text-gray-300">{result}</span>
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
          <Calendar className="mr-2 h-4 w-4" />
          Competitive History
        </TabsTrigger>
        <TabsTrigger 
          value="rank"
          data-testid="tab-rank-history"
          className="data-[state=active]:bg-athlete-accent"
        >
          <TrendingUp className="mr-2 h-4 w-4" />
          Rank History
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

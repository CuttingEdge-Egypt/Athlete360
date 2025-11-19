import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, Medal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface SwimmingCompetitiveHistoryProps {
  competitiveHistory: any;
  athleteName: string;
  showMedalsOnly?: boolean;  // If true, only show medals table
  showTimelineOnly?: boolean; // If true, only show LLM analysis + competitions
}

export function SwimmingCompetitiveHistory({ 
  competitiveHistory, 
  athleteName,
  showMedalsOnly = false,
  showTimelineOnly = false
}: SwimmingCompetitiveHistoryProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  // Extract all data
  const careerPhases = competitiveHistory?.career_phases || [];
  const medalsSummary = competitiveHistory?.medals_summary || [];
  const careerOverview = competitiveHistory?.career_overview;
  const peakPerformancePeriods = competitiveHistory?.peak_performance_periods || [];
  const progressionPatterns = competitiveHistory?.progression_patterns;
  const recentForm = competitiveHistory?.recent_form;

  // Get result badge
  const getResultBadge = (result: string) => {
    if (!result) return <Badge variant="secondary">No result</Badge>;
    
    const lowerResult = result.toLowerCase();
    
    if (lowerResult.includes('gold')) {
      return <Badge className="bg-yellow-500 text-white">🥇 Gold Medal</Badge>;
    } else if (lowerResult.includes('silver')) {
      return <Badge className="bg-gray-400 text-white">🥈 Silver Medal</Badge>;
    } else if (lowerResult.includes('bronze')) {
      return <Badge className="bg-amber-700 text-white">🥉 Bronze Medal</Badge>;
    } else if (lowerResult.includes('1st')) {
      return <Badge className="bg-yellow-500 text-white">🥇 1st</Badge>;
    } else if (lowerResult.includes('2nd')) {
      return <Badge className="bg-gray-400 text-white">🥈 2nd</Badge>;
    } else if (lowerResult.includes('3rd')) {
      return <Badge className="bg-amber-700 text-white">🥉 3rd</Badge>;
    } else {
      return <Badge variant="secondary">✓ {result}</Badge>;
    }
  };

  // Get medal icon
  const getMedalIcon = (medalType: string) => {
    const lowerType = medalType.toLowerCase();
    if (lowerType.includes('gold')) return '🥇';
    if (lowerType.includes('silver')) return '🥈';
    if (lowerType.includes('bronze')) return '🥉';
    return '🏅';
  };

  // If showing medals only, just render the medals table
  if (showMedalsOnly) {
    return (
      <div className="space-y-8" dir={isArabic ? 'rtl' : 'ltr'}>
        {medalsSummary && medalsSummary.length > 0 ? (
          <Card className="bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border-yellow-500/50">
            <CardHeader>
              <CardTitle className={`text-2xl text-white flex items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
                <Medal className={`${isArabic ? 'ml-3' : 'mr-3'} text-yellow-400`} size={24} />
                {isArabic ? 'الميداليات' : 'Medals'}
              </CardTitle>
              <div className={`text-sm text-gray-300 ${isArabic ? 'text-right' : ''}`}>
                {isArabic ? 'جميع الميداليات التي فاز بها الرياضي' : 'All medals won by the athlete'}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-yellow-500/30 hover:bg-transparent">
                      <TableHead className={`text-yellow-400 font-semibold ${isArabic ? 'text-right' : ''}`}>
                        {isArabic ? 'الميدالية' : 'Medal'}
                      </TableHead>
                      <TableHead className={`text-yellow-400 font-semibold ${isArabic ? 'text-right' : ''}`}>
                        {isArabic ? 'الحدث' : 'Event'}
                      </TableHead>
                      <TableHead className={`text-yellow-400 font-semibold ${isArabic ? 'text-right' : ''}`}>
                        {isArabic ? 'الدولة' : 'Country'}
                      </TableHead>
                      <TableHead className={`text-yellow-400 font-semibold ${isArabic ? 'text-right' : ''}`}>
                        {isArabic ? 'التاريخ' : 'Date'}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {medalsSummary.map((medal: any, index: number) => {
                      let displayDate = medal.date;
                      try {
                        const dateObj = new Date(medal.date);
                        if (!isNaN(dateObj.getTime())) {
                          if (isArabic) {
                            const monthNamesAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                              'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
                            displayDate = `${dateObj.getDate()} ${monthNamesAr[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
                          } else {
                            displayDate = dateObj.toLocaleDateString('en-US', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            });
                          }
                        }
                      } catch (e) {
                        // Keep original date if parsing fails
                      }

                      return (
                        <TableRow 
                          key={index} 
                          className="border-yellow-500/20 hover:bg-yellow-500/10 transition-colors"
                          data-testid={`medal-row-${index}`}
                        >
                          <TableCell className={`font-medium ${isArabic ? 'text-right' : ''}`}>
                            <span className="text-2xl">{getMedalIcon(medal.medal_type)}</span>
                            <span className={`${isArabic ? 'mr-2' : 'ml-2'} text-gray-200`}>
                              {medal.medal_type}
                            </span>
                          </TableCell>
                          <TableCell className={`text-gray-200 ${isArabic ? 'text-right' : ''}`}>
                            {medal.event}
                          </TableCell>
                          <TableCell className={`text-gray-200 ${isArabic ? 'text-right' : ''}`}>
                            {medal.country}
                          </TableCell>
                          <TableCell className={`text-gray-300 ${isArabic ? 'text-right' : ''}`}>
                            {displayDate}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="p-6 text-center">
            <p className="text-gray-400">{isArabic ? 'لا توجد بيانات ميداليات متاحة' : 'No medals data available'}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* LLM Analysis Section - Only shown when not showMedalsOnly */}
      {!showMedalsOnly && (careerOverview || peakPerformancePeriods.length > 0) && (
        <div className="space-y-6">
          {/* Career Overview */}
          {careerOverview && (
            <Card className="bg-athlete-gray-800 border-gray-600">
              <CardHeader>
                <CardTitle className={`text-2xl text-white ${isArabic ? 'text-right' : ''}`}>
                  {isArabic ? 'نظرة عامة على المسيرة' : 'Career Overview'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-gray-300 leading-relaxed ${isArabic ? 'text-right' : ''}`}>
                  {careerOverview}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Peak Performance Periods */}
          {peakPerformancePeriods.length > 0 && (
            <Card className="bg-athlete-gray-800 border-gray-600">
              <CardHeader>
                <CardTitle className={`text-2xl text-white ${isArabic ? 'text-right' : ''}`}>
                  {isArabic ? 'فترات الأداء القصوى' : 'Peak Performance Periods'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {peakPerformancePeriods.map((period: any, index: number) => (
                    <div 
                      key={index} 
                      className={`p-4 bg-athlete-gray-700 rounded-lg border border-purple-500/30 ${isArabic ? 'text-right' : ''}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-purple-600 text-white">{period.period}</Badge>
                      </div>
                      <p className={`text-gray-300 mb-3 ${isArabic ? 'text-right' : ''}`}>{period.description}</p>
                      {period.key_results && period.key_results.length > 0 && (
                        <div className={`space-y-1 ${isArabic ? 'text-right' : ''}`}>
                          <p className={`text-sm font-semibold text-gray-400 mb-2 ${isArabic ? 'text-right' : ''}`}>
                            {isArabic ? 'النتائج الرئيسية' : 'Key Results'}
                          </p>
                          {period.key_results.map((result: string, idx: number) => (
                            <div key={idx} className={`flex items-start gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                              <Trophy className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                              <span className={`text-sm text-gray-300 ${isArabic ? 'text-right' : ''}`}>{result}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progression Patterns */}
          {progressionPatterns && (
            <Card className="bg-athlete-gray-800 border-gray-600">
              <CardHeader>
                <CardTitle className={`text-2xl text-white ${isArabic ? 'text-right' : ''}`}>
                  {isArabic ? 'أنماط التقدم' : 'Progression Patterns'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-gray-300 leading-relaxed ${isArabic ? 'text-right' : ''}`}>
                  {progressionPatterns}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Recent Form */}
          {recentForm && (
            <Card className="bg-athlete-gray-800 border-gray-600">
              <CardHeader>
                <CardTitle className={`text-2xl text-white ${isArabic ? 'text-right' : ''}`}>
                  {isArabic ? 'الشكل الحالي' : 'Recent Form'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-gray-300 leading-relaxed ${isArabic ? 'text-right' : ''}`}>
                  {recentForm}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Medals Summary Table - Only show if not in specific modes */}
      {!showTimelineOnly && medalsSummary && medalsSummary.length > 0 && (
        <Card className="bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border-yellow-500/50">
          <CardHeader>
            <CardTitle className={`text-2xl text-white flex items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
              <Medal className={`${isArabic ? 'ml-3' : 'mr-3'} text-yellow-400`} size={24} />
              {isArabic ? 'الميداليات' : 'Medals'}
            </CardTitle>
            <div className={`text-sm text-gray-300 ${isArabic ? 'text-right' : ''}`}>
              {isArabic ? 'جميع الميداليات التي فاز بها الرياضي' : 'All medals won by the athlete'}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-yellow-500/30 hover:bg-transparent">
                    <TableHead className={`text-yellow-400 font-semibold ${isArabic ? 'text-right' : ''}`}>
                      {isArabic ? 'الميدالية' : 'Medal'}
                    </TableHead>
                    <TableHead className={`text-yellow-400 font-semibold ${isArabic ? 'text-right' : ''}`}>
                      {isArabic ? 'الحدث' : 'Event'}
                    </TableHead>
                    <TableHead className={`text-yellow-400 font-semibold ${isArabic ? 'text-right' : ''}`}>
                      {isArabic ? 'الدولة' : 'Country'}
                    </TableHead>
                    <TableHead className={`text-yellow-400 font-semibold ${isArabic ? 'text-right' : ''}`}>
                      {isArabic ? 'التاريخ' : 'Date'}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {medalsSummary.map((medal: any, index: number) => {
                    // Format date
                    let displayDate = medal.date;
                    try {
                      const dateObj = new Date(medal.date);
                      if (!isNaN(dateObj.getTime())) {
                        if (isArabic) {
                          const monthNamesAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
                          displayDate = `${dateObj.getDate()} ${monthNamesAr[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
                        } else {
                          displayDate = dateObj.toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          });
                        }
                      }
                    } catch (e) {
                      // Keep original date if parsing fails
                    }

                    return (
                      <TableRow 
                        key={index} 
                        className="border-yellow-500/20 hover:bg-yellow-500/10 transition-colors"
                        data-testid={`medal-row-${index}`}
                      >
                        <TableCell className={`font-medium ${isArabic ? 'text-right' : ''}`}>
                          <span className="text-2xl">{getMedalIcon(medal.medal_type)}</span>
                          <span className={`${isArabic ? 'mr-2' : 'ml-2'} text-gray-200`}>
                            {medal.medal_type}
                          </span>
                        </TableCell>
                        <TableCell className={`text-gray-200 ${isArabic ? 'text-right' : ''}`}>
                          {medal.event}
                        </TableCell>
                        <TableCell className={`text-gray-200 ${isArabic ? 'text-right' : ''}`}>
                          {medal.country}
                        </TableCell>
                        <TableCell className={`text-gray-300 ${isArabic ? 'text-right' : ''}`}>
                          {displayDate}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Career Phases with Competition Results */}
      {careerPhases && careerPhases.length > 0 && careerPhases.map((phase: any, phaseIndex: number) => (
        <Card key={phaseIndex} className="bg-athlete-gray-800 border-gray-600">
          <CardHeader>
            <div className={`flex items-center justify-between ${isArabic ? 'flex-row-reverse' : ''}`}>
              <CardTitle className={`text-2xl text-gray-100 flex items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
                <Calendar className={`${isArabic ? 'ml-3' : 'mr-3'} text-blue-400`} size={24} />
                {phase.phase_name}
              </CardTitle>
              <Badge className="bg-blue-600 text-white">{phase.period}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {phase.key_achievements && phase.key_achievements.length > 0 && phase.key_achievements
                .slice()
                .sort((a: any, b: any) => {
                  // Sort by date (most recent first)
                  const dateA = a.day && a.month && a.year 
                    ? new Date(`${a.year}-${a.month}-${a.day}`).getTime()
                    : (a.year ? new Date(`${a.year}-01-01`).getTime() : 0);
                  const dateB = b.day && b.month && b.year
                    ? new Date(`${b.year}-${b.month}-${b.day}`).getTime()
                    : (b.year ? new Date(`${b.year}-01-01`).getTime() : 0);
                  return dateB - dateA;
                })
                .map((achievement: any, achievementIndex: number) => {
                  // Format date with day
                  let achievementDate = `${achievement.month} ${achievement.year}`;
                  if (achievement.day) {
                    achievementDate = `${achievement.day} ${achievement.month} ${achievement.year}`;
                  }

                  return (
                    <div 
                      key={achievementIndex} 
                      className={`p-4 bg-athlete-gray-700 rounded-lg border border-gray-600 hover:border-blue-500/50 transition-colors ${isArabic ? 'text-right' : ''}`}
                      data-testid={`competition-${achievementIndex}`}
                    >
                      <div className={`flex items-start justify-between mb-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                        <div className="flex-1">
                          {/* Date Badge */}
                          <Badge variant="outline" className="border-yellow-400 text-yellow-400 text-sm mb-2">
                            {achievementDate}
                          </Badge>

                          {/* Competition Name */}
                          <div className="font-bold text-white text-lg leading-tight mb-2">
                            {achievement.event_name}
                          </div>

                          {/* Event Type - PROMINENT */}
                          {achievement.event_type && (
                            <div className={`mb-2 ${isArabic ? 'text-right' : ''}`}>
                              <div className="inline-flex items-center gap-2 bg-purple-500/20 px-3 py-1.5 rounded-lg border border-purple-500/40">
                                <span className="text-xs text-purple-300">{isArabic ? 'الحدث' : 'Event'}</span>
                                <span className="text-purple-400 font-bold text-base">{achievement.event_type}</span>
                              </div>
                            </div>
                          )}

                          {/* Time Result - VERY PROMINENT */}
                          {achievement.time_result && achievement.time_result !== 'DNS' && (
                            <div className={`mb-2 ${isArabic ? 'text-right' : ''}`}>
                              <div className="inline-flex items-center gap-2 bg-yellow-500/20 px-4 py-2 rounded-lg border border-yellow-500/40">
                                <span className="text-sm text-yellow-300">{isArabic ? 'الوقت' : 'Time'}</span>
                                <span className="text-yellow-400 font-bold text-xl">{achievement.time_result}</span>
                              </div>
                            </div>
                          )}

                          <div className={`text-sm text-gray-400 mb-2 ${isArabic ? 'text-right' : ''}`}>
                            {achievement.event_tier}
                          </div>

                          {/* Additional swimming details */}
                          {(achievement.pool_type || achievement.distance) && (
                            <div className={`flex items-center gap-3 text-xs flex-wrap ${isArabic ? 'flex-row-reverse' : ''}`}>
                              {achievement.pool_type && (
                                <span className="text-teal-400">
                                  {isArabic ? 'المسبح' : 'Pool'}: {achievement.pool_type}
                                </span>
                              )}
                              {achievement.distance && (
                                <span className="text-cyan-400">
                                  {isArabic ? 'المسافة' : 'Distance'}: {achievement.distance}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className={`${isArabic ? 'mr-3' : 'ml-3'}`}>
                          {getResultBadge(achievement.result)}
                        </div>
                      </div>

                      {achievement.notes && achievement.notes !== 'DNS' && (
                        <p className={`text-sm text-gray-300 leading-relaxed ${isArabic ? 'text-right' : ''}`}>
                          {achievement.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

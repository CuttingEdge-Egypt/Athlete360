import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, Medal, Clock, Award, MapPin, Waves } from 'lucide-react';
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
  showMedalsOnly?: boolean;
  showTimelineOnly?: boolean;
}

export function SwimmingCompetitiveHistory({ 
  competitiveHistory, 
  athleteName,
  showMedalsOnly = false,
  showTimelineOnly = false
}: SwimmingCompetitiveHistoryProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  // Helper function to convert numbers to Arabic numerals
  const toArabicNumerals = (str: string | number): string => {
    if (!isArabic) return String(str);
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(str).replace(/\d/g, (digit) => arabicNumerals[parseInt(digit)]);
  };

  // Helper function to format dates in Arabic
  const formatArabicDate = (day: string | number, month: string, year: string | number): string => {
    if (!isArabic) {
      return `${month} ${day ? `${day} ` : ''}${year}`;
    }
    
    const monthNamesAr: { [key: string]: string } = {
      'January': 'يناير', 'February': 'فبراير', 'March': 'مارس', 'April': 'أبريل',
      'May': 'مايو', 'June': 'يونيو', 'July': 'يوليو', 'August': 'أغسطس',
      'September': 'سبتمبر', 'October': 'أكتوبر', 'November': 'نوفمبر', 'December': 'ديسمبر'
    };
    
    const arabicMonth = monthNamesAr[month] || month;
    const arabicYear = toArabicNumerals(year);
    const arabicDay = day ? toArabicNumerals(day) : '';
    
    return arabicDay ? `${arabicDay} ${arabicMonth} ${arabicYear}` : `${arabicMonth} ${arabicYear}`;
  };

  const careerPhases = competitiveHistory?.career_phases || [];
  const medalsSummary = competitiveHistory?.medals_summary || [];
  const careerOverview = competitiveHistory?.career_overview;
  const peakPerformancePeriods = competitiveHistory?.peak_performance_periods || [];
  const progressionPatterns = competitiveHistory?.progression_patterns;
  const recentForm = competitiveHistory?.recent_form;

  const getResultBadge = (result: string) => {
    if (!result) return <Badge variant="secondary" className={isArabic ? "text-base px-4 py-1.5" : "text-sm"}>No result</Badge>;
    
    const lowerResult = result.toLowerCase();
    
    if (lowerResult.includes('gold')) {
      return <Badge className={`bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-lg ${isArabic ? 'text-lg px-5 py-2' : 'text-base px-4 py-1.5'}`}>🥇 {isArabic ? 'ذهبية' : 'Gold'}</Badge>;
    } else if (lowerResult.includes('silver')) {
      return <Badge className={`bg-gradient-to-r from-gray-300 to-gray-500 text-white shadow-lg ${isArabic ? 'text-lg px-5 py-2' : 'text-base px-4 py-1.5'}`}>🥈 {isArabic ? 'فضية' : 'Silver'}</Badge>;
    } else if (lowerResult.includes('bronze')) {
      return <Badge className={`bg-gradient-to-r from-amber-600 to-amber-800 text-white shadow-lg ${isArabic ? 'text-lg px-5 py-2' : 'text-base px-4 py-1.5'}`}>🥉 {isArabic ? 'برونزية' : 'Bronze'}</Badge>;
    } else if (lowerResult.includes('1st')) {
      return <Badge className={`bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-lg ${isArabic ? 'text-lg px-5 py-2' : 'text-base px-4 py-1.5'}`}>🥇 {isArabic ? 'الأول' : '1st'}</Badge>;
    } else if (lowerResult.includes('2nd')) {
      return <Badge className={`bg-gradient-to-r from-gray-300 to-gray-500 text-white shadow-lg ${isArabic ? 'text-lg px-5 py-2' : 'text-base px-4 py-1.5'}`}>🥈 {isArabic ? 'الثاني' : '2nd'}</Badge>;
    } else if (lowerResult.includes('3rd')) {
      return <Badge className={`bg-gradient-to-r from-amber-600 to-amber-800 text-white shadow-lg ${isArabic ? 'text-lg px-5 py-2' : 'text-base px-4 py-1.5'}`}>🥉 {isArabic ? 'الثالث' : '3rd'}</Badge>;
    } else {
      return <Badge variant="secondary" className={`${isArabic ? 'text-base px-4 py-1.5' : 'text-sm'}`}>✓ {result}</Badge>;
    }
  };

  const getMedalIcon = (medalType: string) => {
    const lowerType = medalType.toLowerCase();
    if (lowerType.includes('gold')) return '🥇';
    if (lowerType.includes('silver')) return '🥈';
    if (lowerType.includes('bronze')) return '🥉';
    return '🏅';
  };

  // If showing medals only
  if (showMedalsOnly) {
    return (
      <div className="space-y-8" dir={isArabic ? 'rtl' : 'ltr'}>
        {medalsSummary && medalsSummary.length > 0 ? (
          <Card className="bg-gradient-to-br from-yellow-900/40 via-amber-900/30 to-yellow-800/40 border-2 border-yellow-500/60 shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className={`flex items-center gap-3 ${isArabic ? 'flex-row-reverse text-3xl' : 'text-2xl'}`}>
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Medal className="text-yellow-400" size={isArabic ? 32 : 28} />
                </div>
                <span className="text-white font-bold">{isArabic ? 'الميداليات' : 'Medal Collection'}</span>
              </CardTitle>
              <div className={`${isArabic ? 'text-right text-lg mt-2' : 'text-base'} text-gray-300`}>
                {isArabic ? 'جميع الميداليات التي فاز بها الرياضي في المسابقات الدولية' : 'All medals won in international competitions'}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-yellow-500/40 hover:bg-transparent">
                      <TableHead className={`text-yellow-400 font-bold ${isArabic ? 'text-right text-xl' : 'text-base'}`}>
                        {isArabic ? 'الميدالية' : 'Medal'}
                      </TableHead>
                      <TableHead className={`text-yellow-400 font-bold ${isArabic ? 'text-right text-xl' : 'text-base'}`}>
                        {isArabic ? 'الحدث' : 'Event'}
                      </TableHead>
                      <TableHead className={`text-yellow-400 font-bold ${isArabic ? 'text-right text-xl' : 'text-base'}`}>
                        {isArabic ? 'الموقع' : 'Location'}
                      </TableHead>
                      <TableHead className={`text-yellow-400 font-bold ${isArabic ? 'text-right text-xl' : 'text-base'}`}>
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
                        // Keep original
                      }

                      return (
                        <TableRow 
                          key={index} 
                          className="border-yellow-500/20 hover:bg-yellow-500/10 transition-all duration-200"
                          data-testid={`medal-row-${index}`}
                        >
                          <TableCell className={`font-semibold ${isArabic ? 'text-right text-lg' : 'text-base'}`}>
                            <div className="flex items-center gap-3">
                              <span className={isArabic ? "text-4xl" : "text-3xl"}>{getMedalIcon(medal.medal_type)}</span>
                              <span className="text-gray-100">{medal.medal_type}</span>
                            </div>
                          </TableCell>
                          <TableCell className={`text-gray-100 font-medium ${isArabic ? 'text-right text-lg' : 'text-base'}`}>
                            {medal.event}
                          </TableCell>
                          <TableCell className={`text-gray-200 ${isArabic ? 'text-right text-lg' : 'text-base'}`}>
                            {medal.country}
                          </TableCell>
                          <TableCell className={`text-gray-300 ${isArabic ? 'text-right text-lg' : 'text-base'}`}>
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
          <div className="p-8 text-center">
            <p className={`text-gray-400 ${isArabic ? 'text-xl' : 'text-lg'}`}>
              {isArabic ? 'لا توجد بيانات ميداليات متاحة' : 'No medals data available'}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* LLM Analysis Section */}
      {!showMedalsOnly && (careerOverview || peakPerformancePeriods.length > 0) && (
        <div className="space-y-6">
          {/* Career Overview */}
          {careerOverview && (
            <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-2 border-blue-500/30 shadow-xl">
              <CardHeader>
                <CardTitle className={`flex items-center gap-3 ${isArabic ? 'flex-row-reverse text-3xl text-right' : 'text-lg'} text-white`}>
                  <Award className={`text-blue-400 ${isArabic ? 'ml-0' : ''}`} size={isArabic ? 32 : 24} />
                  {isArabic ? 'نظرة عامة على المسيرة' : 'Career Overview'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-gray-200 leading-relaxed ${isArabic ? 'text-right text-xl' : 'text-base'}`}>
                  {careerOverview}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Peak Performance Periods */}
          {peakPerformancePeriods.length > 0 && (
            <Card className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border-2 border-purple-500/40 shadow-xl">
              <CardHeader>
                <CardTitle className={`flex items-center gap-3 ${isArabic ? 'flex-row-reverse text-3xl text-right' : 'text-lg'} text-white`}>
                  <Trophy className="text-purple-400" size={isArabic ? 32 : 24} />
                  {isArabic ? 'فترات الأداء القصوى' : 'Peak Performance Periods'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  {peakPerformancePeriods.map((period: any, index: number) => (
                    <div 
                      key={index} 
                      className="p-5 bg-gradient-to-r from-purple-900/40 to-purple-800/30 rounded-xl border-2 border-purple-500/40 shadow-lg hover:border-purple-400/60 transition-all duration-300"
                    >
                      <Badge className={`bg-gradient-to-r from-purple-500 to-purple-700 text-white mb-3 ${isArabic ? 'text-lg px-4 py-1.5' : 'text-sm px-3 py-1'}`}>
                        {period.period}
                      </Badge>
                      <p className={`text-gray-200 mb-4 leading-relaxed ${isArabic ? 'text-right text-xl' : 'text-base'}`}>
                        {period.description}
                      </p>
                      {period.key_results && period.key_results.length > 0 && (
                        <div className="space-y-2">
                          <p className={`font-bold ${isArabic ? 'text-right text-xl' : 'text-sm'} text-purple-300 mb-3`}>
                            {isArabic ? 'النتائج الرئيسية' : 'Key Results'}
                          </p>
                          {period.key_results.map((result: string, idx: number) => (
                            <div key={idx} className={`flex items-start gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                              <div className="p-1 bg-green-500/20 rounded-md mt-0.5">
                                <Trophy className="w-5 h-5 text-green-400 flex-shrink-0" />
                              </div>
                              <span className={`text-gray-200 ${isArabic ? 'text-right text-lg' : 'text-sm'}`}>{result}</span>
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
            <Card className="bg-gradient-to-br from-teal-900/30 to-cyan-900/30 border-2 border-teal-500/40 shadow-xl">
              <CardHeader>
                <CardTitle className={`flex items-center gap-3 ${isArabic ? 'flex-row-reverse text-3xl text-right' : 'text-lg'} text-white`}>
                  <Waves className="text-teal-400" size={isArabic ? 32 : 24} />
                  {isArabic ? 'أنماط التقدم' : 'Progression Patterns'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-gray-200 leading-relaxed ${isArabic ? 'text-right text-xl' : 'text-base'}`}>
                  {progressionPatterns}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Recent Form */}
          {recentForm && (
            <Card className="bg-gradient-to-br from-emerald-900/30 to-green-900/30 border-2 border-emerald-500/40 shadow-xl">
              <CardHeader>
                <CardTitle className={`flex items-center gap-3 ${isArabic ? 'flex-row-reverse text-3xl text-right' : 'text-lg'} text-white`}>
                  <Clock className="text-emerald-400" size={isArabic ? 32 : 24} />
                  {isArabic ? 'الشكل الحالي' : 'Recent Form'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-gray-200 leading-relaxed ${isArabic ? 'text-right text-xl' : 'text-base'}`}>
                  {recentForm}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Competition Timeline */}
      {careerPhases && careerPhases.length > 0 && careerPhases.map((phase: any, phaseIndex: number) => {
        // Translate "Recent Competitions" title
        const translatedPhaseName = isArabic && phase.phase_name.toLowerCase().includes('recent') 
          ? 'المسابقات الأخيرة' 
          : phase.phase_name;

        return (
        <Card key={phaseIndex} className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-2 border-cyan-500/30 shadow-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-cyan-900/40 to-blue-900/40 border-b border-cyan-500/30">
            <div className={`flex items-center justify-between gap-4 ${isArabic ? 'flex-row-reverse' : ''}`}>
              <CardTitle className={`flex items-center gap-3 ${isArabic ? 'flex-row-reverse text-3xl text-right' : 'text-lg'} text-white font-bold`}>
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <Calendar className="text-cyan-400" size={isArabic ? 32 : 24} />
                </div>
                {translatedPhaseName}
              </CardTitle>
              <Badge className={`bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg ${isArabic ? 'text-lg px-5 py-2' : 'text-sm px-4 py-1.5'}`}>
                {phase.period}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-5">
              {phase.key_achievements && phase.key_achievements.length > 0 && phase.key_achievements
                .slice()
                .sort((a: any, b: any) => {
                  const dateA = a.day && a.month && a.year 
                    ? new Date(`${a.year}-${a.month}-${a.day}`).getTime()
                    : (a.year ? new Date(`${a.year}-01-01`).getTime() : 0);
                  const dateB = b.day && b.month && b.year
                    ? new Date(`${b.year}-${b.month}-${b.day}`).getTime()
                    : (b.year ? new Date(`${b.year}-01-01`).getTime() : 0);
                  return dateB - dateA;
                })
                .map((achievement: any, achievementIndex: number) => {
                  // Format date with proper Arabic support
                  const achievementDate = formatArabicDate(
                    achievement.day, 
                    achievement.month, 
                    achievement.year
                  );

                  return (
                    <div 
                      key={achievementIndex} 
                      className={`relative group ${isArabic ? 'text-right' : ''}`}
                      data-testid={`competition-${achievementIndex}`}
                    >
                      {/* Timeline connector */}
                      {achievementIndex !== phase.key_achievements.length - 1 && (
                        <div className={`absolute top-full ${isArabic ? 'right-7' : 'left-7'} w-0.5 h-5 bg-gradient-to-b from-cyan-500/50 to-transparent`} />
                      )}
                      
                      <div className={`flex gap-4 ${isArabic ? 'flex-row-reverse' : ''}`}>
                        {/* Timeline dot */}
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg ring-4 ring-cyan-500/20 group-hover:ring-cyan-400/40 transition-all duration-300" />
                        </div>

                        {/* Content card */}
                        <div className="flex-1 bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-xl border-2 border-slate-600/50 p-5 hover:border-cyan-500/60 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300">
                          <div className={`flex items-start justify-between gap-4 mb-4 ${isArabic ? 'flex-row-reverse' : ''}`}>
                            <div className="flex-1 space-y-3">
                              {/* Date - Right aligned for Arabic */}
                              <div className={`flex items-center gap-2 ${isArabic ? 'flex-row-reverse justify-end' : ''}`}>
                                <Calendar className="w-4 h-4 text-yellow-400" />
                                <Badge variant="outline" className={`border-yellow-400/60 text-yellow-400 bg-yellow-400/10 ${isArabic ? 'text-lg px-4 py-1.5' : 'text-xs'}`}>
                                  {achievementDate}
                                </Badge>
                              </div>

                              {/* Competition Name */}
                              <h3 className={`font-bold text-white leading-tight ${isArabic ? 'text-2xl text-right' : 'text-base'}`}>
                                {achievement.event_name}
                              </h3>

                              {/* Event Type */}
                              {achievement.event_type && (
                                <div className={`inline-flex items-center gap-2 bg-gradient-to-r from-purple-500/20 to-purple-600/20 px-4 py-2 rounded-lg border-2 border-purple-500/50 ${isArabic ? 'text-lg' : 'text-sm'}`}>
                                  <Waves className="w-5 h-5 text-purple-400" />
                                  <span className="text-purple-300 font-semibold">{achievement.event_type}</span>
                                </div>
                              )}

                              {/* Competition Tier */}
                              <div className={`flex items-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                                <Award className="w-4 h-4 text-gray-400" />
                                <span className={`text-gray-300 ${isArabic ? 'text-lg' : 'text-sm'}`}>
                                  {achievement.event_tier}
                                </span>
                              </div>

                              {/* Additional Details - Right aligned for Arabic with Arabic numerals */}
                              {(achievement.pool_type || achievement.distance) && (
                                <div className={`flex items-center gap-4 flex-wrap ${isArabic ? 'flex-row-reverse justify-end text-lg' : 'text-xs'}`}>
                                  {achievement.pool_type && (
                                    <div className="flex items-center gap-2 bg-teal-500/10 px-3 py-1.5 rounded-lg border border-teal-500/30">
                                      <span className="text-teal-400 font-medium">
                                        {isArabic ? 'المسبح' : 'Pool'}: {isArabic ? toArabicNumerals(achievement.pool_type) : achievement.pool_type}
                                      </span>
                                    </div>
                                  )}
                                  {achievement.distance && (
                                    <div className="flex items-center gap-2 bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/30">
                                      <span className="text-cyan-400 font-medium">
                                        {isArabic ? 'المسافة' : 'Distance'}: {isArabic ? toArabicNumerals(achievement.distance) : achievement.distance}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Right side (English) / Left side (Arabic): Placement badge + Time */}
                            <div className={`flex flex-col gap-3 flex-shrink-0 ${isArabic ? 'items-start' : 'items-end'}`}>
                              {/* Medal Badge */}
                              {getResultBadge(achievement.result)}
                              
                              {/* Time Result - Below placement, left-aligned for Arabic */}
                              {achievement.time_result && achievement.time_result !== 'DNS' && (
                                <div className={`inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 px-3 py-1.5 rounded-lg border border-yellow-500/50 ${isArabic ? 'text-base flex-row-reverse' : 'text-xs'}`}>
                                  <Clock className="w-4 h-4 text-yellow-400" />
                                  <span className="text-yellow-300 font-bold">{achievement.time_result}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Notes */}
                          {achievement.notes && achievement.notes !== 'DNS' && (
                            <div className="pt-3 border-t border-slate-600/50">
                              <p className={`text-gray-300 leading-relaxed ${isArabic ? 'text-right text-lg' : 'text-base'}`}>
                                {achievement.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
        );
      })}
    </div>
  );
}

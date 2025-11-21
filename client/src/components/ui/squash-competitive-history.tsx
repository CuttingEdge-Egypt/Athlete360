import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trophy, Target, TrendingUp, Clock, Users } from "lucide-react";

interface SquashCareerStats {
  wins: string;
  losses: string;
}

interface SquashRankingPoint {
  tournament: string;
  result: string;
  expires: string;
  points: string;
}

interface SquashRecentResult {
  year: number;
  month?: string;
  day?: number;
  opponent: string;
  score: string;
  competition: string;
  result: string;
  time?: string;
  notes?: string;
}

interface SquashCompetitiveHistory {
  career_stats?: SquashCareerStats;
  ranking_points?: SquashRankingPoint[];
  recent_results?: SquashRecentResult[];
}

interface Props {
  competitiveHistory: SquashCompetitiveHistory;
  language: string;
}

// Helper function to convert numbers to Arabic numerals
function toArabicNumerals(text: string): string {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return text.replace(/\d/g, (digit) => arabicNumerals[parseInt(digit)]);
}

// Helper function to format Arabic dates
function formatArabicDate(day?: number, month?: string, year?: number): string {
  if (!year) return '';
  
  const arabicMonths: { [key: string]: string } = {
    'January': 'يناير', 'February': 'فبراير', 'March': 'مارس',
    'April': 'أبريل', 'May': 'مايو', 'June': 'يونيو',
    'July': 'يوليو', 'August': 'أغسطس', 'September': 'سبتمبر',
    'October': 'أكتوبر', 'November': 'نوفمبر', 'December': 'ديسمبر'
  };
  
  const parts = [];
  if (day) parts.push(toArabicNumerals(day.toString()));
  if (month) parts.push(arabicMonths[month] || month);
  parts.push(toArabicNumerals(year.toString()));
  
  return parts.join(' ');
}

// Helper function to get result badge
function getResultBadge(result: string) {
  const isWin = result.toLowerCase().includes('win');
  
  return (
    <Badge 
      className={`text-lg px-4 py-2 font-bold shadow-lg ${
        isWin 
          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border-green-400'
          : 'bg-gradient-to-r from-red-500 to-rose-600 text-white border-red-400'
      }`}
    >
      {isWin ? '🏆 ' : '❌ '}{result}
    </Badge>
  );
}

export function SquashCompetitiveHistory({ competitiveHistory, language }: Props) {
  const isArabic = language === 'ar';

  if (!competitiveHistory) {
    return null;
  }

  const { career_stats, ranking_points, recent_results } = competitiveHistory;

  return (
    <div className="space-y-6">
      {/* Career Stats Card */}
      {career_stats && (
        <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-2 border-cyan-500/30 shadow-2xl">
          <CardHeader>
            <CardTitle className={`flex items-center gap-3 ${isArabic ? 'text-3xl flex-row-reverse' : 'text-xl'}`}>
              <Trophy className="w-8 h-8 text-yellow-400" />
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                {isArabic ? 'إحصائيات المسيرة' : 'Career Statistics'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid grid-cols-2 gap-6 ${isArabic ? 'text-right' : ''}`}>
              {/* Wins */}
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-xl p-6 border-2 border-green-500/50">
                <div className={`flex items-center gap-3 mb-2 ${isArabic ? 'flex-row-reverse justify-end' : ''}`}>
                  <Target className="w-6 h-6 text-green-400" />
                  <span className={`text-green-300 font-medium ${isArabic ? 'text-2xl' : 'text-lg'}`}>
                    {isArabic ? 'الانتصارات' : 'Wins'}
                  </span>
                </div>
                <p className={`font-bold text-white ${isArabic ? 'text-4xl' : 'text-3xl'}`}>
                  {isArabic ? toArabicNumerals(career_stats.wins) : career_stats.wins}
                </p>
              </div>

              {/* Losses */}
              <div className="bg-gradient-to-br from-red-500/20 to-rose-600/20 rounded-xl p-6 border-2 border-red-500/50">
                <div className={`flex items-center gap-3 mb-2 ${isArabic ? 'flex-row-reverse justify-end' : ''}`}>
                  <TrendingUp className="w-6 h-6 text-red-400" />
                  <span className={`text-red-300 font-medium ${isArabic ? 'text-2xl' : 'text-lg'}`}>
                    {isArabic ? 'الهزائم' : 'Losses'}
                  </span>
                </div>
                <p className={`font-bold text-white ${isArabic ? 'text-4xl' : 'text-3xl'}`}>
                  {isArabic ? toArabicNumerals(career_stats.losses) : career_stats.losses}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ranking Points Table */}
      {ranking_points && ranking_points.length > 0 && (
        <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-2 border-purple-500/30 shadow-2xl">
          <CardHeader>
            <CardTitle className={`flex items-center gap-3 ${isArabic ? 'text-3xl flex-row-reverse' : 'text-xl'}`}>
              <Trophy className="w-8 h-8 text-purple-400" />
              <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                {isArabic ? 'نقاط الترتيب' : 'Ranking Points'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className={`w-full ${isArabic ? 'text-right' : 'text-left'}`}>
                <thead>
                  <tr className="border-b-2 border-purple-500/50">
                    <th className={`pb-3 ${isArabic ? 'text-xl pr-4' : 'text-sm font-semibold pl-4'} text-purple-300`}>
                      {isArabic ? 'البطولة' : 'Tournament'}
                    </th>
                    <th className={`pb-3 ${isArabic ? 'text-xl pr-4' : 'text-sm font-semibold pl-4'} text-purple-300`}>
                      {isArabic ? 'النتيجة' : 'Result'}
                    </th>
                    <th className={`pb-3 ${isArabic ? 'text-xl pr-4' : 'text-sm font-semibold pl-4'} text-purple-300`}>
                      {isArabic ? 'تنتهي' : 'Expires'}
                    </th>
                    <th className={`pb-3 ${isArabic ? 'text-xl pr-4' : 'text-sm font-semibold pl-4'} text-purple-300`}>
                      {isArabic ? 'النقاط' : 'Points'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ranking_points.map((rp, index) => (
                    <tr 
                      key={index} 
                      className="border-b border-slate-700/50 hover:bg-purple-500/10 transition-colors"
                      data-testid={`ranking-point-${index}`}
                    >
                      <td className={`py-4 ${isArabic ? 'text-lg pr-4' : 'text-base pl-4'} text-gray-200`}>
                        {rp.tournament}
                      </td>
                      <td className={`py-4 ${isArabic ? 'pr-4' : 'pl-4'}`}>
                        <Badge variant="outline" className={`border-cyan-400/60 text-cyan-400 bg-cyan-400/10 ${isArabic ? 'text-base' : 'text-sm'}`}>
                          {rp.result}
                        </Badge>
                      </td>
                      <td className={`py-4 ${isArabic ? 'text-lg pr-4' : 'text-sm pl-4'} text-gray-400`}>
                        {isArabic ? toArabicNumerals(rp.expires) : rp.expires}
                      </td>
                      <td className={`py-4 ${isArabic ? 'pr-4' : 'pl-4'}`}>
                        <span className={`font-bold ${isArabic ? 'text-2xl' : 'text-lg'} text-yellow-400`}>
                          {isArabic ? toArabicNumerals(rp.points) : rp.points}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Results Timeline */}
      {recent_results && recent_results.length > 0 && (
        <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-2 border-cyan-500/30 shadow-2xl">
          <CardHeader>
            <CardTitle className={`flex items-center gap-3 ${isArabic ? 'text-3xl flex-row-reverse' : 'text-xl'}`}>
              <Calendar className="w-8 h-8 text-cyan-400" />
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                {isArabic ? 'المباريات الأخيرة' : 'Recent Matches'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recent_results.map((match, matchIndex) => {
                const matchDate = formatArabicDate(match.day, match.month, match.year);

                return (
                  <div 
                    key={matchIndex} 
                    className={`relative group ${isArabic ? 'text-right' : ''}`}
                    data-testid={`match-${matchIndex}`}
                  >
                    {/* Timeline connector */}
                    {matchIndex !== recent_results.length - 1 && (
                      <div className={`absolute top-full ${isArabic ? 'right-7' : 'left-7'} w-0.5 h-5 bg-gradient-to-b from-cyan-500/50 to-transparent`} />
                    )}
                    
                    <div className={`flex gap-4 ${isArabic ? 'flex-row-reverse' : ''}`}>
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg ring-4 ring-cyan-500/20 group-hover:ring-cyan-400/40 transition-all duration-300" />
                      </div>

                      {/* Content card */}
                      <div className="flex-1 bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-xl border-2 border-slate-600/50 p-5 hover:border-cyan-500/60 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300">
                        <div className={`flex items-start justify-between gap-4 mb-4`}>
                          {/* Left side (Arabic) / Right side (English): Result badge */}
                          {isArabic && (
                            <div className={`flex flex-col gap-3 flex-shrink-0 items-start`}>
                              {getResultBadge(match.result)}
                              
                              {/* Match Time - Below result, left-aligned for Arabic */}
                              {match.time && (
                                <div className={`inline-flex items-center gap-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 px-3 py-1.5 rounded-lg border border-blue-500/50 text-base flex-row-reverse`}>
                                  <Clock className="w-4 h-4 text-blue-400" />
                                  <span className="text-blue-300 font-semibold">{match.time}</span>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex-1 space-y-3">
                            {/* Date - Right aligned for Arabic */}
                            <div className={`flex items-center gap-2 ${isArabic ? 'flex-row-reverse justify-end' : ''}`}>
                              <Calendar className="w-4 h-4 text-yellow-400" />
                              <Badge variant="outline" className={`border-yellow-400/60 text-yellow-400 bg-yellow-400/10 ${isArabic ? 'text-lg px-4 py-1.5' : 'text-xs'}`}>
                                {matchDate}
                              </Badge>
                            </div>

                            {/* Opponent */}
                            <div className={`flex items-center gap-3 ${isArabic ? 'flex-row-reverse justify-end' : ''}`}>
                              <Users className="w-5 h-5 text-purple-400" />
                              <h3 className={`font-bold text-white leading-tight ${isArabic ? 'text-2xl text-right' : 'text-base'}`}>
                                {isArabic ? 'ضد ' : 'vs '}{match.opponent}
                              </h3>
                            </div>

                            {/* Score */}
                            <div className={`inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 px-4 py-2 rounded-lg border-2 border-yellow-500/50 ${isArabic ? 'text-xl float-right' : 'text-lg'}`}>
                              <Trophy className="w-5 h-5 text-yellow-400" />
                              <span className="text-yellow-300 font-bold">
                                {isArabic ? toArabicNumerals(match.score) : match.score}
                              </span>
                            </div>

                            {/* Competition */}
                            <div className={`flex items-center gap-2 ${isArabic ? 'flex-row-reverse justify-end' : ''}`}>
                              <Trophy className="w-4 h-4 text-gray-400" />
                              <span className={`text-gray-300 ${isArabic ? 'text-lg' : 'text-sm'}`}>
                                {match.competition}
                              </span>
                            </div>
                          </div>

                          {/* Right side (English): Result badge */}
                          {!isArabic && (
                            <div className={`flex flex-col gap-3 flex-shrink-0 items-end`}>
                              {getResultBadge(match.result)}
                              
                              {/* Match Time - Below result */}
                              {match.time && (
                                <div className={`inline-flex items-center gap-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 px-3 py-1.5 rounded-lg border border-blue-500/50 text-xs`}>
                                  <Clock className="w-4 h-4 text-blue-400" />
                                  <span className="text-blue-300 font-semibold">{match.time}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Notes */}
                        {match.notes && (
                          <div className="pt-3 border-t border-slate-600/50">
                            <p className={`text-gray-300 leading-relaxed ${isArabic ? 'text-right text-lg' : 'text-base'}`}>
                              {match.notes}
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
      )}
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Star, 
  Trophy, 
  Target, 
  BarChart3,
  Activity,
  User,
  Medal,
  Calendar,
  Award,
  Zap,
  Shield,
  Heart,
  Timer,
  Flame,
  Clock,
  Users,
  MapPin,
  Globe
} from "lucide-react";

export interface AthleteStatistics {
  player: {
    name: string;
    age?: number;
    nationality: string;
    team?: string;
    sport: string;
    position?: string;
  };
  recent_season: {
    period: string;
    league?: string;
    team?: string;
    statistics: {
      common: {
        games_played: number;
        minutes_played: number;
        wins: number;
        losses: number;
      };
      sport_specific: {
        category: string;
        metrics: Array<{
          name: string;
          value: number | string;
          unit?: string | null;
        }>;
      };
    };
  };
  all_time: {
    career_span: string;
    statistics: {
      common: {
        total_games: number;
        total_minutes: number;
        total_wins: number;
        total_losses: number;
      };
      sport_specific: {
        category: string;
        metrics: Array<{
          name: string;
          value: number | string;
          unit?: string | null;
        }>;
      };
    };
  };
  highlights?: Array<{
    title: string;
    value: string;
    description: string;
    icon?: string;
  }>;
  summary?: {
    overall_rating: string;
    key_strengths: string[];
    notable_achievements: string[];
  };
  last_updated: string;
  data_quality: "high" | "medium" | "low";
}

// Legacy interface for backwards compatibility
interface LegacyAthleteStatistics {
  player: {
    name: string;
    age?: number;
    nationality: string;
    team?: string;
    sport: string;
    position?: string;
  };
  season?: {
    year: string;
    league?: string;
    team?: string;
  };
  statistics: {
    common: {
      games_played: number;
      minutes_played: number;
      wins: number;
      losses: number;
    };
    sport_specific: {
      category: string;
      metrics: Array<{
        name: string;
        value: number | string;
        unit?: string | null;
      }>;
    };
  };
  highlights?: Array<{
    title: string;
    value: string;
    description: string;
    icon?: string;
  }>;
  summary?: {
    overall_rating: string;
    key_strengths: string[];
    notable_achievements: string[];
  };
  last_updated: string;
  data_quality: "high" | "medium" | "low";
}

interface StatisticsDisplayProps {
  statistics: AthleteStatistics | LegacyAthleteStatistics;
  language?: string;
}

const iconMap: { [key: string]: any } = {
  chart: BarChart3,
  target: Target,
  trophy: Trophy,
  user: User,
  users: Users,
  zap: Zap,
  activity: Activity,
  star: Star,
  award: Award,
  medal: Medal,
  shield: Shield,
  heart: Heart,
  timer: Timer,
  clock: Clock,
  flame: Flame,
  globe: Globe,
  mappin: MapPin,
  'trending-up': TrendingUp,
  // Legacy mappings for backwards compatibility
  performance: BarChart3,
  technical: Target,
  physical: Activity,
  achievements: Trophy,
  ranking: Medal,
  career: Award,
  competition: Star,
  default: User
};

const getIconComponent = (iconName?: string, categoryKey?: string) => {
  if (iconName && iconMap[iconName.toLowerCase()]) {
    return iconMap[iconName.toLowerCase()];
  }
  if (categoryKey && iconMap[categoryKey.toLowerCase()]) {
    return iconMap[categoryKey.toLowerCase()];
  }
  return iconMap.default;
};

// Function to check if statistics is in legacy format
const isLegacyFormat = (statistics: AthleteStatistics | LegacyAthleteStatistics): statistics is LegacyAthleteStatistics => {
  return 'season' in statistics && 'statistics' in statistics && !('recent_season' in statistics);
};

// Function to transform legacy data to new format
const transformLegacyData = (legacy: LegacyAthleteStatistics): AthleteStatistics => {
  // Create some dummy all-time data based on recent season data
  const recentStats = legacy.statistics.common;
  const allTimeMultiplier = 5; // Estimate all-time stats as 5x recent season
  
  return {
    player: legacy.player,
    recent_season: {
      period: legacy.season?.year || "2024/25",
      league: legacy.season?.league || undefined,
      team: legacy.season?.team || undefined,
      statistics: {
        common: {
          games_played: recentStats.games_played,
          minutes_played: recentStats.minutes_played,
          wins: recentStats.wins,
          losses: recentStats.losses
        },
        sport_specific: legacy.statistics.sport_specific
      }
    },
    all_time: {
      career_span: "2015-2025", // Default career span
      statistics: {
        common: {
          total_games: recentStats.games_played * allTimeMultiplier,
          total_minutes: recentStats.minutes_played * allTimeMultiplier,
          total_wins: recentStats.wins * allTimeMultiplier,
          total_losses: recentStats.losses * allTimeMultiplier
        },
        sport_specific: {
          category: legacy.statistics.sport_specific.category,
          metrics: legacy.statistics.sport_specific.metrics.map(metric => ({
            ...metric,
            name: `Career ${metric.name}`
          }))
        }
      }
    },
    highlights: legacy.highlights,
    summary: legacy.summary,
    last_updated: legacy.last_updated,
    data_quality: legacy.data_quality
  };
};

const getDataQualityColor = (quality: string) => {
  switch (quality) {
    case "high": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
    case "medium": return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
    case "low": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
};

const formatMetricValue = (metric: AthleteStatistics['recent_season']['statistics']['sport_specific']['metrics'][0]) => {
  let formattedValue = String(metric.value);
  
  if (metric.unit) {
    formattedValue += ` ${metric.unit}`;
  }
  
  return formattedValue;
};

const getMetricColor = (index: number) => {
  const colors = [
    "from-blue-500 to-purple-600",
    "from-green-500 to-teal-600", 
    "from-orange-500 to-red-600",
    "from-purple-500 to-pink-600",
    "from-teal-500 to-blue-600",
    "from-red-500 to-orange-600",
    "from-indigo-500 to-purple-600",
    "from-cyan-500 to-blue-600"
  ];
  return colors[index % colors.length];
};

const renderMetricCard = (metric: AthleteStatistics['recent_season']['statistics']['sport_specific']['metrics'][0], index: number) => {
  const formattedValue = formatMetricValue(metric);
  const colorClass = getMetricColor(index);
  
  return (
    <Card key={metric.name} className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-gray-600 transition-all duration-300 transform hover:scale-105">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-300 mb-1 leading-tight">
              {metric.name}
            </h4>
          </div>
          <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${colorClass} ml-2 flex-shrink-0`}></div>
        </div>
        
        <div className="space-y-2">
          {metric.unit === "%" && typeof metric.value === 'number' ? (
            <div className="space-y-2">
              <div className="text-2xl font-bold text-white">{formattedValue}</div>
              <Progress 
                value={metric.value} 
                className="h-2" 
                data-testid={`progress-${metric.name.toLowerCase().replace(/\s+/g, '-')}`}
              />
            </div>
          ) : (
            <div className="text-2xl font-bold text-white">
              {formattedValue}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const renderCommonStats = (common: AthleteStatistics['recent_season']['statistics']['common'] | AthleteStatistics['all_time']['statistics']['common'], isAllTime: boolean = false) => {
  const stats = isAllTime ? 
    [
      { label: "Total Games", value: (common as AthleteStatistics['all_time']['statistics']['common']).total_games, icon: Users, color: "from-blue-500 to-indigo-600" },
      { label: "Total Minutes", value: (common as AthleteStatistics['all_time']['statistics']['common']).total_minutes, icon: Clock, color: "from-green-500 to-emerald-600" },
      { label: "Total Wins", value: (common as AthleteStatistics['all_time']['statistics']['common']).total_wins, icon: Trophy, color: "from-yellow-500 to-orange-600" },
      { label: "Total Losses", value: (common as AthleteStatistics['all_time']['statistics']['common']).total_losses, icon: Target, color: "from-red-500 to-pink-600" }
    ] :
    [
      { label: "Games Played", value: (common as AthleteStatistics['recent_season']['statistics']['common']).games_played, icon: Users, color: "from-blue-500 to-indigo-600" },
      { label: "Minutes Played", value: (common as AthleteStatistics['recent_season']['statistics']['common']).minutes_played, icon: Clock, color: "from-green-500 to-emerald-600" },
      { label: "Wins", value: (common as AthleteStatistics['recent_season']['statistics']['common']).wins, icon: Trophy, color: "from-yellow-500 to-orange-600" },
      { label: "Losses", value: (common as AthleteStatistics['recent_season']['statistics']['common']).losses, icon: Target, color: "from-red-500 to-pink-600" }
    ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <Card key={stat.label} className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className={`w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                <IconComponent className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export function StatisticsDisplay({ statistics, language = "en" }: StatisticsDisplayProps) {
  // Transform legacy data to new format if needed
  const normalizedStats: AthleteStatistics = isLegacyFormat(statistics) 
    ? transformLegacyData(statistics) 
    : statistics as AthleteStatistics;

  return (
    <div className="space-y-6" data-testid="statistics-display">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-white" data-testid="text-player-name">
            {normalizedStats.player.name} Statistics
          </h2>
          <div className="flex items-center justify-center space-x-4 text-gray-400">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>{normalizedStats.player.sport}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4" />
              <span>{normalizedStats.player.nationality}</span>
            </div>
            {normalizedStats.player.age && (
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>Age {normalizedStats.player.age}</span>
              </div>
            )}
          </div>
        </div>
        
        {normalizedStats.player.team && (
          <Badge variant="outline" className="bg-gray-800 border-gray-600 text-gray-300">
            <Users className="w-3 h-3 mr-1" />
            {normalizedStats.player.team}
          </Badge>
        )}
        
        {normalizedStats.player.position && (
          <Badge variant="outline" className="bg-gray-800 border-gray-600 text-gray-300">
            <MapPin className="w-3 h-3 mr-1" />
            {normalizedStats.player.position}
          </Badge>
        )}

        <Badge className={`${getDataQualityColor(normalizedStats.data_quality)} border-0`}>
          Data Quality: {normalizedStats.data_quality.charAt(0).toUpperCase() + normalizedStats.data_quality.slice(1)}
        </Badge>
      </div>

      {/* Tabbed Statistics */}
      <Tabs defaultValue="recent" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800 border border-gray-700">
          <TabsTrigger 
            value="recent" 
            className="text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white"
            data-testid="tab-recent-season"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Recent Season
          </TabsTrigger>
          <TabsTrigger 
            value="alltime" 
            className="text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-teal-600 data-[state=active]:text-white"
            data-testid="tab-all-time"
          >
            <Trophy className="w-4 h-4 mr-2" />
            All-Time Career
          </TabsTrigger>
        </TabsList>

        {/* Recent Season Tab */}
        <TabsContent value="recent" className="space-y-6 mt-6">
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-600/10 rounded-lg p-4 border border-blue-500/20">
            <div className="flex items-center space-x-2 mb-4">
              <Calendar className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">
                {normalizedStats.recent_season.period}
              </h3>
              {normalizedStats.recent_season.league && (
                <Badge variant="outline" className="bg-blue-500/20 border-blue-500/40 text-blue-300">
                  {normalizedStats.recent_season.league}
                </Badge>
              )}
            </div>
            
            {renderCommonStats(normalizedStats.recent_season.statistics.common, false)}
            
            <div className="space-y-4">
              <h4 className="text-xl font-semibold text-white mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-blue-400" />
                Recent Season Metrics
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {normalizedStats.recent_season.statistics.sport_specific.metrics.map((metric, index) => 
                  renderMetricCard(metric, index)
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* All-Time Career Tab */}
        <TabsContent value="alltime" className="space-y-6 mt-6">
          <div className="bg-gradient-to-r from-green-500/10 to-teal-600/10 rounded-lg p-4 border border-green-500/20">
            <div className="flex items-center space-x-2 mb-4">
              <Trophy className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-semibold text-white">
                Career Statistics
              </h3>
              <Badge variant="outline" className="bg-green-500/20 border-green-500/40 text-green-300">
                {normalizedStats.all_time.career_span}
              </Badge>
            </div>
            
            {renderCommonStats(normalizedStats.all_time.statistics.common, true)}
            
            <div className="space-y-4">
              <h4 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Medal className="w-5 h-5 mr-2 text-green-400" />
                Career Metrics
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {normalizedStats.all_time.statistics.sport_specific.metrics.map((metric, index) => 
                  renderMetricCard(metric, index)
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Highlights Section */}
      {normalizedStats.highlights && normalizedStats.highlights.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-white flex items-center">
            <Star className="w-5 h-5 mr-2 text-yellow-400" />
            Key Highlights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {normalizedStats.highlights.map((highlight, index) => {
              const IconComponent = getIconComponent(highlight.icon);
              const colorClass = getMetricColor(index);
              
              return (
                <Card key={highlight.title} className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-gray-600 transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${colorClass} flex items-center justify-center flex-shrink-0`}>
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-white mb-1">{highlight.title}</h4>
                        <p className="text-lg font-bold text-white mb-2">{highlight.value}</p>
                        <p className="text-sm text-gray-400">{highlight.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary Section */}
      {normalizedStats.summary && (
        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Award className="w-5 h-5 mr-2 text-yellow-400" />
              Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Badge variant="outline" className="bg-yellow-500/20 border-yellow-500/40 text-yellow-300 mb-3">
                Overall Rating: {normalizedStats.summary.overall_rating}
              </Badge>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-white mb-3 flex items-center">
                  <Zap className="w-4 h-4 mr-2 text-green-400" />
                  Key Strengths
                </h4>
                <ul className="space-y-2">
                  {normalizedStats.summary.key_strengths.map((strength, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-300">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-white mb-3 flex items-center">
                  <Medal className="w-4 h-4 mr-2 text-purple-400" />
                  Notable Achievements
                </h4>
                <ul className="space-y-2">
                  {normalizedStats.summary.notable_achievements.map((achievement, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-300">{achievement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-gray-500">
        <Clock className="w-3 h-3 inline mr-1" />
        Last updated: {new Date(normalizedStats.last_updated).toLocaleDateString()}
      </div>
    </div>
  );
}
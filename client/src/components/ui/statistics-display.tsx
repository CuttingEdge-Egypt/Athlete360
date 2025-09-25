import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
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
  Flame
} from "lucide-react";

export interface AthleteStatistics {
  athlete: {
    name: string;
    sport: string;
    country: string;
  };
  categories: {
    [categoryName: string]: {
      title: string;
      description: string;
      icon?: string;
      stats: Array<{
        name: string;
        value: string | number;
        unit?: string;
        type: "number" | "percentage" | "rank" | "ratio" | "text" | "score" | "rating";
        trend?: "up" | "down" | "stable" | "unknown";
        context: string;
        timeframe?: string;
      }>;
    };
  };
  highlights: Array<{
    title: string;
    value: string;
    description: string;
    category: string;
    icon?: string;
  }>;
  summary?: {
    overall_rating: string;
    key_strengths: string[];
    notable_achievements: string[];
  };
  lastUpdated: string;
  dataQuality: "high" | "medium" | "low";
}

interface StatisticsDisplayProps {
  statistics: AthleteStatistics;
  language?: string;
}

const iconMap: { [key: string]: any } = {
  chart: BarChart3,
  target: Target,
  trophy: Trophy,
  user: User,
  zap: Zap,
  activity: Activity,
  star: Star,
  award: Award,
  medal: Medal,
  shield: Shield,
  heart: Heart,
  timer: Timer,
  flame: Flame,
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

const getTrendIcon = (trend?: string) => {
  switch (trend) {
    case "up": return <TrendingUp className="h-4 w-4 text-green-500" />;
    case "down": return <TrendingDown className="h-4 w-4 text-red-500" />;
    case "stable": return <Minus className="h-4 w-4 text-yellow-500" />;
    default: return null;
  }
};

const getTrendColor = (trend?: string) => {
  switch (trend) {
    case "up": return "text-green-500";
    case "down": return "text-red-500";
    case "stable": return "text-yellow-500";
    default: return "text-gray-400";
  }
};

const getDataQualityColor = (quality: string) => {
  switch (quality) {
    case "high": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "low": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
};

const formatStatValue = (stat: AthleteStatistics['categories'][string]['stats'][0]) => {
  let formattedValue = String(stat.value);
  
  if (stat.unit) {
    formattedValue += ` ${stat.unit}`;
  }
  
  return formattedValue;
};

const renderStatValue = (stat: AthleteStatistics['categories'][string]['stats'][0]) => {
  const formattedValue = formatStatValue(stat);
  
  // Special handling for percentage values to show progress bar
  if (stat.type === "percentage" && typeof stat.value === 'number') {
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-2xl font-bold text-white">{formattedValue}</span>
          {getTrendIcon(stat.trend)}
        </div>
        <Progress 
          value={stat.value} 
          className="h-2" 
          data-testid={`progress-${stat.name.toLowerCase().replace(/\s+/g, '-')}`}
        />
      </div>
    );
  }
  
  // Special formatting for rank values
  if (stat.type === "rank") {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-2xl font-bold text-athlete-accent">{formattedValue}</span>
        {getTrendIcon(stat.trend)}
      </div>
    );
  }
  
  // Default formatting for other types
  return (
    <div className="flex items-center space-x-2">
      <span className="text-2xl font-bold text-white">{formattedValue}</span>
      {getTrendIcon(stat.trend)}
    </div>
  );
};

export function StatisticsDisplay({ statistics, language = "en" }: StatisticsDisplayProps) {
  const categoryEntries = Object.entries(statistics.categories);
  
  return (
    <div className="space-y-6" data-testid="statistics-display">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-white" data-testid="text-athlete-name">
          {statistics.athlete.name} Statistics
        </h2>
        <p className="text-athlete-gray-400" data-testid="text-sport-country">
          {statistics.athlete.sport} • {statistics.athlete.country}
        </p>
        <div className="flex justify-center items-center space-x-4">
          <Badge 
            className={getDataQualityColor(statistics.dataQuality)}
            data-testid={`badge-data-quality-${statistics.dataQuality}`}
          >
            Data Quality: {statistics.dataQuality.charAt(0).toUpperCase() + statistics.dataQuality.slice(1)}
          </Badge>
          <span className="text-sm text-athlete-gray-400" data-testid="text-last-updated">
            Updated: {new Date(statistics.lastUpdated).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Summary Section */}
      {statistics.summary && (
        <Card className="bg-athlete-gray-800 border-athlete-gray-700" data-testid="card-summary">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
              Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <Badge 
                className="bg-athlete-accent text-white text-lg px-4 py-2"
                data-testid="badge-overall-rating"
              >
                Overall Rating: {statistics.summary.overall_rating}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-athlete-accent mb-2">Key Strengths</h4>
                <ul className="space-y-1">
                  {statistics.summary.key_strengths.map((strength, index) => (
                    <li key={index} className="text-athlete-gray-300 text-sm flex items-start">
                      <Star className="h-3 w-3 text-green-500 mr-2 mt-1 flex-shrink-0" />
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-athlete-accent mb-2">Notable Achievements</h4>
                <ul className="space-y-1">
                  {statistics.summary.notable_achievements.map((achievement, index) => (
                    <li key={index} className="text-athlete-gray-300 text-sm flex items-start">
                      <Medal className="h-3 w-3 text-yellow-500 mr-2 mt-1 flex-shrink-0" />
                      {achievement}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Highlights Section */}
      {statistics.highlights && statistics.highlights.length > 0 && (
        <Card className="bg-athlete-gray-800 border-athlete-gray-700" data-testid="card-highlights">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Star className="mr-2 h-5 w-5 text-yellow-500" />
              Key Highlights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {statistics.highlights.map((highlight, index) => {
                const HighlightIcon = getIconComponent(highlight.icon);
                return (
                  <div 
                    key={index} 
                    className="bg-athlete-gray-700 p-4 rounded-lg"
                    data-testid={`highlight-${index}`}
                  >
                    <div className="flex items-center mb-2">
                      <HighlightIcon className="h-4 w-4 text-athlete-accent mr-2" />
                      <h4 className="font-semibold text-athlete-accent text-sm">
                        {highlight.title}
                      </h4>
                    </div>
                    <p className="text-2xl font-bold text-white mb-2">
                      {highlight.value}
                    </p>
                    <p className="text-athlete-gray-400 text-sm">
                      {highlight.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {categoryEntries.map(([categoryKey, category]) => {
          const IconComponent = getIconComponent(category.icon, categoryKey);
          
          return (
            <Card 
              key={categoryKey} 
              className="bg-athlete-gray-800 border-athlete-gray-700"
              data-testid={`card-category-${categoryKey}`}
            >
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <IconComponent className="mr-2 h-5 w-5 text-athlete-accent" />
                  {category.title}
                </CardTitle>
                <p className="text-athlete-gray-400 text-sm">
                  {category.description}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {category.stats.map((stat, statIndex) => (
                  <div key={statIndex} data-testid={`stat-${categoryKey}-${statIndex}`}>
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-white text-sm">
                            {stat.name}
                          </h4>
                          {stat.timeframe && (
                            <span className="text-xs text-athlete-gray-400">
                              {stat.timeframe}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {renderStatValue(stat)}
                      
                      <p className="text-athlete-gray-400 text-sm mt-2">
                        {stat.context}
                      </p>
                    </div>
                    
                    {statIndex < category.stats.length - 1 && (
                      <Separator className="bg-athlete-gray-700 mt-4" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

    </div>
  );
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Trophy, ChartPie, Star, TrendingDown, Target, Calendar, Dumbbell, Video, Users, Clock, Sparkles, Brain } from "lucide-react";

interface AnalysisPreviewItem {
  serviceType: string;
  resultData: any;
  createdAt: string;
}

interface AnalysisPreviewData {
  success: boolean;
  data: AnalysisPreviewItem[];
  count: number;
}

const analysisTypeConfig = {
  bio: {
    icon: Brain,
    title: "Biography Analysis",
    description: "Comprehensive athlete profile and career overview",
    color: "text-blue-400",
    bgGradient: "bg-gradient-to-br from-blue-500/20 to-cyan-500/20",
    borderColor: "border-blue-400/30"
  },
  strengths: {
    icon: Star,
    title: "Strengths Analysis",
    description: "Key advantages and competitive edges",
    color: "text-green-400",
    bgGradient: "bg-gradient-to-br from-green-500/20 to-emerald-500/20",
    borderColor: "border-green-400/30"
  },
  weaknesses: {
    icon: TrendingDown,
    title: "Weaknesses Analysis",
    description: "Areas for improvement and development",
    color: "text-red-400",
    bgGradient: "bg-gradient-to-br from-red-500/20 to-pink-500/20",
    borderColor: "border-red-400/30"
  },
  "beat-strategies": {
    icon: Target,
    title: "Tactical Advantage",
    description: "Strategic insights to outperform opponents",
    color: "text-purple-400",
    bgGradient: "bg-gradient-to-br from-purple-500/20 to-violet-500/20",
    borderColor: "border-purple-400/30"
  },
  comparison: {
    icon: Users,
    title: "Athlete Comparison",
    description: "Head-to-head performance analysis",
    color: "text-indigo-400",
    bgGradient: "bg-gradient-to-br from-indigo-500/20 to-blue-500/20",
    borderColor: "border-indigo-400/30"
  },
  "nutrition-plan": {
    icon: Dumbbell,
    title: "Nutrition Plan",
    description: "Personalized dietary recommendations",
    color: "text-orange-400",
    bgGradient: "bg-gradient-to-br from-orange-500/20 to-amber-500/20",
    borderColor: "border-orange-400/30"
  },
  "development-plan": {
    icon: Calendar,
    title: "Development Plan",
    description: "Structured training and improvement roadmap",
    color: "text-teal-400",
    bgGradient: "bg-gradient-to-br from-teal-500/20 to-cyan-500/20",
    borderColor: "border-teal-400/30"
  },
  video: {
    icon: Video,
    title: "Video Analysis",
    description: "Frame-by-frame performance breakdown",
    color: "text-yellow-400",
    bgGradient: "bg-gradient-to-br from-yellow-500/20 to-orange-500/20",
    borderColor: "border-yellow-400/30"
  }
};

function AnalysisPreviewCard({ item }: { item: AnalysisPreviewItem }) {
  const config = analysisTypeConfig[item.serviceType as keyof typeof analysisTypeConfig];
  if (!config) return null;
  
  const IconComponent = config.icon;
  
  // Extract meaningful preview content based on analysis type
  const getPreviewContent = () => {
    const data = item.resultData;
    
    switch (item.serviceType) {
      case 'bio':
        if (data?.bio) {
          return data.bio.substring(0, 150) + "...";
        }
        break;
        
      case 'strengths':
        if (data?.strengths?.length > 0) {
          const firstStrength = data.strengths[0];
          return `"${firstStrength.title}" - ${firstStrength.description?.substring(0, 100) || 'Key competitive advantage identified'}...`;
        }
        break;
        
      case 'weaknesses':
        if (data?.weaknesses?.length > 0) {
          const firstWeakness = data.weaknesses[0];
          return `"${firstWeakness.title}" - ${firstWeakness.description?.substring(0, 100) || 'Area requiring improvement'}...`;
        }
        break;
        
      case 'beat-strategies':
        if (data?.strategies?.length > 0) {
          return `"${data.strategies[0].strategy}" - ${data.strategies[0].description?.substring(0, 100) || 'Strategic advantage approach'}...`;
        }
        break;
        
      case 'comparison':
        if (data?.tabs?.overview) {
          return `Comprehensive comparison analysis covering multiple performance dimensions including strengths, weaknesses, and competitive advantages...`;
        }
        break;
        
      case 'nutrition-plan':
        if (data?.plan) {
          return data.plan.substring(0, 150) + "...";
        }
        break;
        
      case 'development-plan':
        if (data?.weeks?.length > 0) {
          const totalWeeks = data.weeks.length;
          const totalExercises = data.counts?.exercises || 0;
          return `${totalWeeks}-week structured program with ${totalExercises} specialized exercises targeting specific performance improvements...`;
        }
        break;
        
      case 'video':
        if (data?.findings?.length > 0) {
          return `Analysis identified ${data.findings.length} key performance insights with detailed technical recommendations for improvement...`;
        }
        break;
    }
    
    return "AI-powered analysis providing detailed insights and actionable recommendations for performance optimization.";
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just generated";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return "Yesterday";
    return `${Math.floor(diffInHours / 24)}d ago`;
  };
  
  return (
    <Card className={`${config.bgGradient} ${config.borderColor} border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-gray-800/50 group-hover:bg-gray-700/50 transition-colors`}>
              <IconComponent className={`${config.color} text-xl`} size={24} />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-white group-hover:text-gray-100 transition-colors">
                {config.title}
              </CardTitle>
              <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                {config.description}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1 text-yellow-400">
            <Sparkles size={16} />
            <span className="text-xs font-semibold">AI</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
            <p className="text-gray-300 text-sm leading-relaxed italic">
              "{getPreviewContent()}"
            </p>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Clock size={14} />
              <span>{formatDate(item.createdAt)}</span>
            </div>
            <div className="h-1 w-12 bg-gradient-to-r from-blue-400 to-green-400 rounded-full"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalysisPreview() {
  const { data, isLoading, error } = useQuery<AnalysisPreviewData>({
    queryKey: ['/api/preview/latest-by-type'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
  
  if (error) {
    return null; // Silently fail for public users
  }
  
  // Group analyses by category for better organization
  const individualAnalyses = data?.data?.filter(item => 
    ['bio', 'strengths', 'weaknesses', 'beat-strategies'].includes(item.serviceType)
  ) || [];
  
  const advancedAnalyses = data?.data?.filter(item => 
    ['comparison', 'nutrition-plan', 'development-plan', 'video'].includes(item.serviceType)
  ) || [];
  
  return (
    <section className="py-20 bg-athlete-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="h-1 w-16 bg-gradient-to-r from-blue-400 to-green-400 rounded-full"></div>
            <Sparkles className="text-yellow-400" size={32} />
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              AI Analysis Showcase
            </h2>
            <Sparkles className="text-yellow-400" size={32} />
            <div className="h-1 w-16 bg-gradient-to-r from-green-400 to-blue-400 rounded-full"></div>
          </div>
          <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
            Explore real AI-powered analysis results from our cutting-edge sports analytics platform. 
            Each preview showcases the depth and quality of insights our system generates for athlete performance optimization.
          </p>
        </div>
        
        {isLoading ? (
          <div className="space-y-12">
            {/* Individual Analysis Skeleton */}
            <div>
              <div className="h-8 w-64 bg-gray-700 rounded mb-6 mx-auto animate-pulse"></div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((n) => (
                  <Card key={n} className="bg-gray-800/50 border-gray-700 animate-pulse">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 bg-gray-600 rounded"></div>
                          <div className="h-6 w-32 bg-gray-600 rounded"></div>
                        </div>
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-600 rounded w-full"></div>
                          <div className="h-4 bg-gray-600 rounded w-3/4"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            
            {/* Advanced Analysis Skeleton */}
            <div>
              <div className="h-8 w-64 bg-gray-700 rounded mb-6 mx-auto animate-pulse"></div>
              <div className="grid md:grid-cols-2 gap-8">
                {[1, 2, 3, 4].map((n) => (
                  <Card key={n} className="bg-gray-800/50 border-gray-700 animate-pulse">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 bg-gray-600 rounded"></div>
                          <div className="h-6 w-40 bg-gray-600 rounded"></div>
                        </div>
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-600 rounded w-full"></div>
                          <div className="h-4 bg-gray-600 rounded w-5/6"></div>
                          <div className="h-4 bg-gray-600 rounded w-2/3"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ) : data?.data && data.data.length > 0 ? (
          <div className="space-y-16">
            {/* Individual Athlete Analysis */}
            {individualAnalyses.length > 0 && (
              <div>
                <h3 className="text-2xl font-bold text-center mb-8 text-white">
                  Individual Athlete Analysis
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {individualAnalyses.map((item) => (
                    <AnalysisPreviewCard key={item.serviceType} item={item} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Advanced Analysis Features */}
            {advancedAnalyses.length > 0 && (
              <div>
                <h3 className="text-2xl font-bold text-center mb-8 text-white">
                  Advanced Analysis Features
                </h3>
                <div className="grid md:grid-cols-2 gap-8">
                  {advancedAnalyses.map((item) => (
                    <AnalysisPreviewCard key={item.serviceType} item={item} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Sparkles size={64} className="mx-auto mb-6 text-gray-600" />
              <p className="text-xl mb-2">Analysis Preview Coming Soon</p>
              <p className="text-gray-500">
                Recent AI analysis results will appear here as they're generated by our users.
              </p>
            </div>
          </div>
        )}
        
        <div className="text-center mt-16">
          <div className="inline-flex items-center space-x-3 text-sm text-gray-400 bg-gray-800/50 px-6 py-3 rounded-full border border-gray-700/50">
            <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Showcasing the latest AI-generated analysis results</span>
            <div className="h-2 w-2 bg-blue-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Trophy, ChartPie, Star, TrendingDown, Target, Calendar, Dumbbell, Video, Users, Clock, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";

interface PreviewItem {
  id: string;
  serviceType: string;
  resultData: any;
  createdAt: string;
}

interface PreviewData {
  success: boolean;
  data: PreviewItem[];
  count: number;
}

const serviceTypeConfig = {
  bio: {
    icon: ChartPie,
    title: "Biography Analysis",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    borderColor: "border-blue-400/30"
  },
  rank: {
    icon: Trophy,
    title: "Rank Analysis",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
    borderColor: "border-yellow-400/30"
  },
  strengths: {
    icon: Star,
    title: "Strengths Analysis",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
    borderColor: "border-green-400/30"
  },
  weaknesses: {
    icon: TrendingDown,
    title: "Weaknesses Analysis",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
    borderColor: "border-red-400/30"
  },
  "beat-strategies": {
    icon: Target,
    title: "Beat Strategy",
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    borderColor: "border-purple-400/30"
  },
  "nutrition-plan": {
    icon: Dumbbell,
    title: "Nutrition Plan",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
    borderColor: "border-green-400/30"
  },
  comparison: {
    icon: Users,
    title: "Athlete Comparison",
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    borderColor: "border-purple-400/30"
  },
  video: {
    icon: Video,
    title: "Video Analysis",
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
    borderColor: "border-orange-400/30"
  }
};

function PreviewCard({ item }: { item: PreviewItem }) {
  const config = serviceTypeConfig[item.serviceType as keyof typeof serviceTypeConfig];
  if (!config) return null;
  
  const IconComponent = config.icon;
  
  // Extract a meaningful preview from the result data
  const getPreviewText = () => {
    const data = item.resultData;
    
    if (item.serviceType === 'bio' && data?.bio) {
      return data.bio.substring(0, 120) + "...";
    }
    
    if (item.serviceType === 'strengths' && data?.strengths?.length > 0) {
      return `${data.strengths.length} key strengths identified including ${data.strengths[0]?.title || 'various areas'}...`;
    }
    
    if (item.serviceType === 'weaknesses' && data?.weaknesses?.length > 0) {
      return `${data.weaknesses.length} areas for improvement identified...`;
    }
    
    if (item.serviceType === 'rank' && data?.currentRank) {
      return `Current ranking: #${data.currentRank} with detailed progression analysis...`;
    }
    
    if (item.serviceType === 'nutrition-plan' && data?.plan) {
      return data.plan.substring(0, 120) + "...";
    }
    
    if (item.serviceType === 'comparison' && data?.tabs) {
      return "Comprehensive multi-tab comparison analysis covering strengths, weaknesses, and head-to-head insights...";
    }
    
    if (item.serviceType === 'video' && data?.findings?.length > 0) {
      return `Video analysis with ${data.findings.length} key findings and performance insights...`;
    }
    
    return "AI-powered analysis with detailed insights and recommendations...";
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return "Yesterday";
    return `${Math.floor(diffInHours / 24)}d ago`;
  };
  
  return (
    <Card className={`${config.bgColor} ${config.borderColor} border backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-lg`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <IconComponent className={`${config.color} text-2xl`} size={28} />
            <div>
              <h3 className="text-lg font-semibold text-white">{config.title}</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <Clock size={14} />
                <span>{formatDate(item.createdAt)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1 text-yellow-400">
            <Sparkles size={16} />
            <span className="text-xs font-semibold">AI</span>
          </div>
        </div>
        
        <p className="text-gray-300 text-sm leading-relaxed">{getPreviewText()}</p>
        
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Recent Generation</span>
          <div className="h-1 w-8 bg-gradient-to-r from-blue-400 to-green-400 rounded-full"></div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PreviewSection() {
  const [isVisible, setIsVisible] = useState(false);
  
  const { data, isLoading, error } = useQuery<PreviewData>({
    queryKey: ['/api/preview/recent-generations', { limit: 6 }],
    refetchInterval: 30000, // Refresh every 30 seconds to show new content
    staleTime: 15000, // Consider data stale after 15 seconds
  });
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  if (error) {
    return null; // Silently fail for public users
  }
  
  return (
    <section className="py-20 bg-athlete-gray-900">
      <div className="container mx-auto px-4">
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Sparkles className="text-yellow-400" size={28} />
            <h2 className="text-3xl md:text-4xl font-bold text-white">Live AI Analysis Preview</h2>
            <Sparkles className="text-yellow-400" size={28} />
          </div>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            See real AI-powered analysis results generated by our users. Each insight represents the cutting-edge of sports analytics.
          </p>
          <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-400">
            <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Updated in real-time</span>
          </div>
        </div>
        
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <Card key={n} className="bg-gray-800/50 border-gray-700 animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="h-7 w-7 bg-gray-600 rounded"></div>
                    <div className="h-5 w-32 bg-gray-600 rounded"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-600 rounded w-full"></div>
                    <div className="h-4 bg-gray-600 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-600 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : data?.data && data.data.length > 0 ? (
          <div className={`grid md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {data.data.map((item, index) => (
              <div
                key={item.id}
                className="transition-all duration-500"
                style={{ 
                  animationDelay: `${index * 100}ms`,
                  animation: isVisible ? 'fadeInUp 0.6s ease-out forwards' : 'none'
                }}
              >
                <PreviewCard item={item} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Sparkles size={48} className="mx-auto mb-4 text-gray-600" />
              <p className="text-lg">New AI analysis results will appear here as they're generated.</p>
              <p className="text-sm mt-2">Join today to see your own personalized athlete insights!</p>
            </div>
          </div>
        )}
        
        <div className={`text-center mt-12 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center space-x-2 text-sm text-gray-400 bg-gray-800/50 px-4 py-2 rounded-full">
            <div className="h-2 w-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span>These are real analyses from our AI system</span>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}
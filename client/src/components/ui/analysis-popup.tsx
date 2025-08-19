import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RankChart } from "./rank-chart";
import { NutritionPlanDisplay } from "./nutrition-plan-display";
import { StrategicCombatDisplay } from "./strategic-combat-display";
import {
  Download,
  Share2,
  User,
  Trophy,
  Star,
  AlertTriangle,
  Calendar,
  Apple,
  Swords,
  Video,
  Clock,
  Target,
  TrendingUp,
  Award,
  Heart,
  Zap,
  Shield,
  Brain,
  Flame,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Remove unused import
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AnalysisPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: string;
  data: any;
  athleteName?: string;
  athleteId?: string;
  athlete?: any;
  createdAt?: string;
  shared?: boolean;
  shareUrl?: string;
  onRefresh?: () => void;
}

export function AnalysisPopup({
  open,
  onOpenChange,
  type,
  data,
  athleteName,
  athleteId,
  athlete,
  createdAt,
  shared,
  shareUrl,
  onRefresh,
}: AnalysisPopupProps) {

  // Utility function to parse analysis data consistently
  const parseAnalysisData = (rawData: any) => {
    if (!rawData) return rawData;
    
    // If it's already an object, return as is
    if (typeof rawData === 'object' && rawData !== null) {
      return rawData;
    }
    
    // If it's a string, try to parse it as JSON
    if (typeof rawData === 'string') {
      try {
        return JSON.parse(rawData);
      } catch (e) {
        // If JSON parsing fails, return the raw string
        return rawData;
      }
    }
    
    return rawData;
  };

  // Helper function to parse bio sections from the text
  const parseBioSections = (bioText: string) => {
    if (!bioText) return {};
    
    const sections: any = {};
    
    // Look for introduction (current status)
    const introMatch = bioText.match(/^(.*?)\n\n/);
    if (introMatch) {
      sections.introduction = introMatch[1].trim();
    }
    
    // Look for overall story section
    const storyMatch = bioText.match(/Players' overall story and what they're known for[\s\S]*?\n\n([\s\S]*?)(?:\n\n|$)/);
    if (storyMatch) {
      sections.overallStory = storyMatch[1].trim();
    } else {
      // Fallback - use the middle portion of bio
      const parts = bioText.split('\n\n');
      if (parts.length > 1) {
        sections.overallStory = parts.slice(1, -1).join('\n\n');
      }
    }
    
    // Look for career record section
    const careerMatch = bioText.match(/career record|rankings|record/i);
    if (careerMatch) {
      const careerText = bioText.substring(careerMatch.index || 0);
      const endMatch = careerText.match(/\n\n/);
      sections.careerRecord = endMatch ? careerText.substring(0, endMatch.index) : careerText;
    }
    
    return sections;
  };

  const renderStrengthsAnalysis = (data: any) => {
    console.log('Frontend Strengths Data RECEIVED:', JSON.stringify(data, null, 2));
    
    // Parse the data first using the utility function
    const parsedData = parseAnalysisData(data);
    
    // Check for error state first
    if (parsedData.error || parsedData.message?.includes('Unable to generate')) {
      return (
        <div className="p-6 text-center">
          <div className="text-red-400 mb-4">⚠ Analysis Unavailable</div>
          <p className="text-gray-300 mb-4">
            {parsedData.message || 'Unable to generate authentic strengths analysis at this time.'}
          </p>
          <p className="text-sm text-gray-400">
            Please try again later or contact support if the issue persists.
          </p>
        </div>
      );
    }

    // Enhanced error handling for strengths data
    let strengths: any[] = [];
    try {
      strengths = Array.isArray(parsedData.strengths) ? parsedData.strengths : [];
    } catch (error) {
      console.error('Error processing strengths data:', error);
      strengths = [];
    }

    return (
      <div className="space-y-6">
        {strengths.length > 0 ? strengths.map((strength: any, index: number) => {
          // Only render if we have authentic strength data
          if (!strength.title && !strength.description) {
            return null;
          }
          
          return (
            <Card key={index} className="bg-athlete-gray-700 border-gray-600 hover:border-athlete-success/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-bold text-athlete-success text-lg mb-2">
                    <Star className="inline-block w-5 h-5 mr-2" />
                    {strength.title}
                  </h3>
                  {strength.rating && (
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="bg-athlete-success/20 text-athlete-success border-athlete-success/30">
                        {strength.rating}/100
                      </Badge>
                      {strength.impact && (
                        <Badge 
                          variant={strength.impact === 'high' ? 'default' : 'secondary'} 
                          className={strength.impact === 'high' 
                            ? 'bg-red-600 text-white' 
                            : strength.impact === 'medium' 
                            ? 'bg-yellow-600 text-white' 
                            : 'bg-gray-600 text-white'
                          }
                        >
                          {strength.impact} impact
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                
                <p className="text-gray-300 leading-relaxed mb-4">
                  {strength.description}
                </p>
                
                {strength.evidence && (
                  <div className="bg-athlete-gray-800 rounded-lg p-4 border-l-4 border-athlete-success">
                    <h4 className="font-semibold text-white mb-2 flex items-center">
                      <Award className="w-4 h-4 mr-2" />
                      Evidence
                    </h4>
                    <p className="text-sm text-gray-300 italic">
                      {strength.evidence}
                    </p>
                  </div>
                )}
                
                {/* Progress bar for rating visualization */}
                {strength.rating && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-400 mb-1">
                      <span>Strength Level</span>
                      <span>{strength.rating}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div 
                        className="h-3 rounded-full transition-all duration-700 ease-out"
                        style={{ 
                          width: `${Math.min(strength.rating || 0, 100)}%`,
                          background: `linear-gradient(90deg, #10b981 0%, #34d399 50%, #6ee7b7 100%)`
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        }).filter(Boolean) : (
          <div className="text-gray-400 text-center py-8">
            <Star className="w-12 h-12 mx-auto mb-4 text-gray-500" />
            <p>No strengths analysis data available</p>
            <p className="text-sm mt-2">Generate a new analysis to see detailed insights.</p>
          </div>
        )}
      </div>
    );
  };

  const renderWeaknessesAnalysis = (data: any) => {
    const parsedData = parseAnalysisData(data);
    
    if (parsedData.error || parsedData.message?.includes('Unable to generate')) {
      return (
        <div className="p-6 text-center">
          <div className="text-red-400 mb-4">⚠ Analysis Unavailable</div>
          <p className="text-gray-300 mb-4">
            {parsedData.message || 'Unable to generate authentic weaknesses analysis at this time.'}
          </p>
          <p className="text-sm text-gray-400">
            Please try again later or contact support if the issue persists.
          </p>
        </div>
      );
    }

    let weaknesses: any[] = [];
    try {
      weaknesses = Array.isArray(parsedData.weaknesses) ? parsedData.weaknesses : [];
    } catch (error) {
      console.error('Error processing weaknesses data:', error);
      weaknesses = [];
    }

    return (
      <div className="space-y-4">
        {weaknesses.length > 0 ? weaknesses.map((weakness: any, index: number) => (
          <Card key={index} className="bg-athlete-gray-700 border-gray-600">
            <CardContent className="p-4">
              <h5 className="font-semibold text-athlete-danger mb-2">{weakness.title}</h5>
              <p className="text-sm text-gray-300">{weakness.description}</p>
            </CardContent>
          </Card>
        )) : (
          <div className="text-gray-400 text-center py-8">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-500" />
            <p>No weaknesses analysis data available</p>
          </div>
        )}
      </div>
    );
  };

  const renderDevelopmentPlan = (data: any) => {
    const parsedData = parseAnalysisData(data);
    
    if (parsedData.error || parsedData.message?.includes('Unable to generate')) {
      return (
        <div className="p-6 text-center">
          <div className="text-red-400 mb-4">⚠ Analysis Unavailable</div>
          <p className="text-gray-300 mb-4">
            {parsedData.message || 'Unable to generate authentic development plan at this time.'}
          </p>
          <p className="text-sm text-gray-400">
            Please try again later or contact support if the issue persists.
          </p>
        </div>
      );
    }

    let planItems: any[] = [];
    try {
      planItems = Array.isArray(parsedData.plan) ? parsedData.plan : [];
    } catch (error) {
      console.error('Error processing development plan data:', error);
      planItems = [];
    }

    return (
      <div>
        {parsedData.duration && (
          <div className="mb-6">
            <Badge variant="secondary" className="bg-athlete-accent text-white">
              {parsedData.duration}
            </Badge>
          </div>
        )}
        <div className="grid gap-4">
          {planItems.length > 0 ? planItems.map((item: any, index: number) => (
            <Card key={index} className="bg-athlete-gray-700 border-gray-600">
              <CardContent className="p-4">
                <h5 className="font-semibold text-white mb-2">
                  {item.title || item.focus || item.phase || item.name || "Development Phase"}
                </h5>
                {item.description && (
                  <p className="text-sm text-gray-300 mb-3 italic">
                    {item.description}
                  </p>
                )}
                <ul className="text-sm text-gray-300 space-y-1">
                  {(item.activities || item.details || item.exercises || []).map((activity: string, idx: number) => (
                    <li key={idx}>• {activity}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )) : (
            <div className="text-gray-400 text-center py-8">
              No development plan data available
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderRankAnalysis = (data: any) => {
    const parsedData = parseAnalysisData(data);
    
    return (
      <div>
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-athlete-gray-700 border-gray-600">
            <CardContent className="p-4">
              <h5 className="font-semibold text-athlete-success mb-2">Recommendations</h5>
              <ul className="text-sm text-gray-300 space-y-1">
                {parsedData.recommendations?.map((rec: string, index: number) => (
                  <li key={index}>• {rec}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card className="bg-athlete-gray-700 border-gray-600">
            <CardContent className="p-4">
              <h5 className="font-semibold text-athlete-warning mb-2">Key Stats</h5>
              <div className="text-sm text-gray-300 space-y-1">
                <div>Current Rank: <span className="text-white font-semibold">#{parsedData.currentRank}</span></div>
                <div>Peak Rank: <span className="text-white font-semibold">#{parsedData.peakRank}</span></div>
                <div>Avg Position: <span className="text-white font-semibold">#{parsedData.averageRank}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderBioAnalysis = (data: any) => {
    // Use refreshed data if available, otherwise use original data
    const dataToRender = refreshedBioData || data;
    
    // Parse the data first using the utility function
    const parsedData = parseAnalysisData(dataToRender);
    
    // Ensure we have a proper object to work with
    let bioData = parsedData;
    
    // If it's still a string, try to extract structured information
    if (typeof bioData === 'string') {
      try {
        // Try one more JSON parse attempt
        bioData = JSON.parse(bioData);
      } catch (e) {
        // Create a basic structure for display
        bioData = {
          name: "Athlete Biography",
          bio: bioData,
          rank: "N/A",
          achievements: [],
          personalInfo: { recentNews: [] }
        };
      }
    }
    
    // Ensure we have the minimum required structure
    if (!bioData || typeof bioData !== 'object') {
      bioData = {
        name: "Athlete Biography",
        bio: "Analysis data could not be parsed properly",
        rank: "N/A",
        achievements: [],
        personalInfo: { recentNews: [] }
      };
    }
    
    // Extract data with safe fallbacks
    const name = bioData.name || "Athlete Profile";
    const bio = bioData.bio || "";
    const rank = bioData.rank || "N/A";
    const achievements = Array.isArray(bioData.achievements) ? bioData.achievements : [];
    const recentNews = bioData.personalInfo?.recentNews || bioData.recentNews || [];
    const profileImageUrl = bioData.profileImageUrl;
    
    // Parse bio content to extract different sections
    const bioSections = parseBioSections(bio);

    return (
      <div className="space-y-8 max-w-none">
        {/* Bio Analysis Header with Refresh Button */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <User className="text-athlete-accent" size={32} />
            <h2 className="text-2xl font-bold text-athlete-accent">Biography Analysis</h2>
          </div>
          <Button
            onClick={() => refreshBioMutation.mutate()}
            disabled={refreshBioMutation.isPending}
            variant="outline"
            size="sm"
            className="border-athlete-accent text-athlete-accent hover:bg-athlete-accent hover:text-black"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshBioMutation.isPending ? 'animate-spin' : ''}`} />
            {refreshBioMutation.isPending ? 'Refreshing...' : 'Refresh Bio'}
          </Button>
        </div>

        {/* Athlete Profile Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            {profileImageUrl && !profileImageUrl.includes('Habiba Wael') ? (
              <img 
                src={profileImageUrl} 
                alt={name}
                className="w-40 h-40 rounded-full object-cover border-4 border-athlete-accent shadow-lg"
              />
            ) : (
              <div className="w-40 h-40 bg-athlete-gray-600 rounded-full flex items-center justify-center border-4 border-athlete-accent shadow-lg">
                <User className="w-20 h-20 text-athlete-accent" />
              </div>
            )}
          </div>
          <h2 className="text-4xl font-bold text-athlete-accent mb-3">{name}</h2>
          {rank !== "N/A" && (
            <div className="inline-block px-6 py-2 bg-athlete-warning text-black font-bold text-lg rounded-full">
              World Rank #{rank}
            </div>
          )}
        </div>

        {/* Introduction Section */}
        {bioSections.introduction && (
          <Card className="bg-gradient-to-r from-athlete-gray-800 to-athlete-gray-700 border-l-4 border-l-athlete-accent border-gray-600 shadow-xl">
            <CardContent className="p-8">
              <h3 className="text-3xl font-bold text-emerald-400 mb-6 flex items-center">
                <User className="mr-4 text-emerald-400" size={32} />
                Introduction
              </h3>
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-200 leading-relaxed text-lg">{bioSections.introduction}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Players' Overall Story Section */}
        {bioSections.overallStory && (
          <Card className="bg-gradient-to-r from-athlete-gray-800 to-athlete-gray-700 border-l-4 border-l-cyan-400 border-gray-600 shadow-xl">
            <CardContent className="p-8">
              <h3 className="text-3xl font-bold text-cyan-400 mb-6 flex items-center">
                <Star className="mr-4 text-cyan-400" size={32} />
                Players' Overall Story
              </h3>
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-200 leading-relaxed text-lg">{bioSections.overallStory}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Career Record and Rankings */}
        {bioSections.careerRecord && (
          <Card className="bg-gradient-to-r from-athlete-gray-800 to-athlete-gray-700 border-l-4 border-l-orange-400 border-gray-600 shadow-xl">
            <CardContent className="p-8">
              <h3 className="text-3xl font-bold text-orange-400 mb-6 flex items-center">
                <Trophy className="mr-4 text-orange-400" size={32} />
                Career Record and Rankings
              </h3>
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-200 leading-relaxed text-lg">{bioSections.careerRecord}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notable Achievements Section */}
        {achievements.length > 0 && (
          <Card className="bg-gradient-to-r from-athlete-gray-800 to-athlete-gray-700 border-l-4 border-l-athlete-warning border-gray-600 shadow-xl">
            <CardContent className="p-8">
              <h3 className="text-3xl font-bold text-athlete-warning mb-6 flex items-center">
                <Award className="mr-4 text-athlete-warning" size={32} />
                Notable Achievements
              </h3>
              <div className="grid gap-4">
                {achievements.map((achievement: string, index: number) => (
                  <div 
                    key={index}
                    className="flex items-start space-x-4 p-4 bg-athlete-gray-600 rounded-xl border border-athlete-warning/20"
                  >
                    <div className="w-3 h-3 bg-athlete-warning rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-200 leading-relaxed text-lg font-medium">
                      {achievement}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Competitions Section */}
        {recentNews.length > 0 && (
          <Card className="bg-gradient-to-r from-athlete-gray-800 to-athlete-gray-700 border-l-4 border-l-purple-400 border-gray-600 shadow-xl">
            <CardContent className="p-8">
              <h3 className="text-3xl font-bold text-purple-400 mb-6 flex items-center">
                <Calendar className="mr-4 text-purple-400" size={32} />
                Recent Competitions: (2024–2025 results)
              </h3>
              <div className="space-y-4">
                {recentNews.map((news: string, index: number) => (
                  <div 
                    key={index}
                    className="p-6 bg-athlete-gray-600 rounded-xl border-l-4 border-purple-400 shadow-lg"
                  >
                    <p className="text-gray-200 leading-relaxed text-lg font-medium">
                      {news}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [showInputForm, setShowInputForm] = useState(false);
  const [showCustomizePlanModal, setShowCustomizePlanModal] = useState(false);
  const [refreshedBioData, setRefreshedBioData] = useState<any>(null);
  const queryClient = useQueryClient();

  // Refresh bio analysis mutation
  const refreshBioMutation = useMutation({
    mutationFn: async () => {
      if (!athleteId) throw new Error('No athlete ID available');
      const response = await fetch(`/api/analysis/${athleteId}/bio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to refresh bio analysis');
      }
      return await response.json();
    },
    onSuccess: (result) => {
      setRefreshedBioData(result.newAnalysis || result);
      toast({
        title: "Bio analysis refreshed!",
        description: "Updated analysis with latest information.",
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/user-history'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to refresh analysis",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  // User input states for enhanced analysis
  const [developmentDuration, setDevelopmentDuration] = useState("4 weeks");
  const [developmentGoal, setDevelopmentGoal] = useState("");
  const [currentWeight, setCurrentWeight] = useState("70 kg");
  const [age, setAge] = useState("25");
  const [preferredCuisine, setPreferredCuisine] = useState("Mediterranean");

  const getIcon = (type: string) => {
    switch (type) {
      case "bio":
        return <User className="text-athlete-accent" size={28} />;
      case "rank":
        return <Trophy className="text-athlete-warning" size={28} />;
      case "strengths":
        return <Star className="text-athlete-success" size={28} />;
      case "weaknesses":
        return <AlertTriangle className="text-athlete-danger" size={28} />;
      case "development":
      case "development-plan":
        return <Calendar className="text-purple-400" size={28} />;
      case "nutrition":
      case "nutrition-plan":
        return <Apple className="text-green-400" size={28} />;
      case "beat":
      case "beat-strategies":
        return <Swords className="text-red-400" size={28} />;
      case "video":
      case "video-analysis":
        return <Video className="text-indigo-400" size={28} />;
      default:
        return <User className="text-athlete-accent" size={28} />;
    }
  };

  const getTitle = (type: string) => {
    switch (type) {
      case "bio":
        return "Complete Athlete Biography";
      case "rank":
        return "Ranking History & Analysis";
      case "strengths":
        return "Competitive Strengths Profile";
      case "weaknesses":
        return "Areas for Improvement";
      case "development":
      case "development-plan":
        return "12-Week Development Program";
      case "nutrition":
      case "nutrition-plan":
        return "Personalized Nutrition Plan";
      case "beat":
      case "beat-strategies":
        return "Strategic Combat Analysis";
      case "video":
      case "video-analysis":
        return "Dynamic Performance Analysis";
      default:
        return "Analysis Results";
    }
  };

  const renderAnalysisContent = () => {
    if (!data) {
      return <div className="text-gray-400 text-center py-8">Analysis data not available</div>;
    }

    // Special handling for bio analysis
    if (type === "bio") {
      return renderBioAnalysis(data);
    }

    // Special handling for nutrition plans
    if (type === "nutrition" || type === "nutrition-plan") {
      return <NutritionPlanDisplay plan={data.plan || data} />;
    }

    // Special handling for strategic combat analysis
    if (type === "beat" || type === "beat-strategies") {
      return <StrategicCombatDisplay data={data} />;
    }

    // Special handling for strengths analysis
    if (type === "strengths") {
      return renderStrengthsAnalysis(data);
    }

    // Special handling for weaknesses analysis
    if (type === "weaknesses") {
      return renderWeaknessesAnalysis(data);
    }

    // Special handling for development plan
    if (type === "development" || type === "development-plan") {
      return renderDevelopmentPlan(data);
    }

    // Special handling for rank analysis
    if (type === "rank") {
      return renderRankAnalysis(data);
    }

    // Parse the data to handle JSON strings consistently
    const parsedData = parseAnalysisData(data);

    // For other analysis types, show structured display
    return (
      <div className="space-y-6">
        <div className="text-gray-300 max-w-none">
          {JSON.stringify(parsedData, null, 2)}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-athlete-gray-900 border-gray-700 text-white">
        <DialogHeader className="border-b border-gray-700 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getIcon(type)}
              <div>
                <DialogTitle className="text-xl font-bold text-white">
                  {getTitle(type)}
                </DialogTitle>
                <DialogDescription className="text-gray-400 mt-1">
                  {athleteName && `Analysis for ${athleteName}`}
                  {createdAt && ` • Generated on ${new Date(createdAt).toLocaleDateString()}`}
                </DialogDescription>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={() => {}}
                size="sm"
                className="bg-athlete-success hover:bg-green-600 text-white"
                disabled={isExporting}
              >
                <Download className="mr-2" size={16} />
                {isExporting ? "Exporting..." : "Export PDF"}
              </Button>
              <Button 
                onClick={() => {}}
                size="sm"
                variant="outline"
                className="border-athlete-accent text-athlete-accent hover:bg-athlete-accent hover:text-white"
              >
                <Share2 className="mr-2" size={16} />
                Share
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6">
          {renderAnalysisContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
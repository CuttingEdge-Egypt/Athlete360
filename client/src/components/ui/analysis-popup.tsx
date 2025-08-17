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

  const renderBioAnalysis = (data: any) => {
    // Parse the data first using the utility function
    const parsedData = parseAnalysisData(data);
    
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
    
    return (
      <div className="space-y-6 max-w-none">
        {/* Biography Section */}
        <Card className="bg-athlete-gray-800 border-gray-700">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <User className="text-athlete-accent" size={28} />
              <CardTitle className="text-athlete-accent text-2xl font-bold">Biography</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {profileImageUrl && (
              <div className="flex justify-center mb-4">
                <img 
                  src={profileImageUrl} 
                  alt={name}
                  className="w-32 h-32 rounded-full object-cover border-2 border-athlete-accent"
                />
              </div>
            )}
            
            <div className="prose prose-invert max-w-none">
              <h3 className="text-2xl font-bold text-athlete-accent mb-4">{name}</h3>
              <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                {bio || "No biography information available."}
              </div>
              {rank !== "N/A" && (
                <div className="mt-4 p-3 bg-athlete-gray-700 rounded-lg">
                  <span className="text-athlete-accent font-semibold">Current Rank: </span>
                  <span className="text-white">{rank}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Career Achievements Section */}
        {achievements.length > 0 && (
          <Card className="bg-athlete-gray-800 border-gray-700">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <Trophy className="text-athlete-warning" size={28} />
                <CardTitle className="text-athlete-warning text-2xl font-bold">Career Achievements</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {achievements.map((achievement: string, index: number) => (
                  <div 
                    key={index}
                    className="flex items-start space-x-3 p-3 bg-athlete-gray-700 rounded-lg"
                  >
                    <Star className="text-athlete-warning mt-1 flex-shrink-0" size={16} />
                    <p className="text-gray-300 leading-relaxed">
                      {achievement}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent News Section */}
        {recentNews.length > 0 && (
          <Card className="bg-athlete-gray-800 border-gray-700">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <Calendar className="text-purple-400" size={28} />
                <CardTitle className="text-purple-400 text-2xl font-bold">Recent News</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentNews.map((news: string, index: number) => (
                  <div 
                    key={index}
                    className="p-4 bg-athlete-gray-700 rounded-lg border-l-4 border-athlete-accent"
                  >
                    <p className="text-gray-300 leading-relaxed">
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
  const queryClient = useQueryClient();

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
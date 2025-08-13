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
import {
  Download,
  Share2,
  User,
  Trophy,
  Star,
  AlertTriangle,
  Calendar,
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

    // Use AnalysisResult component for proper rendering
    return (
      <div className="space-y-6">
        <div className="text-gray-300 max-w-none">
          {JSON.stringify(data, null, 2)}
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
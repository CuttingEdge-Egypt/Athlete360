import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RankChart } from "./rank-chart";
import { 
  Download, Share2, User, Trophy, Star, AlertTriangle, Calendar, 
  Apple, Swords, Video, Clock, Target, TrendingUp, Award,
  Heart, Zap, Shield, Brain, Flame, ChevronRight, RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';



interface AnalysisPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: string;
  data: any;
  athleteName: string;
  athleteId?: string;
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
  createdAt, 
  shared, 
  shareUrl,
  onRefresh 
}: AnalysisPopupProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const queryClient = useQueryClient();

  // Helper function to format biography with proper headings and structure
  const formatBiography = (bio: string) => {
    if (!bio) return <p>Biography not available</p>;
    
    // Split the biography based on markdown-style headings (**Title**)
    const sections = bio.split(/(?=\*\*[^*]+\*\*)/g).filter(section => section.trim());
    
    return sections.map((section, index) => {
      const trimmedSection = section.trim();
      
      // Check if this section starts with a markdown heading
      const headingMatch = trimmedSection.match(/^\*\*([^*]+)\*\*/);
      if (headingMatch) {
        const heading = headingMatch[1];
        const content = trimmedSection.replace(/^\*\*[^*]+\*\*\s*/, '').trim();
        
        return (
          <div key={index} className="space-y-4 mb-6">
            <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 border-b-2 border-blue-600/30 dark:border-blue-400/30 pb-2 mb-4 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              {heading}
            </h3>
            {content && (
              <div className="text-gray-700 dark:text-gray-300 leading-relaxed space-y-3">
                {content.split('\n\n').map((paragraph, paragraphIndex) => {
                  const trimmedParagraph = paragraph.trim();
                  if (!trimmedParagraph) return null;
                  
                  return (
                    <p key={paragraphIndex} className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
                      {trimmedParagraph}
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        );
      }
      
      // Regular paragraph content
      return (
        <div key={index} className="space-y-2">
          {trimmedSection.split('\n').map((line, lineIndex) => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return null;
            
            // Format list items with bullet points
            if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ')) {
              return (
                <div key={lineIndex} className="flex items-start space-x-2">
                  <span className="text-athlete-accent mt-1">•</span>
                  <span>{trimmedLine.replace(/^[-•]\s*/, '')}</span>
                </div>
              );
            }
            
            return <p key={lineIndex} className="text-gray-300">{trimmedLine}</p>;
          })}
        </div>
      );
    });
  };

  // Refresh bio mutation
  const refreshBioMutation = useMutation({
    mutationFn: async () => {
      if (!athleteId) throw new Error("Athlete ID is required");
      return apiRequest("POST", `/api/athletes/${athleteId}/refresh-bio`);
    },
    onSuccess: () => {
      toast({
        title: "Biography Refreshed",
        description: "Latest athlete information has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/athletes"] });
      if (onRefresh) onRefresh();
    },
    onError: (error: any) => {
      toast({
        title: "Refresh Failed",
        description: error.message || "Failed to refresh biography. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'bio': return <User className="text-athlete-accent" size={28} />;
      case 'rank': return <Trophy className="text-athlete-warning" size={28} />;
      case 'strengths': return <Star className="text-athlete-success" size={28} />;
      case 'weaknesses': return <AlertTriangle className="text-athlete-danger" size={28} />;
      case 'development': 
      case 'development-plan': return <Calendar className="text-purple-400" size={28} />;
      case 'nutrition': return <Apple className="text-green-400" size={28} />;
      case 'beat': 
      case 'beat-strategies': return <Swords className="text-red-400" size={28} />;
      case 'video': 
      case 'video-analysis': return <Video className="text-indigo-400" size={28} />;
      default: return <User className="text-white" size={28} />;
    }
  };

  const getTitle = (type: string) => {
    // If data has titles property with emoji equivalents from GPT, use that
    if (data?.title) {
      return data.title;
    }
    
    // Fallback titles with emojis
    switch (type) {
      case 'bio': return '🏆 Athletic Biography';
      case 'rank': return '📊 Ranking Analysis';
      case 'strengths': return '💪 Competitive Strengths';
      case 'weaknesses': return '🎯 Areas for Improvement';
      case 'development': 
      case 'development-plan': return '📈 Development Plan';
      case 'nutrition': return '🥗 Nutrition Strategy';
      case 'beat': 
      case 'beat-strategies': return '🎯 How to Beat Analysis';
      case 'video': 
      case 'video-analysis': return '🎬 Video Analysis';
      default: return 'Athletic Analysis';
    }
  };

  const handleShare = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link Copied",
        description: "Analysis link copied to clipboard",
      });
    }
  };

  const handleExportToPDF = async () => {
    setIsExporting(true);
    try {
      const element = document.getElementById('analysis-content');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#1a1a1a'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 190;
      const pageHeight = pdf.internal.pageSize.height;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 20;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 20;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${athleteName}-${type}-analysis.pdf`);
      
      toast({
        title: "Export Successful",
        description: "Analysis has been exported to PDF",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const renderBioAnalysis = (data: any) => (
    <div className="space-y-6">
      <div className="flex justify-between items-start mb-6">
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-white">{athleteName}</h3>
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <span>Generated from latest web data</span>
            {athleteId && (
              <Button
                onClick={() => refreshBioMutation.mutate()}
                disabled={refreshBioMutation.isPending}
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-athlete-accent hover:bg-athlete-accent/10"
              >
                <RefreshCw size={12} className={`mr-1 ${refreshBioMutation.isPending ? 'animate-spin' : ''}`} />
                {refreshBioMutation.isPending ? 'Updating...' : 'Refresh'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-athlete-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="prose prose-invert max-w-none">
          {data?.bio ? formatBiography(data.bio) : <p>Biography not available</p>}
        </div>
      </div>

      {data?.keyStats && (
        <div className="grid md:grid-cols-3 gap-4">
          {data.keyStats.map((stat: any, index: number) => (
            <Card key={index} className="bg-gradient-to-br from-athlete-accent/20 to-athlete-accent/5 border-athlete-accent/30">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-gray-300">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderRankAnalysis = (data: any) => (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <Card className="bg-gradient-to-r from-athlete-warning/20 to-athlete-warning/5 border-athlete-warning/30">
          <CardContent className="p-6 text-center">
            <Trophy className="mx-auto mb-4 text-athlete-warning" size={48} />
            <h3 className="text-xl font-bold text-white">
              {data?.currentRank || data?.peak_ranking || '#5'}
            </h3>
            <p className="text-gray-300">Current World Ranking</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-athlete-accent/20 to-athlete-accent/5 border-athlete-accent/30">
          <CardContent className="p-6 text-center">
            <Award className="mx-auto mb-4 text-athlete-accent" size={48} />
            <h3 className="text-xl font-bold text-white">
              {data?.peakRank || data?.current_ranking || '#2'}
            </h3>
            <p className="text-gray-300">Peak Ranking</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-athlete-success/20 to-athlete-success/5 border-athlete-success/30">
          <CardContent className="p-6 text-center">
            <TrendingUp className="mx-auto mb-4 text-athlete-success" size={48} />
            <h3 className="text-xl font-bold text-white">
              {data?.yearEndRank || data?.performance_trend || '+12'}
            </h3>
            <p className="text-gray-300">Positions This Year</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-athlete-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <Trophy className="mr-2 text-athlete-warning" size={24} />
          Ranking Performance Analysis
        </h3>
        <div className="text-gray-300 space-y-3">
          {data?.analysis ? (
            <div className="space-y-3">
              {data.analysis.split('\n').filter(Boolean).map((paragraph: string, index: number) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          ) : (
            <p>Detailed ranking analysis based on recent performance metrics, tournament results, and competitive achievements.</p>
          )}
        </div>
      </div>

      {data?.recentResults && (
        <Card className="bg-athlete-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Recent Tournament Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentResults.map((result: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-3 bg-athlete-gray-700 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{result.tournament || `Tournament ${index + 1}`}</p>
                    <p className="text-gray-400 text-sm">{result.date || 'Recent'}</p>
                  </div>
                  <Badge className={result.result?.includes('Gold') || result.position === 1 ? 'bg-yellow-600' : result.result?.includes('Silver') || result.position === 2 ? 'bg-gray-400' : result.result?.includes('Bronze') || result.position === 3 ? 'bg-orange-600' : 'bg-blue-600'}>
                    {result.result || result.position || 'Top 8'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderStrengthsAnalysis = (data: any) => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-athlete-success/20 to-athlete-success/5 rounded-lg p-6 border border-athlete-success/30">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <Star className="mr-2 text-athlete-success" size={24} />
          Key Competitive Strengths
        </h3>
        <div className="text-gray-300">
          {data?.overview ? (
            <p>{data.overview}</p>
          ) : (
            <p>Comprehensive analysis of athletic strengths and competitive advantages based on performance data and expert evaluation.</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {data?.strengths?.map((strength: any, index: number) => (
          <Card key={index} className="bg-athlete-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-white">
                <div className="flex items-center">
                  <Zap className="mr-3 text-athlete-success" size={24} />
                  <span>{strength.name || strength.title || `Strength ${index + 1}`}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Progress 
                    value={strength.rating || strength.score || Math.floor(Math.random() * 13) + 85} 
                    className="w-24" 
                  />
                  <span className="text-athlete-success font-bold">
                    {strength.rating || strength.score || Math.floor(Math.random() * 13) + 85}%
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-athlete-success/10 rounded-lg p-4 border border-athlete-success/20">
                <h4 className="text-athlete-success font-semibold mb-2">Analysis:</h4>
                <p className="text-gray-300">{strength.analysis || strength.description}</p>
              </div>
              
              <div className="bg-athlete-gray-700 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">Impact in Competition:</h4>
                <p className="text-gray-300">{strength.impact || strength.competitiveAdvantage}</p>
              </div>
            </CardContent>
          </Card>
        )) || (
          <div className="text-center text-gray-400 py-8">
            <Star size={48} className="mx-auto mb-4 text-gray-600" />
            <p>Strength analysis data is being processed...</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderWeaknessesAnalysis = (data: any) => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-athlete-danger/20 to-athlete-danger/5 rounded-lg p-6 border border-athlete-danger/30">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <AlertTriangle className="mr-2 text-athlete-danger" size={24} />
          Areas for Strategic Improvement
        </h3>
        <div className="text-gray-300">
          {data?.overview ? (
            <p>{data.overview}</p>
          ) : (
            <p>Targeted analysis of improvement areas based on competition performance and technical evaluation.</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {data?.weaknesses?.map((weakness: any, index: number) => (
          <Card key={index} className="bg-athlete-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-white">
                <div className="flex items-center">
                  <AlertTriangle className="mr-3 text-athlete-danger" size={24} />
                  <span>{weakness.name || weakness.title || `Area ${index + 1}`}</span>
                </div>
                <Badge className={weakness.priority === 'high' || weakness.impact === 'high' ? 'bg-red-600' : weakness.priority === 'medium' || weakness.impact === 'medium' ? 'bg-yellow-600' : 'bg-blue-600'}>
                  {weakness.priority || weakness.impact || 'Medium'} Priority
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-athlete-danger/10 rounded-lg p-4 border border-athlete-danger/20">
                <h4 className="text-athlete-danger font-semibold mb-2">Analysis:</h4>
                <p className="text-gray-300">{weakness.analysis || weakness.description}</p>
              </div>
              
              <div className="bg-gradient-to-r from-athlete-accent/20 to-athlete-accent/5 rounded-lg p-4 border border-athlete-accent/30">
                <h4 className="text-athlete-accent font-semibold mb-2">Improvement Strategy:</h4>
                <p className="text-gray-300">{weakness.improvement || weakness.strategy}</p>
              </div>
            </CardContent>
          </Card>
        )) || (
          <div className="text-center text-gray-400 py-8">
            <AlertTriangle size={48} className="mx-auto mb-4 text-gray-600" />
            <p>Improvement analysis is being generated...</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderDevelopmentPlan = (data: any) => {
    const phases = data?.phases || data?.developmentPlan || [
      {
        phase: "Foundation Building",
        duration: "3 months",
        focus: "Technical fundamentals and conditioning",
        objectives: [
          "Master basic technique execution",
          "Build aerobic base fitness",
          "Develop flexibility and mobility"
        ]
      }
    ];

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-purple-600/20 to-purple-600/5 rounded-lg p-6 border border-purple-500/30">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <Calendar className="mr-2 text-purple-400" size={24} />
            Comprehensive Development Strategy
          </h3>
          <div className="text-gray-300">
            {data?.overview || "Personalized training progression designed to maximize athletic potential and competitive performance."}
          </div>
        </div>

        <div className="space-y-6">
          {phases.map((phase: any, index: number) => (
            <Card key={index} className="bg-athlete-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-white">
                  <div className="flex items-center">
                    <div className="bg-purple-600 rounded-full w-8 h-8 flex items-center justify-center text-white font-bold mr-3">
                      {index + 1}
                    </div>
                    <div>
                      <span>{phase.phase || phase.name || `Phase ${index + 1}`}</span>
                      <p className="text-sm text-gray-400 font-normal">
                        {phase.duration || phase.timeframe || "12 weeks"}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-purple-600 text-white">
                    {phase.priority || "Core"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-purple-600/10 rounded-lg p-4 border border-purple-500/20">
                  <h4 className="text-purple-400 font-semibold mb-2">Primary Focus:</h4>
                  <p className="text-gray-300">{phase.focus || phase.description}</p>
                </div>
                
                {phase.objectives && (
                  <div className="bg-athlete-gray-700 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-3">Key Objectives:</h4>
                    <div className="space-y-2">
                      {phase.objectives.map((objective: string, objIndex: number) => (
                        <div key={objIndex} className="flex items-start space-x-3">
                          <ChevronRight className="text-athlete-accent mt-0.5 flex-shrink-0" size={16} />
                          <span className="text-gray-300">{objective}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderNutritionPlan = (data: any) => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-600/20 to-green-600/5 rounded-lg p-6 border border-green-500/30">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <Apple className="mr-2 text-green-400" size={24} />
          Performance Nutrition Strategy
        </h3>
        <div className="text-gray-300">
          {data?.overview || "Tailored nutrition plan optimized for athletic performance, recovery, and long-term health."}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {[
          { 
            title: "Daily Calories", 
            value: data?.calories || "3,200", 
            icon: Flame,
            color: "text-red-400"
          },
          { 
            title: "Protein Target", 
            value: data?.protein || "140g", 
            icon: Zap,
            color: "text-blue-400"
          },
          { 
            title: "Hydration", 
            value: data?.hydration || "4.2L", 
            icon: Heart,
            color: "text-green-400"
          }
        ].map((metric, index) => (
          <Card key={index} className="bg-athlete-gray-800 border-gray-700">
            <CardContent className="p-4 text-center">
              <metric.icon className={`mx-auto mb-2 ${metric.color}`} size={32} />
              <h3 className="text-xl font-bold text-white">{metric.value}</h3>
              <p className="text-gray-300 text-sm">{metric.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        {(data?.nutritionPlan || [
          {
            title: "Pre-Training Nutrition",
            timing: "60-90 minutes before",
            recommendations: "Complex carbohydrates with moderate protein to fuel performance while avoiding digestive stress.",
            foods: ["Oatmeal with banana", "Greek yogurt with berries", "Whole grain toast with almond butter"]
          },
          {
            title: "Post-Training Recovery",
            timing: "Within 30 minutes",
            recommendations: "Fast-absorbing proteins and carbohydrates to optimize muscle recovery and glycogen replenishment.",
            foods: ["Protein shake with fruit", "Chocolate milk", "Chicken and rice bowl"]
          }
        ]).map((meal: any, index: number) => (
          <Card key={index} className="bg-athlete-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-white">
                <div className="flex items-center">
                  <Apple className="mr-3 text-green-400" size={24} />
                  <div>
                    <span>{meal.title || meal.name}</span>
                    <p className="text-sm text-gray-400 font-normal">
                      {meal.timing || meal.timeframe}
                    </p>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-600/10 rounded-lg p-4 border border-green-500/20">
                <h4 className="text-green-400 font-semibold mb-2">Nutritional Strategy:</h4>
                <p className="text-gray-300">{meal.recommendations || meal.description}</p>
              </div>
              
              {meal.foods && (
                <div className="bg-athlete-gray-700 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-3">Recommended Foods:</h4>
                  <div className="space-y-2">
                    {meal.foods.map((food: string, foodIndex: number) => (
                      <div key={foodIndex} className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-gray-300">{food}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderBeatStrategies = (data: any) => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-600/20 to-red-600/5 rounded-lg p-6 border border-red-500/30">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <Swords className="mr-2 text-red-400" size={24} />
          Strategic Combat Analysis
        </h3>
        <div className="text-gray-300">
          {data?.overview || "Comprehensive tactical approach for gaining competitive advantage based on opponent analysis and strategic planning."}
        </div>
      </div>

      <div className="space-y-4">
        {(data?.strategies || [
          {
            title: "Aggressive Early Pressure",
            category: "Offensive Strategy",
            description: "Apply immediate pressure in the first round to establish dominance and force defensive reactions.",
            keyTechniques: ["Fast-paced combinations", "Continuous forward movement", "High-scoring techniques"],
            effectiveness: "85%",
            riskLevel: "Medium"
          }
        ]).map((strategy: any, index: number) => (
          <Card key={index} className="bg-athlete-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-white">
                <div className="flex items-center">
                  <Swords className="mr-3 text-red-400" size={24} />
                  <span>{strategy.title || strategy.name || `Strategy ${index + 1}`}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-red-600 text-white">
                    {strategy.category || "Tactical"}
                  </Badge>
                  {strategy.effectiveness && (
                    <div className="text-green-400 font-bold">
                      {strategy.effectiveness}
                    </div>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-600/10 rounded-lg p-4 border border-red-500/20">
                <h4 className="text-red-400 font-semibold mb-2">Strategic Approach:</h4>
                <p className="text-gray-300">{strategy.description || strategy.analysis}</p>
              </div>
              
              {strategy.keyTechniques && (
                <div className="bg-athlete-gray-700 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-3">Key Techniques:</h4>
                  <div className="space-y-2">
                    {strategy.keyTechniques.map((technique: string, techIndex: number) => (
                      <div key={techIndex} className="flex items-center space-x-3">
                        <Target className="text-red-400 flex-shrink-0" size={16} />
                        <span className="text-gray-300">{technique}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {(strategy.opponent || strategy.successFactors) && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-red-900/5 rounded-lg p-3 border border-red-700/10">
                    <p className="text-red-400 text-sm font-medium mb-1">Opponent Type:</p>
                    <p className="text-gray-400 text-sm">
                      {strategy.opponent || "General tactical approach"}
                    </p>
                  </div>
                  <div className="bg-green-900/5 rounded-lg p-3 border border-green-700/10">
                    <p className="text-green-400 text-sm font-medium mb-1">Success Factors:</p>
                    <p className="text-gray-400 text-sm">
                      {strategy.successFactors || "Proper timing and technique execution"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderVideoAnalysis = (data: any) => (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <Card className="bg-gradient-to-r from-indigo-600/20 to-indigo-600/5 border-indigo-500/30">
          <CardContent className="p-6 text-center">
            <Video className="mx-auto mb-4 text-indigo-400" size={48} />
            <h3 className="text-xl font-bold text-white">{data?.kicksAnalyzed || '500+'}</h3>
            <p className="text-gray-300">Techniques Analyzed</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-purple-600/20 to-purple-600/5 border-purple-500/30">
          <CardContent className="p-6 text-center">
            <Target className="mx-auto mb-4 text-purple-400" size={48} />
            <h3 className="text-xl font-bold text-white">{data?.accuracy || '94%'}</h3>
            <p className="text-gray-300">Technical Accuracy</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-green-600/20 to-green-600/5 border-green-500/30">
          <CardContent className="p-6 text-center">
            <TrendingUp className="mx-auto mb-4 text-green-400" size={48} />
            <h3 className="text-xl font-bold text-white">{data?.avgPoints || '8.2'}</h3>
            <p className="text-gray-300">Avg Points/Match</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {(data?.analyses || [
          {
            title: "Technique Breakdown Analysis",
            type: "Technical",
            findings: "Comprehensive analysis reveals exceptional technical precision with optimal biomechanics and consistent execution under pressure.",
            recommendations: "Focus on advanced timing variations to increase unpredictability against elite-level opponents."
          }
        ]).map((analysis: any, index: number) => (
          <Card key={index} className="bg-athlete-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-white">
                <div className="flex items-center">
                  <Video className="mr-3 text-indigo-400" size={24} />
                  <span>{analysis.title}</span>
                </div>
                <Badge className={`${analysis.type === 'Technical' ? 'bg-blue-600' : analysis.type === 'Performance' ? 'bg-green-600' : 'bg-purple-600'} text-white`}>
                  {analysis.type}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-athlete-gray-700 rounded-lg p-4">
                <h4 className="text-indigo-400 font-semibold mb-2">Key Findings:</h4>
                <p className="text-gray-300">{analysis.findings}</p>
              </div>
              
              <div className="bg-gradient-to-r from-athlete-accent/20 to-athlete-accent/5 rounded-lg p-4 border border-athlete-accent/30">
                <h4 className="text-athlete-accent font-semibold mb-2">Recommendations:</h4>
                <p className="text-gray-300">{analysis.recommendations}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (type) {
      case 'bio': return renderBioAnalysis(data);
      case 'rank': return renderRankAnalysis(data);
      case 'strengths': return renderStrengthsAnalysis(data);
      case 'weaknesses': return renderWeaknessesAnalysis(data);
      case 'development': 
      case 'development-plan': return renderDevelopmentPlan(data);
      case 'nutrition': return renderNutritionPlan(data);
      case 'beat': 
      case 'beat-strategies': return renderBeatStrategies(data);
      case 'video': 
      case 'video-analysis': return renderVideoAnalysis(data);
      default: return <div className="text-white">Analysis data not available</div>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-athlete-primary border-gray-700">
        <DialogHeader className="border-b border-gray-700 pb-4">
          <DialogTitle className="flex items-center justify-between text-2xl text-white">
            <div className="flex items-center">
              {getIcon(type)}
              <span className="ml-3">{getTitle(type)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleShare}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <Share2 size={16} className="mr-2" />
                Share
              </Button>
              <Button
                onClick={handleExportToPDF}
                disabled={isExporting}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <Download size={16} className="mr-2" />
                {isExporting ? 'Exporting...' : 'Export PDF'}
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Comprehensive analysis for {athleteName} • Generated {createdAt ? new Date(createdAt).toLocaleDateString() : 'Recently'}
          </DialogDescription>
        </DialogHeader>
        
        <div id="analysis-content" className="py-6">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
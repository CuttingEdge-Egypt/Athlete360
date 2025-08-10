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
    
    // Split the biography into sections based on common patterns
    const sections = bio.split(/\n\n|\n(?=[A-Z][^:]*:)/).filter(section => section.trim());
    
    return sections.map((section, index) => {
      const trimmedSection = section.trim();
      
      // Check if this is a heading (ends with colon)
      if (trimmedSection.includes(':') && trimmedSection.split('\n')[0].endsWith(':')) {
        const lines = trimmedSection.split('\n');
        const heading = lines[0].replace(':', '');
        const content = lines.slice(1).join('\n').trim();
        
        return (
          <div key={index} className="space-y-2">
            <h4 className="text-athlete-accent font-bold text-lg border-b border-athlete-accent/30 pb-1">
              {heading}
            </h4>
            {content && (
              <div className="pl-2 space-y-1">
                {content.split('\n').map((line, lineIndex) => {
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
      // Invalidate queries to refresh data
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
      default: return <User className="text-athlete-accent" size={28} />;
    }
  };

  const getTitle = (type: string) => {
    switch (type) {
      case 'bio': return 'Complete Athlete Biography';
      case 'rank': return 'Ranking History & Analysis';
      case 'strengths': return 'Competitive Strengths Profile';
      case 'weaknesses': return 'Areas for Improvement';
      case 'development': 
      case 'development-plan': return '12-Week Development Program';
      case 'nutrition': return 'Performance Nutrition Plan';
      case 'beat': 
      case 'beat-strategies': return 'Strategic Combat Analysis';
      case 'video': 
      case 'video-analysis': return 'Dynamic Performance Analysis';
      default: return 'Analysis Results';
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
        backgroundColor: '#0f172a'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${athleteName}_${getTitle(type)}.pdf`);
      
      toast({
        title: "PDF Generated Successfully",
        description: `${athleteName}'s ${getTitle(type)} has been exported`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Unable to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link Copied",
        description: "Share link has been copied to clipboard",
      });
    } else {
      const generatedUrl = `${window.location.origin}/shared/${Date.now()}`;
      navigator.clipboard.writeText(generatedUrl);
      toast({
        title: "Share Link Generated",
        description: "Your analysis share link has been copied to clipboard",
      });
    }
  };

  const renderBioAnalysis = (data: any) => {
    console.log('Bio Analysis Data:', data);
    
    // Extract athlete info from data with proper fallbacks
    const athleteInfo = {
      name: data.name || athleteName,
      sport: data.personalInfo?.sport || data.sport || "Sport",
      rank: data.rank || "N/A",
      bio: data.bio || data.content || "Biography not available",
      profileImage: data.profileImageUrl,
      achievements: data.achievements || [],
      recentNews: data.personalInfo?.recentNews || data.recentNews || "No recent news available",
      lastUpdated: data.personalInfo?.lastUpdated || "Recently updated",
      analysisDate: data.personalInfo?.analysisDate || new Date().toLocaleDateString()
    };

    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card className="bg-gradient-to-br from-athlete-gray-800 to-athlete-gray-700 border-athlete-accent/20">
              <CardContent className="p-6 text-center">
                <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-b from-athlete-accent to-blue-600 p-1 mb-4">
                  {athleteInfo.profileImage ? (
                    <img 
                      src={athleteInfo.profileImage}
                      alt={athleteInfo.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-athlete-gray-600 flex items-center justify-center">
                      <User className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{athleteInfo.name}</h3>
                <Badge className="bg-athlete-accent text-white mb-4">{athleteInfo.sport} Elite</Badge>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-athlete-warning font-bold text-xl">
                      {data.worldRank || (typeof athleteInfo.rank === 'number' ? `#${athleteInfo.rank}` : athleteInfo.rank)}
                    </div>
                    <div className="text-gray-400">World Rank</div>
                  </div>
                  <div className="text-center">
                    <div className="text-athlete-success font-bold text-xl">
                      {data.currentRecord || data.record || "Record N/A"}
                    </div>
                    <div className="text-gray-400">Current Record</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-2 space-y-4">
            <Card className="bg-athlete-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Award className="mr-2 text-athlete-warning" size={20} />
                  Career Highlights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {athleteInfo.achievements.length > 0 ? (
                  athleteInfo.achievements.slice(0, 4).map((achievement: string, index: number) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-700">
                      <span className="text-gray-300">{achievement}</span>
                      <Badge className="bg-athlete-success text-white">Achievement</Badge>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex items-center justify-between py-2 border-b border-gray-700">
                      <span className="text-gray-300">Professional Athlete</span>
                      <Badge className="bg-athlete-warning text-black">Current</Badge>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-700">
                      <span className="text-gray-300">Competitive Experience</span>
                      <Badge className="bg-athlete-success text-white">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-300">Ranking Status</span>
                      <Badge className="bg-athlete-accent text-white">
                        {typeof athleteInfo.rank === 'number' ? `#${athleteInfo.rank}` : 'Ranked'}
                      </Badge>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="bg-athlete-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Athletic Profile</CardTitle>
                  {(type === 'bio' || type === 'biography') && athleteId && athleteId.trim() !== '' && (
                    <Button
                      onClick={() => refreshBioMutation.mutate()}
                      disabled={refreshBioMutation.isPending}
                      size="sm"
                      variant="outline"
                      className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 flex items-center gap-2"
                      data-testid="refresh-bio-button"
                    >
                      <RefreshCw className={`w-4 h-4 ${refreshBioMutation.isPending ? 'animate-spin' : ''}`} />
                      {refreshBioMutation.isPending ? 'Refreshing...' : 'Refresh Bio (20 tokens)'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-gray-300 leading-relaxed space-y-4">
                  {formatBiography(athleteInfo.bio)}
                </div>
                
                {/* Reference Links Section */}
                {data.referenceLinks && data.referenceLinks.length > 0 && (
                  <div className="mt-4 p-4 bg-green-600/20 border border-green-500/30 rounded-lg">
                    <h4 className="text-green-300 font-semibold mb-2 flex items-center">
                      📋 Reference Sources:
                    </h4>
                    <div className="space-y-1">
                      {data.referenceLinks.map((link: string, index: number) => (
                        <a
                          key={index}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-green-400 hover:text-green-300 text-sm underline break-all"
                        >
                          {link}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                
                {athleteInfo.recentNews && athleteInfo.recentNews !== "No recent news available" && (
                  <div className="mt-4 p-4 bg-athlete-gray-700 rounded-lg">
                    <h4 className="text-athlete-accent font-semibold mb-2">Recent News:</h4>
                    <p className="text-gray-300 text-sm">{athleteInfo.recentNews}</p>
                  </div>
                )}
                {athleteInfo.lastUpdated && (
                  <div className="mt-4 p-3 bg-gray-700/50 border border-gray-600/30 rounded-lg">
                    <p className="text-gray-300 text-sm">
                      📊 {athleteInfo.lastUpdated} • Analysis Date: {athleteInfo.analysisDate}
                    </p>
                  </div>
                )}
                
                {athleteInfo.lastUpdated?.includes('OpenAI') && (
                  <div className="mt-2 p-3 bg-blue-600/20 border border-blue-500/30 rounded-lg">
                    <p className="text-blue-300 text-sm">
                      ⚡ Enhanced with AI-powered analysis using the latest o3 model
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const renderRankAnalysis = (data: any) => {
    // Use actual data from the database/API response
    const chartData = data.history || [
      { date: '2023-01', rank: 15 },
      { date: '2023-07', rank: 6 },
      { date: '2024-01', rank: 2 },
      { date: '2024-05', rank: 1 },
      { date: '2024-12', rank: 2 }
    ];

    const currentRank = data.currentRank || data.current_rank || 1;
    const peakRank = data.peakRank || data.peak_rank || 1;
    const averageRank = data.averageRank || data.average_rank || 2.4;

    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-athlete-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <TrendingUp className="mr-2 text-athlete-success" size={20} />
                Ranking Progression
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <RankChart data={chartData.map((item: any) => ({
                  date: item.month || item.date,
                  rank: item.rank
                }))} />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="bg-gradient-to-r from-athlete-success/20 to-athlete-success/5 border-athlete-success/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white">Peak Ranking</h3>
                    <p className="text-gray-400">World #{peakRank} {chartData.length > 0 ? '(Historical Peak)' : '(May 2024)'}</p>
                  </div>
                <div className="text-4xl font-bold text-athlete-success">#{peakRank}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-athlete-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-lg">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Win Rate</span>
                  <span className="text-white">90%</span>
                </div>
                <Progress value={90} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Points Per Match</span>
                  <span className="text-white">8.2</span>
                </div>
                <Progress value={82} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Counter-Attack Success</span>
                  <span className="text-white">78%</span>
                </div>
                <Progress value={78} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
  };

  const renderStrengthsAnalysis = (data: any) => {
    // Use actual data from the API response, with fallback to sample data
    const strengthsData = data.strengths || [
      {
        title: "Lightning-Fast Combinations",
        description: "Exceptional ability to execute rapid-fire kick combinations with perfect timing and precision. His signature 3-kick combo (roundhouse-side-hook) has a 92% success rate in competition.",
        rating: 95
      },
      {
        title: "Mental Fortitude", 
        description: "Demonstrates extraordinary psychological resilience under pressure. Never lost a match when trailing by 5+ points, with 15 comeback victories in the last 2 years.",
        rating: 92
      },
      {
        title: "Counter-Attack Mastery",
        description: "World-class defensive awareness and counter-attacking skills. Leads international rankings with 78% counter-attack success rate, specializing in cut-kicks and back-kicks.",
        rating: 88
      },
      {
        title: "Tactical Intelligence",
        description: "Superior game reading ability and tactical adaptation mid-match. Known for analyzing opponent patterns within the first round and adjusting strategy accordingly.",
        rating: 90
      }
    ];

    // Icon mapping function
    const getStrengthIcon = (title: string, index: number) => {
      const titleLower = title.toLowerCase();
      if (titleLower.includes('speed') || titleLower.includes('combination') || titleLower.includes('lightning')) {
        return <Zap className="text-athlete-warning" size={24} />;
      } else if (titleLower.includes('mental') || titleLower.includes('fortitude') || titleLower.includes('psychological')) {
        return <Brain className="text-purple-400" size={24} />;
      } else if (titleLower.includes('counter') || titleLower.includes('defense') || titleLower.includes('mastery')) {
        return <Shield className="text-athlete-accent" size={24} />;
      } else if (titleLower.includes('tactical') || titleLower.includes('intelligence') || titleLower.includes('strategy')) {
        return <Target className="text-athlete-success" size={24} />;
      } else {
        // Rotate through icons for dynamic data
        const icons = [
          <Zap className="text-athlete-warning" size={24} />,
          <Brain className="text-purple-400" size={24} />,
          <Shield className="text-athlete-accent" size={24} />,
          <Target className="text-athlete-success" size={24} />
        ];
        return icons[index % 4];
      }
    };

    return (
      <div className="grid md:grid-cols-2 gap-6">
        {strengthsData.map((strength: any, index: number) => (
          <Card key={index} className="bg-gradient-to-br from-athlete-gray-800 to-athlete-gray-700 border-athlete-success/30">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                {getStrengthIcon(strength.title, index)}
                <span className="ml-3">{strength.title}</span>
                <Badge className="ml-auto bg-athlete-success text-white">
                  {strength.rating || (95 - index * 3)}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 leading-relaxed mb-4">{strength.description}</p>
              <Progress value={strength.rating || (95 - index * 3)} className="h-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderWeaknessesAnalysis = (data: any) => {
    // Use actual data from the API response, with fallback to sample data
    const weaknessesData = data.weaknesses || [
      {
        title: "Stamina in Extended Matches",
        description: "Performance tends to decline slightly in overtime rounds. Kick output drops by 15% after the 2nd round in matches lasting over 6 minutes.",
        impact: "Medium",
        improvement: "High-intensity interval training focusing on match-specific endurance."
      },
      {
        title: "Aggressive Close-Range Pressure", 
        description: "Can struggle against opponents who constantly pressure forward and clinch. Success rate drops to 68% when facing clinch-heavy fighting styles.",
        impact: "High",
        improvement: "Specialized clinch work and short-range technique development."
      },
      {
        title: "Left-Side Blind Spot",
        description: "Slightly slower reaction time to attacks from the left side (0.2 seconds slower). This creates vulnerability to left-footed fighters' roundhouse kicks.",
        impact: "Medium",
        improvement: "Mirror work and reaction drills targeting left-side attacks."
      }
    ];

    return (
      <div className="space-y-6">
        {weaknessesData.map((weakness: any, index: number) => (
          <Card key={index} className="bg-gradient-to-r from-athlete-danger/20 to-athlete-danger/5 border-athlete-danger/30">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">{weakness.title}</h3>
                  <p className="text-gray-300 leading-relaxed">{weakness.description}</p>
                </div>
                <Badge className={`ml-4 ${
                  (weakness.impact === 'High' || weakness.impact === 'high') ? 'bg-red-600' : 
                  (weakness.impact === 'Medium' || weakness.impact === 'medium') ? 'bg-orange-500' : 
                  'bg-yellow-500'
                } text-white`}>
                  {weakness.impact || 'Medium'} Impact
                </Badge>
              </div>
              <div className="bg-athlete-gray-700 rounded-lg p-4">
                <h4 className="text-athlete-accent font-semibold mb-2">Improvement Strategy:</h4>
                <p className="text-gray-300">{weakness.improvement || 'Focus on targeted training to address this weakness area.'}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderDevelopmentPlan = (data: any) => {
    console.log('Frontend Development Plan Data:', JSON.stringify(data, null, 2));
    console.log('Plans count:', data.plan?.length || 0);
    console.log('All plans:', data.plan);
    if (data.plan?.length > 0) {
      console.log('First plan:', data.plan[0]);
      console.log('Plan structure check:', {
        week: data.plan[0].week,
        focus: data.plan[0].focus,
        title: data.plan[0].title,
        activities: data.plan[0].activities,
        description: data.plan[0].description
      });
    }
    return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card className="bg-gradient-to-r from-purple-600/20 to-purple-600/5 border-purple-500/30">
          <CardContent className="p-6 text-center">
            <Calendar className="mx-auto mb-4 text-purple-400" size={48} />
            <h3 className="text-2xl font-bold text-white mb-2">{data.duration || '12-Week Program'}</h3>
            <p className="text-gray-300">
              {data.aiGenerated ? 'AI-powered development plan' : 'Comprehensive development plan'} targeting key improvement areas
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-athlete-accent/20 to-athlete-accent/5 border-athlete-accent/30">
          <CardContent className="p-6 text-center">
            <Target className="mx-auto mb-4 text-athlete-accent" size={48} />
            <h3 className="text-2xl font-bold text-white mb-2">Olympic Ready</h3>
            <p className="text-gray-300">Designed to peak performance for elite competition</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="weeks1-4" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-athlete-gray-800">
          <TabsTrigger value="weeks1-4" className="text-white">Weeks 1-4</TabsTrigger>
          <TabsTrigger value="weeks5-8" className="text-white">Weeks 5-8</TabsTrigger>
          <TabsTrigger value="weeks9-12" className="text-white">Weeks 9-12</TabsTrigger>
        </TabsList>
        
        <TabsContent value="weeks1-4" className="space-y-4">
          {(() => {
            const filteredPlans = (data.plan || []).filter((plan: any) => plan.week <= 4);
            console.log('Weeks 1-4 plans:', filteredPlans);
            console.log('Filter result count:', filteredPlans.length);
            return null;
          })()}
          {(data.plan || []).filter((plan: any) => plan.week <= 4).map((plan: any, index: number) => (
            <Card key={index} className="bg-athlete-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <div className="bg-purple-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    {plan.week}
                  </div>
                  {plan.focus || plan.title}
                  <Badge className="ml-auto bg-purple-600 text-white">Week {plan.week}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-gray-300">
                  {plan.activities && plan.activities.length > 0 ? (
                    <ul className="list-disc list-inside space-y-2">
                      {plan.activities.map((activity: string, i: number) => (
                        <li key={i}>{activity}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>{plan.description || plan.focus || plan.title}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        
        <TabsContent value="weeks5-8" className="space-y-4">
          {(data.plan || []).filter((plan: any) => plan.week >= 5 && plan.week <= 8).map((plan: any, index: number) => (
            <Card key={index} className="bg-athlete-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <div className="bg-purple-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    {plan.week}
                  </div>
                  {plan.focus || plan.title}
                  <Badge className="ml-auto bg-purple-600 text-white">Week {plan.week}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-gray-300">
                  {plan.activities && plan.activities.length > 0 ? (
                    <ul className="list-disc list-inside space-y-2">
                      {plan.activities.map((activity: string, i: number) => (
                        <li key={i}>{activity}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>{plan.description || plan.focus || plan.title}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        
        <TabsContent value="weeks9-12" className="space-y-4">
          {(data.plan || []).filter((plan: any) => plan.week >= 9 && plan.week <= 12).map((plan: any, index: number) => (
            <Card key={index} className="bg-athlete-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <div className="bg-purple-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    {plan.week}
                  </div>
                  {plan.focus || plan.title}
                  <Badge className="ml-auto bg-purple-600 text-white">Week {plan.week}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-gray-300">
                  {plan.activities && plan.activities.length > 0 ? (
                    <ul className="list-disc list-inside space-y-2">
                      {plan.activities.map((activity: string, i: number) => (
                        <li key={i}>{activity}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>{plan.description || plan.focus || plan.title}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
    );
  };

  const renderNutritionPlan = (data: any) => (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <Card className="bg-gradient-to-r from-green-600/20 to-green-600/5 border-green-500/30">
          <CardContent className="p-6 text-center">
            <Heart className="mx-auto mb-4 text-green-400" size={48} />
            <h3 className="text-xl font-bold text-white">2,850</h3>
            <p className="text-gray-300">Daily Calories</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-blue-600/20 to-blue-600/5 border-blue-500/30">
          <CardContent className="p-6 text-center">
            <Flame className="mx-auto mb-4 text-blue-400" size={48} />
            <h3 className="text-xl font-bold text-white">180g</h3>
            <p className="text-gray-300">Daily Protein</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-orange-600/20 to-orange-600/5 border-orange-500/30">
          <CardContent className="p-6 text-center">
            <Clock className="mx-auto mb-4 text-orange-400" size={48} />
            <h3 className="text-xl font-bold text-white">5</h3>
            <p className="text-gray-300">Meals/Day</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {[
          {
            meal: "Pre-Training Breakfast",
            food: "Oatmeal with berries and almonds",
            calories: 450,
            timing: "2 hours before training",
            benefits: "Complex carbohydrates for sustained energy, antioxidants for recovery"
          },
          {
            meal: "Post-Workout Recovery",
            food: "Whey protein shake with banana",
            calories: 280,
            timing: "Within 15 minutes",
            benefits: "Fast-absorbing protein for muscle recovery, glycogen replenishment"
          },
          {
            meal: "Competition Day Lunch", 
            food: "Grilled chicken with quinoa and vegetables",
            calories: 520,
            timing: "3-4 hours before competition",
            benefits: "Lean protein, complex carbs, micronutrients for optimal performance"
          },
          {
            meal: "Evening Recovery Dinner",
            food: "Salmon with sweet potato and broccoli", 
            calories: 580,
            timing: "2-3 hours post-training",
            benefits: "Omega-3 fatty acids for inflammation reduction, slow-digesting carbs"
          }
        ].map((meal, index) => (
          <Card key={index} className="bg-athlete-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-white">
                <span>{meal.meal}</span>
                <Badge className="bg-green-600 text-white">{meal.calories} cal</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-athlete-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-athlete-accent mb-2">{meal.food}</h4>
                <div className="flex items-center text-sm text-gray-400 mb-2">
                  <Clock size={16} className="mr-2" />
                  {meal.timing}
                </div>
                <p className="text-gray-300 text-sm">{meal.benefits}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderBeatStrategies = (data: any) => (
    <div className="space-y-6">
      {[
        {
          opponent: "Power Kicker",
          strategy: "Counter the Power Kicker",
          description: "Against heavy kickers: Use distance management and timing. Stay just outside their optimal range, bait power kicks, then counter with quick combinations to the body.",
          tactics: ["Distance management", "Timing counters", "Body targeting", "Early point scoring"],
          effectiveness: 85
        },
        {
          opponent: "Pressure Fighter",
          strategy: "Neutralize the Pressure Fighter", 
          description: "Against constant forward pressure: Utilize circular footwork and pivot escapes. Use push kicks to create distance, target their advancing legs with cut kicks.",
          tactics: ["Circular footwork", "Push kicks", "Cut kicks", "Clinch escapes"],
          effectiveness: 78
        },
        {
          opponent: "Technical Fighter",
          strategy: "Outpoint the Technical Fighter",
          description: "Against technical opponents: Increase pace and variety. Use feints and rhythm changes to disrupt their timing. Score with unconventional techniques.",
          tactics: ["Pace variation", "Feint attacks", "Rhythm changes", "Unconventional techniques"],
          effectiveness: 82
        },
        {
          opponent: "Defensive Counter-Puncher",
          strategy: "Defeat the Defensive Counter-Puncher",
          description: "Against defensive fighters: Use combination attacks and continuous pressure. Fake attacks to draw out their counters, then counter their counters.",
          tactics: ["Combination attacks", "Continuous pressure", "Counter counters", "Superior conditioning"],
          effectiveness: 90
        }
      ].map((strategy, index) => (
        <Card key={index} className="bg-gradient-to-r from-red-600/20 to-red-600/5 border-red-500/30">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white">
              <div className="flex items-center">
                <Swords className="mr-3 text-red-400" size={24} />
                <span>vs {strategy.opponent}</span>
              </div>
              <Badge className={`${strategy.effectiveness >= 85 ? 'bg-green-600' : strategy.effectiveness >= 75 ? 'bg-orange-500' : 'bg-red-600'} text-white`}>
                {strategy.effectiveness}% Success
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-300 leading-relaxed">{strategy.description}</p>
            
            <div className="bg-athlete-gray-700 rounded-lg p-4">
              <h4 className="text-red-400 font-semibold mb-3">Key Tactics:</h4>
              <div className="grid grid-cols-2 gap-2">
                {strategy.tactics.map((tactic, tacticIndex) => (
                  <div key={tacticIndex} className="flex items-center text-sm">
                    <ChevronRight className="mr-2 text-red-400" size={16} />
                    <span className="text-gray-300">{tactic}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Effectiveness Rating</span>
                <span className="text-white">{strategy.effectiveness}%</span>
              </div>
              <Progress value={strategy.effectiveness} className="h-2" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderVideoAnalysis = (data: any) => (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <Card className="bg-gradient-to-r from-indigo-600/20 to-indigo-600/5 border-indigo-500/30">
          <CardContent className="p-6 text-center">
            <Video className="mx-auto mb-4 text-indigo-400" size={48} />
            <h3 className="text-xl font-bold text-white">500+</h3>
            <p className="text-gray-300">Kicks Analyzed</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-purple-600/20 to-purple-600/5 border-purple-500/30">
          <CardContent className="p-6 text-center">
            <Target className="mx-auto mb-4 text-purple-400" size={48} />
            <h3 className="text-xl font-bold text-white">94%</h3>
            <p className="text-gray-300">Technical Accuracy</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-green-600/20 to-green-600/5 border-green-500/30">
          <CardContent className="p-6 text-center">
            <TrendingUp className="mx-auto mb-4 text-green-400" size={48} />
            <h3 className="text-xl font-bold text-white">8.2</h3>
            <p className="text-gray-300">Avg Points/Match</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {[
          {
            title: "Technique Breakdown Analysis",
            type: "Technical",
            findings: "Analysis of 500+ kicks shows 94% technical accuracy with optimal hip rotation and chamber positioning. Exceptional ability to maintain form under fatigue.",
            recommendations: "Continue current technique maintenance. Add more variation in kick timing to increase unpredictability against elite opponents.",
            videoUrl: "https://example.com/seif-eissa-training-analysis"
          },
          {
            title: "Competition Performance Review",
            type: "Performance", 
            findings: "Won 18 of last 20 matches with average winning margin of 8.2 points. Shows consistent performance across different venues and opponent styles.",
            recommendations: "Focus on first-round dominance to avoid close decisions. Current strategy of building leads in rounds 2-3 is effective but risky against world-class opponents.",
            videoUrl: "https://example.com/seif-eissa-competition-highlights"
          },
          {
            title: "Psychological Performance Profile",
            type: "Mental",
            findings: "Heart rate remains stable under pressure (average 165 BPM during high-pressure moments vs 170 BPM training average). Excellent emotional control and focus.",
            recommendations: "Implement pre-competition visualization routines for Olympic-level pressure scenarios. Consider working with sports psychologist for peak performance mindset.",
            videoUrl: "https://example.com/seif-eissa-psychological-profile"
          }
        ].map((analysis, index) => (
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
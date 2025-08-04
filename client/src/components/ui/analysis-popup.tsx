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
  Heart, Zap, Shield, Brain, Flame, ChevronRight, Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface AnalysisPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: string;
  data: any;
  athleteName: string;
  createdAt?: string;
  shared?: boolean;
  shareUrl?: string;
}

export function AnalysisPopup({ 
  open, 
  onOpenChange, 
  type, 
  data, 
  athleteName,
  createdAt, 
  shared, 
  shareUrl 
}: AnalysisPopupProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const getIcon = (type: string) => {
    switch (type) {
      case 'bio': return <User className="text-athlete-accent" size={28} />;
      case 'rank': return <Trophy className="text-athlete-warning" size={28} />;
      case 'strengths': return <Star className="text-athlete-success" size={28} />;
      case 'weaknesses': return <AlertTriangle className="text-athlete-danger" size={28} />;
      case 'development': return <Calendar className="text-purple-400" size={28} />;
      case 'nutrition': return <Apple className="text-green-400" size={28} />;
      case 'beat': return <Swords className="text-red-400" size={28} />;
      case 'video': return <Video className="text-indigo-400" size={28} />;
      default: return <User className="text-athlete-accent" size={28} />;
    }
  };

  const getTitle = (type: string) => {
    switch (type) {
      case 'bio': return 'Complete Athlete Biography';
      case 'rank': return 'Ranking History & Analysis';
      case 'strengths': return 'Competitive Strengths Profile';
      case 'weaknesses': return 'Areas for Improvement';
      case 'development': return '12-Week Development Program';
      case 'nutrition': return 'Performance Nutrition Plan';
      case 'beat': return 'Strategic Combat Analysis';
      case 'video': return 'Dynamic Performance Analysis';
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

  const renderBioAnalysis = (data: any) => (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card className="bg-gradient-to-br from-athlete-gray-800 to-athlete-gray-700 border-athlete-accent/20">
            <CardContent className="p-6 text-center">
              <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-b from-athlete-accent to-blue-600 p-1 mb-4">
                <img 
                  src="https://images.unsplash.com/photo-1555597673-b21d5c935865?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500"
                  alt={athleteName}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{athleteName}</h3>
              <Badge className="bg-athlete-accent text-white mb-4">Elite Taekwondo Champion</Badge>
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div className="text-center">
                  <div className="text-athlete-warning font-bold text-xl">#2</div>
                  <div className="text-gray-400">World Rank</div>
                </div>
                <div className="text-center">
                  <div className="text-athlete-success font-bold text-xl">41-6</div>
                  <div className="text-gray-400">Career Record</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-athlete-gray-700 rounded p-2">
                  <div className="text-athlete-accent font-bold">87.2%</div>
                  <div className="text-gray-400">Win Rate</div>
                </div>
                <div className="bg-athlete-gray-700 rounded p-2">
                  <div className="text-athlete-warning font-bold">8.6</div>
                  <div className="text-gray-400">Avg Points</div>
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
                Championship Achievements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <span className="text-gray-300">Egyptian National Champion</span>
                <Badge className="bg-athlete-warning text-black">2024</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <span className="text-gray-300">International Gold Medals</span>
                <Badge className="bg-athlete-success text-white">3 Golds, 5 Silver</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <span className="text-gray-300">Undefeated Streak (-80kg)</span>
                <Badge className="bg-athlete-accent text-white">Current Season</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <span className="text-gray-300">Olympic Qualification</span>
                <Badge className="bg-green-600 text-white">Qualified</Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-300">International Competitions</span>
                <Badge className="bg-purple-600 text-white">47 Tournaments</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-athlete-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Elite Athletic Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 leading-relaxed mb-4">
                Elite Egyptian Taekwondo athlete and Olympic hopeful with world-class technical precision and tactical intelligence. 
                Known for lightning-fast combinations (0.8s triple kicks), tactical brilliance (identifies opponent weaknesses in 94 seconds), 
                and exceptional mental fortitude (15 comeback victories from 5+ point deficits).
              </p>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div className="bg-athlete-gray-700 rounded-lg p-3">
                  <h4 className="text-athlete-accent font-semibold mb-2">Physical Stats</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-gray-400">Peak Kick Speed:</span><span className="text-white">186 km/h</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Reaction Time:</span><span className="text-white">0.12 seconds</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">VO2 Max:</span><span className="text-white">64.2 ml/kg/min</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Body Fat:</span><span className="text-white">8.1%</span></div>
                  </div>
                </div>
                <div className="bg-athlete-gray-700 rounded-lg p-3">
                  <h4 className="text-athlete-success font-semibold mb-2">Competition Excellence</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-gray-400">Counter-Attack Rate:</span><span className="text-white">78%</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Technical Accuracy:</span><span className="text-white">94.2%</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Focus Under Pressure:</span><span className="text-white">94%</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Countries Competed:</span><span className="text-white">15</span></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderRankAnalysis = (data: any) => (
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
              <RankChart data={[
                { date: '2023-01', rank: 15 },
                { date: '2023-07', rank: 6 },
                { date: '2024-01', rank: 2 },
                { date: '2024-05', rank: 1 },
                { date: '2024-12', rank: 2 }
              ]} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-gradient-to-r from-athlete-success/20 to-athlete-success/5 border-athlete-success/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Peak Ranking</h3>
                  <p className="text-gray-400">World #1 (May 2024)</p>
                </div>
                <div className="text-4xl font-bold text-athlete-success">#1</div>
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

  const renderStrengthsAnalysis = (data: any) => {
    // Handle both array and object formats
    const strengthsArray = Array.isArray(data) ? data : (data.strengths || []);
    
    return (
      <div className="space-y-4">
        {strengthsArray.map((strength: any, index: number) => {
        const performanceValues = [95, 92, 89, 94, 96, 93, 87, 91];
        const performanceValue = performanceValues[index] || 90;
        const impactLevel = performanceValue >= 94 ? "Elite" : performanceValue >= 90 ? "High" : "Moderate";
        const impactColor = performanceValue >= 94 ? "text-yellow-400" : performanceValue >= 90 ? "text-green-400" : "text-blue-400";
        
        return (
          <Card key={index} className="bg-athlete-gray-800 border-green-500/20 hover:border-green-500/40 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="bg-green-500/20 rounded-full p-2 mr-3">
                    <Star className="text-green-500" size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{strength.title}</h3>
                    <div className="flex items-center space-x-3">
                      <Badge className="bg-green-600 text-white text-xs">Core Strength</Badge>
                      <span className={`text-sm font-semibold ${impactColor}`}>{impactLevel} Impact</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-400">{performanceValue}%</div>
                  <div className="text-xs text-gray-400">Performance</div>
                </div>
              </div>
              
              <p className="text-gray-300 leading-relaxed mb-4">{strength.description}</p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Competitive Advantage</span>
                    <span className="text-green-400 font-semibold">{performanceValue}%</span>
                  </div>
                  <Progress value={performanceValue} className="h-2 mb-3" />
                </div>
                <div className="bg-athlete-gray-700 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Strategic Importance</div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white font-medium">{impactLevel} Priority</span>
                    <div className="flex space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <div 
                          key={i} 
                          className={`w-2 h-2 rounded-full ${
                            i < Math.ceil(performanceValue / 20) ? 'bg-green-500' : 'bg-gray-600'
                          }`} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
        })}
      </div>
    );
  };

  const renderWeaknessesAnalysis = (data: any) => {
    // Handle both array and object formats
    const weaknessesArray = Array.isArray(data) ? data : (data.weaknesses || []);
    
    return (
      <div className="space-y-4">
        {weaknessesArray.map((weakness: any, index: number) => {
        const impactLevels = ["High", "High", "Medium", "Medium", "Low"];
        const impactLevel = impactLevels[index] || "Medium";
        const impactColor = impactLevel === "High" ? "bg-red-600" : impactLevel === "Medium" ? "bg-orange-500" : "bg-yellow-500";
        const riskScore = impactLevel === "High" ? 85 : impactLevel === "Medium" ? 65 : 45;
        
        return (
          <Card key={index} className="bg-athlete-gray-800 border-red-500/20 hover:border-red-500/40 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="bg-red-500/20 rounded-full p-2 mr-3">
                    <AlertTriangle className="text-red-500" size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{weakness.title}</h3>
                    <div className="flex items-center space-x-3">
                      <Badge className={`${impactColor} text-white text-xs`}>{impactLevel} Impact</Badge>
                      <span className="text-sm font-semibold text-red-400">Risk Score: {riskScore}%</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-400">{riskScore}%</div>
                  <div className="text-xs text-gray-400">Risk Level</div>
                </div>
              </div>
              
              <p className="text-gray-300 leading-relaxed mb-4">{weakness.description}</p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Vulnerability Level</span>
                    <span className="text-red-400 font-semibold">{riskScore}%</span>
                  </div>
                  <Progress value={riskScore} className="h-2 mb-3" />
                </div>
                <div className="bg-athlete-gray-700 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Improvement Priority</div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white font-medium">{impactLevel} Priority</span>
                    <div className="flex space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <div 
                          key={i} 
                          className={`w-2 h-2 rounded-full ${
                            i < Math.ceil(riskScore / 20) ? 'bg-red-500' : 'bg-gray-600'
                          }`} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="text-blue-400 font-semibold mb-2 flex items-center">
                  <Target className="mr-2" size={16} />
                  Targeted Improvement Strategy
                </h4>
                <p className="text-gray-300 text-sm">
                  {impactLevel === "High" 
                    ? `Critical area requiring immediate attention. Implement specialized training protocols with daily focus sessions.`
                    : impactLevel === "Medium" 
                    ? `Important weakness needing structured improvement plan with 3-4 weekly training sessions.`
                    : `Minor area for gradual improvement through regular practice and monitoring.`}
                </p>
              </div>
            </CardContent>
          </Card>
        );
        })}
      </div>
    );
  };

  const renderDevelopmentPlan = (data: any) => {
    // Handle both array and object formats - data is now directly an array from backend
    const plansArray = Array.isArray(data) ? data : (data.plan || data.plans || []);
    
    console.log('Development Plan Debug:', { data, plansArray, isArray: Array.isArray(data) });
    
    if (!plansArray || plansArray.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-400">No development plan data available</p>
          <p className="text-xs text-gray-500 mt-2">Debug: {JSON.stringify(data)}</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-r from-purple-600/20 to-purple-600/5 border-purple-500/30">
            <CardContent className="p-4 text-center">
              <Calendar className="mx-auto mb-3 text-purple-400" size={36} />
              <h3 className="text-lg font-bold text-white mb-1">12-Week Program</h3>
              <p className="text-gray-300 text-sm">Olympic preparation cycle</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-athlete-accent/20 to-athlete-accent/5 border-athlete-accent/30">
            <CardContent className="p-4 text-center">
              <Target className="mx-auto mb-3 text-athlete-accent" size={36} />
              <h3 className="text-lg font-bold text-white mb-1">Elite Training</h3>
              <p className="text-gray-300 text-sm">World-class protocols</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-green-600/20 to-green-600/5 border-green-500/30">
            <CardContent className="p-4 text-center">
              <TrendingUp className="mx-auto mb-3 text-green-400" size={36} />
              <h3 className="text-lg font-bold text-white mb-1">Performance</h3>
              <p className="text-gray-300 text-sm">Measurable improvements</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {plansArray.length > 0 ? (
            <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-400 text-sm">✓ Found {plansArray.length} development plans</p>
            </div>
          ) : (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">⚠ No plans found in array</p>
            </div>
          )}
          {plansArray.map((plan: any, index: number) => {
            const weekNumber = (index % 12) + 1;
            const phaseColors = [
              "border-blue-500/30 bg-blue-500/10",
              "border-green-500/30 bg-green-500/10", 
              "border-purple-500/30 bg-purple-500/10",
              "border-yellow-500/30 bg-yellow-500/10",
              "border-red-500/30 bg-red-500/10",
              "border-cyan-500/30 bg-cyan-500/10",
              "border-pink-500/30 bg-pink-500/10",
              "border-orange-500/30 bg-orange-500/10",
              "border-indigo-500/30 bg-indigo-500/10",
              "border-teal-500/30 bg-teal-500/10"
            ];
            const colorClass = phaseColors[index % phaseColors.length];
            
            return (
              <Card key={index} className={`bg-athlete-gray-800 ${colorClass} hover:bg-opacity-20 transition-all`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="bg-purple-500/20 rounded-full p-2 mr-3">
                        <Calendar className="text-purple-400" size={20} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{plan.title}</h3>
                        <div className="flex items-center space-x-3">
                          <Badge className="bg-purple-600 text-white text-xs">Week {plan.week || weekNumber}</Badge>
                          <span className="text-sm text-purple-400 font-medium">Olympic Preparation</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-purple-400">Phase {Math.ceil(weekNumber / 3)}</div>
                      <div className="text-xs text-gray-400">Training Block</div>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 leading-relaxed mb-4">{plan.description}</p>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-athlete-gray-700 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Training Focus</div>
                      <div className="text-sm text-white font-medium">
                        {index < 4 ? "Foundation Building" : 
                         index < 8 ? "Skill Development" : "Peak Performance"}
                      </div>
                    </div>
                    <div className="bg-athlete-gray-700 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Intensity Level</div>
                      <div className="flex items-center">
                        <span className="text-sm text-white font-medium mr-2">
                          {index < 3 ? "Moderate" : index < 8 ? "High" : "Peak"}
                        </span>
                        <div className="flex space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <div 
                              key={i} 
                              className={`w-2 h-2 rounded-full ${
                                i < (index < 3 ? 3 : index < 8 ? 4 : 5) ? 'bg-purple-500' : 'bg-gray-600'
                              }`} 
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="bg-athlete-gray-700 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Expected Outcome</div>
                      <div className="text-sm text-green-400 font-medium">
                        {index < 4 ? "Base Improvement" : 
                         index < 8 ? "Skill Mastery" : "Competition Ready"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
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

  const renderBeatStrategies = (data: any) => {
    // Handle both array and object formats - data is now directly an array from backend
    const strategiesArray = Array.isArray(data) ? data : (data.strategies || []);
    
    console.log('Beat Strategies Debug:', { data, strategiesArray, isArray: Array.isArray(data) });
    
    if (!strategiesArray || strategiesArray.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-400">No beat strategies data available</p>
          <p className="text-xs text-gray-500 mt-2">Debug: {JSON.stringify(data)}</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-r from-red-600/20 to-red-600/5 border-red-500/30">
            <CardContent className="p-4 text-center">
              <Swords className="mx-auto mb-3 text-red-400" size={36} />
              <h3 className="text-lg font-bold text-white mb-1">Combat Strategies</h3>
              <p className="text-gray-300 text-sm">Elite tactical analysis</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-orange-600/20 to-orange-600/5 border-orange-500/30">
            <CardContent className="p-4 text-center">
              <Target className="mx-auto mb-3 text-orange-400" size={36} />
              <h3 className="text-lg font-bold text-white mb-1">Success Rate</h3>
              <p className="text-gray-300 text-sm">86% average effectiveness</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-blue-600/20 to-blue-600/5 border-blue-500/30">
            <CardContent className="p-4 text-center">
              <Shield className="mx-auto mb-3 text-blue-400" size={36} />
              <h3 className="text-lg font-bold text-white mb-1">Opponent Types</h3>
              <p className="text-gray-300 text-sm">Comprehensive coverage</p>
            </CardContent>
          </Card>
        </div>

        {strategiesArray.length > 0 ? (
          <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-green-400 text-sm">✓ Found {strategiesArray.length} beat strategies</p>
          </div>
        ) : (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">⚠ No strategies found in array</p>
          </div>
        )}
        {strategiesArray.map((strategy: any, index: number) => {
          const effectivenessRates = [88, 92, 85, 90, 87, 94, 89, 91, 86, 93];
          const effectiveness = effectivenessRates[index] || 85;
          const strategyColors = [
            "border-red-500/30 bg-red-500/10",
            "border-orange-500/30 bg-orange-500/10",
            "border-yellow-500/30 bg-yellow-500/10",
            "border-green-500/30 bg-green-500/10",
            "border-blue-500/30 bg-blue-500/10",
            "border-purple-500/30 bg-purple-500/10",
            "border-pink-500/30 bg-pink-500/10",
            "border-indigo-500/30 bg-indigo-500/10",
            "border-cyan-500/30 bg-cyan-500/10",
            "border-teal-500/30 bg-teal-500/10"
          ];
          const colorClass = strategyColors[index % strategyColors.length];
          
          return (
            <Card key={index} className={`bg-athlete-gray-800 ${colorClass} hover:bg-opacity-20 transition-all`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="bg-red-500/20 rounded-full p-2 mr-3">
                      <Swords className="text-red-400" size={20} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{strategy.title}</h3>
                      <div className="flex items-center space-x-3">
                        <Badge className="bg-red-600 text-white text-xs">Combat Strategy</Badge>
                        <span className="text-sm text-red-400 font-medium">Elite Level</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-400">{effectiveness}%</div>
                    <div className="text-xs text-gray-400">Success Rate</div>
                  </div>
                </div>
                
                <p className="text-gray-300 leading-relaxed mb-4">{strategy.description}</p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-athlete-gray-700 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Strategy Type</div>
                    <div className="text-sm text-white font-medium">
                      {index % 4 === 0 ? "Offensive Pressure" : 
                       index % 4 === 1 ? "Counter-Attack" : 
                       index % 4 === 2 ? "Technical Control" : "Defensive Mastery"}
                    </div>
                  </div>
                  <div className="bg-athlete-gray-700 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Effectiveness</div>
                    <div className="flex items-center">
                      <span className="text-sm text-white font-medium mr-2">
                        {effectiveness >= 90 ? "Elite" : effectiveness >= 85 ? "High" : "Moderate"}
                      </span>
                      <div className="flex space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <div 
                            key={i} 
                            className={`w-2 h-2 rounded-full ${
                              i < Math.ceil(effectiveness / 20) ? 'bg-red-500' : 'bg-gray-600'
                            }`} 
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <h4 className="text-blue-400 font-semibold mb-2 flex items-center">
                    <Target className="mr-2" size={16} />
                    Tactical Implementation
                  </h4>
                  <p className="text-gray-300 text-sm">
                    {effectiveness >= 90 
                      ? "Master-level strategy requiring precise timing and exceptional technical skill execution."
                      : effectiveness >= 85 
                      ? "Advanced strategy suitable for elite competition with consistent training application."
                      : "Foundational strategy effective against most opponents with proper preparation."}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };


  const renderVideoAnalysis = (data: any) => {
    // Handle both array and object formats - data is now directly an array from backend
    const analysisArray = Array.isArray(data) ? data : (data.videos || data.analysis || []);
    
    console.log('Video Analysis Debug:', { data, analysisArray, isArray: Array.isArray(data) });
    
    if (!analysisArray || analysisArray.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-400">No video analysis data available</p>
          <p className="text-xs text-gray-500 mt-2">Debug: {JSON.stringify(data)}</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-r from-indigo-600/20 to-indigo-600/5 border-indigo-500/30">
            <CardContent className="p-4 text-center">
              <Video className="mx-auto mb-3 text-indigo-400" size={32} />
              <h3 className="text-lg font-bold text-white mb-1">500+</h3>
              <p className="text-gray-300 text-xs">Kicks Analyzed</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-purple-600/20 to-purple-600/5 border-purple-500/30">
            <CardContent className="p-4 text-center">
              <Target className="mx-auto mb-3 text-purple-400" size={32} />
              <h3 className="text-lg font-bold text-white mb-1">94%</h3>
              <p className="text-gray-300 text-xs">Technical Accuracy</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-green-600/20 to-green-600/5 border-green-500/30">
            <CardContent className="p-4 text-center">
              <TrendingUp className="mx-auto mb-3 text-green-400" size={32} />
              <h3 className="text-lg font-bold text-white mb-1">8.2</h3>
              <p className="text-gray-300 text-xs">Avg Points/Match</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-yellow-600/20 to-yellow-600/5 border-yellow-500/30">
            <CardContent className="p-4 text-center">
              <Eye className="mx-auto mb-3 text-yellow-400" size={32} />
              <h3 className="text-lg font-bold text-white mb-1">AI</h3>
              <p className="text-gray-300 text-xs">Powered Analysis</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {analysisArray.length > 0 ? (
            <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-400 text-sm">✓ Found {analysisArray.length} video analyses</p>
            </div>
          ) : (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">⚠ No analyses found in array</p>
            </div>
          )}
          {analysisArray.map((analysis: any, index: number) => {
            const analysisTypes = ["Technical", "Performance", "Mental", "Tactical", "Physical"];
            const analysisType = analysisTypes[index % analysisTypes.length];
            const accuracyScores = [96, 94, 91, 93, 95, 92, 89, 97, 88, 90];
            const accuracy = accuracyScores[index] || 92;
            
            const typeColors = {
              "Technical": "border-blue-500/30 bg-blue-500/10",
              "Performance": "border-green-500/30 bg-green-500/10",
              "Mental": "border-purple-500/30 bg-purple-500/10",
              "Tactical": "border-red-500/30 bg-red-500/10",
              "Physical": "border-orange-500/30 bg-orange-500/10"
            };
            
            const colorClass = typeColors[analysisType as keyof typeof typeColors] || "border-gray-500/30 bg-gray-500/10";
            
            return (
              <Card key={index} className={`bg-athlete-gray-800 ${colorClass} hover:bg-opacity-20 transition-all`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="bg-indigo-500/20 rounded-full p-2 mr-3">
                        <Video className="text-indigo-400" size={20} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{analysis.title}</h3>
                        <div className="flex items-center space-x-3">
                          <Badge className={`text-white text-xs ${
                            analysisType === 'Technical' ? 'bg-blue-600' : 
                            analysisType === 'Performance' ? 'bg-green-600' : 
                            analysisType === 'Mental' ? 'bg-purple-600' :
                            analysisType === 'Tactical' ? 'bg-red-600' : 'bg-orange-600'
                          }`}>
                            {analysisType} Analysis
                          </Badge>
                          <span className="text-sm text-indigo-400 font-medium">AI-Powered</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-indigo-400">{accuracy}%</div>
                      <div className="text-xs text-gray-400">Accuracy Score</div>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 leading-relaxed mb-4">{analysis.description}</p>
                  
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-athlete-gray-700 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Analysis Type</div>
                      <div className="text-sm text-white font-medium">{analysisType}</div>
                    </div>
                    <div className="bg-athlete-gray-700 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Accuracy Level</div>
                      <div className="flex items-center">
                        <span className="text-sm text-white font-medium mr-2">
                          {accuracy >= 95 ? "Elite" : accuracy >= 90 ? "High" : "Standard"}
                        </span>
                        <div className="flex space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <div 
                              key={i} 
                              className={`w-2 h-2 rounded-full ${
                                i < Math.ceil(accuracy / 20) ? 'bg-indigo-500' : 'bg-gray-600'
                              }`} 
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="bg-athlete-gray-700 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Video Quality</div>
                      <div className="text-sm text-green-400 font-medium">HD Professional</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-athlete-accent/20 to-athlete-accent/5 rounded-lg p-4 border border-athlete-accent/30">
                    <h4 className="text-athlete-accent font-semibold mb-2 flex items-center">
                      <Eye className="mr-2" size={16} />
                      AI Insights & Recommendations
                    </h4>
                    <p className="text-gray-300 text-sm">
                      {accuracy >= 95 
                        ? "Exceptional performance metrics indicate world-class execution. Maintain current training protocols with minor tactical adjustments."
                        : accuracy >= 90 
                        ? "Strong performance foundation with identified areas for Olympic-level refinement and strategic enhancement."
                        : "Solid technical base requiring focused improvement in key performance areas for elite competition readiness."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };


  const renderContent = () => {
    switch (type) {
      case 'bio': return renderBioAnalysis(data);
      case 'rank': return renderRankAnalysis(data);
      case 'strengths': return renderStrengthsAnalysis(data);
      case 'weaknesses': return renderWeaknessesAnalysis(data);
      case 'development': return renderDevelopmentPlan(data);
      case 'nutrition': return renderNutritionPlan(data);
      case 'beat': return renderBeatStrategies(data);
      case 'video': return renderVideoAnalysis(data);
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
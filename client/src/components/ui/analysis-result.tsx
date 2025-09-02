import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RankChart } from "./rank-chart";
import { Download, Share2, User, Trophy, Star, AlertTriangle, Calendar, Swords, Video, Award, TrendingUp, Clock, Target, PlayCircle, Zap, Shield, CheckCircle, BarChart, Medal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AnalysisResultProps {
  type: string;
  data: any;
  createdAt?: string;
  shared?: boolean;
  shareUrl?: string;
}

export function AnalysisResult({ type, data, createdAt, shared, shareUrl }: AnalysisResultProps) {
  const { toast } = useToast();

  // Utility function to parse data that might be stored as JSON strings
  const parseAnalysisData = (rawData: any) => {
    if (typeof rawData === 'string') {
      try {
        return JSON.parse(rawData);
      } catch (e) {
        return rawData;
      }
    }
    return rawData;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'bio': return <User className="text-athlete-accent" size={24} />;
      case 'rank': return <Trophy className="text-athlete-warning" size={24} />;
      case 'strengths': return <Star className="text-athlete-success" size={24} />;
      case 'weaknesses': return <AlertTriangle className="text-athlete-danger" size={24} />;
      case 'development': return <Calendar className="text-purple-400" size={24} />;

      case 'beat': return <Swords className="text-red-400" size={24} />;
      case 'video': return <Video className="text-indigo-400" size={24} />;
      default: return <User className="text-athlete-accent" size={24} />;
    }
  };

  const getTitle = (type: string) => {
    switch (type) {
      case 'bio': return 'Athlete Biography';
      case 'rank': return 'Ranking Analysis';
      case 'strengths': return 'Strengths Analysis';
      case 'weaknesses': return 'Weaknesses Analysis';
      case 'development': return 'Development Plan';

      case 'beat': return 'Beat Strategies';
      case 'video': return 'Video Analysis';
      default: return 'Analysis Result';
    }
  };

  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Your PDF export is being generated...",
    });
    // TODO: Implement actual PDF export using react-pdf or similar
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

  // Helper function to get medal icon based on medal type
  const getMedalIcon = (medal: string) => {
    if (medal === 'Gold') {
      return <Medal className="w-5 h-5 text-yellow-500" />;
    } else if (medal === 'Silver') {
      return <Medal className="w-5 h-5 text-gray-300" />;
    } else if (medal === 'Bronze') {
      return <Medal className="w-5 h-5 text-amber-600" />;
    } else {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
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
    const playersStory = bioData.playersStory || "";
    const rank = bioData.currentRank || bioData.rank || "N/A";
    const achievements = Array.isArray(bioData.achievements) ? bioData.achievements : [];
    const recentNews = bioData.personalInfo?.recentNews || bioData.recentNews || [];
    const profileImageUrl = bioData.profileImageUrl;
    
    // Debug logging for player's story
    console.log('Bio data received:', bioData);
    console.log('Players story extracted:', playersStory);
    
    // Parse bio content to extract different sections
    const bioSections = parseBioSections(bio);

    // Always render structured sections - never show raw JSON
    return (
      <div className="space-y-8">
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
              Career Rank #{rank}
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
        {(playersStory || bioSections.overallStory) && (
          <Card className="bg-gradient-to-r from-athlete-gray-800 to-athlete-gray-700 border-l-4 border-l-cyan-400 border-gray-600 shadow-xl">
            <CardContent className="p-8">
              <h3 className="text-3xl font-bold text-cyan-400 mb-6 flex items-center">
                <Star className="mr-4 text-cyan-400" size={32} />
                Player's Story
              </h3>
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-200 leading-relaxed text-lg">{playersStory || bioSections.overallStory}</p>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Debug Info - Remove after testing */}
        {process.env.NODE_ENV === 'development' && (
          <div className="p-4 bg-red-900 text-white text-xs">
            <p>Debug: playersStory = "{playersStory}"</p>
            <p>Debug: bioSections.overallStory = "{bioSections.overallStory}"</p>
          </div>
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
                {achievements.map((achievement: any, index: number) => {
                  // Handle both old string format and new object format
                  const achievementText = typeof achievement === 'string' ? achievement : achievement.achievement;
                  const medalType = typeof achievement === 'object' && achievement.medal ? achievement.medal : 'Participation';
                  
                  return (
                    <div 
                      key={index}
                      className="flex items-start space-x-4 p-4 bg-athlete-gray-600 rounded-xl border border-athlete-warning/20"
                      data-testid={`achievement-item-${index}`}
                    >
                      <div className="mt-1 flex-shrink-0">
                        {getMedalIcon(medalType)}
                      </div>
                      <p className="text-gray-200 leading-relaxed text-lg font-medium">
                        {achievementText}
                      </p>
                    </div>
                  );
                })}
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
                {recentNews.map((newsItem: string, index: number) => (
                  <div 
                    key={index}
                    className="p-6 bg-athlete-gray-600 rounded-xl border-l-4 border-purple-400 shadow-lg"
                  >
                    <p className="text-gray-200 leading-relaxed text-lg font-medium">
                      {newsItem}
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

  const renderRankAnalysis = (data: any) => {
    console.log('Frontend Rank Data RECEIVED:', JSON.stringify(data, null, 2));
    
    // Parse data with comprehensive fallback strategies for adaptive UI
    const parsedData = parseAnalysisData(data);
    
    // Handle different data formats and error states
    if (parsedData.error || parsedData.message?.includes('Unable to generate')) {
      return (
        <div className="p-6 text-center">
          <div className="text-red-400 mb-4">⚠ Rank Analysis Unavailable</div>
          <p className="text-gray-300 mb-4">
            {parsedData.message || 'Unable to generate authentic rank history at this time.'}
          </p>
          <p className="text-sm text-gray-400">
            Please try again later or contact support if the issue persists.
          </p>
        </div>
      );
    }

    // Adaptive data extraction for multiple JSON formats
    let athlete, rankingProgression, careerSummary;
    
    // Format 1: New enhanced structure (athlete, rankingProgression, careerSummary)
    if (parsedData.athlete && parsedData.rankingProgression !== undefined && parsedData.careerSummary) {
      athlete = parsedData.athlete;
      rankingProgression = parsedData.rankingProgression;
      careerSummary = parsedData.careerSummary;
    }
    // Format 2: Old synthetic structure (currentRank, peakRank, history, recommendations)
    else if (parsedData.currentRank || parsedData.peakRank || parsedData.history) {
      athlete = {
        name: 'Unknown Athlete',
        nationality: 'N/A',
        sport: 'N/A',
        currentRanking: parsedData.currentRank,
        peakRanking: parsedData.peakRank,
        officialRecord: parsedData.competitionRecord || 'N/A',
        isActive: true
      };
      rankingProgression = parsedData.history || [];
      careerSummary = {
        totalCompetitions: 'N/A',
        majorTitles: 'N/A',
        rankingTrend: 'N/A',
        notableAchievements: parsedData.recommendations || [],
        currentForm: 'Legacy data format'
      };
    }
    // Format 3: Unknown/unrecognized structure - show debug info
    else {
      return (
        <div className="p-6">
          <div className="text-yellow-400 mb-4 text-center">⚠ Unrecognized Rank Data Format</div>
          <p className="text-gray-300 mb-4 text-center">
            The ranking data structure is not recognized. Please check the backend response format.
          </p>
          <div className="bg-gray-800 p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-400 mb-2">Raw Data Structure:</h4>
            <pre className="text-xs text-gray-300 overflow-auto max-h-40 whitespace-pre-wrap">
              {JSON.stringify(parsedData, null, 2)}
            </pre>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Career Overview Stats */}
        <Card className="bg-gradient-to-r from-athlete-gray-800 to-athlete-gray-700 border-l-4 border-l-blue-400 border-gray-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-3xl font-bold text-blue-400 flex items-center">
                <Trophy className="mr-3" size={28} />
                Career Overview
              </h3>
              {athlete.isActive && (
                <Badge variant="default" className="bg-green-600 text-white px-3 py-1">
                  Active
                </Badge>
              )}
            </div>
            
            <div className="grid md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-athlete-gray-600 rounded-lg border border-blue-500/20">
                <div className="text-2xl font-bold text-white">{athlete.currentRanking || 'N/A'}</div>
                <div className="text-sm text-blue-300">Current Rank</div>
              </div>
              <div className="text-center p-4 bg-athlete-gray-600 rounded-lg border border-green-500/20">
                <div className="text-2xl font-bold text-green-400">{athlete.peakRanking || 'N/A'}</div>
                <div className="text-sm text-green-300">Peak Rank</div>
              </div>
              <div className="text-center p-4 bg-athlete-gray-600 rounded-lg border border-yellow-500/20">
                <div className="text-2xl font-bold text-yellow-400">{athlete.officialRecord || 'N/A'}</div>
                <div className="text-sm text-yellow-300">Record</div>
              </div>
              <div className="text-center p-4 bg-athlete-gray-600 rounded-lg border border-purple-500/20">
                <div className="text-2xl font-bold text-purple-400">{careerSummary.totalCompetitions || 'N/A'}</div>
                <div className="text-sm text-purple-300">Competitions</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ranking Progression Timeline */}
        {rankingProgression && rankingProgression.length > 0 && (
          <Card className="bg-athlete-gray-800 border-gray-600">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-100 flex items-center">
                <TrendingUp className="mr-3 text-blue-400" size={24} />
                Ranking Progression
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {rankingProgression.map((entry: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-athlete-gray-700 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-100">
                        {entry.competition || entry.tournament || `Event ${index + 1}`}
                      </div>
                      <div className="text-sm text-gray-400">
                        {entry.date || entry.month || 'Date unknown'} • {entry.result || entry.placement || 'Result unknown'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-white">#{entry.ranking || entry.rank || 'N/A'}</div>
                      {entry.rankingChange && (
                        <div className={`text-sm font-medium ${entry.rankingChange > 0 ? 'text-green-400' : entry.rankingChange < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                          {entry.rankingChange > 0 ? '↑' : entry.rankingChange < 0 ? '↓' : '→'} {Math.abs(entry.rankingChange)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Career Summary and Achievements */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-athlete-gray-800 border-gray-600">
            <CardHeader>
              <CardTitle className="text-xl text-gray-100 flex items-center">
                <Award className="mr-3 text-yellow-400" size={24} />
                Career Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-600">
                <span className="text-gray-300">Major Titles:</span>
                <span className="text-yellow-400 font-semibold">{careerSummary.majorTitles || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-600">
                <span className="text-gray-300">Ranking Trend:</span>
                <span className="text-blue-400 font-semibold">{careerSummary.rankingTrend || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-300">Current Form:</span>
                <span className="text-green-400 font-semibold">{careerSummary.currentForm || 'Data not available'}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-athlete-gray-800 border-gray-600">
            <CardHeader>
              <CardTitle className="text-xl text-gray-100 flex items-center">
                <Star className="mr-3 text-purple-400" size={24} />
                Notable Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {careerSummary.notableAchievements && careerSummary.notableAchievements.length > 0 ? (
                <ul className="space-y-3">
                  {careerSummary.notableAchievements.map((achievement: string, index: number) => (
                    <li key={index} className="flex items-start text-gray-300">
                      <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span className="text-sm">{achievement}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400 text-sm">No specific achievements data available</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
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

  const renderWeaknessesAnalysis = (data: any) => (
    <div className="space-y-4">
      {data.weaknesses?.map((weakness: any, index: number) => (
        <Card key={index} className="bg-athlete-gray-700 border-gray-600">
          <CardContent className="p-4">
            <h5 className="font-semibold text-athlete-danger mb-2">{weakness.title}</h5>
            <p className="text-sm text-gray-300">{weakness.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderDevelopmentPlan = (data: any) => {
    console.log('Frontend Development Plan Data RECEIVED:', JSON.stringify(data, null, 2));
    
    // Check for error state first
    if (data.error || data.message?.includes('Unable to generate')) {
      return (
        <div className="p-6 text-center">
          <div className="text-red-400 mb-4">⚠ Analysis Unavailable</div>
          <p className="text-gray-300 mb-4">
            {data.message || 'Unable to generate authentic development plan at this time.'}
          </p>
          <p className="text-sm text-gray-400">
            Please try again later or contact support if the issue persists.
          </p>
        </div>
      );
    }

    // Enhanced error handling for plan data
    let planItems: any[] = [];
    try {
      planItems = Array.isArray(data.plan) ? data.plan : [];
    } catch (error) {
      console.error('Error processing development plan data:', error);
      planItems = [];
    }

    return (
      <div className="space-y-6">
        {/* Header Section with Duration and Overview */}
        {data.duration && (
          <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg p-4 border border-purple-500/30">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Development Program</h3>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="bg-purple-600 text-white px-3 py-1">
                <Clock className="w-3 h-3 mr-1" />
                {data.duration}
              </Badge>
              {planItems.length > 0 && (
                <span className="text-sm text-purple-300">
                  {planItems.length} Phase{planItems.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Progress Timeline */}
        {planItems.length > 0 && (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 to-blue-500 opacity-30"></div>
            
            <div className="space-y-6">
              {planItems.map((item: any, index: number) => {
                const isCurrentPhase = index === 0; // You can add logic to determine current phase
                const phaseNumber = index + 1;
                
                return (
                  <Card 
                    key={index} 
                    className={`relative ml-8 ${
                      isCurrentPhase 
                        ? 'bg-gradient-to-br from-purple-900/50 to-blue-900/50 border-purple-500' 
                        : 'bg-athlete-gray-700 border-gray-600'
                    } hover:border-purple-400 transition-colors`}
                  >
                    {/* Phase Number Indicator */}
                    <div className={`absolute -left-12 top-6 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      isCurrentPhase 
                        ? 'bg-purple-600 text-white ring-4 ring-purple-600/30' 
                        : 'bg-gray-600 text-gray-300'
                    }`}>
                      {phaseNumber}
                    </div>

                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg text-white flex items-center gap-2">
                          <Target className="w-5 h-5 text-purple-400" />
                          {item.title || item.focus || item.phase || item.name || `Phase ${phaseNumber}`}
                        </CardTitle>
                        {isCurrentPhase && (
                          <Badge variant="secondary" className="bg-green-600 text-white">
                            <PlayCircle className="w-3 h-3 mr-1" />
                            Current
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-purple-200 bg-purple-900/30 p-3 rounded-lg italic border-l-4 border-purple-500">
                          {item.description}
                        </p>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Activities Section */}
                      {(item.activities || item.details || item.exercises || []).length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            Training Activities
                          </h4>
                          <div className="grid gap-2">
                            {(item.activities || item.details || item.exercises || []).map((activity: string, idx: number) => (
                              <div key={idx} className="flex items-start gap-3 p-2 bg-gray-800/50 rounded-lg">
                                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                                <span className="text-sm text-gray-300 leading-relaxed">{activity}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Objectives Section */}
                      {item.objectives && (
                        <div>
                          <h4 className="text-sm font-semibold text-blue-300 mb-3 flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Key Objectives
                          </h4>
                          <div className="grid gap-2">
                            {Array.isArray(item.objectives) ? item.objectives.map((objective: string, idx: number) => (
                              <div key={idx} className="flex items-start gap-3 p-2 bg-blue-900/20 rounded-lg border-l-2 border-blue-500">
                                <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-blue-100">{objective}</span>
                              </div>
                            )) : (
                              <div className="flex items-start gap-3 p-2 bg-blue-900/20 rounded-lg border-l-2 border-blue-500">
                                <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-blue-100">{item.objectives}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Metrics Section */}
                      {item.metrics && (
                        <div>
                          <h4 className="text-sm font-semibold text-green-300 mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Success Metrics
                          </h4>
                          <div className="grid gap-2">
                            {Array.isArray(item.metrics) ? item.metrics.map((metric: string, idx: number) => (
                              <div key={idx} className="flex items-start gap-3 p-2 bg-green-900/20 rounded-lg border-l-2 border-green-500">
                                <BarChart className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-green-100">{metric}</span>
                              </div>
                            )) : (
                              <div className="flex items-start gap-3 p-2 bg-green-900/20 rounded-lg border-l-2 border-green-500">
                                <BarChart className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-green-100">{item.metrics}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Duration for individual phases */}
                      {item.duration && (
                        <div className="pt-2 border-t border-gray-600">
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            Duration: {item.duration}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {planItems.length === 0 && (
          <div className="text-gray-400 text-center py-12">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-500" />
            <p className="text-lg font-medium mb-2">No development plan data available</p>
            <p className="text-sm">Generate a new analysis to see your personalized development program.</p>
          </div>
        )}
      </div>
    );
  };


  const renderBeatStrategies = (data: any) => {
    console.log('Frontend Beat Strategies Data RECEIVED:', JSON.stringify(data, null, 2));
    
    // Check for error state first
    if (data.error || data.message?.includes('Unable to generate')) {
      return (
        <div className="p-6 text-center">
          <div className="text-red-400 mb-4">⚠ Analysis Unavailable</div>
          <p className="text-gray-300 mb-4">
            {data.message || 'Unable to generate authentic strategic analysis at this time.'}
          </p>
          <p className="text-sm text-gray-400">
            Please try again later or contact support if the issue persists.
          </p>
        </div>
      );
    }

    // Enhanced error handling for strategies data
    let strategies: any[] = [];
    try {
      strategies = Array.isArray(data.strategies) ? data.strategies : [];
    } catch (error) {
      console.error('Error processing strategies data:', error);
      strategies = [];
    }

    return (
      <div>
        <div className="grid gap-4 mb-6">
          {strategies.length > 0 ? strategies.map((strategy: any, index: number) => {
            // Only render if we have authentic strategy data, no generic fallbacks
            if (!strategy.strategy && !strategy.title && !strategy.name) {
              return null; // Skip rendering generic entries
            }
            
            return (
              <Card key={index} className="bg-athlete-gray-700 border-gray-600">
                <CardContent className="p-4">
                  <h5 className="font-semibold text-red-400 mb-2">
                    {strategy.strategy || strategy.title || strategy.name}
                  </h5>
                  {strategy.description && (
                    <p className="text-sm text-gray-300">
                      {strategy.description}
                    </p>
                  )}
                  {strategy.details && (
                    <p className="text-sm text-gray-300 mt-2">
                      {strategy.details}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          }).filter(Boolean) : (
            <div className="text-gray-400 text-center py-8">
              No strategic analysis data available
            </div>
          )}
        </div>
        {data.keyWeaknesses && Array.isArray(data.keyWeaknesses) && data.keyWeaknesses.length > 0 && (
          <Card className="bg-athlete-gray-700 border-gray-600">
            <CardContent className="p-4">
              <h5 className="font-semibold text-athlete-warning mb-2">Key Weaknesses to Exploit</h5>
              <ul className="text-sm text-gray-300 space-y-1">
                {data.keyWeaknesses.map((weakness: string, index: number) => (
                  <li key={index}>• {weakness}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderVideoAnalysis = (data: any) => {
    console.log('Frontend Video Analysis Data RECEIVED:', JSON.stringify(data, null, 2));
    
    // Check for error state first
    if (data.error || data.message?.includes('Unable to generate')) {
      return (
        <div className="p-6 text-center">
          <div className="text-red-400 mb-4">⚠ Analysis Unavailable</div>
          <p className="text-gray-300 mb-4">
            {data.message || 'Unable to generate authentic video analysis at this time.'}
          </p>
          <p className="text-sm text-gray-400">
            Please try again later or contact support if the issue persists.
          </p>
        </div>
      );
    }

    // Parse the JSON strings from the backend
    const parseAnalysisData = (jsonString: string) => {
      try {
        return typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      } catch (error) {
        return { content: jsonString };
      }
    };

    const matchAnalysis = data.match_analysis ? parseAnalysisData(data.match_analysis) : null;
    const scoreAnalysis = data.score_analysis ? parseAnalysisData(data.score_analysis) : null;
    const kickAnalysis = data.kick_analysis ? parseAnalysisData(data.kick_analysis) : null;
    const punchAnalysis = data.punch_analysis ? parseAnalysisData(data.punch_analysis) : null;
    const yellowCardAnalysis = data.yellow_card_analysis ? parseAnalysisData(data.yellow_card_analysis) : null;

    return (
      <div className="space-y-6">
        {/* Analysis Header */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="bg-athlete-gray-700 border-gray-600">
            <CardContent className="p-4">
              <h5 className="font-semibold text-white mb-2">Video Analysis</h5>
              <div className="text-athlete-accent font-medium">
                Taekwondo Match Analysis
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Round {data.round || 1} Analysis
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-athlete-gray-700 border-gray-600">
            <CardContent className="p-4">
              <h5 className="font-semibold text-white mb-2">Analysis Types</h5>
              <div className="text-athlete-warning text-sm">
                5 Analysis Categories
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Match • Score • Kicks • Punches • Cards
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-athlete-gray-700 border-gray-600">
            <CardContent className="p-4">
              <h5 className="font-semibold text-white mb-2">Status</h5>
              <div className="text-green-400 text-sm">
                ✓ Analysis Complete
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {new Date().toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Match Analysis */}
        {matchAnalysis && (
          <Card className="bg-athlete-gray-700 border-gray-600">
            <CardContent className="p-5">
              <h4 className="font-semibold text-white mb-3 flex items-center">
                <Video className="mr-2" size={20} />
                Match Analysis
              </h4>
              <div className="text-gray-300 leading-relaxed">
                {typeof matchAnalysis === 'string' ? matchAnalysis : 
                 typeof matchAnalysis.content === 'string' ? matchAnalysis.content :
                 JSON.stringify(matchAnalysis, null, 2)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Additional Analysis Sections */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Score Analysis */}
          {scoreAnalysis && (
            <Card className="bg-athlete-gray-700 border-gray-600">
              <CardContent className="p-5">
                <h4 className="font-semibold text-white mb-3 flex items-center">
                  <Trophy className="mr-2 text-yellow-400" size={20} />
                  Score Analysis
                </h4>
                <div className="text-gray-300 leading-relaxed text-sm">
                  {typeof scoreAnalysis === 'string' ? scoreAnalysis : 
                   typeof scoreAnalysis.content === 'string' ? scoreAnalysis.content :
                   JSON.stringify(scoreAnalysis, null, 2)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Kick Analysis */}
          {kickAnalysis && (
            <Card className="bg-athlete-gray-700 border-gray-600">
              <CardContent className="p-5">
                <h4 className="font-semibold text-white mb-3 flex items-center">
                  <Swords className="mr-2 text-blue-400" size={20} />
                  Kick Analysis
                </h4>
                <div className="text-gray-300 leading-relaxed text-sm">
                  {typeof kickAnalysis === 'string' ? kickAnalysis : 
                   typeof kickAnalysis.content === 'string' ? kickAnalysis.content :
                   JSON.stringify(kickAnalysis, null, 2)}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Punch Analysis */}
          {punchAnalysis && (
            <Card className="bg-athlete-gray-700 border-gray-600">
              <CardContent className="p-5">
                <h4 className="font-semibold text-white mb-3 flex items-center">
                  <Star className="mr-2 text-red-400" size={20} />
                  Punch Analysis
                </h4>
                <div className="text-gray-300 leading-relaxed text-sm">
                  {typeof punchAnalysis === 'string' ? punchAnalysis : 
                   typeof punchAnalysis.content === 'string' ? punchAnalysis.content :
                   JSON.stringify(punchAnalysis, null, 2)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Yellow Card Analysis */}
          {yellowCardAnalysis && (
            <Card className="bg-athlete-gray-700 border-gray-600">
              <CardContent className="p-5">
                <h4 className="font-semibold text-white mb-3 flex items-center">
                  <AlertTriangle className="mr-2 text-yellow-400" size={20} />
                  Yellow Card Analysis
                </h4>
                <div className="text-gray-300 leading-relaxed text-sm">
                  {typeof yellowCardAnalysis === 'string' ? yellowCardAnalysis : 
                   typeof yellowCardAnalysis.content === 'string' ? yellowCardAnalysis.content :
                   JSON.stringify(yellowCardAnalysis, null, 2)}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  };

  const renderAnalysisContent = () => {
    if (!data) {
      return <div className="text-gray-400 text-center py-8">Analysis data not available</div>;
    }

    // Parse the data to handle JSON strings consistently
    const parsedData = parseAnalysisData(data);

    switch (type) {
      case 'bio': 
        return renderBioAnalysis(parsedData);
      case 'rank': return renderRankAnalysis(parsedData);
      case 'strengths': return renderStrengthsAnalysis(parsedData);
      case 'weaknesses': return renderWeaknessesAnalysis(parsedData);
      case 'development': return renderDevelopmentPlan(parsedData);

      case 'beat': return renderBeatStrategies(parsedData);
      case 'video': return renderVideoAnalysis(parsedData);
      default: 
        console.log('UNSUPPORTED TYPE - showing raw data:', type);
        return (
          <div className="text-gray-400 text-center py-8">
            <p>Unsupported analysis type: {type}</p>
            <pre className="text-xs mt-4 text-left">{JSON.stringify(data, null, 2)}</pre>
          </div>
        );
    }
  };

  return (
    <Card className="bg-athlete-gray-800 border-gray-700">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {getIcon(type)}
            <div>
              <CardTitle className="text-white">{getTitle(type)}</CardTitle>
              {createdAt && (
                <p className="text-sm text-gray-400 mt-1">
                  Generated on {new Date(createdAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={handleExport}
              data-testid={`button-export-${type}`}
              size="sm"
              className="bg-athlete-success hover:bg-green-600 text-white"
            >
              <Download className="mr-2" size={16} />
              Export PDF
            </Button>
            <Button 
              onClick={handleShare}
              data-testid={`button-share-${type}`}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Share2 className="mr-2" size={16} />
              Share
            </Button>
          </div>
        </div>
        {shared && (
          <Badge variant="secondary" className="w-fit bg-athlete-success text-white">
            Shared
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {renderAnalysisContent()}
      </CardContent>
    </Card>
  );
}

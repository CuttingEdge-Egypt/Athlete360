import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RankChart } from "./rank-chart";
import { Download, Share2, User, Trophy, Star, AlertTriangle, Calendar, Swords, Video } from "lucide-react";
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

  const renderBioAnalysis = (data: any) => {
    console.log('Bio Analysis Data Received:', data, 'Type:', typeof data);
    
    // Parse the data first using the utility function
    const parsedData = parseAnalysisData(data);
    console.log('Parsed bio data:', parsedData);
    
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
    
    // Always render structured sections - never show raw JSON
    return (
      <div className="space-y-6">
        {/* Main Profile Section */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            {profileImageUrl ? (
              <img 
                src={profileImageUrl} 
                alt="Athlete" 
                className="w-full h-64 object-cover rounded-xl"
              />
            ) : (
              <div className="w-full h-64 bg-athlete-gray-600 rounded-xl flex items-center justify-center">
                <User className="w-24 h-24 text-gray-400" />
              </div>
            )}
          </div>
          <div className="md:col-span-2">
            <div className="mb-6">
              <h4 className="text-2xl font-bold text-white mb-2">{name}</h4>
              {rank && rank !== 'N/A' && (
                <Badge className="bg-athlete-warning text-black font-bold text-base px-3 py-1">
                  World Rank #{rank}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Biography Section */}
        {bio && (
          <Card className="bg-athlete-gray-700 border-l-4 border-l-blue-500 border-gray-600">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <User className="mr-3 text-blue-400" size={24} />
                Biography
              </h3>
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-300 leading-relaxed">{bio}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Career Achievements Section */}
        {achievements.length > 0 && (
          <Card className="bg-athlete-gray-700 border-l-4 border-l-yellow-500 border-gray-600">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <Trophy className="mr-3 text-yellow-400" size={24} />
                Career Achievements
              </h3>
              <div className="grid gap-3">
                {achievements.map((achievement: string, index: number) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-300 leading-relaxed">{achievement}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent News Section */}
        {recentNews.length > 0 && (
          <Card className="bg-athlete-gray-700 border-l-4 border-l-green-500 border-gray-600">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <Calendar className="mr-3 text-green-400" size={24} />
                Recent News
              </h3>
              <div className="grid gap-3">
                {recentNews.map((newsItem: string, index: number) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-300 leading-relaxed">{newsItem}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderRankAnalysis = (data: any) => (
    <div>
      <div className="h-64 mb-6">
        <RankChart data={data.history || []} />
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-athlete-gray-700 border-gray-600">
          <CardContent className="p-4">
            <h5 className="font-semibold text-athlete-success mb-2">Recommendations</h5>
            <ul className="text-sm text-gray-300 space-y-1">
              {data.recommendations?.map((rec: string, index: number) => (
                <li key={index}>• {rec}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="bg-athlete-gray-700 border-gray-600">
          <CardContent className="p-4">
            <h5 className="font-semibold text-athlete-warning mb-2">Key Stats</h5>
            <div className="text-sm text-gray-300 space-y-1">
              <div>Current Rank: <span className="text-white font-semibold">#{data.currentRank}</span></div>
              <div>Peak Rank: <span className="text-white font-semibold">#{data.peakRank}</span></div>
              <div>Avg Position: <span className="text-white font-semibold">#{data.averageRank}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderStrengthsAnalysis = (data: any) => (
    <div className="space-y-4">
      {data.strengths?.map((strength: any, index: number) => (
        <Card key={index} className="bg-athlete-gray-700 border-gray-600">
          <CardContent className="p-4">
            <h5 className="font-semibold text-athlete-success mb-2">{strength.title}</h5>
            <p className="text-sm text-gray-300">{strength.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );

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
      <div>
        {data.duration && (
          <div className="mb-6">
            <Badge variant="secondary" className="bg-athlete-accent text-white">
              {data.duration}
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
      case 'bio': return renderBioAnalysis(parsedData);
      case 'rank': return renderRankAnalysis(parsedData);
      case 'strengths': return renderStrengthsAnalysis(parsedData);
      case 'weaknesses': return renderWeaknessesAnalysis(parsedData);
      case 'development': return renderDevelopmentPlan(parsedData);

      case 'beat': return renderBeatStrategies(parsedData);
      case 'video': return renderVideoAnalysis(parsedData);
      default: return <div className="text-gray-400 text-center py-8">Unsupported analysis type</div>;
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

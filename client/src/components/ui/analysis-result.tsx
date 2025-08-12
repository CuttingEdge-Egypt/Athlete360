import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RankChart } from "./rank-chart";
import { Download, Share2, User, Trophy, Star, AlertTriangle, Calendar, Apple, Swords, Video } from "lucide-react";
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

  const getIcon = (type: string) => {
    switch (type) {
      case 'bio': return <User className="text-athlete-accent" size={24} />;
      case 'rank': return <Trophy className="text-athlete-warning" size={24} />;
      case 'strengths': return <Star className="text-athlete-success" size={24} />;
      case 'weaknesses': return <AlertTriangle className="text-athlete-danger" size={24} />;
      case 'development': return <Calendar className="text-purple-400" size={24} />;
      case 'nutrition': return <Apple className="text-green-400" size={24} />;
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
      case 'nutrition': return 'Nutrition Plan';
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

  const renderBioAnalysis = (data: any) => (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-1">
        {data.profileImageUrl ? (
          <img 
            src={data.profileImageUrl} 
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
        <h4 className="text-xl font-semibold mb-4 text-white">{data.name}</h4>
        <div className="space-y-3 text-gray-300">
          <p><strong className="text-white">Current Rank:</strong> #{data.rank}</p>
          <p><strong className="text-white">Bio:</strong> {data.bio}</p>
          {data.personalInfo && (
            <>
              <p><strong className="text-white">Born:</strong> {data.personalInfo.birthDate}</p>
              <p><strong className="text-white">Nationality:</strong> {data.personalInfo.nationality}</p>
              <p><strong className="text-white">Height:</strong> {data.personalInfo.height}</p>
              <p><strong className="text-white">Weight:</strong> {data.personalInfo.weight}</p>
            </>
          )}
          {data.achievements && (
            <div>
              <p className="text-white font-semibold">Career Highlights:</p>
              <ul className="list-disc list-inside space-y-1 text-sm mt-2">
                {data.achievements.slice(0, 4).map((achievement: string, index: number) => (
                  <li key={index}>{achievement}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );

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

  const renderDevelopmentPlan = (data: any) => (
    <div>
      <div className="mb-6">
        <Badge variant="secondary" className="bg-athlete-accent text-white">
          Duration: {data.duration}
        </Badge>
      </div>
      <div className="grid gap-4">
        {data.plan?.map((week: any, index: number) => (
          <Card key={index} className="bg-athlete-gray-700 border-gray-600">
            <CardContent className="p-4">
              <h5 className="font-semibold text-white mb-2">Week {week.week}: {week.focus}</h5>
              <ul className="text-sm text-gray-300 space-y-1">
                {week.activities?.map((activity: string, idx: number) => (
                  <li key={idx}>• {activity}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderNutritionPlan = (data: any) => {
    console.log('Frontend Nutrition Data RECEIVED:', JSON.stringify(data, null, 2));
    console.log('Data timestamp check:', data.generatedAt, data.sessionId);
    
    // Check for error state first
    if (data.error || data.message?.includes('Unable to generate')) {
      return (
        <div className="p-6 text-center">
          <div className="text-red-400 mb-4">⚠ Analysis Unavailable</div>
          <p className="text-gray-300 mb-4">
            {data.message || 'Unable to generate authentic nutrition plan at this time.'}
          </p>
          <p className="text-sm text-gray-400">
            Please try again later or contact support if the issue persists.
          </p>
        </div>
      );
    }
    
    // Enhanced data structure support with better error handling
    let meals: any[] = [];
    try {
      if (data.meals?.breakfast) {
        meals = [
          ...(Array.isArray(data.meals.breakfast) ? data.meals.breakfast : []).map((meal: any) => ({ ...meal, mealType: 'Breakfast' })),
          ...(Array.isArray(data.meals.lunch) ? data.meals.lunch : []).map((meal: any) => ({ ...meal, mealType: 'Lunch' })),
          ...(Array.isArray(data.meals.dinner) ? data.meals.dinner : []).map((meal: any) => ({ ...meal, mealType: 'Dinner' })),
          ...(Array.isArray(data.meals.snacks) ? data.meals.snacks : []).map((meal: any) => ({ ...meal, mealType: 'Snacks' }))
        ];
      } else if (Array.isArray(data.meals)) {
        meals = data.meals;
      }
    } catch (error) {
      console.error('Error processing meals data:', error);
      meals = [];
    }

    console.log('Processed meals:', meals);

    return (
      <div>
        {/* Enhanced overview with nationality and gender info */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-athlete-gray-700 border-gray-600">
            <CardContent className="p-4">
              <h5 className="font-semibold text-white mb-2">Daily Overview</h5>
              <div className="space-y-2 text-sm">
                <div>Calories: <span className="text-athlete-warning font-semibold">{data.dailyCalories}</span></div>
                <div>Hydration: <span className="text-white">{data.hydration}</span></div>
                {data.nationality && (
                  <div>Cuisine: <span className="text-athlete-accent font-semibold">{data.nationality}</span></div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-athlete-gray-700 border-gray-600">
            <CardContent className="p-4">
              <h5 className="font-semibold text-white mb-2">Macro Breakdown</h5>
              <div className="space-y-2 text-sm">
                {(data.macros || data.macroBreakdown) && Object.entries(data.macros || data.macroBreakdown).map(([key, value]) => (
                  <div key={key} className="capitalize">
                    {key}: <span className="text-athlete-accent font-semibold">{value as string}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {data.culturalNotes && (
            <Card className="bg-athlete-gray-700 border-gray-600">
              <CardContent className="p-4">
                <h5 className="font-semibold text-white mb-2">Cultural Adaptation</h5>
                <div className="text-sm text-gray-300">
                  {data.culturalNotes}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Enhanced meal display */}
        <div className="grid gap-4">
          {meals.map((meal: any, index: number) => (
            <Card key={index} className="bg-athlete-gray-700 border-gray-600">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <h5 className="font-semibold text-white">
                    {meal.mealType || meal.meal || meal.name || `Meal ${index + 1}`}
                  </h5>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="border-athlete-warning text-athlete-warning">
                      {meal.calories}
                    </Badge>
                    {meal.timing && (
                      <Badge variant="outline" className="border-blue-400 text-blue-400">
                        {meal.timing}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {meal.description && (
                  <p className="text-sm text-gray-300 mb-3 italic">
                    {meal.description}
                  </p>
                )}
                
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-gray-400">Foods: </span>
                    <span className="text-white">
                      {meal.foods ? meal.foods.join(", ") : "Traditional cuisine items"}
                    </span>
                  </div>
                  
                  {meal.benefits && (
                    <div className="text-sm">
                      <span className="text-gray-400">Benefits: </span>
                      <span className="text-athlete-accent">{meal.benefits}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Enhanced supplements section */}
        {data.supplements && (
          <Card className="bg-athlete-gray-700 border-gray-600 mt-4">
            <CardContent className="p-4">
              <h5 className="font-semibold text-white mb-2">Recommended Supplements</h5>
              <div className="text-sm text-gray-300">
                {Array.isArray(data.supplements) ? data.supplements.join(", ") : data.supplements}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Additional notes */}
        {data.notes && (
          <Card className="bg-athlete-gray-700 border-gray-600 mt-4">
            <CardContent className="p-4">
              <h5 className="font-semibold text-white mb-2">Additional Notes</h5>
              <div className="text-sm text-gray-300">
                {data.notes}
              </div>
            </CardContent>
          </Card>
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
          {strategies.length > 0 ? strategies.map((strategy: any, index: number) => (
            <Card key={index} className="bg-athlete-gray-700 border-gray-600">
              <CardContent className="p-4">
                <h5 className="font-semibold text-red-400 mb-2">
                  {strategy.strategy || strategy.title || `Strategy ${index + 1}`}
                </h5>
                <p className="text-sm text-gray-300">
                  {strategy.description || 'Strategy details not available'}
                </p>
              </CardContent>
            </Card>
          )) : (
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

    // Enhanced error handling for array data
    let keyFindings: string[] = [];
    let technicalInsights: string[] = [];
    let recommendations: string[] = [];
    
    try {
      keyFindings = Array.isArray(data.keyFindings) ? data.keyFindings : [];
      technicalInsights = Array.isArray(data.technicalInsights) ? data.technicalInsights : [];
      recommendations = Array.isArray(data.recommendations) ? data.recommendations : [];
    } catch (error) {
      console.error('Error processing video analysis data:', error);
    }

    return (
      <div>
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card className="bg-athlete-gray-700 border-gray-600">
            <CardContent className="p-4">
              <h5 className="font-semibold text-white mb-2">Overall Performance</h5>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-athlete-accent">
                  {data.overallScore || 'N/A'}/10
                </div>
                <div className="text-sm text-gray-300">
                  {data.comparedToAverage || 'Analysis not available'}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-athlete-gray-700 border-gray-600">
            <CardContent className="p-4">
              <h5 className="font-semibold text-white mb-2">Analysis Type</h5>
              <div className="text-athlete-accent font-semibold">
                {data.analysisType || 'Video Performance Analysis'}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid gap-4">
          <Card className="bg-athlete-gray-700 border-gray-600">
            <CardContent className="p-4">
              <h5 className="font-semibold text-athlete-success mb-2">Key Findings</h5>
              <ul className="text-sm text-gray-300 space-y-1">
                {keyFindings.length > 0 ? keyFindings.map((finding: string, index: number) => (
                  <li key={index}>• {finding}</li>
                )) : (
                  <li className="text-gray-400">No findings available</li>
                )}
              </ul>
            </CardContent>
          </Card>
          
          <Card className="bg-athlete-gray-700 border-gray-600">
            <CardContent className="p-4">
              <h5 className="font-semibold text-athlete-warning mb-2">Technical Insights</h5>
              <ul className="text-sm text-gray-300 space-y-1">
                {technicalInsights.length > 0 ? technicalInsights.map((insight: string, index: number) => (
                  <li key={index}>• {insight}</li>
                )) : (
                  <li className="text-gray-400">No insights available</li>
                )}
              </ul>
            </CardContent>
          </Card>
          
          <Card className="bg-athlete-gray-700 border-gray-600">
            <CardContent className="p-4">
              <h5 className="font-semibold text-purple-400 mb-2">Recommendations</h5>
              <ul className="text-sm text-gray-300 space-y-1">
                {recommendations.length > 0 ? recommendations.map((rec: string, index: number) => (
                  <li key={index}>• {rec}</li>
                )) : (
                  <li className="text-gray-400">No recommendations available</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderAnalysisContent = () => {
    if (!data) {
      return <div className="text-gray-400 text-center py-8">Analysis data not available</div>;
    }

    switch (type) {
      case 'bio': return renderBioAnalysis(data);
      case 'rank': return renderRankAnalysis(data);
      case 'strengths': return renderStrengthsAnalysis(data);
      case 'weaknesses': return renderWeaknessesAnalysis(data);
      case 'development': return renderDevelopmentPlan(data);
      case 'nutrition': return renderNutritionPlan(data);
      case 'beat': return renderBeatStrategies(data);
      case 'video': return renderVideoAnalysis(data);
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

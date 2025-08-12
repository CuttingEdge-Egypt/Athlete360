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

  const renderNutritionPlan = (data: any) => {
    console.log('Nutrition Plan Data:', JSON.stringify(data, null, 2));
    
    // Error state handling
    if (data.error || data.message?.includes('Unable to generate')) {
      return (
        <div className="text-center py-8">
          <div className="text-red-400 text-lg mb-3">⚠ Analysis Unavailable</div>
          <p className="text-gray-300">
            {data.message || 'Unable to generate authentic nutrition plan at this time.'}
          </p>
        </div>
      );
    }

    // Extract meals with proper data structure handling
    const extractMeals = () => {
      let allMeals: any[] = [];
      
      // Direct meals array
      if (Array.isArray(data.meals)) {
        allMeals = [...data.meals];
      }
      
      // Nested meal plan structure
      if (data.mealPlan?.meals && Array.isArray(data.mealPlan.meals)) {
        allMeals = [...allMeals, ...data.mealPlan.meals];
      }
      
      // Object-based meals (breakfast, lunch, dinner keys)
      if (data.meals && typeof data.meals === 'object' && !Array.isArray(data.meals)) {
        Object.entries(data.meals).forEach(([mealType, mealData]: [string, any]) => {
          allMeals.push({ mealType: mealType.charAt(0).toUpperCase() + mealType.slice(1), ...mealData });
        });
      }
      
      // Add snacks as meals
      if (Array.isArray(data.snacks)) {
        data.snacks.forEach((snack: any) => {
          allMeals.push({ mealType: 'Snack', ...snack });
        });
      }
      
      return allMeals;
    };

    const meals = extractMeals();

    return (
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Daily Summary */}
          <Card className="bg-athlete-gray-700 border-gray-600">
            <CardContent className="p-4">
              <h4 className="font-semibold text-white mb-3">Daily Summary</h4>
              <div className="space-y-2 text-sm">
                {data.dailyCalories && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Target Calories:</span>
                    <span className="text-athlete-warning font-medium">{data.dailyCalories}</span>
                  </div>
                )}
                {data.nationality && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cuisine:</span>
                    <span className="text-athlete-accent font-medium">{data.nationality}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Macronutrients */}
          {(data.macros || data.macroBreakdown) && (
            <Card className="bg-athlete-gray-700 border-gray-600">
              <CardContent className="p-4">
                <h4 className="font-semibold text-white mb-3">Macronutrients</h4>
                <div className="space-y-2 text-sm">
                  {Object.entries(data.macros || data.macroBreakdown).map(([nutrient, amount]) => (
                    <div key={nutrient} className="flex justify-between">
                      <span className="text-gray-400 capitalize">{nutrient}:</span>
                      <span className="text-white font-medium">{amount as string}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cultural Notes */}
          {data.culturalNotes && (
            <Card className="bg-athlete-gray-700 border-gray-600">
              <CardContent className="p-4">
                <h4 className="font-semibold text-white mb-3">Cultural Adaptation</h4>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {data.culturalNotes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Meals Section */}
        {meals.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white">Meal Plan</h3>
            <div className="grid gap-4">
              {meals.map((meal: any, index: number) => {
                const mealName = meal.mealType || meal.meal || meal.name;
                if (!mealName) return null;

                return (
                  <Card key={index} className="bg-athlete-gray-700 border-gray-600">
                    <CardContent className="p-5">
                      {/* Meal Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <h4 className="text-lg font-semibold text-white">{mealName}</h4>
                        <div className="flex gap-2">
                          {meal.calories && (
                            <Badge variant="outline" className="border-athlete-warning text-athlete-warning">
                              {meal.calories}
                            </Badge>
                          )}
                          {meal.timing && (
                            <Badge variant="outline" className="border-blue-400 text-blue-400">
                              {meal.timing}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Meal Description */}
                      {meal.description && (
                        <p className="text-gray-300 text-sm mb-4 italic border-l-2 border-athlete-accent pl-3">
                          {meal.description}
                        </p>
                      )}

                      {/* Foods List */}
                      {meal.foods && (
                        <div className="mb-4">
                          <h5 className="text-white font-medium mb-2">Foods:</h5>
                          <div className="text-sm text-gray-300">
                            {Array.isArray(meal.foods) ? (
                              <ul className="list-disc list-inside space-y-1">
                                {meal.foods.map((food: string, foodIndex: number) => (
                                  <li key={foodIndex}>{food}</li>
                                ))}
                              </ul>
                            ) : (
                              <p>{meal.foods}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Benefits */}
                      {meal.benefits && (
                        <div className="bg-athlete-gray-800 rounded-lg p-3">
                          <h5 className="text-athlete-accent font-medium mb-1">Benefits:</h5>
                          <p className="text-sm text-gray-300">{meal.benefits}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-red-400 text-lg mb-3">⚠ No Meal Data Available</div>
            <p className="text-gray-300">
              No authentic meal data was generated. Please try regenerating the nutrition plan.
            </p>
          </div>
        )}

        {/* Hydration Guidelines */}
        {data.hydration && (
          <Card className="bg-athlete-gray-700 border-gray-600">
            <CardContent className="p-5">
              <h4 className="font-semibold text-white mb-3">Hydration Guidelines</h4>
              <p className="text-sm text-gray-300 leading-relaxed">{data.hydration}</p>
            </CardContent>
          </Card>
        )}

        {/* Supplements */}
        {data.supplements && (
          <Card className="bg-athlete-gray-700 border-gray-600">
            <CardContent className="p-5">
              <h4 className="font-semibold text-white mb-3">Recommended Supplements</h4>
              <div className="text-sm text-gray-300">
                {Array.isArray(data.supplements) ? (
                  <ul className="list-disc list-inside space-y-1">
                    {data.supplements.map((supplement: string, index: number) => (
                      <li key={index}>{supplement}</li>
                    ))}
                  </ul>
                ) : (
                  <p>{data.supplements}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Additional Notes */}
        {data.notes && (
          <Card className="bg-athlete-gray-700 border-gray-600">
            <CardContent className="p-5">
              <h4 className="font-semibold text-white mb-3">Additional Notes</h4>
              <p className="text-sm text-gray-300 leading-relaxed">{data.notes}</p>
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

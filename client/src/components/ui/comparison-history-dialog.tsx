import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users2, 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  Star, 
  Target,
  Brain,
  Heart,
  User
} from "lucide-react";

interface ComparisonHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comparisonData: any;
}

export function ComparisonHistoryDialog({
  open,
  onOpenChange,
  comparisonData
}: ComparisonHistoryDialogProps) {
  if (!comparisonData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-slate-50 border-slate-200">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Users2 className="h-5 w-5" />
            Athlete Comparison History
          </DialogTitle>
          <DialogDescription>
            Previous comparison between {comparisonData.athlete1?.name} and {comparisonData.athlete2?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Athlete Headers */}
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              {comparisonData.athlete1?.profileImageUrl ? (
                <img
                  src={comparisonData.athlete1.profileImageUrl}
                  alt={comparisonData.athlete1.name}
                  className="w-20 h-20 rounded-full object-cover mx-auto mb-3"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <User className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
              <h3 className="text-xl font-bold text-white">{comparisonData.athlete1?.name}</h3>
              <Badge variant="outline" className="mt-2">
                Rank #{comparisonData.athlete1?.rank && !isNaN(Number(comparisonData.athlete1.rank)) ? Math.floor(Number(comparisonData.athlete1.rank)) : comparisonData.athlete1?.rank || "TBD"}
              </Badge>
            </div>
            
            <div className="text-center">
              {comparisonData.athlete2?.profileImageUrl ? (
                <img
                  src={comparisonData.athlete2.profileImageUrl}
                  alt={comparisonData.athlete2.name}
                  className="w-20 h-20 rounded-full object-cover mx-auto mb-3"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <User className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
              <h3 className="text-xl font-bold text-white">{comparisonData.athlete2?.name}</h3>
              <Badge variant="outline" className="mt-2">
                Rank #{comparisonData.athlete2?.rank && !isNaN(Number(comparisonData.athlete2.rank)) ? Math.floor(Number(comparisonData.athlete2.rank)) : comparisonData.athlete2?.rank || "TBD"}
              </Badge>
            </div>
          </div>

          {/* Detailed Comparison */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-slate-100">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="detailed" data-testid="tab-detailed">Detailed</TabsTrigger>
              <TabsTrigger value="strengths" data-testid="tab-strengths">Strengths</TabsTrigger>
              <TabsTrigger value="weaknesses" data-testid="tab-weaknesses">Weaknesses</TabsTrigger>
              <TabsTrigger value="prediction" data-testid="tab-prediction">Head-to-Head</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card className="bg-card border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="h-5 w-5 text-blue-400" />
                    <h4 className="font-semibold text-white">Overall Analysis</h4>
                  </div>
                  {comparisonData.error ? (
                    <div className="p-3 bg-red-900/30 border border-red-600/50 rounded-lg">
                      <p className="text-red-300">{comparisonData.message}</p>
                    </div>
                  ) : comparisonData.overallAnalysis?.summary && 
                       !comparisonData.overallAnalysis.summary.includes('temporarily unavailable') ? (
                    <p className="text-gray-600 leading-relaxed">
                      {comparisonData.overallAnalysis.summary}
                    </p>
                  ) : (
                    <div className="p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
                      <p className="text-yellow-300">
                        Authentic overall analysis temporarily unavailable. GPT-5 was unable to generate comprehensive comparison data.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-card border-slate-200">
                  <CardContent className="p-4 text-center">
                    <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                    <div className="text-sm text-muted-foreground">Ranking Advantage</div>
                    <div className="text-lg font-bold text-white">
                      {comparisonData.ranking?.competitiveEdge === 'athlete1' ? comparisonData.athlete1?.name :
                       comparisonData.ranking?.competitiveEdge === 'athlete2' ? comparisonData.athlete2?.name : 'Even'}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-slate-200">
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <div className="text-sm text-muted-foreground">Strength Advantage</div>
                    <div className="text-lg font-bold text-white">
                      {comparisonData.strengths?.advantage === 'athlete1' ? comparisonData.athlete1?.name :
                       comparisonData.strengths?.advantage === 'athlete2' ? comparisonData.athlete2?.name : 'Even'}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-slate-200">
                  <CardContent className="p-4 text-center">
                    <Target className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                    <div className="text-sm text-muted-foreground">Predicted Winner</div>
                    <div className="text-lg font-bold text-white">
                      {comparisonData.headToHead?.prediction === 'athlete1' ? comparisonData.athlete1?.name :
                       comparisonData.headToHead?.prediction === 'athlete2' ? comparisonData.athlete2?.name : 'Even Match'}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="detailed" className="space-y-4">
              {comparisonData.detailedAnalysis ? (
                <div className="space-y-6">
                  {/* AI Models Info */}
                  {comparisonData.aiModels && (
                    <Card className="bg-blue-900/30 border-blue-600/50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="h-4 w-4 text-blue-400" />
                          <span className="text-sm font-medium text-blue-300">Powered by AI Models</span>
                        </div>
                        <div className="text-xs text-blue-200">
                          Basic Analysis: {comparisonData.aiModels.basicComparison} • 
                          Detailed Analysis: {comparisonData.aiModels.detailedAnalysis} • 
                          Head-to-Head: {comparisonData.aiModels.headToHead}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Athletes Side-by-Side Analysis */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Athlete 1 Detailed Analysis */}
                    <Card className="bg-card border-slate-200">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <User className="h-5 w-5" />
                          {comparisonData.detailedAnalysis.athlete1?.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {comparisonData.detailedAnalysis.athlete1?.currentForm && (
                          <div>
                            <h5 className="font-semibold text-blue-400 mb-2">Current Form</h5>
                            <p className="text-sm text-gray-600">{comparisonData.detailedAnalysis.athlete1.currentForm}</p>
                          </div>
                        )}

                        {comparisonData.detailedAnalysis.athlete1?.technicalSkills?.length > 0 && (
                          <div>
                            <h5 className="font-semibold text-green-400 mb-2">Technical Skills</h5>
                            <div className="space-y-2">
                              {comparisonData.detailedAnalysis.athlete1.technicalSkills.map((skill: any, index: number) => (
                                <div key={index} className="bg-slate-50 p-3 rounded-lg">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="font-medium text-white">{skill.skill}</span>
                                    <Badge variant="outline" className="text-xs text-center">
                                      {skill.proficiency}%
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{skill.description}</p>
                                  {skill.evidence && (
                                    <p className="text-xs text-blue-300 mt-1">Evidence: {skill.evidence}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {comparisonData.detailedAnalysis.athlete1?.physicalAttributes && (
                          <div>
                            <h5 className="font-semibold text-yellow-400 mb-2">Physical Attributes</h5>
                            <div className="bg-slate-50 p-3 rounded-lg space-y-1">
                              {comparisonData.detailedAnalysis.athlete1.physicalAttributes.height && (
                                <div className="text-sm text-gray-600">
                                  <span className="text-muted-foreground">Height:</span> {comparisonData.detailedAnalysis.athlete1.physicalAttributes.height}
                                </div>
                              )}
                              {comparisonData.detailedAnalysis.athlete1.physicalAttributes.weight && (
                                <div className="text-sm text-gray-600">
                                  <span className="text-muted-foreground">Weight:</span> {comparisonData.detailedAnalysis.athlete1.physicalAttributes.weight}
                                </div>
                              )}
                              {comparisonData.detailedAnalysis.athlete1.physicalAttributes.stance && (
                                <div className="text-sm text-gray-600">
                                  <span className="text-muted-foreground">Stance:</span> {comparisonData.detailedAnalysis.athlete1.physicalAttributes.stance}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Athlete 2 Detailed Analysis */}
                    <Card className="bg-card border-slate-200">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <User className="h-5 w-5" />
                          {comparisonData.detailedAnalysis.athlete2?.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {comparisonData.detailedAnalysis.athlete2?.currentForm && (
                          <div>
                            <h5 className="font-semibold text-blue-400 mb-2">Current Form</h5>
                            <p className="text-sm text-gray-600">{comparisonData.detailedAnalysis.athlete2.currentForm}</p>
                          </div>
                        )}

                        {comparisonData.detailedAnalysis.athlete2?.technicalSkills?.length > 0 && (
                          <div>
                            <h5 className="font-semibold text-green-400 mb-2">Technical Skills</h5>
                            <div className="space-y-2">
                              {comparisonData.detailedAnalysis.athlete2.technicalSkills.map((skill: any, index: number) => (
                                <div key={index} className="bg-slate-50 p-3 rounded-lg">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="font-medium text-white">{skill.skill}</span>
                                    <Badge variant="outline" className="text-xs text-center">
                                      {skill.proficiency}%
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{skill.description}</p>
                                  {skill.evidence && (
                                    <p className="text-xs text-blue-300 mt-1">Evidence: {skill.evidence}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {comparisonData.detailedAnalysis.athlete2?.physicalAttributes && (
                          <div>
                            <h5 className="font-semibold text-yellow-400 mb-2">Physical Attributes</h5>
                            <div className="bg-slate-50 p-3 rounded-lg space-y-1">
                              {comparisonData.detailedAnalysis.athlete2.physicalAttributes.height && (
                                <div className="text-sm text-gray-600">
                                  <span className="text-muted-foreground">Height:</span> {comparisonData.detailedAnalysis.athlete2.physicalAttributes.height}
                                </div>
                              )}
                              {comparisonData.detailedAnalysis.athlete2.physicalAttributes.weight && (
                                <div className="text-sm text-gray-600">
                                  <span className="text-muted-foreground">Weight:</span> {comparisonData.detailedAnalysis.athlete2.physicalAttributes.weight}
                                </div>
                              )}
                              {comparisonData.detailedAnalysis.athlete2.physicalAttributes.stance && (
                                <div className="text-sm text-gray-600">
                                  <span className="text-muted-foreground">Stance:</span> {comparisonData.detailedAnalysis.athlete2.physicalAttributes.stance}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <Card className="bg-yellow-900/30 border-yellow-600/50">
                  <CardContent className="p-4">
                    <p className="text-yellow-300">
                      Detailed analysis powered by Gemini-2.5-pro is not available for this comparison.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="strengths" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-card border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">{comparisonData.athlete1?.name} Strengths</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(comparisonData.strengths?.athlete1 || []).map((strength: any, index: number) => (
                      <div key={index} className="flex items-start gap-2">
                        <Star className="h-4 w-4 text-green-500 mt-1" />
                        <div className="flex-1">
                          <div className="font-medium text-white">
                            {typeof strength === 'string' ? strength : strength.title}
                          </div>
                          {typeof strength === 'object' && strength.description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {strength.description}
                            </div>
                          )}
                          {typeof strength === 'object' && strength.rating && (
                            <div className="text-xs text-green-400 mt-1">
                              Rating: {strength.rating}%
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {(!comparisonData.strengths?.athlete1 || comparisonData.strengths.athlete1.length === 0) && (
                      <div className="text-muted-foreground text-center py-4">No strengths data available</div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">{comparisonData.athlete2?.name} Strengths</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(comparisonData.strengths?.athlete2 || []).map((strength: any, index: number) => (
                      <div key={index} className="flex items-start gap-2">
                        <Star className="h-4 w-4 text-green-500 mt-1" />
                        <div className="flex-1">
                          <div className="font-medium text-white">
                            {typeof strength === 'string' ? strength : strength.title}
                          </div>
                          {typeof strength === 'object' && strength.description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {strength.description}
                            </div>
                          )}
                          {typeof strength === 'object' && strength.rating && (
                            <div className="text-xs text-green-400 mt-1">
                              Rating: {strength.rating}%
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {(!comparisonData.strengths?.athlete2 || comparisonData.strengths.athlete2.length === 0) && (
                      <div className="text-muted-foreground text-center py-4">No strengths data available</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="weaknesses" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-card border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">{comparisonData.athlete1?.name} Weaknesses</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(comparisonData.weaknesses?.athlete1 || []).map((weakness: any, index: number) => (
                      <div key={index} className="flex items-start gap-2">
                        <TrendingDown className="h-4 w-4 text-red-500 mt-1" />
                        <div className="flex-1">
                          <div className="font-medium text-white">
                            {typeof weakness === 'string' ? weakness : weakness.title}
                          </div>
                          {typeof weakness === 'object' && weakness.description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {weakness.description}
                            </div>
                          )}
                          {typeof weakness === 'object' && weakness.impact && (
                            <div className="text-xs text-red-400 mt-1">
                              Impact: {weakness.impact}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {(!comparisonData.weaknesses?.athlete1 || comparisonData.weaknesses.athlete1.length === 0) && (
                      <div className="text-muted-foreground text-center py-4">No weaknesses data available</div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">{comparisonData.athlete2?.name} Weaknesses</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(comparisonData.weaknesses?.athlete2 || []).map((weakness: any, index: number) => (
                      <div key={index} className="flex items-start gap-2">
                        <TrendingDown className="h-4 w-4 text-red-500 mt-1" />
                        <div className="flex-1">
                          <div className="font-medium text-white">
                            {typeof weakness === 'string' ? weakness : weakness.title}
                          </div>
                          {typeof weakness === 'object' && weakness.description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {weakness.description}
                            </div>
                          )}
                          {typeof weakness === 'object' && weakness.impact && (
                            <div className="text-xs text-red-400 mt-1">
                              Impact: {weakness.impact}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {(!comparisonData.weaknesses?.athlete2 || comparisonData.weaknesses.athlete2.length === 0) && (
                      <div className="text-muted-foreground text-center py-4">No weaknesses data available</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="prediction" className="space-y-4">
              <Card className="bg-card border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Heart className="h-5 w-5 text-red-500" />
                    Head-to-Head Prediction
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-2">
                      {comparisonData.headToHead?.prediction === 'athlete1' ? comparisonData.athlete1?.name :
                       comparisonData.headToHead?.prediction === 'athlete2' ? comparisonData.athlete2?.name : 'Even Match'}
                    </div>
                    <Badge variant="outline" className="text-lg px-4 py-1">
                      {comparisonData.headToHead?.confidence || 50}% Confidence
                    </Badge>
                  </div>
                  
                  <Separator className="bg-gray-600" />
                  
                  <div>
                    <h4 className="font-semibold text-white mb-2">Analysis Reasoning</h4>
                    <p className="text-gray-600 leading-relaxed">
                      {comparisonData.headToHead?.reasoning || "Authentic head-to-head analysis temporarily unavailable. GPT-5 was unable to generate detailed comparison data."}
                    </p>
                    
                    {comparisonData.headToHead?.keyFactors && comparisonData.headToHead.keyFactors.length > 0 && 
                     !comparisonData.headToHead.keyFactors.includes("Analysis unavailable") && (
                      <div className="mt-4">
                        <h5 className="font-medium text-white mb-2">Key Factors</h5>
                        <ul className="space-y-1">
                          {comparisonData.headToHead.keyFactors.map((factor: string, index: number) => (
                            <li key={index} className="flex items-center gap-2 text-gray-600">
                              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                              {factor}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Gemini-2.5-pro Enhanced Head-to-Head Data */}
                    {comparisonData.headToHead?.tacticalAdvice && (
                      <div className="mt-6">
                        <h5 className="font-semibold text-purple-400 mb-3">Tactical Advice (Gemini-2.5-pro)</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {comparisonData.headToHead.tacticalAdvice.forAthlete1 && (
                            <Card className="bg-slate-50 border-slate-200">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-blue-400">For {comparisonData.athlete1?.name}</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-xs text-gray-600">{comparisonData.headToHead.tacticalAdvice.forAthlete1}</p>
                              </CardContent>
                            </Card>
                          )}
                          {comparisonData.headToHead.tacticalAdvice.forAthlete2 && (
                            <Card className="bg-slate-50 border-slate-200">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-red-400">For {comparisonData.athlete2?.name}</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-xs text-gray-600">{comparisonData.headToHead.tacticalAdvice.forAthlete2}</p>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      </div>
                    )}

                    {comparisonData.headToHead?.historicalContext && 
                     !comparisonData.headToHead.historicalContext.includes("Information not found") && (
                      <div className="mt-4">
                        <h5 className="font-medium text-yellow-400 mb-2">Historical Context</h5>
                        <p className="text-gray-600 text-sm bg-slate-50 p-3 rounded-lg">
                          {comparisonData.headToHead.historicalContext}
                        </p>
                      </div>
                    )}

                    {comparisonData.headToHead?.expertPredictions && 
                     !comparisonData.headToHead.expertPredictions.includes("No expert predictions found") && (
                      <div className="mt-4">
                        <h5 className="font-medium text-green-400 mb-2">Expert Predictions</h5>
                        <p className="text-gray-600 text-sm bg-slate-50 p-3 rounded-lg">
                          {comparisonData.headToHead.expertPredictions}
                        </p>
                      </div>
                    )}

                    {/* AI Model Attribution */}
                    {comparisonData.aiModels && (
                      <div className="mt-6 pt-4 border-t border-slate-200">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Brain className="h-3 w-3" />
                          <span>
                            Head-to-Head Analysis powered by {comparisonData.aiModels.headToHead}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
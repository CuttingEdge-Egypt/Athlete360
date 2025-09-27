import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";

import { Navigation } from "@/components/Navigation";
import { AnalysisResult } from "@/components/ui/analysis-result";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, RefreshCw, Sparkles, User, Trophy, Medal, Target, TrendingUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Athlete, Transaction, AnalysisLog } from "@shared/schema";

// Helper function to determine if a sport is individual vs team
const isIndividualSport = (sportName: string): boolean => {
  // Normalize the sport name: lowercase, remove symbols, handle common variations
  const normalizedSport = sportName
    .toLowerCase()
    .replace(/[&\-–—]/g, ' ')  // Replace various dash/ampersand symbols with spaces
    .replace(/\s+/g, ' ')      // Normalize multiple spaces to single space
    .trim()
    .split('–')[0]             // Remove event suffixes like "– 400m"
    .split('-')[0]             // Remove event suffixes like "- 400m"
    .trim();

  const individualSports = [
    // Combat sports
    'taekwondo', 'karate', 'judo', 'boxing', 'wrestling', 'fencing', 'martial arts',
    // Racket sports
    'tennis', 'badminton', 'table tennis', 'ping pong', 'squash', 'racquetball',
    // Precision sports
    'archery', 'shooting', 'darts', 'billiards', 'snooker',
    // Individual ball sports
    'golf', 'bowling',
    // Aquatic sports
    'swimming', 'diving', 'synchronized swimming', 'water polo', // Note: water polo can be individual events
    // Track and field
    'athletics', 'track and field', 'track & field', 'running', 'marathon', 'sprint',
    'jumping', 'throwing', 'pole vault', 'high jump', 'long jump', 'javelin', 'discus',
    // Gymnastics
    'gymnastics', 'artistic gymnastics', 'rhythmic gymnastics', 'trampoline',
    // Strength sports
    'weightlifting', 'powerlifting', 'strongman',
    // Endurance sports
    'cycling', 'triathlon', 'duathlon', 'pentathlon', 'decathlon', 'heptathlon',
    'marathon', 'cross country',
    // Winter sports
    'figure skating', 'speed skating', 'skiing', 'snowboarding', 'biathlon',
    'bobsled', 'luge', 'skeleton', 'ski jumping', 'cross country skiing',
    // Other individual sports
    'equestrian', 'surfing', 'skateboarding', 'climbing', 'rock climbing',
    'sailing', 'windsurfing', 'motocross', 'auto racing', 'chess'
  ];
  
  // Check exact matches first
  if (individualSports.includes(normalizedSport)) {
    return true;
  }
  
  // Check if any individual sport is contained in the normalized name
  return individualSports.some(sport => {
    const normalizedIndividualSport = sport.replace(/[&\-–—]/g, ' ').replace(/\s+/g, ' ').trim();
    return normalizedSport.includes(normalizedIndividualSport) || 
           normalizedIndividualSport.includes(normalizedSport);
  });
};

export default function AthleteAnalysis() {
  const [, params] = useRoute("/athlete/:id");
  const athleteId = params?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: athlete } = useQuery<Athlete>({
    queryKey: ["/api/athletes", athleteId],
    enabled: !!athleteId,
  });

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const { data: analysisLogs = [] } = useQuery<AnalysisLog[]>({
    queryKey: ["/api/analysis-logs"],
  });

  // Mutation to update athlete data using OpenAI
  const updateAthleteDataMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/athletes/${athleteId}/update-from-ai`);
    },
    onSuccess: () => {
      // Invalidate and refetch athlete data
      queryClient.invalidateQueries({ queryKey: ["/api/athletes", athleteId] });
      queryClient.invalidateQueries({ queryKey: ["/api/analysis-logs"] });
      
      toast({
        title: "Athlete Data Updated",
        description: "Latest information fetched successfully using OpenAI",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update athlete data",
        variant: "destructive",
      });
    },
  });

  const athleteTransactions = transactions.filter(t => t.athleteId === athleteId);
  const athleteAnalysisLogs = analysisLogs.filter(l => l.athleteId === athleteId);

  if (!athlete) {
    return (
      <div className="min-h-screen bg-athlete-primary text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold mb-4">Athlete Not Found</h2>
          <p className="text-gray-400 mb-6">The athlete you're looking for doesn't exist.</p>
          <Button 
            onClick={() => window.history.back()}
            data-testid="button-go-back"
            className="bg-athlete-accent hover:bg-blue-600"
          >
            <ArrowLeft className="mr-2" size={16} />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <Button 
              onClick={() => window.history.back()}
              data-testid="button-back"
              variant="ghost" 
              className="text-gray-400 hover:text-white mb-4"
            >
              <ArrowLeft className="mr-2" size={16} />
              Back to Dashboard
            </Button>
            
            <Card className="bg-athlete-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-6">
                    {athlete.profileImageUrl ? (
                      <img 
                        src={athlete.profileImageUrl}
                        alt={athlete.name}
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-athlete-gray-600 flex items-center justify-center">
                        <User className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <h1 className="text-3xl font-bold text-white mb-2">{athlete.name}</h1>
                      <p className="text-gray-400 mb-2">{athlete.bio}</p>
                      <div className="flex items-center space-x-4">
                        {/* Multiple Rankings Display */}
                        <div className="flex items-center space-x-2 text-sm">
                          {athlete.rank && (
                            <span className="text-athlete-warning bg-athlete-gray-700 px-2 py-1 rounded">
                              World #{athlete.rank}
                            </span>
                          )}
                          {athlete.olympicRank && (
                            <span className="text-yellow-400 bg-athlete-gray-700 px-2 py-1 rounded">
                              Olympic #{athlete.olympicRank}
                            </span>
                          )}
                          {athlete.continentalRank && (
                            <span className="text-green-400 bg-athlete-gray-700 px-2 py-1 rounded">
                              Continental #{athlete.continentalRank}
                            </span>
                          )}
                          {athlete.nationalRank && (
                            <span className="text-blue-400 bg-athlete-gray-700 px-2 py-1 rounded">
                              National #{athlete.nationalRank}
                            </span>
                          )}
                          {!athlete.rank && !athlete.olympicRank && !athlete.continentalRank && !athlete.nationalRank && (
                            <span className="text-gray-400">Rank TBD</span>
                          )}
                        </div>
                        <span className="text-sm text-gray-400">Updated: {new Date(athlete.updatedAt || '').toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Update Button */}
                  <Button
                    onClick={() => updateAthleteDataMutation.mutate()}
                    disabled={updateAthleteDataMutation.isPending}
                    data-testid="button-update-athlete"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {updateAthleteDataMutation.isPending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Update with AI
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analysis Tabs */}
          <Tabs defaultValue="results" className="space-y-6">
            <TabsList className="bg-athlete-gray-800 border-gray-700">
              <TabsTrigger 
                value="results" 
                data-testid="tab-results"
                className="data-[state=active]:bg-athlete-accent"
              >
                Analysis Results
              </TabsTrigger>
              {/* Rankings tab - only show for individual sports */}
              {athlete?.sport && isIndividualSport(athlete.sport) && (
                <TabsTrigger 
                  value="rankings" 
                  data-testid="tab-rankings"
                  className="data-[state=active]:bg-athlete-accent"
                >
                  <Trophy className="mr-2 h-4 w-4" />
                  Rankings
                </TabsTrigger>
              )}
              <TabsTrigger 
                value="history" 
                data-testid="tab-history"
                className="data-[state=active]:bg-athlete-accent"
              >
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="results">
              {athleteAnalysisLogs.length > 0 ? (
                <div className="grid gap-6">
                  {athleteAnalysisLogs.map((log) => (
                    <AnalysisResult
                      key={log.id}
                      type={log.serviceType}
                      data={log.resultData}
                      createdAt={typeof log.createdAt === 'string' ? log.createdAt : (log.createdAt || new Date()).toISOString()}
                      shared={log.shared || false}
                      shareUrl={log.shareUrl || undefined}
                    />
                  ))}
                </div>
              ) : (
                <Card className="bg-athlete-gray-800 border-gray-700">
                  <CardContent className="p-12 text-center">
                    <div className="text-6xl mb-4">📊</div>
                    <h3 className="text-xl font-bold mb-4 text-white">No Analysis Yet</h3>
                    <p className="text-gray-400 mb-6">
                      This athlete hasn't been analyzed yet. Go back to the dashboard to run some analysis services.
                    </p>
                    <Button 
                      onClick={() => window.history.back()}
                      data-testid="button-start-analysis"
                      className="bg-athlete-accent hover:bg-blue-600"
                    >
                      Start Analysis
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Rankings Tab Content - only for individual sports */}
            {athlete?.sport && isIndividualSport(athlete.sport) && (
              <TabsContent value="rankings">
                <Card className="bg-athlete-gray-800 border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-white flex items-center">
                        <Trophy className="mr-2 h-5 w-5 text-athlete-warning" />
                        Ranking Analysis
                      </h3>
                      <Button
                        onClick={() => updateAthleteDataMutation.mutate()}
                        disabled={updateAthleteDataMutation.isPending}
                        data-testid="button-refresh-rankings"
                        variant="outline"
                        size="sm"
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        {updateAthleteDataMutation.isPending ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh Rankings
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Multiple Rankings Display */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      {/* World Ranking */}
                      <div className="bg-athlete-gray-700 p-4 rounded-lg border border-gray-600">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-300">World Ranking</h4>
                          <Target className="h-4 w-4 text-athlete-warning" />
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {athlete.rank ? `#${athlete.rank}` : 'N/A'}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">International Federation</p>
                      </div>

                      {/* Olympic Ranking */}
                      <div className="bg-athlete-gray-700 p-4 rounded-lg border border-gray-600">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-300">Olympic Qualification</h4>
                          <Medal className="h-4 w-4 text-yellow-400" />
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {athlete.olympicRank ? `#${athlete.olympicRank}` : 'N/A'}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Olympic Qualification System</p>
                      </div>

                      {/* Continental Ranking */}
                      <div className="bg-athlete-gray-700 p-4 rounded-lg border border-gray-600">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-300">Continental Ranking</h4>
                          <TrendingUp className="h-4 w-4 text-green-400" />
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {athlete.continentalRank ? `#${athlete.continentalRank}` : 'N/A'}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Regional Federation</p>
                      </div>

                      {/* National Ranking */}
                      <div className="bg-athlete-gray-700 p-4 rounded-lg border border-gray-600">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-300">National Ranking</h4>
                          <Trophy className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {athlete.nationalRank ? `#${athlete.nationalRank}` : 'N/A'}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">National Federation</p>
                      </div>
                    </div>

                    {/* Ranking Analysis Results */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-white mb-4">Detailed Ranking Analysis</h4>
                      {athleteAnalysisLogs.filter(log => log.serviceType === 'rank').length > 0 ? (
                        <div className="space-y-4">
                          {athleteAnalysisLogs
                            .filter(log => log.serviceType === 'rank')
                            .map((log) => (
                              <AnalysisResult
                                key={log.id}
                                type={log.serviceType}
                                data={log.resultData}
                                createdAt={typeof log.createdAt === 'string' ? log.createdAt : (log.createdAt || new Date()).toISOString()}
                                shared={log.shared || false}
                                shareUrl={log.shareUrl || undefined}
                              />
                            ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Trophy className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                          <p className="text-gray-400 mb-4">No ranking analysis available yet</p>
                          <p className="text-sm text-gray-500">
                            Generate a ranking analysis from the Analysis Results tab to see detailed ranking progression and history
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="history">
              <Card className="bg-athlete-gray-800 border-gray-700">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-6 text-white">Transaction History</h3>
                  {athleteTransactions.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="border-b border-gray-700">
                          <tr>
                            <th className="py-3 text-gray-300">Date</th>
                            <th className="py-3 text-gray-300">Service</th>
                            <th className="py-3 text-gray-300">Tokens</th>
                            <th className="py-3 text-gray-300">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {athleteTransactions.map((transaction) => (
                            <tr key={transaction.id}>
                              <td className="py-4 text-gray-300">
                                {new Date(transaction.createdAt || '').toLocaleDateString()}
                              </td>
                              <td className="py-4 text-white">{transaction.action}</td>
                              <td className="py-4 text-athlete-warning">-{transaction.tokensDeducted}</td>
                              <td className="py-4">
                                <span className="text-athlete-success text-sm">
                                  ✓ Completed
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">📝</div>
                      <p className="text-gray-400">No transactions for this athlete yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
  );
}

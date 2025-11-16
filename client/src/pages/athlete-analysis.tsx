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
import type { AthleteWithSport, Transaction, AnalysisLog } from "@shared/schema";

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

  const { data: athlete } = useQuery<AthleteWithSport>({
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
                <div className="flex items-start justify-between mb-4">
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
                      <span className="text-sm text-gray-400">Updated: {new Date(athlete.updatedAt || '').toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-3 min-w-[200px]">
                    {/* Rankings Display - aligned with name */}
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {(() => {
                        console.log('Athlete data:', {
                          name: athlete.name,
                          rank: athlete.rank,
                          olympicRank: athlete.olympicRank,
                          continentalRank: athlete.continentalRank,
                          nationalRank: athlete.nationalRank
                        });
                        return null;
                      })()}
                      {athlete.olympicRank ? (
                        <div className="flex items-center space-x-1 bg-yellow-500/20 border-2 border-yellow-400 px-3 py-1.5 rounded-lg" data-testid="rank-olympic">
                          <Trophy className="w-4 h-4 text-yellow-300" />
                          <span className="text-yellow-300 font-bold text-sm">Olympic #{!isNaN(Number(athlete.olympicRank)) ? Math.floor(Number(athlete.olympicRank)) : athlete.olympicRank}</span>
                        </div>
                      ) : null}
                      {athlete.rank ? (
                        <div className="flex items-center space-x-1 bg-orange-500/20 border-2 border-orange-400 px-3 py-1.5 rounded-lg" data-testid="rank-world">
                          <Medal className="w-4 h-4 text-orange-300" />
                          <span className="text-orange-300 font-bold text-sm">World #{!isNaN(Number(athlete.rank)) ? Math.floor(Number(athlete.rank)) : athlete.rank}</span>
                        </div>
                      ) : null}
                      {athlete.continentalRank ? (
                        <div className="flex items-center space-x-1 bg-green-500/20 border-2 border-green-400 px-3 py-1.5 rounded-lg" data-testid="rank-continental">
                          <Target className="w-4 h-4 text-green-300" />
                          <span className="text-green-300 font-bold text-sm">Continental #{!isNaN(Number(athlete.continentalRank)) ? Math.floor(Number(athlete.continentalRank)) : athlete.continentalRank}</span>
                        </div>
                      ) : null}
                      {athlete.nationalRank ? (
                        <div className="flex items-center space-x-1 bg-blue-500/20 border-2 border-blue-400 px-3 py-1.5 rounded-lg" data-testid="rank-national">
                          <TrendingUp className="w-4 h-4 text-blue-300" />
                          <span className="text-blue-300 font-bold text-sm">National #{!isNaN(Number(athlete.nationalRank)) ? Math.floor(Number(athlete.nationalRank)) : athlete.nationalRank}</span>
                        </div>
                      ) : null}
                      {!athlete.rank && !athlete.olympicRank && !athlete.continentalRank && !athlete.nationalRank ? (
                        <span className="text-gray-400 text-sm italic bg-gray-700/30 px-3 py-1 rounded" data-testid="rank-tbd">Rankings not available</span>
                      ) : null}
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
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Personal Information Card */}
          {(athlete.country || athlete.age || athlete.personalInfo) && (
            <Card className="bg-athlete-gray-800 border-gray-700">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4 text-white flex items-center">
                  <User className="mr-2 h-5 w-5 text-athlete-accent" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {athlete.country && (
                    <div data-testid="info-nationality">
                      <label className="text-sm text-gray-400 block mb-1">Nationality</label>
                      <p className="text-white font-medium">{athlete.country}</p>
                    </div>
                  )}
                  {(athlete.age || athlete.personalInfo?.age) && (
                    <div data-testid="info-age">
                      <label className="text-sm text-gray-400 block mb-1">Age</label>
                      <p className="text-white font-medium">{athlete.personalInfo?.age || athlete.age}</p>
                    </div>
                  )}
                  {athlete.personalInfo?.dateOfBirth && (
                    <div data-testid="info-dob">
                      <label className="text-sm text-gray-400 block mb-1">Date of Birth</label>
                      <p className="text-white font-medium">{athlete.personalInfo.dateOfBirth}</p>
                    </div>
                  )}
                  {athlete.personalInfo?.height && (
                    <div data-testid="info-height">
                      <label className="text-sm text-gray-400 block mb-1">Height</label>
                      <p className="text-white font-medium">{athlete.personalInfo.height}</p>
                    </div>
                  )}
                  {athlete.personalInfo?.weight && (
                    <div data-testid="info-weight">
                      <label className="text-sm text-gray-400 block mb-1">Weight</label>
                      <p className="text-white font-medium">{athlete.personalInfo.weight}</p>
                    </div>
                  )}
                  {athlete.personalInfo?.club && (
                    <div data-testid="info-club">
                      <label className="text-sm text-gray-400 block mb-1">Club</label>
                      <p className="text-white font-medium">{athlete.personalInfo.club}</p>
                    </div>
                  )}
                  {athlete.personalInfo?.position && (
                    <div data-testid="info-position">
                      <label className="text-sm text-gray-400 block mb-1">Position</label>
                      <p className="text-white font-medium">{athlete.personalInfo.position}</p>
                    </div>
                  )}
                  {athlete.personalInfo?.yearsInCurrentSport && (
                    <div data-testid="info-years-in-sport">
                      <label className="text-sm text-gray-400 block mb-1">Years in Sport</label>
                      <p className="text-white font-medium">{athlete.personalInfo.yearsInCurrentSport}</p>
                    </div>
                  )}
                  {athlete.personalInfo?.educationalBackground && (
                    <div data-testid="info-education" className="md:col-span-2 lg:col-span-3">
                      <label className="text-sm text-gray-400 block mb-1">Educational Background</label>
                      <p className="text-white font-medium">{athlete.personalInfo.educationalBackground}</p>
                    </div>
                  )}
                  {athlete.personalInfo?.previousSports && athlete.personalInfo.previousSports.length > 0 && (
                    <div data-testid="info-previous-sports" className="md:col-span-2 lg:col-span-3">
                      <label className="text-sm text-gray-400 block mb-1">Previous Sports</label>
                      <p className="text-white font-medium">{athlete.personalInfo.previousSports.join(', ')}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

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
              {athlete?.sport && isIndividualSport(athlete.sport.name) && (
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
                      athlete={athlete}
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
            {athlete?.sport && isIndividualSport(athlete.sport.name) && (
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

                    {/* Current Ranking Display */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      {/* Current World Ranking */}
                      <div className="bg-athlete-gray-700 p-6 rounded-lg border border-gray-600">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-medium text-gray-300">Current World Ranking</h4>
                          <Target className="h-6 w-6 text-athlete-warning" />
                        </div>
                        <div className="text-4xl font-bold text-white mb-2">
                          {athlete?.rank ? `#${athlete.rank}` : 'Unranked'}
                        </div>
                        <p className="text-sm text-gray-400">International Federation Ranking</p>
                        {athlete?.rank && (
                          <div className="mt-3 flex items-center text-sm text-green-400">
                            <TrendingUp className="h-4 w-4 mr-1" />
                            Official ranking in {athlete.sport?.name || 'sport'}
                          </div>
                        )}
                      </div>

                      {/* Ranking Status */}
                      <div className="bg-athlete-gray-700 p-6 rounded-lg border border-gray-600">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-medium text-gray-300">Ranking Status</h4>
                          <Medal className="h-6 w-6 text-yellow-400" />
                        </div>
                        <div className="space-y-3">
                          {athlete?.rank ? (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400">Qualification Status:</span>
                                <span className="text-green-400 font-medium">
                                  {athlete.rank <= 50 ? 'Elite Level' : 
                                   athlete.rank <= 200 ? 'International Level' : 
                                   athlete.rank <= 1000 ? 'National Level' : 'Competitive Level'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400">Competition Tier:</span>
                                <span className="text-blue-400 font-medium">
                                  {athlete.rank <= 10 ? 'Olympic Contender' :
                                   athlete.rank <= 100 ? 'World Championship Level' :
                                   athlete.rank <= 500 ? 'International Events' : 'National/Regional Events'}
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="text-gray-400">
                              <p>No official ranking available</p>
                              <p className="text-sm mt-2">Generate a ranking analysis to discover current standings</p>
                            </div>
                          )}
                        </div>
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
                                athlete={athlete}
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

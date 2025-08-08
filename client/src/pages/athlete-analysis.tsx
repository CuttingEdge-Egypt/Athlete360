import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Navigation } from "@/components/Navigation";
import { AnalysisResult } from "@/components/ui/analysis-result";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, RefreshCw, Sparkles, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Athlete, Transaction, AnalysisLog } from "@shared/schema";

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
      <div className="min-h-screen bg-athlete-primary text-white">
        <Navigation />
        <div className="pt-20 flex items-center justify-center">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-athlete-primary text-white">
      <Navigation />
      
      <div className="pt-20 pb-20">
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
                        <span className="text-sm text-athlete-warning">Rank #{athlete.rank || "TBD"}</span>
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
      </div>
    </div>
  );
}

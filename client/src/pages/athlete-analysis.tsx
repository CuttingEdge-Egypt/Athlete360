import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Navigation } from "@/components/Navigation";
import { AnalysisResult } from "@/components/ui/analysis-result";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import type { Athlete, Transaction, AnalysisLog } from "@shared/schema";

export default function AthleteAnalysis() {
  const [, params] = useRoute("/athlete/:id");
  const athleteId = params?.id;

  const { data: athlete } = useQuery<Athlete>({
    queryKey: ["/api/athletes", athleteId],
    enabled: !!athleteId,
  });

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const { data: analysisLogs, error: analysisLogsError, isLoading: analysisLogsLoading } = useQuery<AnalysisLog[]>({
    queryKey: ["/api/analysis-logs"],
    retry: false,
    staleTime: 0, // Always fetch fresh data
  });

  // Handle null return from authentication failure
  const safeAnalysisLogs = analysisLogs || [];
  
  console.log('Analysis Logs Query:', { 
    analysisLogs: safeAnalysisLogs, 
    analysisLogsError, 
    analysisLogsLoading,
    isNull: analysisLogs === null
  });

  const athleteTransactions = transactions.filter(t => t.athleteId === athleteId);
  const athleteAnalysisLogs = safeAnalysisLogs.filter(l => l.athleteId === athleteId);

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
                <div className="flex items-center space-x-6">
                  <img 
                    src={athlete.profileImageUrl || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500"}
                    alt={athlete.name}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{athlete.name}</h1>
                    <p className="text-gray-400 mb-2">{athlete.bio}</p>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-athlete-warning">Rank #{athlete.rank || "TBD"}</span>
                      <span className="text-sm text-gray-400">Updated: {new Date(athlete.updatedAt || '').toLocaleDateString()}</span>
                    </div>
                  </div>
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
              {analysisLogsError || analysisLogs === null ? (
                <Card className="bg-red-900/20 border-red-500/30">
                  <CardContent className="p-6 text-center">
                    <div className="text-red-400 mb-4">⚠ Authentication Error</div>
                    <p className="text-red-300 mb-4">Unable to fetch analysis results. Please try logging in again.</p>
                    <Button 
                      onClick={() => window.location.href = '/api/login'}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Login Again
                    </Button>
                  </CardContent>
                </Card>
              ) : analysisLogsLoading ? (
                <Card className="bg-athlete-gray-800 border-gray-700">
                  <CardContent className="p-12 text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading analysis results...</p>
                  </CardContent>
                </Card>
              ) : athleteAnalysisLogs.length > 0 ? (
                <div className="grid gap-6">
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-green-400 text-sm">✓ Found {athleteAnalysisLogs.length} analysis results</p>
                  </div>
                  {athleteAnalysisLogs.map((log) => (
                    <AnalysisResult
                      key={log.id}
                      type={log.serviceType}
                      data={log.resultData}
                      createdAt={log.createdAt}
                      shared={log.shared}
                      shareUrl={log.shareUrl}
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

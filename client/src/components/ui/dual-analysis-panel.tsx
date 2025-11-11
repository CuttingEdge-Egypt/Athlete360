import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, Trophy, BarChart } from "lucide-react";
import { Line } from 'react-chartjs-2';

interface DualAnalysisPanelProps {
  competitiveAnalysis: any;
  rankAnalysis: string | null;
  rankHistoryData: Array<{
    date: string;
    rank: number;
    month?: string;
    year?: number;
  }> | null;
  variant?: 'full' | 'modal';
  defaultTab?: 'competitive' | 'rank';
  className?: string;
}

export function DualAnalysisPanel({
  competitiveAnalysis,
  rankAnalysis,
  rankHistoryData,
  variant = 'full',
  defaultTab = 'competitive',
  className = '',
}: DualAnalysisPanelProps) {
  const athlete = competitiveAnalysis?.athlete;
  const rankingProgression = competitiveAnalysis?.rankingProgression || [];
  const careerSummary = competitiveAnalysis?.careerSummary || {};

  const renderRankHistoryContent = () => {
    if (!rankHistoryData || rankHistoryData.length === 0) {
      return (
        <div className="p-6 text-center">
          <p className="text-gray-400">No rank history data available</p>
        </div>
      );
    }

    const sortedHistory = [...rankHistoryData].sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const chartData = {
      labels: sortedHistory.map((entry: any) => entry.date),
      datasets: [
        {
          label: 'World Rank',
          data: sortedHistory.map((entry: any) => entry.rank),
          borderColor: 'rgb(251, 146, 60)',
          backgroundColor: 'rgba(251, 146, 60, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointHoverRadius: 7,
        }
      ]
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          reverse: true,
          beginAtZero: false,
          ticks: {
            color: 'rgb(156, 163, 175)',
            callback: function(value: any) {
              return '#' + value;
            }
          },
          grid: {
            color: 'rgba(75, 85, 99, 0.3)'
          }
        },
        x: {
          ticks: {
            color: 'rgb(156, 163, 175)',
            maxRotation: 45,
            minRotation: 45
          },
          grid: {
            color: 'rgba(75, 85, 99, 0.3)'
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: 'rgb(209, 213, 219)'
          }
        },
        tooltip: {
          callbacks: {
            label: function(context: any) {
              return 'Rank: #' + context.parsed.y;
            }
          }
        }
      }
    };

    return (
      <div className="space-y-6">
        <Card className="bg-athlete-gray-800 border-gray-600">
          <CardHeader>
            <CardTitle className="text-2xl text-gray-100 flex items-center">
              <TrendingUp className="mr-3 text-orange-400" size={24} />
              Rank Progression Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <Line data={chartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        {rankAnalysis && (
          <Card className="bg-athlete-gray-800 border-gray-600">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-100 flex items-center">
                <BarChart className="mr-3 text-blue-400" size={24} />
                Rank History Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-invert max-w-none">
                <div 
                  className="text-gray-300 leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ 
                    __html: rankAnalysis.replace(/\n/g, '<br/>') 
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderCompetitiveHistoryContent = () => (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-athlete-gray-800 to-athlete-gray-700 border-l-4 border-l-blue-400 border-gray-600">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-3xl font-bold text-blue-400 flex items-center">
              <Trophy className="mr-3" size={28} />
              Career Overview
            </h3>
            {athlete?.isActive && (
              <Badge variant="default" className="bg-green-600 text-white px-3 py-1">
                Active
              </Badge>
            )}
          </div>
          
          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-athlete-gray-600 rounded-lg border border-blue-500/20">
              <div className="text-2xl font-bold text-white">{athlete?.currentRanking || 'N/A'}</div>
              <div className="text-sm text-blue-300">Current Rank</div>
            </div>
            <div className="text-center p-4 bg-athlete-gray-600 rounded-lg border border-green-500/20">
              <div className="text-2xl font-bold text-green-400">{athlete?.peakRanking || 'N/A'}</div>
              <div className="text-sm text-green-300">Peak Rank</div>
            </div>
            <div className="text-center p-4 bg-athlete-gray-600 rounded-lg border border-yellow-500/20">
              <div className="text-2xl font-bold text-yellow-400">{athlete?.officialRecord || 'N/A'}</div>
              <div className="text-sm text-yellow-300">Record</div>
            </div>
            <div className="text-center p-4 bg-athlete-gray-600 rounded-lg border border-purple-500/20">
              <div className="text-2xl font-bold text-purple-400">{careerSummary.totalCompetitions || 'N/A'}</div>
              <div className="text-sm text-purple-300">Competitions</div>
            </div>
          </div>
        </CardContent>
      </Card>

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
                      {entry.location || 'Location TBD'} • {entry.date || 'Date TBD'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-400">
                      {entry.result || entry.placement || 'Participated'}
                    </div>
                    {entry.ranking && (
                      <div className="text-sm text-gray-400">Rank: #{entry.ranking}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <Tabs defaultValue={defaultTab} className={`w-full ${className}`}>
      <TabsList className="grid w-full grid-cols-2 bg-athlete-gray-700">
        <TabsTrigger 
          value="competitive"
          data-testid="tab-competitive-history"
          className="data-[state=active]:bg-athlete-accent"
        >
          <Calendar className="mr-2 h-4 w-4" />
          Competitive History
        </TabsTrigger>
        <TabsTrigger 
          value="rank"
          data-testid="tab-rank-history"
          className="data-[state=active]:bg-athlete-accent"
        >
          <TrendingUp className="mr-2 h-4 w-4" />
          Rank History
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="competitive" className="mt-6">
        {renderCompetitiveHistoryContent()}
      </TabsContent>
      
      <TabsContent value="rank" className="mt-6">
        {renderRankHistoryContent()}
      </TabsContent>
    </Tabs>
  );
}

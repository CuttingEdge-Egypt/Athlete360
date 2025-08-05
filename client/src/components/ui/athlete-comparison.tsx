import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users2, 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  Star, 
  Zap,
  Target,
  Activity,
  Brain,
  Heart
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Athlete, Sport } from "@shared/schema";

interface ComparisonData {
  athlete1: Athlete;
  athlete2: Athlete;
  comparison: {
    strengths: {
      athlete1: string[];
      athlete2: string[];
      advantage: 'athlete1' | 'athlete2' | 'even';
    };
    weaknesses: {
      athlete1: string[];
      athlete2: string[];
      advantage: 'athlete1' | 'athlete2' | 'even';
    };
    ranking: {
      athlete1Rank: number;
      athlete2Rank: number;
      advantage: 'athlete1' | 'athlete2' | 'even';
    };
    headToHead: {
      prediction: 'athlete1' | 'athlete2' | 'even';
      confidence: number;
      reasoning: string;
    };
    overallAnalysis: string;
  };
}

export function AthleteComparison() {
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [selectedAthlete1, setSelectedAthlete1] = useState<string>("");
  const [selectedAthlete2, setSelectedAthlete2] = useState<string>("");
  const { toast } = useToast();

  const { data: sports = [] } = useQuery<Sport[]>({
    queryKey: ["/api/sports"],
  });

  const { data: allAthletes = [] } = useQuery<Athlete[]>({
    queryKey: ["/api/athletes/by-sport", selectedSport],
    enabled: !!selectedSport,
    queryFn: async () => {
      const response = await fetch(`/api/athletes/by-sport/${selectedSport}`);
      return response.json();
    }
  });

  // Deduplicate athletes by name, keeping the most recent record
  const athletes = allAthletes.reduce((acc: Athlete[], current) => {
    const existingIndex = acc.findIndex(athlete => 
      athlete.name.toLowerCase().trim() === current.name.toLowerCase().trim()
    );
    
    if (existingIndex === -1) {
      acc.push(current);
    } else {
      // Keep the more recent record (or the one with more complete data)
      const existing = acc[existingIndex];
      const currentDate = new Date(current.updatedAt || current.createdAt || 0);
      const existingDate = new Date(existing.updatedAt || existing.createdAt || 0);
      
      if (currentDate > existingDate || 
          (current.bio && current.bio.length > (existing.bio?.length || 0))) {
        acc[existingIndex] = current;
      }
    }
    
    return acc;
  }, []);

  const comparisonMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/athletes/compare", {
        athlete1Id: selectedAthlete1,
        athlete2Id: selectedAthlete2
      });
    },
    onError: (error: any) => {
      toast({
        title: "Comparison Failed",
        description: error.message || "Failed to generate comparison",
        variant: "destructive",
      });
    },
  });

  const handleCompare = () => {
    if (!selectedAthlete1 || !selectedAthlete2) {
      toast({
        title: "Selection Required",
        description: "Please select two athletes to compare",
        variant: "destructive",
      });
      return;
    }

    if (selectedAthlete1 === selectedAthlete2) {
      toast({
        title: "Invalid Selection",
        description: "Please select two different athletes",
        variant: "destructive",
      });
      return;
    }

    comparisonMutation.mutate();
  };

  const comparisonData = comparisonMutation.data as ComparisonData | undefined;
  const availableAthletes1 = athletes.filter(a => a.id !== selectedAthlete2);
  const availableAthletes2 = athletes.filter(a => a.id !== selectedAthlete1);

  return (
    <Card className="bg-athlete-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Users2 className="h-5 w-5" />
          Athlete Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selection Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Sport</label>
            <Select
              value={selectedSport}
              onValueChange={setSelectedSport}
              data-testid="select-sport"
            >
              <SelectTrigger className="bg-athlete-gray-700 border-gray-600">
                <SelectValue placeholder="Select sport..." />
              </SelectTrigger>
              <SelectContent>
                {sports.map((sport) => (
                  <SelectItem key={sport.id} value={sport.id}>
                    {sport.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Athlete 1</label>
            <Select
              value={selectedAthlete1}
              onValueChange={setSelectedAthlete1}
              disabled={!selectedSport}
              data-testid="select-athlete1"
            >
              <SelectTrigger className="bg-athlete-gray-700 border-gray-600">
                <SelectValue placeholder="Select first athlete..." />
              </SelectTrigger>
              <SelectContent>
                {availableAthletes1.map((athlete) => (
                  <SelectItem key={athlete.id} value={athlete.id}>
                    <div className="flex items-center gap-2">
                      <span>{athlete.name}</span>
                      {athlete.rank && (
                        <span className="text-xs text-gray-400">#{athlete.rank}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Athlete 2</label>
            <Select
              value={selectedAthlete2}
              onValueChange={setSelectedAthlete2}
              disabled={!selectedSport || !selectedAthlete1}
              data-testid="select-athlete2"
            >
              <SelectTrigger className="bg-athlete-gray-700 border-gray-600">
                <SelectValue placeholder="Select second athlete..." />
              </SelectTrigger>
              <SelectContent>
                {availableAthletes2.map((athlete) => (
                  <SelectItem key={athlete.id} value={athlete.id}>
                    <div className="flex items-center gap-2">
                      <span>{athlete.name}</span>
                      {athlete.rank && (
                        <span className="text-xs text-gray-400">#{athlete.rank}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleCompare}
          disabled={!selectedAthlete1 || !selectedAthlete2 || comparisonMutation.isPending}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          data-testid="button-compare"
        >
          {comparisonMutation.isPending ? (
            <>
              <Activity className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Compare Athletes
            </>
          )}
        </Button>

        {/* Comparison Results */}
        {comparisonData && (
          <div className="space-y-6 mt-8">
            <Separator className="bg-gray-600" />
            
            {/* Athlete Headers */}
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <img
                  src={comparisonData.athlete1.profileImageUrl || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b"}
                  alt={comparisonData.athlete1.name}
                  className="w-20 h-20 rounded-full object-cover mx-auto mb-3"
                />
                <h3 className="text-xl font-bold text-white">{comparisonData.athlete1.name}</h3>
                <Badge variant="outline" className="mt-2">
                  Rank #{comparisonData.athlete1.rank || "TBD"}
                </Badge>
              </div>
              
              <div className="text-center">
                <img
                  src={comparisonData.athlete2.profileImageUrl || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b"}
                  alt={comparisonData.athlete2.name}
                  className="w-20 h-20 rounded-full object-cover mx-auto mb-3"
                />
                <h3 className="text-xl font-bold text-white">{comparisonData.athlete2.name}</h3>
                <Badge variant="outline" className="mt-2">
                  Rank #{comparisonData.athlete2.rank || "TBD"}
                </Badge>
              </div>
            </div>

            {/* Detailed Comparison */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-athlete-gray-700">
                <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                <TabsTrigger value="strengths" data-testid="tab-strengths">Strengths</TabsTrigger>
                <TabsTrigger value="weaknesses" data-testid="tab-weaknesses">Weaknesses</TabsTrigger>
                <TabsTrigger value="prediction" data-testid="tab-prediction">Head-to-Head</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <Card className="bg-athlete-gray-900 border-gray-600">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className="h-5 w-5 text-blue-400" />
                      <h4 className="font-semibold text-white">Overall Analysis</h4>
                    </div>
                    <p className="text-gray-300 leading-relaxed">
                      {comparisonData.comparison.overallAnalysis}
                    </p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-athlete-gray-900 border-gray-600">
                    <CardContent className="p-4 text-center">
                      <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                      <div className="text-sm text-gray-400">Ranking Advantage</div>
                      <div className="text-lg font-bold text-white">
                        {comparisonData.comparison.ranking.advantage === 'athlete1' ? comparisonData.athlete1.name :
                         comparisonData.comparison.ranking.advantage === 'athlete2' ? comparisonData.athlete2.name : 'Even'}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-athlete-gray-900 border-gray-600">
                    <CardContent className="p-4 text-center">
                      <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <div className="text-sm text-gray-400">Strength Advantage</div>
                      <div className="text-lg font-bold text-white">
                        {comparisonData.comparison.strengths.advantage === 'athlete1' ? comparisonData.athlete1.name :
                         comparisonData.comparison.strengths.advantage === 'athlete2' ? comparisonData.athlete2.name : 'Even'}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-athlete-gray-900 border-gray-600">
                    <CardContent className="p-4 text-center">
                      <Target className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                      <div className="text-sm text-gray-400">Predicted Winner</div>
                      <div className="text-lg font-bold text-white">
                        {comparisonData.comparison.headToHead.prediction === 'athlete1' ? comparisonData.athlete1.name :
                         comparisonData.comparison.headToHead.prediction === 'athlete2' ? comparisonData.athlete2.name : 'Even Match'}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="strengths" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-athlete-gray-900 border-gray-600">
                    <CardHeader>
                      <CardTitle className="text-lg text-white">{comparisonData.athlete1.name} Strengths</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {comparisonData.comparison.strengths.athlete1.map((strength, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-green-500" />
                          <span className="text-gray-300">{strength}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="bg-athlete-gray-900 border-gray-600">
                    <CardHeader>
                      <CardTitle className="text-lg text-white">{comparisonData.athlete2.name} Strengths</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {comparisonData.comparison.strengths.athlete2.map((strength, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-green-500" />
                          <span className="text-gray-300">{strength}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="weaknesses" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-athlete-gray-900 border-gray-600">
                    <CardHeader>
                      <CardTitle className="text-lg text-white">{comparisonData.athlete1.name} Areas to Improve</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {comparisonData.comparison.weaknesses.athlete1.map((weakness, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-orange-500" />
                          <span className="text-gray-300">{weakness}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="bg-athlete-gray-900 border-gray-600">
                    <CardHeader>
                      <CardTitle className="text-lg text-white">{comparisonData.athlete2.name} Areas to Improve</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {comparisonData.comparison.weaknesses.athlete2.map((weakness, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-orange-500" />
                          <span className="text-gray-300">{weakness}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="prediction" className="space-y-4">
                <Card className="bg-athlete-gray-900 border-gray-600">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Heart className="h-5 w-5 text-red-500" />
                      Head-to-Head Prediction
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white mb-2">
                        {comparisonData.comparison.headToHead.prediction === 'athlete1' ? comparisonData.athlete1.name :
                         comparisonData.comparison.headToHead.prediction === 'athlete2' ? comparisonData.athlete2.name : 'Even Match'}
                      </div>
                      <Badge variant="outline" className="text-lg px-4 py-1">
                        {comparisonData.comparison.headToHead.confidence}% Confidence
                      </Badge>
                    </div>
                    
                    <Separator className="bg-gray-600" />
                    
                    <div>
                      <h4 className="font-semibold text-white mb-2">Analysis Reasoning</h4>
                      <p className="text-gray-300 leading-relaxed">
                        {comparisonData.comparison.headToHead.reasoning}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
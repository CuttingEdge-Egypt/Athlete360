import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "@/components/Navigation";
import { ServiceCard } from "@/components/ui/service-card";
import { TokenModal } from "@/components/ui/token-modal";
import { AnalysisPopup } from "@/components/ui/analysis-popup";
import { AthleteComparison } from "@/components/ui/athlete-comparison";
import { SportsApiDashboard } from "@/components/ui/sports-api-dashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Search, Star } from "lucide-react";
import type { Sport, Athlete } from "@shared/schema";

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedSport, setSelectedSport] = useState<string>("");

  
  // Get athletes for the selected sport with deduplication
  const { data: allAthletes = [] } = useQuery<Athlete[]>({
    queryKey: ["/api/athletes/by-sport", selectedSport],
    enabled: !!selectedSport,
    queryFn: async () => {
      const response = await fetch(`/api/athletes/by-sport/${selectedSport}`);
      return response.json();
    }
  });

  // Deduplicate athletes by name, keeping the most recent record
  const availableAthletes = allAthletes.reduce((acc: Athlete[], current) => {
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
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showBioPopup, setShowBioPopup] = useState(false);
  const [bioData, setBioData] = useState(null);

  const { data: sports = [] } = useQuery<Sport[]>({
    queryKey: ["/api/sports"],
  });

  // Reset selected athlete when sport changes
  const handleSportChange = (sportId: string) => {
    setSelectedSport(sportId);
    setSelectedAthlete(null);
  };

  const handleAthleteCardClick = async () => {
    if (!selectedAthlete) return;
    
    try {
      const response = await fetch(`/api/analysis/${selectedAthlete.id}/bio`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setBioData(data);
        setShowBioPopup(true);
      } else {
        toast({
          title: "Analysis Error",
          description: "Failed to generate athlete biography",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load athlete biography",
        variant: "destructive",
      });
    }
  };



  const services = [
    {
      id: "bio",
      title: "Bio Analysis",
      description: "Complete athlete biography with career highlights and achievements",
      cost: 50,
      icon: "user-alt",
      color: "text-athlete-accent"
    },
    {
      id: "rank",
      title: "Rank History",
      description: "Interactive charts showing ranking progression and improvement recommendations",
      cost: 70,
      icon: "trophy",
      color: "text-athlete-warning"
    },
    {
      id: "strengths",
      title: "Strengths",
      description: "Detailed analysis of key strengths and competitive advantages",
      cost: 50,
      icon: "muscle",
      color: "text-athlete-success"
    },
    {
      id: "weaknesses",
      title: "Weaknesses",
      description: "Identify areas for improvement and development opportunities",
      cost: 50,
      icon: "exclamation-triangle",
      color: "text-athlete-danger"
    },
    {
      id: "development-plan",
      title: "Development Plan",
      description: "4-week personalized training plan to address weaknesses",
      cost: 80,
      icon: "calendar-alt",
      color: "text-purple-400"
    },
    {
      id: "nutrition",
      title: "Nutrition Plan",
      description: "Comprehensive meal planning based on body composition and goals",
      cost: 90,
      icon: "apple-alt",
      color: "text-green-400"
    },
    {
      id: "beat-strategies",
      title: "How to Beat",
      description: "Tactical strategies and techniques to gain competitive advantage",
      cost: 100,
      icon: "chess",
      color: "text-red-400"
    },
    {
      id: "video-analysis",
      title: "Video Analysis",
      description: "AI-powered analysis of performance videos and gameplay footage",
      cost: 120,
      icon: "video",
      color: "text-indigo-400"
    }
  ];

  return (
    <div className="min-h-screen bg-athlete-primary text-white">
      <Navigation />
      
      <div className="pt-20 pb-20">
        <div className="container mx-auto px-4">
          {/* Welcome Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 text-white">
              Welcome to Athlete360
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Analyze any athlete's performance with AI-powered insights
            </p>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="analysis" className="max-w-6xl mx-auto">
            <TabsList className="grid w-full grid-cols-3 bg-athlete-gray-800 mb-8">
              <TabsTrigger 
                value="analysis" 
                data-testid="tab-analysis"
                className="data-[state=active]:bg-athlete-accent"
              >
                Athlete Analysis
              </TabsTrigger>
              <TabsTrigger 
                value="comparison" 
                data-testid="tab-comparison"
                className="data-[state=active]:bg-athlete-accent"
              >
                Compare Athletes
              </TabsTrigger>
              <TabsTrigger 
                value="api-integration" 
                data-testid="tab-api-integration"
                className="data-[state=active]:bg-athlete-accent"
              >
                API Integration
              </TabsTrigger>
            </TabsList>

            <TabsContent value="analysis" className="space-y-8">
              {/* Sport & Athlete Selection */}
              <Card className="bg-athlete-gray-800 border-gray-700">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold mb-6 text-center text-white">Select Sport & Athlete</h2>
              
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Sport</label>
                  <Select value={selectedSport} onValueChange={handleSportChange}>
                    <SelectTrigger 
                      data-testid="select-sport"
                      className="bg-athlete-gray-700 border-gray-600 text-white"
                    >
                      <SelectValue placeholder="Choose a sport..." />
                    </SelectTrigger>
                    <SelectContent className="bg-athlete-gray-700 border-gray-600">
                      {sports.map((sport) => (
                        <SelectItem key={sport.id} value={sport.id}>
                          {sport.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Athlete</label>
                  <Select
                    value={selectedAthlete?.id || ""}
                    onValueChange={(athleteId) => {
                      const athlete = availableAthletes.find(a => a.id === athleteId);
                      setSelectedAthlete(athlete || null);
                    }}
                    disabled={!selectedSport}
                    data-testid="select-athlete"
                  >
                    <SelectTrigger className="bg-athlete-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder={selectedSport ? "Select an athlete..." : "Select sport first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAthletes.map((athlete) => (
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

              {/* Current Athlete Display */}
              {selectedAthlete && (
                <Card 
                  className="bg-athlete-gray-700 border-gray-600 cursor-pointer hover:border-athlete-accent transition-colors duration-300"
                  onClick={handleAthleteCardClick}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <img 
                          src={selectedAthlete.profileImageUrl || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500"}
                          alt="Athlete profile" 
                          className="w-16 h-16 rounded-full object-cover"
                        />
                        <div>
                          <h3 className="text-xl font-bold text-white">{selectedAthlete.name}</h3>
                          <p className="text-gray-400 capitalize">{selectedSport || "Multi-Sport"}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Star className="text-athlete-warning" size={16} />
                            <span className="text-sm text-gray-300">Rank #{selectedAthlete.rank || "TBD"}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-athlete-accent">
                        <span className="text-sm">Click for Biography →</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
                </CardContent>
              </Card>

              {/* Service Boxes Grid */}
              {selectedAthlete && (
                <div>
                  <h2 className="text-3xl font-bold text-center mb-8 text-white">Analysis Services</h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {services.map((service) => (
                      <ServiceCard
                        key={service.id}
                        service={service}
                        athlete={selectedAthlete}
                        onInsufficientTokens={() => setShowTokenModal(true)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!selectedAthlete && (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4">🏆</div>
                  <h3 className="text-2xl font-bold mb-4 text-white">Ready to Analyze?</h3>
                  <p className="text-gray-400 max-w-md mx-auto">
                    Select a sport and enter an athlete's name to begin your comprehensive analysis journey.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="comparison" className="space-y-8">
              <AthleteComparison />
            </TabsContent>

            <TabsContent value="api-integration" className="space-y-8">
              <SportsApiDashboard />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <TokenModal 
        open={showTokenModal} 
        onOpenChange={setShowTokenModal}
      />

      {showBioPopup && bioData && selectedAthlete && (
        <AnalysisPopup
          open={showBioPopup}
          onOpenChange={setShowBioPopup}
          type="bio"
          data={bioData}
          athleteName={selectedAthlete.name}
          createdAt={new Date().toISOString()}
        />
      )}
    </div>
  );
}

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

import { ServiceCard } from "@/components/ui/service-card";
import { TokenModal } from "@/components/ui/token-modal";
import { TestingPanel } from "@/components/ui/testing-panel";
import { AnalysisPopup } from "@/components/ui/analysis-popup";
import { AthleteComparison } from "@/components/ui/athlete-comparison";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Search, Star, User, Loader2 } from "lucide-react";
import type { Sport, Athlete } from "@shared/schema";

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [searchName, setSearchName] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);

  // Get all countries
  const { data: countries = [] } = useQuery<string[]>({
    queryKey: ["/api/countries"],
  });
  
  // Get athletes for the selected sport with deduplication (only if no search is active)
  const { data: allAthletes = [] } = useQuery<Athlete[]>({
    queryKey: ["/api/athletes/by-sport", selectedSport, selectedCountry],
    enabled: !!selectedSport && !searchName.trim(),
    queryFn: async () => {
      try {
        const url = new URL(`/api/athletes/by-sport/${selectedSport}`, window.location.origin);
        if (selectedCountry) {
          url.searchParams.set('country', selectedCountry);
        }
        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching athletes by sport:', error);
        toast({
          title: "Error",
          description: "Failed to load athletes. Please try again.",
          variant: "destructive",
        });
        return [];
      }
    }
  });

  // Search athletes by name with AI fallback
  const { data: searchResults = [], isLoading: isSearchLoading } = useQuery<Athlete[]>({
    queryKey: ["/api/athletes/search-by-name", searchName.trim(), selectedSport],
    enabled: !!searchName.trim() && searchName.trim().length >= 2,
    queryFn: async () => {
      try {
        const response = await fetch(`/api/athletes/search-by-name?name=${encodeURIComponent(searchName.trim())}&sportId=${encodeURIComponent(selectedSport)}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      } catch (error) {
        console.error('Error searching athletes:', error);
        toast({
          title: "Search Error",
          description: "Failed to search athletes. Please try again.",
          variant: "destructive",
        });
        return [];
      }
    }
  });

  // Determine which athletes to display: search results or sport-filtered athletes
  const displayAthletes = searchName.trim() ? searchResults : allAthletes;

  // Deduplicate athletes by name, keeping the most recent record
  const availableAthletes = displayAthletes.reduce((acc: Athlete[], current) => {
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

  // Handle creating athlete with AI
  const handleCreateAthleteWithAI = async (athleteName: string) => {
    if (!selectedSport || !athleteName.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch('/api/athletes/create-with-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: athleteName.trim(),
          sportId: selectedSport,
          nationality: selectedCountry // Pass selected nationality to improve AI search accuracy
        }),
      });
      
      if (response.ok) {
        const newAthlete = await response.json();
        setSelectedAthlete(newAthlete);
        setSearchName(newAthlete.name);
        toast({
          title: "Athlete Created",
          description: `${newAthlete.name} has been added to our database with AI-powered insights.`,
        });
      } else {
        const error = await response.json();
        toast({
          title: "Creation Failed",
          description: error.message || "Failed to create athlete with AI",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating athlete:', error);
      toast({
        title: "Error",
        description: "Something went wrong while creating the athlete",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Reset selected athlete when sport changes
  const handleSportChange = (sportId: string) => {
    setSelectedSport(sportId);
    setSelectedAthlete(null);
    setSearchName("");
  };

  // Reset selected athlete when country changes
  const handleCountryChange = (country: string) => {
    setSelectedCountry(country === "all" ? "" : country);
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
        
        // Invalidate queries to refresh token balance immediately
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/analysis-logs"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user-history"] });
        
        // Force refetch user data immediately
        queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
        
        toast({
          title: "Analysis Complete",
          description: "Biography analysis generated successfully!",
        });
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
      id: "nutrition-plan",
      title: "Nutrition Plan",
      description: "AI-powered personalized nutrition plan based on sport, age, gender, and nationality",
      cost: 75,
      icon: "apple-alt",
      color: "text-green-500"
    },
    {
      id: "beat-strategies",
      title: "How to Beat",
      description: "Tactical strategies and techniques to gain competitive advantage",
      cost: 100,
      icon: "chess",
      color: "text-red-400"
    }
  ];

  return (
    <div className="container mx-auto px-4 pt-20">
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
                value="testing" 
                data-testid="tab-testing"
                className="data-[state=active]:bg-athlete-accent"
              >
                🧪 Testing Panel
              </TabsTrigger>
            </TabsList>

            <TabsContent value="analysis" className="space-y-8">
              {/* Sport & Athlete Selection */}
              <Card className="bg-athlete-gray-800 border-gray-700">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold mb-6 text-center text-white">Select Sport & Athlete</h2>
              
              <div className="grid md:grid-cols-3 gap-6 mb-6">
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
                  <label className="block text-sm font-medium mb-2 text-gray-300">Country</label>
                  <Select value={selectedCountry || "all"} onValueChange={handleCountryChange}>
                    <SelectTrigger 
                      data-testid="select-country"
                      className="bg-athlete-gray-700 border-gray-600 text-white"
                    >
                      <SelectValue placeholder="All countries" />
                    </SelectTrigger>
                    <SelectContent className="bg-athlete-gray-700 border-gray-600">
                      <SelectItem value="all">All countries</SelectItem>
                      {countries.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Athlete Name</label>
                  <div className="relative">
                    <Input
                      data-testid="search-athlete-name"
                      placeholder="Search athlete by name..."
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      className="bg-athlete-gray-700 border-gray-600 text-white pl-10"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    {isSearchLoading && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin w-4 h-4 border-2 border-athlete-accent border-t-transparent rounded-full"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Dropdown for search results */}
                  {searchName.trim() && availableAthletes.length > 0 && (
                    <div className="mt-2 bg-athlete-gray-700 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {availableAthletes.map((athlete) => (
                        <button
                          key={athlete.id}
                          data-testid={`athlete-option-${athlete.id}`}
                          onClick={() => {
                            setSelectedAthlete(athlete);
                            setSearchName(athlete.name);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-athlete-gray-600 text-white border-b border-gray-600 last:border-b-0"
                        >
                          <div className="font-medium">{athlete.name}</div>
                          {athlete.country && (
                            <div className="text-sm text-gray-400">{athlete.country}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {searchName.trim() && !isSearchLoading && availableAthletes.length === 0 && (
                    <div className="mt-2 bg-athlete-gray-700 border border-gray-600 rounded-md p-4 text-center">
                      <p className="text-gray-300 mb-2">Athlete not found</p>
                      <Button
                        data-testid="create-athlete-ai"
                        onClick={() => handleCreateAthleteWithAI(searchName.trim())}
                        className="bg-athlete-accent hover:bg-athlete-accent/80 text-white"
                        disabled={!selectedSport || isSearching}
                      >
                        {isSearching ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Searching with AI...
                          </>
                        ) : (
                          <>
                            <Search className="mr-2 h-4 w-4" />
                            Search with AI
                          </>
                        )}
                      </Button>
                    </div>
                  )}
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
                        <div className="relative w-16 h-16">
                          {selectedAthlete.profileImageUrl ? (
                            <img 
                              src={selectedAthlete.profileImageUrl}
                              alt="Athlete profile" 
                              className="w-16 h-16 rounded-full object-cover"
                              onError={(e) => {
                                const img = e.currentTarget;
                                const fallback = img.parentElement?.querySelector('.profile-fallback') as HTMLElement;
                                if (fallback) {
                                  img.style.display = 'none';
                                  fallback.style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <div 
                            className={`profile-fallback w-16 h-16 rounded-full bg-athlete-gray-600 flex items-center justify-center absolute top-0 left-0 ${selectedAthlete.profileImageUrl ? 'hidden' : 'flex'}`}
                          >
                            <User className="text-gray-400" size={24} />
                          </div>
                        </div>
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

            <TabsContent value="testing" className="space-y-8">
              <TestingPanel />
            </TabsContent>
          </Tabs>

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
              athleteId={selectedAthlete.id}
              createdAt={new Date().toISOString()}
            />
          )}
        </div>
  );
}

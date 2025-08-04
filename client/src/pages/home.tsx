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
import { useToast } from "@/hooks/use-toast";
import { Search, Star } from "lucide-react";
import type { Sport, Athlete } from "@shared/schema";

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [athleteName, setAthleteName] = useState<string>("");
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [showTokenModal, setShowTokenModal] = useState(false);

  const { data: sports = [] } = useQuery<Sport[]>({
    queryKey: ["/api/sports"],
  });

  const handleAthleteSearch = async () => {
    if (!athleteName.trim()) {
      toast({
        title: "Error",
        description: "Please enter an athlete name",
        variant: "destructive",
      });
      return;
    }

    try {
      const params = new URLSearchParams({
        name: athleteName,
        ...(selectedSport && { sportId: selectedSport })
      });
      
      const response = await fetch(`/api/athletes/search?${params}`);
      const athletes = await response.json();
      
      if (athletes.length > 0) {
        setSelectedAthlete(athletes[0]);
        toast({
          title: "Athlete Found",
          description: `Found ${athletes[0].name}`,
        });
      } else {
        // Create a new athlete if not found
        const newAthleteData = {
          name: athleteName,
          sportId: selectedSport || "default-sport",
          bio: `Professional athlete specializing in ${selectedSport || 'multiple sports'}.`,
          rank: Math.floor(Math.random() * 10) + 1,
          profileImageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500"
        };

        const createResponse = await fetch('/api/athletes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newAthleteData),
          credentials: 'include'
        });

        if (createResponse.ok) {
          const newAthlete = await createResponse.json();
          setSelectedAthlete(newAthlete);
          toast({
            title: "Athlete Profile Created",
            description: `Created profile for ${newAthlete.name}`,
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to create athlete profile",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to search for athlete",
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

          {/* Sport & Athlete Selection */}
          <Card className="bg-athlete-gray-800 border-gray-700 max-w-4xl mx-auto mb-12">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-center text-white">Select Sport & Athlete</h2>
              
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Sport</label>
                  <Select value={selectedSport} onValueChange={setSelectedSport}>
                    <SelectTrigger 
                      data-testid="select-sport"
                      className="bg-athlete-gray-700 border-gray-600 text-white"
                    >
                      <SelectValue placeholder="Choose a sport..." />
                    </SelectTrigger>
                    <SelectContent className="bg-athlete-gray-700 border-gray-600">
                      <SelectItem value="football">Football</SelectItem>
                      <SelectItem value="soccer">Soccer</SelectItem>
                      <SelectItem value="basketball">Basketball</SelectItem>
                      <SelectItem value="tennis">Tennis</SelectItem>
                      <SelectItem value="taekwondo">Taekwondo</SelectItem>
                      <SelectItem value="baseball">Baseball</SelectItem>
                      <SelectItem value="swimming">Swimming</SelectItem>
                      {sports.map((sport) => (
                        <SelectItem key={sport.id} value={sport.id}>
                          {sport.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Athlete Name</label>
                  <div className="flex gap-2">
                    <Input
                      data-testid="input-athlete-name"
                      value={athleteName}
                      onChange={(e) => setAthleteName(e.target.value)}
                      placeholder="e.g., Cristiano Ronaldo"
                      className="bg-athlete-gray-700 border-gray-600 text-white placeholder-gray-400"
                      onKeyPress={(e) => e.key === 'Enter' && handleAthleteSearch()}
                    />
                    <Button 
                      onClick={handleAthleteSearch}
                      data-testid="button-search-athlete"
                      className="bg-athlete-accent hover:bg-blue-600"
                    >
                      <Search size={16} />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Current Athlete Display */}
              {selectedAthlete && (
                <Card className="bg-athlete-gray-700 border-gray-600">
                  <CardContent className="p-6">
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
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Service Boxes Grid */}
          {selectedAthlete && (
            <div className="max-w-6xl mx-auto">
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
        </div>
      </div>

      <TokenModal 
        open={showTokenModal} 
        onOpenChange={setShowTokenModal}
      />
    </div>
  );
}

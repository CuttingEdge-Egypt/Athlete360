import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { ServiceCard } from "@/components/ui/service-card";
import { TokenModal } from "@/components/ui/token-modal";

import { AnalysisPopup } from "@/components/ui/analysis-popup";
import { AthleteComparison } from "@/components/ui/athlete-comparison";
import { VideoAnalysisResults } from "@/components/ui/video-analysis-results";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Search, Star, User, Loader2, Users, Apple, CalendarDays, BarChart3, X } from "lucide-react";
import type { Sport, Athlete } from "@shared/schema";
import GenerationQueue from "@/components/ui/generation-queue";
import { CountrySelect } from "@/components/ui/country-select";

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation('home');
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [searchName, setSearchName] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("analysis");
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [videoAnalysisData, setVideoAnalysisData] = useState<any>(null);
  const [location] = useLocation();

  // Helper for required number validation that shows proper required messages
  const requiredNumber = (requiredMsg: string, invalidMsg: string, min: number, max: number) => 
    z.preprocess(
      (v) => {
        if (v === '' || v == null) return undefined;
        if (typeof v === 'string') {
          const num = Number(v);
          return isNaN(num) ? v : num; // Return original if not a valid number, let z.number handle the error
        }
        return v;
      },
      z.number({ 
        required_error: requiredMsg, 
        invalid_type_error: invalidMsg 
      }).min(min, invalidMsg).max(max, invalidMsg)
    );

  // Nutrition Plan form validation schema with translations
  const nutritionPlanSchema = useMemo(() => z.object({
    goal: z.string().min(10, t('validation.goalRequired')).max(1000, t('validation.goalTooLong')),
    sport: z.string().optional(),
    age: requiredNumber(t('validation.ageRequired'), t('validation.ageInvalid'), 13, 99),
    currentWeight: requiredNumber(t('validation.currentWeightRequired'), t('validation.currentWeightInvalid'), 30, 300),
    targetWeight: requiredNumber(t('validation.targetWeightRequired'), t('validation.targetWeightInvalid'), 30, 300),
    country: z.string().min(1, t('validation.countryRequired')),
    period: z.preprocess(
      (v) => v === '' || v == null ? undefined : Number(v),
      z.number().int().min(1).max(52)
    ).optional(),
    inbodyReport: z.any().optional(),
    language: z.string().default("en")
  }), [t, i18n.language]);

  type NutritionPlanFormData = z.infer<typeof nutritionPlanSchema>;

  // Initialize form with validation
  const nutritionForm = useForm<NutritionPlanFormData>({
    resolver: zodResolver(nutritionPlanSchema),
    defaultValues: {
      goal: "",
      sport: selectedSport,
      age: undefined,
      currentWeight: undefined,
      targetWeight: undefined,
      country: selectedCountry || "",
      period: undefined,
      language: "en"
    }
  });

  // Form submission handler
  const onSubmitNutritionPlan = (data: NutritionPlanFormData) => {
    console.log('Nutrition plan form submitted:', data);
    toast({
      title: "Nutrition Plan Generated!",
      description: "Your personalized nutrition plan is ready.",
    });
  };

  // Listen for queue notifications
  useEffect(() => {
    const handleQueueNotification = (event: CustomEvent) => {
      const { title, description } = event.detail;
      toast({
        title,
        description,
      });
    };

    window.addEventListener('queue-notification', handleQueueNotification as EventListener);
    return () => {
      window.removeEventListener('queue-notification', handleQueueNotification as EventListener);
    };
  }, [toast]);



  // Check for payment success notification
  useEffect(() => {
    const paymentSuccess = sessionStorage.getItem('paymentSuccess');
    if (paymentSuccess) {
      try {
        const paymentData = JSON.parse(paymentSuccess);
        toast({
          title: "Payment Successful!",
          description: `Successfully purchased tokens for ${paymentData.amount} EGP. Transaction: ${paymentData.transactionId}`,
        });
        sessionStorage.removeItem('paymentSuccess');
      } catch (error) {
        console.error('Error parsing payment success data:', error);
      }
    }
  }, [toast]);

  // Check for URL parameters to load comparison data
  useEffect(() => {
    const checkUrlParams = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tab = urlParams.get('tab');
      const data = urlParams.get('data');
      
      console.log('URL params check:', { tab, data: data ? 'present' : 'null' });
      
      if (tab === 'comparison' && data) {
        try {
          let parsedData;
          if (data === 'fromStorage') {
            // Get data from sessionStorage
            const storedData = sessionStorage.getItem('comparisonData');
            if (storedData) {
              parsedData = JSON.parse(storedData);
              // Clean up sessionStorage after use
              sessionStorage.removeItem('comparisonData');
            } else {
              throw new Error('No comparison data found in sessionStorage');
            }
          } else {
            // Legacy URL-based approach
            parsedData = JSON.parse(decodeURIComponent(data));
          }
          
          console.log('Parsed comparison data:', parsedData);
          setComparisonData(parsedData);
          setActiveTab("comparison");
          console.log('Set activeTab to comparison, comparisonData:', parsedData);
          // Clean up URL after loading data
          window.history.replaceState({}, '', window.location.pathname);
        } catch (error) {
          console.error('Failed to parse comparison data from URL:', error);
        }
      } else if (tab === 'video' && data) {
        try {
          const parsedData = JSON.parse(decodeURIComponent(data));
          console.log('Parsed video analysis data:', parsedData);
          // Store data temporarily in sessionStorage and redirect to dedicated video analysis page
          sessionStorage.setItem('videoAnalysisData', JSON.stringify(parsedData));
          window.location.href = '/video-analysis';
        } catch (error) {
          console.error('Failed to parse video analysis data from URL:', error);
        }
      }
    };

    // Check immediately
    checkUrlParams();

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', checkUrlParams);
    
    // Clean up listener
    return () => {
      window.removeEventListener('popstate', checkUrlParams);
    };
  }, [location]);

  // Also check on location changes
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    const data = urlParams.get('data');
    
    console.log('Location changed, URL params:', { tab, data: data ? 'present' : 'null' });
    
    if (tab === 'comparison' && data) {
      try {
        let parsedData;
        if (data === 'fromStorage') {
          // Get data from sessionStorage
          const storedData = sessionStorage.getItem('comparisonData');
          if (storedData) {
            parsedData = JSON.parse(storedData);
            // Clean up sessionStorage after use
            sessionStorage.removeItem('comparisonData');
          } else {
            throw new Error('No comparison data found in sessionStorage');
          }
        } else {
          // Legacy URL-based approach
          parsedData = JSON.parse(decodeURIComponent(data));
        }
        
        console.log('Location change - Parsed comparison data:', parsedData);
        setComparisonData(parsedData);
        setActiveTab("comparison");
        // Clean up URL after loading data
        window.history.replaceState({}, '', window.location.pathname);
      } catch (error) {
        console.error('Failed to parse comparison data from URL:', error);
      }
    } else if (tab === 'video' && data) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(data));
        console.log('Location change - Parsed video analysis data:', parsedData);
        // Store data temporarily in sessionStorage and redirect to dedicated video analysis page
        sessionStorage.setItem('videoAnalysisData', JSON.stringify(parsedData));
        window.location.href = '/video-analysis';
        setActiveTab("video");
        // Clean up URL after loading data
        window.history.replaceState({}, '', window.location.pathname);
      } catch (error) {
        console.error('Failed to parse video analysis data from URL:', error);
      }
    }
  }, [location]);

  // Callback function to handle comparison loading from history
  const handleComparisonFromHistory = (historyComparisonData: any) => {
    setComparisonData(historyComparisonData);
    setActiveTab("comparison");
  };

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
    queryKey: ["/api/athletes/search-by-name", searchName.trim(), selectedSport, selectedCountry],
    enabled: !!searchName.trim() && searchName.trim().length >= 2,
    queryFn: async () => {
      try {
        const response = await fetch(`/api/athletes/search-by-name?name=${encodeURIComponent(searchName.trim())}&sportId=${encodeURIComponent(selectedSport)}&country=${encodeURIComponent(selectedCountry)}`);
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
    // Sync with nutrition form to ensure bidirectional state consistency
    nutritionForm.setValue('sport', sportId, { shouldDirty: true, shouldValidate: true });
  };

  // Clear selected sport
  const handleClearSport = () => {
    setSelectedSport("");
    setSelectedAthlete(null);
    setSearchName("");
    // Also clear the nutrition form's sport field to keep form state in sync
    nutritionForm.setValue('sport', '');
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
      title: t('services.bioAnalysis.title'),
      description: t('services.bioAnalysis.description'),
      cost: 50,
      icon: "user-alt",
      color: "text-athlete-accent"
    },
    {
      id: "rank",
      title: t('services.rankHistory.title'),
      description: t('services.rankHistory.description'),
      cost: 70,
      icon: "trophy",
      color: "text-athlete-warning"
    },
    {
      id: "strengths",
      title: t('services.strengths.title'),
      description: t('services.strengths.description'),
      cost: 50,
      icon: "muscle",
      color: "text-athlete-success"
    },
    {
      id: "weaknesses",
      title: t('services.weaknesses.title'),
      description: t('services.weaknesses.description'),
      cost: 50,
      icon: "exclamation-triangle",
      color: "text-athlete-danger"
    },
    {
      id: "beat-strategies",
      title: t('services.tacticRecommendations.title'),
      description: t('services.tacticRecommendations.description'),
      cost: 100,
      icon: "chess",
      color: "text-red-400"
    }
  ];

  // Expose trigger analysis function for queue retries and cancellation function
  useEffect(() => {
    // Function to handle cancellation from queue
    (window as any).cancelGeneration = (athleteName: string, serviceType: string) => {
      // Trigger a custom event that service cards can listen to
      const event = new CustomEvent('cancel-generation', {
        detail: { athleteName, serviceType }
      });
      window.dispatchEvent(event);
    };

    (window as any).triggerAnalysis = async (athleteName: string, serviceType: string) => {
      // Find the athlete in current context
      if (selectedAthlete?.name === athleteName) {
        // Find the service and trigger it
        const service = services.find(s => s.id === serviceType);
        if (service) {
          try {
            const response = await fetch(`/api/analysis/${selectedAthlete.id}/${serviceType}`, {
              method: 'POST',
              credentials: 'include',
            });
            
            if (response.ok) {
              const result = await response.json();
              // Update queue with success
              (window as any).generationQueue?.update?.(
                `gen_${Date.now()}_retry`,
                { 
                  status: 'completed', 
                  result: { ...result, serviceType, athleteName }
                }
              );
            } else {
              const error = await response.json();
              // Update queue with error
              (window as any).generationQueue?.update?.(
                `gen_${Date.now()}_retry`,
                { 
                  status: 'error', 
                  error: error.message || 'Failed to regenerate analysis'
                }
              );
            }
          } catch (error) {
            console.error('Retry analysis failed:', error);
          }
        }
      }
    };

    return () => {
      delete (window as any).triggerAnalysis;
      delete (window as any).cancelGeneration;
    };
  }, [selectedAthlete, services]);

  return (
    <div className="container mx-auto px-4 pt-20">
          {/* Welcome Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 text-white">
{t('interface.welcome')}
            </h1>
            <p className="text-xl text-gray-300 mb-8">
{t('interface.tagline')}
            </p>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-6xl mx-auto">
            <TabsList className="grid w-full grid-cols-4 bg-athlete-gray-800 mb-8">
              <TabsTrigger 
                value="analysis" 
                data-testid="tab-analysis"
                className="data-[state=active]:bg-athlete-accent flex items-center gap-2"
              >
                <BarChart3 size={16} />
                {t('interface.athleteAnalysis')}
              </TabsTrigger>
              <TabsTrigger 
                value="comparison" 
                data-testid="tab-comparison"
                className="data-[state=active]:bg-athlete-accent flex items-center gap-2"
              >
                <Users size={16} />
                {t('interface.compareAthletes')}
              </TabsTrigger>
              <TabsTrigger 
                value="nutrition" 
                data-testid="tab-nutrition"
                className="data-[state=active]:bg-athlete-accent flex items-center gap-2"
              >
                <Apple size={16} />
                {t('interface.nutritionPlan')}
              </TabsTrigger>
              <TabsTrigger 
                value="development" 
                data-testid="tab-development"
                className="data-[state=active]:bg-athlete-accent flex items-center gap-2"
              >
                <CalendarDays size={16} />
                {t('interface.developmentPlan')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="analysis" className="space-y-8">
              {/* Sport & Athlete Selection */}
              <Card className="bg-athlete-gray-800 border-gray-700">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold mb-6 text-center text-white">{t('interface.selectSportAthlete')}</h2>
              
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">{t('interface.sport')}</label>
                  <div className="flex gap-2">
                    <Select value={selectedSport} onValueChange={handleSportChange}>
                      <SelectTrigger 
                        data-testid="select-sport"
                        className="bg-athlete-gray-700 border-gray-600 text-white flex-1"
                      >
                        <SelectValue placeholder={t('interface.chooseASport')} />
                      </SelectTrigger>
                      <SelectContent className="bg-athlete-gray-700 border-gray-600">
                        {sports.map((sport) => (
                          <SelectItem key={sport.id} value={sport.id}>
                            {sport.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedSport && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleClearSport}
                        className="bg-athlete-gray-700 border-gray-600 text-red-400 hover:text-red-300 hover:bg-red-900/20 p-2"
                        data-testid="clear-sport-button"
                      >
                        <X size={16} />
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">{t('interface.country')}</label>
                  <CountrySelect
                    value={selectedCountry || "all"}
                    onValueChange={handleCountryChange}
                    placeholder={t('interface.allCountries')}
                    countries={countries}
                    testId="select-country"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">{t('interface.athleteName')}</label>
                  <div className="relative">
                    <Input
                      data-testid="search-athlete-name"
                      placeholder={t('interface.searchAthlete')}
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
                            setSearchName("");
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-athlete-gray-600 text-white border-b border-gray-600 last:border-b-0"
                        >
                          <div className="font-medium">
                            {athlete.name}
                            {athlete.nameArabic && (
                              <span className="text-gray-300 mr-2"> / {athlete.nameArabic}</span>
                            )}
                          </div>
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
                          <h3 className="text-xl font-bold text-white">
                            {selectedAthlete.name}
                            {selectedAthlete.nameArabic && (
                              <span className="text-gray-300 font-normal text-lg block">{selectedAthlete.nameArabic}</span>
                            )}
                          </h3>
                          <p className="text-gray-400 capitalize">{selectedAthlete.country || "Unknown Country"}</p>
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
                  <h2 className="text-3xl font-bold text-center mb-8 text-white">{t('interface.analysisServices')}</h2>
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
                  <h3 className="text-2xl font-bold mb-4 text-white">{t('interface.readyToAnalyze.title')}</h3>
                  <p className="text-gray-400 max-w-md mx-auto">
                    {t('interface.readyToAnalyze.description')}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="comparison" className="space-y-8">
              <AthleteComparison preloadedComparisonData={comparisonData} />
            </TabsContent>

            <TabsContent value="nutrition" className="space-y-8">
              {/* Nutrition Plan Form */}
              <Card className="bg-athlete-gray-800 border-gray-700">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold mb-6 text-center text-white">{t('nutritionPlan.title')}</h2>
                  
                  <Form {...nutritionForm}>
                    <form onSubmit={nutritionForm.handleSubmit(onSubmitNutritionPlan)} className="space-y-6">
                      {/* Goal Input (Required) - Full Width Row */}
                      <FormField
                        control={nutritionForm.control}
                        name="goal"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">{t('nutritionPlan.goal')} *</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                data-testid="input-nutrition-goal"
                                placeholder={t('nutritionPlan.goalPlaceholder')}
                                className="bg-athlete-gray-700 border-gray-600 text-white min-h-[120px] resize-y overflow-y-auto"
                                maxLength={1000}
                              />
                            </FormControl>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />

                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Sport Selection (Optional) */}
                        <FormField
                          control={nutritionForm.control}
                          name="sport"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-300">{t('nutritionPlan.sport')}</FormLabel>
                              <FormControl>
                                <div className="flex gap-2">
                                  <Select value={selectedSport || field.value || ""} onValueChange={(value) => { 
                                    field.onChange(value);
                                    setSelectedSport(value);
                                    // Clear athlete selection when sport changes in form
                                    if (value !== selectedSport) {
                                      setSelectedAthlete(null);
                                      setSearchName("");
                                    }
                                  }}>
                                    <SelectTrigger 
                                      data-testid="select-nutrition-sport"
                                      className="bg-athlete-gray-700 border-gray-600 text-white flex-1"
                                    >
                                      <SelectValue placeholder={t('interface.chooseASport')} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-athlete-gray-700 border-gray-600">
                                      {sports.map((sport) => (
                                        <SelectItem key={sport.id} value={sport.id}>
                                          {sport.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {field.value && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        field.onChange('');
                                        setSelectedSport('');
                                        setSelectedAthlete(null);
                                        setSearchName('');
                                      }}
                                      className="bg-athlete-gray-700 border-gray-600 text-red-400 hover:text-red-300 hover:bg-red-900/20 p-2"
                                      data-testid="clear-nutrition-sport-button"
                                    >
                                      <X size={16} />
                                    </Button>
                                  )}
                                </div>
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        {/* Age (Required) */}
                        <FormField
                          control={nutritionForm.control}
                          name="age"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-300">{t('nutritionPlan.age')} *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  data-testid="input-nutrition-age"
                                  type="number"
                                  className="bg-athlete-gray-700 border-gray-600 text-white"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        {/* Current Weight (Required) */}
                        <FormField
                          control={nutritionForm.control}
                          name="currentWeight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-300">{t('nutritionPlan.currentWeight')} *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  data-testid="input-current-weight"
                                  type="number"
                                  className="bg-athlete-gray-700 border-gray-600 text-white"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        {/* Target Weight (Required) */}
                        <FormField
                          control={nutritionForm.control}
                          name="targetWeight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-300">{t('nutritionPlan.targetWeight')} *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  data-testid="input-target-weight"
                                  type="number"
                                  className="bg-athlete-gray-700 border-gray-600 text-white"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        {/* Country Selection (Required) */}
                        <FormField
                          control={nutritionForm.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-300">{t('nutritionPlan.country')} *</FormLabel>
                              <FormControl>
                                <CountrySelect
                                  value={field.value || ""}
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    setSelectedCountry(value);
                                  }}
                                  placeholder={t('interface.selectCountry')}
                                  countries={countries}
                                  testId="select-nutrition-country"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        {/* Period in Weeks (Optional) */}
                        <FormField
                          control={nutritionForm.control}
                          name="period"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-300">{t('nutritionPlan.period')}</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  data-testid="input-nutrition-period"
                                  type="number"
                                  placeholder="4"
                                  className="bg-athlete-gray-700 border-gray-600 text-white"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="mt-6 grid md:grid-cols-2 gap-6">
                        {/* InBody Report Upload (Optional) */}
                        <FormField
                          control={nutritionForm.control}
                          name="inbodyReport"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-300">{t('nutritionPlan.inbodyReport')}</FormLabel>
                              <FormControl>
                                <Input
                                  data-testid="input-inbody-report"
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  className="bg-athlete-gray-700 border-gray-600 text-white"
                                  onChange={(e) => field.onChange(e.target.files?.[0])}
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        {/* Language Selection */}
                        <FormField
                          control={nutritionForm.control}
                          name="language"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-300">{t('nutritionPlan.language')}</FormLabel>
                              <FormControl>
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <SelectTrigger 
                                    data-testid="select-nutrition-language"
                                    className="bg-athlete-gray-700 border-gray-600 text-white"
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-athlete-gray-700 border-gray-600">
                                    <SelectItem value="en">English</SelectItem>
                                    <SelectItem value="ar">العربية</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-center mt-8">
                        <Button 
                          type="submit"
                          data-testid="button-generate-nutrition-plan"
                          className="bg-athlete-accent hover:bg-blue-600 text-white px-8 py-3 text-lg"
                        >
                          <Apple className="mr-2" size={20} />
                          {t('nutritionPlan.generate')}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="development" className="space-y-8">
              {/* Development Plan Placeholder */}
              <Card className="bg-athlete-gray-800 border-gray-700">
                <CardContent className="p-8 text-center">
                  <CalendarDays className="mx-auto mb-4 text-athlete-accent" size={64} />
                  <h2 className="text-2xl font-bold mb-4 text-white">{t('developmentPlan.title')}</h2>
                  <p className="text-gray-400 text-lg mb-4">{t('developmentPlan.comingSoon')}</p>
                  <p className="text-gray-500">{t('developmentPlan.description')}</p>
                </CardContent>
              </Card>
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

          {/* Generation Queue */}
          <GenerationQueue
            onSelectGeneration={(result) => {
              // Handle different types of generation results
              if (result.serviceType === 'compare') {
                setComparisonData(result);
                setActiveTab('comparison');
              } else if (result.serviceType === 'video') {
                setVideoAnalysisData(result);
                setActiveTab('video');
              } else {
                // Handle other analysis types - they're handled by the AnalysisPopup component
                console.log('Selected generation result:', result);
              }
            }}
            currentAthlete={selectedAthlete?.name}
            currentService="rank"
          />
        </div>
  );
}

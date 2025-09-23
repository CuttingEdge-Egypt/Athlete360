import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CountrySelect } from "@/components/ui/country-select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from 'react-i18next';
import { 
  Users2, 
  Zap, 
  Activity, 
  User, 
  Brain, 
  Trophy, 
  TrendingUp, 
  Target, 
  Star, 
  TrendingDown,
  Languages 
} from "lucide-react";

type Sport = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string | null;
};

type Athlete = {
  id: string;
  name: string;
  nameArabic: string | null;
  country: string | null;
  rank: number | null;
  profileImageUrl: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string | null;
  sportId: string;
};

type AthleteComparisonProps = {
  preloadedComparisonData?: any;
};

export function AthleteComparison({ preloadedComparisonData }: AthleteComparisonProps) {
  const { t } = useTranslation();
  const [selectedSport, setSelectedSport] = useState("");
  const [selectedCountry1, setSelectedCountry1] = useState("");
  const [selectedCountry2, setSelectedCountry2] = useState("");
  const [selectedAthlete1, setSelectedAthlete1] = useState("");
  const [selectedAthlete2, setSelectedAthlete2] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("english");
  const [comparisonData, setComparisonData] = useState(() => {
    console.log("AthleteComparison received preloadedComparisonData:", preloadedComparisonData);
    if (preloadedComparisonData) {
      return {
        ...preloadedComparisonData,
        isRawResponse: true,
        // Default structure to prevent errors
        athlete1: { name: "Athlete 1", country: "Unknown", rank: "N/A" },
        athlete2: { name: "Athlete 2", country: "Unknown", rank: "N/A" }
      };
    }
    return preloadedComparisonData || null;
  });
  const { toast } = useToast();

  // Update comparison data when preloaded data changes
  useEffect(() => {
    if (preloadedComparisonData) {
      if (preloadedComparisonData?.isRawResponse) {
        setComparisonData({
          gptResponse: preloadedComparisonData.gptResponse,
          geminiResponse: preloadedComparisonData.geminiResponse,
          isRawResponse: true,
          athlete1: { name: "Athlete 1", country: "Unknown", rank: "N/A" },
          athlete2: { name: "Athlete 2", country: "Unknown", rank: "N/A" }
        });
      } else {
        setComparisonData(preloadedComparisonData);
      }
    }
  }, [preloadedComparisonData]);

  const { data: sports = [] } = useQuery<Sport[]>({
    queryKey: ["/api/sports"],
  });

  // Get all countries
  const { data: countries = [] } = useQuery<string[]>({
    queryKey: ["/api/countries"],
  });

  // Get athletes for athlete 1 (by sport and country 1)
  const { data: allAthletes1 = [] } = useQuery<Athlete[]>({
    queryKey: ["/api/athletes/by-sport", selectedSport, selectedCountry1, "athlete1"],
    enabled: !!selectedSport,
    queryFn: async () => {
      const url = new URL(`/api/athletes/by-sport/${selectedSport}`, window.location.origin);
      if (selectedCountry1) {
        url.searchParams.set('country', selectedCountry1);
      }
      const response = await fetch(url.toString());
      return response.json();
    }
  });

  // Get athletes for athlete 2 (by sport and country 2)
  const { data: allAthletes2 = [] } = useQuery<Athlete[]>({
    queryKey: ["/api/athletes/by-sport", selectedSport, selectedCountry2, "athlete2"],
    enabled: !!selectedSport,
    queryFn: async () => {
      const url = new URL(`/api/athletes/by-sport/${selectedSport}`, window.location.origin);
      if (selectedCountry2) {
        url.searchParams.set('country', selectedCountry2);
      }
      const response = await fetch(url.toString());
      return response.json();
    }
  });

  // Deduplicate athletes for athlete 1 with safety checks
  const athletes1 = Array.isArray(allAthletes1) ? allAthletes1.reduce((acc: Athlete[], current) => {
    if (!current || !current.name) return acc; // Skip invalid athletes
    
    const existingIndex = acc.findIndex(athlete => 
      athlete.name && athlete.name.toLowerCase().trim() === current.name.toLowerCase().trim()
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
  }, []) : [];

  // Deduplicate athletes for athlete 2 with safety checks
  const athletes2 = Array.isArray(allAthletes2) ? allAthletes2.reduce((acc: Athlete[], current) => {
    if (!current || !current.name) return acc; // Skip invalid athletes
    
    const existingIndex = acc.findIndex(athlete => 
      athlete.name && athlete.name.toLowerCase().trim() === current.name.toLowerCase().trim()
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
  }, []) : [];

  const comparisonMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/athletes/compare", {
        athlete1Id: selectedAthlete1,
        athlete2Id: selectedAthlete2,
        language: selectedLanguage
      });
      return response.json();
    },
    onSuccess: (data) => {
      setComparisonData(data);
      
      // Check for partial refund notification
      if (data.partialRefund) {
        toast({
          title: "Comparison Partially Complete",
          description: `Basic comparison generated successfully! Some detailed tabs couldn't be generated, so we've refunded ${data.partialRefund.amount} tokens.`,
          variant: "default",
        });
      } else {
        toast({
          title: t("comparison.comparisonComplete", "Comparison Complete"),
          description: t("comparison.comparisonSuccess", "AI-powered athlete comparison generated successfully!"),
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: t("comparison.comparisonFailed", "Comparison Failed"),
        description: error.message || t("comparison.comparisonError", "Failed to generate comparison"),
        variant: "destructive",
      });
    },
  });

  const handleCompare = () => {
    if (!selectedAthlete1 || !selectedAthlete2) {
      toast({
        title: t("comparison.selectionRequired", "Selection Required"),
        description: t("comparison.selectTwoAthletes", "Please select two athletes to compare"),
        variant: "destructive",
      });
      return;
    }

    if (selectedAthlete1 === selectedAthlete2) {
      toast({
        title: t("comparison.invalidSelection", "Invalid Selection"),
        description: t("comparison.selectDifferentAthletes", "Please select two different athletes"),
        variant: "destructive",
      });
      return;
    }

    // Get athlete names for queue display
    const athlete1 = athletes1.find(a => a && a.id === selectedAthlete1);
    const athlete2 = athletes2.find(a => a && a.id === selectedAthlete2);
    const comparisonName = `${athlete1?.name || 'Athlete 1'} vs ${athlete2?.name || 'Athlete 2'}`;
    
    // Add to generation queue if available
    if ((window as any).generationQueue) {
      const queueId = (window as any).generationQueue.add(comparisonName, 'comparison', false);
      
      // Immediately update status to running when we start the mutation
      (window as any).generationQueue.update(queueId, { 
        status: 'running', 
        progressMessage: 'Analyzing athletes...' 
      });
      
      // Update queue status when mutation completes
      comparisonMutation.mutate(undefined, {
        onSuccess: (data) => {
          if ((window as any).generationQueue) {
            (window as any).generationQueue.update(queueId, { status: 'completed' });
          }
        },
        onError: (error) => {
          if ((window as any).generationQueue) {
            (window as any).generationQueue.update(queueId, { 
              status: 'error',
              errorMessage: error.message || 'Comparison failed - tokens refunded'
            });
          }
          
          // Show error toast
          if ((window as any).showToast) {
            (window as any).showToast({
              title: "Comparison Failed",
              description: "Unable to generate comparison. Tokens have been refunded."
            });
          }
        }
      });
    } else {
      comparisonMutation.mutate();
    }
  };

  // Use comparisonData state that is initialized with preloaded data
  const availableAthletes1 = athletes1.filter((a: Athlete) => a && a.id && a.id !== selectedAthlete2);
  const availableAthletes2 = athletes2.filter((a: Athlete) => a && a.id && a.id !== selectedAthlete1);

  return (
    <Card className="bg-athlete-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Users2 className="h-5 w-5" />
          {t("comparison.title", "Athlete Comparison")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selection Controls */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-300">{t("comparison.sport", "Sport")}</label>
            <Select
              value={selectedSport}
              onValueChange={(value) => {
                setSelectedSport(value);
                setSelectedCountry1("");
                setSelectedCountry2("");
                setSelectedAthlete1("");
                setSelectedAthlete2("");
              }}
              data-testid="select-sport"
            >
              <SelectTrigger className="bg-athlete-gray-700 border-gray-600">
                <SelectValue placeholder={t("comparison.selectSport", "Select sport...")} />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(sports) && sports.map((sport) => (
                  <SelectItem key={sport.id} value={sport.id}>
                    {sport.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">{t("comparison.language", "Language")}</label>
            <Select
              value={selectedLanguage}
              onValueChange={setSelectedLanguage}
              data-testid="select-language"
            >
              <SelectTrigger className="bg-athlete-gray-700 border-gray-600">
                <SelectValue placeholder={t("comparison.selectLanguage", "Select language...")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="english">
                  <div className="flex items-center gap-2">
                    <Languages className="w-4 h-4" />
                    {t("comparison.english", "English")}
                  </div>
                </SelectItem>
                <SelectItem value="arabic">
                  <div className="flex items-center gap-2">
                    <Languages className="w-4 h-4" />
                    {t("comparison.arabic", "عربي")}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">{t("comparison.countryAthlete1", "Country (Athlete 1)")}</label>
            <CountrySelect
              value={selectedCountry1 || "all"}
              onValueChange={(value) => {
                setSelectedCountry1(value === "all" ? "" : value);
                setSelectedAthlete1("");
              }}
              placeholder="All countries"
              countries={Array.isArray(countries) ? countries : []}
              testId="select-country1"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">{t("comparison.athlete1", "Athlete 1")}</label>
            <Select
              value={selectedAthlete1}
              onValueChange={setSelectedAthlete1}
              disabled={!selectedSport}
              data-testid="select-athlete1"
            >
              <SelectTrigger className="bg-athlete-gray-700 border-gray-600">
                <SelectValue placeholder={t("comparison.selectFirstAthlete", "Select first athlete...")} />
              </SelectTrigger>
              <SelectContent>
                {availableAthletes1.length === 0 ? (
                  <div className="p-2 text-sm text-gray-400">
                    {selectedSport ? 'No athletes available for selected filters' : 'Select a sport first'}
                  </div>
                ) : (
                  availableAthletes1.map((athlete: Athlete) => (
                    athlete && athlete.id ? (
                      <SelectItem key={athlete.id} value={athlete.id}>
                        <div className="flex items-center gap-2 truncate max-w-full">
                          <span className="truncate">
                            {athlete.name || 'Unknown Athlete'}
                            {athlete.nameArabic && (
                              <span className="text-gray-400 text-sm"> / {athlete.nameArabic}</span>
                            )}
                          </span>
                          {athlete.country && (
                            <span className="text-xs text-gray-400 flex-shrink-0">({athlete.country})</span>
                          )}
                          {athlete.rank && (
                            <span className="text-xs text-gray-400 flex-shrink-0">#{athlete.rank}</span>
                          )}
                        </div>
                      </SelectItem>
                    ) : null
                  )).filter(Boolean)
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">{t("comparison.countryAthlete2", "Country (Athlete 2)")}</label>
            <CountrySelect
              value={selectedCountry2 || "all"}
              onValueChange={(value) => {
                setSelectedCountry2(value === "all" ? "" : value);
                setSelectedAthlete2("");
              }}
              placeholder="All countries"
              countries={Array.isArray(countries) ? countries : []}
              testId="select-country2"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">{t("comparison.athlete2", "Athlete 2")}</label>
            <Select
              value={selectedAthlete2}
              onValueChange={setSelectedAthlete2}
              disabled={!selectedSport}
              data-testid="select-athlete2"
            >
              <SelectTrigger className="bg-athlete-gray-700 border-gray-600">
                <SelectValue placeholder={t("comparison.selectSecondAthlete", "Select second athlete...")} />
              </SelectTrigger>
              <SelectContent>
                {availableAthletes2.length === 0 ? (
                  <div className="p-2 text-sm text-gray-400">
                    {selectedSport ? 'No athletes available for selected filters' : 'Select a sport first'}
                  </div>
                ) : (
                  availableAthletes2.map((athlete: Athlete) => (
                    athlete && athlete.id ? (
                      <SelectItem key={athlete.id} value={athlete.id}>
                        <div className="flex items-center gap-2 truncate max-w-full">
                          <span className="truncate">
                            {athlete.name || 'Unknown Athlete'}
                            {athlete.nameArabic && (
                              <span className="text-gray-400 text-sm"> / {athlete.nameArabic}</span>
                            )}
                          </span>
                          {athlete.country && (
                            <span className="text-xs text-gray-400 flex-shrink-0">({athlete.country})</span>
                          )}
                          {athlete.rank && (
                            <span className="text-xs text-gray-400 flex-shrink-0">#{athlete.rank}</span>
                          )}
                        </div>
                      </SelectItem>
                    ) : null
                  )).filter(Boolean)
                )}
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
              {["Analyzing athletes...", "Gathering performance data...", "This may take a moment..."][Math.floor(Date.now() / 3000) % 3]}
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              {t("comparison.compareAthletes", "Compare Athletes")}
            </>
          )}
        </Button>

        {/* Parsed Comparison Results - New Modular Tab Structure */}
        {(comparisonData?.tabs || comparisonData?.isRawResponse) && (
          <div className="space-y-6 mt-8">
            <Separator className="bg-gray-600" />
            {(() => {
              // Parse modular tab responses
              let overviewData = null;
              let strengthsData = null;
              let weaknessesData = null;
              let competitionHistoryData = null;
              let headToHeadData = null;
              let detailsData = null;
              
              // Helper function to safely parse AI-generated JSON with cleanup
              const safeParseJSON = (rawResponse: string, tabName: string) => {
                if (!rawResponse?.trim()) {
                  // Return fallback when rawResponse is missing or empty
                  return getTabFallbackData(tabName);
                }
                
                try {
                  // First attempt: Direct parsing
                  return JSON.parse(rawResponse);
                } catch (error) {
                  console.warn(`First parse attempt failed for ${tabName}:`, error instanceof Error ? error.message : 'Unknown error');
                  
                  try {
                    // Second attempt: Clean up common issues
                    let cleaned = rawResponse.trim();
                    
                    // Find the earliest valid opening brace
                    const openBraceIndex = cleaned.indexOf('{');
                    const openBracketIndex = cleaned.indexOf('[');
                    const firstValidIndex = openBraceIndex >= 0 && openBracketIndex >= 0 
                      ? Math.min(openBraceIndex, openBracketIndex)
                      : Math.max(openBraceIndex, openBracketIndex);
                    
                    if (firstValidIndex > 0) {
                      cleaned = cleaned.substring(firstValidIndex);
                    }
                    
                    // Remove any text after the last } or ]
                    const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
                    if (lastBrace > 0 && lastBrace < cleaned.length - 1) {
                      cleaned = cleaned.substring(0, lastBrace + 1);
                    }
                    
                    // Fix common JSON issues
                    cleaned = cleaned
                      .replace(/[\r\n\t]/g, ' ') // Replace newlines/tabs with spaces
                      .replace(/[\u201C\u201D]/g, '"') // Fix smart double quotes
                      .replace(/[\u2018\u2019]/g, "'") // Fix smart single quotes
                      .replace(/–/g, '-') // Fix em dashes
                      .replace(/—/g, '-') // Fix en dashes
                      .replace(/\u00A0/g, ' '); // Fix non-breaking spaces
                      
                    return JSON.parse(cleaned);
                  } catch (secondError) {
                    console.warn(`Cleanup parsing failed for ${tabName}:`, secondError instanceof Error ? secondError.message : 'Unknown error');
                    
                    // Third attempt: Extract JSON-like content with lazy regex
                    try {
                      const jsonMatch = rawResponse.match(/\{[\s\S]*?\}|\[[\s\S]*?\]/);
                      if (jsonMatch) {
                        const extracted = jsonMatch[0]
                          .replace(/[\r\n\t]/g, ' ')
                          .replace(/[\u201C\u201D]/g, '"')
                          .replace(/[\u2018\u2019]/g, "'")
                          .replace(/–/g, '-')
                          .replace(/—/g, '-')
                          .replace(/\u00A0/g, ' ');
                        return JSON.parse(extracted);
                      }
                    } catch (thirdError) {
                      console.warn(`Regex extraction failed for ${tabName}:`, thirdError instanceof Error ? thirdError.message : 'Unknown error');
                    }
                    
                    // Final fallback: Return tab-specific default structure
                    console.warn(`All parsing attempts failed for ${tabName}. Using fallback data.`);
                    return getTabFallbackData(tabName);
                  }
                }
              };

              // Helper function to provide fallback data for each tab
              const getTabFallbackData = (tabName: string) => {
                switch (tabName) {
                  case 'overview':
                    return {
                      athlete1: { name: "Athlete 1", country: "Unknown", rank: "N/A" },
                      athlete2: { name: "Athlete 2", country: "Unknown", rank: "N/A" },
                      overallAnalysis: "Analysis temporarily unavailable due to data parsing issues. Please try generating the comparison again."
                    };
                  case 'strengths':
                    return {
                      strengths: {
                        athlete1: [
                          {
                            title: "Analysis Pending",
                            description: "AI models encountered parsing issues while analyzing this athlete's strengths. The data was generated but couldn't be processed correctly.",
                            evidence: "Please regenerate comparison for complete analysis"
                          }
                        ],
                        athlete2: [
                          {
                            title: "Analysis Pending", 
                            description: "AI models encountered parsing issues while analyzing this athlete's strengths. The data was generated but couldn't be processed correctly.",
                            evidence: "Please regenerate comparison for complete analysis"
                          }
                        ],
                        summary: "Strengths analysis was generated by AI but failed to parse due to formatting issues. Try generating a new comparison."
                      }
                    };
                  case 'weaknesses':
                    return {
                      weaknesses: {
                        athlete1: [
                          {
                            title: "Analysis Pending",
                            description: "AI models encountered parsing issues while analyzing this athlete's areas for improvement. The data was generated but couldn't be processed correctly.",
                            exploitation: "Please regenerate comparison for complete analysis"
                          }
                        ],
                        athlete2: [
                          {
                            title: "Analysis Pending",
                            description: "AI models encountered parsing issues while analyzing this athlete's areas for improvement. The data was generated but couldn't be processed correctly.", 
                            exploitation: "Please regenerate comparison for complete analysis"
                          }
                        ],
                        summary: "Weaknesses analysis was generated by AI but failed to parse due to formatting issues. Try generating a new comparison."
                      }
                    };
                  case 'competitionHistory':
                    return {
                      ranking: {
                        comparison: "Competition history analysis was generated by AI but encountered parsing issues. The comprehensive ranking and competitive comparison data couldn't be processed correctly due to formatting problems.",
                        competitiveEdge: null,
                        details: "Please try generating a new comparison to get the complete competition history analysis."
                      }
                    };
                  case 'headToHead':
                    return {
                      headToHead: {
                        prediction: null,
                        reasoning: "Head-to-head prediction analysis was generated by AI but encountered parsing issues. The detailed matchup prediction and strategic insights couldn't be processed correctly due to formatting problems.",
                        keyFactors: ["Analysis pending - please regenerate comparison for complete head-to-head insights"]
                      }
                    };
                  case 'details':
                    return {
                      detailedAnalysis: {
                        technicalComparison: "Detailed technical analysis was generated by AI but encountered parsing issues. The comprehensive technical breakdown and performance metrics couldn't be processed correctly due to formatting problems.",
                        conclusion: "Please try generating a new comparison to get the complete detailed technical analysis."
                      }
                    };
                  default:
                    return { error: "Data temporarily unavailable" };
                }
              };

              // New modular approach - parse each tab separately with robust error handling
              if (comparisonData.tabs) {
                overviewData = safeParseJSON(comparisonData.tabs.overview?.rawResponse, 'overview');
                strengthsData = safeParseJSON(comparisonData.tabs.strengths?.rawResponse, 'strengths');
                weaknessesData = safeParseJSON(comparisonData.tabs.weaknesses?.rawResponse, 'weaknesses');
                competitionHistoryData = safeParseJSON(comparisonData.tabs.competitionHistory?.rawResponse, 'competitionHistory');
                headToHeadData = safeParseJSON(comparisonData.tabs.headToHead?.rawResponse, 'headToHead');
                detailsData = safeParseJSON(comparisonData.tabs.details?.rawResponse, 'details');
              } else {
                // Legacy fallback for old response format
                try {
                  if (comparisonData.gptResponse?.rawResponse) {
                    let cleanedGpt = comparisonData.gptResponse.rawResponse.trim();
                    if (!cleanedGpt.endsWith('}')) {
                      const lastBrace = cleanedGpt.lastIndexOf('}');
                      if (lastBrace > 0) {
                        cleanedGpt = cleanedGpt.substring(0, lastBrace + 1);
                      }
                    }
                    const legacyData = JSON.parse(cleanedGpt);
                    overviewData = {
                      athlete1: legacyData.athlete1,
                      athlete2: legacyData.athlete2,
                      overallAnalysis: legacyData.overallAnalysis
                    };
                    strengthsData = { strengths: legacyData.strengths };
                    weaknessesData = { weaknesses: legacyData.weaknesses };
                    competitionHistoryData = { ranking: legacyData.ranking };
                    headToHeadData = { headToHead: legacyData.headToHead };
                    detailsData = { detailedAnalysis: legacyData.detailedAnalysis };
                  }
                } catch (error) {
                  console.warn('Could not parse legacy response:', error instanceof Error ? error.message : 'Unknown error');
                }
              }
              
              // Create unified data structure for rendering
              const parsedData = {
                athlete1: overviewData?.athlete1 || { name: "Athlete 1", country: "Unknown", rank: "N/A" },
                athlete2: overviewData?.athlete2 || { name: "Athlete 2", country: "Unknown", rank: "N/A" },
                strengths: strengthsData?.strengths,
                weaknesses: weaknessesData?.weaknesses,
                ranking: competitionHistoryData?.ranking,
                headToHead: headToHeadData?.headToHead,
                overallAnalysis: overviewData?.overallAnalysis,
                detailedAnalysis: detailsData?.detailedAnalysis
              };

              return (
                <>
                  {/* Athlete Headers */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-athlete-gray-600 flex items-center justify-center mx-auto mb-3">
                        <User className="w-10 h-10 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white break-words leading-tight px-2">{parsedData.athlete1?.name || "Athlete 1"}</h3>
                      <Badge variant="outline" className="mt-2">
                        {parsedData.athlete1?.country || "Unknown"}
                      </Badge>
                      <Badge variant="outline" className="mt-1 block">
                        Rank #{parsedData.athlete1?.rank || "N/A"}
                      </Badge>
                    </div>
                    
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-athlete-gray-600 flex items-center justify-center mx-auto mb-3">
                        <User className="w-10 h-10 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white break-words leading-tight px-2">{parsedData.athlete2?.name || "Athlete 2"}</h3>
                      <Badge variant="outline" className="mt-2">
                        {parsedData.athlete2?.country || "Unknown"}
                      </Badge>
                      <Badge variant="outline" className="mt-1 block">
                        Rank #{parsedData.athlete2?.rank || "N/A"}
                      </Badge>
                    </div>
                  </div>

                  {/* Tabbed Analysis */}
                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-6 bg-athlete-gray-700">
                      <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                      <TabsTrigger value="strengths" data-testid="tab-strengths">Strengths</TabsTrigger>
                      <TabsTrigger value="weaknesses" data-testid="tab-weaknesses">Weaknesses</TabsTrigger>
                      <TabsTrigger value="ranking" data-testid="tab-ranking">Competition History</TabsTrigger>
                      <TabsTrigger value="head-to-head" data-testid="tab-head-to-head">Head-to-Head</TabsTrigger>
                      <TabsTrigger value="detailed" data-testid="tab-detailed">Details</TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-4">
                      <Card className="bg-athlete-gray-900 border-gray-600">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Brain className="h-5 w-5 text-blue-400" />
                            <h4 className="font-semibold text-white">Overall Analysis</h4>
                          </div>
                          {parsedData.overallAnalysis?.summary ? (
                            <p className="text-gray-300 leading-relaxed">
                              {parsedData.overallAnalysis.summary}
                            </p>
                          ) : (
                            <div className="p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
                              <p className="text-yellow-300">Overall analysis not available</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="bg-athlete-gray-900 border-gray-600">
                          <CardContent className="p-4 text-center">
                            <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                            <div className="text-sm text-gray-400">Ranking Advantage</div>
                            <div className="text-lg font-bold text-white">
                              {parsedData.ranking?.competitiveEdge === 'athlete1' ? parsedData.athlete1?.name :
                               parsedData.ranking?.competitiveEdge === 'athlete2' ? parsedData.athlete2?.name : 'Even'}
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-athlete-gray-900 border-gray-600">
                          <CardContent className="p-4 text-center">
                            <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
                            <div className="text-sm text-gray-400">Strength Advantage</div>
                            <div className="text-lg font-bold text-white">
                              {parsedData.strengths?.advantage === 'athlete1' ? parsedData.athlete1?.name :
                               parsedData.strengths?.advantage === 'athlete2' ? parsedData.athlete2?.name : 'Even'}
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-athlete-gray-900 border-gray-600">
                          <CardContent className="p-4 text-center">
                            <Target className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                            <div className="text-sm text-gray-400">Predicted Winner</div>
                            <div className="text-lg font-bold text-white">
                              {parsedData.headToHead?.prediction === 'athlete1' ? parsedData.athlete1?.name :
                               parsedData.headToHead?.prediction === 'athlete2' ? parsedData.athlete2?.name : 'Even Match'}
                            </div>
                            {parsedData.headToHead?.confidence && (
                              <div className="text-xs text-purple-300 mt-1">
                                {parsedData.headToHead.confidence}% confidence
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    {/* Strengths Tab */}
                    <TabsContent value="strengths" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-athlete-gray-900 border-gray-600">
                          <CardHeader>
                            <CardTitle className="text-lg text-white">{parsedData.athlete1?.name || "Athlete 1"} Strengths</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {(parsedData.strengths?.athlete1 || []).map((strength: any, index: number) => (
                              <div key={index} className="border-l-4 border-green-500 pl-4 py-2 bg-gray-800/50">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="font-medium text-white">
                                      {typeof strength === 'string' ? strength : strength.title}
                                    </div>
                                    {typeof strength === 'object' && strength.description && (
                                      <div className="text-sm text-gray-400 mt-1">
                                        {strength.description}
                                      </div>
                                    )}
                                    {typeof strength === 'object' && strength.evidence && (
                                      <div className="text-xs text-green-300 mt-2 italic">
                                        Evidence: {strength.evidence}
                                      </div>
                                    )}
                                  </div>
                                  {typeof strength === 'object' && strength.rating && (
                                    <div className="text-sm font-bold text-green-400 ml-2">
                                      {strength.rating}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            {(!parsedData.strengths?.athlete1 || parsedData.strengths.athlete1.length === 0) && (
                              <div className="text-gray-400 text-center py-4">No strengths data available</div>
                            )}
                          </CardContent>
                        </Card>

                        <Card className="bg-athlete-gray-900 border-gray-600">
                          <CardHeader>
                            <CardTitle className="text-lg text-white">{parsedData.athlete2?.name || "Athlete 2"} Strengths</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {(parsedData.strengths?.athlete2 || []).map((strength: any, index: number) => (
                              <div key={index} className="border-l-4 border-green-500 pl-4 py-2 bg-gray-800/50">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="font-medium text-white">
                                      {typeof strength === 'string' ? strength : strength.title}
                                    </div>
                                    {typeof strength === 'object' && strength.description && (
                                      <div className="text-sm text-gray-400 mt-1">
                                        {strength.description}
                                      </div>
                                    )}
                                    {typeof strength === 'object' && strength.evidence && (
                                      <div className="text-xs text-green-300 mt-2 italic">
                                        Evidence: {strength.evidence}
                                      </div>
                                    )}
                                  </div>
                                  {typeof strength === 'object' && strength.rating && (
                                    <div className="text-sm font-bold text-green-400 ml-2">
                                      {strength.rating}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            {(!parsedData.strengths?.athlete2 || parsedData.strengths.athlete2.length === 0) && (
                              <div className="text-gray-400 text-center py-4">No strengths data available</div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    {/* Weaknesses Tab */}
                    <TabsContent value="weaknesses" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-athlete-gray-900 border-gray-600">
                          <CardHeader>
                            <CardTitle className="text-lg text-white">{parsedData.athlete1?.name || "Athlete 1"} Areas to Improve</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {(parsedData.weaknesses?.athlete1 || []).map((weakness: any, index: number) => (
                              <div key={index} className="border-l-4 border-orange-500 pl-4 py-2 bg-gray-800/50">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="font-medium text-white">
                                      {typeof weakness === 'string' ? weakness : weakness.title}
                                    </div>
                                    {typeof weakness === 'object' && weakness.description && (
                                      <div className="text-sm text-gray-400 mt-1">
                                        {weakness.description}
                                      </div>
                                    )}
                                    {typeof weakness === 'object' && weakness.exploitation && (
                                      <div className="text-xs text-orange-300 mt-2 italic">
                                        Exploitation: {weakness.exploitation}
                                      </div>
                                    )}
                                  </div>
                                  {typeof weakness === 'object' && weakness.impact && (
                                    <div className="text-sm font-bold text-orange-400 ml-2">
                                      {weakness.impact}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            {(!parsedData.weaknesses?.athlete1 || parsedData.weaknesses.athlete1.length === 0) && (
                              <div className="text-gray-400 text-center py-4">No weaknesses data available</div>
                            )}
                          </CardContent>
                        </Card>

                        <Card className="bg-athlete-gray-900 border-gray-600">
                          <CardHeader>
                            <CardTitle className="text-lg text-white">{parsedData.athlete2?.name || "Athlete 2"} Areas to Improve</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {(parsedData.weaknesses?.athlete2 || []).map((weakness: any, index: number) => (
                              <div key={index} className="border-l-4 border-orange-500 pl-4 py-2 bg-gray-800/50">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="font-medium text-white">
                                      {typeof weakness === 'string' ? weakness : weakness.title}
                                    </div>
                                    {typeof weakness === 'object' && weakness.description && (
                                      <div className="text-sm text-gray-400 mt-1">
                                        {weakness.description}
                                      </div>
                                    )}
                                    {typeof weakness === 'object' && weakness.exploitation && (
                                      <div className="text-xs text-orange-300 mt-2 italic">
                                        Exploitation: {weakness.exploitation}
                                      </div>
                                    )}
                                  </div>
                                  {typeof weakness === 'object' && weakness.impact && (
                                    <div className="text-sm font-bold text-orange-400 ml-2">
                                      {weakness.impact}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            {(!parsedData.weaknesses?.athlete2 || parsedData.weaknesses.athlete2.length === 0) && (
                              <div className="text-gray-400 text-center py-4">No weaknesses data available</div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    {/* Competition History Tab */}
                    <TabsContent value="ranking" className="space-y-4">
                      <Card className="bg-athlete-gray-900 border-gray-600">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-2 mb-4">
                            <Trophy className="h-5 w-5 text-yellow-400" />
                            <h4 className="font-semibold text-white">Competition History Analysis</h4>
                          </div>
                          {parsedData.ranking ? (
                            <div className="space-y-4">
                              {parsedData.ranking.comparison && (
                                <div>
                                  <h5 className="font-medium text-blue-400 mb-2">Current Ranking Comparison</h5>
                                  <p className="text-gray-300 text-sm bg-athlete-gray-800 p-3 rounded-lg">
                                    {parsedData.ranking.comparison}
                                  </p>
                                </div>
                              )}

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {parsedData.ranking.athlete1Trajectory && (
                                  <div>
                                    <h5 className="font-medium text-green-400 mb-2">{parsedData.athlete1?.name} Trajectory</h5>
                                    <p className="text-gray-300 text-sm bg-athlete-gray-800 p-3 rounded-lg">
                                      {parsedData.ranking.athlete1Trajectory}
                                    </p>
                                  </div>
                                )}

                                {parsedData.ranking.athlete2Trajectory && (
                                  <div>
                                    <h5 className="font-medium text-green-400 mb-2">{parsedData.athlete2?.name} Trajectory</h5>
                                    <p className="text-gray-300 text-sm bg-athlete-gray-800 p-3 rounded-lg">
                                      {parsedData.ranking.athlete2Trajectory}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Competitive Edge Summary */}
                              {parsedData.ranking.competitiveEdge && (
                                <div className="mt-4">
                                  <h5 className="font-medium text-purple-400 mb-2">Competitive Edge</h5>
                                  <div className="text-center p-4 bg-purple-900/30 border border-purple-600/50 rounded-lg">
                                    <div className="text-lg font-bold text-purple-300">
                                      {parsedData.ranking.competitiveEdge === 'athlete1' ? parsedData.athlete1?.name :
                                       parsedData.ranking.competitiveEdge === 'athlete2' ? parsedData.athlete2?.name : 'Even Competition'}
                                    </div>
                                    <div className="text-purple-400 text-sm mt-1">
                                      {parsedData.ranking.competitiveEdge === 'even' ? 'Both athletes are evenly matched' : 'Has the competitive advantage'}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
                              <p className="text-yellow-300">Competition history analysis not available</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Head-to-Head Tab */}
                    <TabsContent value="head-to-head" className="space-y-4">
                      <Card className="bg-athlete-gray-900 border-gray-600">
                        <CardContent className="p-6">
                          <div className="space-y-6">
                            {/* Prediction Section */}
                            <div className="text-center">
                              <h3 className="text-xl font-bold text-white mb-2">Head-to-Head Prediction</h3>
                              {parsedData.headToHead?.prediction && parsedData.headToHead.prediction !== 'even' ? (
                                <div className="bg-purple-900/30 border border-purple-600/50 rounded-lg p-4 mb-4">
                                  <div className="text-2xl font-bold text-purple-300 mb-2">
                                    Predicted Winner: {parsedData.headToHead.prediction === 'athlete1' ? 
                                      parsedData.athlete1?.name : parsedData.athlete2?.name}
                                  </div>
                                  {parsedData.headToHead?.confidence && (
                                    <div className="text-lg text-purple-400">
                                      Confidence: {parsedData.headToHead.confidence}%
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4 mb-4">
                                  <div className="text-xl font-bold text-gray-300 mb-2">Even Match</div>
                                  <div className="text-gray-400">Too close to call</div>
                                </div>
                              )}
                            </div>

                            {/* Reasoning */}
                            {parsedData.headToHead?.reasoning && (
                              <div>
                                <h4 className="font-semibold text-blue-400 mb-2">Analysis</h4>
                                <p className="text-gray-300 leading-relaxed">{parsedData.headToHead.reasoning}</p>
                              </div>
                            )}

                            {/* Key Factors */}
                            {parsedData.headToHead?.keyFactors && parsedData.headToHead.keyFactors.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-green-400 mb-3">Key Factors</h4>
                                <div className="space-y-2">
                                  {parsedData.headToHead.keyFactors.map((factor: string, index: number) => (
                                    <div key={index} className="flex items-start gap-2">
                                      <Star className="h-4 w-4 text-green-400 mt-1" />
                                      <span className="text-gray-300">{factor}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Scenario */}
                            {parsedData.headToHead?.scenario && (
                              <div>
                                <h4 className="font-semibold text-purple-400 mb-2">Match Scenario</h4>
                                <p className="text-gray-300 leading-relaxed">{parsedData.headToHead.scenario}</p>
                              </div>
                            )}

                            {/* Tactical Advice */}
                            {parsedData.headToHead?.tacticalAdvice && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {parsedData.headToHead.tacticalAdvice.forAthlete1 && (
                                  <Card className="bg-athlete-gray-800 border-gray-600">
                                    <CardHeader>
                                      <CardTitle className="text-sm text-blue-400">
                                        Advice for {parsedData.athlete1?.name}
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm text-gray-300">
                                      {parsedData.headToHead.tacticalAdvice.forAthlete1}
                                    </CardContent>
                                  </Card>
                                )}
                                {parsedData.headToHead.tacticalAdvice.forAthlete2 && (
                                  <Card className="bg-athlete-gray-800 border-gray-600">
                                    <CardHeader>
                                      <CardTitle className="text-sm text-blue-400">
                                        Advice for {parsedData.athlete2?.name}
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm text-gray-300">
                                      {parsedData.headToHead.tacticalAdvice.forAthlete2}
                                    </CardContent>
                                  </Card>
                                )}
                              </div>
                            )}

                            {/* Historical Context & Expert Predictions */}
                            {(parsedData.headToHead?.historicalContext || parsedData.headToHead?.expertPredictions) && (
                              <div className="space-y-4">
                                {parsedData.headToHead.historicalContext && (
                                  <div>
                                    <h5 className="font-medium text-yellow-400 mb-2">Historical Context</h5>
                                    <p className="text-gray-300 text-sm bg-athlete-gray-800 p-3 rounded-lg">
                                      {parsedData.headToHead.historicalContext}
                                    </p>
                                  </div>
                                )}

                                {parsedData.headToHead.expertPredictions && 
                                 !parsedData.headToHead.expertPredictions.includes("No predictions found") && (
                                  <div>
                                    <h5 className="font-medium text-green-400 mb-2">Expert Predictions</h5>
                                    <p className="text-gray-300 text-sm bg-athlete-gray-800 p-3 rounded-lg">
                                      {parsedData.headToHead.expertPredictions}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {!parsedData.headToHead && (
                              <div className="p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
                                <p className="text-yellow-300">Head-to-head analysis not available</p>
                              </div>
                            )}

                            {/* Strategic Analysis */}
                            {(parsedData.headToHead?.reasoning || parsedData.overallAnalysis?.recommendation) && (
                              <div className="p-4 bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-600/50 rounded-lg">
                                <h4 className="font-medium text-indigo-300 mb-3">Strategic Matchup Analysis</h4>
                                <p className="text-gray-300 text-sm leading-relaxed">
                                  {parsedData.overallAnalysis?.recommendation || parsedData.headToHead?.reasoning || "Strategic analysis considers technical skill matchups, recent form, and competitive experience to determine the most likely outcome."}
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Details Tab */}
                    <TabsContent value="detailed" className="space-y-4">
                      <Card className="bg-athlete-gray-900 border-gray-600">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-2 mb-4">
                            <Brain className="h-5 w-5 text-blue-400" />
                            <h4 className="font-semibold text-white">Detailed Technical Analysis</h4>
                          </div>
                          {parsedData.detailedAnalysis ? (
                            <div className="space-y-6">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Athlete 1 Details */}
                                {parsedData.detailedAnalysis.athlete1 && (
                                  <Card className="bg-athlete-gray-800 border-gray-600">
                                    <CardHeader>
                                      <CardTitle className="text-white">{parsedData.detailedAnalysis.athlete1.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                      {parsedData.detailedAnalysis.athlete1.currentForm && (
                                        <div>
                                          <h5 className="font-medium text-blue-400 mb-1">Current Form</h5>
                                          <p className="text-gray-300 text-sm">{parsedData.detailedAnalysis.athlete1.currentForm}</p>
                                        </div>
                                      )}

                                      {parsedData.detailedAnalysis.athlete1.technicalSkills?.length > 0 && (
                                        <div>
                                          <h5 className="font-medium text-green-400 mb-2">Technical Skills</h5>
                                          <div className="space-y-1">
                                            {parsedData.detailedAnalysis.athlete1.technicalSkills.map((skill: any, idx: number) => (
                                              <div key={idx} className="flex justify-between items-center text-sm">
                                                <span className="text-gray-300">{skill.skill}</span>
                                                <span className="text-green-400">{skill.proficiency}%</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {parsedData.detailedAnalysis.athlete1.physicalAttributes && (
                                        <div>
                                          <h5 className="font-medium text-yellow-400 mb-1">Physical Stats</h5>
                                          <div className="text-sm text-gray-300 space-y-1">
                                            {parsedData.detailedAnalysis.athlete1.physicalAttributes.height && (
                                              <div>Height: {parsedData.detailedAnalysis.athlete1.physicalAttributes.height}</div>
                                            )}
                                            {parsedData.detailedAnalysis.athlete1.physicalAttributes.weight && (
                                              <div>Weight: {parsedData.detailedAnalysis.athlete1.physicalAttributes.weight}</div>
                                            )}
                                            {parsedData.detailedAnalysis.athlete1.physicalAttributes.stance && (
                                              <div>Stance: {parsedData.detailedAnalysis.athlete1.physicalAttributes.stance}</div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                )}

                                {/* Athlete 2 Details */}
                                {parsedData.detailedAnalysis.athlete2 && (
                                  <Card className="bg-athlete-gray-800 border-gray-600">
                                    <CardHeader>
                                      <CardTitle className="text-white">{parsedData.detailedAnalysis.athlete2.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                      {parsedData.detailedAnalysis.athlete2.currentForm && (
                                        <div>
                                          <h5 className="font-medium text-blue-400 mb-1">Current Form</h5>
                                          <p className="text-gray-300 text-sm">{parsedData.detailedAnalysis.athlete2.currentForm}</p>
                                        </div>
                                      )}

                                      {parsedData.detailedAnalysis.athlete2.technicalSkills?.length > 0 && (
                                        <div>
                                          <h5 className="font-medium text-green-400 mb-2">Technical Skills</h5>
                                          <div className="space-y-1">
                                            {parsedData.detailedAnalysis.athlete2.technicalSkills.map((skill: any, idx: number) => (
                                              <div key={idx} className="flex justify-between items-center text-sm">
                                                <span className="text-gray-300">{skill.skill}</span>
                                                <span className="text-green-400">{skill.proficiency}%</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {parsedData.detailedAnalysis.athlete2.physicalAttributes && (
                                        <div>
                                          <h5 className="font-medium text-yellow-400 mb-1">Physical Stats</h5>
                                          <div className="text-sm text-gray-300 space-y-1">
                                            {parsedData.detailedAnalysis.athlete2.physicalAttributes.height && (
                                              <div>Height: {parsedData.detailedAnalysis.athlete2.physicalAttributes.height}</div>
                                            )}
                                            {parsedData.detailedAnalysis.athlete2.physicalAttributes.weight && (
                                              <div>Weight: {parsedData.detailedAnalysis.athlete2.physicalAttributes.weight}</div>
                                            )}
                                            {parsedData.detailedAnalysis.athlete2.physicalAttributes.stance && (
                                              <div>Stance: {parsedData.detailedAnalysis.athlete2.physicalAttributes.stance}</div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
                              <p className="text-yellow-300">Detailed analysis not available</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
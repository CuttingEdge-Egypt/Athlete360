import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Activity,
  Globe,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Database,
  Zap,
  TrendingUp,
  AlertCircle,
  Wifi,
  WifiOff
} from "lucide-react";
import type { Athlete, Sport } from "@shared/schema";

interface ApiStatus {
  name: string;
  available: boolean;
  keyRequired: boolean;
  hasKey: boolean;
  sports: string[];
}

interface RealTimeAthleteData {
  name: string;
  sport: string;
  nationality?: string;
  age?: number;
  height?: string;
  weight?: string;
  position?: string;
  team?: string;
  stats?: {
    wins?: number;
    losses?: number;
    ranking?: number;
    points?: number;
    goals?: number;
    assists?: number;
  };
  recentMatches?: {
    date: string;
    opponent: string;
    result: string;
    score?: string;
  }[];
  profileImage?: string;
  bio?: string;
  lastUpdated: Date;
}

export function SportsApiDashboard() {
  const [searchName, setSearchName] = useState("");
  const [searchSport, setSearchSport] = useState("");
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch API status
  const { data: apiStatus = [], isLoading: statusLoading } = useQuery<ApiStatus[]>({
    queryKey: ["/api/sports-apis/status"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch sports for dropdown
  const { data: sports = [] } = useQuery<Sport[]>({
    queryKey: ["/api/sports"],
  });

  // Fetch athletes for batch operations
  const { data: athletes = [] } = useQuery<Athlete[]>({
    queryKey: ["/api/athletes/by-sport", searchSport],
    enabled: !!searchSport,
    queryFn: async () => {
      const response = await fetch(`/api/athletes/by-sport/${searchSport}`);
      return response.json();
    }
  });

  // Search for athlete in real-time APIs
  const searchMutation = useMutation({
    mutationFn: async () => {
      if (!searchName || !searchSport) {
        throw new Error("Athlete name and sport are required");
      }
      
      const response = await apiRequest("POST", "/api/sports-apis/search-athlete", {
        athleteName: searchName,
        sport: sports.find(s => s.id === searchSport)?.name || searchSport
      });
      return response.json();
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }

      toast({
        title: "Search Failed",
        description: error.message || "Failed to search athlete data",
        variant: "destructive",
      });
    },
  });

  // Sync single athlete with real-time data
  const syncMutation = useMutation({
    mutationFn: async (athleteId: string) => {
      const response = await apiRequest("POST", `/api/athletes/${athleteId}/sync-realtime`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sync Complete",
        description: `${data.athlete?.name || 'Athlete'} updated with real-time data`,
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/athletes/by-sport"] });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }

      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync athlete data",
        variant: "destructive",
      });
    },
  });

  // Batch sync multiple athletes
  const batchSyncMutation = useMutation({
    mutationFn: async (athleteIds: string[]) => {
      const response = await apiRequest("POST", "/api/athletes/batch-sync-realtime", {
        athleteIds
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Batch Sync Complete",
        description: `${data.updated} athletes updated, ${data.failed} failed`,
      });
      setSelectedAthletes([]);
      queryClient.invalidateQueries({ queryKey: ["/api/athletes/by-sport"] });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }

      toast({
        title: "Batch Sync Failed",
        description: error.message || "Failed to batch sync athletes",
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    if (!searchName.trim()) {
      toast({
        title: "Search Required",
        description: "Please enter an athlete name to search",
        variant: "destructive",
      });
      return;
    }

    if (!searchSport) {
      toast({
        title: "Sport Required", 
        description: "Please select a sport to search in",
        variant: "destructive",
      });
      return;
    }

    searchMutation.mutate();
  };

  const handleBatchSync = () => {
    if (selectedAthletes.length === 0) {
      toast({
        title: "Selection Required",
        description: "Please select athletes to sync",
        variant: "destructive",
      });
      return;
    }

    batchSyncMutation.mutate(selectedAthletes);
  };

  const toggleAthleteSelection = (athleteId: string) => {
    setSelectedAthletes(prev => 
      prev.includes(athleteId) 
        ? prev.filter(id => id !== athleteId)
        : [...prev, athleteId]
    );
  };

  const searchData = searchMutation.data as RealTimeAthleteData | undefined;
  const availableApis = apiStatus.filter(api => api.available);
  const unavailableApis = apiStatus.filter(api => !api.available);

  return (
    <div className="space-y-6">
      <Card className="bg-athlete-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Globe className="h-5 w-5" />
            Sports API Integration Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 mb-4">
            Integrate real-time athlete data from multiple sports APIs to enhance your analysis with authentic, up-to-date information.
          </p>

          <Tabs defaultValue="search" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-athlete-gray-700">
              <TabsTrigger value="search" data-testid="tab-search">API Search</TabsTrigger>
              <TabsTrigger value="sync" data-testid="tab-sync">Batch Sync</TabsTrigger>
              <TabsTrigger value="status" data-testid="tab-status">API Status</TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-4">
              <Card className="bg-athlete-gray-900 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Search Athlete in Real-Time APIs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Athlete Name</label>
                      <Input
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                        placeholder="Enter athlete name..."
                        className="bg-athlete-gray-700 border-gray-600"
                        data-testid="input-athlete-name"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Sport</label>
                      <Select value={searchSport} onValueChange={setSearchSport} data-testid="select-sport">
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
                      <label className="text-sm font-medium text-gray-300">Action</label>
                      <Button
                        onClick={handleSearch}
                        disabled={searchMutation.isPending}
                        className="w-full bg-athlete-accent hover:bg-blue-600"
                        data-testid="button-search"
                      >
                        {searchMutation.isPending ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <Search className="mr-2 h-4 w-4" />
                            Search APIs
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {searchData && (
                    <div className="mt-6">
                      <Separator className="bg-gray-600 mb-4" />
                      <Card className="bg-athlete-gray-800 border-gray-600">
                        <CardHeader>
                          <CardTitle className="text-white flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            Real-Time Data Found
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <h4 className="font-semibold text-white">{searchData.name}</h4>
                              <div className="space-y-1 text-sm text-gray-300">
                                <div>Sport: {searchData.sport}</div>
                                {searchData.nationality && <div>Nationality: {searchData.nationality}</div>}
                                {searchData.age && <div>Age: {searchData.age}</div>}
                                {searchData.height && <div>Height: {searchData.height}</div>}
                                {searchData.weight && <div>Weight: {searchData.weight}</div>}
                                {searchData.position && <div>Position: {searchData.position}</div>}
                                {searchData.team && <div>Team: {searchData.team}</div>}
                              </div>
                            </div>
                            {searchData.profileImage && (
                              <div className="flex justify-center md:justify-end">
                                <img
                                  src={searchData.profileImage}
                                  alt={searchData.name}
                                  className="w-24 h-24 rounded-full object-cover"
                                />
                              </div>
                            )}
                          </div>
                          {searchData.bio && (
                            <div className="space-y-2">
                              <h5 className="font-medium text-white">Biography</h5>
                              <p className="text-sm text-gray-300 leading-relaxed">{searchData.bio}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sync" className="space-y-4">
              <Card className="bg-athlete-gray-900 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Batch Sync Athletes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Select Sport</label>
                    <Select value={searchSport} onValueChange={setSearchSport} data-testid="select-sport-sync">
                      <SelectTrigger className="bg-athlete-gray-700 border-gray-600">
                        <SelectValue placeholder="Select sport for batch sync..." />
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

                  {searchSport && athletes.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-white">Athletes ({athletes.length})</h4>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedAthletes(athletes.map(a => a.id))}
                            className="text-xs"
                            data-testid="button-select-all"
                          >
                            Select All
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedAthletes([])}
                            className="text-xs"
                            data-testid="button-deselect-all"
                          >
                            Deselect All
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                        {athletes.map((athlete) => (
                          <div
                            key={athlete.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedAthletes.includes(athlete.id)
                                ? 'bg-athlete-accent/20 border-athlete-accent'
                                : 'bg-athlete-gray-800 border-gray-600 hover:border-gray-500'
                            }`}
                            onClick={() => toggleAthleteSelection(athlete.id)}
                            data-testid={`athlete-${athlete.id}`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                selectedAthletes.includes(athlete.id)
                                  ? 'bg-athlete-accent border-athlete-accent'
                                  : 'border-gray-400'
                              }`}>
                                {selectedAthletes.includes(athlete.id) && (
                                  <CheckCircle className="w-3 h-3 text-white" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-white">{athlete.name}</div>
                                <div className="text-xs text-gray-400">
                                  {athlete.realTimeLastSync 
                                    ? `Last sync: ${new Date(athlete.realTimeLastSync).toLocaleDateString()}`
                                    : 'Never synced'
                                  }
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  syncMutation.mutate(athlete.id);
                                }}
                                disabled={syncMutation.isPending}
                                className="h-8 w-8 p-0"
                                data-testid={`sync-${athlete.id}`}
                              >
                                <RefreshCw className={`h-3 w-3 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {selectedAthletes.length > 0 && (
                        <Button
                          onClick={handleBatchSync}
                          disabled={batchSyncMutation.isPending}
                          className="w-full bg-athlete-accent hover:bg-blue-600"
                          data-testid="button-batch-sync"
                        >
                          {batchSyncMutation.isPending ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Syncing {selectedAthletes.length} athletes...
                            </>
                          ) : (
                            <>
                              <Database className="mr-2 h-4 w-4" />
                              Sync {selectedAthletes.length} Selected Athletes
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="status" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-athlete-gray-900 border-gray-600">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Wifi className="h-4 w-4 text-green-500" />
                      Available APIs ({availableApis.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {statusLoading ? (
                      <div className="flex items-center gap-2 text-gray-400">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Loading API status...
                      </div>
                    ) : availableApis.length > 0 ? (
                      availableApis.map((api) => (
                        <div key={api.name} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-white">{api.name}</span>
                            <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                              Available
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-400">
                            Sports: {api.sports.join(', ')}
                          </div>
                          {api.keyRequired && (
                            <Badge variant="outline" className="text-xs">
                              {api.hasKey ? 'API Key Configured' : 'API Key Required'}
                            </Badge>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-400 text-center py-4">
                        No APIs are currently available
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-athlete-gray-900 border-gray-600">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <WifiOff className="h-4 w-4 text-red-500" />
                      Unavailable APIs ({unavailableApis.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {unavailableApis.length > 0 ? (
                      unavailableApis.map((api) => (
                        <div key={api.name} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-white">{api.name}</span>
                            <Badge variant="secondary" className="bg-red-500/20 text-red-400">
                              Unavailable
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-400">
                            Sports: {api.sports.join(', ')}
                          </div>
                          {api.keyRequired && !api.hasKey && (
                            <Badge variant="outline" className="text-xs text-yellow-400">
                              API Key Required
                            </Badge>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-400 text-center py-4">
                        All configured APIs are available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-athlete-gray-900 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-400" />
                    API Configuration Guide
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-gray-300 space-y-2">
                    <p>To enable more sports APIs, configure the following environment variables:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li><code className="bg-athlete-gray-800 px-2 py-1 rounded">SPORTRADAR_API_KEY</code> - For SportRadar API access</li>
                      <li><code className="bg-athlete-gray-800 px-2 py-1 rounded">API_FOOTBALL_KEY</code> - For API-Football soccer data</li>
                      <li><code className="bg-athlete-gray-800 px-2 py-1 rounded">THESPORTSDB_API_KEY</code> - For The Sports DB premium features</li>
                    </ul>
                    <p className="text-sm text-gray-400 mt-3">
                      Some APIs like ESPN and The Sports DB offer free tiers without API keys.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
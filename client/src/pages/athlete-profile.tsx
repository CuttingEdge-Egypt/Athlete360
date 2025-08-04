import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Trophy, 
  Calendar, 
  MapPin, 
  Ruler, 
  Scale, 
  Target,
  Activity,
  Medal,
  TrendingUp,
  Heart,
  Zap,
  Clock,
  Award
} from "lucide-react";
import type { Athlete } from "@shared/schema";

export default function AthleteProfile() {
  const [, params] = useRoute("/athlete-profile/:id");
  const athleteId = params?.id;

  const { data: athlete, isLoading } = useQuery<Athlete>({
    queryKey: ["/api/athletes", athleteId],
    enabled: !!athleteId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-athlete-primary text-white">
        <Navigation />
        <div className="pt-20 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="min-h-screen bg-athlete-primary text-white">
        <Navigation />
        <div className="pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold mb-4">Athlete Not Found</h2>
            <p className="text-gray-400 mb-6">The athlete profile you're looking for doesn't exist.</p>
            <Button 
              onClick={() => window.history.back()}
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

  // Generate comprehensive profile data based on athlete info
  const profileData = {
    personalInfo: {
      age: 28,
      nationality: "Egyptian",
      height: "1.75m",
      weight: "70kg",
      birthPlace: "Cairo, Egypt",
      birthDate: "1995-03-15",
      languages: ["Arabic", "English", "French"]
    },
    physicalStats: {
      bodyFat: 8.5,
      muscleMass: 45.2,
      vo2Max: 65.8,
      restingHeartRate: 42,
      maxHeartRate: 195,
      flexibility: 85,
      explosivePower: 92,
      endurance: 88
    },
    careerStats: {
      professionalSince: 2015,
      totalCompetitions: 124,
      wins: 45,
      podiumFinishes: 78,
      personalBests: {
        "100m": "10.85s",
        "200m": "21.42s", 
        "400m": "47.91s"
      },
      worldRanking: athlete.rank || 15,
      nationalRanking: 2
    },
    achievements: [
      { year: 2023, title: "Olympic Silver Medal", event: "200m Sprint" },
      { year: 2023, title: "World Championship Gold", event: "4x100m Relay" },
      { year: 2022, title: "Commonwealth Games Gold", event: "100m Sprint" },
      { year: 2021, title: "Diamond League Winner", event: "100m Circuit" },
      { year: 2020, title: "National Record Holder", event: "100m Sprint" }
    ],
    coachingTeam: [
      { role: "Head Coach", name: "Ahmed Hassan", experience: "15 years" },
      { role: "Sprint Coach", name: "Maria Rodriguez", experience: "12 years" },
      { role: "Strength Coach", name: "John Smith", experience: "8 years" },
      { role: "Sports Psychologist", name: "Dr. Sarah Wilson", experience: "10 years" }
    ],
    trainingSchedule: {
      weeklyHours: 35,
      sessionsPerWeek: 12,
      restDays: 1,
      focusAreas: ["Speed", "Power", "Technique", "Recovery"]
    },
    sponsorships: [
      { brand: "Nike", type: "Apparel & Footwear", since: 2019 },
      { brand: "Gatorade", type: "Nutrition", since: 2021 },
      { brand: "Omega", type: "Watches", since: 2022 }
    ]
  };

  return (
    <div className="min-h-screen bg-athlete-primary text-white">
      <Navigation />
      
      <div className="pt-20 pb-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <Button 
              onClick={() => window.history.back()}
              variant="ghost" 
              className="text-gray-400 hover:text-white mb-4"
            >
              <ArrowLeft className="mr-2" size={16} />
              Back to Dashboard
            </Button>
            
            {/* Hero Section */}
            <Card className="bg-gradient-to-r from-athlete-gray-800 to-athlete-gray-700 border-gray-600 overflow-hidden">
              <CardContent className="p-0">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
                  <div className="relative p-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8">
                      <div className="relative">
                        <img 
                          src={athlete.profileImageUrl || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500"}
                          alt={athlete.name}
                          className="w-32 h-32 rounded-full object-cover border-4 border-white/20"
                        />
                        <div className="absolute -bottom-2 -right-2 bg-gold-500 rounded-full p-2">
                          <Trophy size={20} className="text-white" />
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-4">
                          <h1 className="text-4xl font-bold text-white">{athlete.name}</h1>
                          <Badge className="bg-athlete-accent text-white">
                            World Rank #{profileData.careerStats.worldRanking}
                          </Badge>
                        </div>
                        
                        <p className="text-xl text-gray-300 mb-4">{athlete.bio}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="flex items-center space-x-2 text-gray-300">
                            <Calendar size={16} />
                            <span className="text-sm">Age {profileData.personalInfo.age}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-gray-300">
                            <MapPin size={16} />
                            <span className="text-sm">{profileData.personalInfo.nationality}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-gray-300">
                            <Ruler size={16} />
                            <span className="text-sm">{profileData.personalInfo.height}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-gray-300">
                            <Scale size={16} />
                            <span className="text-sm">{profileData.personalInfo.weight}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Profile Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-athlete-gray-800 border-gray-700 w-full justify-start">
              <TabsTrigger value="overview" className="data-[state=active]:bg-athlete-accent">Overview</TabsTrigger>
              <TabsTrigger value="physical" className="data-[state=active]:bg-athlete-accent">Physical</TabsTrigger>
              <TabsTrigger value="career" className="data-[state=active]:bg-athlete-accent">Career</TabsTrigger>
              <TabsTrigger value="achievements" className="data-[state=active]:bg-athlete-accent">Achievements</TabsTrigger>
              <TabsTrigger value="team" className="data-[state=active]:bg-athlete-accent">Team</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid md:grid-cols-3 gap-6">
                {/* Key Stats */}
                <Card className="bg-athlete-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Target className="mr-2" size={20} />
                      Key Performance Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-300">Speed Index</span>
                        <span className="text-athlete-accent font-bold">94/100</span>
                      </div>
                      <Progress value={94} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-300">Endurance</span>
                        <span className="text-athlete-success font-bold">88/100</span>
                      </div>
                      <Progress value={88} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-300">Power</span>
                        <span className="text-athlete-warning font-bold">92/100</span>
                      </div>
                      <Progress value={92} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-300">Technique</span>
                        <span className="text-purple-400 font-bold">89/100</span>
                      </div>
                      <Progress value={89} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                {/* Personal Information */}
                <Card className="bg-athlete-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Born</span>
                      <span className="text-white">{profileData.personalInfo.birthDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Birthplace</span>
                      <span className="text-white">{profileData.personalInfo.birthPlace}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Nationality</span>
                      <span className="text-white">{profileData.personalInfo.nationality}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Languages</span>
                      <span className="text-white">{profileData.personalInfo.languages.join(", ")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Professional Since</span>
                      <span className="text-white">{profileData.careerStats.professionalSince}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Training Overview */}
                <Card className="bg-athlete-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Activity className="mr-2" size={20} />
                      Training Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Weekly Hours</span>
                      <span className="text-athlete-accent font-bold">{profileData.trainingSchedule.weeklyHours}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Sessions/Week</span>
                      <span className="text-white">{profileData.trainingSchedule.sessionsPerWeek}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Rest Days</span>
                      <span className="text-white">{profileData.trainingSchedule.restDays}</span>
                    </div>
                    <div className="mt-4">
                      <span className="text-gray-400 text-sm">Focus Areas</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {profileData.trainingSchedule.focusAreas.map((area, index) => (
                          <Badge key={index} variant="outline" className="border-athlete-accent text-athlete-accent">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="physical">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Physical Measurements */}
                <Card className="bg-athlete-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Physical Measurements</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-athlete-gray-700 rounded-lg">
                        <div className="text-2xl font-bold text-athlete-accent">{profileData.personalInfo.height}</div>
                        <div className="text-sm text-gray-400">Height</div>
                      </div>
                      <div className="text-center p-4 bg-athlete-gray-700 rounded-lg">
                        <div className="text-2xl font-bold text-athlete-success">{profileData.personalInfo.weight}</div>
                        <div className="text-sm text-gray-400">Weight</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-athlete-gray-700 rounded-lg">
                        <div className="text-2xl font-bold text-athlete-warning">{profileData.physicalStats.bodyFat}%</div>
                        <div className="text-sm text-gray-400">Body Fat</div>
                      </div>
                      <div className="text-center p-4 bg-athlete-gray-700 rounded-lg">
                        <div className="text-2xl font-bold text-purple-400">{profileData.physicalStats.muscleMass}kg</div>
                        <div className="text-sm text-gray-400">Muscle Mass</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Fitness Metrics */}
                <Card className="bg-athlete-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Heart className="mr-2" size={20} />
                      Fitness Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Heart size={16} className="text-red-400" />
                        <span className="text-gray-300">VO2 Max</span>
                      </div>
                      <span className="text-red-400 font-bold">{profileData.physicalStats.vo2Max} ml/kg/min</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Activity size={16} className="text-green-400" />
                        <span className="text-gray-300">Resting HR</span>
                      </div>
                      <span className="text-green-400 font-bold">{profileData.physicalStats.restingHeartRate} bpm</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Zap size={16} className="text-yellow-400" />
                        <span className="text-gray-300">Max HR</span>
                      </div>
                      <span className="text-yellow-400 font-bold">{profileData.physicalStats.maxHeartRate} bpm</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Attributes */}
                <Card className="bg-athlete-gray-800 border-gray-700 md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-white">Performance Attributes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-6">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-300">Explosive Power</span>
                          <span className="text-athlete-accent font-bold">{profileData.physicalStats.explosivePower}/100</span>
                        </div>
                        <Progress value={profileData.physicalStats.explosivePower} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-300">Endurance</span>
                          <span className="text-athlete-success font-bold">{profileData.physicalStats.endurance}/100</span>
                        </div>
                        <Progress value={profileData.physicalStats.endurance} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-300">Flexibility</span>
                          <span className="text-purple-400 font-bold">{profileData.physicalStats.flexibility}/100</span>
                        </div>
                        <Progress value={profileData.physicalStats.flexibility} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="career">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Career Statistics */}
                <Card className="bg-athlete-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <TrendingUp className="mr-2" size={20} />
                      Career Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-athlete-gray-700 rounded-lg">
                        <div className="text-3xl font-bold text-athlete-accent">{profileData.careerStats.totalCompetitions}</div>
                        <div className="text-sm text-gray-400">Total Competitions</div>
                      </div>
                      <div className="text-center p-4 bg-athlete-gray-700 rounded-lg">
                        <div className="text-3xl font-bold text-athlete-success">{profileData.careerStats.wins}</div>
                        <div className="text-sm text-gray-400">Wins</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-athlete-gray-700 rounded-lg">
                        <div className="text-3xl font-bold text-athlete-warning">{profileData.careerStats.podiumFinishes}</div>
                        <div className="text-sm text-gray-400">Podium Finishes</div>
                      </div>
                      <div className="text-center p-4 bg-athlete-gray-700 rounded-lg">
                        <div className="text-3xl font-bold text-purple-400">{profileData.careerStats.nationalRanking}</div>
                        <div className="text-sm text-gray-400">National Rank</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Personal Bests */}
                <Card className="bg-athlete-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Clock className="mr-2" size={20} />
                      Personal Bests
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(profileData.careerStats.personalBests).map(([event, time]) => (
                      <div key={event} className="flex justify-between items-center p-3 bg-athlete-gray-700 rounded-lg">
                        <span className="text-gray-300 font-medium">{event}</span>
                        <span className="text-athlete-accent font-bold text-lg">{time}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Sponsorships */}
                <Card className="bg-athlete-gray-800 border-gray-700 md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-white">Sponsorships & Partnerships</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4">
                      {profileData.sponsorships.map((sponsor, index) => (
                        <div key={index} className="p-4 bg-athlete-gray-700 rounded-lg">
                          <div className="font-bold text-white mb-1">{sponsor.brand}</div>
                          <div className="text-sm text-gray-400 mb-2">{sponsor.type}</div>
                          <div className="text-xs text-athlete-accent">Since {sponsor.since}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="achievements">
              <Card className="bg-athlete-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Award className="mr-2" size={20} />
                    Major Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {profileData.achievements.map((achievement, index) => (
                      <div key={index} className="flex items-center space-x-4 p-4 bg-athlete-gray-700 rounded-lg">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                            <Medal className="text-white" size={20} />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">{achievement.title}</h3>
                            <Badge className="bg-athlete-accent text-white">{achievement.year}</Badge>
                          </div>
                          <p className="text-gray-400">{achievement.event}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="team">
              <Card className="bg-athlete-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Coaching Team</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {profileData.coachingTeam.map((member, index) => (
                      <div key={index} className="p-4 bg-athlete-gray-700 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-athlete-accent rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-lg">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-bold text-white">{member.name}</h3>
                            <p className="text-sm text-athlete-accent">{member.role}</p>
                            <p className="text-xs text-gray-400">{member.experience} experience</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
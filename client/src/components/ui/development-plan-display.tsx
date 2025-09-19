import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, Dumbbell, Play, ExternalLink, Activity, Zap, Timer, Users, CheckCircle } from 'lucide-react';
import { useState } from 'react';

// Goal-based development plan interfaces
interface Exercise {
  id: string;
  name: string;
  description: string;
  targetArea?: string;
  tags?: string[];
  prescription?: {
    sets?: number;
    reps?: string | number;
    restSec?: number;
    intensity?: string;
  };
  equipment?: string[];
  videoUrl?: string;
  videoId?: string;
}

interface GoalArea {
  area: string;
  description: string;
  exercises: Exercise[];
}

interface GoalBasedPlan {
  version: string;
  id: string;
  title: { en: string; ar?: string };
  overview?: string;
  goalAnalysis: GoalArea[];
  exercises?: Exercise[];
  counts?: {
    goals: number;
    exercises: number;
    videos: number;
  };
  intro?: {
    overview: string;
    structure: string;
  };
}

interface DevelopmentPlanDisplayProps {
  plan: GoalBasedPlan;
  language: string;
  sport?: string;
}

// Helper function to get localized text with fallback
function getLocalizedText(text: { en: string; ar?: string }, language: string): string {
  if (language === 'ar' && text.ar) {
    return text.ar;
  }
  return text.en;
}

// Helper function to get exercise prescription display text
function getExercisePrescriptionText(exercise: Exercise): string {
  if (!exercise.prescription) return '';
  
  const parts: string[] = [];
  
  if (exercise.prescription.sets) {
    parts.push(`${exercise.prescription.sets} sets`);
  }
  
  if (exercise.prescription.reps) {
    parts.push(`${exercise.prescription.reps} reps`);
  }
  
  if (exercise.prescription.restSec) {
    const minutes = Math.floor(exercise.prescription.restSec / 60);
    const seconds = exercise.prescription.restSec % 60;
    if (minutes > 0) {
      parts.push(`${minutes}:${seconds.toString().padStart(2, '0')} rest`);
    } else {
      parts.push(`${seconds}s rest`);
    }
  }
  
  if (exercise.prescription.intensity) {
    parts.push(exercise.prescription.intensity);
  }
  
  return parts.join(' • ');
}

export function DevelopmentPlanDisplay({ plan, language, sport = 'training' }: DevelopmentPlanDisplayProps) {
  const { t } = useTranslation('home');
  const [selectedGoalIndex, setSelectedGoalIndex] = useState(0);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  
  // Validate that plan is a valid object with goal analysis
  if (!plan || typeof plan !== 'object' || !plan.title || !plan.goalAnalysis) {
    return (
      <div className="space-y-8" data-testid="development-plan-error">
        <Card className="bg-red-900/20 border-red-500/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6 text-red-400" />
              <div>
                <h3 className="text-lg font-semibold text-red-100">Invalid Development Plan</h3>
                <p className="text-red-200">The development plan data is invalid. Please try generating a new plan.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { title, counts, intro, goalAnalysis } = plan;
  
  // Get all exercises with videos from all goal areas
  const allExercisesWithVideos = goalAnalysis.flatMap(goal => 
    goal.exercises.filter(ex => ex.videoUrl)
  );
  
  // Get current goal area
  const currentGoal = goalAnalysis[selectedGoalIndex];
  const currentGoalVideos = currentGoal?.exercises.filter(ex => ex.videoUrl) || [];
  
  return (
    <div className="space-y-8" data-testid="development-plan-display">
      {/* Title with Goal Areas and Videos Count */}
      <Card className="bg-gradient-to-br from-emerald-500/20 via-athlete-accent/20 to-athlete-gray-800 border-emerald-500/40 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold text-white flex items-center gap-3">
                <Target className="h-7 w-7 text-emerald-400" />
                <span className="bg-gradient-to-r from-emerald-400 to-athlete-accent bg-clip-text text-transparent">
                  {getLocalizedText(title, language)}
                </span>
              </CardTitle>
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-emerald-500/20">
                    <Zap className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  </div>
                  <span className="font-semibold text-emerald-100">{counts?.goals || goalAnalysis.length} Goal Areas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-blue-500/20">
                    <Dumbbell className="h-4 w-4 text-blue-400 flex-shrink-0" />
                  </div>
                  <span className="font-semibold text-blue-100">{counts?.exercises || 0} Exercises</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-purple-500/20">
                    <Play className="h-4 w-4 text-purple-400 flex-shrink-0" />
                  </div>
                  <span className="font-semibold text-purple-100">{counts?.videos || allExercisesWithVideos.length} Videos</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        
        {intro && intro.overview && (
          <CardContent className="pt-0">
            <div className="p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-lg border border-slate-600/30">
              <p className="text-slate-100 leading-relaxed text-base font-medium">{intro.overview}</p>
            </div>
          </CardContent>
        )}
      </Card>

      <Tabs defaultValue="goals" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-slate-800 to-slate-700 border-slate-600">
          <TabsTrigger 
            value="goals" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white text-slate-300 font-semibold"
            data-testid="tab-goals"
          >
            <Target className="h-5 w-5 mr-2" />
            Goal Areas
          </TabsTrigger>
          <TabsTrigger 
            value="videos" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-slate-300 font-semibold"
            data-testid="tab-videos"
          >
            <Play className="h-5 w-5 mr-2" />
            All Videos
          </TabsTrigger>
        </TabsList>

        {/* Goal Areas Tab */}
        <TabsContent value="goals" className="space-y-6">
          {/* Goal Area Navigation */}
          {goalAnalysis.length > 1 && (
            <Card className="bg-gradient-to-r from-slate-800/70 to-slate-700/70 border-slate-600/50">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2">
                  {goalAnalysis.map((goal, index) => (
                    <Button
                      key={index}
                      variant={selectedGoalIndex === index ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedGoalIndex(index)}
                      className={`${
                        selectedGoalIndex === index 
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border-emerald-400 shadow-lg" 
                          : "bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500"
                      }`}
                      data-testid={`goal-button-${index}`}
                    >
                      <Target className="h-4 w-4 mr-2" />
                      {goal.area}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Goal Area Display */}
          {currentGoal && (
            <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border-emerald-500/30 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                  <div className="p-2 rounded-full bg-emerald-500/20">
                    <Zap className="h-6 w-6 text-emerald-400" />
                  </div>
                  <span className="text-emerald-50">{currentGoal.area}</span>
                </CardTitle>
                <div className="p-3 bg-slate-900/30 rounded-lg border border-slate-600/30 mt-3">
                  <p className="text-slate-100 leading-relaxed text-base">{currentGoal.description}</p>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  {currentGoal.exercises
                    .filter(exercise => exercise.videoUrl) // Prioritize exercises with videos
                    .slice(0, 3) // Limit to 3 exercises per goal area
                    .concat(
                      currentGoal.exercises
                        .filter(exercise => !exercise.videoUrl)
                        .slice(0, Math.max(0, 3 - currentGoal.exercises.filter(e => e.videoUrl).length))
                    )
                    .slice(0, 3) // Ensure final limit of 3
                    .map((exercise, exerciseIndex) => (
                    <Card key={exercise.id || exerciseIndex} className="bg-gradient-to-br from-slate-900/60 to-slate-800/60 border-slate-600/50 hover:border-slate-500/60 transition-all duration-200 shadow-md">
                      <CardContent className="p-5">
                        <div className="space-y-3">
                          {/* Exercise Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-bold text-lg text-white flex items-center gap-2">
                                <div className="p-1.5 rounded-full bg-blue-500/20">
                                  <Dumbbell className="h-4 w-4 text-blue-400" />
                                </div>
                                <span className="text-blue-50">{exercise.name}</span>
                              </h4>
                              <p className="text-sm text-slate-200 mt-2 leading-relaxed pl-8">
                                {exercise.description}
                              </p>
                            </div>
                            {exercise.videoUrl && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(exercise.videoUrl, '_blank')}
                                className="ml-4 bg-gradient-to-r from-purple-500/20 to-purple-600/20 border-purple-400 text-purple-300 hover:from-purple-500 hover:to-purple-600 hover:text-white flex-shrink-0 shadow-md"
                                data-testid={`exercise-video-${exerciseIndex}`}
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Video
                              </Button>
                            )}
                          </div>

                          {/* Exercise Details */}
                          <div className="flex flex-wrap gap-2">
                            {getExercisePrescriptionText(exercise) && (
                              <Badge variant="secondary" className="bg-athlete-gray-700 text-gray-200">
                                <Timer className="h-3 w-3 mr-1" />
                                {getExercisePrescriptionText(exercise)}
                              </Badge>
                            )}
                            {exercise.equipment && exercise.equipment.length > 0 && (
                              <Badge variant="outline" className="border-athlete-gray-600 text-gray-300">
                                <Activity className="h-3 w-3 mr-1" />
                                {exercise.equipment.join(', ')}
                              </Badge>
                            )}
                          </div>

                          {/* Exercise Tags */}
                          {exercise.tags && exercise.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {exercise.tags.map((tag, tagIndex) => (
                                <Badge
                                  key={tagIndex}
                                  variant="outline"
                                  className="text-xs border-athlete-accent/50 text-athlete-accent bg-athlete-accent/10"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* All Videos Tab */}
        <TabsContent value="videos" className="space-y-6">
          {allExercisesWithVideos.length > 0 ? (
            <div className="grid gap-4">
              {allExercisesWithVideos.map((exercise, index) => (
                <Card key={index} className="bg-athlete-gray-800/30 border-athlete-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-white flex items-center gap-2">
                          <Play className="h-4 w-4 text-athlete-accent" />
                          {exercise.name}
                        </h4>
                        {exercise.targetArea && (
                          <p className="text-sm text-gray-400 mt-1">Target Area: {exercise.targetArea}</p>
                        )}
                        <p className="text-sm text-gray-300 mt-1">{exercise.description}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => window.open(exercise.videoUrl, '_blank')}
                        className="bg-athlete-accent hover:bg-athlete-accent/90 text-white ml-4 flex-shrink-0"
                        data-testid={`video-button-${index}`}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Watch
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-athlete-gray-800/30 border-athlete-gray-700">
              <CardContent className="p-6 text-center">
                <Play className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-300 mb-2">No Videos Available</h3>
                <p className="text-gray-400">No instructional videos were found for the exercises in this plan.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Summary Card */}
      <Card className="bg-athlete-gray-800/30 border-athlete-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Training Summary</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-athlete-accent">{goalAnalysis.length}</div>
              <div className="text-sm text-gray-300">Goal Areas</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-athlete-accent">{counts?.exercises || 0}</div>
              <div className="text-sm text-gray-300">Total Exercises</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-athlete-accent">{allExercisesWithVideos.length}</div>
              <div className="text-sm text-gray-300">Video Tutorials</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
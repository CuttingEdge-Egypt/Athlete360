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
function getExercisePrescriptionText(exercise: Exercise, t: any, isArabic: boolean): string {
  if (!exercise.prescription) return '';
  
  const parts: string[] = [];
  
  if (exercise.prescription.sets) {
    const setsLabel = t('analysis.development.prescription.sets', 'sets');
    parts.push(isArabic ? `${setsLabel} ${exercise.prescription.sets}` : `${exercise.prescription.sets} ${setsLabel}`);
  }
  
  if (exercise.prescription.reps) {
    const repsLabel = t('analysis.development.prescription.reps', 'reps');
    parts.push(isArabic ? `${repsLabel} ${exercise.prescription.reps}` : `${exercise.prescription.reps} ${repsLabel}`);
  }
  
  if (exercise.prescription.restSec) {
    const minutes = Math.floor(exercise.prescription.restSec / 60);
    const seconds = exercise.prescription.restSec % 60;
    const restLabel = t('analysis.development.prescription.rest', 'rest');
    if (minutes > 0) {
      const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      parts.push(isArabic ? `${restLabel} ${timeStr}` : `${timeStr} ${restLabel}`);
    } else {
      parts.push(isArabic ? `${restLabel} ${seconds}s` : `${seconds}s ${restLabel}`);
    }
  }
  
  if (exercise.prescription.intensity) {
    parts.push(exercise.prescription.intensity);
  }
  
  return parts.join(' • ');
}

export function DevelopmentPlanDisplay({ plan, language, sport = 'training' }: DevelopmentPlanDisplayProps) {
  const { t, i18n } = useTranslation('common');
  const [selectedGoalIndex, setSelectedGoalIndex] = useState(0);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const isArabic = language === 'ar' || i18n.language === 'ar';
  
  // Validate that plan is a valid object with goal analysis
  if (!plan || typeof plan !== 'object' || !plan.title || !plan.goalAnalysis) {
    return (
      <div className="space-y-8" data-testid="development-plan-error">
        <Card className="bg-red-900/20 border-red-500/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6 text-red-400" />
              <div>
                <h3 className="text-lg font-semibold text-red-100">{t('analysis.development.invalidPlan', 'Invalid Development Plan')}</h3>
                <p className="text-red-200">{t('analysis.development.invalidPlanMessage', 'The development plan data is invalid. Please try generating a new plan.')}</p>
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
        <CardHeader className="pb-4" dir={isArabic ? 'rtl' : 'ltr'}>
          <div className={`flex items-center ${isArabic ? 'flex-row-reverse justify-end' : 'justify-between'}`}>
            <div className={`space-y-2 ${isArabic ? 'w-full' : ''}`}>
              <CardTitle className={`text-3xl font-bold text-white flex items-center gap-3 ${isArabic ? 'flex-row-reverse justify-end' : ''}`}>
                <Target className="h-7 w-7 text-emerald-400" />
                <span className="text-emerald-400">
                  {getLocalizedText(title, language)}
                </span>
              </CardTitle>
              <div className={`flex flex-wrap items-center gap-6 text-sm text-gray-300 ${isArabic ? 'flex-row-reverse justify-end' : ''}`}>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-emerald-500/20">
                    <Zap className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  </div>
                  <span className="font-semibold text-emerald-100" dir={isArabic ? 'rtl' : 'ltr'}>{counts?.goals || goalAnalysis.length} {t('analysis.development.goalAreas', 'Goal Areas')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-blue-500/20">
                    <Dumbbell className="h-4 w-4 text-blue-400 flex-shrink-0" />
                  </div>
                  <span className="font-semibold text-blue-100" dir={isArabic ? 'rtl' : 'ltr'}>{counts?.exercises || 0} {t('analysis.development.exercises', 'Exercises')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-purple-500/20">
                    <Play className="h-4 w-4 text-purple-400 flex-shrink-0" />
                  </div>
                  <span className="font-semibold text-purple-100" dir={isArabic ? 'rtl' : 'ltr'}>{counts?.videos || allExercisesWithVideos.length} {t('analysis.development.videos', 'Videos')}</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        
        {intro && intro.overview && (
          <CardContent className="pt-0" dir={isArabic ? 'rtl' : 'ltr'}>
            <div className="p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-lg border border-slate-600/30">
              <p className={`text-slate-100 leading-relaxed text-base font-medium ${isArabic ? 'text-right' : ''}`}>{intro.overview}</p>
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
            <Target className={`h-5 w-5 ${isArabic ? 'ml-2' : 'mr-2'}`} />
            {t('analysis.development.goalAreas', 'Goal Areas')}
          </TabsTrigger>
          <TabsTrigger 
            value="videos" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-slate-300 font-semibold"
            data-testid="tab-videos"
          >
            <Play className={`h-5 w-5 ${isArabic ? 'ml-2' : 'mr-2'}`} />
            {t('analysis.development.allVideos', 'All Videos')}
          </TabsTrigger>
        </TabsList>

        {/* Goal Areas Tab */}
        <TabsContent value="goals" className="space-y-6">
          {/* Goal Area Navigation */}
          {goalAnalysis.length > 1 && (
            <Card className="bg-gradient-to-r from-slate-800/70 to-slate-700/70 border-slate-600/50">
              <CardContent className="p-4" dir={isArabic ? 'rtl' : 'ltr'}>
                <div className={`flex flex-wrap gap-2 ${isArabic ? 'flex-row-reverse justify-end' : ''}`}>
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
                      } ${isArabic ? 'flex-row-reverse' : ''}`}
                      data-testid={`goal-button-${index}`}
                    >
                      <Target className={`h-4 w-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
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
              <CardHeader className="pb-4" dir={isArabic ? 'rtl' : 'ltr'}>
                <CardTitle className={`text-2xl font-bold text-white flex items-center gap-3 ${isArabic ? 'flex-row-reverse justify-end' : ''}`}>
                  <div className="p-2 rounded-full bg-emerald-500/20">
                    <Zap className="h-6 w-6 text-emerald-400" />
                  </div>
                  <span className="text-emerald-50">{currentGoal.area}</span>
                </CardTitle>
                <div className="p-3 bg-slate-900/30 rounded-lg border border-slate-600/30 mt-3" dir={isArabic ? 'rtl' : 'ltr'}>
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
                      <CardContent className="p-5" dir={isArabic ? 'rtl' : 'ltr'}>
                        <div className="space-y-3">
                          {/* Exercise Header */}
                          <div className={`flex items-start justify-between ${isArabic ? 'flex-row-reverse' : ''}`}>
                            <div className="flex-1">
                              <h4 className={`font-bold text-lg text-white flex items-center gap-2 ${isArabic ? 'flex-row-reverse justify-end' : ''}`}>
                                <div className="p-1.5 rounded-full bg-blue-500/20">
                                  <Dumbbell className="h-4 w-4 text-blue-400" />
                                </div>
                                <span className="text-blue-50">{exercise.name}</span>
                              </h4>
                              <p className={`text-slate-200 mt-2 leading-relaxed ${isArabic ? 'text-right text-base pr-8' : 'text-sm pl-8'}`}>
                                {exercise.description}
                              </p>
                            </div>
                            {exercise.videoUrl && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(exercise.videoUrl, '_blank')}
                                className={`${isArabic ? 'mr-4 flex-row-reverse' : 'ml-4'} bg-gradient-to-r from-purple-500/20 to-purple-600/20 border-purple-400 text-purple-300 hover:from-purple-500 hover:to-purple-600 hover:text-white flex-shrink-0 shadow-md`}
                                data-testid={`exercise-video-${exerciseIndex}`}
                              >
                                <Play className={`h-3 w-3 ${isArabic ? 'ml-1' : 'mr-1'}`} />
                                {t('analysis.development.video', 'Video')}
                              </Button>
                            )}
                          </div>

                          {/* Enhanced Exercise Details */}
                          <div className={`flex flex-wrap gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                            {getExercisePrescriptionText(exercise, t, isArabic) && (
                              <Badge variant="secondary" className={`bg-gradient-to-r from-blue-600/80 to-blue-500/80 text-white font-semibold text-sm px-3 py-1.5 shadow-md border border-blue-400/30 ${isArabic ? 'flex-row-reverse' : ''}`} dir={isArabic ? 'rtl' : 'ltr'}>
                                <Timer className={`h-4 w-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
                                {getExercisePrescriptionText(exercise, t, isArabic)}
                              </Badge>
                            )}
                            {exercise.equipment && exercise.equipment.length > 0 && (
                              <Badge variant="outline" className={`bg-gradient-to-r from-purple-500/20 to-purple-600/20 border-purple-400 text-purple-100 font-semibold text-sm px-3 py-1.5 shadow-md ${isArabic ? 'flex-row-reverse' : ''}`} dir={isArabic ? 'rtl' : 'ltr'}>
                                <Activity className={`h-4 w-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
                                {exercise.equipment.join(', ')}
                              </Badge>
                            )}
                          </div>

                          {/* Enhanced Exercise Tags */}
                          {exercise.tags && exercise.tags.length > 0 && (
                            <div className={`flex flex-wrap gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                              {exercise.tags.map((tag, tagIndex) => (
                                <Badge
                                  key={tagIndex}
                                  variant="outline"
                                  className="text-sm font-medium border-2 border-emerald-400/60 text-emerald-100 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 px-3 py-1 shadow-sm hover:bg-emerald-500/30 transition-colors duration-200"
                                  dir={isArabic ? 'rtl' : 'ltr'}
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
                  <CardContent className="p-4" dir={isArabic ? 'rtl' : 'ltr'}>
                    <div className={`flex items-center justify-between ${isArabic ? 'flex-row-reverse' : ''}`}>
                      <div className="flex-1">
                        <h4 className={`font-semibold text-white flex items-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                          <Play className="h-4 w-4 text-athlete-accent" />
                          {exercise.name}
                        </h4>
                        {exercise.targetArea && (
                          <div className="mt-2">
                            <Badge variant="outline" className="bg-gradient-to-r from-amber-500/20 to-amber-600/20 border-amber-400 text-amber-100 font-medium text-xs px-2 py-1">
                              {t('analysis.development.target', 'Target')}: {exercise.targetArea}
                            </Badge>
                          </div>
                        )}
                        <p className={`text-sm text-gray-300 mt-1 ${isArabic ? 'text-right' : ''}`}>{exercise.description}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => window.open(exercise.videoUrl, '_blank')}
                        className={`bg-athlete-accent hover:bg-athlete-accent/90 text-white ${isArabic ? 'mr-4' : 'ml-4'} flex-shrink-0 ${isArabic ? 'flex-row-reverse' : ''}`}
                        data-testid={`video-button-${index}`}
                      >
                        <ExternalLink className={`h-3 w-3 ${isArabic ? 'ml-1' : 'mr-1'}`} />
                        {t('analysis.development.watch', 'Watch')}
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
                <h3 className="text-lg font-semibold text-gray-300 mb-2">{t('analysis.development.noVideos', 'No Videos Available')}</h3>
                <p className="text-gray-400">{t('analysis.development.noVideosMessage', 'No instructional videos were found for the exercises in this plan.')}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Summary Card */}
      <Card className="bg-athlete-gray-800/30 border-athlete-gray-700">
        <CardContent className="p-6" dir={isArabic ? 'rtl' : 'ltr'}>
          <div className={`flex items-center gap-3 mb-4 ${isArabic ? 'flex-row-reverse justify-end' : ''}`}>
            <CheckCircle className="h-5 w-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">{t('analysis.development.trainingSummary', 'Training Summary')}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-athlete-accent">{goalAnalysis.length}</div>
              <div className="text-sm text-gray-300">{t('analysis.development.goalAreas', 'Goal Areas')}</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-athlete-accent">{counts?.exercises || 0}</div>
              <div className="text-sm text-gray-300">{t('analysis.development.totalExercises', 'Total Exercises')}</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-athlete-accent">{allExercisesWithVideos.length}</div>
              <div className="text-sm text-gray-300">{t('analysis.development.videoTutorials', 'Video Tutorials')}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
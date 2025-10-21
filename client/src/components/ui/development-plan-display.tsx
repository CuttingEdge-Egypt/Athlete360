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

// Helper function to get translations based on plan language (not site language)
function getPlanTranslation(key: string, planLanguage: string): string {
  const translations: Record<string, { en: string; ar: string }> = {
    'video': { en: 'Video', ar: 'فيديو' },
    'instructions': { en: 'Instructions', ar: 'التعليمات' },
    'logistics': { en: 'Logistics', ar: 'التفاصيل التدريبية' },
    'categories': { en: 'Categories', ar: 'الفئات' },
    'sets': { en: 'sets', ar: 'مجموعات' },
    'reps': { en: 'reps', ar: 'تكرارات' },
    'rest': { en: 'rest', ar: 'راحة' },
    'goalAreas': { en: 'Goal Areas', ar: 'المجالات المستهدفة' },
    'exercises': { en: 'Exercises', ar: 'تمارين' },
    'videos': { en: 'Videos', ar: 'فيديوهات' },
    'allVideos': { en: 'All Videos', ar: 'جميع الفيديوهات' },
    'noVideos': { en: 'No Videos Available', ar: 'لا توجد فيديوهات متاحة' },
    'noVideosMessage': { en: 'No instructional videos were found for the exercises in this plan.', ar: 'لم يتم العثور على فيديوهات تعليمية للتمارين في هذه الخطة.' },
    'target': { en: 'Target', ar: 'الهدف' },
    'watch': { en: 'Watch', ar: 'شاهد' },
    'trainingSummary': { en: 'Training Summary', ar: 'ملخص التدريب' },
    'totalExercises': { en: 'Total Exercises', ar: 'إجمالي التمارين' },
    'videoTutorials': { en: 'Video Tutorials', ar: 'دروس الفيديو' }
  };
  
  const translation = translations[key];
  if (!translation) return key;
  
  return planLanguage === 'ar' ? translation.ar : translation.en;
}

// Helper function to get exercise prescription display text
function getExercisePrescriptionText(exercise: Exercise, planLanguage: string): string {
  if (!exercise.prescription) return '';

  const isArabic = planLanguage === 'ar';
  const parts: string[] = [];

  if (exercise.prescription.sets) {
    const setsLabel = getPlanTranslation('sets', planLanguage);
    parts.push(isArabic ? `${setsLabel} ${exercise.prescription.sets}` : `${exercise.prescription.sets} ${setsLabel}`);
  }

  if (exercise.prescription.reps) {
    const repsLabel = getPlanTranslation('reps', planLanguage);
    parts.push(isArabic ? `${repsLabel} ${exercise.prescription.reps}` : `${exercise.prescription.reps} ${repsLabel}`);
  }

  if (exercise.prescription.restSec) {
    const minutes = Math.floor(exercise.prescription.restSec / 60);
    const seconds = exercise.prescription.restSec % 60;
    const restLabel = getPlanTranslation('rest', planLanguage);
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
  // Content generation language (for video button positioning based on content language)
  const contentIsArabic = language === 'ar';
  // UI language (for UI elements like tabs, labels)
  const isArabic = i18n.language === 'ar';

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
        <CardHeader className="pb-4" dir={contentIsArabic ? 'rtl' : 'ltr'}>
          <div className={`flex items-center ${contentIsArabic ? 'flex-row-reverse justify-end' : 'justify-between'}`}>
            <div className={`space-y-2 ${contentIsArabic ? 'w-full' : ''}`}>
              <CardTitle className={`${contentIsArabic ? 'text-4xl' : 'text-3xl'} font-bold text-white flex items-center gap-3 ${contentIsArabic ? 'flex-row-reverse justify-end' : ''}`}>
                <Target className="h-7 w-7 text-emerald-400" />
                <span className="text-emerald-400">
                  {getLocalizedText(title, language)}
                </span>
              </CardTitle>
              <div className={`flex flex-wrap items-center gap-6 ${contentIsArabic ? 'text-base' : 'text-sm'} text-gray-300 ${contentIsArabic ? 'flex-row-reverse justify-end' : ''}`}>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-emerald-500/20">
                    <Zap className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  </div>
                  <span className="font-semibold text-emerald-100" dir={contentIsArabic ? 'rtl' : 'ltr'}>{counts?.goals || goalAnalysis.length} {getPlanTranslation('goalAreas', language)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-blue-500/20">
                    <Dumbbell className="h-4 w-4 text-blue-400 flex-shrink-0" />
                  </div>
                  <span className="font-semibold text-blue-100" dir={contentIsArabic ? 'rtl' : 'ltr'}>{counts?.exercises || 0} {getPlanTranslation('exercises', language)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-purple-500/20">
                    <Play className="h-4 w-4 text-purple-400 flex-shrink-0" />
                  </div>
                  <span className="font-semibold text-purple-100" dir={contentIsArabic ? 'rtl' : 'ltr'}>{counts?.videos || allExercisesWithVideos.length} {getPlanTranslation('videos', language)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        {intro && intro.overview && (
          <CardContent className="pt-0" dir={contentIsArabic ? 'rtl' : 'ltr'}>
            <div className="p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-lg border border-slate-600/30">
              <p className={`text-slate-100 leading-relaxed ${contentIsArabic ? 'text-lg' : 'text-base'} font-medium ${contentIsArabic ? 'text-right' : ''}`}>{intro.overview}</p>
            </div>
          </CardContent>
        )}
      </Card>

      <Tabs defaultValue="goals" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-slate-800 to-slate-700 border-slate-600">
          <TabsTrigger 
            value="goals" 
            className={`data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white text-slate-300 font-semibold ${contentIsArabic ? 'text-base' : ''}`}
            data-testid="tab-goals"
          >
            <Target className={`h-5 w-5 ${contentIsArabic ? 'ml-2' : 'mr-2'}`} />
            {getPlanTranslation('goalAreas', language)}
          </TabsTrigger>
          <TabsTrigger 
            value="videos" 
            className={`data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-slate-300 font-semibold ${contentIsArabic ? 'text-base' : ''}`}
            data-testid="tab-videos"
          >
            <Play className={`h-5 w-5 ${contentIsArabic ? 'ml-2' : 'mr-2'}`} />
            {getPlanTranslation('allVideos', language)}
          </TabsTrigger>
        </TabsList>

        {/* Goal Areas Tab */}
        <TabsContent value="goals" className="space-y-6">
          {/* Goal Area Navigation */}
          {goalAnalysis.length > 1 && (
            <Card className="bg-gradient-to-r from-slate-800/70 to-slate-700/70 border-slate-600/50">
              <CardContent className="p-4" dir={contentIsArabic ? 'rtl' : 'ltr'}>
                <div className={`flex flex-wrap gap-2 ${contentIsArabic ? 'flex-row-reverse justify-end' : ''}`}>
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
                      } ${contentIsArabic ? 'flex-row-reverse text-base' : ''}`}
                      data-testid={`goal-button-${index}`}
                    >
                      <Target className={`h-4 w-4 ${contentIsArabic ? 'ml-2' : 'mr-2'}`} />
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
              <CardHeader className="pb-4" dir={contentIsArabic ? 'rtl' : 'ltr'}>
                <CardTitle className={`${contentIsArabic ? 'text-3xl' : 'text-2xl'} font-bold text-white flex items-center gap-3 ${contentIsArabic ? 'flex-row-reverse justify-end' : ''}`}>
                  <div className="p-2 rounded-full bg-emerald-500/20">
                    <Zap className="h-6 w-6 text-emerald-400" />
                  </div>
                  <span className="text-emerald-50">{currentGoal.area}</span>
                </CardTitle>
                <div className="p-3 bg-slate-900/30 rounded-lg border border-slate-600/30 mt-3" dir={contentIsArabic ? 'rtl' : 'ltr'}>
                  <p className={`text-slate-100 leading-relaxed ${contentIsArabic ? 'text-lg' : 'text-base'}`}>{currentGoal.description}</p>
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
                          {/* Exercise Header - Video button positioning based on content language */}
                          <div className={`flex items-start justify-between ${contentIsArabic ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className="flex-1" dir={contentIsArabic ? 'rtl' : 'ltr'}>
                              <h4 className={`font-bold ${contentIsArabic ? 'text-xl' : 'text-lg'} text-white flex items-center gap-2 ${contentIsArabic ? 'flex-row-reverse justify-end' : ''}`}>
                                <div className="p-1.5 rounded-full bg-blue-500/20">
                                  <Dumbbell className="h-4 w-4 text-blue-400" />
                                </div>
                                <span className="text-blue-50">{exercise.name}</span>
                              </h4>
                              
                              {/* Instructions Title */}
                              <h5 className={`${contentIsArabic ? 'text-base' : 'text-sm'} font-semibold text-slate-400 mt-3 mb-1 ${contentIsArabic ? 'text-right' : ''}`}>
                                {getPlanTranslation('instructions', language)}
                              </h5>
                              <p className={`text-slate-200 leading-relaxed ${contentIsArabic ? 'text-right text-lg' : 'text-sm'}`}>
                                {exercise.description}
                              </p>
                            </div>
                            {exercise.videoUrl && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(exercise.videoUrl, '_blank')}
                                className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 border-purple-400 text-purple-300 hover:from-purple-500 hover:to-purple-600 hover:text-white flex-shrink-0 shadow-md"
                                data-testid={`exercise-video-${exerciseIndex}`}
                              >
                                <Play className="h-3 w-3" />
                                <span className={contentIsArabic ? 'mr-2' : 'ml-2'}>
                                  {getPlanTranslation('video', language)}
                                </span>
                              </Button>
                            )}
                          </div>

                          {/* Prescription Title and Details */}
                          {(getExercisePrescriptionText(exercise, language) || (exercise.equipment && exercise.equipment.length > 0)) && (
                            <div className="space-y-2">
                              <h5 className={`${contentIsArabic ? 'text-base' : 'text-sm'} font-semibold text-slate-400 ${contentIsArabic ? 'text-right' : ''}`}>
                                {getPlanTranslation('logistics', language)}
                              </h5>
                              <div className={`flex flex-wrap gap-3 ${contentIsArabic ? 'flex-row-reverse' : ''}`}>
                                {getExercisePrescriptionText(exercise, language) && (
                                  <Badge variant="secondary" className={`bg-gradient-to-r from-blue-600/80 to-blue-500/80 text-white font-semibold ${contentIsArabic ? 'text-base' : 'text-sm'} px-3 py-1.5 shadow-md border border-blue-400/30 ${contentIsArabic ? 'flex-row-reverse' : ''}`} dir={contentIsArabic ? 'rtl' : 'ltr'}>
                                    <Timer className={`h-4 w-4 ${contentIsArabic ? 'ml-2' : 'mr-2'}`} />
                                    {getExercisePrescriptionText(exercise, language)}
                                  </Badge>
                                )}
                                {exercise.equipment && exercise.equipment.length > 0 && (
                                  <Badge variant="outline" className={`bg-gradient-to-r from-purple-500/20 to-purple-600/20 border-purple-400 text-purple-100 font-semibold ${contentIsArabic ? 'text-base' : 'text-sm'} px-3 py-1.5 shadow-md ${contentIsArabic ? 'flex-row-reverse' : ''}`} dir={contentIsArabic ? 'rtl' : 'ltr'}>
                                    <Activity className={`h-4 w-4 ${contentIsArabic ? 'ml-2' : 'mr-2'}`} />
                                    {exercise.equipment.join(', ')}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Categories Title and Tags */}
                          {exercise.tags && exercise.tags.length > 0 && (
                            <div className="space-y-2">
                              <h5 className={`${contentIsArabic ? 'text-base' : 'text-sm'} font-semibold text-slate-400 ${contentIsArabic ? 'text-right' : ''}`}>
                                {getPlanTranslation('categories', language)}
                              </h5>
                              <div className={`flex flex-wrap gap-2 ${contentIsArabic ? 'flex-row-reverse' : ''}`}>
                                {exercise.tags.map((tag, tagIndex) => (
                                  <Badge
                                    key={tagIndex}
                                    variant="outline"
                                    className={`${contentIsArabic ? 'text-base' : 'text-sm'} font-medium border-2 border-emerald-400/60 text-emerald-100 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 px-3 py-1 shadow-sm hover:bg-emerald-500/30 transition-colors duration-200`}
                                    dir={contentIsArabic ? 'rtl' : 'ltr'}
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
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

        {/* All Videos Tab - Video button positioning based on content language */}
        <TabsContent value="videos" className="space-y-6">
          {allExercisesWithVideos.length > 0 ? (
            <div className="grid gap-4">
              {allExercisesWithVideos.map((exercise, index) => (
                <Card key={index} className="bg-athlete-gray-800/30 border-athlete-gray-700">
                  <CardContent className="p-4">
                    <div className={`flex items-center justify-between ${contentIsArabic ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className="flex-1" dir={contentIsArabic ? 'rtl' : 'ltr'}>
                        <h4 className={`font-semibold ${contentIsArabic ? 'text-lg' : 'text-base'} text-white flex items-center gap-2 ${contentIsArabic ? 'flex-row-reverse justify-end' : ''}`}>
                          <Play className="h-4 w-4 text-athlete-accent" />
                          {exercise.name}
                        </h4>
                        {exercise.targetArea && (
                          <div className={`mt-2 ${contentIsArabic ? 'text-right' : ''}`}>
                            <Badge variant="outline" className={`bg-gradient-to-r from-amber-500/20 to-amber-600/20 border-amber-400 text-amber-100 font-medium ${contentIsArabic ? 'text-sm' : 'text-xs'} px-2 py-1 text-center`}>
                              {getPlanTranslation('target', language)}: {exercise.targetArea}
                            </Badge>
                          </div>
                        )}
                        <p className={`${contentIsArabic ? 'text-base' : 'text-sm'} text-gray-300 mt-1 ${contentIsArabic ? 'text-right' : ''}`}>{exercise.description}</p>
                      </div>
                      {exercise.videoUrl && (
                        <Button
                          size="sm"
                          onClick={() => window.open(exercise.videoUrl, '_blank')}
                          className="bg-athlete-accent hover:bg-athlete-accent/90 text-white flex-shrink-0"
                          data-testid={`video-button-${index}`}
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span className={contentIsArabic ? 'mr-2' : 'ml-2'}>
                            {getPlanTranslation('watch', language)}
                          </span>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-athlete-gray-800/30 border-athlete-gray-700">
              <CardContent className="p-6 text-center">
                <Play className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className={`${contentIsArabic ? 'text-xl' : 'text-lg'} font-semibold text-gray-300 mb-2`}>{getPlanTranslation('noVideos', language)}</h3>
                <p className={`${contentIsArabic ? 'text-base' : 'text-sm'} text-gray-400`}>{getPlanTranslation('noVideosMessage', language)}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Summary Card */}
      <Card className="bg-athlete-gray-800/30 border-athlete-gray-700">
        <CardContent className="p-6" dir={contentIsArabic ? 'rtl' : 'ltr'}>
          <div className={`flex items-center gap-3 mb-4 ${contentIsArabic ? 'flex-row-reverse justify-end' : ''}`}>
            <CheckCircle className="h-5 w-5 text-green-400" />
            <h3 className={`${contentIsArabic ? 'text-xl' : 'text-lg'} font-semibold text-white`}>{getPlanTranslation('trainingSummary', language)}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-athlete-accent">{goalAnalysis.length}</div>
              <div className={`${contentIsArabic ? 'text-base' : 'text-sm'} text-gray-300`}>{getPlanTranslation('goalAreas', language)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-athlete-accent">{counts?.exercises || 0}</div>
              <div className={`${contentIsArabic ? 'text-base' : 'text-sm'} text-gray-300`}>{getPlanTranslation('totalExercises', language)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-athlete-accent">{allExercisesWithVideos.length}</div>
              <div className={`${contentIsArabic ? 'text-base' : 'text-sm'} text-gray-300`}>{getPlanTranslation('videoTutorials', language)}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Target, Dumbbell, Play, ChevronRight, ChevronLeft, ExternalLink, Activity, Zap, Timer, Users } from 'lucide-react';
import { useState } from 'react';
import { DevelopmentPlanV1, Exercise, Week, Day } from '../../../../shared/schema';

interface DevelopmentPlanDisplayProps {
  plan: DevelopmentPlanV1; // Direct DevelopmentPlanV1 object
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

// Helper function to get all exercises with videos from the plan
function getAllExercisesWithVideos(plan: DevelopmentPlanV1): Exercise[] {
  const exercises: Exercise[] = [];
  
  plan.weeks.forEach(week => {
    week.days.forEach(day => {
      day.exercises.forEach(exercise => {
        if (exercise.video) {
          exercises.push(exercise);
        }
      });
    });
  });
  
  return exercises;
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
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  
  // Validate that plan is a valid object
  if (!plan || typeof plan !== 'object' || !plan.title || !plan.weeks) {
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

  const { title, duration, counts, intro, weeks } = plan;
  const allExercisesWithVideos = getAllExercisesWithVideos(plan);
  
  // Get current week and day
  const currentWeek = weeks[selectedWeekIndex];
  const currentDay = currentWeek?.days[selectedDayIndex];
  
  // Get videos for the current day
  const currentDayVideos = currentDay?.exercises.filter(ex => ex.video) || [];
  
  return (
    <div className="space-y-8" data-testid="development-plan-display">
      {/* Title with Weeks and Videos Count */}
      <Card className="bg-gradient-to-br from-athlete-accent/20 to-athlete-gray-800 border-athlete-accent/30">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl text-white flex items-center gap-3">
                <Target className="h-6 w-6 text-athlete-accent" />
                {getLocalizedText(title, language)}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-athlete-accent flex-shrink-0" />
                  <span className="font-medium">{counts.weeks} Weeks</span>
                </div>
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-athlete-accent flex-shrink-0" />
                  <span className="font-medium">{counts.videos} Videos</span>
                </div>
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-athlete-accent flex-shrink-0" />
                  <span className="font-medium">{counts.exercises} Exercises</span>
                </div>
              </div>
            </div>
            <Badge className="bg-athlete-accent text-white px-3 py-1 text-sm font-medium">
              AI Generated
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Program Intro and Overall Explanation */}
      <Card className="bg-athlete-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-athlete-accent" />
            Program Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="bg-athlete-gray-700/50 rounded-lg p-4">
              <p className="text-gray-200 leading-relaxed">{intro.overview}</p>
            </div>
            
            {intro.structure && (
              <div className="bg-gradient-to-r from-athlete-accent/10 to-transparent rounded-lg p-4">
                <h4 className="text-athlete-accent font-semibold mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Program Structure
                </h4>
                <p className="text-gray-200 leading-relaxed">{intro.structure}</p>
              </div>
            )}
            
            {intro.progressMetrics && intro.progressMetrics.length > 0 && (
              <div>
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-athlete-accent" />
                  Progress Metrics
                </h4>
                <div className="grid gap-2">
                  {intro.progressMetrics.map((metric, index) => (
                    <div key={index} className="flex items-center gap-2 text-gray-200">
                      <div className="w-1.5 h-1.5 bg-athlete-accent rounded-full" />
                      <span>{metric}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Program Days/Weeks Navigation */}
      <Card className="bg-athlete-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-athlete-accent" />
            Weekly Program Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs value={selectedWeekIndex.toString()} onValueChange={(value) => {
            setSelectedWeekIndex(parseInt(value));
            setSelectedDayIndex(0); // Reset to first day when week changes
          }}>
            <TabsList className="grid w-full bg-athlete-gray-700 mb-6" style={{
              gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))`
            }}>
              {weeks.map((week, index) => (
                <TabsTrigger 
                  key={week.index}
                  value={index.toString()}
                  className="data-[state=active]:bg-athlete-accent data-[state=active]:text-white text-gray-300"
                  data-testid={`week-tab-${index}`}
                >
                  Week {week.index}
                  {week.title && <span className="hidden sm:inline ml-1">- {week.title}</span>}
                </TabsTrigger>
              ))}
            </TabsList>

            {weeks.map((week, weekIndex) => (
              <TabsContent key={week.index} value={weekIndex.toString()}>
                <div className="space-y-6">
                  {/* Week Overview */}
                  <div className="bg-gradient-to-r from-athlete-accent/10 to-transparent rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl text-white font-semibold flex items-center gap-2">
                        <Target className="h-5 w-5 text-athlete-accent" />
                        Week {week.index}
                        {week.title && <span>- {week.title}</span>}
                      </h3>
                      <div className="flex gap-4 text-sm text-gray-300">
                        <span>{week.counts.days} Days</span>
                        <span>{week.counts.exercises} Exercises</span>
                        <span>{week.counts.videos} Videos</span>
                      </div>
                    </div>
                    {week.summary && (
                      <p className="text-gray-200 leading-relaxed">{week.summary}</p>
                    )}
                  </div>

                  {/* Days Navigation */}
                  <div className="space-y-4">
                    <h4 className="text-lg text-white font-semibold">Training Days</h4>
                    <Tabs value={selectedDayIndex.toString()} onValueChange={(value) => setSelectedDayIndex(parseInt(value))}>
                      <TabsList className="grid w-full bg-athlete-gray-700 mb-4" style={{
                        gridTemplateColumns: `repeat(${week.days.length}, minmax(0, 1fr))`
                      }}>
                        {week.days.map((day, index) => (
                          <TabsTrigger 
                            key={day.index}
                            value={index.toString()}
                            className="data-[state=active]:bg-athlete-accent data-[state=active]:text-white text-gray-300"
                            data-testid={`day-tab-${index}`}
                          >
                            Day {day.index}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {week.days.map((day, dayIndex) => (
                        <TabsContent key={day.index} value={dayIndex.toString()}>
                          <div className="space-y-6">
                            {/* Day Header */}
                            <div className="bg-athlete-gray-700/50 rounded-lg p-4 border-l-4 border-athlete-accent">
                              <h4 className="text-lg text-athlete-accent font-semibold mb-2 flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Day {day.index}
                                {day.title && <span>- {day.title}</span>}
                              </h4>
                              {day.focus && (
                                <p className="text-gray-200 mb-2">
                                  <span className="text-athlete-accent font-medium">Focus:</span> {day.focus}
                                </p>
                              )}
                              {day.notes && (
                                <p className="text-gray-200 text-sm bg-athlete-gray-800 p-3 rounded">
                                  <span className="text-athlete-accent font-medium">Notes:</span> {day.notes}
                                </p>
                              )}
                            </div>

                            {/* Exercises for Day */}
                            <div className="space-y-4">
                              <h5 className="text-white font-semibold flex items-center gap-2">
                                <Dumbbell className="h-4 w-4 text-athlete-accent" />
                                Exercises ({day.exercises.length})
                              </h5>
                              
                              <div className="grid gap-4">
                                {day.exercises.map((exercise, exerciseIndex) => (
                                  <div key={exercise.id} className="bg-athlete-gray-700 rounded-lg p-4 hover:bg-athlete-gray-600 transition-colors">
                                    <div className="flex items-start justify-between mb-3">
                                      <h6 className="text-white font-medium text-lg">{exercise.name}</h6>
                                      {exercise.video && (
                                        <Badge className="bg-athlete-accent text-white ml-2">
                                          <Play className="h-3 w-3 mr-1" />
                                          Video
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    {exercise.description && (
                                      <p className="text-gray-300 mb-3 leading-relaxed">{exercise.description}</p>
                                    )}
                                    
                                    {exercise.prescription && (
                                      <div className="flex flex-wrap items-center gap-4 text-sm mb-3">
                                        <span className="text-gray-300">{getExercisePrescriptionText(exercise)}</span>
                                      </div>
                                    )}
                                    
                                    {exercise.equipment && exercise.equipment.length > 0 && (
                                      <div className="flex flex-wrap gap-2 mb-3">
                                        {exercise.equipment.map((item, index) => (
                                          <Badge key={index} variant="outline" className="text-gray-300 border-gray-500">
                                            {item}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                    
                                    {exercise.tags && exercise.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-2">
                                        {exercise.tags.map((tag, index) => (
                                          <Badge key={index} variant="secondary" className="bg-athlete-accent/20 text-athlete-accent">
                                            {tag}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Videos for Day Exercises (In Tabs) */}
                            {currentDayVideos.length > 0 && (
                              <Card className="bg-athlete-gray-700 border-gray-600">
                                <CardHeader>
                                  <CardTitle className="text-white flex items-center gap-2">
                                    <Play className="h-5 w-5 text-athlete-accent" />
                                    Exercise Videos for Day {day.index}
                                    <Badge variant="secondary" className="ml-2 bg-athlete-accent text-white">
                                      {currentDayVideos.length}
                                    </Badge>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                  <Tabs value={selectedVideoIndex.toString()} onValueChange={(value) => setSelectedVideoIndex(parseInt(value))}>
                                    <TabsList className="grid w-full bg-athlete-gray-800 mb-4" style={{
                                      gridTemplateColumns: `repeat(${Math.min(currentDayVideos.length, 4)}, minmax(0, 1fr))`
                                    }}>
                                      {currentDayVideos.slice(0, 4).map((exercise, index) => (
                                        <TabsTrigger 
                                          key={`video-tab-${index}`}
                                          value={index.toString()}
                                          className="data-[state=active]:bg-athlete-accent data-[state=active]:text-white text-gray-300 text-xs"
                                          data-testid={`exercise-video-tab-${index}`}
                                        >
                                          {exercise.name.slice(0, 15)}...
                                        </TabsTrigger>
                                      ))}
                                    </TabsList>

                                    {currentDayVideos.map((exercise, index) => (
                                      exercise.video && (
                                        <TabsContent key={`video-content-${index}`} value={index.toString()}>
                                          <div className="space-y-4">
                                            <div className="bg-black rounded-lg overflow-hidden">
                                              <iframe
                                                src={`https://www.youtube.com/embed/${exercise.video.videoId}?rel=0&modestbranding=1`}
                                                title={exercise.video.title || exercise.name}
                                                className="w-full aspect-video"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                                data-testid={`exercise-video-${index}`}
                                              />
                                            </div>
                                            
                                            <div className="flex items-center justify-between">
                                              <div>
                                                <h6 className="text-white font-semibold">{exercise.name}</h6>
                                                <p className="text-gray-400 text-sm">{exercise.video.title}</p>
                                              </div>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => window.open(exercise.video!.url, '_blank')}
                                                className="border-athlete-accent text-athlete-accent hover:bg-athlete-accent hover:text-white"
                                                data-testid={`watch-youtube-${index}`}
                                              >
                                                <ExternalLink className="h-4 w-4 mr-1" />
                                                YouTube
                                              </Button>
                                            </div>
                                          </div>
                                        </TabsContent>
                                      )
                                    ))}
                                  </Tabs>
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
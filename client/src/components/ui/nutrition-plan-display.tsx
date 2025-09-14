import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, Utensils, Target, Apple } from "lucide-react";

interface NutritionPlanProps {
  plan: string | any;
}

interface NutritionPlanDay {
  day: {
    date: string;
    name: string;
  };
  meals: {
    scan_meal?: {};
    calories_intake: string;
    meal_description: string[];
  }[];
  explanation: string;
  total_calories_intake: string;
}

interface StructuredNutritionPlan {
  days: NutritionPlanDay[];
}

interface WeekData {
  weekNumber: number;
  days: NutritionPlanDay[];
  startDate: string;
  endDate: string;
}

export function NutritionPlanDisplay({ plan }: NutritionPlanProps) {
  const [currentWeek, setCurrentWeek] = useState(0);
  const [currentDay, setCurrentDay] = useState(0);
  let nutritionData: StructuredNutritionPlan | null = null;

  console.log("NutritionPlanDisplay received plan:", typeof plan, plan);

  // Try to parse the plan as JSON
  try {
    let parsedData: any = null;
    
    if (typeof plan === 'string') {
      try {
        parsedData = JSON.parse(plan);
      } catch (e) {
        parsedData = null;
      }
    } else if (typeof plan === 'object' && plan !== null) {
      parsedData = plan;
    }
    
    // Handle nested structure from database
    if (parsedData && typeof parsedData === 'object') {
      if (parsedData.content) {
        if (typeof parsedData.content === 'string') {
          try {
            nutritionData = JSON.parse(parsedData.content);
          } catch (e) {
            parsedData = null;
          }
        } else if (typeof parsedData.content === 'object') {
          nutritionData = parsedData.content;
        }
      } else if (parsedData.days) {
        nutritionData = parsedData;
      }
    }
  } catch (error) {
    console.error("Failed to parse nutrition plan:", error, plan);
  }

  // If parsing failed, show raw text
  if (!nutritionData) {
    return (
      <Card className="w-full max-w-4xl mx-auto bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Utensils className="h-5 w-5" />
            Nutrition Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap text-sm text-muted-foreground">
            {typeof plan === 'string' ? plan : JSON.stringify(plan, null, 2)}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group days into weeks (7 days each)  
  const groupIntoWeeks = (days: NutritionPlanDay[]): WeekData[] => {
    if (!days || days.length === 0) return [];
    const weeks: WeekData[] = [];
    for (let i = 0; i < days.length; i += 7) {
      const weekDays = days.slice(i, i + 7);
      weeks.push({
        weekNumber: Math.floor(i / 7) + 1,
        days: weekDays,
        startDate: weekDays[0]?.day.date || "",
        endDate: weekDays[weekDays.length - 1]?.day.date || ""
      });
    }
    return weeks;
  };

  const weeks = groupIntoWeeks(nutritionData.days);
  const currentWeekData = weeks[currentWeek] || { days: [], weekNumber: 1, startDate: "", endDate: "" };
  const totalWeeks = weeks.length;

  // Calculate total stats
  const totalDays = nutritionData.days.length;
  const totalMeals = nutritionData.days.reduce((total, day) => total + day.meals.length, 0);
  const avgCaloriesPerDay = totalDays > 0 ? Math.round(
    nutritionData.days.reduce((total, day) => {
      const dayCalories = parseInt(day.total_calories_intake?.replace(/[^\d]/g, '') || '0') || 0;
      return total + dayCalories;
    }, 0) / totalDays
  ) : 0;

  // Empty state guard
  if (totalWeeks === 0 || totalDays === 0) {
    return (
      <Card className="w-full max-w-4xl mx-auto bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Apple className="h-5 w-5 text-green-400" />
            Nutrition Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <div className="text-muted-foreground">
            No nutrition plan data available.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Safe bounds checking
  const maxDayInWeek = Math.max(0, (currentWeekData?.days.length || 1) - 1);
  const safCurrentDay = Math.min(Math.max(0, currentDay), maxDayInWeek);
  const currentDayData = currentWeekData?.days[safCurrentDay];

  // Navigation handlers
  const handleWeekChange = (newWeek: number) => {
    const clampedWeek = Math.min(Math.max(0, newWeek), totalWeeks - 1);
    setCurrentWeek(clampedWeek);
    setCurrentDay(0);
  };

  const handleDayChange = (newDay: number) => {
    const clampedDay = Math.min(Math.max(0, newDay), maxDayInWeek);
    setCurrentDay(clampedDay);
  };

  const handlePrevious = () => {
    if (currentDay > 0) {
      setCurrentDay(currentDay - 1);
    } else if (currentWeek > 0) {
      const prevWeek = currentWeek - 1;
      const prevWeekData = weeks[prevWeek];
      setCurrentWeek(prevWeek);
      setCurrentDay((prevWeekData?.days.length || 1) - 1);
    }
  };

  const handleNext = () => {
    if (currentDay < maxDayInWeek) {
      setCurrentDay(currentDay + 1);
    } else if (currentWeek < totalWeeks - 1) {
      setCurrentWeek(currentWeek + 1);
      setCurrentDay(0);
    }
  };

  const canGoPrevious = currentWeek > 0 || currentDay > 0;
  const canGoNext = currentWeek < totalWeeks - 1 || currentDay < maxDayInWeek;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Consolidated Navigation Header */}
      <Card className="bg-gradient-to-r from-card to-slate-700 border-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-foreground">
            <div className="flex items-center gap-3">
              <Apple className="h-6 w-6 text-green-400" />
              <div>
                <div className="text-xl font-bold">Nutrition Plan</div>
                <div className="text-sm text-muted-foreground font-normal">
                  {totalDays} Days • {totalWeeks} Week{totalWeeks > 1 ? 's' : ''} • {totalMeals} Meals
                </div>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="bg-green-600 text-white mb-1">
                Week {currentWeek + 1} • Day {safCurrentDay + 1}
              </Badge>
              <div className="text-sm text-muted-foreground">
                {currentDayData?.day.name} - {currentDayData?.day.date}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Unified Navigation Controls */}
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              size="lg"
              onClick={handlePrevious}
              disabled={!canGoPrevious}
              className="flex items-center gap-2 bg-slate-700 border-border text-white hover:bg-slate-600 disabled:opacity-50"
              data-testid="button-previous"
            >
              <ChevronLeft className="h-5 w-5" />
              Previous
            </Button>
            
            {/* Progress Bar with Week/Day Indicators */}
            <div className="flex-1 mx-8">
              <div className="flex items-center justify-center gap-1">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex items-center">
                    <div className="flex gap-1">
                      {week.days.map((_, dayIndex) => {
                        const globalDayIndex = weekIndex * 7 + dayIndex;
                        const isCurrentDay = weekIndex === currentWeek && dayIndex === safCurrentDay;
                        const isCurrentWeek = weekIndex === currentWeek;
                        
                        return (
                          <button
                            key={dayIndex}
                            onClick={() => {
                              setCurrentWeek(weekIndex);
                              setCurrentDay(dayIndex);
                            }}
                            className={`w-6 h-6 rounded-lg transition-all duration-200 flex items-center justify-center text-xs font-bold border-2 ${
                              isCurrentDay 
                                ? 'bg-green-500 text-white border-green-400 scale-110 shadow-lg' 
                                : isCurrentWeek
                                  ? 'bg-slate-600 text-slate-200 border-gray-500 hover:bg-slate-500'
                                  : 'bg-slate-700 text-muted-foreground border-border hover:bg-slate-600'
                            }`}
                            title={`Week ${weekIndex + 1}, Day ${dayIndex + 1}`}
                            data-testid={`day-${weekIndex}-${dayIndex}`}
                          >
                            {dayIndex + 1}
                          </button>
                        );
                      })}
                    </div>
                    {weekIndex < totalWeeks - 1 && (
                      <div className="w-2 h-0.5 bg-slate-600 mx-1"></div>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-center mt-2 text-xs text-muted-foreground">
                Tap any day or use arrows to navigate
              </div>
            </div>

            <Button 
              variant="outline" 
              size="lg"
              onClick={handleNext}
              disabled={!canGoNext}
              className="flex items-center gap-2 bg-slate-700 border-border text-white hover:bg-slate-600 disabled:opacity-50"
              data-testid="button-next"
            >
              Next
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Day Display */}
      {currentDayData && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-foreground">
              <div className="flex items-center gap-3">
                <div className="bg-green-500 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold">
                  {(currentWeek * 7) + safCurrentDay + 1}
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{currentDayData.day.name}</h3>
                  <p className="text-muted-foreground">{currentDayData.day.date}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-lg px-4 py-2 bg-green-600 text-white border-green-500">
                {currentDayData.total_calories_intake}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Enhanced Meals Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {currentDayData.meals.map((meal, mealIndex) => (
                <div 
                  key={mealIndex} 
                  className="bg-gradient-to-br from-slate-700 to-slate-600 border-2 border-slate-500 rounded-xl p-5 hover:shadow-xl transition-all duration-300 hover:border-green-400 hover:scale-105"
                >
                  {/* Meal Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                        Meal {mealIndex + 1}
                      </span>
                    </div>
                    <Badge variant="secondary" className="bg-green-600 text-white text-xs font-bold px-3 py-1">
                      {meal.calories_intake}
                    </Badge>
                  </div>
                  
                  {/* Meal Items */}
                  <div className="space-y-3">
                    {meal.meal_description.map((item, itemIndex) => (
                      <div 
                        key={itemIndex} 
                        className="bg-card text-slate-200 text-sm p-3 rounded-lg text-center border border-border hover:border-green-500 hover:bg-slate-700 transition-all duration-200"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Daily Explanation */}
            {currentDayData.explanation && (
              <div className="p-6 bg-gradient-to-r from-blue-900/30 to-blue-800/20 rounded-xl border-l-4 border-blue-400">
                <div className="flex items-start gap-3">
                  <Target className="h-6 w-6 text-blue-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-lg text-blue-300 mb-2">
                      Daily Focus
                    </h4>
                    <p className="text-slate-200 leading-relaxed">
                      {currentDayData.explanation}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Overall Plan Summary */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Target className="h-5 w-5 text-purple-400" />
            Plan Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-6 bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-xl border border-purple-700">
              <div className="text-3xl font-bold text-purple-400 mb-1">
                {totalWeeks}
              </div>
              <div className="text-sm text-muted-foreground">Week{totalWeeks > 1 ? 's' : ''} Planned</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-xl border border-blue-700">
              <div className="text-3xl font-bold text-blue-400 mb-1">
                {totalDays}
              </div>
              <div className="text-sm text-muted-foreground">Total Days</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-orange-900/30 to-orange-800/20 rounded-xl border border-orange-700">
              <div className="text-3xl font-bold text-orange-400 mb-1">
                {totalMeals}
              </div>
              <div className="text-sm text-muted-foreground">Total Meals</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-xl border border-green-700">
              <div className="text-3xl font-bold text-green-400 mb-1">
                {avgCaloriesPerDay}
              </div>
              <div className="text-sm text-muted-foreground">Avg Calories/Day</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
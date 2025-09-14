import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Clock, Utensils, Droplets, Zap, Target, Apple, Pill, NotebookPen, ChevronLeft, ChevronRight, Calendar } from "lucide-react";

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
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            Nutrition Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap text-sm">
            {typeof plan === 'string' ? plan : JSON.stringify(plan, null, 2)}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group days into weeks (7 days each)
  const groupIntoWeeks = (days: NutritionPlanDay[]): WeekData[] => {
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
  const currentWeekData = weeks[currentWeek];
  const totalWeeks = weeks.length;

  // Calculate total stats
  const totalDays = nutritionData.days.length;
  const totalMeals = nutritionData.days.reduce((total, day) => total + day.meals.length, 0);
  const avgCaloriesPerDay = totalDays > 0 ? Math.round(
    nutritionData.days.reduce((total, day) => {
      const dayCalories = parseInt(day.total_calories_intake.replace(/[^\d]/g, '')) || 0;
      return total + dayCalories;
    }, 0) / totalDays
  ) : 0;

  // Reset currentDay when week changes and ensure it's within bounds
  const maxDayInWeek = (currentWeekData?.days.length || 1) - 1;
  const safCurrentDay = Math.min(currentDay, maxDayInWeek);
  
  // Week change handler that resets day to 0
  const handleWeekChange = (newWeek: number) => {
    setCurrentWeek(newWeek);
    setCurrentDay(0);
  };

  // Day navigation handlers
  const handlePreviousDay = () => {
    setCurrentDay(Math.max(0, currentDay - 1));
  };

  const handleNextDay = () => {
    setCurrentDay(Math.min(maxDayInWeek, currentDay + 1));
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header Overview with Week Navigation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Apple className="h-5 w-5 text-green-500" />
              Nutrition Plan - {totalDays} Days ({totalWeeks} Week{totalWeeks > 1 ? 's' : ''})
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Week {currentWeek + 1} of {totalWeeks}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {/* Week Navigation Controls */}
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleWeekChange(Math.max(0, currentWeek - 1))}
                disabled={currentWeek === 0}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous Week
              </Button>
              
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                  Week {currentWeek + 1}
                </div>
                <div className="text-sm text-muted-foreground">
                  {currentWeekData?.startDate} - {currentWeekData?.endDate}
                </div>
              </div>

              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleWeekChange(Math.min(totalWeeks - 1, currentWeek + 1))}
                disabled={currentWeek === totalWeeks - 1}
                className="flex items-center gap-2"
              >
                Next Week
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Week Progress Indicators */}
            <div className="flex items-center gap-2">
              {weeks.map((_, weekIndex) => (
                <button
                  key={weekIndex}
                  onClick={() => handleWeekChange(weekIndex)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    weekIndex === currentWeek 
                      ? 'bg-green-500' 
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                  }`}
                  title={`Week ${weekIndex + 1}`}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Week Display with Day Slider */}
      {currentWeekData && currentWeekData.days.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                Week {currentWeek + 1} - Day {safCurrentDay + 1} of {currentWeekData.days.length}
              </div>
              <Badge variant="outline" className="text-xs">
                {currentWeekData.days[safCurrentDay]?.day.name} - {currentWeekData.days[safCurrentDay]?.day.date}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Day Navigation Controls */}
            <div className="flex items-center justify-between mb-6">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handlePreviousDay}
                disabled={currentDay === 0}
                className="flex items-center gap-2"
                data-testid="button-previous-day"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous Day
              </Button>
              
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  {currentWeekData.days[safCurrentDay]?.day.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {currentWeekData.days[safCurrentDay]?.day.date}
                </div>
              </div>

              <Button 
                variant="outline" 
                size="sm"
                onClick={handleNextDay}
                disabled={currentDay === maxDayInWeek}
                className="flex items-center gap-2"
                data-testid="button-next-day"
              >
                Next Day
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Day Progress Indicators */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {currentWeekData.days.map((day, dayIndex) => (
                <button
                  key={dayIndex}
                  onClick={() => setCurrentDay(dayIndex)}
                  className={`w-4 h-4 rounded-full transition-all duration-200 flex items-center justify-center text-xs font-bold ${
                    dayIndex === safCurrentDay 
                      ? 'bg-blue-500 text-white scale-110' 
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-600 dark:text-gray-300'
                  }`}
                  title={`${day.day.name} - ${day.day.date}`}
                  data-testid={`indicator-day-${dayIndex}`}
                >
                  {dayIndex + 1}
                </button>
              ))}
            </div>

            {/* Current Day Content */}
            {(() => {
              const currentDayData = currentWeekData.days[safCurrentDay];
              if (!currentDayData) return null;

              return (
                <div className="border rounded-lg p-6 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                  {/* Day Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-full w-12 h-12 flex items-center justify-center text-lg font-bold shadow-lg">
                        {(currentWeek * 7) + safCurrentDay + 1}
                      </div>
                      <div>
                        <h3 className="text-2xl font-semibold">{currentDayData.day.name}</h3>
                        <p className="text-sm text-muted-foreground">{currentDayData.day.date}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-lg px-4 py-2 font-semibold">
                      {currentDayData.total_calories_intake}
                    </Badge>
                  </div>

                  {/* Meals Display */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
                    {currentDayData.meals.map((meal, mealIndex) => (
                      <div key={mealIndex} className="p-4 border-2 border-blue-200 dark:border-blue-800 rounded-lg hover:shadow-lg transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-600 hover:scale-105" data-testid={`meal-${mealIndex}`}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                          <Badge variant="secondary" className="text-xs font-semibold">
                            {meal.calories_intake}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {meal.meal_description.map((item, itemIndex) => (
                            <div key={itemIndex} className="text-sm p-3 rounded-md text-center border border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer">
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Daily Explanation */}
                  {currentDayData.explanation && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
                      <div className="flex items-start gap-3">
                        <Target className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-sm text-blue-700 dark:text-blue-300 mb-1">
                            Daily Focus
                          </h4>
                          <p className="text-sm text-blue-600 dark:text-blue-200">
                            {currentDayData.explanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Overall Plan Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-500" />
            Complete Plan Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {totalWeeks}
              </div>
              <div className="text-sm text-muted-foreground">Weeks Planned</div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {totalDays}
              </div>
              <div className="text-sm text-muted-foreground">Total Days</div>
            </div>
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {totalMeals}
              </div>
              <div className="text-sm text-muted-foreground">Total Meals</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, Utensils, Droplets, Zap, Target, Apple, Pill, NotebookPen } from "lucide-react";

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

export function NutritionPlanDisplay({ plan }: NutritionPlanProps) {
  let nutritionData: StructuredNutritionPlan | null = null;

  console.log("NutritionPlanDisplay received plan:", typeof plan, plan);

  // Try to parse the plan as JSON
  try {
    let parsedData: any = null;
    
    if (typeof plan === 'string') {
      try {
        parsedData = JSON.parse(plan);
      } catch (e) {
        // If string parsing fails, treat as raw text
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
            // If content parsing fails, use raw content
            parsedData = null;
          }
        } else if (typeof parsedData.content === 'object') {
          nutritionData = parsedData.content;
        }
      } else if (parsedData.days) {
        // Direct nutrition plan structure with days array
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

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Apple className="h-5 w-5 text-green-500" />
            7-Day Nutrition Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-lg font-semibold text-green-600 dark:text-green-400">
              {nutritionData.days.length} Days of Culturally-Tailored Meals
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              Designed for athletic performance with traditional foods
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Meal Plans */}
      <div className="space-y-6">
        {nutritionData.days.map((dayPlan, dayIndex) => (
          <Card key={dayIndex} className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                    {dayIndex + 1}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{dayPlan.day.name}</h3>
                    <p className="text-sm text-muted-foreground">{dayPlan.day.date}</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-white dark:bg-gray-800">
                  {dayPlan.total_calories_intake}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Meals Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                {dayPlan.meals.map((meal, mealIndex) => (
                  <div key={mealIndex} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <Badge variant="secondary" className="text-xs">
                        {meal.calories_intake}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {meal.meal_description.map((item, itemIndex) => (
                        <div key={itemIndex} className="text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded text-center">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Daily Explanation */}
              {dayPlan.explanation && (
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Target className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm text-blue-700 dark:text-blue-300 mb-1">
                        Daily Focus
                      </h4>
                      <p className="text-sm text-blue-600 dark:text-blue-200">
                        {dayPlan.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-500" />
            Weekly Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {nutritionData.days.length}
              </div>
              <div className="text-sm text-muted-foreground">Days Planned</div>
            </div>
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {nutritionData.days.reduce((total, day) => total + day.meals.length, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Meals</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                5
              </div>
              <div className="text-sm text-muted-foreground">Meals per Day</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
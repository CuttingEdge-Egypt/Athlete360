import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, Utensils, Droplets, Zap, Target, Apple, Pill, NotebookPen } from "lucide-react";

interface NutritionPlanProps {
  plan: string | any;
}

interface StructuredNutritionPlan {
  dailyCalories: number;
  macronutrients: {
    protein: string;
    carbs: string;
    fats: string;
  };
  mealPlan: {
    breakfast: {
      time: string;
      meal: string;
      calories: number;
    };
    lunch: {
      time: string;
      meal: string;
      calories: number;
    };
    dinner: {
      time: string;
      meal: string;
      calories: number;
    };
    snacks: {
      time: string;
      meal: string;
      calories: number;
    }[];
  };
  preWorkout: {
    timing: string;
    foods: string[];
    hydration: string;
  };
  postWorkout: {
    timing: string;
    foods: string[];
    hydration: string;
  };
  culturalFoods: string[];
  hydrationSchedule: string[];
  recovery: {
    foods: string[];
    timing: string[];
  };
  supplements: string[];
  notes: string;
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
      } else if (parsedData.dailyCalories || parsedData.macronutrients) {
        // Direct nutrition plan structure
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
            <Target className="h-5 w-5 text-blue-500" />
            Daily Nutrition Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {nutritionData.dailyCalories}
              </div>
              <div className="text-sm text-muted-foreground">Daily Calories</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                {nutritionData.macronutrients.protein}
              </div>
              <div className="text-sm text-muted-foreground">Protein</div>
            </div>
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                {nutritionData.macronutrients.carbs}
              </div>
              <div className="text-sm text-muted-foreground">Carbohydrates</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                {nutritionData.macronutrients.fats}
              </div>
              <div className="text-sm text-muted-foreground">Fats</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Meal Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5 text-green-500" />
            Daily Meal Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Breakfast */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <h3 className="font-semibold">Breakfast</h3>
                <Badge variant="secondary">{nutritionData.mealPlan.breakfast.calories} cal</Badge>
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                {nutritionData.mealPlan.breakfast.time}
              </div>
              <div className="text-sm">{nutritionData.mealPlan.breakfast.meal}</div>
            </div>

            {/* Lunch */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <h3 className="font-semibold">Lunch</h3>
                <Badge variant="secondary">{nutritionData.mealPlan.lunch.calories} cal</Badge>
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                {nutritionData.mealPlan.lunch.time}
              </div>
              <div className="text-sm">{nutritionData.mealPlan.lunch.meal}</div>
            </div>

            {/* Dinner */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <h3 className="font-semibold">Dinner</h3>
                <Badge variant="secondary">{nutritionData.mealPlan.dinner.calories} cal</Badge>
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                {nutritionData.mealPlan.dinner.time}
              </div>
              <div className="text-sm">{nutritionData.mealPlan.dinner.meal}</div>
            </div>

            {/* Snacks */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Apple className="h-4 w-4 text-green-500" />
                <h3 className="font-semibold">Snacks</h3>
              </div>
              <div className="space-y-2">
                {nutritionData.mealPlan.snacks.map((snack, index) => (
                  <div key={index}>
                    <div className="text-sm text-muted-foreground">{snack.time}</div>
                    <div className="text-sm">{snack.meal}</div>
                    <Badge variant="outline" className="text-xs">{snack.calories} cal</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workout Nutrition */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-red-500" />
              Pre-Workout Nutrition
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-sm">Timing</h4>
                <p className="text-sm text-muted-foreground">{nutritionData.preWorkout.timing}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm">Foods</h4>
                <div className="flex flex-wrap gap-1 mt-1">
                  {nutritionData.preWorkout.foods.map((food, index) => (
                    <Badge key={index} variant="outline">{food}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-1">
                  <Droplets className="h-3 w-3" />
                  Hydration
                </h4>
                <p className="text-sm text-muted-foreground">{nutritionData.preWorkout.hydration}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-500" />
              Post-Workout Nutrition
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-sm">Timing</h4>
                <p className="text-sm text-muted-foreground">{nutritionData.postWorkout.timing}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm">Foods</h4>
                <div className="flex flex-wrap gap-1 mt-1">
                  {nutritionData.postWorkout.foods.map((food, index) => (
                    <Badge key={index} variant="outline">{food}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-1">
                  <Droplets className="h-3 w-3" />
                  Hydration
                </h4>
                <p className="text-sm text-muted-foreground">{nutritionData.postWorkout.hydration}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cultural Foods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Apple className="h-5 w-5 text-orange-500" />
              Cultural Foods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {nutritionData.culturalFoods.map((food, index) => (
                <Badge key={index} variant="secondary">{food}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Hydration Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-blue-500" />
              Hydration Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {nutritionData.hydrationSchedule.map((schedule, index) => (
                <div key={index} className="text-sm p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                  {schedule}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recovery */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-500" />
              Recovery Nutrition
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-sm">Foods</h4>
                <div className="flex flex-wrap gap-1 mt-1">
                  {nutritionData.recovery.foods.map((food, index) => (
                    <Badge key={index} variant="outline">{food}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm">Timing</h4>
                <div className="space-y-1">
                  {nutritionData.recovery.timing.map((timing, index) => (
                    <div key={index} className="text-sm text-muted-foreground">{timing}</div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Supplements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-green-500" />
              Supplements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {nutritionData.supplements.length > 0 ? (
                nutritionData.supplements.map((supplement, index) => (
                  <Badge key={index} variant="outline">{supplement}</Badge>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No supplements recommended</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {nutritionData.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <NotebookPen className="h-5 w-5 text-gray-500" />
              Additional Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <p className="text-sm">{nutritionData.notes}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
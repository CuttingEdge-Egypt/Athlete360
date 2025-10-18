import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar, Utensils, Target, Apple } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";
import arTranslations from '@/locales/ar/common.json';
import enTranslations from '@/locales/en/common.json';

interface NutritionPlanProps {
  plan: string | any;
  language?: string;
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
  instructions?: string;
  days: NutritionPlanDay[];
}

interface WeekData {
  weekNumber: number;
  days: NutritionPlanDay[];
  startDate: string;
  endDate: string;
}

export function NutritionPlanDisplay({ plan, language }: NutritionPlanProps) {
  const [currentWeek, setCurrentWeek] = useState(0);
  const [currentDay, setCurrentDay] = useState(0);
  const { i18n } = useTranslation('common');
  const { direction, isRTL } = useLanguage();
  
  // Determine display language from prop or plan content
  const detectLanguageFromContent = (content: any): boolean => {
    if (!content) return false;
    const contentStr = JSON.stringify(content);
    const arabicRegex = /[\u0600-\u06FF]/;
    return arabicRegex.test(contentStr);
  };
  
  const displayLanguage = language || (detectLanguageFromContent(plan) ? 'ar' : i18n.language);
  const isArabic = displayLanguage === 'ar';
  
  console.log("NutritionPlanDisplay language detection:", { language, displayLanguage, isArabic, i18nLang: i18n.language });
  
  // Direct translation function using imported translations
  const t = (key: string, fallback: string = '') => {
    const translations = displayLanguage === 'ar' ? arTranslations : enTranslations;
    const keys = key.split('.');
    let value: any = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.log(`Translation key not found: ${key} for language: ${displayLanguage}`);
        return fallback;
      }
    }
    
    console.log(`Translation for ${key}:`, value, 'lang:', displayLanguage);
    return typeof value === 'string' ? value : fallback;
  };
  
  // Function to convert numbers to Arabic numerals
  const toArabicNumerals = (num: number | string): string => {
    if (!isArabic) return String(num);
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(num).replace(/\d/g, (digit) => arabicNumerals[parseInt(digit)]);
  };
  
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
      // Check for error condition first
      if (parsedData.error) {
        return (
          <Card className="w-full max-w-4xl mx-auto bg-card border-border">
            <CardHeader dir={isArabic ? 'rtl' : 'ltr'}>
              <CardTitle className={`flex items-center gap-2 text-foreground ${isArabic ? 'flex-row-reverse' : ''}`}>
                <Apple className="h-5 w-5 text-red-400" />
                {t('analysis.nutrition.error', 'Nutrition Plan Error')}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center py-12" dir={isArabic ? 'rtl' : 'ltr'}>
              <div className="text-red-400 mb-4">
                {parsedData.errorMessage || t('analysis.nutrition.unableToGenerate', 'Unable to generate nutrition plan')}
              </div>
              {parsedData.suggestion && (
                <div className="text-muted-foreground text-sm">
                  {parsedData.suggestion}
                </div>
              )}
            </CardContent>
          </Card>
        );
      }
      
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
        <CardHeader dir={isArabic ? 'rtl' : 'ltr'}>
          <CardTitle className={`flex items-center gap-2 text-foreground ${isArabic ? 'flex-row-reverse' : ''}`}>
            <Utensils className="h-5 w-5" />
            {t('analysis.nutrition.title', 'Nutrition Plan')}
          </CardTitle>
        </CardHeader>
        <CardContent dir={isArabic ? 'rtl' : 'ltr'}>
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
        <CardHeader dir={isArabic ? 'rtl' : 'ltr'}>
          <CardTitle className={`flex items-center gap-2 text-foreground ${isArabic ? 'flex-row-reverse' : ''}`}>
            <Apple className="h-5 w-5 text-green-400" />
            {t('analysis.nutrition.title', 'Nutrition Plan')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <div className="text-muted-foreground">
            {t('analysis.nutrition.noMeals', 'No nutrition plan data available.')}
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
        <CardHeader dir={isArabic ? 'rtl' : 'ltr'}>
          <CardTitle className={`flex items-center justify-between text-foreground ${isArabic ? 'flex-row-reverse' : ''}`}>
            {/* For Arabic: days info on left, title on right. For English: title on left, days info on right */}
            {isArabic ? (
              <>
                <div className="text-left">
                  <Badge variant="secondary" className="bg-green-600 text-white mb-1">
                    {t('analysis.nutrition.week', 'Week')} {toArabicNumerals(currentWeek + 1)} • {t('analysis.nutrition.day', 'Day')} {toArabicNumerals(safCurrentDay + 1)}
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    {currentDayData?.day.name} - {currentDayData?.day.date}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-row-reverse">
                  <Apple className="h-6 w-6 text-green-400" />
                  <div className="text-right">
                    <div className="text-xl font-bold">{t('analysis.nutrition.title', 'Nutrition Plan')}</div>
                    <div className="text-sm text-muted-foreground font-normal">
                      {toArabicNumerals(totalDays)} {t('analysis.nutrition.days', 'Days')} • {toArabicNumerals(totalWeeks)} {t('analysis.nutrition.week', 'Week')}{totalWeeks > 1 ? 's' : ''} • {toArabicNumerals(totalMeals)} {t('analysis.nutrition.meals', 'Meals')}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Apple className="h-6 w-6 text-green-400" />
                  <div>
                    <div className="text-xl font-bold">{t('analysis.nutrition.title', 'Nutrition Plan')}</div>
                    <div className="text-sm text-muted-foreground font-normal">
                      {toArabicNumerals(totalDays)} {t('analysis.nutrition.days', 'Days')} • {toArabicNumerals(totalWeeks)} {t('analysis.nutrition.week', 'Week')}{totalWeeks > 1 ? 's' : ''} • {toArabicNumerals(totalMeals)} {t('analysis.nutrition.meals', 'Meals')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className="bg-green-600 text-white mb-1">
                    {t('analysis.nutrition.week', 'Week')} {toArabicNumerals(currentWeek + 1)} • {t('analysis.nutrition.day', 'Day')} {toArabicNumerals(safCurrentDay + 1)}
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    {currentDayData?.day.name} - {currentDayData?.day.date}
                  </div>
                </div>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
        </CardContent>
      </Card>

      {/* Current Day Display */}
      {currentDayData && (
        <Card className="bg-card border-border">
          <CardHeader>
            {/* Week Slider - Inline above day/date */}
            <div className="mb-4 text-center" dir={isArabic ? 'rtl' : 'ltr'}>
              <div className="text-sm text-muted-foreground mb-3">{t('analysis.nutrition.selectWeek', 'Select Week')}</div>
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleWeekChange(currentWeek - 1)}
                  disabled={currentWeek === 0}
                  className="bg-blue-600 border-blue-500 text-white hover:bg-blue-500 disabled:bg-blue-800 disabled:border-blue-700"
                  data-testid="button-week-previous"
                >
                  {isArabic ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
                
                <div className="flex gap-2">
                  {weeks.map((week, weekIndex) => (
                    <button
                      key={weekIndex}
                      onClick={() => handleWeekChange(weekIndex)}
                      className={`w-10 h-10 rounded-lg transition-all duration-200 flex items-center justify-center font-bold border-2 ${
                        weekIndex === currentWeek
                          ? 'bg-green-500 text-white border-green-400 scale-110 shadow-lg'
                          : 'bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600'
                      }`}
                      title={`Week ${weekIndex + 1}`}
                      data-testid={`week-${weekIndex}`}
                    >
                      {toArabicNumerals(weekIndex + 1)}
                    </button>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleWeekChange(currentWeek + 1)}
                  disabled={currentWeek === totalWeeks - 1}
                  className="bg-orange-600 border-orange-500 text-white hover:bg-orange-500 disabled:bg-orange-800 disabled:border-orange-700"
                  data-testid="button-week-next"
                >
                  {isArabic ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <CardTitle className={`flex items-center justify-between text-foreground ${isArabic ? 'flex-row-reverse' : ''}`} dir={isArabic ? 'rtl' : 'ltr'}>
              <div className={`flex items-center gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                <div className="bg-green-500 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold">
                  {toArabicNumerals((currentWeek * 7) + safCurrentDay + 1)}
                </div>
                <div className={isArabic ? 'text-right' : ''}>
                  <h3 className="text-2xl font-bold">{currentDayData.day.name}</h3>
                  <p className="text-muted-foreground">{currentDayData.day.date}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-lg px-4 py-2 bg-green-600 text-white border-green-500">
                {currentDayData.total_calories_intake}
              </Badge>
            </CardTitle>
            
            {/* Day Slider */}
            <div className="mt-4 pt-4 border-t border-border" dir={isArabic ? 'rtl' : 'ltr'}>
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-3">
                  {isArabic 
                    ? `اختر اليوم في الأسبوع ${toArabicNumerals(currentWeek + 1)}`
                    : t('analysis.nutrition.selectDayInWeek', `Select Day in Week ${currentWeek + 1}`).replace('{{weekNumber}}', String(currentWeek + 1))
                  }
                </div>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDayChange(safCurrentDay - 1)}
                    disabled={safCurrentDay === 0}
                    className="bg-blue-600 border-blue-500 text-white hover:bg-blue-500 disabled:bg-blue-800 disabled:border-blue-700"
                    data-testid="button-day-previous"
                  >
                    {isArabic ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                  </Button>
                  
                  <div className="flex gap-2">
                    {currentWeekData.days.map((day, dayIndex) => (
                      <button
                        key={dayIndex}
                        onClick={() => handleDayChange(dayIndex)}
                        className={`w-10 h-10 rounded-lg transition-all duration-200 flex items-center justify-center font-bold border-2 ${
                          dayIndex === safCurrentDay
                            ? 'bg-green-500 text-white border-green-400 scale-110 shadow-lg'
                            : 'bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600'
                        }`}
                        title={`${day.day.name}`}
                        data-testid={`day-${dayIndex}`}
                      >
                        {toArabicNumerals(dayIndex + 1)}
                      </button>
                    ))}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDayChange(safCurrentDay + 1)}
                    disabled={safCurrentDay === maxDayInWeek}
                    className="bg-orange-600 border-orange-500 text-white hover:bg-orange-500 disabled:bg-orange-800 disabled:border-orange-700"
                    data-testid="button-day-next"
                  >
                    {isArabic ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent dir={isArabic ? 'rtl' : 'ltr'}>
            {/* Enhanced Meals Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              {currentDayData.meals.map((meal, mealIndex) => (
                <div 
                  key={mealIndex} 
                  className="bg-gradient-to-br from-slate-700 to-slate-600 border border-slate-500 rounded-xl p-4 hover:shadow-xl transition-all duration-300 hover:border-green-400"
                >
                  {/* Meal Header */}
                  <div className={`mb-3 ${isArabic ? 'text-right' : 'text-left'}`}>
                    <div className={`flex items-center gap-2 mb-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse flex-shrink-0"></div>
                      <span className="text-xs text-gray-300 font-semibold uppercase">
                        {t('analysis.nutrition.meal', 'MEAL')} {toArabicNumerals(mealIndex + 1)}
                      </span>
                    </div>
                    <div className="inline-flex items-center bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full px-3 py-1 text-sm font-bold">
                      {isArabic ? meal.calories_intake.replace(/\d+/g, match => toArabicNumerals(match)) : meal.calories_intake}
                    </div>
                  </div>
                  
                  {/* Meal Items */}
                  <div className="space-y-2">
                    {meal.meal_description.map((item, itemIndex) => (
                      <div 
                        key={itemIndex} 
                        className={`bg-slate-800/50 text-slate-100 p-2.5 rounded-lg border border-slate-600 ${
                          isArabic ? 'text-right text-base' : 'text-left text-sm'
                        }`}
                        dir={isArabic ? 'rtl' : 'ltr'}
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
              <div className={`p-6 bg-gradient-to-r from-blue-900/30 to-blue-800/20 rounded-xl border-blue-400 ${isArabic ? 'border-r-4' : 'border-l-4'}`} dir={isArabic ? 'rtl' : 'ltr'}>
                <div className={`flex items-start gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                  <Target className="h-6 w-6 text-blue-400 mt-1 flex-shrink-0" />
                  <div className={isArabic ? 'text-right' : ''}>
                    <h4 className="font-bold text-lg text-blue-300 mb-2">
                      {t('analysis.nutrition.dailyFocus', 'Daily Focus')}
                    </h4>
                    <p className={`text-slate-200 leading-relaxed ${isArabic ? 'text-base' : ''}`}>
                      {currentDayData.explanation}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Personalized Instructions - Moved after Daily Focus */}
            {nutritionData.instructions && (
              <div className={`mt-6 p-6 bg-gradient-to-r from-purple-900/30 to-purple-800/20 rounded-xl border-purple-400 ${isArabic ? 'border-r-4' : 'border-l-4'}`} dir={isArabic ? 'rtl' : 'ltr'}>
                <div className={`flex items-start gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                  <Target className="h-6 w-6 text-purple-400 mt-1 flex-shrink-0" />
                  <div className={isArabic ? 'text-right' : ''}>
                    <h4 className="font-bold text-lg text-purple-300 mb-2">
                      {t('analysis.nutrition.personalizedInstructions', 'Personalized Instructions')}
                    </h4>
                    <div className={`text-slate-200 leading-relaxed whitespace-pre-wrap ${isArabic ? 'text-base' : ''}`}>
                      {nutritionData.instructions}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Overall Plan Summary */}
      <Card className="bg-card border-border">
        <CardHeader dir={isArabic ? 'rtl' : 'ltr'}>
          <CardTitle className={`flex items-center gap-2 text-foreground ${isArabic ? 'flex-row-reverse' : ''}`}>
            <Target className="h-5 w-5 text-purple-400" />
            {t('analysis.nutrition.planOverview', 'Plan Overview')}
          </CardTitle>
        </CardHeader>
        <CardContent dir={isArabic ? 'rtl' : 'ltr'}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={`p-6 bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-xl border border-purple-700 ${isArabic ? 'text-right' : 'text-center'}`}>
              <div className="text-3xl font-bold text-purple-400 mb-1">
                {toArabicNumerals(totalWeeks)}
              </div>
              <div className="text-sm text-muted-foreground">{t('analysis.nutrition.weeksPlanned', 'Weeks Planned')}</div>
            </div>
            <div className={`p-6 bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-xl border border-blue-700 ${isArabic ? 'text-right' : 'text-center'}`}>
              <div className="text-3xl font-bold text-blue-400 mb-1">
                {toArabicNumerals(totalDays)}
              </div>
              <div className="text-sm text-muted-foreground">{t('analysis.nutrition.totalDays', 'Total Days')}</div>
            </div>
            <div className={`p-6 bg-gradient-to-br from-orange-900/30 to-orange-800/20 rounded-xl border border-orange-700 ${isArabic ? 'text-right' : 'text-center'}`}>
              <div className="text-3xl font-bold text-orange-400 mb-1">
                {toArabicNumerals(totalMeals)}
              </div>
              <div className="text-sm text-muted-foreground">{t('analysis.nutrition.totalMeals', 'Total Meals')}</div>
            </div>
            <div className={`p-6 bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-xl border border-green-700 ${isArabic ? 'text-right' : 'text-center'}`}>
              <div className="text-3xl font-bold text-green-400 mb-1">
                {toArabicNumerals(avgCaloriesPerDay)}
              </div>
              <div className="text-sm text-muted-foreground">{t('analysis.nutrition.avgCaloriesPerDay', 'Avg Calories/Day')}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
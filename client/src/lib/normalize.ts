// Normalization functions for analysis data to fit UI component interfaces

// Development Plan Interfaces (matching DevelopmentPlanDisplay)
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

// Nutrition Plan Interfaces (matching NutritionPlanDisplay)
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

// Comparison Interfaces
interface ComparisonViewModel {
  tabs: {
    overview?: string;
    strengths?: string;
    weaknesses?: string;
    headToHead?: string;
  };
  athleteNames?: string[];
  summary?: string;
}

// Helper function to safely parse JSON
function safeJsonParse(input: any): any {
  if (typeof input === 'string') {
    try {
      return JSON.parse(input);
    } catch {
      return null;
    }
  }
  return input;
}

// Helper to extract content from nested structures
function extractContent(data: any): any {
  if (!data) return null;
  
  // Handle nested content structures
  if (data.content) {
    const content = safeJsonParse(data.content);
    return content || data.content;
  }
  
  // Handle plan/data wrappers
  if (data.plan) return data.plan;
  if (data.data) return data.data;
  
  return data;
}

// Helper to generate unique IDs
function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Helper to extract numeric value from string
function extractCalories(text: string): string {
  if (!text) return "0";
  const match = text.match(/(\d+)/);
  return match ? match[1] : "0";
}

// Helper to format athlete analysis for comparison
function formatAthleteAnalysis(athlete1: any, athlete2: any, type: 'strengths' | 'weaknesses'): string {
  if (!athlete1 || !athlete2) return '';
  
  const sections = [];
  
  if (athlete1[type] && Array.isArray(athlete1[type])) {
    sections.push(`**${athlete1.name || 'Athlete 1'} ${type}:**`);
    athlete1[type].forEach((item: any, index: number) => {
      if (typeof item === 'object') {
        sections.push(`${index + 1}. ${item.skill || item.title || item.name || 'Item'}: ${item.description || item.details || ''}`);
      } else if (typeof item === 'string') {
        sections.push(`${index + 1}. ${item}`);
      }
    });
    sections.push('');
  }
  
  if (athlete2[type] && Array.isArray(athlete2[type])) {
    sections.push(`**${athlete2.name || 'Athlete 2'} ${type}:**`);
    athlete2[type].forEach((item: any, index: number) => {
      if (typeof item === 'object') {
        sections.push(`${index + 1}. ${item.skill || item.title || item.name || 'Item'}: ${item.description || item.details || ''}`);
      } else if (typeof item === 'string') {
        sections.push(`${index + 1}. ${item}`);
      }
    });
  }
  
  return sections.join('\n');
}

// Helper to format head-to-head comparison
function formatHeadToHead(athlete1: any, athlete2: any): string {
  if (!athlete1 || !athlete2) return '';
  
  const sections = [
    `**Direct Comparison: ${athlete1.name || 'Athlete 1'} vs ${athlete2.name || 'Athlete 2'}**`,
    '',
    `**Current Form:**`,
    `• ${athlete1.name || 'Athlete 1'}: ${athlete1.currentForm || 'No data available'}`,
    `• ${athlete2.name || 'Athlete 2'}: ${athlete2.currentForm || 'No data available'}`,
    ''
  ];
  
  if (athlete1.ranking && athlete2.ranking) {
    sections.push(`**Rankings:**`);
    sections.push(`• ${athlete1.name || 'Athlete 1'}: ${athlete1.ranking}`);
    sections.push(`• ${athlete2.name || 'Athlete 2'}: ${athlete2.ranking}`);
    sections.push('');
  }
  
  return sections.join('\n');
}

// Helper to format strengths data from comparison analysis
function formatStrengthsData(strengthsData: any, detailedAnalysis?: any): string {
  if (!strengthsData) return 'Strengths analysis not available';
  
  let formatted = '';
  
  // Get athlete names from detailedAnalysis if available
  const name1 = detailedAnalysis?.athlete1?.name || 'Athlete 1';
  const name2 = detailedAnalysis?.athlete2?.name || 'Athlete 2';
  
  if (strengthsData.athlete1 && Array.isArray(strengthsData.athlete1)) {
    formatted += `**${name1} Strengths:**\n\n`;
    
    strengthsData.athlete1.forEach((strength: any, index: number) => {
      formatted += `${index + 1}. **${strength.title || 'Strength'}** ${strength.rating ? `(${strength.rating}/100)` : ''}\n`;
      if (strength.description) {
        formatted += `   ${strength.description}\n`;
      }
      if (strength.evidence) {
        formatted += `   *Evidence:* ${strength.evidence}\n`;
      }
      formatted += '\n';
    });
  }
  
  if (strengthsData.athlete2 && Array.isArray(strengthsData.athlete2)) {
    formatted += `**${name2} Strengths:**\n\n`;
    
    strengthsData.athlete2.forEach((strength: any, index: number) => {
      formatted += `${index + 1}. **${strength.title || 'Strength'}** ${strength.rating ? `(${strength.rating}/100)` : ''}\n`;
      if (strength.description) {
        formatted += `   ${strength.description}\n`;
      }
      if (strength.evidence) {
        formatted += `   *Evidence:* ${strength.evidence}\n`;
      }
      formatted += '\n';
    });
  }
  
  return formatted.trim();
}

/**
 * Normalize development plan data to GoalBasedPlan format
 */
export function normalizeDevelopmentPlan(raw: any): GoalBasedPlan | null {
  try {
    const parsed = safeJsonParse(raw);
    const content = extractContent(parsed);
    
    
    if (!content) return null;
    
    // Extract title
    let title = { en: "Development Plan" };
    if (content.title) {
      if (typeof content.title === 'string') {
        title = { en: content.title };
      } else if (content.title.en) {
        title = content.title;
      }
    } else if (content.name) {
      title = { en: content.name };
    }
    
    // Extract goal analysis - handle weekly structure
    let goalAnalysis: GoalArea[] = [];
    
    // Try different possible structures
    const goals = content.goalAnalysis || content.goals || content.goal_analysis || 
                 content.areas || content.sections || content.phases || content.plan;
    
    if (Array.isArray(goals)) {
      goalAnalysis = goals.map((goal: any, index: number) => {
        // Handle goal-based structure
        const area = goal.area || goal.name || goal.title || `Goal ${index + 1}`;
        const description = goal.description || goal.overview || goal.summary || "";
        
        let exercises: Exercise[] = [];
        const exerciseData = goal.exercises || goal.activities || goal.tasks || [];
        
        if (Array.isArray(exerciseData)) {
          exercises = exerciseData.map((ex: any, exIndex: number) => ({
            id: ex.id || generateId(),
            name: ex.name || ex.title || `Exercise ${exIndex + 1}`,
            description: ex.description || ex.details || (typeof ex === 'string' ? ex : ''),
            targetArea: ex.targetArea || ex.target || area,
            tags: ex.tags || [],
            prescription: ex.prescription || (ex.sets || ex.reps ? {
              sets: ex.sets,
              reps: ex.reps,
              restSec: ex.rest || ex.restSec,
              intensity: ex.intensity
            } : undefined),
            equipment: ex.equipment || [],
            videoUrl: ex.videoUrl || ex.video,
            videoId: ex.videoId
          }));
        }
        
        return {
          area,
          description,
          exercises
        };
      });
    } else if (typeof goals === 'string') {
      // If it's just text, create a single goal area
      goalAnalysis = [{
        area: "Training Focus",
        description: goals,
        exercises: []
      }];
    }
    
    // Calculate counts
    const totalExercises = goalAnalysis.reduce((acc, goal) => acc + goal.exercises.length, 0);
    const totalVideos = goalAnalysis.reduce((acc, goal) => 
      acc + goal.exercises.filter(ex => ex.videoUrl).length, 0);
    
    const counts = {
      goals: goalAnalysis.length,
      exercises: totalExercises,
      videos: totalVideos
    };
    
    return {
      version: content.version || "1.0",
      id: content.id || generateId(),
      title,
      overview: content.overview || content.summary,
      goalAnalysis,
      counts,
      intro: content.intro || {
        overview: content.overview || "Personalized development plan",
        structure: `${goalAnalysis.length} focus areas with ${totalExercises} exercises`
      }
    };
  } catch (error) {
    console.error('Failed to normalize development plan:', error);
    return null;
  }
}

/**
 * Normalize nutrition plan data to StructuredNutritionPlan format
 */
export function normalizeNutritionPlan(raw: any): StructuredNutritionPlan | null {
  try {
    const parsed = safeJsonParse(raw);
    const content = extractContent(parsed);
    
    if (!content) return null;
    
    let days: NutritionPlanDay[] = [];
    
    // Handle different possible structures
    if (content.days && Array.isArray(content.days)) {
      days = content.days;
    } else if (content.weeks && Array.isArray(content.weeks)) {
      // Flatten weekly structure
      days = content.weeks.reduce((acc: any[], week: any) => {
        if (week.days && Array.isArray(week.days)) {
          return acc.concat(week.days);
        }
        return acc;
      }, []);
    } else if (content.meals && Array.isArray(content.meals)) {
      // Convert simple meal structure to days format
      const mealGroups = content.meals.reduce((acc: any, meal: any) => {
        const dayName = meal.day || "Day 1";
        if (!acc[dayName]) acc[dayName] = [];
        acc[dayName].push(meal);
        return acc;
      }, {});
      
      days = Object.entries(mealGroups).map(([dayName, meals]: [string, any], index) => ({
        day: {
          date: new Date(Date.now() + index * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          name: dayName
        },
        meals: Array.isArray(meals) ? meals.map((meal: any) => ({
          calories_intake: extractCalories(meal.calories?.toString() || "0"),
          meal_description: Array.isArray(meal.foods) ? meal.foods : 
                          typeof meal.description === 'string' ? [meal.description] :
                          [meal.meal || "Meal"]
        })) : [],
        explanation: `Nutrition plan for ${dayName}`,
        total_calories_intake: meals.reduce((acc: number, meal: any) => 
          acc + parseInt(extractCalories(meal.calories?.toString() || "0")), 0).toString()
      }));
    }
    
    // Ensure we have at least one day
    if (days.length === 0) {
      days = [{
        day: {
          date: new Date().toISOString().split('T')[0],
          name: "Sample Day"
        },
        meals: [{
          calories_intake: "500",
          meal_description: ["Balanced nutrition plan"]
        }],
        explanation: "Personalized nutrition guidance",
        total_calories_intake: "2000"
      }];
    }
    
    // Validate and fix day structures
    days = days.map((day: any, index: number) => ({
      day: {
        date: day.day?.date || new Date(Date.now() + index * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        name: day.day?.name || `Day ${index + 1}`
      },
      meals: Array.isArray(day.meals) ? day.meals.map((meal: any) => ({
        calories_intake: extractCalories(meal.calories_intake || meal.calories || "0"),
        meal_description: Array.isArray(meal.meal_description) ? meal.meal_description :
                         typeof meal.meal_description === 'string' ? [meal.meal_description] :
                         typeof meal.description === 'string' ? [meal.description] :
                         Array.isArray(meal.foods) ? meal.foods :
                         ["Meal item"]
      })) : [],
      explanation: day.explanation || day.notes || "Nutrition guidance",
      total_calories_intake: day.total_calories_intake || 
                            day.totalCalories?.toString() || 
                            extractCalories(day.calories?.toString() || "2000")
    }));
    
    return {
      instructions: content.instructions || content.notes || "Follow the daily nutrition plan",
      days
    };
  } catch (error) {
    console.error('Failed to normalize nutrition plan:', error);
    return null;
  }
}

/**
 * Normalize comparison data to ComparisonViewModel format
 */
export function normalizeComparison(raw: any): ComparisonViewModel | null {
  try {
    const parsed = safeJsonParse(raw);
    const content = extractContent(parsed);
    
    
    if (!content) return null;
    
    let tabs: any = {};
    
    // Handle existing tabs structure
    if (content.tabs && typeof content.tabs === 'object') {
      const tabKeys = Object.keys(content.tabs);
      let detailedAnalysis: any = null;
      let overallAnalysis: any = null;
      let strengthsData: any = null;
      
      // Process each tab individually
      for (const key of tabKeys) {
        const tab = content.tabs[key];
        if (tab) {
          try {
            let parsedResponse: any;
            
            // Handle different rawResponse formats
            if (tab.rawResponse && typeof tab.rawResponse === 'string' && tab.rawResponse.trim().length > 0) {
              // It's a JSON string, parse it
              try {
                parsedResponse = JSON.parse(tab.rawResponse);
              } catch (parseError) {
                console.error(`JSON parse error for ${key}:`, parseError, tab.rawResponse.substring(0, 200));
                continue;
              }
            } else if (tab.rawResponse && typeof tab.rawResponse === 'object' && Object.keys(tab.rawResponse).length > 0) {
              // It's already parsed JSON object
              parsedResponse = tab.rawResponse;
            } else {
              // Skip empty, null, or invalid tabs
              console.log(`Skipping ${key} tab - no valid rawResponse data`);
              continue;
            }
            
            // Extract data based on tab content and key
            if (key === 'details' && parsedResponse.detailedAnalysis) {
              detailedAnalysis = parsedResponse.detailedAnalysis;
            } else if (key === 'overview' && (parsedResponse.overallAnalysis || parsedResponse.athlete1)) {
              overallAnalysis = parsedResponse;
            } else if (key === 'strengths' && parsedResponse.strengths) {
              strengthsData = parsedResponse.strengths;
            }
            
            // Debug log what we found
            console.log(`Tab ${key} processed:`, {
              hasDetailedAnalysis: !!parsedResponse.detailedAnalysis,
              hasOverallAnalysis: !!parsedResponse.overallAnalysis,
              hasStrengths: !!parsedResponse.strengths,
              hasAthlete1: !!parsedResponse.athlete1
            });
          } catch (e) {
            console.error(`Failed to process tab ${key}:`, e);
          }
        }
      }
      
      // Build tabs from extracted data
      if (detailedAnalysis || overallAnalysis || strengthsData) {
        tabs = {
          overview: overallAnalysis?.overallAnalysis?.summary || 
                   (detailedAnalysis ? `Comparison between ${detailedAnalysis.athlete1?.name || 'Athlete 1'} and ${detailedAnalysis.athlete2?.name || 'Athlete 2'}` : 
                    'Athlete comparison analysis'),
          strengths: strengthsData ? formatStrengthsData(strengthsData, detailedAnalysis) : 
                     (detailedAnalysis ? formatAthleteAnalysis(detailedAnalysis.athlete1, detailedAnalysis.athlete2, 'strengths') : 
                      'Strength analysis not available'),
          weaknesses: detailedAnalysis ? formatAthleteAnalysis(detailedAnalysis.athlete1, detailedAnalysis.athlete2, 'weaknesses') : 
                      'Weakness analysis not available',
          headToHead: detailedAnalysis ? formatHeadToHead(detailedAnalysis.athlete1, detailedAnalysis.athlete2) :
                      (overallAnalysis?.headToHeadComparison || 'Head-to-head analysis not available')
        };
      } else {
        // Use tabs directly as fallback
        tabs = content.tabs;
      }
    } else {
      // Build tabs from various possible keys
      tabs = {
        overview: content.overview || content.summary || content.comparison || 
                 content.introduction || content.analysis,
        strengths: content.strengths || content.advantages || content.positives,
        weaknesses: content.weaknesses || content.disadvantages || content.negatives ||
                   content.areas_for_improvement,
        headToHead: content.headToHead || content.head_to_head || content.versus ||
                   content.direct_comparison || content.matchup
      };
    }
    
    // Convert objects to strings if needed and apply markdown formatting
    Object.keys(tabs).forEach(key => {
      if (tabs[key] && typeof tabs[key] === 'object') {
        tabs[key] = JSON.stringify(tabs[key], null, 2);
      }
      // Convert markdown-style asterisks to HTML bold tags
      if (typeof tabs[key] === 'string') {
        tabs[key] = tabs[key].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      }
    });
    
    // Extract athlete names
    let athleteNames: string[] = [];
    if (content.athletes && Array.isArray(content.athletes)) {
      athleteNames = content.athletes.map((athlete: any) => 
        typeof athlete === 'string' ? athlete : athlete.name || 'Athlete');
    } else if (content.athlete1 && content.athlete2) {
      athleteNames = [content.athlete1, content.athlete2];
    }
    
    return {
      tabs,
      athleteNames,
      summary: content.summary || content.conclusion
    };
  } catch (error) {
    console.error('Failed to normalize comparison data:', error);
    return null;
  }
}
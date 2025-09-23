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

// Helper to format comprehensive head-to-head comparison
function formatHeadToHead(athlete1: any, athlete2: any): string {
  if (!athlete1 || !athlete2) return '';
  
  const sections = [
    `**Head-to-Head Analysis: ${athlete1.name || 'Athlete 1'} vs ${athlete2.name || 'Athlete 2'}**`,
    ''
  ];
  
  // Current Form Analysis
  if (athlete1.currentForm || athlete2.currentForm) {
    sections.push(`**Current Form Analysis:**`);
    sections.push(`• **${athlete1.name || 'Athlete 1'}:** ${athlete1.currentForm || 'Form data not available'}`);
    sections.push(`• **${athlete2.name || 'Athlete 2'}:** ${athlete2.currentForm || 'Form data not available'}`);
    sections.push('');
  }
  
  // Physical Matchup
  if (athlete1.physicalAttributes && athlete2.physicalAttributes) {
    sections.push(`**Physical Matchup:**`);
    
    if (athlete1.physicalAttributes.height && athlete2.physicalAttributes.height) {
      sections.push(`• **Height:** ${athlete1.name} (${athlete1.physicalAttributes.height}) vs ${athlete2.name} (${athlete2.physicalAttributes.height})`);
    }
    
    if (athlete1.physicalAttributes.weight && athlete2.physicalAttributes.weight) {
      sections.push(`• **Weight Class:** ${athlete1.name} (${athlete1.physicalAttributes.weight}) vs ${athlete2.name} (${athlete2.physicalAttributes.weight})`);
    }
    
    if (athlete1.physicalAttributes.stance && athlete2.physicalAttributes.stance) {
      sections.push(`• **Fighting Stance:** ${athlete1.name} (${athlete1.physicalAttributes.stance}) vs ${athlete2.name} (${athlete2.physicalAttributes.stance})`);
    }
    sections.push('');
  }
  
  // Technical Skills Comparison
  if (athlete1.technicalSkills && athlete2.technicalSkills) {
    sections.push(`**Technical Skills Showdown:**`);
    
    // Get top skills for each athlete
    const topSkills1 = athlete1.technicalSkills.slice(0, 2);
    const topSkills2 = athlete2.technicalSkills.slice(0, 2);
    
    sections.push(`**${athlete1.name} Key Strengths:**`);
    topSkills1.forEach((skill: any, index: number) => {
      sections.push(`${index + 1}. ${skill.skill} (${skill.proficiency || 'N/A'}%) - ${skill.description?.substring(0, 100)}...`);
    });
    sections.push('');
    
    sections.push(`**${athlete2.name} Key Strengths:**`);
    topSkills2.forEach((skill: any, index: number) => {
      sections.push(`${index + 1}. ${skill.skill} (${skill.proficiency || 'N/A'}%) - ${skill.description?.substring(0, 100)}...`);
    });
    sections.push('');
  }
  
  // Performance Records
  if (athlete1.recentPerformance && athlete2.recentPerformance) {
    sections.push(`**Competition Records:**`);
    
    if (athlete1.recentPerformance.wins && athlete1.recentPerformance.losses) {
      const winRate1 = ((parseInt(athlete1.recentPerformance.wins) / (parseInt(athlete1.recentPerformance.wins) + parseInt(athlete1.recentPerformance.losses))) * 100).toFixed(1);
      sections.push(`• **${athlete1.name}:** ${athlete1.recentPerformance.wins}W-${athlete1.recentPerformance.losses}L (${winRate1}% win rate)`);
    }
    
    if (athlete2.recentPerformance.wins && athlete2.recentPerformance.losses) {
      const winRate2 = ((parseInt(athlete2.recentPerformance.wins) / (parseInt(athlete2.recentPerformance.wins) + parseInt(athlete2.recentPerformance.losses))) * 100).toFixed(1);
      sections.push(`• **${athlete2.name}:** ${athlete2.recentPerformance.wins}W-${athlete2.recentPerformance.losses}L (${winRate2}% win rate)`);
    }
    
    if (athlete1.recentPerformance.lastCompetition && athlete2.recentPerformance.lastCompetition) {
      sections.push(`• **Recent Major Results:** ${athlete1.name} (${athlete1.recentPerformance.lastCompetition}) vs ${athlete2.name} (${athlete2.recentPerformance.lastCompetition})`);
    }
    sections.push('');
  }
  
  // Strategic Analysis
  sections.push(`**Strategic Matchup Preview:**`);
  sections.push(`This head-to-head comparison reveals key tactical considerations for both athletes. The technical skill differential, physical attributes, and recent form all contribute to the potential outcome of a direct confrontation between these elite competitors.`);
  
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
 * Robust JSON parser with multiple fallback strategies for corrupted data
 */
function parseCorruptedJson(jsonString: string, context: string): any | null {
  if (!jsonString || typeof jsonString !== 'string') return null;
  
  // First, try normal JSON parsing
  try {
    return JSON.parse(jsonString);
  } catch (e: any) {
    console.warn(`First parse attempt failed for ${context}:`, e.message);
  }
  
  // Try to clean up common JSON corruption issues
  try {
    let cleaned = jsonString
      .replace(/\n/g, '\\n')           // Escape newlines
      .replace(/\r/g, '\\r')           // Escape carriage returns
      .replace(/\t/g, '\\t')           // Escape tabs
      .replace(/[\x00-\x1F]/g, '')     // Remove control characters
      .replace(/([^\\])"/g, '$1\\"')   // Escape unescaped quotes
      .replace(/,(\s*[}\]])/g, '$1');  // Remove trailing commas
      
    return JSON.parse(cleaned);
  } catch (e: any) {
    console.warn(`Cleanup parsing failed for ${context}:`, e.message);
  }
  
  // Try regex extraction for key data
  try {
    const strengthsMatch = jsonString.match(/"strengths":\s*{[^}]+}/);
    if (strengthsMatch) {
      return JSON.parse(`{${strengthsMatch[0]}}`);
    }
  } catch (e: any) {
    console.warn(`Regex extraction failed for ${context}:`, e.message);
  }
  
  console.error(`All parsing attempts failed for ${context}. Using fallback data.`);
  return null;
}

/**
 * Normalize comparison data to ComparisonViewModel format
 */
export function normalizeComparison(raw: any): ComparisonViewModel | null {
  try {
    const parsed = safeJsonParse(raw);
    const content = extractContent(parsed);
    
    if (!content) return null;
    
    let detailedAnalysis: any = null;
    let overallAnalysis: any = null;
    let strengthsData: any = null;
    let athleteNames: string[] = [];
    
    // Extract data from tabs structure
    if (content.tabs && typeof content.tabs === 'object') {
      const tabKeys = Object.keys(content.tabs);
      
      for (const key of tabKeys) {
        const tab = content.tabs[key];
        if (!tab?.rawResponse) continue;
        
        let parsedResponse: any = null;
        
        // Parse rawResponse with robust handling
        if (typeof tab.rawResponse === 'string') {
          parsedResponse = parseCorruptedJson(tab.rawResponse, key);
        } else if (typeof tab.rawResponse === 'object') {
          parsedResponse = tab.rawResponse;
        }
        
        if (!parsedResponse) continue;
        
        // Extract data based on tab type
        switch (key) {
          case 'details':
            if (parsedResponse.detailedAnalysis) {
              detailedAnalysis = parsedResponse.detailedAnalysis;
            }
            break;
          case 'overview':
            if (parsedResponse.overallAnalysis || parsedResponse.athlete1) {
              overallAnalysis = parsedResponse;
              // Extract athlete names from overview
              if (parsedResponse.athlete1?.name && parsedResponse.athlete2?.name) {
                athleteNames = [parsedResponse.athlete1.name, parsedResponse.athlete2.name];
              }
            }
            break;
          case 'strengths':
            if (parsedResponse.strengths) {
              strengthsData = parsedResponse.strengths;
            }
            break;
        }
      }
    }
    
    // Extract athlete names from detailed analysis if not found in overview
    if (athleteNames.length === 0 && detailedAnalysis) {
      if (detailedAnalysis.athlete1?.name && detailedAnalysis.athlete2?.name) {
        athleteNames = [detailedAnalysis.athlete1.name, detailedAnalysis.athlete2.name];
      }
    }
    
    // Build comprehensive tabs with all sections
    const tabs: any = {};
    
    // Overview section with ranking and prediction
    if (overallAnalysis) {
      let overviewContent = '';
      
      if (overallAnalysis.overallAnalysis?.summary) {
        overviewContent += `**Overall Analysis:**\n${overallAnalysis.overallAnalysis.summary}\n\n`;
      }
      
      if (overallAnalysis.overallAnalysis?.betterAthlete && overallAnalysis.overallAnalysis?.reasonsWhy) {
        const winner = overallAnalysis.overallAnalysis.betterAthlete === 'athlete1' ? athleteNames[0] : athleteNames[1];
        overviewContent += `**Predicted Winner:** ${winner || 'Athlete 1'}\n\n`;
        overviewContent += `**Key Reasons:**\n`;
        overallAnalysis.overallAnalysis.reasonsWhy.forEach((reason: string, index: number) => {
          overviewContent += `${index + 1}. ${reason}\n`;
        });
        overviewContent += '\n';
      }
      
      if (overallAnalysis.athlete1?.rank && overallAnalysis.athlete2?.rank) {
        overviewContent += `**Current Rankings:**\n`;
        overviewContent += `• ${athleteNames[0] || 'Athlete 1'}: ${overallAnalysis.athlete1.rank}\n`;
        overviewContent += `• ${athleteNames[1] || 'Athlete 2'}: ${overallAnalysis.athlete2.rank}\n\n`;
      }
      
      tabs.overview = overviewContent;
    }
    
    // Strengths section - always try to extract from detailed analysis
    if (detailedAnalysis) {
      let strengthsContent = '';
      
      // Extract from athlete physical attributes strengths first
      [detailedAnalysis.athlete1, detailedAnalysis.athlete2].forEach((athlete, index) => {
        if (!athlete) return;
        
        const name = athlete.name || `Athlete ${index + 1}`;
        strengthsContent += `**${name} Strengths:**\n\n`;
        
        if (athlete.physicalAttributes?.strengths && Array.isArray(athlete.physicalAttributes.strengths)) {
          athlete.physicalAttributes.strengths.forEach((strength: string, strengthIndex: number) => {
            strengthsContent += `${strengthIndex + 1}. ${strength}\n`;
          });
          strengthsContent += '\n';
        }
        
        // Also include technical skills as strengths
        if (athlete.technicalSkills && Array.isArray(athlete.technicalSkills)) {
          strengthsContent += `**Technical Strengths:**\n`;
          athlete.technicalSkills.forEach((skill: any, skillIndex: number) => {
            strengthsContent += `${skillIndex + 1}. **${skill.skill}** (${skill.proficiency || 'N/A'}%)\n`;
            if (skill.description) strengthsContent += `   ${skill.description}\n`;
            strengthsContent += '\n';
          });
        }
        
        strengthsContent += '---\n\n';
      });
      
      tabs.strengths = strengthsContent;
    } else if (strengthsData) {
      tabs.strengths = formatStrengthsData(strengthsData, detailedAnalysis);
    }
    
    // Weaknesses section - extract from detailed analysis  
    if (detailedAnalysis) {
      let weaknessesContent = '';
      
      [detailedAnalysis.athlete1, detailedAnalysis.athlete2].forEach((athlete, index) => {
        if (!athlete) return;
        
        const name = athlete.name || `Athlete ${index + 1}`;
        weaknessesContent += `**${name} Areas for Improvement:**\n\n`;
        
        // Extract comprehensive weaknesses analysis
        if (athlete.technicalSkills && Array.isArray(athlete.technicalSkills)) {
          // Get skills that could be improved (below 95%)
          const improvableSkills = athlete.technicalSkills.filter((skill: any) => skill.proficiency < 95);
          
          if (improvableSkills.length > 0) {
            weaknessesContent += `**Technical Development Areas:**\n`;
            improvableSkills.forEach((skill: any, skillIndex: number) => {
              weaknessesContent += `${skillIndex + 1}. **${skill.skill}** (${skill.proficiency || 'N/A'}%)\n`;
              if (skill.description) {
                weaknessesContent += `   Analysis: Areas for refinement in ${skill.skill.toLowerCase()}\n`;
              }
              if (skill.evidence) {
                weaknessesContent += `   Improvement Focus: Build consistency in execution\n`;
              }
              weaknessesContent += '\n';
            });
          }
        }
        
        // Add performance-based weaknesses
        if (athlete.recentPerformance) {
          weaknessesContent += `**Performance Areas for Development:**\n`;
          
          if (athlete.recentPerformance.losses && athlete.recentPerformance.wins) {
            const losses = parseInt(athlete.recentPerformance.losses);
            const wins = parseInt(athlete.recentPerformance.wins);
            const winRate = ((wins / (wins + losses)) * 100).toFixed(1);
            
            weaknessesContent += `1. **Consistency Under Pressure** (${winRate}% win rate)\n`;
            weaknessesContent += `   Analysis: ${losses} losses suggest opportunities to improve performance in high-stakes situations\n\n`;
          }
          
          if (athlete.recentPerformance.form && athlete.recentPerformance.form.includes('recent')) {
            weaknessesContent += `2. **Sustained Peak Performance**\n`;
            weaknessesContent += `   Analysis: Maintaining top form across extended competition periods\n\n`;
          }
        }
        
        // Add strategic weaknesses if possible to infer
        if (athlete.physicalAttributes) {
          weaknessesContent += `**Strategic Development Areas:**\n`;
          
          if (athlete.physicalAttributes.weight) {
            weaknessesContent += `1. **Weight Class Strategy**\n`;
            weaknessesContent += `   Analysis: Optimizing performance across weight categories (${athlete.physicalAttributes.weight})\n\n`;
          }
          
          if (athlete.physicalAttributes.stance && athlete.physicalAttributes.stance.includes('adaptable')) {
            weaknessesContent += `2. **Predictability Management**\n`;
            weaknessesContent += `   Analysis: While adaptable, maintaining unpredictability against seasoned opponents\n\n`;
          }
        }
        
        weaknessesContent += '---\n\n';
      });
      
      tabs.weaknesses = weaknessesContent;
    }
    
    // Technical Details section
    if (detailedAnalysis) {
      let detailsContent = '';
      
      [detailedAnalysis.athlete1, detailedAnalysis.athlete2].forEach((athlete, index) => {
        if (!athlete) return;
        
        const name = athlete.name || `Athlete ${index + 1}`;
        detailsContent += `**${name} - Technical Profile:**\n\n`;
        
        if (athlete.physicalAttributes) {
          detailsContent += `**Physical Attributes:**\n`;
          const attrs = athlete.physicalAttributes;
          if (attrs.height) detailsContent += `• Height: ${attrs.height}\n`;
          if (attrs.weight) detailsContent += `• Weight: ${attrs.weight}\n`;
          if (attrs.stance) detailsContent += `• Stance: ${attrs.stance}\n`;
          detailsContent += '\n';
        }
        
        if (athlete.technicalSkills && Array.isArray(athlete.technicalSkills)) {
          detailsContent += `**Technical Skills:**\n`;
          athlete.technicalSkills.forEach((skill: any, skillIndex: number) => {
            detailsContent += `${skillIndex + 1}. **${skill.skill}** (${skill.proficiency || 'N/A'}%)\n`;
            if (skill.description) detailsContent += `   ${skill.description}\n`;
            if (skill.evidence) detailsContent += `   *Evidence:* ${skill.evidence}\n`;
            detailsContent += '\n';
          });
        }
        
        if (athlete.recentPerformance) {
          detailsContent += `**Recent Performance:**\n`;
          const perf = athlete.recentPerformance;
          if (perf.wins && perf.losses) detailsContent += `• Record: ${perf.wins} wins, ${perf.losses} losses\n`;
          if (perf.lastCompetition) detailsContent += `• Last Competition: ${perf.lastCompetition}\n`;
          if (perf.form) detailsContent += `• Current Form: ${perf.form}\n`;
          detailsContent += '\n';
        }
        
        detailsContent += '---\n\n';
      });
      
      tabs.details = detailsContent;
    }
    
    // Head-to-Head section
    if (detailedAnalysis) {
      tabs.headToHead = formatHeadToHead(detailedAnalysis.athlete1, detailedAnalysis.athlete2);
    }
    
    // Competition History section (if available)
    // This would be populated from competition data if it exists
    
    // Apply markdown formatting to all sections
    Object.keys(tabs).forEach(key => {
      if (typeof tabs[key] === 'string') {
        tabs[key] = tabs[key].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      }
    });
    
    return {
      tabs,
      athleteNames,
      summary: overallAnalysis?.overallAnalysis?.summary || 'Comprehensive athlete comparison analysis'
    };
  } catch (error) {
    console.error('Failed to normalize comparison data:', error);
    return null;
  }
}
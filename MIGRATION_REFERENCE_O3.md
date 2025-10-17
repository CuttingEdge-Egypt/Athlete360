# OpenAI o3 Migration Reference

## Overview
This document provides complete reference code and prompts for the migration to OpenAI o3 with web search capabilities for Bio Analysis, Rank History, Statistics, Strengths, and Weaknesses generation.

## Migration Date
October 11, 2025

---

## 1. Bio Analysis Migration

### Function Signature
```typescript
export async function generateAthleteBiography(
  athleteName: string,
  sport: string,
  country?: string,
  language: string = 'en'
)
```

### Complete System Prompt
```
You are a professional sports data analyst and biography writer with deep knowledge of athletes across all sports.

Your task is to create a comprehensive, accurate biography for the athlete using web search to find the most current and reliable information.

Instructions:
1. Use web search to find accurate, up-to-date information about the athlete
2. Focus on verifiable facts from official sources (sports federations, Olympic databases, tournament results)
3. Prioritize recent achievements and current status
4. Include specific details: medals, rankings, major competitions, career highlights
5. Write in ${language === 'ar' ? 'Arabic' : 'English'}
6. If the athlete is not well-known or data is limited, provide a professional summary based on available information

You must return ONLY valid JSON in this exact format (no additional text, no markdown):
{
  "name": "Full Name",
  "bio": "Comprehensive biography paragraph (3-5 sentences)",
  "playersStory": "Career narrative or personal journey (2-3 sentences)",
  "rank": number or "N/A",
  "achievements": ["Achievement 1", "Achievement 2", "Achievement 3", "Achievement 4"],
  "personalInfo": {
    "dateOfBirth": "YYYY-MM-DD or N/A",
    "nationality": "Country",
    "height": "XXX cm or N/A",
    "weight": "XX kg or N/A",
    "club": "Current club/team or N/A",
    "coach": "Coach name or N/A",
    "turnedPro": "Year or N/A",
    "recentNews": ["News item 1", "News item 2"]
  }
}

Important: Return ONLY the JSON object, nothing else.

CRITICAL - NO LINKS OR CITATIONS:
Do NOT include any links, URLs, citations, or reference sources in your response. This includes:
- No markdown links like [text](url)
- No plain URLs like https://example.com
- No bracketed references like [1], [2]
- No parenthetical citations like (source.com)
- Provide clean text without any reference links or citations
```

### User Prompt Template
```
Athlete: ${athleteName}
Sport: ${sport}
${country ? `Country: ${country}` : ''}

Use web search to find current, accurate information about this athlete. Focus on:
1. Recent competition results and rankings
2. Major achievements and medals
3. Current status and recent news
4. Personal information from official sources

Provide the response in ${language === 'ar' ? 'Arabic' : 'English'}.
```

**Note:** The actual implementation includes explicit instructions to prevent link/URL/citation references in the bio text to ensure clean, citation-free output.

---

## 2. Rank History Migration

### Function Signature
```typescript
export async function generateRankHistory(
  athleteName: string,
  sport: string,
  country?: string,
  language: string = 'en'
)
```

### Complete System Prompt
```
You are a professional sports data analyst specializing in athlete ranking analysis and career progression tracking.

Your task is to analyze an athlete's career and create a comprehensive ranking history using web search to find the most current and accurate information.

Instructions:
1. Use web search to find official ranking data from sports federations and tournament databases
2. Identify key career phases (early career, breakthrough, peak performance, current status)
3. Track ranking progression over time with specific dates when possible
4. Include major achievements and milestones that affected rankings
5. Provide analysis in ${language === 'ar' ? 'Arabic' : 'English'}
6. Focus on verifiable data from official sources

CRITICAL - ABSOLUTELY NO LINKS, URLs, OR CITATIONS:
- Do NOT include ANY links, URLs, citations, or reference sources ANYWHERE in the response
- ESPECIALLY in the "notes" field of key_achievements - provide ONLY clean descriptive text
- No markdown links: [text](url)
- No plain URLs: https://example.com or www.site.com
- No bracketed references: [1], [2], [source]
- No parenthetical citations: (source.com), ([website.org](https://...))
- All text must be clean without ANY reference indicators
- This applies to: ranking_system_overview, notes, analysis_narrative, and ALL text fields

You must return ONLY valid JSON in this exact format (no additional text, no markdown):
{
  "athlete_name": "Full Name",
  "career_phases": [
    {
      "phase_name": "Phase name (e.g., 'Early Career', 'Breakthrough Period')",
      "time_period": "YYYY-YYYY or specific period",
      "rankings": [
        {
          "date": "YYYY-MM or YYYY",
          "rank": number,
          "ranking_type": "World/Olympic/Continental/National",
          "achievement": "Description of what happened at this rank"
        }
      ],
      "key_highlights": ["Highlight 1", "Highlight 2"]
    }
  ],
  "current_rank": number or null,
  "peak_rank": number or null,
  "analysis_summary": "Overall career trajectory analysis"
}

Important: Return ONLY the JSON object, nothing else.
```

### User Prompt Template
```
Athlete: ${athleteName}
Sport: ${sport}
${country ? `Country: ${country}` : ''}

Use web search to find:
1. Current world ranking
2. Historical ranking progression
3. Peak ranking and when it was achieved
4. Major competitions and how they affected rankings
5. Career phases and milestones

Provide comprehensive ranking analysis in ${language === 'ar' ? 'Arabic' : 'English'}.
```

---

## 3. Statistics Migration

### Function Signature
```typescript
export async function generateAthleteStatistics(
  athleteName: string,
  sport: string,
  country?: string
)
```

### Complete System Prompt
```
You are a professional sports statistician specializing in comprehensive athlete performance analysis.

Your task is to compile detailed statistics for the athlete using web search to find the most current and accurate data.

Instructions:
1. Use web search to find official statistics from sports federations, tournaments, and verified databases
2. Focus on quantifiable metrics: wins, losses, medals, records
3. Include competition-specific data (Grand Slams, Olympics, World Championships, etc.)
4. Track career progression with specific years when possible
5. Verify data from multiple reliable sources when available
6. For combat sports/individual sports: focus on competitive record
7. For team sports: include both individual and team statistics

You must return ONLY valid JSON in this exact format (no additional text, no markdown):
{
  "athlete_name": "Full Name",
  "career_record": {
    "total_wins": number or null,
    "total_losses": number or null,
    "win_percentage": number or null,
    "total_matches": number or null
  },
  "medals": {
    "gold": number,
    "silver": number,
    "bronze": number,
    "total": number
  },
  "major_competitions": [
    {
      "competition_name": "Competition name",
      "years_participated": ["YYYY", "YYYY"],
      "best_result": "Description of best achievement",
      "total_medals": number
    }
  ],
  "career_highlights": {
    "highest_ranking": number or null,
    "ranking_date": "YYYY-MM or YYYY or null",
    "career_titles": number or null,
    "notable_victories": ["Victory 1", "Victory 2", "Victory 3"]
  },
  "seasonal_performance": [
    {
      "year": number,
      "wins": number,
      "losses": number,
      "major_achievements": ["Achievement 1", "Achievement 2"]
    }
  ]
}

Important: 
- Return ONLY the JSON object, nothing else
- Use null for unavailable numerical data
- Use empty arrays [] for unavailable lists
- Prioritize accuracy over completeness
```

### User Prompt Template
```
Athlete: ${athleteName}
Sport: ${sport}
${country ? `Country: ${country}` : ''}

Use web search to compile comprehensive statistics:
1. Career win/loss record
2. Olympic and World Championship medals
3. Major tournament results
4. Year-by-year performance data
5. Career highlights and records
6. Notable victories and achievements

Focus on verified data from official sources.
```

---

## 4. Strengths Analysis Migration

### Function Signature
```typescript
export async function generateAthleteStrengths(
  athleteName: string,
  sport: string,
  athleteData?: any,
  language: string = 'en'
)
```

### Complete System Prompt
```
You are an expert ${sport} coach and analyst. Research and analyze the specific competitive strengths of athlete "${athleteName}" from ${athleteData?.country || 'unknown country'}.

CRITICAL: Return only valid JSON. No extra text or explanations.${languageInstruction}

Use the following athlete information for personalized analysis:
- Name: ${athleteName}
- Sport: ${sport}
- Country: ${athleteData?.country || 'N/A'}
- Biography: ${athleteData?.bio || 'N/A'}
- Current Rank: ${athleteData?.rank || 'N/A'}
- Competition Record: ${athleteData?.competitionRecord || 'N/A'}
- Achievements: ${athleteData?.achievements?.join(', ') || 'N/A'}

WEB SEARCH STRATEGY:
1. Search "${athleteName} ${sport} strengths analysis"
2. Search "${athleteName} competition highlights ${sport}"
3. Search "${athleteName} technical skills ${sport}"
4. Search "${athleteName} recent matches performance"
5. Search "${athleteName} expert analysis coach commentary"

Provide 3-4 specific, evidence-based strengths based on:
- Technical skills unique to this athlete
- Tactical advantages in competition
- Physical attributes that give competitive edge
- Mental/psychological strengths shown in matches
- Signature techniques or fighting style elements

Return this exact JSON structure:
{
  "strengths": [
    {
      "title": "Specific strength name",
      "description": "Detailed analysis with evidence from competitions and expert observations",
      "rating": 95,
      "evidence": "Specific examples from matches or competitions",
      "impact": "high"
    }
  ]
}

Use authentic data only - base analysis on real competition results and verified performance data.

IMPORTANT: Do not include any links, URLs, citations, or reference sources in your response. Provide clean text without any reference links, citations, or bracketed/parenthetical references to websites.

Return ONLY the JSON object.
```

### User Prompt Template
```
Athlete: ${athleteName}
Sport: ${sport}

Use web search to find:
1. Technical strengths and signature moves
2. Competition highlights and dominant performances
3. Expert analysis and coach commentary
4. Recent match performance data

Provide comprehensive strengths analysis in ${language === 'ar' ? 'Arabic' : 'English'}.
```

---

## 5. Weaknesses Analysis Migration

### Function Signature
```typescript
export async function generateAthleteWeaknesses(
  athleteName: string,
  sport: string,
  athleteData?: any,
  language: string = 'en'
)
```

### Complete System Prompt
```
You are an expert ${sport} coach and performance analyst. Research and identify specific areas for improvement for athlete "${athleteName}" from ${athleteData?.country || 'unknown country'}.

CRITICAL: Return only valid JSON. No extra text or explanations.${languageInstruction}

Use the following athlete information for personalized analysis:
- Name: ${athleteName}
- Sport: ${sport}
- Country: ${athleteData?.country || 'N/A'}
- Biography: ${athleteData?.bio || 'N/A'}
- Current Rank: ${athleteData?.rank || 'N/A'}
- Competition Record: ${athleteData?.competitionRecord || 'N/A'}
- Achievements: ${athleteData?.achievements?.join(', ') || 'N/A'}

WEB SEARCH STRATEGY:
1. Search "${athleteName} ${sport} weaknesses analysis"
2. Search "${athleteName} losses defeats ${sport}"
3. Search "${athleteName} areas for improvement"
4. Search "${athleteName} match analysis criticism"
5. Search "${athleteName} technique gaps ${sport}"

Provide 3-4 specific, evidence-based weaknesses or areas for improvement based on:
- Technical gaps or inconsistencies
- Tactical vulnerabilities in competition
- Physical limitations affecting performance
- Mental/psychological challenges
- Pattern analysis from lost matches

Return this exact JSON structure:
{
  "weaknesses": [
    {
      "title": "Specific weakness or area for improvement",
      "description": "Detailed analysis with evidence from competitions",
      "impact": "high",
      "improvement_timeline": "short-term",
      "evidence": "Specific examples from matches showing this weakness"
    }
  ]
}

Use authentic data only - base analysis on real competition results and verified performance data.

IMPORTANT: Do not include any links, URLs, citations, or reference sources in your response. Provide clean text without any reference links, citations, or bracketed/parenthetical references to websites.

Return ONLY the JSON object.
```

### User Prompt Template
```
Athlete: ${athleteName}
Sport: ${sport}

Use web search to find:
1. Identified weaknesses and vulnerabilities
2. Lost matches and defeat patterns
3. Areas for improvement from expert analysis
4. Technical gaps and tactical limitations

Provide comprehensive weaknesses analysis in ${language === 'ar' ? 'Arabic' : 'English'}.
```

---

## Implementation Details

### Model Configuration
All five functions use the following OpenAI configuration:

```typescript
const completion = await openai.chat.completions.create({
  model: "o3",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ],
  tools: [{ type: "web_search_preview" }],
  temperature: 0.7,
  response_format: { type: "json_object" }
});
```

### Key Features
1. **Web Search Integration**: All functions use `tools: [{ type: "web_search_preview" }]` for real-time data
2. **Structured Output**: All functions use `response_format: { type: "json_object" }` for reliable JSON parsing
3. **Error Handling**: Comprehensive try-catch blocks with token refund on failure
4. **Multilingual Support**: Bio and Rank functions support both English and Arabic
5. **Fallback Strategy**: Graceful degradation when data is unavailable

### Error Handling Pattern
```typescript
try {
  const completion = await openai.chat.completions.create({...});
  const result = JSON.parse(completion.choices[0].message.content || '{}');
  return result;
} catch (error) {
  console.error(`Error in [function_name]:`, error);
  throw error; // Routes handle token refund
}
```

---

## Routes Updated

### 1. Bio Analysis Route
- **Path**: `/api/analysis/:athleteId/bio`
- **Change**: `generateAthleteBiography()` (Gemini) → `generateAthleteBiographyO3()` (o3)
- **Token Cost**: 70 tokens
- **Comments Updated**: "GPT-5" → "o3"

### 2. Rank History Route
- **Path**: `/api/analysis/:athleteId/rank`
- **Change**: `generateRankHistoryWithGemini()` → `generateRankHistoryO3()`
- **Token Cost**: 70 tokens
- **Comments Updated**: "Gemini 2.5 Pro" → "o3"

### 3. Statistics Route
- **Path**: `/api/analysis/:athleteId/statistics`
- **Change**: `generateAthleteStatistics()` (GPT-5) → `generateAthleteStatisticsO3()`
- **Token Cost**: 50 tokens
- **Comments Updated**: "GPT-5" → "o3"

### 4. Strengths Route
- **Path**: `/api/analysis/:athleteId/strengths`
- **Change**: `generateSpecificAnalysis(..., 'strengths')` (GPT-4o/GPT-5) → `generateAthleteStrengthsO3()`
- **Token Cost**: 50 tokens
- **Comments Updated**: "GPT-5" → "o3"

### 5. Weaknesses Route
- **Path**: `/api/analysis/:athleteId/weaknesses`
- **Change**: `generateSpecificAnalysis(..., 'weaknesses')` (GPT-4o/GPT-5) → `generateAthleteWeaknessesO3()`
- **Token Cost**: 50 tokens
- **Comments Updated**: "GPT-5" → "o3"

### 6. Beat Strategies Route
- **Path**: `/api/analysis/:athleteId/beat-strategies`
- **Change**: `generateSpecificAnalysis(..., 'beat-strategies')` - model conditional changed from GPT-5 to o3
- **Token Cost**: 100 tokens
- **Implementation**: Model selection now conditional - o3 for beat-strategies, GPT-5 for strengths/weaknesses
- **Date**: October 12, 2025

### 7. Athlete Update Route
- **Path**: `/api/athletes/:id/update-from-ai`
- **Change**: `generateAthleteBiography()` (Gemini) → `generateAthleteBiographyO3()`
- **Comments Updated**: "Gemini 2.5 Pro" → "o3"

---

## Import Changes in routes.ts

### Before
```typescript
import { generateNutritionPlan, generateEnhancedNutritionPlan, 
  generateDevelopmentPlan, searchAthleteImagesWithGemini, 
  type NutritionPlanFormData, type DevelopmentPlanFormData 
} from "./geminiService";

import { generateSpecificAnalysis } from "./openaiService";
```

### After
```typescript
import { generateNutritionPlan, generateEnhancedNutritionPlan, 
  generateDevelopmentPlan, searchAthleteImagesWithGemini, 
  type NutritionPlanFormData, type DevelopmentPlanFormData 
} from "./geminiService";

import { generateAthleteBiography as generateAthleteBiographyO3, 
  generateRankHistory as generateRankHistoryO3, 
  generateAthleteStatistics as generateAthleteStatisticsO3,
  generateAthleteStrengths as generateAthleteStrengthsO3,
  generateAthleteWeaknesses as generateAthleteWeaknessesO3
} from "./o3Service";
```

---

## Testing Checklist

After migration, verify:

- [ ] Bio Analysis generates correctly with o3
- [ ] Rank History generates correctly with o3
- [ ] Statistics generate correctly with o3
- [ ] Strengths generate correctly with o3
- [ ] Weaknesses generate correctly with o3
- [ ] Web search is working for all five services
- [ ] Multilingual support works (Arabic/English) for Bio, Rank, Strengths, and Weaknesses
- [ ] Error handling and token refunds work properly
- [ ] JSON parsing is reliable across all responses
- [ ] Response times are acceptable
- [ ] Token costs remain as expected (70 for bio/rank, 50 for stats/strengths/weaknesses)
- [ ] Gemini services (Video, Nutrition, Development) still work

---

## Benefits Observed

1. **Superior Reasoning**: o3 provides advanced analysis capabilities for complex athlete data
2. **Real-time Data**: Web search ensures current, authentic information
3. **Consistent API**: Unified OpenAI platform reduces complexity
4. **Reliable Parsing**: JSON mode ensures better structured outputs
5. **Cost Effective**: Competitive pricing with high-quality results
6. **Comprehensive Coverage**: All analysis types now use the same powerful model

---

## Services Still Using Gemini

These services were intentionally kept on Gemini 2.5 Pro:

1. **Video Analysis** (`videoAnalysisService.ts`)
   - Reason: Gemini's video processing capabilities
   
2. **Nutrition Plans** (`geminiService.ts` - `generateNutritionPlan()`)
   - Reason: Specialized domain expertise
   
3. **Development Plans** (`geminiService.ts` - `generateDevelopmentPlan()`)
   - Reason: Comprehensive training plan generation

---

## Future Considerations

1. Monitor o3 performance and adjust prompts as needed
2. Consider migrating Beat Strategies if o3 proves superior
3. Track token costs and optimize if necessary
4. Evaluate o3 updates and new features from OpenAI
5. Consider A/B testing between models for optimal results
6. Explore using o3 for Athlete Comparison in future iterations

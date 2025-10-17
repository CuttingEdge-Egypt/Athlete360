// Shared utility functions for cleaning and parsing AI-generated JSON responses

// Function to clean and fix common JSON formatting issues in AI responses
export function cleanJsonResponse(responseText: string): string {
  if (!responseText) return '{"error": "parsing_failed"}';
  
  let cleanedText = responseText.trim();
  
  // Remove code block markers if present
  cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  
  // Strategy 1: Try direct parse
  try {
    const parsed = JSON.parse(cleanedText);
    return JSON.stringify(parsed);
  } catch (error) {
    console.log(`[CLEAN_JSON] Direct parse failed, attempting extraction: ${error}`);
  }
  
  // Strategy 2: Extract JSON from mixed content (search results + JSON)
  // Look for JSON object patterns in the text
  const jsonPatterns = [
    // Pattern 1: Find largest JSON object
    /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g,
    // Pattern 2: Find JSON starting with expected keys
    /\{\s*["'](?:athlete1|athlete2|strengths|weaknesses|ranking|statistics|headToHead|overallAnalysis)["\s:]/,
    // Pattern 3: Any object with nested structures
    /\{[\s\S]*?\}/
  ];
  
  for (const pattern of jsonPatterns) {
    const matches = cleanedText.match(pattern);
    if (matches) {
      // Try to parse each match, starting with the largest
      const sortedMatches = matches.sort((a, b) => b.length - a.length);
      
      for (const match of sortedMatches) {
        try {
          const parsed = JSON.parse(match);
          console.log(`[CLEAN_JSON] Successfully extracted JSON from mixed content`);
          return JSON.stringify(parsed);
        } catch (e) {
          continue;
        }
      }
    }
  }
  
  // Strategy 3: Progressive cleanup attempts
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      let attemptText = cleanedText;
      
      // Attempt 1: Remove trailing commas
      if (attempt === 1) {
        attemptText = attemptText.replace(/,(\s*[}\]])/g, '$1');
      }
      
      // Attempt 2: Fix quote issues
      if (attempt === 2) {
        attemptText = attemptText.replace(/,(\s*[}\]])/g, '$1');
        attemptText = attemptText.replace(/'/g, '"');
      }
      
      // Attempt 3: Extract just the JSON portion more aggressively
      if (attempt === 3) {
        // Find the first { and last }
        const firstBrace = attemptText.indexOf('{');
        const lastBrace = attemptText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          attemptText = attemptText.substring(firstBrace, lastBrace + 1);
          attemptText = attemptText.replace(/,(\s*[}\]])/g, '$1');
        }
      }
      
      // Attempt 4: Most aggressive - normalize whitespace and extract
      if (attempt === 4) {
        attemptText = attemptText.replace(/\n/g, ' ').replace(/\s+/g, ' ');
        const firstBrace = attemptText.indexOf('{');
        const lastBrace = attemptText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          attemptText = attemptText.substring(firstBrace, lastBrace + 1);
          attemptText = attemptText.replace(/,(\s*[}\]])/g, '$1');
        }
      }
      
      const parsed = JSON.parse(attemptText);
      console.log(`[CLEAN_JSON] Cleanup successful on attempt ${attempt}`);
      return JSON.stringify(parsed);
      
    } catch (cleanupError) {
      console.log(`[CLEAN_JSON] Attempt ${attempt} failed: ${cleanupError}`);
      if (attempt === 4) {
        console.log(`[CLEAN_JSON] All cleanup attempts failed, returning error structure`);
        return '{"error": "parsing_failed"}';
      }
    }
  }
  
  // Should never reach here, but just in case
  return '{"error": "parsing_failed"}';
}

// Function to robustly parse cleaned JSON with proper error handling
export function parseCleanedJson(responseText: string, fallbackStructure = {}): any {
  const cleanedResponse = cleanJsonResponse(responseText);
  
  try {
    const parsed = JSON.parse(cleanedResponse);
    
    // Check if parsing failed and we got error structure
    if (parsed.error === 'parsing_failed') {
      console.warn('[PARSE_JSON] JSON cleanup failed, using fallback structure');
      return fallbackStructure;
    }
    
    return parsed;
  } catch (error) {
    console.error('[PARSE_JSON] Final parsing failed:', error);
    return fallbackStructure;
  }
}
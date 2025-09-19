// Shared utility functions for cleaning and parsing AI-generated JSON responses

// Function to clean and fix common JSON formatting issues in AI responses
export function cleanJsonResponse(responseText: string): string {
  if (!responseText) return '{}';
  
  let cleanedText = responseText.trim();
  
  // Remove code block markers if present
  cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  
  // Try to parse and reformat to catch basic JSON errors
  try {
    const parsed = JSON.parse(cleanedText);
    return JSON.stringify(parsed);
  } catch (error) {
    console.log(`[CLEAN_JSON] Initial parse failed, attempting cleanup: ${error}`);
    
    // Multiple cleanup attempts
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        let attemptText = cleanedText;
        
        // Attempt 1: Fix common comma issues
        if (attempt === 1) {
          attemptText = attemptText.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
          attemptText = attemptText.replace(/([}\]])(\s*)([{"\[])/g, '$1,$2$3'); // Add missing commas between objects
        }
        
        // Attempt 2: Fix quote issues and escape sequences
        if (attempt === 2) {
          attemptText = attemptText.replace(/'/g, '"'); // Replace single quotes with double quotes
          attemptText = attemptText.replace(/(\w+):/g, '"$1":'); // Quote unquoted keys
          attemptText = attemptText.replace(/:\s*([^",{[\]}\s]+)(?=\s*[,}])/g, ': "$1"'); // Quote unquoted string values
        }
        
        // Attempt 3: More aggressive cleanup
        if (attempt === 3) {
          attemptText = attemptText.replace(/\n/g, ' '); // Remove newlines
          attemptText = attemptText.replace(/\s+/g, ' '); // Normalize whitespace
          // Try to find JSON-like content and extract it
          const jsonMatch = attemptText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            attemptText = jsonMatch[0];
          }
        }
        
        const parsed = JSON.parse(attemptText);
        console.log(`[CLEAN_JSON] Cleanup successful on attempt ${attempt}`);
        return JSON.stringify(parsed);
        
      } catch (cleanupError) {
        console.log(`[CLEAN_JSON] Attempt ${attempt} failed: ${cleanupError}`);
        if (attempt === 3) {
          // Final fallback - return empty structure
          console.log(`[CLEAN_JSON] All cleanup attempts failed, returning fallback structure`);
          return '{"error": "parsing_failed"}';
        }
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
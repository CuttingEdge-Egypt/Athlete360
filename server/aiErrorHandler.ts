// AI Error Handler - Comprehensive error handling for AI responses
// Prevents token deduction when AI web search fails to find data

export interface AIErrorResponse {
  success: false;
  error: string;
  shouldRetry: boolean;
  noDataFound: boolean;
}

export interface AISuccessResponse<T = any> {
  success: true;
  data: T;
}

export type AIResponse<T = any> = AISuccessResponse<T> | AIErrorResponse;

// Check if AI response indicates no data found
export function checkAIResponseForNoData(response: string): boolean {
  const noDataIndicators = [
    'false',
    'not found',
    'no data found',
    'no information found',
    'unable to find',
    'information not available',
    'data unavailable',
    'no results found',
    'search failed',
    'no specific data',
    'insufficient information',
    'no reliable data',
    'no current data',
    'no recent data'
  ];
  
  const lowercaseResponse = response.toLowerCase().trim();
  
  // Check for exact "false" response
  if (lowercaseResponse === 'false' || lowercaseResponse === '"false"') {
    return true;
  }
  
  // Check for no data indicators
  return noDataIndicators.some(indicator => 
    lowercaseResponse.includes(indicator)
  );
}

// Validate AI JSON response for completeness
export function validateAIResponse(parsedData: any, requiredFields: string[]): AIResponse {
  // Check if response indicates no data found
  if (typeof parsedData === 'string' && checkAIResponseForNoData(parsedData)) {
    return {
      success: false,
      error: 'AI web search found no data for this request',
      shouldRetry: true,
      noDataFound: true
    };
  }
  
  // Check if it's a boolean false
  if (parsedData === false || parsedData === 'false') {
    return {
      success: false,
      error: 'AI web search returned no results',
      shouldRetry: true,
      noDataFound: true
    };
  }
  
  // Check if response contains error indicators
  if (parsedData && typeof parsedData === 'object') {
    const responseText = JSON.stringify(parsedData).toLowerCase();
    if (checkAIResponseForNoData(responseText)) {
      return {
        success: false,
        error: 'AI web search could not find reliable data',
        shouldRetry: true,
        noDataFound: true
      };
    }
    
    // Check for missing required fields
    const missingFields = requiredFields.filter(field => 
      !parsedData[field] || 
      parsedData[field] === 'N/A' || 
      parsedData[field] === 'Not available' ||
      parsedData[field] === 'Information not found'
    );
    
    if (missingFields.length === requiredFields.length) {
      return {
        success: false,
        error: 'AI web search found incomplete data - all required fields missing',
        shouldRetry: true,
        noDataFound: true
      };
    }
    
    if (missingFields.length > requiredFields.length / 2) {
      return {
        success: false,
        error: `AI web search found incomplete data - missing: ${missingFields.join(', ')}`,
        shouldRetry: true,
        noDataFound: true
      };
    }
  }
  
  return {
    success: true,
    data: parsedData
  };
}

// Enhanced prompt for AI to return proper error responses
export function enhancePromptWithErrorHandling(originalPrompt: string): string {
  return `${originalPrompt}

CRITICAL ERROR HANDLING INSTRUCTIONS:
- If you cannot find any reliable data through web search, respond with exactly: {"error": "no_data_found", "success": false}
- If web search fails or returns no results, respond with exactly: {"error": "search_failed", "success": false}
- If the athlete/information does not exist, respond with exactly: {"error": "not_found", "success": false}
- Only provide data if you find authentic, verifiable information through web search
- Do not use placeholder or generic data when real information is unavailable

Return "false" if no authentic data can be found through web search.`;
}

// Check if error should prevent token deduction
export function shouldPreventTokenDeduction(error: AIErrorResponse): boolean {
  return error.noDataFound || error.error.includes('no data found') || error.error.includes('search failed');
}
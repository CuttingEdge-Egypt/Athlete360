// Frontend error handling utility with i18n support

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

/**
 * Extract user-friendly error message from API response
 */
export async function extractErrorMessage(error: any): Promise<string> {
  // If it's already a string, return it
  if (typeof error === 'string') {
    return error;
  }

  // If it's a Response object, try to parse JSON
  if (error instanceof Response) {
    try {
      const data = await error.json();
      if (data.message) {
        return data.message;
      }
      // Fallback to status text
      return error.statusText || 'An error occurred';
    } catch {
      return error.statusText || 'An error occurred';
    }
  }

  // If it's an Error object
  if (error instanceof Error) {
    return error.message;
  }

  // If it has a message property
  if (error?.message) {
    return error.message;
  }

  // If it has a response with data
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  // Fallback to generic error message
  return 'An unexpected error occurred';
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: any): boolean {
  return (
    error?.message?.includes('network') ||
    error?.message?.includes('fetch') ||
    error?.code === 'NETWORK_ERROR' ||
    !navigator.onLine
  );
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: any): boolean {
  return (
    error?.status === 401 ||
    error?.response?.status === 401 ||
    error?.message?.includes('authentication') ||
    error?.message?.includes('unauthorized')
  );
}

/**
 * Check if error is a token error (insufficient tokens)
 */
export function isTokenError(error: any): boolean {
  return (
    error?.status === 402 ||
    error?.response?.status === 402 ||
    error?.message?.toLowerCase().includes('token')
  );
}

/**
 * Get error title based on error type (for toast notifications)
 */
export function getErrorTitle(error: any, t: any): string {
  if (isNetworkError(error)) {
    return t('errors.networkError', { defaultValue: 'Network Error' });
  }
  if (isAuthError(error)) {
    return t('errors.authError', { defaultValue: 'Authentication Error' });
  }
  if (isTokenError(error)) {
    return t('errors.insufficientTokens', { defaultValue: 'Insufficient Tokens' });
  }
  return t('errors.error', { defaultValue: 'Error' });
}

/**
 * Handle API errors in a user-friendly way
 * Returns a formatted error message ready for display
 */
export async function handleApiError(error: any, t?: any): Promise<string> {
  const message = await extractErrorMessage(error);
  
  // If message looks like JSON, try to parse it
  if (message.startsWith('{') || message.startsWith('[')) {
    try {
      const parsed = JSON.parse(message);
      if (parsed.message) {
        return parsed.message;
      }
    } catch {
      // If parsing fails, return a generic message
      return t ? t('errors.unexpectedError', { defaultValue: 'An unexpected error occurred' }) : 'An unexpected error occurred';
    }
  }
  
  return message;
}

/**
 * Show error toast with proper formatting
 */
export async function showErrorToast(toast: any, error: any, t: any) {
  const message = await handleApiError(error, t);
  const title = getErrorTitle(error, t);
  
  toast({
    title,
    description: message,
    variant: "destructive",
  });
}

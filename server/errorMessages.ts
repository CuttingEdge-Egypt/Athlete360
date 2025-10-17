// Centralized error messages with English and Arabic translations
export interface ErrorMessage {
  en: string;
  ar: string;
}

export const ErrorMessages = {
  // Authentication errors
  AUTH_REQUIRED: {
    en: "Please log in to access this feature",
    ar: "الرجاء تسجيل الدخول للوصول إلى هذه الميزة"
  },
  INVALID_CREDENTIALS: {
    en: "Invalid email or password",
    ar: "البريد الإلكتروني أو كلمة المرور غير صحيحة"
  },
  USER_NOT_FOUND: {
    en: "User not found",
    ar: "المستخدم غير موجود"
  },
  SESSION_EXPIRED: {
    en: "Your session has expired. Please log in again",
    ar: "انتهت جلستك. يرجى تسجيل الدخول مرة أخرى"
  },
  
  // Token errors
  INSUFFICIENT_TOKENS: {
    en: "You don't have enough tokens for this operation",
    ar: "ليس لديك رموز كافية لهذه العملية"
  },
  TOKEN_DEDUCTION_FAILED: {
    en: "Failed to process tokens. Please try again",
    ar: "فشل معالجة الرموز. يرجى المحاولة مرة أخرى"
  },
  
  // Athlete/Sport errors
  ATHLETE_NOT_FOUND: {
    en: "Athlete not found. Please check the name and try again",
    ar: "اللاعب غير موجود. يرجى التحقق من الاسم والمحاولة مرة أخرى"
  },
  SPORT_NOT_FOUND: {
    en: "Sport not found. Please select a valid sport",
    ar: "الرياضة غير موجودة. يرجى اختيار رياضة صحيحة"
  },
  ATHLETE_SEARCH_FAILED: {
    en: "Could not find athlete information. Please try a different name or sport",
    ar: "تعذر العثور على معلومات اللاعب. يرجى تجربة اسم أو رياضة مختلفة"
  },
  
  // AI Service errors
  AI_SERVICE_ERROR: {
    en: "AI analysis is currently unavailable. Please try again later",
    ar: "تحليل الذكاء الاصطناعي غير متاح حالياً. يرجى المحاولة لاحقاً"
  },
  AI_WEB_SEARCH_FAILED: {
    en: "Could not find reliable information online. Please try again or check the athlete name",
    ar: "تعذر العثور على معلومات موثوقة عبر الإنترنت. يرجى المحاولة مرة أخرى أو التحقق من اسم اللاعب"
  },
  AI_NO_DATA_FOUND: {
    en: "No data found for this athlete. Please verify the information and try again",
    ar: "لم يتم العثور على بيانات لهذا اللاعب. يرجى التحقق من المعلومات والمحاولة مرة أخرى"
  },
  AI_RESPONSE_INVALID: {
    en: "Received incomplete data. Please try again",
    ar: "تم تلقي بيانات غير كاملة. يرجى المحاولة مرة أخرى"
  },
  AI_TIMEOUT: {
    en: "Analysis is taking longer than expected. Please try again",
    ar: "يستغرق التحليل وقتاً أطول من المتوقع. يرجى المحاولة مرة أخرى"
  },
  
  // Analysis errors
  ANALYSIS_FAILED: {
    en: "Analysis failed. Please try again",
    ar: "فشل التحليل. يرجى المحاولة مرة أخرى"
  },
  ANALYSIS_NOT_FOUND: {
    en: "Analysis not found",
    ar: "التحليل غير موجود"
  },
  COMPARISON_FAILED: {
    en: "Could not compare athletes. Please try again",
    ar: "تعذرت مقارنة اللاعبين. يرجى المحاولة مرة أخرى"
  },
  
  // File/Upload errors
  FILE_UPLOAD_FAILED: {
    en: "File upload failed. Please try again",
    ar: "فشل رفع الملف. يرجى المحاولة مرة أخرى"
  },
  FILE_TOO_LARGE: {
    en: "File is too large. Maximum size is 10MB",
    ar: "الملف كبير جداً. الحد الأقصى للحجم هو 10 ميجابايت"
  },
  INVALID_FILE_FORMAT: {
    en: "Invalid file format. Please upload a valid file",
    ar: "تنسيق الملف غير صالح. يرجى رفع ملف صحيح"
  },
  VIDEO_PROCESSING_FAILED: {
    en: "Video processing failed. Please try again or use a different video",
    ar: "فشلت معالجة الفيديو. يرجى المحاولة مرة أخرى أو استخدام فيديو آخر"
  },
  
  // Payment errors
  PAYMENT_FAILED: {
    en: "Payment processing failed. Please try again",
    ar: "فشلت معالجة الدفع. يرجى المحاولة مرة أخرى"
  },
  PAYMENT_CANCELLED: {
    en: "Payment was cancelled",
    ar: "تم إلغاء الدفع"
  },
  PAYMENT_VERIFICATION_FAILED: {
    en: "Could not verify payment. Please contact support",
    ar: "تعذر التحقق من الدفع. يرجى الاتصال بالدعم"
  },
  
  // Validation errors
  INVALID_INPUT: {
    en: "Invalid input. Please check your information",
    ar: "إدخال غير صالح. يرجى التحقق من معلوماتك"
  },
  REQUIRED_FIELD_MISSING: {
    en: "Required fields are missing. Please fill all required fields",
    ar: "الحقول المطلوبة مفقودة. يرجى ملء جميع الحقول المطلوبة"
  },
  INVALID_EMAIL: {
    en: "Invalid email address",
    ar: "عنوان البريد الإلكتروني غير صالح"
  },
  PASSWORD_TOO_SHORT: {
    en: "Password must be at least 8 characters",
    ar: "يجب أن تكون كلمة المرور 8 أحرف على الأقل"
  },
  
  // Database errors
  DATABASE_ERROR: {
    en: "A database error occurred. Please try again",
    ar: "حدث خطأ في قاعدة البيانات. يرجى المحاولة مرة أخرى"
  },
  SAVE_FAILED: {
    en: "Failed to save data. Please try again",
    ar: "فشل حفظ البيانات. يرجى المحاولة مرة أخرى"
  },
  
  // Network errors
  NETWORK_ERROR: {
    en: "Network error. Please check your connection and try again",
    ar: "خطأ في الشبكة. يرجى التحقق من اتصالك والمحاولة مرة أخرى"
  },
  REQUEST_TIMEOUT: {
    en: "Request timed out. Please try again",
    ar: "انتهت مهلة الطلب. يرجى المحاولة مرة أخرى"
  },
  
  // General errors
  UNEXPECTED_ERROR: {
    en: "An unexpected error occurred. Please try again",
    ar: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى"
  },
  SERVICE_UNAVAILABLE: {
    en: "Service temporarily unavailable. Please try again later",
    ar: "الخدمة غير متاحة مؤقتاً. يرجى المحاولة لاحقاً"
  },
  OPERATION_CANCELLED: {
    en: "Operation cancelled",
    ar: "تم إلغاء العملية"
  },
  
  // Image search errors
  IMAGE_SEARCH_FAILED: {
    en: "Could not find athlete images. Please try again",
    ar: "تعذر العثور على صور اللاعب. يرجى المحاولة مرة أخرى"
  },
  IMAGE_DOWNLOAD_FAILED: {
    en: "Failed to download image. Please try again",
    ar: "فشل تنزيل الصورة. يرجى المحاولة مرة أخرى"
  },
  
  // Nutrition & Development Plan errors
  NUTRITION_PLAN_FAILED: {
    en: "Failed to generate nutrition plan. Please try again",
    ar: "فشل إنشاء خطة التغذية. يرجى المحاولة مرة أخرى"
  },
  DEVELOPMENT_PLAN_FAILED: {
    en: "Failed to generate development plan. Please try again",
    ar: "فشل إنشاء خطة التطوير. يرجى المحاولة مرة أخرى"
  },
  INVALID_PLAN_DATA: {
    en: "Invalid plan data. Please check your inputs",
    ar: "بيانات الخطة غير صالحة. يرجى التحقق من إدخالاتك"
  }
};

/**
 * Get error message in the specified language
 */
export function getErrorMessage(errorKey: keyof typeof ErrorMessages, language: 'en' | 'ar' = 'en'): string {
  const message = ErrorMessages[errorKey];
  if (!message) {
    return language === 'ar' 
      ? ErrorMessages.UNEXPECTED_ERROR.ar 
      : ErrorMessages.UNEXPECTED_ERROR.en;
  }
  return message[language];
}

/**
 * Create a user-friendly error response
 */
export function createErrorResponse(
  errorKey: keyof typeof ErrorMessages, 
  language: 'en' | 'ar' = 'en',
  statusCode: number = 500
) {
  return {
    status: statusCode,
    message: getErrorMessage(errorKey, language)
  };
}

/**
 * Extract language from request headers or body
 */
export function getLanguageFromRequest(req: any): 'en' | 'ar' {
  // Check body first
  if (req.body?.language === 'ar') return 'ar';
  
  // Check query params
  if (req.query?.language === 'ar') return 'ar';
  
  // Check Accept-Language header
  const acceptLanguage = req.headers['accept-language'];
  if (acceptLanguage && acceptLanguage.includes('ar')) return 'ar';
  
  // Default to English
  return 'en';
}

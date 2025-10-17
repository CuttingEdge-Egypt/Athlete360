// Password validation utilities

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
  score: number; // 0-100
}

export interface PasswordMatchResult {
  match: boolean;
  error?: string;
}

// Validate password strength and requirements
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;
  
  // Check minimum length (8 characters)
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else {
    score += 20;
  }
  
  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 15;
  }
  
  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 15;
  }
  
  // Check for number
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score += 15;
  }
  
  // Check for special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)');
  } else {
    score += 20;
  }
  
  // Bonus points for length
  if (password.length >= 12) {
    score += 10;
  }
  
  // Check for common patterns and reduce score
  if (/123456|password|qwerty|admin|letmein/i.test(password)) {
    score -= 30;
    errors.push('Password contains common patterns');
  }
  
  // Ensure score doesn't go below 0
  score = Math.max(0, score);
  
  // Determine strength
  let strength: 'weak' | 'medium' | 'strong';
  if (score >= 80) {
    strength = 'strong';
  } else if (score >= 60) {
    strength = 'medium';
  } else {
    strength = 'weak';
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score
  };
}

// Check if passwords match
export function validatePasswordMatch(password: string, confirmPassword: string): PasswordMatchResult {
  if (!confirmPassword) {
    return {
      match: false,
      error: 'Please confirm your password'
    };
  }
  
  if (password !== confirmPassword) {
    return {
      match: false,
      error: 'Passwords do not match'
    };
  }
  
  return {
    match: true
  };
}

// Get password strength color for UI
export function getPasswordStrengthColor(strength: 'weak' | 'medium' | 'strong'): string {
  switch (strength) {
    case 'weak':
      return 'text-red-500';
    case 'medium':
      return 'text-yellow-500';
    case 'strong':
      return 'text-green-500';
    default:
      return 'text-gray-500';
  }
}

// Get password strength background color for progress bar
export function getPasswordStrengthBgColor(strength: 'weak' | 'medium' | 'strong'): string {
  switch (strength) {
    case 'weak':
      return 'bg-red-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'strong':
      return 'bg-green-500';
    default:
      return 'bg-gray-300';
  }
}

// Password strength requirements list
export const passwordRequirements = [
  'At least 8 characters long',
  'Contains uppercase letter (A-Z)',
  'Contains lowercase letter (a-z)', 
  'Contains number (0-9)',
  'Contains special character (!@#$%^&*)'
];

// Check individual requirements for dynamic UI feedback
export function checkPasswordRequirements(password: string) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
}
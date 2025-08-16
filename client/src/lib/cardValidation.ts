// Card validation utilities

export interface CardDetails {
  number: string;
  expiry: string;
  cvv: string;
  name: string;
}

export interface CardValidationResult {
  isValid: boolean;
  brand: string;
  errors: string[];
}

export interface ExpiryValidationResult {
  isValid: boolean;
  month: number;
  year: number;
  error?: string;
}

// Card brand detection with enhanced patterns
export function detectCardBrand(cardNumber: string): string {
  const number = cardNumber.replace(/\s/g, '');
  
  // Visa: starts with 4
  if (/^4/.test(number)) {
    return 'Visa';
  }
  
  // Mastercard: starts with 5 or 2 (new range)
  if (/^5[1-5]/.test(number) || /^2[2-7]/.test(number)) {
    return 'Mastercard';
  }
  
  // American Express: starts with 34 or 37
  if (/^3[47]/.test(number)) {
    return 'American Express';
  }
  
  // Discover: starts with 6
  if (/^6/.test(number)) {
    return 'Discover';
  }
  
  return 'Unknown';
}

// Luhn algorithm for card number validation
export function validateCardNumberLuhn(cardNumber: string): boolean {
  const number = cardNumber.replace(/\s/g, '');
  
  // Must be between 13-19 digits
  if (!/^\d{13,19}$/.test(number)) {
    return false;
  }
  
  let sum = 0;
  let isEven = false;
  
  // Process digits from right to left
  for (let i = number.length - 1; i >= 0; i--) {
    let digit = parseInt(number[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

// Validate expiry date format and ensure it's not expired
export function validateExpiry(expiry: string): ExpiryValidationResult {
  // Check format MM/YY
  const expiryRegex = /^(0[1-9]|1[0-2])\/(\d{2})$/;
  const match = expiry.match(expiryRegex);
  
  if (!match) {
    return {
      isValid: false,
      month: 0,
      year: 0,
      error: 'Invalid format. Use MM/YY format'
    };
  }
  
  const month = parseInt(match[1]);
  const year = parseInt(match[2]) + 2000; // Convert YY to YYYY
  
  // Check if the card is expired
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return {
      isValid: false,
      month,
      year,
      error: 'Card has expired'
    };
  }
  
  // Check if expiry is too far in the future (max 10 years)
  if (year > currentYear + 10) {
    return {
      isValid: false,
      month,
      year,
      error: 'Expiry date too far in the future'
    };
  }
  
  return {
    isValid: true,
    month,
    year
  };
}

// Validate CVV based on card brand
export function validateCVV(cvv: string, cardBrand: string): boolean {
  const cvvRegex = /^\d+$/;
  
  if (!cvvRegex.test(cvv)) {
    return false;
  }
  
  // American Express requires 4 digits, others require 3
  if (cardBrand === 'American Express') {
    return cvv.length === 4;
  } else {
    return cvv.length === 3;
  }
}

// Comprehensive card validation
export function validateCard(cardDetails: CardDetails): CardValidationResult {
  const errors: string[] = [];
  
  // Clean card number
  const cleanNumber = cardDetails.number.replace(/\s/g, '');
  
  // Validate card number format
  if (!cleanNumber) {
    errors.push('Card number is required');
  } else if (!/^\d{13,19}$/.test(cleanNumber)) {
    errors.push('Card number must be 13-19 digits');
  } else if (!validateCardNumberLuhn(cleanNumber)) {
    errors.push('Invalid card number');
  }
  
  // Detect card brand
  const brand = detectCardBrand(cleanNumber);
  if (brand === 'Unknown' && cleanNumber.length > 0) {
    errors.push('Unsupported card brand');
  }
  
  // Validate expiry
  if (!cardDetails.expiry) {
    errors.push('Expiry date is required');
  } else {
    const expiryResult = validateExpiry(cardDetails.expiry);
    if (!expiryResult.isValid) {
      errors.push(expiryResult.error || 'Invalid expiry date');
    }
  }
  
  // Validate CVV
  if (!cardDetails.cvv) {
    errors.push('CVV is required');
  } else if (!validateCVV(cardDetails.cvv, brand)) {
    const expectedLength = brand === 'American Express' ? 4 : 3;
    errors.push(`CVV must be ${expectedLength} digits for ${brand} cards`);
  }
  
  // Validate cardholder name
  if (!cardDetails.name.trim()) {
    errors.push('Cardholder name is required');
  } else if (cardDetails.name.trim().length < 2) {
    errors.push('Cardholder name must be at least 2 characters');
  } else if (!/^[a-zA-Z\s\-'\.]+$/.test(cardDetails.name.trim())) {
    errors.push('Cardholder name contains invalid characters');
  }
  
  return {
    isValid: errors.length === 0,
    brand,
    errors
  };
}

// Format card number with spaces
export function formatCardNumber(value: string): string {
  const cleanValue = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  const matches = cleanValue.match(/\d{4,16}/g);
  const match = (matches && matches[0]) || '';
  const parts = [];
  
  for (let i = 0, len = match.length; i < len; i += 4) {
    parts.push(match.substring(i, i + 4));
  }
  
  if (parts.length) {
    return parts.join(' ');
  } else {
    return cleanValue;
  }
}

// Format expiry date MM/YY
export function formatExpiry(value: string): string {
  const cleanValue = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  
  if (cleanValue.length >= 2) {
    let month = cleanValue.substring(0, 2);
    let year = cleanValue.substring(2, 4);
    
    // Auto-correct common month mistakes
    if (parseInt(month) > 12) {
      month = '12';
    }
    if (parseInt(month) === 0) {
      month = '01';
    }
    
    return month + (year ? '/' + year : '');
  }
  
  return cleanValue;
}

// Get card brand icon/color
export function getCardBrandInfo(brand: string) {
  switch (brand) {
    case 'Visa':
      return { color: '#1A1F71', textColor: 'text-blue-700' };
    case 'Mastercard':
      return { color: '#EB001B', textColor: 'text-red-600' };
    case 'American Express':
      return { color: '#006FCF', textColor: 'text-blue-600' };
    case 'Discover':
      return { color: '#FF6000', textColor: 'text-orange-600' };
    default:
      return { color: '#6B7280', textColor: 'text-gray-500' };
  }
}
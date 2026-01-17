/**
 * Input Validation Utilities
 * Comprehensive validation functions for form inputs and user data
 * Security-focused to prevent injection attacks, XSS, and data corruption
 */

// =====================================================
// VALIDATION RESULT TYPE
// =====================================================
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: string;
}

// =====================================================
// EMAIL VALIDATION
// =====================================================
export const validateEmail = (email: string): ValidationResult => {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }

  const trimmed = email.trim();
  
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Email is required' };
  }

  if (trimmed.length > 254) {
    return { isValid: false, error: 'Email is too long' };
  }

  // RFC 5322 compliant email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  return { isValid: true, sanitized: trimmed.toLowerCase() };
};

// =====================================================
// PHONE NUMBER VALIDATION
// =====================================================
export const validatePhone = (phone: string, required: boolean = true): ValidationResult => {
  if (!phone || typeof phone !== 'string') {
    return required 
      ? { isValid: false, error: 'Phone number is required' }
      : { isValid: true, sanitized: '' };
  }

  const trimmed = phone.trim();
  
  if (trimmed.length === 0) {
    return required
      ? { isValid: false, error: 'Phone number is required' }
      : { isValid: true, sanitized: '' };
  }

  // Remove all non-digit characters
  const digitsOnly = trimmed.replace(/\D/g, '');

  // US phone numbers should be 10 digits (or 11 with country code)
  if (digitsOnly.length < 10 || digitsOnly.length > 11) {
    return { isValid: false, error: 'Please enter a valid 10-digit phone number' };
  }

  // Format as (XXX) XXX-XXXX
  const formatted = digitsOnly.length === 11 && digitsOnly[0] === '1'
    ? digitsOnly.slice(1)
    : digitsOnly.slice(0, 10);

  return { 
    isValid: true, 
    sanitized: `(${formatted.slice(0, 3)}) ${formatted.slice(3, 6)}-${formatted.slice(6, 10)}` 
  };
};

// =====================================================
// NAME VALIDATION
// =====================================================
export const validateName = (name: string, fieldName: string = 'Name'): ValidationResult => {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: `${fieldName} is required` };
  }

  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  if (trimmed.length < 2) {
    return { isValid: false, error: `${fieldName} must be at least 2 characters` };
  }

  if (trimmed.length > 100) {
    return { isValid: false, error: `${fieldName} is too long (max 100 characters)` };
  }

  // Only allow letters, spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  if (!nameRegex.test(trimmed)) {
    return { isValid: false, error: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes` };
  }

  return { isValid: true, sanitized: trimmed };
};

// =====================================================
// ADDRESS VALIDATION
// =====================================================
export const validateAddress = (address: string): ValidationResult => {
  if (!address || typeof address !== 'string') {
    return { isValid: false, error: 'Address is required' };
  }

  const trimmed = address.trim();

  if (trimmed.length === 0) {
    return { isValid: false, error: 'Address is required' };
  }

  if (trimmed.length < 5) {
    return { isValid: false, error: 'Address is too short' };
  }

  if (trimmed.length > 200) {
    return { isValid: false, error: 'Address is too long (max 200 characters)' };
  }

  // Basic alphanumeric + common address characters
  const addressRegex = /^[a-zA-Z0-9\s,.'#-]+$/;
  if (!addressRegex.test(trimmed)) {
    return { isValid: false, error: 'Address contains invalid characters' };
  }

  return { isValid: true, sanitized: trimmed };
};

// =====================================================
// ZIP CODE VALIDATION
// =====================================================
export const validateZipCode = (zipCode: string): ValidationResult => {
  if (!zipCode || typeof zipCode !== 'string') {
    return { isValid: false, error: 'ZIP code is required' };
  }

  const trimmed = zipCode.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');

  if (digitsOnly.length !== 5 && digitsOnly.length !== 9) {
    return { isValid: false, error: 'Please enter a valid 5 or 9 digit ZIP code' };
  }

  // Format as XXXXX or XXXXX-XXXX
  const formatted = digitsOnly.length === 9
    ? `${digitsOnly.slice(0, 5)}-${digitsOnly.slice(5)}`
    : digitsOnly;

  return { isValid: true, sanitized: formatted };
};

// =====================================================
// SSN LAST 4 VALIDATION
// =====================================================
export const validateSSNLast4 = (ssn: string): ValidationResult => {
  if (!ssn || typeof ssn !== 'string') {
    return { isValid: false, error: 'Last 4 digits of SSN are required' };
  }

  const digitsOnly = ssn.replace(/\D/g, '');

  if (digitsOnly.length !== 4) {
    return { isValid: false, error: 'Please enter exactly 4 digits' };
  }

  return { isValid: true, sanitized: digitsOnly };
};

// =====================================================
// DATE VALIDATION
// =====================================================
export const validateDate = (date: string, fieldName: string = 'Date'): ValidationResult => {
  if (!date || typeof date !== 'string') {
    return { isValid: false, error: `${fieldName} is required` };
  }

  const trimmed = date.trim();
  const parsedDate = new Date(trimmed);

  if (isNaN(parsedDate.getTime())) {
    return { isValid: false, error: `Please enter a valid ${fieldName.toLowerCase()}` };
  }

  return { isValid: true, sanitized: trimmed };
};

// =====================================================
// DATE OF BIRTH VALIDATION (18+ years old)
// =====================================================
export const validateDateOfBirth = (dob: string): ValidationResult => {
  const dateResult = validateDate(dob, 'Date of birth');
  if (!dateResult.isValid) {
    return dateResult;
  }

  const birthDate = new Date(dob);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ? age - 1
    : age;

  if (actualAge < 18) {
    return { isValid: false, error: 'You must be at least 18 years old' };
  }

  if (actualAge > 120) {
    return { isValid: false, error: 'Please enter a valid date of birth' };
  }

  return { isValid: true, sanitized: dob };
};

// =====================================================
// TEXT INPUT VALIDATION (General)
// =====================================================
export const validateText = (
  text: string,
  fieldName: string,
  minLength: number = 1,
  maxLength: number = 500,
  required: boolean = true
): ValidationResult => {
  if (!text || typeof text !== 'string') {
    return required
      ? { isValid: false, error: `${fieldName} is required` }
      : { isValid: true, sanitized: '' };
  }

  const trimmed = text.trim();

  if (trimmed.length === 0 && required) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  if (trimmed.length < minLength && trimmed.length > 0) {
    return { isValid: false, error: `${fieldName} must be at least ${minLength} characters` };
  }

  if (trimmed.length > maxLength) {
    return { isValid: false, error: `${fieldName} must be less than ${maxLength} characters` };
  }

  // Check for potential XSS patterns
  const dangerousPatterns = /<script|javascript:|onerror=|onclick=|<iframe/i;
  if (dangerousPatterns.test(trimmed)) {
    return { isValid: false, error: `${fieldName} contains invalid content` };
  }

  return { isValid: true, sanitized: trimmed };
};

// =====================================================
// NUMBER VALIDATION
// =====================================================
export const validateNumber = (
  value: string | number,
  fieldName: string,
  min?: number,
  max?: number,
  required: boolean = true
): ValidationResult => {
  if (value === '' || value === null || value === undefined) {
    return required
      ? { isValid: false, error: `${fieldName} is required` }
      : { isValid: true, sanitized: '' };
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return { isValid: false, error: `${fieldName} must be a valid number` };
  }

  if (min !== undefined && num < min) {
    return { isValid: false, error: `${fieldName} must be at least ${min}` };
  }

  if (max !== undefined && num > max) {
    return { isValid: false, error: `${fieldName} must be at most ${max}` };
  }

  return { isValid: true, sanitized: num.toString() };
};

// =====================================================
// URL VALIDATION
// =====================================================
export const validateURL = (url: string, required: boolean = true): ValidationResult => {
  if (!url || typeof url !== 'string') {
    return required
      ? { isValid: false, error: 'URL is required' }
      : { isValid: true, sanitized: '' };
  }

  const trimmed = url.trim();

  if (trimmed.length === 0) {
    return required
      ? { isValid: false, error: 'URL is required' }
      : { isValid: true, sanitized: '' };
  }

  try {
    const urlObj = new URL(trimmed);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { isValid: false, error: 'URL must use http or https protocol' };
    }

    return { isValid: true, sanitized: trimmed };
  } catch {
    return { isValid: false, error: 'Please enter a valid URL' };
  }
};

// =====================================================
// LICENSE PLATE VALIDATION
// =====================================================
export const validateLicensePlate = (plate: string, required: boolean = true): ValidationResult => {
  if (!plate || typeof plate !== 'string') {
    return required
      ? { isValid: false, error: 'License plate is required' }
      : { isValid: true, sanitized: '' };
  }

  const trimmed = plate.trim().toUpperCase();

  if (trimmed.length === 0) {
    return required
      ? { isValid: false, error: 'License plate is required' }
      : { isValid: true, sanitized: '' };
  }

  if (trimmed.length < 2 || trimmed.length > 8) {
    return { isValid: false, error: 'License plate must be 2-8 characters' };
  }

  // Only alphanumeric characters
  const plateRegex = /^[A-Z0-9]+$/;
  if (!plateRegex.test(trimmed)) {
    return { isValid: false, error: 'License plate can only contain letters and numbers' };
  }

  return { isValid: true, sanitized: trimmed };
};

// =====================================================
// VEHICLE YEAR VALIDATION
// =====================================================
export const validateVehicleYear = (year: string | number): ValidationResult => {
  const currentYear = new Date().getFullYear();
  const yearNum = typeof year === 'string' ? parseInt(year, 10) : year;

  if (isNaN(yearNum)) {
    return { isValid: false, error: 'Please enter a valid year' };
  }

  if (yearNum < 1900 || yearNum > currentYear + 1) {
    return { isValid: false, error: `Year must be between 1900 and ${currentYear + 1}` };
  }

  return { isValid: true, sanitized: yearNum.toString() };
};

// =====================================================
// BATCH VALIDATION
// =====================================================
export interface ValidationErrors {
  [key: string]: string;
}

export const validateFields = (
  fields: Record<string, any>,
  validators: Record<string, (value: any) => ValidationResult>
): { isValid: boolean; errors: ValidationErrors } => {
  const errors: ValidationErrors = {};

  for (const [fieldName, validator] of Object.entries(validators)) {
    const result = validator(fields[fieldName]);
    if (!result.isValid && result.error) {
      errors[fieldName] = result.error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// =====================================================
// SANITIZE FOR DATABASE
// =====================================================
export const sanitizeForDB = (value: string): string => {
  if (!value || typeof value !== 'string') return '';
  
  // Trim whitespace
  let sanitized = value.trim();
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Normalize unicode
  sanitized = sanitized.normalize('NFC');
  
  return sanitized;
};

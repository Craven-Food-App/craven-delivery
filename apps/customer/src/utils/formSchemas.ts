/**
 * Form Validation Schemas
 * Pre-configured validation schemas for common forms
 */

import {
  validateEmail,
  validatePhone,
  validateName,
  validateAddress,
  validateZipCode,
  validateSSNLast4,
  validateDateOfBirth,
  validateText,
  validateNumber,
  validateLicensePlate,
  validateVehicleYear,
  validateFields,
  ValidationResult,
  ValidationErrors
} from './validation';

// =====================================================
// CUSTOMER ORDER FORM SCHEMA
// =====================================================
export interface CustomerOrderData {
  name: string;
  email: string;
  phone: string;
  deliveryAddress?: string;
  specialInstructions?: string;
}

export const validateCustomerOrder = (
  data: CustomerOrderData,
  deliveryMethod: 'delivery' | 'pickup'
): { isValid: boolean; errors: ValidationErrors } => {
  return validateFields(data, {
    name: (value) => validateName(value, 'Name'),
    email: (value) => validateEmail(value),
    phone: (value) => validatePhone(value),
    deliveryAddress: (value) => 
      deliveryMethod === 'delivery' 
        ? validateAddress(value)
        : { isValid: true, sanitized: '' },
    specialInstructions: (value) => 
      validateText(value, 'Special instructions', 0, 500, false)
  });
};

// =====================================================
// CONTACT FORM SCHEMA
// =====================================================
export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  category: string;
  message: string;
}

export const validateContactForm = (
  data: ContactFormData
): { isValid: boolean; errors: ValidationErrors } => {
  return validateFields(data, {
    name: (value) => validateName(value, 'Name'),
    email: (value) => validateEmail(value),
    subject: (value) => validateText(value, 'Subject', 3, 200),
    category: (value) => validateText(value, 'Category', 1, 50),
    message: (value) => validateText(value, 'Message', 10, 2000)
  });
};

// =====================================================
// DRIVER APPLICATION SCHEMA
// =====================================================
export interface DriverApplicationData {
  // Personal Info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  
  // Address
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  
  // Vehicle Info
  vehicleType: 'car' | 'bike' | 'scooter' | 'walking';
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  vehicleColor?: string;
  licensePlate?: string;
  
  // License Info
  licenseNumber: string;
  licenseState: string;
  licenseExpiry: string;
  
  // SSN
  ssn: string;
}

export const validateDriverApplication = (
  data: DriverApplicationData
): { isValid: boolean; errors: ValidationErrors } => {
  const validators: Record<string, (value: any) => ValidationResult> = {
    firstName: (value) => validateName(value, 'First name'),
    lastName: (value) => validateName(value, 'Last name'),
    email: (value) => validateEmail(value),
    phone: (value) => validatePhone(value),
    dateOfBirth: (value) => validateDateOfBirth(value),
    streetAddress: (value) => validateAddress(value),
    city: (value) => validateText(value, 'City', 2, 100),
    state: (value) => validateText(value, 'State', 2, 2),
    zipCode: (value) => validateZipCode(value),
    licenseNumber: (value) => validateText(value, 'License number', 5, 20),
    licenseState: (value) => validateText(value, 'License state', 2, 2),
    licenseExpiry: (value) => validateText(value, 'License expiry', 1, 20),
    ssn: (value) => validateSSNLast4(value)
  };

  // Add vehicle validators if not walking
  if (data.vehicleType !== 'walking') {
    validators.vehicleMake = (value) => validateText(value, 'Vehicle make', 2, 50);
    validators.vehicleModel = (value) => validateText(value, 'Vehicle model', 1, 50);
    validators.vehicleYear = (value) => validateVehicleYear(value);
    validators.vehicleColor = (value) => validateText(value, 'Vehicle color', 2, 30);
    validators.licensePlate = (value) => validateLicensePlate(value);
  }

  return validateFields(data, validators);
};

// =====================================================
// RESTAURANT PARTNER FORM SCHEMA
// =====================================================
export interface RestaurantPartnerData {
  restaurantName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  cuisineType: string;
  description?: string;
}

export const validateRestaurantPartner = (
  data: RestaurantPartnerData
): { isValid: boolean; errors: ValidationErrors } => {
  return validateFields(data, {
    restaurantName: (value) => validateText(value, 'Restaurant name', 2, 100),
    ownerName: (value) => validateName(value, 'Owner name'),
    email: (value) => validateEmail(value),
    phone: (value) => validatePhone(value),
    address: (value) => validateAddress(value),
    city: (value) => validateText(value, 'City', 2, 100),
    state: (value) => validateText(value, 'State', 2, 2),
    zipCode: (value) => validateZipCode(value),
    cuisineType: (value) => validateText(value, 'Cuisine type', 2, 50),
    description: (value) => validateText(value, 'Description', 0, 1000, false)
  });
};

// =====================================================
// INVESTOR INTEREST FORM SCHEMA
// =====================================================
export interface InvestorInterestData {
  name: string;
  email: string;
  phone: string;
  company?: string;
  investmentRange: string;
  message?: string;
}

export const validateInvestorInterest = (
  data: InvestorInterestData
): { isValid: boolean; errors: ValidationErrors } => {
  return validateFields(data, {
    name: (value) => validateName(value, 'Name'),
    email: (value) => validateEmail(value),
    phone: (value) => validatePhone(value),
    company: (value) => validateText(value, 'Company', 0, 100, false),
    investmentRange: (value) => validateText(value, 'Investment range', 1, 50),
    message: (value) => validateText(value, 'Message', 0, 1000, false)
  });
};

// =====================================================
// PAYMENT METHOD FORM SCHEMA
// =====================================================
export interface PaymentMethodData {
  cardholderName: string;
  // Note: Card number, CVV, expiry should be handled by Stripe
  // We only validate the cardholder name on our side
  billingZip: string;
}

export const validatePaymentMethod = (
  data: PaymentMethodData
): { isValid: boolean; errors: ValidationErrors } => {
  return validateFields(data, {
    cardholderName: (value) => validateName(value, 'Cardholder name'),
    billingZip: (value) => validateZipCode(value)
  });
};

// =====================================================
// PROFILE UPDATE SCHEMA
// =====================================================
export interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export const validateProfileUpdate = (
  data: ProfileUpdateData
): { isValid: boolean; errors: ValidationErrors } => {
  const validators: Record<string, (value: any) => ValidationResult> = {};

  if (data.firstName !== undefined) {
    validators.firstName = (value) => validateName(value, 'First name');
  }
  if (data.lastName !== undefined) {
    validators.lastName = (value) => validateName(value, 'Last name');
  }
  if (data.phone !== undefined) {
    validators.phone = (value) => validatePhone(value);
  }
  if (data.address !== undefined) {
    validators.address = (value) => validateAddress(value);
  }
  if (data.city !== undefined) {
    validators.city = (value) => validateText(value, 'City', 2, 100);
  }
  if (data.state !== undefined) {
    validators.state = (value) => validateText(value, 'State', 2, 2);
  }
  if (data.zipCode !== undefined) {
    validators.zipCode = (value) => validateZipCode(value);
  }

  return validateFields(data, validators);
};

// =====================================================
// SUPPORT TICKET SCHEMA
// =====================================================
export interface SupportTicketData {
  subject: string;
  category: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  description: string;
}

export const validateSupportTicket = (
  data: SupportTicketData
): { isValid: boolean; errors: ValidationErrors } => {
  return validateFields(data, {
    subject: (value) => validateText(value, 'Subject', 5, 200),
    category: (value) => validateText(value, 'Category', 2, 50),
    priority: (value) => {
      const validPriorities = ['low', 'normal', 'high', 'urgent'];
      if (!validPriorities.includes(value)) {
        return { isValid: false, error: 'Invalid priority level' };
      }
      return { isValid: true, sanitized: value };
    },
    description: (value) => validateText(value, 'Description', 20, 5000)
  });
};

// =====================================================
// HELPER: Sanitize All Form Data
// =====================================================
export const sanitizeFormData = <T extends Record<string, any>>(data: T): T => {
  const sanitized = { ...data };
  
  for (const key in sanitized) {
    const value = sanitized[key];
    if (typeof value === 'string') {
      sanitized[key] = value.trim() as any;
    }
  }
  
  return sanitized;
};


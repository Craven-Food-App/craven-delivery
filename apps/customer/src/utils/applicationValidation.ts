import { ApplicationData, ApplicationFiles } from '@/types/application';

export const validateStep = (step: number, data: ApplicationData, files: ApplicationFiles): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  switch (step) {
    case 1: // Account Setup
      if (!data.email?.trim()) errors.push('Email is required');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('Invalid email format');
      if (!data.firstName?.trim()) errors.push('First name is required');
      if (!data.lastName?.trim()) errors.push('Last name is required');
      if (!data.phone?.trim()) errors.push('Phone number is required');
      if (!data.dateOfBirth) errors.push('Date of birth is required');
      else {
        const age = new Date().getFullYear() - new Date(data.dateOfBirth).getFullYear();
        if (age < 18) errors.push('You must be at least 18 years old');
      }
      break;

    case 2: // Address
      if (!data.streetAddress?.trim()) errors.push('Street address is required');
      if (!data.city?.trim()) errors.push('City is required');
      if (!data.state) errors.push('State is required');
      if (!data.zipCode?.trim()) errors.push('ZIP code is required');
      else if (!/^\d{5}(-\d{4})?$/.test(data.zipCode)) errors.push('Invalid ZIP code format');
      break;

    case 3: // Vehicle & License
      if (!data.vehicleType) errors.push('Vehicle type is required');
      if (data.vehicleType && data.vehicleType !== 'walking') {
        if (!data.vehicleMake?.trim()) errors.push('Vehicle make is required');
        if (!data.vehicleModel?.trim()) errors.push('Vehicle model is required');
        if (!data.vehicleYear?.trim()) errors.push('Vehicle year is required');
        else {
          const year = parseInt(data.vehicleYear);
          if (isNaN(year) || year < 1990 || year > new Date().getFullYear() + 1) {
            errors.push('Invalid vehicle year');
          }
        }
        if (!data.vehicleColor?.trim()) errors.push('Vehicle color is required');
        if (!data.licensePlate?.trim()) errors.push('License plate is required');
      }
      if (!data.licenseNumber?.trim()) errors.push('Driver\'s license number is required');
      if (!data.licenseState) errors.push('License state is required');
      if (!data.licenseExpiry) errors.push('License expiry date is required');
      else {
        const expiry = new Date(data.licenseExpiry);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day for fair comparison
        if (expiry < today) errors.push('Driver\'s license has expired');
      }
      break;

    case 4: // Payment & Tax Info
      if (!data.payoutMethod) errors.push('Payout method is required');
      
      if (data.payoutMethod === 'direct_deposit') {
        if (!data.bankAccountType) errors.push('Account type is required');
        if (!data.routingNumber?.trim()) errors.push('Routing number is required');
        if (!data.accountNumber?.trim()) errors.push('Account number is required');
      }
      
      if (data.payoutMethod === 'cashapp') {
        if (!data.cashTag?.trim()) errors.push('Cash App tag is required');
      }
      
      if (!data.ssn?.trim()) errors.push('Social Security Number is required');
      else if (!/^\d{9}$/.test(data.ssn.replace(/-/g, ''))) errors.push('SSN must be exactly 9 digits');
      
      if (!data.backgroundCheckConsent) errors.push('Background check authorization is required');
      break;

    case 5: // Documents
      if (!files.driversLicenseFront) errors.push('Driver\'s license (front) is required');
      break;

    default:
      break;
  }

  return { isValid: errors.length === 0, errors };
};

export const validatePassword = (password: string, confirmPassword: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!password) errors.push('Password is required');
  else {
    if (password.length < 6) errors.push('Password must be at least 6 characters');
    if (password !== confirmPassword) errors.push('Passwords do not match');
  }
  
  return { isValid: errors.length === 0, errors };
};

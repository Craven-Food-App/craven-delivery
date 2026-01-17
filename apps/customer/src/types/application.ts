// Centralized type definitions for driver applications

export interface ApplicationData {
  // Personal Information
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
  
  // Vehicle Information
  vehicleType: 'car' | 'bike' | 'scooter' | 'walking' | '';
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleColor: string;
  licensePlate: string;
  
  // Driver's License
  licenseNumber: string;
  licenseState: string;
  licenseExpiry: string;
  
  // Tax Information
  ssn: string;
  
  // Payout Information
  payoutMethod: 'direct_deposit' | 'cashapp' | '';
  
  // Banking Information (for Direct Deposit)
  bankAccountType: 'checking' | 'savings' | '';
  routingNumber: string;
  accountNumber: string;
  
  // Cash App Information
  cashTag: string;

  // Background Check
  backgroundCheckConsent: boolean;
}

export interface ApplicationFiles {
  driversLicenseFront?: File;
  driversLicenseBack?: File;
  insuranceDocument?: File;
  vehicleRegistration?: File;
}

export interface ApplicationStepProps {
  data: ApplicationData;
  files: ApplicationFiles;
  onUpdate: (field: keyof ApplicationData, value: any) => void;
  onFileUpload: (field: keyof ApplicationFiles, file: File) => void;
  onNext: () => void;
  onBack: () => void;
  isValid: boolean;
}

export const INITIAL_APPLICATION_DATA: ApplicationData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  streetAddress: "",
  city: "",
  state: "",
  zipCode: "",
  vehicleType: "",
  vehicleMake: "",
  vehicleModel: "",
  vehicleYear: "",
  vehicleColor: "",
  licensePlate: "",
  licenseNumber: "",
  licenseState: "",
  licenseExpiry: "",
  ssn: "",
  payoutMethod: "",
  bankAccountType: "",
  routingNumber: "",
  accountNumber: "",
  cashTag: "",
  backgroundCheckConsent: false
};

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", 
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", 
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", 
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", 
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
] as const;

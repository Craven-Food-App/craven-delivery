// Document verification service for driver applications - OCR disabled to reduce build size

export class DocumentVerificationService {
  // OCR functionality disabled
  private static async getOCRPipeline() {
    console.warn('OCR functionality is currently disabled');
    return null;
  }

  // Allow preloading from UI to make verification feel instant
  static async preload() {
    console.warn('OCR preload skipped - functionality disabled');
  }

  // Extract text from image - returns empty array since OCR is disabled
  static async extractTextFromImage(imageUrl: string): Promise<string[]> {
    console.warn('OCR text extraction is disabled');
    return [];
  }

  // Verify driver license - returns mock approval since OCR is disabled
  static async verifyDriverLicense(imageUrl: string): Promise<{
    isValid: boolean;
    confidence: number;
    extractedData?: {
      name?: string;
      licenseNumber?: string;
      expirationDate?: string;
      state?: string;
    };
    errors: string[];
  }> {
    console.warn('Driver license verification is disabled - returning manual review required');
    return {
      isValid: false,
      confidence: 0,
      errors: ['Automated verification is currently disabled. Manual review required.']
    };
  }

  // Verify vehicle registration - returns mock result since OCR is disabled
  static async verifyVehicleRegistration(imageUrl: string): Promise<{
    isValid: boolean;
    confidence: number;
    extractedData?: {
      vehicleMake?: string;
      vehicleModel?: string;
      year?: string;
      plateNumber?: string;
      expirationDate?: string;
    };
    errors: string[];
  }> {
    console.warn('Vehicle registration verification is disabled - returning manual review required');
    return {
      isValid: false,
      confidence: 0,
      errors: ['Automated verification is currently disabled. Manual review required.']
    };
  }

  // Verify insurance - returns mock result since OCR is disabled
  static async verifyInsurance(imageUrl: string): Promise<{
    isValid: boolean;
    confidence: number;
    extractedData?: {
      policyNumber?: string;
      provider?: string;
      expirationDate?: string;
      vehicleCovered?: string;
    };
    errors: string[];
  }> {
    console.warn('Insurance verification is disabled - returning manual review required');
    return {
      isValid: false,
      confidence: 0,
      errors: ['Automated verification is currently disabled. Manual review required.']
    };
  }
}

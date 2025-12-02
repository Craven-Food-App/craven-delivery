// Document verification service for driver applications
export class DocumentVerificationService {
  private static ocrPipeline: any = null;

  // Initialize OCR pipeline
  private static async getOCRPipeline() {
    if (this.ocrPipeline) return this.ocrPipeline;
    try {
      // Dynamic import to avoid build-time resolution issues
      const { pipeline } = await import('@huggingface/transformers');
      // Try WebGPU first for significant speedups on supported devices
      this.ocrPipeline = await pipeline('image-to-text', 'Xenova/trocr-base-printed', {
        device: 'webgpu'
      });
    } catch (err) {
      console.warn('WebGPU unavailable, falling back to WASM', err);
      const { pipeline } = await import('@huggingface/transformers');
      this.ocrPipeline = await pipeline('image-to-text', 'Xenova/trocr-base-printed', {
        device: 'wasm'
      });
    }
    return this.ocrPipeline;
  }

  // Allow preloading from UI to make verification feel instant
  static async preload() {
    try {
      await this.getOCRPipeline();
    } catch (e) {
      console.error('OCR preload failed:', e);
    }
  }

  // Extract text from image using OCR
  static async extractText(imageFile: File): Promise<string> {
    try {
      const ocr = await this.getOCRPipeline();
      
      // Convert file to data URL
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      const result: any = await ocr(dataUrl);
      const text = Array.isArray(result)
        ? (result.map((r: any) => r?.generated_text).filter(Boolean).join(' ') || '')
        : (result?.generated_text || '');
      return text;
    } catch (error) {
      console.error('OCR extraction error:', error);
      return '';
    }
  }

  // Verify driver's license
  static async verifyDriversLicense(imageFile: File, applicantData: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
  }): Promise<{
    isValid: boolean;
    confidence: number;
    extractedData: any;
    issues: string[];
  }> {
    try {
      const extractedText = await this.extractText(imageFile);
      const issues: string[] = [];
      let confidence = 0;

      // Check for common driver's license keywords
      const hasDriversLicense = /driver.?s?\s+licen[cs]e|licen[cs]e|dl/i.test(extractedText);
      const hasLicenseNumber = /\b[A-Z0-9]{8,}\b/.test(extractedText);
      
      if (!hasDriversLicense) {
        issues.push("Document doesn't appear to be a driver's license");
      } else {
        confidence += 30;
      }

      if (!hasLicenseNumber) {
        issues.push("No valid license number detected");
      } else {
        confidence += 20;
      }

      // Check for name match (fuzzy matching)
      const nameMatch = this.fuzzyNameMatch(extractedText, applicantData.firstName, applicantData.lastName);
      if (nameMatch.score < 0.6) {
        issues.push(`Name mismatch detected (confidence: ${Math.round(nameMatch.score * 100)}%)`);
      } else {
        confidence += 30;
      }

      // Check for date of birth
      const dobMatch = this.extractDateOfBirth(extractedText, applicantData.dateOfBirth);
      if (!dobMatch.found) {
        issues.push("Date of birth not found or doesn't match");
      } else {
        confidence += 20;
      }

      return {
        isValid: issues.length === 0,
        confidence: Math.min(confidence, 100),
        extractedData: {
          text: extractedText,
          nameMatch: nameMatch,
          dobMatch: dobMatch
        },
        issues
      };
    } catch (error) {
      console.error('Driver license verification error:', error);
      return {
        isValid: false,
        confidence: 0,
        extractedData: {},
        issues: ['Verification service temporarily unavailable']
      };
    }
  }

  // Verify insurance document
  static async verifyInsurance(imageFile: File): Promise<{
    isValid: boolean;
    confidence: number;
    extractedData: any;
    issues: string[];
  }> {
    try {
      const extractedText = await this.extractText(imageFile);
      const issues: string[] = [];
      let confidence = 0;

      // Check for insurance keywords
      const hasInsurance = /insurance|policy|coverage|liability|auto|vehicle/i.test(extractedText);
      const hasPolicyNumber = /policy\s*#?\s*[A-Z0-9]{6,}/i.test(extractedText);
      const hasEffectiveDate = /effective|valid|expires?/i.test(extractedText);

      if (!hasInsurance) {
        issues.push("Document doesn't appear to be an insurance document");
      } else {
        confidence += 40;
      }

      if (!hasPolicyNumber) {
        issues.push("No policy number detected");
      } else {
        confidence += 30;
      }

      if (!hasEffectiveDate) {
        issues.push("No effective/expiration date found");
      } else {
        confidence += 30;
      }

      // Check if document appears to be current
      const isExpired = this.checkIfExpired(extractedText);
      if (isExpired) {
        issues.push("Insurance document appears to be expired");
      }

      return {
        isValid: issues.length === 0,
        confidence: Math.min(confidence, 100),
        extractedData: {
          text: extractedText,
          policyNumber: this.extractPolicyNumber(extractedText),
          effectiveDates: this.extractDates(extractedText)
        },
        issues
      };
    } catch (error) {
      console.error('Insurance verification error:', error);
      return {
        isValid: false,
        confidence: 0,
        extractedData: {},
        issues: ['Verification service temporarily unavailable']
      };
    }
  }

  // Fuzzy name matching
  private static fuzzyNameMatch(text: string, firstName: string, lastName: string): { score: number; found: string[] } {
    const normalizedText = text.toLowerCase().replace(/[^a-z\s]/g, ' ');
    const words = normalizedText.split(/\s+/);
    
    const firstNameNorm = firstName.toLowerCase();
    const lastNameNorm = lastName.toLowerCase();
    
    let firstNameScore = 0;
    let lastNameScore = 0;
    const found: string[] = [];

    for (const word of words) {
      if (word.length < 2) continue;
      
      // Check first name
      if (this.levenshteinDistance(word, firstNameNorm) <= 2) {
        firstNameScore = Math.max(firstNameScore, 1 - this.levenshteinDistance(word, firstNameNorm) / firstNameNorm.length);
        found.push(word);
      }
      
      // Check last name
      if (this.levenshteinDistance(word, lastNameNorm) <= 2) {
        lastNameScore = Math.max(lastNameScore, 1 - this.levenshteinDistance(word, lastNameNorm) / lastNameNorm.length);
        found.push(word);
      }
    }

    return {
      score: (firstNameScore + lastNameScore) / 2,
      found
    };
  }

  // Extract date of birth
  private static extractDateOfBirth(text: string, expectedDob: Date): { found: boolean; dates: string[] } {
    const datePatterns = [
      /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
      /\b\d{1,2}-\d{1,2}-\d{4}\b/g,
      /\b\d{4}-\d{1,2}-\d{1,2}\b/g
    ];

    const dates: string[] = [];
    for (const pattern of datePatterns) {
      const matches = text.match(pattern) || [];
      dates.push(...matches);
    }

    const expectedYear = expectedDob.getFullYear();
    const foundExpectedYear = dates.some(date => date.includes(expectedYear.toString()));

    return {
      found: foundExpectedYear,
      dates
    };
  }

  // Extract policy number
  private static extractPolicyNumber(text: string): string | null {
    const policyPattern = /policy\s*#?\s*([A-Z0-9]{6,})/i;
    const match = text.match(policyPattern);
    return match ? match[1] : null;
  }

  // Extract dates
  private static extractDates(text: string): string[] {
    const datePatterns = [
      /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
      /\b\d{1,2}-\d{1,2}-\d{4}\b/g,
      /\b\d{4}-\d{1,2}-\d{1,2}\b/g
    ];

    const dates: string[] = [];
    for (const pattern of datePatterns) {
      const matches = text.match(pattern) || [];
      dates.push(...matches);
    }
    return dates;
  }

  // Check if document is expired
  private static checkIfExpired(text: string): boolean {
    const currentYear = new Date().getFullYear();
    const yearPattern = /\b(19|20)\d{2}\b/g;
    const years = text.match(yearPattern)?.map(y => parseInt(y)) || [];
    
    // If any year is significantly in the past, might be expired
    return years.some(year => year < currentYear - 1);
  }

  // Levenshtein distance for fuzzy matching
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }
}
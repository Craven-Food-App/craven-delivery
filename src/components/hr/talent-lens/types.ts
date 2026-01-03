// TalentLens TypeScript Types

export interface Applicant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  linkedinUrl?: string;
  currentRole: string;
  currentCompany: string;
  yearsExperience: number;
  location: string;
  skills: string[];
  education: string;
  summary?: string;
  appliedDate: Date | string;
  status: 'new' | 'reviewing' | 'shortlisted' | 'rejected' | 'offered';
  fitScore?: number;
  aiAnalysis?: ApplicantAnalysis;
  jobPostingId?: string;
  jobPostingTitle?: string;
  resumeFilePath?: string;
  resumeText?: string;
  source?: 'manual' | 'csv' | 'pdf' | 'linkedin';
  createdAt?: string;
  updatedAt?: string;
}

export interface ApplicantAnalysis {
  overallFit: 'excellent' | 'good' | 'moderate' | 'poor';
  score: number; // 0-100
  strengths: string[];
  concerns: string[];
  recommendedOffer?: OfferRecommendation;
  reasoning: string;
}

export interface OfferRecommendation {
  salaryMin: number;
  salaryMax: number;
  salaryRecommended: number;
  title: string;
  benefits: string[];
  startDateSuggestion: string;
}

export interface JobPosting {
  id: string;
  title: string;
  department: string;
  location: string;
  salaryRange: {
    min: number;
    max: number;
  };
  requirements: string[];
  description: string;
  applicantCount?: number;
  postedDate: Date | string;
  status: 'active' | 'paused' | 'closed';
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardStats {
  totalApplicants: number;
  newApplicants: number;
  shortlisted: number;
  offersExtended: number;
  trendUp?: boolean;
}


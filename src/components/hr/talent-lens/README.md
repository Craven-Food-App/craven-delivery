# TalentLens - Applicant Screening System

## Overview

TalentLens is an AI-powered applicant tracking and screening system that helps recruiters efficiently process job applicants. It parses resume data, analyzes candidate fit, and provides intelligent recommendations for hiring decisions.

## Features

- **Job Posting Management**: Create and manage job postings with requirements and salary ranges
- **Applicant Import**: 
  - CSV import with column mapping
  - Bulk PDF resume upload with automatic parsing
- **AI-Powered Analysis**: 
  - Fit score calculation (0-100)
  - Strengths and concerns identification
  - Offer recommendations with salary ranges
- **Dashboard**: 
  - Statistics overview
  - Filtering and search
  - Visual fit score indicators
- **Detail View**: Comprehensive applicant profiles with AI analysis

## Setup Instructions

### 1. Database Migration

Run the migration to create the necessary tables:

```bash
# The migration file is located at:
supabase/migrations/20260101154854_create_talent_lens_system.sql
```

Apply it using your Supabase CLI or dashboard.

### 2. Environment Variables

Ensure the following environment variables are set in your Supabase project:

- `OPENAI_API_KEY`: Required for AI analysis functionality

Set this in Supabase Dashboard → Project Settings → Edge Functions → Secrets

### 3. Deploy Edge Function

Deploy the `analyze-applicant` edge function:

```bash
supabase functions deploy analyze-applicant
```

### 4. Install Dependencies

The `pdfjs-dist` package has been added to `package.json`. Install dependencies:

```bash
npm install
```

## Usage

### Accessing TalentLens

1. Navigate to the HR Portal (`/hr-portal`)
2. Click on the "TalentLens" tab in the sidebar

### Creating Job Postings

Job postings can be created directly in the database or through the UI (if you add a job posting form). The system expects job postings in the `job_postings` table.

### Importing Applicants

#### CSV Import

1. Click "Import Applicants" button
2. Select "CSV Import" mode
3. Upload a CSV file with columns:
   - `name` (required)
   - `email` (required)
   - `currentRole` (required)
   - `currentCompany` (required)
   - `phone` (optional)
   - `linkedin` or `linkedinUrl` (optional)
   - `yearsExperience` or `experience` (optional)
   - `location` (optional)
   - `skills` (semicolon-separated, optional)
   - `education` (optional)
   - `summary` (optional)

#### PDF Resume Import

1. Click "Import Applicants" button
2. Select "PDF Resume" mode
3. Drag and drop PDF files or click to upload
4. The system will automatically parse:
   - Name, email, phone
   - LinkedIn URL
   - Current role and company
   - Years of experience
   - Skills
   - Education
   - Summary

### Analyzing Candidates

1. Click on an applicant card to view details
2. In the detail panel, click "Analyze Candidate"
3. The AI will:
   - Calculate fit score (0-100)
   - Identify strengths and concerns
   - Generate offer recommendations
   - Provide detailed reasoning

### Filtering and Search

- **Search**: Search by name, email, company, or skills
- **Status Filter**: Filter by application status (new, reviewing, shortlisted, rejected, offered)
- **Fit Score Filter**: Filter by fit score range (excellent, good, moderate, poor)

## Database Schema

### Tables

- `job_postings`: Stores job posting information
- `job_applicants`: Stores applicant data and AI analysis
- `offer_recommendations`: Stores AI-generated offer recommendations

See the migration file for full schema details.

## Components

- `TalentLensDashboard.tsx`: Main dashboard component
- `JobPostingSidebar.tsx`: Sidebar with job posting list
- `ApplicantGrid.tsx`: Grid view of applicants
- `ApplicantCard.tsx`: Individual applicant card
- `ApplicantDetailPanel.tsx`: Slide-out detail panel
- `StatsCards.tsx`: Dashboard statistics
- `FilterBar.tsx`: Filtering and search controls
- `ImportModal.tsx`: CSV and PDF import modals
- `ResumeParser.ts`: PDF parsing utility
- `types.ts`: TypeScript type definitions

## AI Analysis

The AI analysis uses OpenAI's GPT-4o-mini model to:

1. **Calculate Fit Score** (0-100) based on:
   - Skills match (40% weight)
   - Experience level (25% weight)
   - Education relevance (15% weight)
   - Location compatibility (10% weight)
   - Role similarity (10% weight)

2. **Identify Strengths**: Skills, experience, or qualifications that exceed requirements

3. **Identify Concerns**: Missing skills, experience gaps, or potential issues

4. **Generate Offer Recommendations**:
   - Salary range (min, max, recommended)
   - Suggested job title
   - Benefits package
   - Suggested start date

## Notes

- PDF parsing accuracy depends on resume format quality
- AI analysis requires an active OpenAI API key
- All applicant data is stored securely in Supabase with RLS policies
- The system supports bulk operations for efficient processing

## Future Enhancements

- LinkedIn API integration for direct applicant import
- Advanced filtering and sorting options
- Email integration for candidate communication
- Interview scheduling
- Automated email notifications
- Custom scoring criteria configuration




























// PDF Resume Parser Utility
// Note: Requires pdfjs-dist package: npm install pdfjs-dist

export interface ParsedResume {
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
}

// Skill database for extraction
const SKILL_DATABASE = [
  // Programming languages
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin',
  // Frontend frameworks
  'React', 'Angular', 'Vue', 'Next.js', 'Svelte', 'Ember',
  // Backend frameworks
  'Node.js', 'Django', 'Flask', 'Spring', 'Express', 'FastAPI', 'Laravel', 'Rails',
  // Cloud platforms
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform',
  // Databases
  'PostgreSQL', 'MongoDB', 'MySQL', 'Redis', 'Cassandra', 'Elasticsearch',
  // Tools & Methodologies
  'Git', 'Jenkins', 'CI/CD', 'Agile', 'Scrum', 'DevOps', 'Microservices', 'REST API', 'GraphQL',
  // Design
  'Figma', 'Adobe XD', 'Sketch', 'Photoshop', 'Illustrator',
  // Other
  'Machine Learning', 'Data Science', 'TensorFlow', 'PyTorch', 'SQL', 'NoSQL',
];

export async function parsePDFResume(file: File): Promise<ParsedResume> {
  console.log('[ResumeParser] Starting PDF parse for:', file.name);
  
  try {
    // Dynamic import of pdfjs-dist with proper error handling
    let pdfjsLib: any;
    try {
      console.log('[ResumeParser] Attempting to import pdfjs-dist...');
      pdfjsLib = await import('pdfjs-dist');
      console.log('[ResumeParser] pdfjs-dist imported successfully, version:', pdfjsLib.version);
    } catch (importError: any) {
      console.error('[ResumeParser] Failed to import pdfjs-dist:', importError);
      throw new Error(`Failed to load PDF parser: ${importError.message}`);
    }
    
    // Set worker - use local file from public folder (most reliable)
    if (pdfjsLib.GlobalWorkerOptions) {
      // Use local worker file (copied to public folder during build)
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      console.log('[ResumeParser] PDF worker configured to use local file');
    }

    console.log('[ResumeParser] Reading file array buffer...');
    const arrayBuffer = await file.arrayBuffer();
    console.log('[ResumeParser] File size:', arrayBuffer.byteLength, 'bytes');
    
    console.log('[ResumeParser] Loading PDF document...');
    const pdf = await pdfjsLib.getDocument({ 
      data: arrayBuffer,
      verbosity: 0 // Suppress warnings
    }).promise;
    
    console.log('[ResumeParser] PDF loaded, pages:', pdf.numPages);
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`[ResumeParser] Extracting text from page ${i}...`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Handle different text content structures
      let pageText = '';
      if (textContent.items && Array.isArray(textContent.items)) {
        // Standard structure: items array with str property
        pageText = textContent.items
          .map((item: any) => {
            if (typeof item === 'string') return item;
            if (item.str) return item.str;
            if (item.text) return item.text;
            return '';
          })
          .filter((text: string) => text && text.trim().length > 0)
          .join(' ');
      } else if (textContent.text) {
        // Alternative structure: direct text property
        pageText = textContent.text;
      } else {
        // Try to get text using the page's getTextContent method differently
        try {
          const pageTextObj = await page.getTextContent({ normalizeWhitespace: true });
          if (pageTextObj.items) {
            pageText = pageTextObj.items.map((item: any) => item.str || item.text || '').join(' ');
          }
        } catch (e) {
          console.warn(`[ResumeParser] Could not extract text from page ${i}:`, e);
        }
      }
      
      fullText += pageText + '\n';
      console.log(`[ResumeParser] Page ${i} extracted ${pageText.length} characters`);
      if (pageText.length > 0) {
        console.log(`[ResumeParser] Page ${i} sample text:`, pageText.substring(0, 100));
      }
    }

    console.log('[ResumeParser] Total text extracted:', fullText.length, 'characters');
    console.log('[ResumeParser] First 200 chars:', fullText.substring(0, 200));

    if (!fullText || fullText.trim().length === 0) {
      console.warn('[ResumeParser] No text extracted from PDF!');
      throw new Error('No text could be extracted from the PDF. The file may be image-based or corrupted.');
    }

    // Extract information
    console.log('[ResumeParser] Extracting information from text...');
    const email = extractEmail(fullText);
    const phone = extractPhone(fullText);
    const linkedinUrl = extractLinkedIn(fullText);
    const name = extractName(fullText, file.name);
    const { currentRole, currentCompany } = extractCurrentPosition(fullText);
    const yearsExperience = calculateExperience(fullText);
    const location = extractLocation(fullText);
    const skills = extractSkills(fullText);
    const education = extractEducation(fullText);
    const summary = extractSummary(fullText);

    console.log('[ResumeParser] Extraction results:', {
      name,
      email,
      phone,
      currentRole,
      currentCompany,
      yearsExperience,
      location,
      skillsCount: skills.length,
      education: education ? 'found' : 'not found',
    });

    const result = {
      name,
      email: email || '',
      phone,
      linkedinUrl,
      currentRole: currentRole || '',
      currentCompany: currentCompany || '',
      yearsExperience,
      location: location || '',
      skills,
      education: education || '',
      summary,
    };

    console.log('[ResumeParser] Parse completed successfully');
    return result;
  } catch (error: any) {
    console.error('[ResumeParser] Error parsing PDF:', error);
    console.error('[ResumeParser] Error stack:', error.stack);
    
    // Show user-friendly error
    const errorMessage = error.message || 'Unknown error occurred while parsing PDF';
    
    // Still return something, but with error indication
    return {
      name: file.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' '),
      email: '',
      currentRole: '',
      currentCompany: '',
      yearsExperience: 0,
      location: '',
      skills: [],
      education: '',
      summary: `Error: ${errorMessage}`,
    };
  }
}

function extractEmail(text: string): string | null {
  // Strict email regex - only match valid email addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const matches = text.match(emailRegex);
  
  if (!matches || matches.length === 0) {
    return null;
  }
  
  // Return the first valid email found
  // Filter out common false positives
  const validEmail = matches.find(email => {
    // Exclude emails that look like file paths or URLs
    if (email.includes('://') || email.startsWith('www.')) {
      return false;
    }
    // Must have a valid domain extension
    if (!email.match(/\.(com|org|net|edu|gov|io|co|us|uk|ca|au|de|fr|es|it|nl|be|ch|at|se|no|dk|fi|pl|cz|ie|nz|jp|cn|in|br|mx|ar|cl|co|pe|za|ae|sa|il|tr|ru|kr|sg|my|th|ph|id|vn|hk|tw|asia|tech|dev|app|ai|me|info|biz|name|pro|xyz)$/i)) {
      return false;
    }
    return true;
  });
  
  return validEmail || matches[0] || null;
}

function extractPhone(text: string): string | undefined {
  const phoneRegex = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
  const match = text.match(phoneRegex);
  return match ? match[0].trim() : undefined;
}

function extractLinkedIn(text: string): string | undefined {
  const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/gi;
  const match = text.match(linkedinRegex);
  if (match) {
    let url = match[0];
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    return url;
  }
  return undefined;
}

function extractName(text: string, filename: string): string {
  // Common words that should NOT be considered names
  const excludeWords = [
    'THE', 'AND', 'OR', 'OF', 'RESUME', 'CV', 'CURRICULUM', 'VITAE', 'PHONE', 'EMAIL',
    'ADDRESS', 'CONTACT', 'SUMMARY', 'OBJECTIVE', 'PROFILE', 'EXPERIENCE', 'EDUCATION',
    'SKILLS', 'PROJECTS', 'CERTIFICATIONS', 'AWARDS', 'PUBLICATIONS', 'LANGUAGES',
    'REFERENCES', 'LINKEDIN', 'GITHUB', 'PORTFOLIO', 'WEBSITE', 'HTTP', 'HTTPS', 'WWW',
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER',
    'OCTOBER', 'NOVEMBER', 'DECEMBER', 'PRESENT', 'CURRENT', 'TO', 'FROM'
  ];
  
  // First, try to find explicit "Name:" labels (highest priority)
  const nameLabelPatterns = [
    /(?:^|\n)(?:name|full\s+name|applicant\s+name|candidate\s+name):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i,
    /(?:^|\n)(?:name|full\s+name|applicant\s+name|candidate\s+name)\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i,
  ];
  
  for (const pattern of nameLabelPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const nameCandidate = match[1].trim();
      const nameWords = nameCandidate.split(/\s+/);
      if (nameWords.length >= 2 && nameWords.length <= 4) {
        const hasExcluded = nameWords.some(w => excludeWords.includes(w.toUpperCase()));
        if (!hasExcluded) {
          return nameCandidate;
        }
      }
    }
  }
  
  // Look at the first 10 lines of the document (where names typically appear)
  const lines = text.split('\n').slice(0, 10).map(line => line.trim()).filter(line => line.length > 0);
  
  for (const line of lines) {
    // Skip lines that contain email addresses, phone numbers, or URLs
    if (line.match(/@|http|www\.|linkedin|github|phone|tel:|fax/i)) {
      continue;
    }
    
    // Skip lines that are clearly section headers
    if (line.match(/^(SUMMARY|OBJECTIVE|PROFILE|EXPERIENCE|EDUCATION|SKILLS|PROJECTS|CERTIFICATIONS|AWARDS|PUBLICATIONS|LANGUAGES|REFERENCES|CONTACT|ADDRESS|WORK|EMPLOYMENT|PROFESSIONAL)/i)) {
      continue;
    }
    
    // Skip lines that look like dates
    if (line.match(/\d{4}|\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/i)) {
      continue;
    }
    
    const words = line.split(/\s+/).filter(w => w.length > 0);
    
    // Look for 2-4 words that all start with capital letters (likely a name)
    if (words.length >= 2 && words.length <= 4) {
      // Check if words are properly capitalized (First letter capital, rest lowercase)
      // Allow for initials like "J. Smith" or "John D. Smith"
      const allProperCase = words.every(w => 
        /^[A-Z][a-z]*$/.test(w) ||           // Normal word: "John"
        /^[A-Z]\.$/.test(w) ||               // Initial: "J."
        /^[A-Z][a-z]*-[A-Z][a-z]*$/.test(w)  // Hyphenated: "Mary-Jane"
      );
      
      const hasExcludedWord = words.some(w => excludeWords.includes(w.toUpperCase()));
      
      // Additional check: names typically don't contain numbers or special chars (except hyphens and periods for initials)
      const hasInvalidChars = words.some(w => /[0-9@#$%^&*()_+=\[\]{}|;:'"<>?\/\\]/.test(w));
      
      // Check if it's not all uppercase (which might be a header)
      const isAllUppercase = words.every(w => w === w.toUpperCase() && w.length > 1);
      
      if (allProperCase && !hasExcludedWord && !hasInvalidChars && !isAllUppercase) {
        const candidate = words.join(' ');
        // Make sure it's not too long (names are usually reasonable length)
        if (candidate.length <= 50 && candidate.length >= 3) {
          return candidate;
        }
      }
    }
    
    // Also try single long capitalized word (might be a last name only, but better than nothing)
    if (words.length === 1 && words[0].length >= 2 && /^[A-Z][a-z]+$/.test(words[0])) {
      const singleWord = words[0];
      if (!excludeWords.includes(singleWord.toUpperCase()) && singleWord.length <= 20) {
        // Only use single word if we can't find anything else - continue searching
        continue;
      }
    }
  }
  
  // Last resort: try to extract from filename (but only if we really can't find anything in the document)
  const nameFromFile = filename
    .replace(/\.pdf$/i, '')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Only use filename if it looks like a proper name
  const fileWords = nameFromFile.split(/\s+/);
  if (fileWords.length >= 2 && fileWords.length <= 4) {
    const allCapitalized = fileWords.every(w => /^[A-Z]/.test(w));
    if (allCapitalized) {
      return nameFromFile;
    }
  }
  
  // If we still can't find anything, return a generic placeholder rather than the filename
  return nameFromFile || 'Unknown Applicant';
}

function extractCurrentPosition(text: string): { currentRole: string | null; currentCompany: string | null } {
  // Look for "Experience" or "Work History" section
  const experienceMatch = text.match(/(?:Experience|Work History|Employment|Professional Experience)[\s\S]{0,800}/i);
  if (experienceMatch) {
    const lines = experienceMatch[0].split('\n').filter(l => l.trim().length > 0).slice(0, 10);
    // First line is usually title, second is company
    if (lines.length >= 2) {
      return {
        currentRole: lines[0].trim(),
        currentCompany: lines[1].trim(),
      };
    }
  }
  return { currentRole: null, currentCompany: null };
}

function calculateExperience(text: string): number {
  // Find date ranges and calculate total years
  const dateRangeRegex = /(\w+\s+\d{4}|\d{4})\s*[-–]\s*(\w+\s+\d{4}|\d{4}|Present|Current)/gi;
  const matches = [...text.matchAll(dateRangeRegex)];
  
  let totalMonths = 0;
  const dateRanges: Array<{ start: Date; end: Date }> = [];
  
  for (const match of matches) {
    const start = parseDate(match[1]);
    const end = match[2].toLowerCase().includes('present') || match[2].toLowerCase().includes('current')
      ? new Date()
      : parseDate(match[2]);
    
    if (start && end) {
      dateRanges.push({ start, end });
    }
  }
  
  // Calculate total months (handle overlaps)
  if (dateRanges.length > 0) {
    // Sort by start date
    dateRanges.sort((a, b) => a.start.getTime() - b.start.getTime());
    
    // Merge overlapping ranges
    const merged: Array<{ start: Date; end: Date }> = [];
    for (const range of dateRanges) {
      if (merged.length === 0) {
        merged.push(range);
      } else {
        const last = merged[merged.length - 1];
        if (range.start <= last.end) {
          last.end = range.end > last.end ? range.end : last.end;
        } else {
          merged.push(range);
        }
      }
    }
    
    // Calculate total months
    for (const range of merged) {
      const months = (range.end.getFullYear() - range.start.getFullYear()) * 12 + 
                     (range.end.getMonth() - range.start.getMonth());
      totalMonths += Math.max(0, months);
    }
  }
  
  return Math.floor(totalMonths / 12);
}

function parseDate(dateStr: string): Date | null {
  // Try various date formats
  // Format: "January 2024" or "2024"
  const cleanStr = dateStr.trim();
  
  // Try full date format
  let date = new Date(cleanStr);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  // Try "Month Year" format
  const monthYearMatch = cleanStr.match(/(\w+)\s+(\d{4})/);
  if (monthYearMatch) {
    date = new Date(monthYearMatch[0]);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  // Try just year
  const yearMatch = cleanStr.match(/\d{4}/);
  if (yearMatch) {
    date = new Date(parseInt(yearMatch[0]), 0, 1);
    return date;
  }
  
  return null;
}

function extractLocation(text: string): string | null {
  // Look for city, state patterns
  const locationRegex = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})/;
  const match = text.match(locationRegex);
  return match ? `${match[1]}, ${match[2]}` : null;
}

function extractSkills(text: string): string[] {
  const foundSkills: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const skill of SKILL_DATABASE) {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(text)) {
      foundSkills.push(skill);
    }
  }
  
  // Also look for a dedicated "Skills" section
  const skillsSectionMatch = text.match(/(?:Skills|Technical Skills|Technologies)[\s\S]{0,500}/i);
  if (skillsSectionMatch) {
    const skillsText = skillsSectionMatch[0];
    for (const skill of SKILL_DATABASE) {
      if (skillsText.toLowerCase().includes(skill.toLowerCase()) && !foundSkills.includes(skill)) {
        foundSkills.push(skill);
      }
    }
  }
  
  return [...new Set(foundSkills)]; // Remove duplicates
}

function extractEducation(text: string): string {
  const educationMatch = text.match(/(?:Education|Academic Background|Academic)[\s\S]{0,500}/i);
  if (educationMatch) {
    const lines = educationMatch[0].split('\n').filter(l => l.trim().length > 0).slice(0, 5);
    return lines.join(' ').trim();
  }
  return '';
}

function extractSummary(text: string): string | undefined {
  const summaryMatch = text.match(/(?:Summary|Profile|Objective|About)[\s\S]{0,800}/i);
  if (summaryMatch) {
    const sentences = summaryMatch[0]
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10)
      .slice(0, 3);
    return sentences.join('. ').trim() + (sentences.length > 0 ? '.' : '');
  }
  return undefined;
}


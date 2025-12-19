/**
 * Auto-Discovery SOP Content System
 * 
 * This file automatically discovers and imports all SOP markdown files.
 * 
 * DISCOVERY RULES:
 * 1. Filename must match pattern: SOP-[CATEGORY]-[###]_[Title].md
 *    Examples: SOP-CFO-001_Finance_Modules.md, SOP-INTERN-005_Academic_Credit.md
 * 2. File must contain YAML frontmatter with document_id field
 * 
 * HOW TO ADD A NEW SOP:
 * 1. Create your SOP markdown file following naming convention
 * 2. Add YAML frontmatter with title, document_id, version, etc.
 * 3. Place in /docs/sops/[category]/ folder
 * 4. The system will automatically detect and include it
 */

// Auto-import all markdown files from docs folder and subdirectories
// Using lazy loading to prevent React Suspense errors
const docsModules = import.meta.glob('/docs/**/*.md', { 
  eager: false,  // Changed to false to prevent suspension
  query: '?raw',
  import: 'default' 
}) as Record<string, () => Promise<string>>;

// Cache the built content to prevent re-computation
let cachedSopContent: Record<string, string> | null = null;
let isLoading = false;
let loadPromise: Promise<Record<string, string>> | null = null;

// Build the SOP_CONTENT record dynamically (async version)
async function buildSopContentAsync(): Promise<Record<string, string>> {
  // Return cached content if available
  if (cachedSopContent) {
    return cachedSopContent;
  }
  
  // If already loading, return the existing promise
  if (isLoading && loadPromise) {
    return loadPromise;
  }
  
  isLoading = true;
  const content: Record<string, string> = {};
  
  // Regex pattern for SOP files: SOP-[CATEGORY]-[NUMBER]_[Title].md
  const sopPattern = /^SOP-[A-Z]+-\d+_/i;
  
  // Process docs folder files
  try {
    const entries = Object.entries(docsModules);
    
    for (const [path, loader] of entries) {
      const filename = path.split('/').pop() || '';
      
      // VALIDATION 1: Filename must match SOP naming convention
      if (!sopPattern.test(filename)) {
        continue;
      }
      
      try {
        // Load the markdown content
        const markdown = await loader();
        
        // VALIDATION 2: File must have YAML frontmatter with document_id
        if (typeof markdown === 'string' && 
            markdown.startsWith('---') && 
            markdown.includes('document_id:')) {
          content[filename] = markdown;
          console.log(`📄 [SOP Auto-Discovery] Loaded: ${filename} from ${path}`);
        } else {
          console.warn(`⚠️ [SOP Auto-Discovery] Skipped ${filename}: Missing valid YAML frontmatter`);
        }
      } catch (error) {
        console.error(`❌ [SOP Auto-Discovery] Error loading ${filename}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ [SOP Auto-Discovery] Error building SOP content:', error);
  }
  
  // Cache the result
  cachedSopContent = content;
  isLoading = false;
  return content;
}

// Synchronous version that returns empty object initially
function buildSopContent(): Record<string, string> {
  if (cachedSopContent) {
    return cachedSopContent;
  }
  
  // Start loading in background if not already loading
  if (!isLoading && !loadPromise) {
    loadPromise = buildSopContentAsync();
  }
  
  // Return empty object initially (will be populated after async load)
  return {};
}

// Export async loader for components that need to wait for content
export async function loadSopContent(): Promise<Record<string, string>> {
  return buildSopContentAsync();
}

// Export function to get discovered SOP filenames
export async function getDiscoveredSops(): Promise<string[]> {
  const content = await buildSopContentAsync();
  return Object.keys(content);
}

// Log discovery summary on load
loadSopContent().then(content => {
  const count = Object.keys(content).length;
  console.log(`📚 [SOP Auto-Discovery] Total SOPs discovered: ${count}`);
  console.log(`📚 [SOP Auto-Discovery] Files:`, Object.keys(content));
});

/**
 * Helper function to parse YAML frontmatter from markdown
 */
function parseYamlFrontmatter(content: string): Record<string, any> {
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return {};
  
  const yaml = frontmatterMatch[1];
  const metadata: Record<string, any> = {};
  
  // Simple YAML parser for our frontmatter
  yaml.split('\n').forEach(line => {
    // Match key: value or key: "value" patterns
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const [, key, value] = match;
      // Remove surrounding quotes if present
      const cleanValue = value.replace(/^["']|["']$/g, '').trim();
      metadata[key] = cleanValue;
    }
  });
  
  return metadata;
}

/**
 * Helper function to extract metadata from SOP markdown content
 */
export function extractSopMetadata(filename: string, content: string): {
  title: string;
  description: string;
  category: string;
  version: string;
  department: string;
  tags: string[];
} {
  // First, try to parse YAML frontmatter
  const frontmatter = parseYamlFrontmatter(content);
  
  // Extract title from YAML frontmatter or fallback to H1
  let title = frontmatter.title || '';
  if (!title) {
    const titleMatch = content.match(/^#\s+(.+)$/m) || content.match(/^##\s+(.+)$/m);
    title = titleMatch ? titleMatch[1].replace(/[*_]/g, '').trim() : filename.replace('.md', '').replace(/_/g, ' ');
  }
  
  // Extract version from YAML or content
  const version = frontmatter.version || '1.0';
  
  // Extract department from YAML or content
  let department = frontmatter.department || frontmatter.process_owner || 'Operations';
  
  // Extract category from YAML or infer from content
  let category = frontmatter.category || 'General';
  
  // If category is still generic, try to infer from content
  if (category === 'General') {
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('investor') || lowerContent.includes('compliance')) {
      category = 'Investor Relations';
    } else if (lowerContent.includes('infrastructure') || lowerContent.includes('cto')) {
      category = 'Technology';
    } else if (lowerContent.includes('intern') || lowerContent.includes('hr') || lowerContent.includes('onboarding')) {
      category = 'Human Resources';
    } else if (lowerContent.includes('finance') || lowerContent.includes('cfo')) {
      category = 'Finance';
    } else if (lowerContent.includes('portal') || lowerContent.includes('setup')) {
      category = 'IT Operations';
    }
  }
  
  // Extract description from first paragraph after frontmatter and title
  const contentWithoutFrontmatter = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
  const descMatch = contentWithoutFrontmatter.match(/^(?:#[^#].*\n)+\n+(.+?)(?:\n\n|---)/s);
  const description = descMatch 
    ? descMatch[1].replace(/[*_#]/g, '').trim().substring(0, 200) 
    : `Standard Operating Procedure: ${title}`;
  
  // Generate tags from keywords found in content
  const tags: string[] = [];
  const lowerContent = content.toLowerCase();
  const tagKeywords = [
    'compliance', 'investor', 'infrastructure', 'incident', 'sla', 
    'capacity', 'cost', 'intern', 'onboarding', 'portal', 'admin',
    'governance', 'security', 'audit', 'review', 'approval'
  ];
  tagKeywords.forEach(keyword => {
    if (lowerContent.includes(keyword)) {
      tags.push(keyword);
    }
  });
  
  return { title, description, category, version, department, tags };
}

/**
 * Get all SOPs with their extracted metadata
 */
export function getAllSopsWithMetadata(): Array<{
  filename: string;
  content: string;
  metadata: ReturnType<typeof extractSopMetadata>;
}> {
  return Object.entries(SOP_CONTENT).map(([filename, content]) => ({
    filename,
    content,
    metadata: extractSopMetadata(filename, content)
  }));
}

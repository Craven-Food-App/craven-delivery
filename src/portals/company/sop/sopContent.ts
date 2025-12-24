/**
 * SOP Content System
 * 
 * This file manages loading of SOP markdown files.
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
 * 4. Add the path to the SOP_PATHS array below
 */

// Static list of SOP file paths
// This prevents React Suspense errors from dynamic imports
const SOP_PATHS = [
  '/docs/sops/finance/SOP-CFO-001_Finance_Modules_and_Accounting_Operations.md',
  '/docs/sops/technology/SOP-CTO-001_Infrastructure_and_DevOps_Management.md',
  '/docs/sops/admin/SOP-ADMIN-001_Investor_Intake_and_Onboarding.md',
  '/docs/sops/admin/SOP-ADMIN-002_Delivery_Zone_Configuration.md',
  '/docs/sops/investor-relations/SOP-INVESTOR-001_Public_Experience_and_Access.md',
  '/docs/sops/investor-relations/SOP-INVESTOR-002_Compliance_and_Intake_Process.md',
  '/docs/sops/intern-program/SOP-INTERN-001_Intern_Program_Setup_and_Configuration.md',
  '/docs/sops/intern-program/SOP-INTERN-002_Intern_Onboarding_Process.md',
  '/docs/sops/intern-program/SOP-INTERN-003_Task_Assignment_and_Tracking.md',
  '/docs/sops/intern-program/SOP-INTERN-004_Performance_Reviews_and_Evaluations.md',
  '/docs/sops/intern-program/SOP-INTERN-005_Academic_Credit_Management.md',
  '/docs/sops/intern-program/SOP-INTERN-006_Intern_to_Employee_Conversion.md',
  '/docs/sops/intern-program/SOP-INTERN-007_Intern_Exit_and_Offboarding_Process.md',
  '/docs/sops/intern-program/SOP-INTERN-010_Admin_Portal_Management.md',
  '/docs/sops/management/SOP-INTERN-008_Manager_Portal_Usage_Guide.md',
  '/docs/sops/management/SOP-INTERN-009_Executive_Sponsor_Workflow.md',
];

// Cache the built content to prevent re-computation
let cachedSopContent: Record<string, string> | null = null;
let isLoading = false;

// Build the SOP_CONTENT record dynamically (async version)
async function buildSopContentAsync(): Promise<Record<string, string>> {
  // Return cached content if available
  if (cachedSopContent) {
    return cachedSopContent;
  }
  
  // Prevent multiple simultaneous loads
  if (isLoading) {
    // Wait a bit and try again
    await new Promise(resolve => setTimeout(resolve, 100));
    return buildSopContentAsync();
  }
  
  isLoading = true;
  const content: Record<string, string> = {};
  
  try {
    // Load all SOPs
    for (const path of SOP_PATHS) {
      const filename = path.split('/').pop() || '';
      
      try {
        // Fetch the markdown content
        const response = await fetch(path);
        if (!response.ok) {
          console.warn(`⚠️ [SOP] Failed to load ${filename}: ${response.status}`);
          continue;
        }
        
        const markdown = await response.text();
        
        // Validate: File must have YAML frontmatter with document_id
        if (markdown.startsWith('---') && markdown.includes('document_id:')) {
          content[filename] = markdown;
          console.log(`📄 [SOP] Loaded: ${filename}`);
        } else {
          console.warn(`⚠️ [SOP] Skipped ${filename}: Missing valid YAML frontmatter`);
        }
      } catch (error) {
        console.error(`❌ [SOP] Error loading ${filename}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ [SOP] Error building SOP content:', error);
  }
  
  // Cache the result
  cachedSopContent = content;
  isLoading = false;
  
  console.log(`✅ [SOP] Loaded ${Object.keys(content).length} SOPs`);
  return content;
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
export async function getAllSopsWithMetadata(): Promise<Array<{
  filename: string;
  content: string;
  metadata: ReturnType<typeof extractSopMetadata>;
}>> {
  const content = await loadSopContent();
  return Object.entries(content).map(([filename, content]) => ({
    filename,
    content,
    metadata: extractSopMetadata(filename, content)
  }));
}

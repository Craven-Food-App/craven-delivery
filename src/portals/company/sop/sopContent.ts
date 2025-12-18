/**
 * Auto-Discovery SOP Content System
 * 
 * This file automatically discovers and imports all SOP markdown files.
 * New SOPs are automatically available when added to:
 * - /docs/*.md (any file with SOP in name or containing "Standard Operating Procedure")
 * - Root /*.md (any file with SOP in name)
 * 
 * HOW TO ADD A NEW SOP:
 * 1. Create your SOP markdown file in /docs/ folder (e.g., docs/SOP-YOUR-TOPIC.md)
 * 2. The system will automatically detect and include it
 * 3. Run the database seeder migration to add metadata to the portal
 */

// Auto-import all markdown files from docs folder
const docsModules = import.meta.glob('/docs/*.md', { 
  eager: true, 
  query: '?raw',
  import: 'default' 
}) as Record<string, string>;

// Auto-import all SOP markdown files from root
const rootModules = import.meta.glob('/*.md', { 
  eager: true, 
  query: '?raw',
  import: 'default' 
}) as Record<string, string>;

// Build the SOP_CONTENT record dynamically
function buildSopContent(): Record<string, string> {
  const content: Record<string, string> = {};
  
  // Process docs folder files
  for (const [path, markdown] of Object.entries(docsModules)) {
    // Extract filename from path (e.g., "/docs/SOP-CTO-Advanced-Infrastructure.md" -> "SOP-CTO-Advanced-Infrastructure.md")
    const filename = path.split('/').pop() || '';
    
    // Include if it has SOP in name or contains "Standard Operating Procedure"
    if (filename.toLowerCase().includes('sop') || 
        (typeof markdown === 'string' && markdown.includes('Standard Operating Procedure'))) {
      content[filename] = markdown as string;
      console.log(`📄 [SOP Auto-Discovery] Loaded: ${filename}`);
    }
  }
  
  // Process root folder files (only SOP files)
  for (const [path, markdown] of Object.entries(rootModules)) {
    const filename = path.split('/').pop() || '';
    
    // Only include files with SOP in the name from root
    if (filename.toLowerCase().includes('sop')) {
      content[filename] = markdown as string;
      console.log(`📄 [SOP Auto-Discovery] Loaded from root: ${filename}`);
    }
  }
  
  return content;
}

// Export the dynamically built SOP content
export const SOP_CONTENT: Record<string, string> = buildSopContent();

// Export list of discovered SOPs for debugging/admin purposes
export const DISCOVERED_SOPS = Object.keys(SOP_CONTENT);

// Log discovery summary
console.log(`📚 [SOP Auto-Discovery] Total SOPs discovered: ${DISCOVERED_SOPS.length}`);
console.log(`📚 [SOP Auto-Discovery] Files:`, DISCOVERED_SOPS);

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
  // Extract title from first H1 or H2
  const titleMatch = content.match(/^#\s+(.+)$/m) || content.match(/^##\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].replace(/[*_]/g, '').trim() : filename.replace('.md', '').replace(/-/g, ' ');
  
  // Extract version
  const versionMatch = content.match(/\*\*Version[:\s]*\*\*\s*(\d+\.\d+)/i) || 
                       content.match(/Version[:\s]*(\d+\.\d+)/i);
  const version = versionMatch ? versionMatch[1] : '1.0';
  
  // Extract department/owner
  const deptMatch = content.match(/\*\*(?:Department|Owner|Document Owner)[:\s]*\*\*\s*(.+)/i) ||
                    content.match(/(?:Department|Owner)[:\s]*(.+)/i);
  const department = deptMatch ? deptMatch[1].trim() : 'Operations';
  
  // Try to determine category from content
  let category = 'General';
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
  
  // Extract description from first paragraph after title
  const descMatch = content.match(/^(?:#[^#].*\n)+\n+(.+?)(?:\n\n|---)/s);
  const description = descMatch 
    ? descMatch[1].replace(/[*_#]/g, '').trim().substring(0, 200) 
    : `Standard Operating Procedure: ${title}`;
  
  // Generate tags from keywords found in content
  const tags: string[] = [];
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

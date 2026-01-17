/**
 * Placeholder replacement utility for EAS documents
 */

export interface PlaceholderMap {
  [key: string]: string | string[];
}

/**
 * Replace placeholders in HTML template content
 */
export function replacePlaceholders(
  template: string,
  placeholders: PlaceholderMap
): string {
  let content = template;

  Object.entries(placeholders).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    
    if (Array.isArray(value)) {
      // Convert array to HTML list items
      const listItems = value.map(item => `<li>${escapeHtml(item)}</li>`).join('\n');
      content = content.replace(placeholder, `<ul>${listItems}</ul>`);
    } else {
      // Replace single value
      content = content.replace(new RegExp(placeholder, 'g'), escapeHtml(value));
    }
  });

  return content;
}

/**
 * Extract placeholders from template
 */
export function extractPlaceholders(template: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const placeholders: string[] = [];
  let match;

  while ((match = regex.exec(template)) !== null) {
    if (!placeholders.includes(match[1])) {
      placeholders.push(match[1]);
    }
  }

  return placeholders;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format date for documents
 */
export function formatDocumentDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}


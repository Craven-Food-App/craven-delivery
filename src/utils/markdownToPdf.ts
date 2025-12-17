/**
 * Professional PDF Generator for Crave'n Inc.
 * Creates branded, well-formatted PDF documents from Markdown content
 */

import { jsPDF } from 'jspdf';

interface MarkdownToPdfOptions {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  version?: string;
  department?: string;
  documentDate?: string;
}

// Brand colors
const BRAND_COLORS = {
  primary: '#F97316', // Orange
  secondary: '#1F2937', // Dark gray
  accent: '#EA580C', // Darker orange
  text: '#111827', // Almost black
  textLight: '#6B7280', // Gray
  border: '#E5E7EB', // Light gray
  headerBg: '#FFF7ED', // Light orange tint
};

// Page dimensions (A4 in mm)
const PAGE = {
  width: 210,
  height: 297,
  marginLeft: 20,
  marginRight: 20,
  marginTop: 35, // Space for header
  marginBottom: 25, // Space for footer
};

const CONTENT_WIDTH = PAGE.width - PAGE.marginLeft - PAGE.marginRight;

/**
 * Adds the company letterhead header to a page
 */
function addHeader(pdf: jsPDF, title: string, isFirstPage: boolean = false): void {
  const headerY = 10;
  
  // Header background stripe
  pdf.setFillColor(255, 247, 237); // Light orange tint
  pdf.rect(0, 0, PAGE.width, 28, 'F');
  
  // Orange accent line at top
  pdf.setFillColor(249, 115, 22); // Brand orange
  pdf.rect(0, 0, PAGE.width, 3, 'F');
  
  // Company name
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(249, 115, 22); // Orange
  pdf.text("CRAVE'N", PAGE.marginLeft, headerY + 8);
  
  // Inc. in gray
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128); // Gray
  const cravenWidth = pdf.getTextWidth("CRAVE'N ");
  pdf.text('INC.', PAGE.marginLeft + cravenWidth, headerY + 8);
  
  // Tagline
  pdf.setFontSize(7);
  pdf.setTextColor(107, 114, 128);
  pdf.text('Delivering Excellence', PAGE.marginLeft, headerY + 13);
  
  // Document type badge on right
  pdf.setFillColor(249, 115, 22);
  const badgeText = 'STANDARD OPERATING PROCEDURE';
  pdf.setFontSize(6);
  const badgeWidth = pdf.getTextWidth(badgeText) + 8;
  pdf.roundedRect(PAGE.width - PAGE.marginRight - badgeWidth, headerY + 2, badgeWidth, 6, 1, 1, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text(badgeText, PAGE.width - PAGE.marginRight - badgeWidth + 4, headerY + 6);
  
  // Separator line
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.5);
  pdf.line(PAGE.marginLeft, 28, PAGE.width - PAGE.marginRight, 28);
}

/**
 * Adds the footer with page numbers and company info
 */
function addFooter(pdf: jsPDF, pageNumber: number, totalPages: number): void {
  const footerY = PAGE.height - 15;
  
  // Footer separator line
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.3);
  pdf.line(PAGE.marginLeft, footerY - 5, PAGE.width - PAGE.marginRight, footerY - 5);
  
  // Left side: Company info
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(107, 114, 128);
  pdf.text('© 2025 Crave\'n Inc. All Rights Reserved.', PAGE.marginLeft, footerY);
  pdf.text('CONFIDENTIAL - For Internal Use Only', PAGE.marginLeft, footerY + 4);
  
  // Center: Document classification
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6);
  pdf.setTextColor(249, 115, 22);
  const classText = 'PROPRIETARY & CONFIDENTIAL';
  const classWidth = pdf.getTextWidth(classText);
  pdf.text(classText, (PAGE.width - classWidth) / 2, footerY);
  
  // Right side: Page numbers
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(107, 114, 128);
  const pageText = `Page ${pageNumber} of ${totalPages}`;
  const pageWidth = pdf.getTextWidth(pageText);
  pdf.text(pageText, PAGE.width - PAGE.marginRight - pageWidth, footerY);
}

/**
 * Adds the title page / document header section
 */
function addTitleSection(
  pdf: jsPDF, 
  title: string, 
  options: MarkdownToPdfOptions
): number {
  let yPos = PAGE.marginTop + 5;
  
  // Document title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.setTextColor(31, 41, 55); // Dark gray
  
  const titleLines = pdf.splitTextToSize(title, CONTENT_WIDTH);
  pdf.text(titleLines, PAGE.marginLeft, yPos);
  yPos += titleLines.length * 8 + 5;
  
  // Orange underline for title
  pdf.setDrawColor(249, 115, 22);
  pdf.setLineWidth(1);
  pdf.line(PAGE.marginLeft, yPos, PAGE.marginLeft + 60, yPos);
  yPos += 8;
  
  // Document metadata box
  pdf.setFillColor(249, 250, 251); // Very light gray
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(PAGE.marginLeft, yPos, CONTENT_WIDTH, 22, 2, 2, 'FD');
  
  // Metadata content
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(107, 114, 128);
  
  const metaY = yPos + 6;
  const col1 = PAGE.marginLeft + 5;
  const col2 = PAGE.marginLeft + 55;
  const col3 = PAGE.marginLeft + 110;
  
  // Row 1
  pdf.text('Version:', col1, metaY);
  pdf.text('Owner:', col2, metaY);
  pdf.text('Last Updated:', col3, metaY);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(31, 41, 55);
  pdf.text(options.version || '1.0', col1 + 15, metaY);
  pdf.text(options.department || 'Operations', col2 + 15, metaY);
  pdf.text(options.documentDate || new Date().toLocaleDateString(), col3 + 25, metaY);
  
  // Row 2
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(107, 114, 128);
  pdf.text('Classification:', col1, metaY + 7);
  pdf.text('Review Cycle:', col2, metaY + 7);
  pdf.text('Status:', col3, metaY + 7);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(31, 41, 55);
  pdf.text('Internal', col1 + 25, metaY + 7);
  pdf.text('Quarterly', col2 + 25, metaY + 7);
  
  // Status badge
  pdf.setFillColor(34, 197, 94); // Green
  pdf.roundedRect(col3 + 15, metaY + 4, 15, 5, 1, 1, 'F');
  pdf.setFontSize(6);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ACTIVE', col3 + 17, metaY + 7.5);
  
  yPos += 30;
  
  return yPos;
}

/**
 * Parse markdown content into structured sections
 */
interface ContentSection {
  type: 'h1' | 'h2' | 'h3' | 'paragraph' | 'bullet' | 'numbered' | 'divider' | 'table';
  content: string;
  items?: string[];
}

function parseMarkdown(markdown: string): ContentSection[] {
  const sections: ContentSection[] = [];
  const lines = markdown.split('\n');
  let currentParagraph: string[] = [];
  let inList = false;
  let listItems: string[] = [];
  let listType: 'bullet' | 'numbered' = 'bullet';
  
  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(' ').trim();
      if (text) {
        sections.push({ type: 'paragraph', content: text });
      }
      currentParagraph = [];
    }
  };
  
  const flushList = () => {
    if (listItems.length > 0) {
      sections.push({ type: listType, content: '', items: [...listItems] });
      listItems = [];
      inList = false;
    }
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }
    
    // Divider
    if (trimmed === '---' || trimmed === '***') {
      flushParagraph();
      flushList();
      sections.push({ type: 'divider', content: '' });
      continue;
    }
    
    // Headers
    const h1Match = trimmed.match(/^#\s+(.+)$/);
    const h2Match = trimmed.match(/^##\s+(.+)$/);
    const h3Match = trimmed.match(/^###\s+(.+)$/);
    
    if (h1Match) {
      flushParagraph();
      flushList();
      sections.push({ type: 'h1', content: h1Match[1] });
      continue;
    }
    if (h2Match) {
      flushParagraph();
      flushList();
      sections.push({ type: 'h2', content: h2Match[1] });
      continue;
    }
    if (h3Match) {
      flushParagraph();
      flushList();
      sections.push({ type: 'h3', content: h3Match[1] });
      continue;
    }
    
    // Bullet list
    const bulletMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      if (!inList || listType !== 'bullet') {
        flushList();
        inList = true;
        listType = 'bullet';
      }
      listItems.push(cleanMarkdownText(bulletMatch[1]));
      continue;
    }
    
    // Numbered list
    const numberedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (numberedMatch) {
      flushParagraph();
      if (!inList || listType !== 'numbered') {
        flushList();
        inList = true;
        listType = 'numbered';
      }
      listItems.push(cleanMarkdownText(numberedMatch[1]));
      continue;
    }
    
    // Skip code blocks and tables for now
    if (trimmed.startsWith('```') || trimmed.startsWith('|')) {
      flushParagraph();
      flushList();
      continue;
    }
    
    // Regular paragraph text
    flushList();
    currentParagraph.push(cleanMarkdownText(trimmed));
  }
  
  flushParagraph();
  flushList();
  
  return sections;
}

/**
 * Clean markdown formatting from text
 */
function cleanMarkdownText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
    .replace(/\*(.+?)\*/g, '$1') // Italic
    .replace(/_(.+?)_/g, '$1') // Underscore italic
    .replace(/`(.+?)`/g, '$1') // Inline code
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Links
    .replace(/✓/g, '✓') // Checkmarks
    .replace(/✗/g, '✗') // X marks
    .trim();
}

/**
 * Main PDF generation function
 */
export async function markdownToPdf(
  markdownContent: string,
  options: MarkdownToPdfOptions = {}
): Promise<Blob> {
  const {
    title = 'Document',
    author = 'Crave\'n Inc.',
    subject = 'Standard Operating Procedure',
    keywords = '',
    version = '1.0',
    department = 'Operations',
    documentDate = new Date().toLocaleDateString(),
  } = options;

  // Create PDF document
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  // Set document metadata
  pdf.setProperties({
    title,
    author,
    subject,
    keywords,
    creator: 'Crave\'n Company Portal',
  });

  // Parse markdown into sections
  const sections = parseMarkdown(markdownContent);
  
  // Track pages for footer
  let currentPage = 1;
  const pages: number[] = [1];
  
  // Add header to first page
  addHeader(pdf, title, true);
  
  // Add title section
  let yPos = addTitleSection(pdf, title, { version, department, documentDate });
  
  // Content area bounds
  const contentBottom = PAGE.height - PAGE.marginBottom - 5;
  
  // Helper to check if we need a new page
  const checkNewPage = (neededSpace: number): void => {
    if (yPos + neededSpace > contentBottom) {
      pdf.addPage();
      currentPage++;
      pages.push(currentPage);
      addHeader(pdf, title, false);
      yPos = PAGE.marginTop + 5;
    }
  };
  
  // Render each section
  for (const section of sections) {
    switch (section.type) {
      case 'h1':
        checkNewPage(15);
        yPos += 8;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.setTextColor(31, 41, 55);
        pdf.text(section.content, PAGE.marginLeft, yPos);
        yPos += 3;
        // Underline
        pdf.setDrawColor(249, 115, 22);
        pdf.setLineWidth(0.8);
        pdf.line(PAGE.marginLeft, yPos, PAGE.marginLeft + 50, yPos);
        yPos += 6;
        break;
        
      case 'h2':
        checkNewPage(12);
        yPos += 6;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(249, 115, 22); // Orange for h2
        pdf.text(section.content, PAGE.marginLeft, yPos);
        yPos += 5;
        break;
        
      case 'h3':
        checkNewPage(10);
        yPos += 4;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(31, 41, 55);
        pdf.text(section.content, PAGE.marginLeft, yPos);
        yPos += 4;
        break;
        
      case 'paragraph':
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(55, 65, 81);
        
        const paraLines = pdf.splitTextToSize(section.content, CONTENT_WIDTH);
        const paraHeight = paraLines.length * 4.5;
        checkNewPage(paraHeight);
        
        for (const line of paraLines) {
          if (yPos > contentBottom) {
            pdf.addPage();
            currentPage++;
            pages.push(currentPage);
            addHeader(pdf, title, false);
            yPos = PAGE.marginTop + 5;
          }
          pdf.text(line, PAGE.marginLeft, yPos);
          yPos += 4.5;
        }
        yPos += 2;
        break;
        
      case 'bullet':
      case 'numbered':
        if (section.items) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.setTextColor(55, 65, 81);
          
          for (let i = 0; i < section.items.length; i++) {
            const item = section.items[i];
            const bullet = section.type === 'bullet' ? '•' : `${i + 1}.`;
            const indent = PAGE.marginLeft + 5;
            const textIndent = PAGE.marginLeft + 12;
            const itemWidth = CONTENT_WIDTH - 12;
            
            const itemLines = pdf.splitTextToSize(item, itemWidth);
            const itemHeight = itemLines.length * 4.5;
            checkNewPage(itemHeight);
            
            // Draw bullet/number
            pdf.setTextColor(249, 115, 22); // Orange bullets
            pdf.text(bullet, indent, yPos);
            pdf.setTextColor(55, 65, 81);
            
            // Draw item text
            for (let j = 0; j < itemLines.length; j++) {
              if (yPos > contentBottom) {
                pdf.addPage();
                currentPage++;
                pages.push(currentPage);
                addHeader(pdf, title, false);
                yPos = PAGE.marginTop + 5;
              }
              pdf.text(itemLines[j], textIndent, yPos);
              yPos += 4.5;
            }
          }
          yPos += 2;
        }
        break;
        
      case 'divider':
        checkNewPage(8);
        yPos += 4;
        pdf.setDrawColor(229, 231, 235);
        pdf.setLineWidth(0.3);
        pdf.line(PAGE.marginLeft + 20, yPos, PAGE.width - PAGE.marginRight - 20, yPos);
        yPos += 4;
        break;
    }
  }
  
  // Add footers to all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    addFooter(pdf, i, totalPages);
  }

  // Generate PDF blob
  const pdfBlob = pdf.output('blob');
  return pdfBlob;
}

/**
 * Enhanced version - same as main for now
 */
export async function markdownToPdfEnhanced(
  markdownContent: string,
  options: MarkdownToPdfOptions = {}
): Promise<Blob> {
  return markdownToPdf(markdownContent, options);
}

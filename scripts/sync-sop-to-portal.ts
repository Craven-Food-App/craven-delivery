/**
 * Script to sync SOP markdown files to Company Portal
 * Converts MD to PDF and uploads to Supabase storage
 * 
 * Usage: tsx scripts/sync-sop-to-portal.ts <sop-file-path>
 * Example: tsx scripts/sync-sop-to-portal.ts INVESTOR_COMPLIANCE_SOP.md
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { jsPDF } from 'jspdf';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface SOPMetadata {
  title: string;
  description?: string;
  category: string;
  version: string;
  markdown_file_path: string;
  owner_department: string;
  tags: string[];
  keywords: string[];
}

// Extract metadata from markdown file
function extractMetadata(markdownContent: string, fileName: string): SOPMetadata {
  // Try to extract title from first H1
  const titleMatch = markdownContent.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : fileName.replace('.md', '').replace(/_/g, ' ');

  // Try to extract description from first paragraph
  const descriptionMatch = markdownContent.match(/^#.+\n\n(.+?)(?:\n\n|$)/s);
  const description = descriptionMatch ? descriptionMatch[1].trim().substring(0, 200) : undefined;

  // Default category based on filename
  let category = 'General';
  if (fileName.toLowerCase().includes('investor')) category = 'Investor Relations';
  if (fileName.toLowerCase().includes('hr')) category = 'HR';
  if (fileName.toLowerCase().includes('finance')) category = 'Finance';
  if (fileName.toLowerCase().includes('operations')) category = 'Operations';
  if (fileName.toLowerCase().includes('compliance')) category = 'Compliance';

  // Extract tags from filename and content
  const tags: string[] = [];
  const keywords: string[] = [];
  
  // Add tags from filename
  const fileNameLower = fileName.toLowerCase();
  if (fileNameLower.includes('investor')) tags.push('investor');
  if (fileNameLower.includes('compliance')) tags.push('compliance');
  if (fileNameLower.includes('sop')) tags.push('sop');

  // Extract keywords from content (simple extraction)
  const contentLower = markdownContent.toLowerCase();
  const commonKeywords = ['process', 'procedure', 'workflow', 'guide', 'manual', 'policy'];
  commonKeywords.forEach(keyword => {
    if (contentLower.includes(keyword)) keywords.push(keyword);
  });

  return {
    title,
    description,
    category,
    version: '1.0',
    markdown_file_path: fileName,
    owner_department: category === 'Investor Relations' ? 'Finance' : 'Operations',
    tags,
    keywords,
  };
}

// Convert markdown to PDF (basic implementation)
function markdownToPdf(markdownContent: string, title: string): Buffer {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  pdf.setProperties({
    title,
    author: 'Crave\'n Inc.',
    subject: 'Standard Operating Procedure',
    creator: 'Crave\'n Company Portal',
  });

  // Basic text extraction (remove markdown syntax)
  let text = markdownContent
    .replace(/^#+\s+(.+)$/gm, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^[-*+]\s+/gm, '• ')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const lines = text.split('\n');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - (margin * 2);
  const lineHeight = 7;
  let yPosition = margin + 10;

  // Add title
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  const titleLines = pdf.splitTextToSize(title, maxWidth);
  pdf.text(titleLines, margin, yPosition);
  yPosition += titleLines.length * lineHeight + 5;

  // Add separator
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Add content
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');

  for (const line of lines) {
    if (!line.trim()) {
      yPosition += lineHeight;
      continue;
    }

    if (yPosition > pageHeight - margin - 10) {
      pdf.addPage();
      yPosition = margin;
    }

    const wrappedLines = pdf.splitTextToSize(line, maxWidth);
    
    for (const wrappedLine of wrappedLines) {
      if (yPosition > pageHeight - margin - 10) {
        pdf.addPage();
        yPosition = margin;
      }
      
      if (line.match(/^[A-Z\s]+$/) && line.length < 50) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
      } else {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
      }
      
      pdf.text(wrappedLine, margin, yPosition);
      yPosition += lineHeight;
    }
  }

  return Buffer.from(pdf.output('arraybuffer'));
}

async function syncSOP(filePath: string) {
  try {
    console.log(`Reading SOP file: ${filePath}`);
    const fullPath = join(process.cwd(), filePath);
    const markdownContent = readFileSync(fullPath, 'utf-8');
    const fileName = filePath.split('/').pop() || filePath;

    console.log('Extracting metadata...');
    const metadata = extractMetadata(markdownContent, fileName);

    console.log('Converting to PDF...');
    const pdfBuffer = markdownToPdf(markdownContent, metadata.title);

    // Check if SOP already exists
    const { data: existingSOP } = await supabase
      .from('sop_documents')
      .select('id')
      .eq('markdown_file_path', fileName)
      .maybeSingle();

    let sopId: string;

    if (existingSOP) {
      console.log('Updating existing SOP record...');
      const { data, error } = await supabase
        .from('sop_documents')
        .update({
          title: metadata.title,
          description: metadata.description,
          category: metadata.category,
          tags: metadata.tags,
          keywords: metadata.keywords,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSOP.id)
        .select()
        .single();

      if (error) throw error;
      sopId = data.id;
    } else {
      console.log('Creating new SOP record...');
      const { data, error } = await supabase
        .from('sop_documents')
        .insert({
          ...metadata,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      sopId = data.id;
    }

    // Upload PDF to storage
    console.log('Uploading PDF to storage...');
    const pdfFileName = `sop-${sopId}-${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('sop-documents')
      .upload(pdfFileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Update SOP with PDF path
    console.log('Updating SOP with PDF path...');
    const { error: updateError } = await supabase
      .from('sop_documents')
      .update({
        pdf_file_path: pdfFileName,
        file_size_bytes: pdfBuffer.length,
        page_count: Math.ceil(pdfBuffer.length / 50000), // Rough estimate
      })
      .eq('id', sopId);

    if (updateError) throw updateError;

    console.log('✅ SOP synced successfully!');
    console.log(`   Title: ${metadata.title}`);
    console.log(`   Category: ${metadata.category}`);
    console.log(`   PDF: ${pdfFileName}`);
    console.log(`   Size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);

  } catch (error: any) {
    console.error('❌ Error syncing SOP:', error.message);
    process.exit(1);
  }
}

// Main execution
const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: tsx scripts/sync-sop-to-portal.ts <sop-file-path>');
  console.error('Example: tsx scripts/sync-sop-to-portal.ts INVESTOR_COMPLIANCE_SOP.md');
  process.exit(1);
}

syncSOP(filePath);


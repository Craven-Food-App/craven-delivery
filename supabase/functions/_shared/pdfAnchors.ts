/**
 * PDF Anchor Utilities
 * Converts signature field layout percentages to PDF coordinates
 * and manages anchor-based signature positioning
 */

import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1?bundle";

export interface SignatureAnchor {
  page: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface SignatureAnchors {
  [role: string]: SignatureAnchor;
}

/**
 * Convert signature field layout (percentages) to PDF anchor coordinates
 * This creates stable anchor points based on the PDF page dimensions
 */
export function convertLayoutToAnchors(
  signatureLayout: Array<{
    signer_role: string;
    page_number: number;
    x_percent: number;
    y_percent: number;
    width_percent?: number;
    height_percent?: number;
  }>,
  pdfPages: Array<{ width: number; height: number }>
): SignatureAnchors {
  const anchors: SignatureAnchors = {};
  
  signatureLayout.forEach((field) => {
    const role = String(field.signer_role || '').toUpperCase();
    if (!role) return;
    
    const pageIndex = Math.max(0, (field.page_number || 1) - 1);
    const page = pdfPages[pageIndex] || pdfPages[0];
    
    if (!page) return;
    
    const pageWidth = page.width;
    const pageHeight = page.height;
    
    // Convert percentages to PDF coordinates
    // PDF coordinates: (0,0) is bottom-left, y increases upward
    const x = (pageWidth * (field.x_percent || 0)) / 100;
    const yPercent = field.y_percent || 0;
    // Convert from top-based percentage to bottom-based PDF coordinate
    const y = pageHeight - ((pageHeight * yPercent) / 100);
    
    // Store anchor with optional dimensions
    anchors[role] = {
      page: field.page_number || 1,
      x,
      y,
      width: field.width_percent ? (pageWidth * field.width_percent) / 100 : undefined,
      height: field.height_percent ? (pageHeight * field.height_percent) / 100 : undefined,
    };
  });
  
  return anchors;
}

/**
 * Extract PDF page dimensions from a PDF document
 */
export async function getPdfPageDimensions(
  pdfBytes: Uint8Array
): Promise<Array<{ width: number; height: number }>> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    return pages.map(page => {
      const { width, height } = page.getSize();
      return { width, height };
    });
  } catch (error) {
    console.error('Error extracting PDF page dimensions:', error);
    // Return default letter size (8.5 x 11 inches = 612 x 792 points)
    return [{ width: 612, height: 792 }];
  }
}

/**
 * Determine signer role from document role string
 */
export function determineSignerRole(role: string): string {
  const roleUpper = (role || '').toUpperCase();
  
  if (roleUpper.includes('CEO') || roleUpper.includes('CHIEF EXECUTIVE')) return 'CEO';
  if (roleUpper.includes('CFO') || roleUpper.includes('CHIEF FINANCIAL')) return 'CFO';
  if (roleUpper.includes('CTO') || roleUpper.includes('CHIEF TECHNOLOGY')) return 'CTO';
  if (roleUpper.includes('COO') || roleUpper.includes('CHIEF OPERATING')) return 'COO';
  if (roleUpper.includes('CXO') || roleUpper.includes('CHIEF')) return 'CXO';
  if (roleUpper.includes('SECRETARY')) return 'SECRETARY';
  if (roleUpper.includes('BOARD')) return 'BOARD';
  if (roleUpper.includes('INCORPORATOR')) return 'INCORPORATOR';
  if (roleUpper.includes('NOTARY')) return 'NOTARY';
  
  return 'OFFICER'; // Default fallback
}





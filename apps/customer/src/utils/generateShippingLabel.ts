import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';

interface Restaurant {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone?: string;
}

export async function generateShippingLabel(restaurant: Restaurant): Promise<{
  pdfUrl: string;
  labelUrl: string;
}> {
  try {
    // Generate QR code with restaurant ID for tracking
    const qrCodeDataUrl = await QRCode.toDataURL(
      `https://craven.com/track/${restaurant.id}`,
      {
        width: 256,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      }
    );

    // Create a temporary div to render the shipping label
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);

    // Get current date for ship date
    const shipDate = new Date().toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });

    // Create shipping label HTML
    tempDiv.innerHTML = `
      <div style="background: white; width: 816px; height: 1056px; padding: 48px; font-family: Arial, sans-serif; color: black;">
        <!-- Header -->
        <div style="border: 4px solid black; padding: 24px; margin-bottom: 32px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h1 style="font-size: 48px; font-weight: bold; color: #FF6B35; margin: 0;">Crave'N</h1>
              <p style="font-size: 14px; font-weight: 600; margin: 4px 0 0 0;">TABLET DELIVERY</p>
            </div>
            <div style="text-align: right;">
              <p style="font-size: 12px; font-weight: 600; margin: 0;">Ship Date</p>
              <p style="font-size: 20px; font-weight: bold; margin: 4px 0 0 0;">${shipDate}</p>
            </div>
          </div>
        </div>

        <!-- From Address -->
        <div style="border: 2px solid black; padding: 24px; margin-bottom: 32px;">
          <p style="font-size: 12px; font-weight: bold; margin: 0 0 8px 0;">FROM:</p>
          <p style="font-size: 20px; font-weight: bold; margin: 4px 0;">Crave'N Headquarters</p>
          <p style="font-size: 16px; margin: 2px 0;">123 Main Street</p>
          <p style="font-size: 16px; margin: 2px 0;">Suite 100</p>
          <p style="font-size: 16px; margin: 2px 0;">San Francisco, CA 94102</p>
          <p style="font-size: 16px; font-weight: 600; margin: 4px 0;">(555) 123-4567</p>
        </div>

        <!-- To Address -->
        <div style="border: 4px solid black; padding: 32px; margin-bottom: 32px; background: #f9fafb;">
          <p style="font-size: 12px; font-weight: bold; margin: 0 0 12px 0;">SHIP TO:</p>
          <p style="font-size: 32px; font-weight: bold; margin: 0 0 8px 0;">${restaurant.name}</p>
          <p style="font-size: 24px; margin: 4px 0;">${restaurant.address}</p>
          <p style="font-size: 24px; margin: 4px 0;">${restaurant.city}, ${restaurant.state} ${restaurant.zip_code}</p>
          ${restaurant.phone ? `<p style="font-size: 24px; font-weight: 600; margin: 8px 0 0 0;">${restaurant.phone}</p>` : ''}
        </div>

        <!-- Package Details -->
        <div style="border: 2px solid black; padding: 24px; margin-bottom: 32px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
            <div>
              <p style="font-size: 12px; font-weight: bold; margin: 0 0 8px 0;">CONTENTS:</p>
              <p style="font-size: 16px; font-weight: 600; margin: 2px 0;">Crave'N POS Tablet</p>
              <p style="font-size: 14px; margin: 2px 0;">+ Charging Cable</p>
              <p style="font-size: 14px; margin: 2px 0;">+ Quick Start Guide</p>
            </div>
            <div>
              <p style="font-size: 12px; font-weight: bold; margin: 0 0 8px 0;">WEIGHT:</p>
              <p style="font-size: 16px; font-weight: 600; margin: 2px 0;">2.5 lbs</p>
              <p style="font-size: 12px; font-weight: bold; margin: 12px 0 8px 0;">DIMENSIONS:</p>
              <p style="font-size: 16px; margin: 2px 0;">12" x 10" x 3"</p>
            </div>
          </div>
        </div>

        <!-- QR Code and Reference -->
        <div style="display: flex; align-items: center; justify-content: space-between; border: 2px solid black; padding: 24px;">
          <div style="flex: 1;">
            <p style="font-size: 12px; font-weight: bold; margin: 0 0 8px 0;">REFERENCE NUMBER:</p>
            <p style="font-size: 32px; font-family: monospace; font-weight: bold; letter-spacing: 2px; margin: 4px 0;">${restaurant.id.substring(0, 8).toUpperCase()}</p>
            <p style="font-size: 12px; color: #6b7280; margin: 8px 0 0 0;">Scan QR code for tracking</p>
          </div>
          <div style="border: 2px solid black; padding: 12px;">
            <img src="${qrCodeDataUrl}" alt="QR Code" style="width: 128px; height: 128px; display: block;" />
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 32px; text-align: center; font-size: 12px; color: #6b7280;">
          <p style="margin: 4px 0;">Questions? Contact support@craven.com | (555) 123-4567</p>
          <p style="margin: 4px 0;">This package contains fragile electronics - Handle with care</p>
        </div>
      </div>
    `;

    // Convert to canvas
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    // Remove temporary div
    document.body.removeChild(tempDiv);

    // Convert canvas to blob
    const imgData = canvas.toDataURL('image/png');
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: 'letter',
    });

    const imgWidth = 8.5;
    const imgHeight = 11;
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

    // Convert PDF to blob
    const pdfBlob = pdf.output('blob');

    // Upload to Supabase Storage
    const fileName = `shipping-label-${restaurant.id}-${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('restaurant-documents')
      .upload(fileName, pdfBlob, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload label: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('restaurant-documents')
      .getPublicUrl(uploadData.path);

    return {
      pdfUrl: urlData.publicUrl,
      labelUrl: imgData, // Return base64 image for immediate display
    };
  } catch (error) {
    console.error('Error generating shipping label:', error);
    throw error;
  }
}

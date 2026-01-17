import jsPDF from 'jspdf';

interface ICAData {
  driverName: string;
  dateOfBirth: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  email: string;
  phone: string;
  driversLicenseNumber: string;
  driversLicenseState: string;
  driversLicenseExpiry: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  vehicleType: string;
  vehicleColor: string;
  licensePlate: string;
  insuranceProvider: string;
  insurancePolicy: string;
  signatureName: string;
  signatureDate: string;
}

export function generateICAPDF(data: ICAData): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter'
  });

  let yPosition = 0.75;
  const pageWidth = 8.5;
  const margin = 0.75;
  const contentWidth = pageWidth - (margin * 2);

  // Helper function to add text with word wrap
  const addWrappedText = (text: string, x: number, y: number, width: number, fontSize: number, isBold: boolean = false) => {
    doc.setFontSize(fontSize);
    if (isBold) {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    const splitText = doc.splitTextToSize(text, width);
    doc.text(splitText, x, y);
    return y + (splitText.length * (fontSize / 72)) + 0.1;
  };

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 107, 0);
  doc.text('INDEPENDENT CONTRACTOR AGREEMENT', margin, yPosition);
  yPosition += 0.25;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`Effective Date: ${data.signatureDate}`, margin, yPosition);
  yPosition += 0.3;

  doc.setLineWidth(0.01);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 0.2;

  // Parties Section
  yPosition = addWrappedText('PARTIES TO THIS AGREEMENT', margin, yPosition, contentWidth, 12, true);
  yPosition += 0.1;
  
  yPosition = addWrappedText(
    'This Independent Contractor Agreement ("Agreement") is entered into between Crave\'N ("Company") and the undersigned independent contractor ("Contractor").',
    margin, yPosition, contentWidth, 10, false
  );
  yPosition += 0.2;

  // Contractor Information Section
  yPosition = addWrappedText('CONTRACTOR INFORMATION', margin, yPosition, contentWidth, 12, true);
  yPosition += 0.1;

  let lineY = yPosition;
  lineY = addWrappedText(`Full Name: ${data.driverName}`, margin, lineY, contentWidth, 10);
  lineY = addWrappedText(`Date of Birth: ${data.dateOfBirth}`, margin, lineY, contentWidth, 10);
  lineY = addWrappedText(`Address: ${data.address}`, margin, lineY, contentWidth, 10);
  lineY = addWrappedText(`City, State, ZIP: ${data.city}, ${data.state} ${data.zipCode}`, margin, lineY, contentWidth, 10);
  lineY = addWrappedText(`Email: ${data.email}`, margin, lineY, contentWidth, 10);
  lineY = addWrappedText(`Phone: ${data.phone}`, margin, lineY, contentWidth, 10);
  yPosition = lineY + 0.15;

  // License Information
  yPosition = addWrappedText('DRIVER LICENSE INFORMATION', margin, yPosition, contentWidth, 12, true);
  yPosition += 0.1;

  lineY = yPosition;
  lineY = addWrappedText(`License Number: ${data.driversLicenseNumber}`, margin, lineY, contentWidth, 10);
  lineY = addWrappedText(`State of Issue: ${data.driversLicenseState}`, margin, lineY, contentWidth, 10);
  lineY = addWrappedText(`Expiration Date: ${data.driversLicenseExpiry}`, margin, lineY, contentWidth, 10);
  yPosition = lineY + 0.15;

  // Vehicle Information
  yPosition = addWrappedText('VEHICLE INFORMATION', margin, yPosition, contentWidth, 12, true);
  yPosition += 0.1;

  lineY = yPosition;
  lineY = addWrappedText(`Vehicle Type: ${data.vehicleType.charAt(0).toUpperCase() + data.vehicleType.slice(1)}`, margin, lineY, contentWidth, 10);
  lineY = addWrappedText(`Make/Model: ${data.vehicleMake} ${data.vehicleModel} ${data.vehicleYear}`, margin, lineY, contentWidth, 10);
  lineY = addWrappedText(`Color: ${data.vehicleColor}`, margin, lineY, contentWidth, 10);
  lineY = addWrappedText(`License Plate: ${data.licensePlate}`, margin, lineY, contentWidth, 10);
  yPosition = lineY + 0.15;

  // Insurance Information
  yPosition = addWrappedText('INSURANCE INFORMATION', margin, yPosition, contentWidth, 12, true);
  yPosition += 0.1;

  lineY = yPosition;
  lineY = addWrappedText(`Insurance Provider: ${data.insuranceProvider}`, margin, lineY, contentWidth, 10);
  lineY = addWrappedText(`Policy Number: ${data.insurancePolicy}`, margin, lineY, contentWidth, 10);
  yPosition = lineY + 0.2;

  // Check if we need a new page
  if (yPosition > 10) {
    doc.addPage();
    yPosition = 0.75;
  }

  // Terms and Conditions
  yPosition = addWrappedText('INDEPENDENT CONTRACTOR RELATIONSHIP', margin, yPosition, contentWidth, 12, true);
  yPosition += 0.1;

  const terms = [
    'Contractor acknowledges and agrees that they are an independent contractor and not an employee, agent, or representative of Company.',
    'Contractor is responsible for all taxes, including but not limited to federal and state income taxes, self-employment taxes, and any other taxes or assessments as may be required by law.',
    'Company will not withhold or deduct from any fees or payments any amounts for taxes, Social Security, unemployment insurance, or any other withholdings.',
    'Contractor is not entitled to any employee benefits, including but not limited to health insurance, paid time off, or retirement benefits.',
    'Contractor has the right to control when, where, and how the services are performed, subject to the terms of this Agreement.'
  ];

  terms.forEach(term => {
    yPosition = addWrappedText(`• ${term}`, margin + 0.15, yPosition, contentWidth - 0.15, 10);
  });

  yPosition += 0.15;

  // Performance of Services
  if (yPosition > 10) {
    doc.addPage();
    yPosition = 0.75;
  }

  yPosition = addWrappedText('PERFORMANCE OF SERVICES', margin, yPosition, contentWidth, 12, true);
  yPosition += 0.1;

  const performanceTerms = [
    'Contractor agrees to provide delivery services in a professional, safe, and timely manner.',
    'Contractor shall comply with all applicable laws, regulations, and Company policies regarding delivery operations.',
    'Contractor is responsible for maintaining their vehicle in safe operating condition.',
    'Contractor must maintain valid driver\'s license, vehicle registration, and insurance coverage at all times.',
    'Contractor agrees to wear appropriate attire and maintain a professional appearance while performing services.',
    'Contractor shall not use any illegal substances or consume alcohol while performing services.',
    'Company reserves the right to terminate this Agreement at any time for violation of Company policies or applicable laws.'
  ];

  performanceTerms.forEach(term => {
    yPosition = addWrappedText(`• ${term}`, margin + 0.15, yPosition, contentWidth - 0.15, 10);
  });

  yPosition += 0.15;

  // Compensation
  if (yPosition > 10) {
    doc.addPage();
    yPosition = 0.75;
  }

  yPosition = addWrappedText('COMPENSATION', margin, yPosition, contentWidth, 12, true);
  yPosition += 0.1;

  yPosition = addWrappedText(
    'Compensation will be calculated based on delivery fees, tips, and any applicable bonuses or incentives. Payment will be made according to Company\'s standard payment schedule.',
    margin, yPosition, contentWidth, 10
  );
  yPosition += 0.25;

  yPosition = addWrappedText(
    'All tips received by Contractor during the performance of services are the sole property of Contractor.',
    margin, yPosition, contentWidth, 10
  );
  yPosition += 0.2;

  // Confidentiality and Non-Compete
  if (yPosition > 10) {
    doc.addPage();
    yPosition = 0.75;
  }

  yPosition = addWrappedText('CONFIDENTIALITY & NON-COMPETE', margin, yPosition, contentWidth, 12, true);
  yPosition += 0.1;

  const confidentialityTerms = [
    'Contractor agrees to maintain the confidentiality of all Company proprietary information, customer data, and trade secrets.',
    'During the term of this Agreement and for a period of one (1) year thereafter, Contractor agrees not to solicit or accept business from any customer introduced to Contractor through the Platform for the benefit of any competing delivery service.',
    'Contractor acknowledges that any breach of this confidentiality or non-compete provision may cause irreparable harm to Company.'
  ];

  confidentialityTerms.forEach(term => {
    yPosition = addWrappedText(`• ${term}`, margin + 0.15, yPosition, contentWidth - 0.15, 10);
  });

  yPosition += 0.2;

  // Limitation of Liability
  if (yPosition > 9.5) {
    doc.addPage();
    yPosition = 0.75;
  }

  yPosition = addWrappedText('LIABILITY & INDEMNIFICATION', margin, yPosition, contentWidth, 12, true);
  yPosition += 0.1;

  yPosition = addWrappedText(
    'Contractor agrees to indemnify and hold harmless Company from any claims, damages, losses, or expenses arising from Contractor\'s performance of services or violation of this Agreement.',
    margin, yPosition, contentWidth, 10
  );
  yPosition += 0.2;

  yPosition = addWrappedText(
    'Company provides no warranty or guarantee as to the volume or frequency of delivery opportunities available to Contractor.',
    margin, yPosition, contentWidth, 10
  );
  yPosition += 0.2;

  // Termination
  if (yPosition > 9.5) {
    doc.addPage();
    yPosition = 0.75;
  }

  yPosition = addWrappedText('TERMINATION', margin, yPosition, contentWidth, 12, true);
  yPosition += 0.1;

  yPosition = addWrappedText(
    'Either party may terminate this Agreement at any time with or without cause by providing written notice to the other party. Upon termination, Contractor shall promptly return any Company property in their possession.',
    margin, yPosition, contentWidth, 10
  );
  yPosition += 0.25;

  // Governing Law
  yPosition = addWrappedText('GOVERNING LAW', margin, yPosition, contentWidth, 12, true);
  yPosition += 0.1;

  yPosition = addWrappedText(
    'This Agreement shall be governed by and construed in accordance with the laws of the State of Ohio, without regard to its conflict of law provisions.',
    margin, yPosition, contentWidth, 10
  );
  yPosition += 0.2;

  // Signature Section
  if (yPosition > 9) {
    doc.addPage();
    yPosition = 0.75;
  }

  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 0.3;

  yPosition = addWrappedText('CONTRACTOR ACKNOWLEDGMENT', margin, yPosition, contentWidth, 12, true);
  yPosition += 0.15;

  yPosition = addWrappedText(
    'By signing below, Contractor acknowledges that they have read, understood, and agree to be bound by all terms and conditions of this Agreement. Contractor further acknowledges that they have had the opportunity to consult with legal counsel regarding this Agreement if desired.',
    margin, yPosition, contentWidth, 10
  );
  yPosition += 0.3;

  // Signature fields
  doc.line(margin, yPosition, (pageWidth - margin) / 2 - 0.2, yPosition);
  doc.line((pageWidth - margin) / 2 + 0.2, yPosition, pageWidth - margin, yPosition);
  yPosition += 0.05;

  doc.setFontSize(9);
  doc.text('Contractor Signature', margin, yPosition);
  doc.text('Date', (pageWidth - margin) / 2 + 0.2, yPosition);
  yPosition += 0.2;

  // Add signature
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(data.signatureName, margin, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(data.signatureDate, (pageWidth - margin) / 2 + 0.2, yPosition);
  yPosition += 0.3;

  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 0.2;

  doc.setFontSize(9);
  doc.text('Company Signature (Authorized Representative)', margin, yPosition);
  doc.text('Date', (pageWidth - margin) / 2 + 0.2, yPosition);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('This document was electronically generated and signed.', margin, 10.5);
  doc.text('For questions, contact support@craven.com', margin, 10.65);

  // Convert to blob
  const pdfBlob = doc.output('blob');
  return pdfBlob;
}


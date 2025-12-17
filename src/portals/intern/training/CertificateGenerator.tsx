import React, { useRef } from 'react';
import { Award, Download, Share2, CheckCircle2 } from 'lucide-react';
import type { Certification } from '@/types/internTraining';

interface CertificateGeneratorProps {
  certification: Certification;
  userName: string;
  onClose: () => void;
}

const CertificateGenerator: React.FC<CertificateGeneratorProps> = ({
  certification,
  userName,
  onClose,
}) => {
  const certRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!certRef.current) return;

    // Use html2canvas if available, otherwise create a simple text file
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      });
      
      const link = document.createElement('a');
      link.download = `certificate-${certification.module_name.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      // Fallback: Create a text certificate
      const certText = `
CERTIFICATE OF COMPLETION

This certifies that

${userName}

has successfully completed

${certification.module_name}

Score: ${certification.score}%
Date: ${new Date(certification.issued_at).toLocaleDateString()}
Verification Code: ${certification.verification_code}

Crave'n Delivery - Intern Training Program
      `.trim();
      
      const blob = new Blob([certText], { type: 'text/plain' });
      const link = document.createElement('a');
      link.download = `certificate-${certification.module_name.replace(/\s+/g, '-').toLowerCase()}.txt`;
      link.href = URL.createObjectURL(blob);
      link.click();
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `Certificate: ${certification.module_name}`,
      text: `I completed ${certification.module_name} at Crave'n Delivery with a score of ${certification.score}%!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: Copy to clipboard
      await navigator.clipboard.writeText(
        `${shareData.text}\nVerification: ${certification.verification_code}`
      );
      alert('Certificate details copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden">
        {/* Certificate Preview */}
        <div
          ref={certRef}
          className="bg-gradient-to-br from-amber-50 to-orange-50 p-8"
          style={{ minHeight: '500px' }}
        >
          {/* Border decoration */}
          <div className="border-4 border-double border-amber-400 rounded-lg p-8 bg-white/80 backdrop-blur">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full mb-4">
                <Award className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-serif font-bold text-gray-800 mb-2">
                Certificate of Completion
              </h1>
              <div className="w-32 h-1 bg-gradient-to-r from-amber-400 to-orange-500 mx-auto rounded-full" />
            </div>

            {/* Body */}
            <div className="text-center space-y-4 mb-8">
              <p className="text-gray-600">This certifies that</p>
              <p className="text-2xl font-bold text-gray-900 font-serif">
                {userName}
              </p>
              <p className="text-gray-600">has successfully completed</p>
              <p className="text-xl font-bold text-orange-600">
                {certification.module_name}
              </p>
              
              {/* Score badge */}
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-bold">Score: {certification.score}%</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-end pt-8 border-t border-amber-200">
              <div className="text-left">
                <p className="text-xs text-gray-500 mb-1">Date Issued</p>
                <p className="font-semibold text-gray-700">
                  {new Date(certification.issued_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-2">
                  {/* Crave'n Logo placeholder */}
                  <div className="w-full h-full bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-2xl">C</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Crave'n Delivery</p>
              </div>
              
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Verification Code</p>
                <p className="font-mono text-xs text-gray-600">
                  {certification.verification_code.slice(0, 8).toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-50 px-8 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Close
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleShare}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
            <button
              onClick={handleDownload}
              className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Certificate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateGenerator;


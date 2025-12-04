import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ElectronicSignatureAcknowledgmentProps {
  isOpen: boolean;
  onClose: () => void;
  onSign: (signatureName: string, auditData: {
    timestamp: string;
    ipAddress: string;
    userAgent: string;
    documentVersion: string;
  }) => void;
  documentTitle?: string;
  documentVersion?: string;
}

export function ElectronicSignatureAcknowledgment({
  isOpen,
  onClose,
  onSign,
  documentTitle = 'Document',
  documentVersion = '1.0',
}: ElectronicSignatureAcknowledgmentProps) {
  const [agreed, setAgreed] = useState(false);
  const [signatureName, setSignatureName] = useState('');

  const handleSign = () => {
    if (!agreed || !signatureName.trim()) return;

    const auditData = {
      timestamp: new Date().toISOString(),
      ipAddress: '', // Will be captured server-side
      userAgent: navigator.userAgent,
      documentVersion,
    };

    onSign(signatureName.trim(), auditData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Electronic Signature & Acknowledgment
          </DialogTitle>
        </DialogHeader>

        {/* Legal Attestation Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-2">Legal Attestation</h3>
              <p className="text-sm mb-3">
                By checking the box and typing your full legal name below, you hereby certify that:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm mb-3 ml-4">
                <li>You have read and understand this document in its entirety</li>
                <li>You agree to comply with all policies, requirements, and obligations set forth herein</li>
                <li>Your typed name constitutes your legally binding electronic signature</li>
                <li>You consent to the use of electronic records and signatures</li>
              </ul>
              <p className="text-xs text-gray-600 italic">
                This acknowledgment is made pursuant to the U.S. Electronic Signatures in Global and National Commerce Act (E-SIGN) and applicable state law.
              </p>
            </div>
          </div>
        </div>

        {/* Agreement Checkbox */}
        <div className="mb-4">
          <div className="flex items-start gap-2">
            <Checkbox
              id="agreement"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked as boolean)}
              className="mt-1"
            />
            <Label
              htmlFor="agreement"
              className="text-sm cursor-pointer leading-relaxed"
            >
              I have read, understand, and agree to comply with all requirements in this document
            </Label>
          </div>
        </div>

        {/* Electronic Signature Input */}
        <div className="mb-4">
          <Label className="text-sm font-semibold mb-1 block">
            Type Your Full Legal Name (Electronic Signature) *
          </Label>
          <p className="text-xs text-gray-600 mb-2">
            Your typed name will serve as your legally binding electronic signature
          </p>
          <Input
            type="text"
            placeholder="Enter your full legal name exactly as it appears on official documents"
            value={signatureName}
            onChange={(e) => setSignatureName(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Audit Trail Section */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold mb-2">Audit Trail: The following will be recorded with your signature:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm ml-4">
            <li>Timestamp of acknowledgment</li>
            <li>IP Address</li>
            <li>Browser/Device Information</li>
            <li>Document Version</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="text-orange-600 border-orange-600 hover:bg-orange-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSign}
            disabled={!agreed || !signatureName.trim()}
            className="bg-gray-600 hover:bg-gray-700"
          >
            <Shield className="w-4 h-4 mr-2" />
            Sign & Acknowledge
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}



import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, FileCheck, AlertCircle, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { uploadFileForOnboarding } from '../utils/authHelper';

interface OwnerVerificationStepProps {
  data: any;
  updateData: (updates: any) => void;
  onNext: () => void;
  onBack: () => void;
}

export function OwnerVerificationStep({ data, updateData, onNext, onBack }: OwnerVerificationStepProps) {
  const [uploading, setUploading] = useState<string | null>(null);

  const uploadFile = async (file: File, fileType: string) => {
    if (!data.contactEmail) {
      toast.error('Please enter your email address first before uploading documents');
      return;
    }

    setUploading(fileType);
    
    try {
      const publicUrl = await uploadFileForOnboarding(
        file, 
        fileType, 
        data.contactEmail,
        'restaurant-documents'
      );
      
      if (publicUrl) {
        updateData({ [fileType]: publicUrl });
        toast.success('Document uploaded successfully');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload file');
    } finally {
      setUploading(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, fileType: string) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file, fileType);
    }
  };

  const isValid = 
    data.ownerIdUrl &&
    data.ssnLast4?.length === 4 &&
    data.backgroundCheckAuthorized;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Owner Verification</h2>
        <p className="text-gray-600">We need to verify the restaurant owner's identity</p>
      </div>

      <div className="space-y-6">
        {/* Government ID Upload */}
        <div className="space-y-2">
          <Label htmlFor="ownerIdUrl">Government-Issued ID (Driver's License or Passport) *</Label>
          <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
            {data.ownerIdUrl ? (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <FileCheck className="w-5 h-5" />
                <span className="font-medium">ID Uploaded Successfully</span>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 mx-auto text-gray-400" />
                <div className="text-sm text-gray-600">
                  <label htmlFor="ownerIdUrl" className="cursor-pointer text-primary hover:text-primary/80">
                    Click to upload
                  </label>
                  {' '}or drag and drop
                </div>
                <p className="text-xs text-gray-500">PDF, PNG, or JPG (max 10MB)</p>
              </div>
            )}
            <input
              id="ownerIdUrl"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => handleFileUpload(e, 'ownerIdUrl')}
              disabled={uploading === 'ownerIdUrl'}
              className="hidden"
            />
          </div>
          <p className="text-xs text-gray-500 flex items-start gap-1">
            <Shield className="w-3 h-3 mt-0.5 flex-shrink-0" />
            Your ID is encrypted and only used for verification purposes
          </p>
        </div>

        {/* SSN Last 4 */}
        <div className="space-y-2">
          <Label htmlFor="ssnLast4">Social Security Number (Last 4 Digits) *</Label>
          <Input
            id="ssnLast4"
            type="text"
            maxLength={4}
            pattern="[0-9]{4}"
            placeholder="1234"
            value={data.ssnLast4 || ''}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '');
              updateData({ ssnLast4: value });
            }}
          />
          <p className="text-xs text-gray-500">Required for IRS reporting and verification</p>
        </div>

        {/* Background Check Authorization */}
        <div className="space-y-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Checkbox
              id="backgroundCheckAuthorized"
              checked={data.backgroundCheckAuthorized || false}
              onCheckedChange={(checked) => updateData({ backgroundCheckAuthorized: checked })}
            />
            <div className="space-y-1">
              <Label htmlFor="backgroundCheckAuthorized" className="text-sm font-medium cursor-pointer">
                Background Check Authorization *
              </Label>
              <p className="text-xs text-gray-600">
                I authorize Crave'N to conduct a background check as required for restaurant partner verification. 
                This may include criminal history and business verification checks.
              </p>
            </div>
          </div>
        </div>

        {/* Info Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Why do we need this information?</p>
              <ul className="space-y-1 text-blue-800">
                <li>• To comply with federal regulations and tax reporting</li>
                <li>• To ensure the safety and security of our platform</li>
                <li>• To verify business ownership and legitimacy</li>
                <li>• All information is encrypted and stored securely</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button 
          onClick={onNext} 
          disabled={!isValid || uploading !== null}
        >
          {uploading ? 'Uploading...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}

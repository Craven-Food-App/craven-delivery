import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, ArrowLeft, Building2, Upload, FileCheck, Shield } from 'lucide-react';
import { OnboardingData } from '../RestaurantOnboardingWizard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { uploadFileForOnboarding } from '../utils/authHelper';

interface BusinessDetailsStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const cuisineTypes = [
  'American', 'Italian', 'Mexican', 'Chinese', 'Japanese', 'Indian', 'Thai',
  'Mediterranean', 'French', 'Greek', 'Korean', 'Vietnamese', 'Lebanese',
  'Pizza', 'Burgers', 'Seafood', 'Vegetarian', 'Healthy', 'Fast Food', 'Other'
];

export function BusinessDetailsStep({ data, updateData, onNext, onBack }: BusinessDetailsStepProps) {
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
    data.legalBusinessName.trim().length >= 2 &&
    data.businessType &&
    data.ein.trim().length >= 9 &&
    data.yearsInBusiness &&
    data.cuisineType &&
    data.description.trim().length >= 20 &&
    data.businessLicenseUrl;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Building2 className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-bold mb-2">Business Information</h2>
        <p className="text-muted-foreground">
          Help us verify your business details for tax and legal purposes
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="legalBusinessName">Legal Business Name *</Label>
          <Input
            id="legalBusinessName"
            value={data.legalBusinessName}
            onChange={(e) => updateData({ legalBusinessName: e.target.value })}
            placeholder="As registered with the IRS"
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="businessType">Business Type *</Label>
            <Select
              value={data.businessType}
              onValueChange={(value: any) => updateData({ businessType: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="llc">LLC</SelectItem>
                <SelectItem value="corporation">Corporation</SelectItem>
                <SelectItem value="sole_proprietor">Sole Proprietor</SelectItem>
                <SelectItem value="partnership">Partnership</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="ein">EIN (Tax ID) *</Label>
            <Input
              id="ein"
              value={data.ein}
              onChange={(e) => updateData({ ein: e.target.value.replace(/\D/g, '').slice(0, 9) })}
              placeholder="XX-XXXXXXX"
              className="mt-1"
              maxLength={10}
            />
            <p className="text-xs text-muted-foreground mt-1">9-digit Employer Identification Number</p>
          </div>
        </div>

        <div>
          <Label htmlFor="yearsInBusiness">Years in Business *</Label>
          <Select
            value={data.yearsInBusiness}
            onValueChange={(value) => updateData({ yearsInBusiness: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="less_than_1">Less than 1 year</SelectItem>
              <SelectItem value="1-3">1-3 years</SelectItem>
              <SelectItem value="3-5">3-5 years</SelectItem>
              <SelectItem value="5-10">5-10 years</SelectItem>
              <SelectItem value="10+">10+ years</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="cuisineType">Cuisine Type *</Label>
          <Select
            value={data.cuisineType}
            onValueChange={(value) => updateData({ cuisineType: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select cuisine type" />
            </SelectTrigger>
            <SelectContent>
              {cuisineTypes.map((cuisine) => (
                <SelectItem key={cuisine} value={cuisine}>
                  {cuisine}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="description">Restaurant Description *</Label>
          <Textarea
            id="description"
            value={data.description}
            onChange={(e) => updateData({ description: e.target.value })}
            placeholder="Tell customers what makes your restaurant special..."
            className="mt-1 min-h-[120px]"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {data.description.length}/500 characters (minimum 20)
          </p>
        </div>

        {/* Required Business Documents */}
        <div className="space-y-4 pt-6 border-t">
          <h3 className="text-lg font-semibold">Required Business Documents</h3>
          
          {/* Business License */}
          <div className="space-y-2">
            <Label htmlFor="businessLicenseUrl">Business License *</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
              {data.businessLicenseUrl ? (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <FileCheck className="w-5 h-5" />
                  <span className="text-sm font-medium">License Uploaded</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-6 h-6 mx-auto text-gray-400" />
                  <div className="text-sm text-gray-600">
                    <label htmlFor="businessLicenseUrl" className="cursor-pointer text-primary hover:text-primary/80">
                      Upload business license
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">PDF, PNG, or JPG (max 10MB)</p>
                </div>
              )}
              <input
                id="businessLicenseUrl"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => handleFileUpload(e, 'businessLicenseUrl')}
                disabled={uploading === 'businessLicenseUrl'}
                className="hidden"
              />
            </div>
          </div>

          {/* Health Permit - Optional */}
          <div className="space-y-2">
            <Label htmlFor="healthPermitUrl">
              Health Permit / Food Handler's Certificate (Optional)
            </Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
              {data.healthPermitUrl ? (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <FileCheck className="w-5 h-5" />
                  <span className="text-sm font-medium">Permit Uploaded</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-6 h-6 mx-auto text-gray-400" />
                  <div className="text-sm text-gray-600">
                    <label htmlFor="healthPermitUrl" className="cursor-pointer text-primary hover:text-primary/80">
                      Upload health permit (optional)
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">PDF, PNG, or JPG (max 10MB)</p>
                </div>
              )}
              <input
                id="healthPermitUrl"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => handleFileUpload(e, 'healthPermitUrl')}
                disabled={uploading === 'healthPermitUrl'}
                className="hidden"
              />
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <Shield className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-900">
                While optional now, this document may be required at a later date or upon request by Crave'n for compliance verification.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-900">
              All documents are securely encrypted and used for verification purposes only. Additional documents may be requested by Crave'n to ensure compliance with local regulations.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-6 border-t">
        <Button onClick={onBack} variant="outline" size="lg">
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!isValid || uploading !== null} size="lg">
          {uploading ? 'Uploading...' : 'Continue'}
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

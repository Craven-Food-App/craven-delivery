/**
 * Ad Creation Modal Component
 * Multi-step form for creating marketing ads with live preview
 */

import React, { useState, useRef } from 'react';
import { X, Check, Circle, Upload, Camera, Image as ImageIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdCreationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface AdFormData {
  // Campaign details
  campaignName: string;
  objective: string;
  
  // Ad creative
  imageUrl: string | null;
  primaryText: string;
  headline: string;
  description: string;
  callToAction: string;
  
  // Audience
  targetAudience: string;
  ageRange: string;
  locations: string;
  
  // Budget & schedule
  budget: string;
  scheduleType: string;
  
  // Review - auto-generated from above
}

const STEPS = [
  { id: 1, name: 'Campaign details', key: 'campaign' },
  { id: 2, name: 'Ad creative', key: 'creative' },
  { id: 3, name: 'Audience', key: 'audience' },
  { id: 4, name: 'Budget & schedule', key: 'budget' },
  { id: 5, name: 'Review', key: 'review' },
];

const CALL_TO_ACTIONS = [
  'Shop Now',
  'Learn More',
  'Sign Up',
  'Download',
  'Book Now',
  'Contact Us',
  'Get Started',
];

const AdCreationModal: React.FC<AdCreationModalProps> = ({ open, onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<AdFormData>({
    campaignName: '',
    objective: '',
    imageUrl: null,
    primaryText: '',
    headline: '',
    description: '',
    callToAction: 'Shop Now',
    targetAudience: '',
    ageRange: '',
    locations: '',
    budget: '',
    scheduleType: 'continuous',
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert('Please select an image or video file');
      return;
    }

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({
        ...prev,
        imageUrl: event.target?.result as string
      }));
      setUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (field: keyof AdFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.campaignName || !formData.objective || !formData.budget) {
      toast.error('Please complete all required fields');
      return;
    }

    setSubmitting(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to create a campaign');
        return;
      }

      // Determine start and end dates based on schedule type
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = formData.scheduleType === 'continuous' 
        ? null 
        : null; // TODO: Add date picker for scheduled campaigns

      // Prepare metadata with ad creative details
      const metadata = {
        imageUrl: formData.imageUrl,
        primaryText: formData.primaryText,
        headline: formData.headline,
        description: formData.description,
        callToAction: formData.callToAction,
        ageRange: formData.ageRange,
        locations: formData.locations,
        scheduleType: formData.scheduleType,
      };

      // Insert campaign into database
      const { data: campaign, error } = await supabase
        .from('marketing_campaigns')
        .insert({
          campaign_name: formData.campaignName,
          campaign_type: 'ad', // Type of campaign
          channel: 'web', // Default channel, could be enhanced
          objective: formData.objective,
          start_date: startDate,
          end_date: endDate,
          budget: parseFloat(formData.budget) || 0,
          spend_to_date: 0,
          target_audience: formData.targetAudience || 'all',
          status: 'draft', // Start as draft, can be activated later
          created_by: user.id,
          metadata: metadata,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating campaign:', error);
        toast.error('Failed to create campaign: ' + error.message);
        return;
      }

      toast.success('Campaign created successfully!');
      
      // Reset form
      setFormData({
        campaignName: '',
        objective: '',
        imageUrl: null,
        primaryText: '',
        headline: '',
        description: '',
        callToAction: 'Shop Now',
        targetAudience: '',
        ageRange: '',
        locations: '',
        budget: '',
        scheduleType: 'continuous',
      });
      setCurrentStep(1);
      
      // Close modal
      onClose();
      
      // Refresh campaign list if callback provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const isStepComplete = (stepId: number): boolean => {
    if (stepId === 1) {
      return formData.campaignName !== '' && formData.objective !== '';
    }
    if (stepId === 2) {
      return formData.imageUrl !== null && formData.primaryText !== '' && formData.headline !== '';
    }
    if (stepId === 3) {
      return formData.targetAudience !== '' && formData.ageRange !== '';
    }
    if (stepId === 4) {
      return formData.budget !== '';
    }
    return false;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="campaignName">Campaign Name *</Label>
              <Input
                id="campaignName"
                value={formData.campaignName}
                onChange={(e) => handleInputChange('campaignName', e.target.value)}
                placeholder="Enter campaign name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="objective">Campaign Objective *</Label>
              <Select value={formData.objective} onValueChange={(value) => handleInputChange('objective', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select objective" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="awareness">Brand Awareness</SelectItem>
                  <SelectItem value="traffic">Drive Website Traffic</SelectItem>
                  <SelectItem value="engagement">Engagement</SelectItem>
                  <SelectItem value="conversions">Conversions</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Form Inputs */}
            <div className="space-y-6">
              {/* Image/Video Upload */}
              <div>
                <Label>Image/Video *</Label>
                <div className="mt-2">
                  {formData.imageUrl ? (
                    <div className="relative">
                      {formData.imageUrl.startsWith('data:video/') ? (
                        <video src={formData.imageUrl} className="w-full h-64 object-cover rounded-lg" controls />
                      ) : (
                        <img src={formData.imageUrl} alt="Ad creative" className="w-full h-64 object-cover rounded-lg" />
                      )}
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, imageUrl: null }))}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors cursor-pointer"
                    >
                      <Camera className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-sm font-medium text-gray-700 mb-1">Upload image or video</p>
                      <p className="text-xs text-gray-500">PNG, JPG, MP4 up to 10MB</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>
                
                {/* Existing Media */}
                <div className="mt-4">
                  <Label className="text-sm text-gray-600 mb-2 block">Existing media</Label>
                  <div className="flex gap-2">
                    <div className="w-20 h-20 border rounded-lg overflow-hidden cursor-pointer hover:border-blue-500 transition-colors">
                      <img 
                        src="https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=100&h=100&fit=crop" 
                        alt="Burger" 
                        className="w-full h-full object-cover"
                        onClick={() => setFormData(prev => ({ ...prev, imageUrl: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=400&h=400&fit=crop' }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Primary Text */}
              <div>
                <Label htmlFor="primaryText">Primary text *</Label>
                <Textarea
                  id="primaryText"
                  value={formData.primaryText}
                  onChange={(e) => handleInputChange('primaryText', e.target.value)}
                  placeholder="Say something about your ad..."
                  className="mt-1 min-h-[100px]"
                />
              </div>

              {/* Headline */}
              <div>
                <Label htmlFor="headline">Headline *</Label>
                <Input
                  id="headline"
                  value={formData.headline}
                  onChange={(e) => handleInputChange('headline', e.target.value)}
                  placeholder="Add a headline"
                  className="mt-1"
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Add a description"
                  className="mt-1"
                />
              </div>

              {/* Call to Action */}
              <div>
                <Label htmlFor="callToAction">Call to action</Label>
                <Select 
                  value={formData.callToAction} 
                  onValueChange={(value) => handleInputChange('callToAction', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CALL_TO_ACTIONS.map((cta) => (
                      <SelectItem key={cta} value={cta}>{cta}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Right Column - Mobile Preview */}
            <div className="lg:sticky lg:top-4">
              <div className="bg-gray-100 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-3 text-center">Preview</p>
                {/* Mobile Phone Frame */}
                <div className="bg-white rounded-[2rem] p-2 shadow-2xl mx-auto" style={{ width: '320px', maxWidth: '100%' }}>
                  <div className="bg-white rounded-[1.5rem] overflow-hidden" style={{ minHeight: '500px' }}>
                    {/* Profile Header */}
                    <div className="flex items-center gap-2 p-3 border-b border-gray-200">
                      <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                        CD
                      </div>
                      <span className="font-semibold text-sm">Craven Delivery</span>
                    </div>

                    {/* Ad Content */}
                    <div>
                      {/* Primary Text */}
                      {formData.primaryText ? (
                        <p className="p-3 text-sm text-gray-800">{formData.primaryText}</p>
                      ) : (
                        <p className="p-3 text-sm text-gray-400 italic">Say something about your ad...</p>
                      )}

                      {/* Image/Video */}
                      {formData.imageUrl ? (
                        formData.imageUrl.startsWith('data:video/') ? (
                          <video src={formData.imageUrl} className="w-full object-cover" style={{ maxHeight: '200px' }} controls />
                        ) : (
                          <img 
                            src={formData.imageUrl} 
                            alt="Ad" 
                            className="w-full object-cover" 
                            style={{ maxHeight: '200px' }}
                          />
                        )
                      ) : (
                        <div className="w-full bg-gray-200 flex items-center justify-center" style={{ height: '200px' }}>
                          <ImageIcon className="h-12 w-12 text-gray-400" />
                        </div>
                      )}

                      {/* Headline */}
                      {formData.headline ? (
                        <p className="px-3 pt-2 font-semibold text-base text-gray-900">{formData.headline}</p>
                      ) : (
                        <p className="px-3 pt-2 text-base text-gray-400 italic">Add a headline</p>
                      )}

                      {/* Description */}
                      {formData.description && (
                        <p className="px-3 py-1 text-sm text-gray-600">{formData.description}</p>
                      )}

                      {/* Call to Action Button */}
                      <div className="p-3">
                        <button className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg text-sm hover:bg-blue-700 transition-colors">
                          {formData.callToAction || 'Shop Now'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="targetAudience">Target Audience *</Label>
              <Select value={formData.targetAudience} onValueChange={(value) => handleInputChange('targetAudience', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select target audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  <SelectItem value="customers">Existing Customers</SelectItem>
                  <SelectItem value="prospects">Prospects</SelectItem>
                  <SelectItem value="lookalike">Lookalike Audience</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ageRange">Age Range *</Label>
              <Select value={formData.ageRange} onValueChange={(value) => handleInputChange('ageRange', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select age range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="18-24">18-24</SelectItem>
                  <SelectItem value="25-34">25-34</SelectItem>
                  <SelectItem value="35-44">35-44</SelectItem>
                  <SelectItem value="45-54">45-54</SelectItem>
                  <SelectItem value="55+">55+</SelectItem>
                  <SelectItem value="all">All Ages</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="locations">Locations</Label>
              <Input
                id="locations"
                value={formData.locations}
                onChange={(e) => handleInputChange('locations', e.target.value)}
                placeholder="Enter locations (e.g., United States, Canada)"
                className="mt-1"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="budget">Daily Budget *</Label>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-gray-500">$</span>
                <Input
                  id="budget"
                  type="number"
                  value={formData.budget}
                  onChange={(e) => handleInputChange('budget', e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum daily budget: $1.00</p>
            </div>
            <div>
              <Label htmlFor="scheduleType">Schedule Type</Label>
              <Select value={formData.scheduleType} onValueChange={(value) => handleInputChange('scheduleType', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="continuous">Run continuously</SelectItem>
                  <SelectItem value="scheduled">Schedule start and end dates</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-4">Campaign Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Campaign Name:</span>
                  <span className="font-medium">{formData.campaignName || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Objective:</span>
                  <span className="font-medium">{formData.objective || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Target Audience:</span>
                  <span className="font-medium">{formData.targetAudience || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Age Range:</span>
                  <span className="font-medium">{formData.ageRange || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Daily Budget:</span>
                  <span className="font-medium">${formData.budget || '0.00'}</span>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Review all details above. Click "Create Ad" to publish your campaign.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Create new ad</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Steps */}
          <div className="w-64 border-r border-gray-200 p-6 bg-gray-50 overflow-y-auto">
            <div className="space-y-4">
              {STEPS.map((step) => {
                const isComplete = isStepComplete(step.id);
                const isCurrent = currentStep === step.id;
                const isPast = currentStep > step.id;

                return (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(step.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      isCurrent
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {isComplete || isPast ? (
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      ) : (
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isCurrent
                            ? 'border-blue-600 bg-blue-600'
                            : 'border-gray-300'
                        }`}>
                          {isCurrent && <div className="w-2 h-2 rounded-full bg-white"></div>}
                        </div>
                      )}
                    </div>
                    <span className="text-sm">{step.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel - Step Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {STEPS[currentStep - 1]?.name}
              </h3>
            </div>
            {renderStepContent()}
          </div>
        </div>

        {/* Footer - Navigation */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            Back
          </Button>
          {currentStep < STEPS.length ? (
            <Button
              onClick={handleNext}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create Ad'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdCreationModal;


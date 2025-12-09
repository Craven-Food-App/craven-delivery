/**
 * Co-Branded Campaign Creation Modal
 * Create marketing campaigns featuring specific merchant partners
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { addDays } from 'date-fns';

interface Merchant {
  id: string;
  name: string;
  city: string;
  cuisineType: string;
}

interface CoBrandedCampaignModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedMerchantId?: string;
}

interface CampaignFormData {
  merchantId: string;
  campaignName: string;
  objective: string;
  description: string;
  budget: string;
  startDate: string;
  endDate: string;
  targetAudience: string;
  ageRange: string;
  locations: string;
}

const CoBrandedCampaignModal: React.FC<CoBrandedCampaignModalProps> = ({
  open,
  onClose,
  onSuccess,
  preselectedMerchantId,
}) => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<CampaignFormData>({
    merchantId: preselectedMerchantId || '',
    campaignName: '',
    objective: '',
    description: '',
    budget: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: addDays(new Date(), 30).toISOString().split('T')[0],
    targetAudience: 'all',
    ageRange: 'all',
    locations: '',
  });

  useEffect(() => {
    if (open) {
      fetchMerchants();
      if (preselectedMerchantId) {
        setFormData((prev) => ({ ...prev, merchantId: preselectedMerchantId }));
      }
    }
  }, [open, preselectedMerchantId]);

  const fetchMerchants = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, city, cuisine_type')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      setMerchants(
        (data || []).map((r) => ({
          id: r.id,
          name: r.name,
          city: r.city || '',
          cuisineType: r.cuisine_type || 'Unknown',
        }))
      );
    } catch (error) {
      console.error('Error fetching merchants:', error);
      toast.error('Failed to load merchants');
    }
  };

  const handleInputChange = (field: keyof CampaignFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.merchantId) {
      toast.error('Please select a merchant partner');
      return;
    }
    if (!formData.campaignName || !formData.objective || !formData.budget) {
      toast.error('Please complete all required fields');
      return;
    }
    if (parseFloat(formData.budget) <= 0) {
      toast.error('Budget must be greater than 0');
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

      // Get merchant details
      const selectedMerchant = merchants.find((m) => m.id === formData.merchantId);
      if (!selectedMerchant) {
        toast.error('Selected merchant not found');
        return;
      }

      // Insert campaign into database
      const { data: campaign, error } = await supabase
        .from('marketing_campaigns')
        .insert({
          campaign_name: formData.campaignName,
          campaign_type: 'co_branded', // Type: co-branded campaign
          channel: 'web', // Default channel
          objective: formData.objective,
          start_date: formData.startDate,
          end_date: formData.endDate || null,
          budget: parseFloat(formData.budget) || 0,
          spend_to_date: 0,
          target_audience: formData.targetAudience || 'all',
          status: 'draft', // Start as draft
          created_by: user.id,
          metadata: {
            merchant_id: formData.merchantId,
            merchant_name: selectedMerchant.name,
            merchant_city: selectedMerchant.city,
            merchant_cuisine: selectedMerchant.cuisineType,
            description: formData.description,
            age_range: formData.ageRange,
            locations: formData.locations,
            is_co_branded: true,
          },
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating co-branded campaign:', error);
        toast.error('Failed to create campaign: ' + error.message);
        return;
      }

      toast.success('Co-branded campaign created successfully!');
      
      // Reset form
      setFormData({
        merchantId: preselectedMerchantId || '',
        campaignName: '',
        objective: '',
        description: '',
        budget: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: addDays(new Date(), 30).toISOString().split('T')[0],
        targetAudience: 'all',
        ageRange: 'all',
        locations: '',
      });
      
      // Close modal
      onClose();
      
      // Refresh campaigns list if callback provided
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Create Co-Branded Campaign</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Merchant Selection */}
          <div>
            <Label htmlFor="merchantId">Merchant Partner *</Label>
            <Select
              value={formData.merchantId}
              onValueChange={(value) => handleInputChange('merchantId', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a merchant partner" />
              </SelectTrigger>
              <SelectContent>
                {merchants.map((merchant) => (
                  <SelectItem key={merchant.id} value={merchant.id}>
                    {merchant.name} - {merchant.city} ({merchant.cuisineType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Select the merchant partner to feature in this co-branded campaign
            </p>
          </div>

          {/* Campaign Name */}
          <div>
            <Label htmlFor="campaignName">Campaign Name *</Label>
            <Input
              id="campaignName"
              value={formData.campaignName}
              onChange={(e) => handleInputChange('campaignName', e.target.value)}
              placeholder="e.g., Summer Special with [Merchant Name]"
              className="mt-1"
            />
          </div>

          {/* Objective */}
          <div>
            <Label htmlFor="objective">Campaign Objective *</Label>
            <Select
              value={formData.objective}
              onValueChange={(value) => handleInputChange('objective', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select objective" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="awareness">Brand Awareness</SelectItem>
                <SelectItem value="traffic">Drive Traffic</SelectItem>
                <SelectItem value="engagement">Engagement</SelectItem>
                <SelectItem value="conversions">Conversions</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="partner_growth">Partner Growth</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Campaign Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the co-branded campaign..."
              className="mt-1 min-h-[100px]"
            />
          </div>

          {/* Budget */}
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
                className="flex-1"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Minimum daily budget: $1.00</p>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                className="mt-1"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                className="mt-1"
                min={formData.startDate}
              />
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <Label htmlFor="targetAudience">Target Audience</Label>
            <Select
              value={formData.targetAudience}
              onValueChange={(value) => handleInputChange('targetAudience', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everyone</SelectItem>
                <SelectItem value="customers">Existing Customers</SelectItem>
                <SelectItem value="prospects">Prospects</SelectItem>
                <SelectItem value="lookalike">Lookalike Audience</SelectItem>
                <SelectItem value="local">Local Customers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Age Range */}
          <div>
            <Label htmlFor="ageRange">Age Range</Label>
            <Select
              value={formData.ageRange}
              onValueChange={(value) => handleInputChange('ageRange', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ages</SelectItem>
                <SelectItem value="18-24">18-24</SelectItem>
                <SelectItem value="25-34">25-34</SelectItem>
                <SelectItem value="35-44">35-44</SelectItem>
                <SelectItem value="45-54">45-54</SelectItem>
                <SelectItem value="55+">55+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Locations */}
          <div>
            <Label htmlFor="locations">Locations</Label>
            <Input
              id="locations"
              value={formData.locations}
              onChange={(e) => handleInputChange('locations', e.target.value)}
              placeholder="e.g., United States, Canada"
              className="mt-1"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-orange-600 hover:bg-orange-700"
            disabled={submitting}
          >
            {submitting ? 'Creating...' : 'Create Campaign'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CoBrandedCampaignModal;


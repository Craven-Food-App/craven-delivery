/**
 * Bonus Campaign Creation Modal
 * Create driver bonus campaigns and challenges
 */

import React, { useState } from 'react';
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

interface BonusCampaignModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface CampaignFormData {
  title: string;
  description: string;
  shortDescription: string;
  challengeType: string;
  requirementValue: string;
  rewardType: string;
  rewardAmount: string;
  rewardMultiplier: string;
  targetAudience: string;
  maxParticipants: string;
  startDate: string;
  endDate: string;
  isFeatured: boolean;
}

const BonusCampaignModal: React.FC<BonusCampaignModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<CampaignFormData>({
    title: '',
    description: '',
    shortDescription: '',
    challengeType: 'delivery_count',
    requirementValue: '',
    rewardType: 'cash_bonus',
    rewardAmount: '',
    rewardMultiplier: '1.0',
    targetAudience: 'all',
    maxParticipants: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: addDays(new Date(), 30).toISOString().split('T')[0],
    isFeatured: false,
  });

  const handleInputChange = (field: keyof CampaignFormData, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.title || !formData.description) {
      toast.error('Please complete all required fields');
      return;
    }
    if (!formData.requirementValue || parseFloat(formData.requirementValue) <= 0) {
      toast.error('Requirement value must be greater than 0');
      return;
    }
    if (formData.rewardType === 'cash_bonus' && (!formData.rewardAmount || parseFloat(formData.rewardAmount) <= 0)) {
      toast.error('Reward amount must be greater than 0');
      return;
    }
    if (formData.rewardType === 'multiplier' && (!formData.rewardMultiplier || parseFloat(formData.rewardMultiplier) <= 1)) {
      toast.error('Reward multiplier must be greater than 1');
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

      // Prepare reward details
      const rewardDetails: any = {};
      if (formData.rewardType === 'cash_bonus') {
        rewardDetails.amount_cents = Math.round(parseFloat(formData.rewardAmount) * 100);
      } else if (formData.rewardType === 'multiplier') {
        rewardDetails.multiplier = parseFloat(formData.rewardMultiplier);
      }

      // Prepare requirement details
      const requirementDetails: any = {};
      if (formData.challengeType === 'geographic') {
        requirementDetails.cities = [];
      }

      // Insert campaign into database
      const { data: campaign, error } = await supabase
        .from('driver_promotions')
        .insert({
          title: formData.title,
          description: formData.description,
          short_description: formData.shortDescription || null,
          challenge_type: formData.challengeType,
          requirement_value: parseInt(formData.requirementValue),
          requirement_details: requirementDetails,
          reward_type: formData.rewardType,
          reward_amount_cents: formData.rewardType === 'cash_bonus' 
            ? Math.round(parseFloat(formData.rewardAmount) * 100) 
            : null,
          reward_multiplier: formData.rewardType === 'multiplier' 
            ? parseFloat(formData.rewardMultiplier) 
            : null,
          reward_details: rewardDetails,
          target_audience: formData.targetAudience,
          target_cities: [],
          target_tiers: [],
          max_participants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null,
          current_participants: 0,
          starts_at: new Date(formData.startDate).toISOString(),
          ends_at: new Date(formData.endDate).toISOString(),
          is_active: true,
          is_featured: formData.isFeatured,
          priority: 0,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating bonus campaign:', error);
        toast.error('Failed to create campaign: ' + error.message);
        return;
      }

      toast.success('Bonus campaign created successfully!');
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        shortDescription: '',
        challengeType: 'delivery_count',
        requirementValue: '',
        rewardType: 'cash_bonus',
        rewardAmount: '',
        rewardMultiplier: '1.0',
        targetAudience: 'all',
        maxParticipants: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: addDays(new Date(), 30).toISOString().split('T')[0],
        isFeatured: false,
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
          <DialogTitle className="text-2xl font-bold">Create Bonus Campaign</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Campaign Title */}
          <div>
            <Label htmlFor="title">Campaign Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g., Complete 20 Deliveries"
              className="mt-1"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the bonus campaign..."
              className="mt-1 min-h-[100px]"
            />
          </div>

          {/* Short Description */}
          <div>
            <Label htmlFor="shortDescription">Short Description</Label>
            <Input
              id="shortDescription"
              value={formData.shortDescription}
              onChange={(e) => handleInputChange('shortDescription', e.target.value)}
              placeholder="Brief summary (optional)"
              className="mt-1"
            />
          </div>

          {/* Challenge Type */}
          <div>
            <Label htmlFor="challengeType">Challenge Type *</Label>
            <Select
              value={formData.challengeType}
              onValueChange={(value) => handleInputChange('challengeType', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="delivery_count">Delivery Count</SelectItem>
                <SelectItem value="time_based">Time Based</SelectItem>
                <SelectItem value="peak_hours">Peak Hours</SelectItem>
                <SelectItem value="geographic">Geographic</SelectItem>
                <SelectItem value="rating_based">Rating Based</SelectItem>
                <SelectItem value="streak_based">Streak Based</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Requirement Value */}
          <div>
            <Label htmlFor="requirementValue">Requirement Value *</Label>
            <Input
              id="requirementValue"
              type="number"
              value={formData.requirementValue}
              onChange={(e) => handleInputChange('requirementValue', e.target.value)}
              placeholder="e.g., 20 (deliveries, hours, etc.)"
              min="1"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Number of deliveries, hours, or other metric required
            </p>
          </div>

          {/* Reward Type */}
          <div>
            <Label htmlFor="rewardType">Reward Type *</Label>
            <Select
              value={formData.rewardType}
              onValueChange={(value) => handleInputChange('rewardType', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash_bonus">Cash Bonus</SelectItem>
                <SelectItem value="per_delivery_bonus">Per Delivery Bonus</SelectItem>
                <SelectItem value="guaranteed_earnings">Guaranteed Earnings</SelectItem>
                <SelectItem value="multiplier">Earnings Multiplier</SelectItem>
                <SelectItem value="achievement">Achievement Badge</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reward Amount (for cash bonuses) */}
          {formData.rewardType === 'cash_bonus' && (
            <div>
              <Label htmlFor="rewardAmount">Reward Amount ($) *</Label>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-gray-500">$</span>
                <Input
                  id="rewardAmount"
                  type="number"
                  value={formData.rewardAmount}
                  onChange={(e) => handleInputChange('rewardAmount', e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="flex-1"
                />
              </div>
            </div>
          )}

          {/* Reward Multiplier (for multiplier type) */}
          {formData.rewardType === 'multiplier' && (
            <div>
              <Label htmlFor="rewardMultiplier">Multiplier *</Label>
              <Input
                id="rewardMultiplier"
                type="number"
                value={formData.rewardMultiplier}
                onChange={(e) => handleInputChange('rewardMultiplier', e.target.value)}
                placeholder="1.5"
                min="1"
                step="0.1"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">e.g., 1.5 = 1.5x earnings</p>
            </div>
          )}

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
                <SelectItem value="all">All Drivers</SelectItem>
                <SelectItem value="new_drivers">New Drivers</SelectItem>
                <SelectItem value="elite_only">Elite Drivers Only</SelectItem>
                <SelectItem value="specific_city">Specific City</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Max Participants */}
          <div>
            <Label htmlFor="maxParticipants">Max Participants (Optional)</Label>
            <Input
              id="maxParticipants"
              type="number"
              value={formData.maxParticipants}
              onChange={(e) => handleInputChange('maxParticipants', e.target.value)}
              placeholder="Leave empty for unlimited"
              min="1"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Limit the number of participants (creates scarcity)
            </p>
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
              <Label htmlFor="endDate">End Date *</Label>
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

          {/* Featured */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isFeatured"
              checked={formData.isFeatured}
              onChange={(e) => handleInputChange('isFeatured', e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor="isFeatured" className="cursor-pointer">
              Feature this campaign (show prominently)
            </Label>
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

export default BonusCampaignModal;




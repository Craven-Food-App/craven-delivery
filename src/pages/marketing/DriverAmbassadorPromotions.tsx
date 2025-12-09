/**
 * Driver & Ambassador Promotions
 * Manage driver referral codes, ambassador programs, and bonus campaigns
 */

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck, Trophy, Users, Gift, Plus, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import BonusCampaignModal from './BonusCampaignModal';
import { toast } from 'sonner';

interface DriverPromo {
  id: string;
  driverName: string;
  referralCode: string;
  referrals: number;
  bonusesEarned: number;
  status: 'active' | 'inactive';
}

interface BonusCampaign {
  id: string;
  name: string;
  description: string;
  requirement: string;
  reward: string;
  participants: number;
  status: 'active' | 'completed' | 'paused';
}

const DriverAmbassadorPromotions: React.FC = () => {
  const [driverPromos, setDriverPromos] = useState<DriverPromo[]>([]);
  const [bonusCampaigns, setBonusCampaigns] = useState<BonusCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchDriverData();
    fetchBonusCampaigns();
  }, []);

  const fetchDriverData = async () => {
    try {
      // Get drivers with referral stats
      const { data: drivers } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .eq('role', 'driver');

      // Get referral data
      const { data: referrals } = await supabase
        .from('referrals')
        .select('referrer_id, referrer_bonus_amount');

      const driverStats = (drivers || []).map(driver => {
        const driverReferrals = referrals?.filter(r => r.referrer_id === driver.user_id) || [];
        return {
          id: driver.user_id,
          driverName: driver.full_name || 'Unknown Driver',
          referralCode: `DRIVER${driver.user_id.slice(0, 8).toUpperCase()}`,
          referrals: driverReferrals.length,
          bonusesEarned: driverReferrals.reduce((sum, r) => sum + ((r.referrer_bonus_amount || 0) / 100), 0),
          status: 'active' as const
        };
      });

      setDriverPromos(driverStats.sort((a, b) => b.referrals - a.referrals));
    } catch (error) {
      console.error('Error fetching driver data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBonusCampaigns = async () => {
    try {
      // Fetch bonus campaigns from driver_promotions table
      const { data: campaignsData, error } = await supabase
        .from('driver_promotions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // If table doesn't exist, use empty array
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          console.warn('driver_promotions table not found. Run migration 20250120000005_driver_promotions_system.sql');
          setBonusCampaigns([]);
          return;
        }
        throw error;
      }

      // Transform to BonusCampaign format
      const transformedCampaigns: BonusCampaign[] = (campaignsData || []).map((campaign) => {
        // Format requirement
        const requirementValue = campaign.requirement_value || 0;
        let requirement = '';
        switch (campaign.challenge_type) {
          case 'delivery_count':
            requirement = `${requirementValue} deliveries`;
            break;
          case 'time_based':
            requirement = `${requirementValue} hours`;
            break;
          case 'peak_hours':
            requirement = `${requirementValue} peak hour deliveries`;
            break;
          default:
            requirement = `${requirementValue} ${campaign.challenge_type}`;
        }

        // Format reward
        let reward = '';
        if (campaign.reward_type === 'cash_bonus' && campaign.reward_amount_cents) {
          reward = `$${(campaign.reward_amount_cents / 100).toFixed(2)} bonus`;
        } else if (campaign.reward_type === 'multiplier' && campaign.reward_multiplier) {
          reward = `${campaign.reward_multiplier}x multiplier`;
        } else if (campaign.reward_type === 'per_delivery_bonus') {
          reward = `$${((campaign.reward_amount_cents || 0) / 100).toFixed(2)} per delivery`;
        } else {
          reward = campaign.reward_type.replace('_', ' ');
        }

        // Determine status
        const now = new Date();
        const startDate = new Date(campaign.starts_at);
        const endDate = new Date(campaign.ends_at);
        let status: 'active' | 'completed' | 'paused' = 'active';
        
        if (!campaign.is_active) {
          status = 'paused';
        } else if (endDate < now) {
          status = 'completed';
        } else if (startDate > now) {
          status = 'paused'; // Not started yet
        }

        return {
          id: campaign.id,
          name: campaign.title,
          description: campaign.description,
          requirement: requirement,
          reward: reward,
          participants: campaign.current_participants || 0,
          status: status,
        };
      });

      setBonusCampaigns(transformedCampaigns);
    } catch (error) {
      console.error('Error fetching bonus campaigns:', error);
      setBonusCampaigns([]);
    }
  };

  const handleCampaignCreated = () => {
    fetchBonusCampaigns();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Driver & Ambassador Promotions</h2>
        <p className="text-gray-600 mt-1">Manage driver referral programs and bonus campaigns</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Drivers</p>
              <p className="text-2xl font-bold">{driverPromos.length}</p>
            </div>
            <Truck className="h-8 w-8 text-orange-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Referrals</p>
              <p className="text-2xl font-bold">
                {driverPromos.reduce((sum, d) => sum + d.referrals, 0)}
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Bonuses Paid</p>
              <p className="text-2xl font-bold">
                ${driverPromos.reduce((sum, d) => sum + d.bonusesEarned, 0).toFixed(0)}
              </p>
            </div>
            <Gift className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Campaigns</p>
              <p className="text-2xl font-bold">
                {bonusCampaigns.filter(c => c.status === 'active').length}
              </p>
            </div>
            <Trophy className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Top Referrers</h3>
        <div className="space-y-3">
          {driverPromos.slice(0, 10).map((driver, index) => (
            <div key={driver.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  index === 0 ? 'bg-yellow-100 text-yellow-700' :
                  index === 1 ? 'bg-gray-100 text-gray-700' :
                  index === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{driver.driverName}</div>
                  <div className="text-sm text-gray-500">Code: {driver.referralCode}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900">{driver.referrals} referrals</div>
                <div className="text-sm text-gray-500">${driver.bonusesEarned.toFixed(2)} earned</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Bonus Campaigns */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Bonus Campaigns</h3>
          <Button 
            className="bg-orange-600 hover:bg-orange-700"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        </div>
        <div className="space-y-4">
          {bonusCampaigns.map((campaign) => (
            <div key={campaign.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{campaign.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{campaign.description}</p>
                  <div className="flex gap-4 mt-3 text-sm">
                    <span className="text-gray-600">Requirement: <span className="font-medium">{campaign.requirement}</span></span>
                    <span className="text-gray-600">Reward: <span className="font-medium text-green-600">{campaign.reward}</span></span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    campaign.status === 'active' ? 'bg-green-100 text-green-700' :
                    campaign.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {campaign.status}
                  </span>
                  <div className="mt-2 text-sm text-gray-600">{campaign.participants} participants</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {bonusCampaigns.length === 0 && !loading && (
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No bonus campaigns yet</p>
            <p className="text-sm text-gray-500 mt-2">Create campaigns to incentivize drivers</p>
          </div>
        )}
      </Card>

      {/* Bonus Campaign Creation Modal */}
      <BonusCampaignModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCampaignCreated}
      />
    </div>
  );
};

export default DriverAmbassadorPromotions;


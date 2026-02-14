// @ts-nocheck
/**
 * Driver & Ambassador Promotions
 * Manage driver referral codes, ambassador programs, and bonus campaigns
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Truck, Trophy, Users, Gift, Plus, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import BonusCampaignModal from './BonusCampaignModal';
import { Badge } from '@/components/ui/badge';

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
      const { data: drivers } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .eq('role', 'driver');

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
      const { data: campaignsData, error } = await supabase
        .from('driver_promotions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          console.warn('driver_promotions table not found. Run migration 20250120000005_driver_promotions_system.sql');
          setBonusCampaigns([]);
          return;
        }
        throw error;
      }

      const transformedCampaigns: BonusCampaign[] = (campaignsData || []).map((campaign) => {
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

        const now = new Date();
        const startDate = new Date(campaign.starts_at);
        const endDate = new Date(campaign.ends_at);
        let status: 'active' | 'completed' | 'paused' = 'active';
        
        if (!campaign.is_active) {
          status = 'paused';
        } else if (endDate < now) {
          status = 'completed';
        } else if (startDate > now) {
          status = 'paused';
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
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Driver & Ambassador Promotions</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage driver referral programs and bonus campaigns</p>
        </div>
        <Button 
          size="sm"
          className="h-7 px-2.5 text-xs bg-orange-500 hover:bg-orange-600"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="h-3 w-3 mr-1.5" />
          Create Campaign
        </Button>
      </div>

      {/* Compact Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Active Drivers</p>
              <Truck className="h-3 w-3 text-orange-600" />
            </div>
            <p className="text-xl font-semibold text-gray-900 leading-tight">{driverPromos.length}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Total Referrals</p>
              <Users className="h-3 w-3 text-blue-600" />
            </div>
            <p className="text-xl font-semibold text-gray-900 leading-tight">
              {driverPromos.reduce((sum, d) => sum + d.referrals, 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Bonuses Paid</p>
              <Gift className="h-3 w-3 text-green-600" />
            </div>
            <p className="text-xl font-semibold text-gray-900 leading-tight">
              ${driverPromos.reduce((sum, d) => sum + d.bonusesEarned, 0).toFixed(0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Active Campaigns</p>
              <Trophy className="h-3 w-3 text-purple-600" />
            </div>
            <p className="text-xl font-semibold text-gray-900 leading-tight">
              {bonusCampaigns.filter(c => c.status === 'active').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard - Dense */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="px-3 py-2 border-b border-gray-200 bg-[#fafbfc]">
          <CardTitle className="text-sm font-semibold">Top Referrers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Rank</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Driver</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Code</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Referrals</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {driverPromos.slice(0, 10).map((driver, index) => (
                  <tr key={driver.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-xs text-gray-900">{driver.driverName}</div>
                    </td>
                    <td className="px-3 py-2">
                      <code className="text-[10px] text-gray-600 font-mono">{driver.referralCode}</code>
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-semibold text-gray-900">{driver.referrals}</td>
                    <td className="px-3 py-2 text-right text-xs font-semibold text-green-600">${driver.bonusesEarned.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Bonus Campaigns - Dense */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="px-3 py-2 border-b border-gray-200 bg-[#fafbfc]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Bonus Campaigns</CardTitle>
            <Button 
              size="sm"
              className="h-6 px-2 text-[10px] bg-orange-500 hover:bg-orange-600"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Create
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {bonusCampaigns.length === 0 && !loading ? (
            <div className="p-8 text-center">
              <Trophy className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-xs text-gray-600">No bonus campaigns yet</p>
              <p className="text-[10px] text-gray-500 mt-1">Create campaigns to incentivize drivers</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Campaign</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Requirement</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Reward</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Participants</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bonusCampaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2">
                        <div className="font-medium text-xs text-gray-900">{campaign.name}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{campaign.description}</div>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">{campaign.requirement}</td>
                      <td className="px-3 py-2 text-xs font-semibold text-green-600">{campaign.reward}</td>
                      <td className="px-3 py-2 text-right text-xs text-gray-700">{campaign.participants}</td>
                      <td className="px-3 py-2">
                        <Badge className={`text-[10px] px-1.5 py-0.5 font-medium border ${
                          campaign.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                          campaign.status === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                          {campaign.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
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

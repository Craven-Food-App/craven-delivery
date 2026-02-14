// @ts-nocheck
/**
 * Merchant & Partner Marketing
 * Manage co-branded campaigns and partner marketing support
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, TrendingUp, DollarSign, Users, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import CoBrandedCampaignModal from './CoBrandedCampaignModal';
import { Badge } from '@/components/ui/badge';

interface Merchant {
  id: string;
  name: string;
  city: string;
  cuisineType: string;
  isActive: boolean;
  ordersCount: number;
  revenue: number;
  logoUrl?: string;
}

interface CoBrandedCampaign {
  id: string;
  merchantId: string;
  merchantName: string;
  campaignName: string;
  status: 'active' | 'paused' | 'completed';
  startDate: string;
  endDate: string;
  orders: number;
  revenue: number;
}

const MerchantPartnerMarketing: React.FC = () => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [campaigns, setCampaigns] = useState<CoBrandedCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [preselectedMerchantId, setPreselectedMerchantId] = useState<string | undefined>();

  useEffect(() => {
    fetchMerchants();
    fetchCampaigns();
  }, []);

  const handleCreateCampaign = (merchantId?: string) => {
    setPreselectedMerchantId(merchantId);
    setIsCreateModalOpen(true);
  };

  const handleCampaignCreated = () => {
    fetchCampaigns();
    fetchMerchants();
  };

  const fetchMerchants = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, city, cuisine_type, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      const merchantsWithStats = await Promise.all(
        (data || []).map(async (restaurant) => {
          const { count: ordersCount } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('restaurant_id', restaurant.id);

          const { data: ordersData } = await supabase
            .from('orders')
            .select('total_cents')
            .eq('restaurant_id', restaurant.id);

          const revenue = (ordersData || []).reduce((sum, o) => sum + (o.total_cents || 0), 0) / 100;

          return {
            id: restaurant.id,
            name: restaurant.name,
            city: restaurant.city,
            cuisineType: restaurant.cuisine_type || 'Unknown',
            isActive: restaurant.is_active,
            ordersCount: ordersCount || 0,
            revenue
          };
        })
      );

      setMerchants(merchantsWithStats);
    } catch (error) {
      console.error('Error fetching merchants:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const { data: campaignsData, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('campaign_type', 'co_branded')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedCampaigns: CoBrandedCampaign[] = (campaignsData || []).map((campaign) => {
        const metadata = campaign.metadata || {};
        return {
          id: campaign.id,
          merchantId: metadata.merchant_id || '',
          merchantName: metadata.merchant_name || 'Unknown',
          campaignName: campaign.campaign_name,
          status: campaign.status === 'active' ? 'active' :
                 campaign.status === 'paused' ? 'paused' :
                 campaign.status === 'completed' ? 'completed' : 'active',
          startDate: campaign.start_date,
          endDate: campaign.end_date || '',
          orders: 0,
          revenue: Number(campaign.spend_to_date || 0),
        };
      });

      setCampaigns(transformedCampaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      setCampaigns([]);
    }
  };

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Merchant & Partner Marketing</h2>
          <p className="text-xs text-gray-500 mt-0.5">Create co-branded campaigns and support partner restaurants</p>
        </div>
        <Button 
          size="sm"
          className="h-7 px-2.5 text-xs bg-orange-500 hover:bg-orange-600"
          onClick={() => handleCreateCampaign()}
        >
          Create Campaign
        </Button>
      </div>

      {/* Compact Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Active Merchants</p>
              <Building2 className="h-3 w-3 text-orange-600" />
            </div>
            <p className="text-xl font-semibold text-gray-900 leading-tight">{merchants.length}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Total Orders</p>
              <TrendingUp className="h-3 w-3 text-blue-600" />
            </div>
            <p className="text-xl font-semibold text-gray-900 leading-tight">
              {merchants.reduce((sum, m) => sum + m.ordersCount, 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Partner Revenue</p>
              <DollarSign className="h-3 w-3 text-green-600" />
            </div>
            <p className="text-xl font-semibold text-gray-900 leading-tight">
              ${(merchants.reduce((sum, m) => sum + m.revenue, 0)).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Active Campaigns</p>
              <Users className="h-3 w-3 text-purple-600" />
            </div>
            <p className="text-xl font-semibold text-gray-900 leading-tight">{campaigns.filter(c => c.status === 'active').length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Merchant Directory - Compact Grid */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="px-3 py-2 border-b border-gray-200 bg-[#fafbfc]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Partner Directory</CardTitle>
            <Button 
              size="sm"
              className="h-6 px-2 text-[10px] bg-orange-500 hover:bg-orange-600"
              onClick={() => handleCreateCampaign()}
            >
              Create Campaign
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {merchants.slice(0, 12).map((merchant) => (
              <Card key={merchant.id} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-2">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 bg-gray-200 rounded-md flex items-center justify-center flex-shrink-0">
                    {merchant.logoUrl ? (
                      <img src={merchant.logoUrl} alt={merchant.name} className="w-full h-full rounded-md object-cover" />
                    ) : (
                      <Building2 className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-xs text-gray-900 truncate">{merchant.name}</h4>
                    <p className="text-[10px] text-gray-600">{merchant.city}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{merchant.cuisineType}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-600">
                      <span>{merchant.ordersCount} orders</span>
                      <span>${merchant.revenue.toFixed(0)}</span>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-1.5 w-full h-6 px-1.5 text-[10px]" 
                      onClick={() => handleCreateCampaign(merchant.id)}
                    >
                      Create Campaign
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Co-Branded Campaigns - Dense */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="px-3 py-2 border-b border-gray-200 bg-[#fafbfc]">
          <CardTitle className="text-sm font-semibold">Co-Branded Campaigns</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {campaigns.length === 0 ? (
            <div className="p-8 text-center">
              <ImageIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-xs text-gray-600">No co-branded campaigns yet</p>
              <p className="text-[10px] text-gray-500 mt-1">Create campaigns featuring specific merchant partners</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Campaign</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Merchant</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Orders</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Revenue</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2">
                        <div className="font-medium text-xs text-gray-900">{campaign.campaignName}</div>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">{campaign.merchantName}</td>
                      <td className="px-3 py-2 text-right text-xs text-gray-700">{campaign.orders}</td>
                      <td className="px-3 py-2 text-right text-xs font-semibold text-gray-900">${campaign.revenue.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <Badge className={`text-[10px] px-1.5 py-0.5 font-medium border ${
                          campaign.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                          campaign.status === 'paused' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
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

      {/* Co-Branded Campaign Creation Modal */}
      <CoBrandedCampaignModal
        open={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setPreselectedMerchantId(undefined);
        }}
        onSuccess={handleCampaignCreated}
        preselectedMerchantId={preselectedMerchantId}
      />
    </div>
  );
};

export default MerchantPartnerMarketing;

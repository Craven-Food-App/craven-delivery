/**
 * Merchant & Partner Marketing
 * Manage co-branded campaigns and partner marketing support
 */

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, TrendingUp, DollarSign, Users, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CoBrandedCampaignModal from './CoBrandedCampaignModal';
import { toast } from 'sonner';

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
  const [selectedMerchant, setSelectedMerchant] = useState<string>('');
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
    fetchMerchants(); // Refresh merchant stats
  };

  const fetchMerchants = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, city, cuisine_type, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // Get order stats for each merchant
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
      // Fetch co-branded campaigns from marketing_campaigns
      const { data: campaignsData, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('campaign_type', 'co_branded')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform to CoBrandedCampaign format
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
          orders: 0, // TODO: Calculate from orders
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Merchant & Partner Marketing</h2>
        <p className="text-gray-600 mt-1">Create co-branded campaigns and support partner restaurants</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Merchants</p>
              <p className="text-2xl font-bold">{merchants.length}</p>
            </div>
            <Building2 className="h-8 w-8 text-orange-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold">
                {merchants.reduce((sum, m) => sum + m.ordersCount, 0).toLocaleString()}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Partner Revenue</p>
              <p className="text-2xl font-bold">
                ${(merchants.reduce((sum, m) => sum + m.revenue, 0)).toLocaleString()}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Campaigns</p>
              <p className="text-2xl font-bold">{campaigns.filter(c => c.status === 'active').length}</p>
            </div>
            <Users className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Merchant Directory */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Partner Directory</h3>
          <Button 
            className="bg-orange-600 hover:bg-orange-700"
            onClick={() => handleCreateCampaign()}
          >
            Create Co-Branded Campaign
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {merchants.slice(0, 12).map((merchant) => (
            <Card key={merchant.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                  {merchant.logoUrl ? (
                    <img src={merchant.logoUrl} alt={merchant.name} className="w-full h-full rounded-lg object-cover" />
                  ) : (
                    <Building2 className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 truncate">{merchant.name}</h4>
                  <p className="text-sm text-gray-600">{merchant.city}</p>
                  <p className="text-xs text-gray-500 mt-1">{merchant.cuisineType}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                    <span>{merchant.ordersCount} orders</span>
                    <span>${merchant.revenue.toFixed(0)}</span>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-2 w-full" 
                    onClick={() => handleCreateCampaign(merchant.id)}
                  >
                    Create Campaign
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Co-Branded Campaigns */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Co-Branded Campaigns</h3>
        {campaigns.length === 0 ? (
          <div className="text-center py-8">
            <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No co-branded campaigns yet</p>
            <p className="text-sm text-gray-500 mt-2">Create campaigns featuring specific merchant partners</p>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-semibold">{campaign.campaignName}</h4>
                  <p className="text-sm text-gray-600">{campaign.merchantName}</p>
                  <div className="flex gap-4 mt-2 text-sm text-gray-500">
                    <span>{campaign.orders} orders</span>
                    <span>${campaign.revenue.toFixed(2)} revenue</span>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  campaign.status === 'active' ? 'bg-green-100 text-green-700' :
                  campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {campaign.status}
                </span>
              </div>
            ))}
          </div>
        )}
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


/**
 * Customer Segmentation Manager
 * Create and manage customer segments for targeted marketing
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Users, Filter, TrendingUp, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface Segment {
  id: string;
  name: string;
  criteria: SegmentCriteria;
  customerCount: number;
  createdAt: string;
}

interface SegmentCriteria {
  city?: string[];
  orderFrequency?: { min: number; max?: number };
  loyaltyTier?: string[];
  totalSpent?: { min: number; max?: number };
  lastOrderDays?: { max: number };
  hasReferrals?: boolean;
}

const CustomerSegmentation: React.FC = () => {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSegment, setNewSegment] = useState({
    name: '',
    criteria: {} as SegmentCriteria
  });

  useEffect(() => {
    fetchSegments();
  }, []);

  const fetchSegments = async () => {
    setLoading(true);
    try {
      // TODO: Create customer_segments table in database
      // For now, using mock data structure
      setSegments([]);
    } catch (error) {
      console.error('Error fetching segments:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSegmentSize = async (criteria: SegmentCriteria): Promise<number> => {
    try {
      let query = supabase
        .from('user_profiles')
        .select('id, user_id', { count: 'exact', head: false });

      // Apply criteria filters (simplified for now)
      // TODO: Implement full filtering logic based on criteria
      
      const { count } = await query;
      return count || 0;
    } catch (error) {
      console.error('Error calculating segment size:', error);
      return 0;
    }
  };

  const handleCreateSegment = async () => {
    if (!newSegment.name.trim()) return;

    const customerCount = await calculateSegmentSize(newSegment.criteria);
    
    const segment: Segment = {
      id: `seg_${Date.now()}`,
      name: newSegment.name,
      criteria: newSegment.criteria,
      customerCount,
      createdAt: new Date().toISOString()
    };

    // TODO: Save to database
    setSegments([...segments, segment]);
    setNewSegment({ name: '', criteria: {} });
    setShowCreateForm(false);
  };

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Customer Segmentation</h2>
          <p className="text-xs text-gray-500 mt-0.5">Create targeted customer groups for personalized marketing</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} size="sm" className="h-7 px-2.5 text-xs bg-orange-500 hover:bg-orange-600">
          <Plus className="h-3 w-3 mr-1.5" />
          Create Segment
        </Button>
      </div>

      {/* Create Segment Form - Compact */}
      {showCreateForm && (
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="px-3 py-2 border-b border-gray-200 bg-[#fafbfc]">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Create New Segment</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)} className="h-6 w-6 p-0">
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 space-y-3">
            <div>
              <Label htmlFor="segmentName" className="text-xs">Segment Name *</Label>
              <Input
                id="segmentName"
                value={newSegment.name}
                onChange={(e) => setNewSegment(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., High-Value Customers in NYC"
                className="mt-1 h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* City Filter */}
              <div>
                <Label className="text-xs">City</Label>
                <Input
                  placeholder="Enter cities (comma-separated)"
                  onChange={(e) => {
                    const cities = e.target.value.split(',').map(c => c.trim()).filter(Boolean);
                    setNewSegment(prev => ({
                      ...prev,
                      criteria: { ...prev.criteria, city: cities }
                    }));
                  }}
                  className="mt-1 h-8 text-xs"
                />
              </div>

              {/* Loyalty Tier */}
              <div>
                <Label className="text-xs">Loyalty Tier</Label>
                <Select
                  onValueChange={(value) => {
                    setNewSegment(prev => ({
                      ...prev,
                      criteria: { ...prev.criteria, loyaltyTier: value ? [value] : undefined }
                    }));
                  }}
                >
                  <SelectTrigger className="mt-1 h-8 text-xs">
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bronze">Bronze</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Order Frequency */}
              <div>
                <Label className="text-xs">Min Orders</Label>
                <Input
                  type="number"
                  placeholder="Minimum orders"
                  onChange={(e) => {
                    const min = parseInt(e.target.value) || 0;
                    setNewSegment(prev => ({
                      ...prev,
                      criteria: { ...prev.criteria, orderFrequency: { min } }
                    }));
                  }}
                  className="mt-1 h-8 text-xs"
                />
              </div>

              {/* Total Spent */}
              <div>
                <Label className="text-xs">Min Total Spent ($)</Label>
                <Input
                  type="number"
                  placeholder="Minimum spend"
                  onChange={(e) => {
                    const min = parseFloat(e.target.value) || 0;
                    setNewSegment(prev => ({
                      ...prev,
                      criteria: { ...prev.criteria, totalSpent: { min } }
                    }));
                  }}
                  className="mt-1 h-8 text-xs"
                />
              </div>

              {/* Last Order */}
              <div>
                <Label className="text-xs">Last Order (days ago, max)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 30"
                  onChange={(e) => {
                    const max = parseInt(e.target.value) || undefined;
                    setNewSegment(prev => ({
                      ...prev,
                      criteria: { ...prev.criteria, lastOrderDays: max ? { max } : undefined }
                    }));
                  }}
                  className="mt-1 h-8 text-xs"
                />
              </div>

              {/* Has Referrals */}
              <div>
                <Label className="text-xs">Has Referrals</Label>
                <Select
                  onValueChange={(value) => {
                    setNewSegment(prev => ({
                      ...prev,
                      criteria: { ...prev.criteria, hasReferrals: value === 'yes' }
                    }));
                  }}
                >
                  <SelectTrigger className="mt-1 h-8 text-xs">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreateSegment} size="sm" className="flex-1 h-8 text-xs bg-orange-500 hover:bg-orange-600">
                <Save className="h-3 w-3 mr-1.5" />
                Create Segment
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)} size="sm" className="h-8 text-xs">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Segments List - Compact Grid */}
      {segments.length === 0 && !loading ? (
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-8 text-center">
            <Users className="h-10 w-10 mx-auto text-gray-400 mb-3" />
            <h3 className="text-sm font-semibold text-gray-900 mb-1">No segments yet</h3>
            <p className="text-xs text-gray-600 mb-3">Create your first customer segment to start targeted marketing</p>
            <Button onClick={() => setShowCreateForm(true)} size="sm" className="h-7 px-2.5 text-xs bg-orange-500 hover:bg-orange-600">
              <Plus className="h-3 w-3 mr-1.5" />
              Create Segment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {segments.map((segment) => (
            <Card key={segment.id} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-orange-600 flex-shrink-0" />
                    <h3 className="font-semibold text-sm text-gray-900">{segment.name}</h3>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide">Customers</span>
                    <span className="text-lg font-semibold text-gray-900">{segment.customerCount.toLocaleString()}</span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {segment.criteria.city && segment.criteria.city.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">Cities: {segment.criteria.city.length}</Badge>
                    )}
                    {segment.criteria.loyaltyTier && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">Tier: {segment.criteria.loyaltyTier.join(', ')}</Badge>
                    )}
                    {segment.criteria.orderFrequency && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">{segment.criteria.orderFrequency.min}+ orders</Badge>
                    )}
                    {segment.criteria.totalSpent && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">${segment.criteria.totalSpent.min}+ spent</Badge>
                    )}
                  </div>

                  <div className="pt-1.5 flex gap-1.5 border-t border-gray-100">
                    <Button variant="outline" size="sm" className="flex-1 h-6 px-2 text-[10px]">
                      <Filter className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 h-6 px-2 text-[10px]">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Analyze
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerSegmentation;

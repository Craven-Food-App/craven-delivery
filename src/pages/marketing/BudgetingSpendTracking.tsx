/**
 * Budgeting & Spend Tracking
 * Track marketing budget allocation and ROI
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, PieChart, Calendar, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BudgetData {
  totalBudget: number;
  spent: number;
  remaining: number;
  byChannel: {
    email: number;
    push: number;
    sms: number;
    social: number;
    inApp: number;
  };
}

const BudgetingSpendTracking: React.FC = () => {
  const [budgetData, setBudgetData] = useState<BudgetData>({
    totalBudget: 50000,
    spent: 0,
    remaining: 50000,
    byChannel: {
      email: 0,
      push: 0,
      sms: 0,
      social: 0,
      inApp: 0
    }
  });
  const [timeRange, setTimeRange] = useState('month');

  useEffect(() => {
    fetchSpendData();
  }, [timeRange]);

  const fetchSpendData = async () => {
    try {
      const startDate = timeRange === 'month' 
        ? startOfMonth(new Date())
        : subDays(new Date(), 30);

      const { data: campaigns } = await supabase
        .from('marketing_campaigns')
        .select('spend_to_date, channel')
        .gte('start_date', format(startDate, 'yyyy-MM-dd'));

      const channelSpend = {
        email: 0,
        push: 0,
        sms: 0,
        social: 0,
        inApp: 0
      };

      let totalSpent = 0;
      (campaigns || []).forEach(campaign => {
        const spend = Number(campaign.spend_to_date || 0);
        totalSpent += spend;
        
        const channel = campaign.channel?.toLowerCase() || '';
        if (channel.includes('email')) channelSpend.email += spend;
        else if (channel.includes('push')) channelSpend.push += spend;
        else if (channel.includes('sms')) channelSpend.sms += spend;
        else if (channel.includes('social')) channelSpend.social += spend;
        else channelSpend.inApp += spend;
      });

      setBudgetData({
        totalBudget: 50000,
        spent: totalSpent,
        remaining: 50000 - totalSpent,
        byChannel: channelSpend
      });
    } catch (error) {
      console.error('Error fetching spend data:', error);
    }
  };

  const spendPercentage = budgetData.totalBudget > 0 
    ? (budgetData.spent / budgetData.totalBudget) * 100 
    : 0;

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Budgeting & Spend Tracking</h2>
          <p className="text-xs text-gray-500 mt-0.5">Monitor marketing budget allocation and ROI</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="h-7 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs">
            <Download className="h-3 w-3 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Compact Budget Overview */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Total Budget</p>
              <DollarSign className="h-3 w-3 text-blue-600" />
            </div>
            <p className="text-xl font-semibold text-gray-900 leading-tight">${budgetData.totalBudget.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Spent</p>
              <TrendingUp className="h-3 w-3 text-orange-600" />
            </div>
            <p className="text-xl font-semibold text-orange-600 leading-tight">${budgetData.spent.toLocaleString()}</p>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5">
              <div
                className="bg-orange-600 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(spendPercentage, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">{spendPercentage.toFixed(1)}% used</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Remaining</p>
              <Calendar className="h-3 w-3 text-green-600" />
            </div>
            <p className="text-xl font-semibold text-green-600 leading-tight">${budgetData.remaining.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Channel Breakdown - Compact */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="px-3 py-2 border-b border-gray-200 bg-[#fafbfc]">
          <CardTitle className="text-sm font-semibold">Spend by Channel</CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-2">
          {Object.entries(budgetData.byChannel).map(([channel, spend]) => {
            const percentage = budgetData.spent > 0 ? (spend / budgetData.spent) * 100 : 0;
            return (
              <div key={channel}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-medium text-gray-700 capitalize">{channel}</span>
                  <span className="text-xs text-gray-600">${spend.toLocaleString()} ({percentage.toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-orange-600 h-1.5 rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ROI Analysis - Compact */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="px-3 py-2 border-b border-gray-200 bg-[#fafbfc]">
          <CardTitle className="text-sm font-semibold">ROI Analysis</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 bg-gray-50 rounded-md">
              <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">Cost per Acquisition</p>
              <p className="text-lg font-semibold text-gray-900">
                ${budgetData.spent > 0 ? (budgetData.spent / 100).toFixed(2) : '0.00'}
              </p>
            </div>
            <div className="p-2.5 bg-gray-50 rounded-md">
              <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">Revenue Generated</p>
              <p className="text-lg font-semibold text-green-600">$0.00</p>
              <p className="text-[10px] text-gray-500 mt-0.5">(Requires attribution)</p>
            </div>
            <div className="p-2.5 bg-gray-50 rounded-md">
              <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">ROI</p>
              <p className="text-lg font-semibold text-gray-900">0%</p>
              <p className="text-[10px] text-gray-500 mt-0.5">(Calculate from revenue/spend)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BudgetingSpendTracking;

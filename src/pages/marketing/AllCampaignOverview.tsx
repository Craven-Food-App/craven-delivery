/**
 * 📢 ALL CAMPAIGNS (Marketing Overview)
 * 
 * Purpose:
 * Display a high-level view of all marketing campaigns — active, upcoming, and completed — 
 * with summarized performance metrics and visual insights.
 * 
 * Data Sources (Supabase):
 * - Table: marketing_campaigns
 * - View: campaign_performance
 * - Table: marketing_metrics
 */

import React, { useState, useEffect } from 'react';
import { BarChart3, CalendarDays, ChevronDown, Info, Megaphone, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AdCreationModal from '@/pages/marketing/AdCreationModal';

// --- Data Structures ---

interface MetricCard {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  info: string;
}

interface CampaignData {
  id: string;
  name: string;
  channel: string;
  status: string;
  reach: number;
  ctr: number;
  conversions: number;
  spend: number;
  roi: number;
  updatedAt: string;
}

interface ChannelMetric {
  name: string;
  percentage: number;
  spend: number;
  ctr: number;
}

interface ChartDataPoint {
  date: string;
  value: number;
}

// --- Chart Components ---

const CampaignPerformanceChart: React.FC<{ data: ChartDataPoint[] }> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="text-center text-xs text-gray-500 py-6">No data available</div>;
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  // Generate SVG path
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 300;
    const y = 120 - ((d.value - minValue) / range) * 100;
    return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
  }).join(' ');

  // Generate area path
  const areaPath = `${points} L300,120 L0,120 Z`;

  return (
    <div className="mt-3">
      <div className="h-48 relative">
        <div className="absolute left-0 w-10 h-full text-[10px] text-gray-500 flex flex-col justify-between py-1">
          <div>{maxValue.toLocaleString()}</div>
          <div className="pt-1">{(maxValue / 2).toLocaleString()}</div>
          <div className="pb-0.5">{minValue.toLocaleString()}</div>
        </div>
        <div className="ml-10 mr-6 h-full relative">
          <div className="absolute inset-0 border-y border-gray-200">
            <div className="absolute top-1/2 w-full border-t border-gray-200"></div>
          </div>
          <svg viewBox="0 0 300 120" preserveAspectRatio="none" className="w-full h-full">
            <defs>
              <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{ stopColor: 'rgb(249, 115, 22)', stopOpacity: 0.5 }} />
                <stop offset="100%" style={{ stopColor: 'rgb(249, 115, 22)', stopOpacity: 0.0 }} />
              </linearGradient>
            </defs>
            <path
              d={areaPath}
              fill="url(#orangeGradient)"
              stroke="none"
            />
            <path
              d={points}
              fill="none"
              stroke="rgb(249, 115, 22)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      <div className="mt-1.5 ml-10 mr-6 flex justify-between text-[10px] text-gray-500">
        {data.length <= 6 ? (
          data.map((d, i) => (
            <span key={i}>{format(new Date(d.date), 'MMM d')}</span>
          ))
        ) : (
          <>
            <span>{format(new Date(data[0].date), 'MMM d')}</span>
            <span>{format(new Date(data[Math.floor(data.length / 2)].date), 'MMM d')}</span>
            <span>{format(new Date(data[data.length - 1].date), 'MMM d')}</span>
          </>
        )}
      </div>
    </div>
  );
};

const ChannelDistributionChart: React.FC<{ data: ChannelMetric[] }> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="text-center text-xs text-gray-500 py-6">No channel data</div>;
  }

  const maxPercentage = Math.max(...data.map(m => m.percentage));

  return (
    <div className="space-y-2">
      <div className="flex justify-start gap-3 text-xs font-semibold">
        <div className="flex items-center text-orange-600">
          <div className="w-2.5 h-2.5 bg-orange-600 rounded-full mr-1.5"></div>
          Spend
        </div>
        <div className="flex items-center text-gray-500">
          <div className="w-2.5 h-2.5 bg-gray-300 rounded-full mr-1.5"></div>
          CTR
        </div>
      </div>
      <div className="space-y-3">
        {data.map(item => (
          <div key={item.name} className="flex flex-col">
            <div className="text-[10px] text-gray-600 mb-0.5">{item.name}</div>
            <div className="flex items-center h-3">
              <div
                className="h-full rounded-r-md bg-orange-600"
                style={{ width: `${(item.percentage / maxPercentage) * 100}%` }}
              ></div>
              <span className="ml-2 text-xs text-gray-700 font-medium">{item.percentage.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChannelDonutChart: React.FC<{ data: ChannelMetric[] }> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="text-center text-xs text-gray-500 py-6">No data</div>;
  }

  const totalSpend = data.reduce((sum, d) => sum + d.spend, 0);
  const topChannel = data.reduce((max, d) => d.spend > max.spend ? d : max, data[0]);
  const topChannelPercentage = totalSpend > 0 ? (topChannel.spend / totalSpend) * 100 : 0;

  const circumference = 2 * Math.PI * 35;
  const offset = circumference - (topChannelPercentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
        <circle
          className="text-gray-200"
          strokeWidth="8"
          stroke="currentColor"
          fill="transparent"
          r="35"
          cx="50"
          cy="50"
        />
        <circle
          className="text-orange-600"
          strokeWidth="8"
          stroke="currentColor"
          fill="transparent"
          r="35"
          cx="50"
          cy="50"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="text-center mt-2 space-y-1">
        <div className="text-lg font-bold text-orange-600">{topChannelPercentage.toFixed(0)}%</div>
        <div className="text-xs text-gray-600">{topChannel.name}</div>
      </div>
    </div>
  );
};

// --- Main Component ---

const AllCampaignOverview: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [channelData, setChannelData] = useState<ChannelMetric[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [previousPeriodMetrics, setPreviousPeriodMetrics] = useState({
    reach: 0,
    conversions: 0,
    spend: 0,
    revenue: 0
  });
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [isAdCreationOpen, setIsAdCreationOpen] = useState(false);

  useEffect(() => {
    fetchMarketingData();
  }, []);

  const fetchMarketingData = async () => {
    setLoading(true);
    try {
      // Fetch campaign performance data
      const { data: campaignPerformance, error: perfError } = await supabase
        .from('campaign_performance')
        .select('*')
        .order('campaign_id', { ascending: false });

      if (perfError) throw perfError;

      // Fetch campaign details
      const { data: campaignDetails, error: detailsError } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .order('updated_at', { ascending: false });

      if (detailsError) throw detailsError;

      // Fetch metrics for last 28 days and previous 28 days
      const endDate = new Date();
      const startDate = subDays(endDate, 28);
      const prevStartDate = subDays(startDate, 28);

      const { data: currentMetrics } = await supabase
        .from('marketing_metrics')
        .select('*')
        .gte('metric_date', format(startDate, 'yyyy-MM-dd'))
        .lte('metric_date', format(endDate, 'yyyy-MM-dd'));

      const { data: prevMetrics } = await supabase
        .from('marketing_metrics')
        .select('*')
        .gte('metric_date', format(prevStartDate, 'yyyy-MM-dd'))
        .lt('metric_date', format(startDate, 'yyyy-MM-dd'));

      // Calculate previous period totals
      const prevTotals = (prevMetrics || []).reduce((acc, m) => ({
        reach: acc.reach + (m.impressions || 0),
        conversions: acc.conversions + (m.conversions || 0),
        spend: acc.spend + Number(m.spend || 0),
        revenue: acc.revenue + Number(m.revenue_attributed || 0)
      }), { reach: 0, conversions: 0, spend: 0, revenue: 0 });

      setPreviousPeriodMetrics(prevTotals);

      // Combine performance and details
      const campaignsMap = new Map(campaignDetails?.map(c => [c.id, c]) || []);
      
      const campaignsData: CampaignData[] = (campaignPerformance || []).map((perf) => {
        const details = campaignsMap.get(perf.campaign_id);
        if (!details) return null;

        const reach = perf.total_impressions || 0;
        const conversions = perf.total_conversions || 0;
        const ctr = perf.avg_ctr || 0;
        const spend = Number(perf.spend_to_date || 0);
        const revenue = Number(perf.total_revenue || 0);
        const roi = spend > 0 ? revenue / spend : 0;

        return {
          id: perf.campaign_id,
          name: perf.campaign_name,
          channel: perf.channel,
          status: perf.status === 'active' ? 'Active' : 
                  perf.status === 'paused' ? 'Paused' : 
                  perf.status === 'completed' ? 'Completed' : 
                  perf.status === 'draft' ? 'Draft' : 'Active',
          reach: reach,
          ctr: ctr,
          conversions: conversions,
          spend: spend,
          roi: roi,
          updatedAt: format(new Date(details.updated_at), 'MMM d, yyyy')
        };
      }).filter((c): c is CampaignData => c !== null);

      setCampaigns(campaignsData);

      // Calculate current period totals
      const currentTotals = (currentMetrics || []).reduce((acc, m) => ({
        reach: acc.reach + (m.impressions || 0),
        conversions: acc.conversions + (m.conversions || 0),
        spend: acc.spend + Number(m.spend || 0),
        revenue: acc.revenue + Number(m.revenue_attributed || 0)
      }), { reach: 0, conversions: 0, spend: 0, revenue: 0 });

      // Calculate metrics with change indicators
      const reachChange = prevTotals.reach > 0 
        ? ((currentTotals.reach - prevTotals.reach) / prevTotals.reach) * 100 
        : 0;
      const conversionsChange = prevTotals.conversions > 0
        ? ((currentTotals.conversions - prevTotals.conversions) / prevTotals.conversions) * 100
        : 0;
      const ctrValue = currentTotals.reach > 0 
        ? (currentTotals.conversions / currentTotals.reach) * 100 
        : 0;
      const spendChange = prevTotals.spend > 0
        ? ((currentTotals.spend - prevTotals.spend) / prevTotals.spend) * 100
        : 0;

      // Calculate channel distribution
      const channelMap = new Map<string, { spend: number; ctr: number[]; conversions: number }>();
      
      campaignsData.forEach(camp => {
        const existing = channelMap.get(camp.channel) || { spend: 0, ctr: [], conversions: 0 };
        existing.spend += camp.spend;
        existing.ctr.push(camp.ctr);
        existing.conversions += camp.conversions;
        channelMap.set(camp.channel, existing);
      });

      const totalSpend = Array.from(channelMap.values()).reduce((sum, d) => sum + d.spend, 0);
      const channelMetrics: ChannelMetric[] = Array.from(channelMap.entries()).map(([name, data]) => ({
        name,
        percentage: totalSpend > 0 ? (data.spend / totalSpend) * 100 : 0,
        spend: data.spend,
        ctr: data.ctr.length > 0 ? data.ctr.reduce((a, b) => a + b, 0) / data.ctr.length : 0
      })).sort((a, b) => b.spend - a.spend);

      setChannelData(channelMetrics);

      // Generate chart data (daily metrics)
      const dailyMetrics = (currentMetrics || []).reduce((acc: { [key: string]: { reach: number; conversions: number } }, m) => {
        const date = format(new Date(m.metric_date), 'yyyy-MM-dd');
        if (!acc[date]) acc[date] = { reach: 0, conversions: 0 };
        acc[date].reach += m.impressions || 0;
        acc[date].conversions += m.conversions || 0;
        return acc;
      }, {});

      const chartDataPoints: ChartDataPoint[] = Object.entries(dailyMetrics)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
          date,
          value: data.conversions
        }));

      setChartData(chartDataPoints);

      // Set metrics
      const metricsCards: MetricCard[] = [
        {
          title: 'Total Reach',
          value: currentTotals.reach.toLocaleString(),
          change: `${reachChange >= 0 ? '+' : ''}${reachChange.toFixed(0)}%`,
          isPositive: reachChange >= 0,
          info: 'Total impressions across all campaigns'
        },
        {
          title: 'Conversions',
          value: currentTotals.conversions.toLocaleString(),
          change: `${conversionsChange >= 0 ? '+' : ''}${conversionsChange.toFixed(0)}%`,
          isPositive: conversionsChange >= 0,
          info: 'Total conversions from campaigns'
        },
        {
          title: 'CTR',
          value: `${ctrValue.toFixed(2)}%`,
          change: `${reachChange >= 0 ? '+' : ''}${reachChange.toFixed(0)}%`,
          isPositive: reachChange >= 0,
          info: 'Click-through rate'
        },
        {
          title: 'Total Spend',
          value: `$${currentTotals.spend.toFixed(2)}`,
          change: `${spendChange >= 0 ? '+' : ''}${spendChange.toFixed(0)}%`,
          isPositive: spendChange <= 0, // Lower spend is better (more efficient)
          info: 'Total campaign spend'
        }
      ];

      setMetrics(metricsCards);

    } catch (error) {
      console.error('Error fetching marketing data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Welcome Modal - Compact */}
      <Dialog open={isWelcomeModalOpen} onOpenChange={setIsWelcomeModalOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <div className="relative">
            <button
              onClick={() => setIsWelcomeModalOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
            <div className="p-6">
              <DialogHeader className="mb-4">
                <DialogTitle className="text-xl font-bold text-gray-900 mb-1">
                  Welcome to Ad Center
                </DialogTitle>
              </DialogHeader>
              <div className="mb-4">
                <h3 className="text-base font-semibold text-gray-900 mb-2">
                  Welcome! Let's create your first ad on web
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Ad Center on web is your new home for advertising. On desktop it's even easier to access 
                  all your favorite in-app tools to easily create and manage your ads for both the website 
                  and mobile app.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setIsWelcomeModalOpen(false)}
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs"
                >
                  Manage Ads
                </Button>
                <Button
                  onClick={() => {
                    setIsWelcomeModalOpen(false);
                    setIsAdCreationOpen(true);
                  }}
                  size="sm"
                  className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-700"
                >
                  Create Ads
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ad Creation Modal */}
      <AdCreationModal
        open={isAdCreationOpen}
        onClose={() => setIsAdCreationOpen(false)}
        onSuccess={() => {
          fetchMarketingData();
        }}
      />

      <div className="space-y-3">
        {/* Compact Header */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Campaign Overview
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Marketing performance and insights</p>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays size={14} className="text-gray-500" />
            <button className="flex items-center text-xs font-medium text-gray-600 border border-gray-300 rounded-md px-2.5 py-1.5 h-7 hover:bg-gray-50 transition">
              Last 28 days <ChevronDown size={12} className="ml-1.5" />
            </button>
          </div>
        </div>

        {/* Compact Metric Cards */}
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              {metrics.map((metric, index) => (
                <div key={index} className="flex flex-col">
                  <div className="flex items-end">
                    <span className="text-lg font-semibold text-gray-900 mr-1">{metric.value}</span>
                    <span className={`text-[10px] font-medium mb-0.5 ${metric.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {metric.change}
                    </span>
                  </div>
                  <div className="flex items-center text-[10px] text-gray-500 mt-0.5">
                    {metric.title}
                  </div>
                </div>
              ))}
            </div>
            <CampaignPerformanceChart data={chartData} />
          </CardContent>
        </Card>

        {/* Bottom Panels - Compact */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Channel Distribution */}
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="px-3 py-2 border-b border-gray-200 bg-[#fafbfc]">
              <CardTitle className="text-sm font-semibold">Budget by Channel</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <ChannelDistributionChart data={channelData} />
            </CardContent>
          </Card>

          {/* Top Channel Donut */}
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="px-3 py-2 border-b border-gray-200 bg-[#fafbfc]">
              <CardTitle className="text-sm font-semibold">Top Performing Channel</CardTitle>
            </CardHeader>
            <CardContent className="p-3 flex justify-center">
              <ChannelDonutChart data={channelData} />
            </CardContent>
          </Card>
        </div>

        {/* Campaigns List - Dense Table */}
        {campaigns.length > 0 && (
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="px-3 py-2 border-b border-gray-200 bg-[#fafbfc]">
              <CardTitle className="text-sm font-semibold">All Campaigns</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Campaign</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Channel</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                      <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wide">ROI</th>
                      <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Spend</th>
                      <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Reach</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {campaigns.slice(0, 10).map(campaign => (
                      <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Megaphone size={14} className="text-orange-600 flex-shrink-0" />
                            <span className="text-xs font-medium text-gray-900">{campaign.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700">{campaign.channel}</td>
                        <td className="px-3 py-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            campaign.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-200' :
                            campaign.status === 'Paused' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                            'bg-gray-50 text-gray-700 border border-gray-200'
                          }`}>
                            {campaign.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-xs font-semibold text-gray-900">{campaign.roi.toFixed(2)}x</td>
                        <td className="px-3 py-2 text-right text-xs text-gray-700">${campaign.spend.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-xs text-gray-700">{campaign.reach.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {loading && (
          <div className="text-center text-xs text-gray-500 py-6">Loading campaign data...</div>
        )}

        {!loading && campaigns.length === 0 && (
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-6 text-center">
              <Megaphone size={32} className="mx-auto text-gray-400 mb-3" />
              <h3 className="text-sm font-semibold text-gray-900 mb-1">No campaigns yet</h3>
              <p className="text-xs text-gray-600 mb-3">Create your first marketing campaign to start tracking performance.</p>
              <Button 
                onClick={() => setIsWelcomeModalOpen(true)}
                size="sm"
                className="h-7 px-2.5 text-xs bg-orange-500 hover:bg-orange-600"
              >
                Create Campaign <ChevronDown size={12} className="ml-1.5" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

export default AllCampaignOverview;

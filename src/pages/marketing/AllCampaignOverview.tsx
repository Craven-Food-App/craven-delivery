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

// --- Utility Components ---

const PrimaryButton: React.FC<{ children: React.ReactNode; onClick?: () => void }> = ({ children, onClick }) => (
  <button 
    onClick={onClick}
    className="flex items-center justify-center w-full py-3 text-white font-semibold rounded-lg bg-orange-600 hover:bg-orange-700 transition duration-150 shadow-lg"
  >
    {children}
  </button>
);

// --- Chart Components ---

const CampaignPerformanceChart: React.FC<{ data: ChartDataPoint[] }> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="text-center text-gray-500 py-8">No data available</div>;
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  // Generate SVG path
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 300;
    const y = 150 - ((d.value - minValue) / range) * 130;
    return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
  }).join(' ');

  // Generate area path
  const areaPath = `${points} L300,150 L0,150 Z`;

  return (
    <div className="mt-8">
      <div className="h-64 relative">
        <div className="absolute left-0 w-12 h-full text-xs text-gray-500 flex flex-col justify-between py-1">
          <div>{maxValue.toLocaleString()}</div>
          <div className="pt-2">{(maxValue / 2).toLocaleString()}</div>
          <div className="pb-1">{minValue.toLocaleString()}</div>
        </div>
        <div className="ml-12 mr-8 h-full relative">
          <div className="absolute inset-0 border-y border-gray-200">
            <div className="absolute top-1/2 w-full border-t border-gray-200"></div>
          </div>
          <svg viewBox="0 0 300 150" preserveAspectRatio="none" className="w-full h-full">
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
      <div className="mt-2 ml-12 mr-8 flex justify-between text-xs text-gray-500">
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
      <div className="text-sm text-gray-500 text-center mt-4">Campaign performance</div>
    </div>
  );
};

const ChannelDistributionChart: React.FC<{ data: ChannelMetric[] }> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="text-center text-gray-500 py-8">No channel data</div>;
  }

  const maxPercentage = Math.max(...data.map(m => m.percentage));

  return (
    <div className="space-y-4">
      <div className="flex justify-start space-x-4 text-sm font-semibold">
        <div className="flex items-center text-orange-600">
          <div className="w-3 h-3 bg-orange-600 rounded-full mr-2"></div>
          Spend
        </div>
        <div className="flex items-center text-gray-500">
          <div className="w-3 h-3 bg-gray-300 rounded-full mr-2"></div>
          CTR
        </div>
      </div>
      <div className="space-y-5">
        {data.map(item => (
          <div key={item.name} className="flex flex-col">
            <div className="text-xs text-gray-600 mb-1">{item.name}</div>
            <div className="flex items-center h-4">
              <div
                className="h-full rounded-r-lg bg-orange-600"
                style={{ width: `${(item.percentage / maxPercentage) * 100}%` }}
              ></div>
              <span className="ml-2 text-sm text-gray-700 font-medium">{item.percentage.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChannelDonutChart: React.FC<{ data: ChannelMetric[] }> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="text-center text-gray-500 py-8">No data</div>;
  }

  const totalSpend = data.reduce((sum, d) => sum + d.spend, 0);
  const topChannel = data.reduce((max, d) => d.spend > max.spend ? d : max, data[0]);
  const topChannelPercentage = totalSpend > 0 ? (topChannel.spend / totalSpend) * 100 : 0;

  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (topChannelPercentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
        <circle
          className="text-gray-200"
          strokeWidth="10"
          stroke="currentColor"
          fill="transparent"
          r="45"
          cx="50"
          cy="50"
        />
        <circle
          className="text-orange-600"
          strokeWidth="10"
          stroke="currentColor"
          fill="transparent"
          r="45"
          cx="50"
          cy="50"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="text-center mt-4 space-y-2">
        <div className="text-xl font-bold text-orange-600">{topChannelPercentage.toFixed(0)}%</div>
        <div className="text-sm text-gray-600">{topChannel.name}</div>
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
      {/* Welcome Modal */}
      <Dialog open={isWelcomeModalOpen} onOpenChange={setIsWelcomeModalOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <div className="relative">
            {/* Close Button */}
            <button
              onClick={() => setIsWelcomeModalOpen(false)}
              className="absolute right-4 top-4 z-10 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="h-5 w-5 text-gray-500" />
              <span className="sr-only">Close</span>
            </button>

            {/* Content */}
            <div className="p-8">
              {/* Header */}
              <DialogHeader className="mb-6">
                <DialogTitle className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome to Ad Center
                </DialogTitle>
              </DialogHeader>

              {/* Illustration */}
              <div className="relative h-64 mb-6 bg-gradient-to-br from-blue-50 via-green-50 to-blue-100 rounded-lg overflow-hidden">
                {/* Abstract background shapes */}
                <div className="absolute top-8 left-12 w-36 h-36 bg-blue-200 rounded-full opacity-25 blur-3xl"></div>
                <div className="absolute bottom-8 right-16 w-44 h-44 bg-green-200 rounded-full opacity-25 blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-100 rounded-full opacity-20 blur-2xl"></div>
                
                {/* Person with tablet sitting on cloud (left) */}
                <div className="absolute bottom-4 left-12 flex items-end">
                  <div className="relative">
                    {/* Cloud/seat shape */}
                    <div className="w-36 h-28 bg-blue-300 rounded-full opacity-90"></div>
                    <div className="absolute -left-2 top-8 w-12 h-16 bg-blue-300 rounded-full opacity-90"></div>
                    <div className="absolute -right-2 top-8 w-12 h-16 bg-blue-300 rounded-full opacity-90"></div>
                    
                    {/* Person body */}
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                      <div className="w-20 h-24 bg-gradient-to-b from-orange-400 to-orange-500 rounded-t-full relative shadow-md">
                        {/* Pattern on shirt */}
                        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-12 h-8 bg-orange-300 rounded opacity-50"></div>
                        
                        {/* Tablet */}
                        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 w-14 h-10 bg-white rounded-lg shadow-xl border-2 border-gray-300">
                          <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded flex items-center justify-center">
                            <div className="grid grid-cols-2 gap-1 p-1">
                              <div className="w-2 h-2 bg-gray-300 rounded"></div>
                              <div className="w-2 h-2 bg-gray-300 rounded"></div>
                              <div className="w-2 h-2 bg-gray-300 rounded"></div>
                              <div className="w-2 h-2 bg-gray-300 rounded"></div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Head */}
                        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-gradient-to-br from-amber-300 to-amber-400 rounded-full border-2 border-orange-400"></div>
                        {/* Hair */}
                        <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 w-14 h-8 bg-gradient-to-b from-amber-800 to-amber-900 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Person looking at floating screen (right) */}
                <div className="absolute top-8 right-16 flex flex-col items-center">
                  {/* Floating screen/video */}
                  <div className="w-28 h-20 bg-white rounded-lg shadow-2xl mb-3 border-2 border-gray-200 relative z-10">
                    {/* Video play button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                        <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[14px] border-b-white ml-1"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Person body */}
                  <div className="w-16 h-20 bg-gradient-to-b from-blue-500 to-blue-600 rounded-t-full relative shadow-md">
                    {/* Head looking up */}
                    <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-gradient-to-br from-amber-300 to-amber-400 rounded-full border-2 border-blue-400"></div>
                    {/* Hair */}
                    <div className="absolute -top-18 left-1/2 transform -translate-x-1/2 w-14 h-8 bg-gradient-to-b from-amber-800 to-amber-900 rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Text Content */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Welcome! Let's create your first ad on web
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Ad Center on web is your new home for advertising. On desktop it's even easier to access 
                  all your favorite in-app tools to easily create and manage your ads for both the website 
                  and mobile app.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setIsWelcomeModalOpen(false);
                    // Navigate to manage ads page/component
                    // TODO: Implement manage ads functionality
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 bg-white text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Manage Ads
                </button>
                <button
                  onClick={() => {
                    setIsWelcomeModalOpen(false);
                    setIsAdCreationOpen(true);
                  }}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
                >
                  Create Ads
                </button>
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

      <div className="p-4 sm:p-8 space-y-8">
        {/* Header Row */}
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h3 className="text-xl font-semibold text-gray-800">
            Campaign Overview <Info size={16} className="inline ml-1 text-gray-400" />
          </h3>
          <div className="flex items-center space-x-3">
            <CalendarDays size={18} className="text-gray-500" />
            <button className="flex items-center text-sm font-medium text-gray-600 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition">
              Last 28 days <ChevronDown size={16} className="ml-1.5" />
            </button>
          </div>
        </div>

      {/* Metric Cards and Chart */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, index) => (
            <div key={index} className="flex flex-col">
              <div className="flex items-end text-lg font-bold">
                <span className="mr-1">{metric.value}</span>
                <span className={`text-sm font-medium ${metric.isPositive ? 'text-orange-600' : 'text-gray-500'}`}>
                  {metric.change}
                </span>
              </div>
              <div className="flex items-center text-sm text-gray-500 mt-0.5">
                {metric.title} <Info size={14} className="ml-1.5" />
              </div>
            </div>
          ))}
        </div>
        <CampaignPerformanceChart data={chartData} />
        <div className="flex justify-end items-center mt-4">
          <span className="text-sm text-gray-600 mr-3">Campaign performance</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" value="" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
          </label>
        </div>
      </div>

      {/* Bottom Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Channel Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Budget by channel</h3>
          <ChannelDistributionChart data={channelData} />
        </div>

        {/* Top Channel Donut */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 flex flex-col items-center lg:items-start">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Top performing channel</h3>
          <ChannelDonutChart data={channelData} />
        </div>
      </div>

      {/* Campaigns List */}
      {campaigns.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">All Campaigns</h3>
          <div className="space-y-4">
            {campaigns.slice(0, 10).map(campaign => (
              <div key={campaign.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                <div className="flex items-center space-x-4">
                  <Megaphone size={20} className="text-orange-600" />
                  <div>
                    <div className="font-semibold text-gray-800">{campaign.name}</div>
                    <div className="text-sm text-gray-500">{campaign.channel} • {campaign.status}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-800">{campaign.roi.toFixed(2)}x ROI</div>
                  <div className="text-sm text-gray-500">${campaign.spend.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center text-gray-500 py-8">Loading campaign data...</div>
      )}

      {!loading && campaigns.length === 0 && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 text-center">
          <Megaphone size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No campaigns yet</h3>
          <p className="text-gray-600 mb-4">Create your first marketing campaign to start tracking performance.</p>
          <PrimaryButton onClick={() => setIsWelcomeModalOpen(true)}>
            Create Campaign <ChevronDown size={16} className="ml-2" />
          </PrimaryButton>
        </div>
      )}
    </div>
    </>
  );
};

export default AllCampaignOverview;


import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Star, 
  Target, 
  CheckCircle,
  Calendar,
  Award
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

type TimePeriod = 'day' | 'week' | 'month';

interface PerformanceData {
  totalEarnings: number;
  completionRate: number;
  customerRating: number;
  totalDeliveries: number;
  onlineTime: number;
}

interface EarningsData {
  date: string;
  earnings: number;
}

export const PerformanceDashboard: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('day');
  const [performanceData, setPerformanceData] = useState<PerformanceData>({
    totalEarnings: 0,
    completionRate: 95,
    customerRating: 4.8,
    totalDeliveries: 0,
    onlineTime: 0
  });
  const [earningsData, setEarningsData] = useState<EarningsData[]>([]);

  useEffect(() => {
    fetchPerformanceData();
  }, [selectedPeriod]);

  const fetchPerformanceData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch earnings data based on selected period
      let startDate = new Date();
      if (selectedPeriod === 'day') {
        startDate.setHours(0, 0, 0, 0);
      } else if (selectedPeriod === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else {
        startDate.setMonth(startDate.getMonth() - 1);
      }

      const { data: earnings } = await supabase
        .from('driver_earnings')
        .select('*')
        .eq('driver_id', user.id)
        .gte('earned_at', startDate.toISOString());

      if (earnings) {
        const totalEarnings = earnings.reduce((sum, earning) => sum + (earning.total_cents || 0), 0) / 100;
        setPerformanceData(prev => ({
          ...prev,
          totalEarnings,
          totalDeliveries: earnings.length
        }));

        // Prepare chart data
        const chartData = earnings.reduce((acc: any[], earning) => {
          const date = new Date(earning.earned_at).toLocaleDateString();
          const existing = acc.find(item => item.date === date);
          if (existing) {
            existing.earnings += (earning.total_cents || 0) / 100;
          } else {
            acc.push({ date, earnings: (earning.total_cents || 0) / 100 });
          }
          return acc;
        }, []);

        setEarningsData(chartData);
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
    }
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'day': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
    }
  };

  return (
    <div className="p-4 space-y-6 max-h-screen overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between safe-area-top">
        <div>
          <h1 className="text-2xl font-bold">Performance Dashboard</h1>
          <p className="text-muted-foreground">Track your delivery metrics and earnings</p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          <Award className="h-4 w-4 mr-1" />
          Top Performer
        </Badge>
      </div>

      {/* Time Period Selector */}
      <Tabs value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as TimePeriod)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="day">Today</TabsTrigger>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedPeriod} className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Total Earnings */}
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-green-700">
                    ${performanceData.totalEarnings.toFixed(2)}
                  </p>
                  <p className="text-sm text-green-600">Total Earnings</p>
                </div>
              </CardContent>
            </Card>

            {/* Completion Rate */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <span className="text-xs text-blue-600 font-medium">
                    {performanceData.completionRate}%
                  </span>
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-bold text-blue-700">Completion Rate</p>
                  <Progress value={performanceData.completionRate} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Customer Rating */}
            <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Star className="h-5 w-5 text-yellow-600 fill-current" />
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3 w-3 ${
                          star <= performanceData.customerRating
                            ? 'text-yellow-500 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-yellow-700">
                    {performanceData.customerRating}
                  </p>
                  <p className="text-sm text-yellow-600">Customer Rating</p>
                </div>
              </CardContent>
            </Card>

            {/* Total Deliveries */}
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  <Calendar className="h-4 w-4 text-purple-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-purple-700">
                    {performanceData.totalDeliveries}
                  </p>
                  <p className="text-sm text-purple-600">Deliveries</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Earnings Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Earnings Trend - {getPeriodLabel()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={earningsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any) => [`$${value.toFixed(2)}`, 'Earnings']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="earnings" 
                      stroke="#22c55e" 
                      strokeWidth={3}
                      dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Performance Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Performance Goals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Weekly Deliveries</span>
                  <span className="text-sm text-muted-foreground">{performanceData.totalDeliveries}/50</span>
                </div>
                <Progress value={(performanceData.totalDeliveries / 50) * 100} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Customer Satisfaction</span>
                  <span className="text-sm text-muted-foreground">{performanceData.customerRating}/5.0</span>
                </div>
                <Progress value={(performanceData.customerRating / 5) * 100} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Weekly Earnings Goal</span>
                  <span className="text-sm text-muted-foreground">${performanceData.totalEarnings.toFixed(2)}/$500</span>
                </div>
                <Progress value={(performanceData.totalEarnings / 500) * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Achievement Badges */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Recent Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Perfect Week</p>
                    <p className="text-xs text-muted-foreground">100% completion</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <Star className="h-4 w-4 text-white fill-current" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">5-Star Streak</p>
                    <p className="text-xs text-muted-foreground">15 deliveries</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
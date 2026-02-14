// @ts-nocheck
import React, { useState, useEffect } from 'react';
import InvestorAccessGuard from '@/components/investor/InvestorAccessGuard';
import InvestorLayout from '@/components/investor/InvestorLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Briefcase, DollarSign, TrendingUp, Calendar, MapPin, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InvestmentOpportunity {
  id: string;
  company_name: string;
  opportunity_name: string;
  description: string;
  investment_type: string;
  target_amount: number;
  minimum_investment: number;
  valuation_cap: number | null;
  discount_rate: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const InvestorOpportunities: React.FC = () => {
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchOpportunities = async () => {
      try {
        const { data, error } = await supabase
          .from('investment_opportunities')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setOpportunities(data || []);
      } catch (error: any) {
        console.error('Error fetching opportunities:', error);
        toast({
          title: 'Error',
          description: 'Failed to load investment opportunities. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOpportunities();
  }, [toast]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <InvestorAccessGuard>
        <InvestorLayout>
          <div className="container mx-auto py-12 px-6">
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          </div>
        </InvestorLayout>
      </InvestorAccessGuard>
    );
  }

  return (
    <InvestorAccessGuard>
      <InvestorLayout>
        <div className="container mx-auto py-12 px-6">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Investment Opportunities</h1>
            <p className="text-gray-600">
              Current investment opportunities available from Crave'n Inc.
            </p>
          </div>

          {opportunities.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Active Opportunities</h3>
                <p className="text-gray-600">
                  There are currently no active investment opportunities. Please check back later or contact investor relations.
                </p>
                <Button 
                  className="mt-6 bg-orange-500 hover:bg-orange-600"
                  onClick={() => window.location.href = 'mailto:invest@cravenusa.com?subject=Investment Inquiry'}
                >
                  Contact Investor Relations
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {opportunities.map((opportunity) => (
                <Card key={opportunity.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-2xl">{opportunity.company_name}</CardTitle>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Active
                      </Badge>
                    </div>
                    <CardDescription className="text-lg font-medium">
                      {opportunity.opportunity_name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 mb-6 min-h-[60px]">
                      {opportunity.description || 'Investment opportunity details available upon request.'}
                    </p>

                    <div className="space-y-4 mb-6">
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm text-gray-600 flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Target Amount
                        </span>
                        <span className="font-semibold">{formatCurrency(opportunity.target_amount)}</span>
                      </div>

                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm text-gray-600 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Minimum Investment
                        </span>
                        <span className="font-semibold">{formatCurrency(opportunity.minimum_investment)}</span>
                      </div>

                      {opportunity.valuation_cap && (
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-sm text-gray-600">Valuation Cap</span>
                          <span className="font-semibold">{formatCurrency(opportunity.valuation_cap)}</span>
                        </div>
                      )}

                      {opportunity.discount_rate && (
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-sm text-gray-600">Discount Rate</span>
                          <span className="font-semibold">{opportunity.discount_rate}%</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600 flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          Investment Type
                        </span>
                        <Badge variant="secondary">{opportunity.investment_type}</Badge>
                      </div>
                    </div>

                    <Button 
                      className="w-full bg-orange-500 hover:bg-orange-600"
                      onClick={() => window.location.href = `mailto:invest@cravenusa.com?subject=Investment Inquiry - ${encodeURIComponent(opportunity.opportunity_name)}`}
                    >
                      Express Interest
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card className="mt-8 border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle>Have Questions?</CardTitle>
              <CardDescription>
                Contact our investor relations team for more information about these opportunities.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  <strong>Email:</strong>{' '}
                  <a href="mailto:invest@cravenusa.com" className="text-orange-600 hover:underline">
                    invest@cravenusa.com
                  </a>
                </p>
                <p className="text-sm text-gray-600">
                  All investment opportunities are subject to regulatory compliance and investor qualification requirements.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </InvestorLayout>
    </InvestorAccessGuard>
  );
};

export default InvestorOpportunities;


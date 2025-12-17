import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const InvestorInterest: React.FC = () => {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    entity_name: '',
    investor_type: '',
    jurisdiction: '',
    capital_range: '',
    acknowledgment_accepted: false,
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  // Get IP address and user agent for audit trail
  const getClientInfo = async () => {
    try {
      // Get IP address (using a service or from headers if available)
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      const ipAddress = ipData.ip || 'unknown';
      
      const userAgent = navigator.userAgent || 'unknown';
      
      return { ipAddress, userAgent };
    } catch (error) {
      console.error('Error fetching client info:', error);
      return { ipAddress: 'unknown', userAgent: navigator.userAgent || 'unknown' };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.acknowledgment_accepted) {
      toast({
        title: 'Required',
        description: 'You must acknowledge the risk disclosure to proceed.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.full_name || !formData.email || !formData.investor_type) {
      toast({
        title: 'Required Fields',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { ipAddress, userAgent } = await getClientInfo();
      
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();

      // Insert into investor_intake table
      const { data, error } = await supabase
        .from('investor_intake')
        .insert({
          full_name: formData.full_name,
          email: formData.email,
          entity_name: formData.entity_name || null,
          investor_type: formData.investor_type,
          jurisdiction: formData.jurisdiction || null,
          capital_range: formData.capital_range || null,
          acknowledgment_accepted: true,
          accepted_at: new Date().toISOString(),
          ip_address: ipAddress,
          user_agent: userAgent,
          status: 'pending',
          user_id: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Also insert into investor_interests so it shows up in CFO Portal Investor Relations
      // Find the default investment opportunity
      let opportunity = null;
      const { data: cravenOpp } = await supabase
        .from('investment_opportunities')
        .select('id')
        .eq('is_active', true)
        .eq('company_name', 'Craven Delivery')
        .maybeSingle();

      if (cravenOpp) {
        opportunity = cravenOpp;
      } else {
        // Fallback to first active opportunity
        const { data: firstOpp } = await supabase
          .from('investment_opportunities')
          .select('id')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        if (firstOpp) opportunity = firstOpp;
      }

      // Map investor_type from intake form to investor_interests format
      const investorTypeMap: Record<string, string> = {
        'Individual': 'individual',
        'Angel': 'angel',
        'Fund': 'vc',
        'Strategic': 'corporate',
      };

      if (opportunity?.id) {
        const { error: interestError } = await supabase
          .from('investor_interests')
          .insert({
            opportunity_id: opportunity.id,
            user_id: user?.id || null,
            full_name: formData.full_name,
            email: formData.email,
            phone: null,
            company_name: formData.entity_name || null,
            investor_type: investorTypeMap[formData.investor_type] || 'other',
            investment_range: formData.capital_range || null,
            message: null,
            status: 'new',
            source: 'investor_intake_form',
            shortlisted: false,
          });

        if (interestError) {
          console.error('Error inserting into investor_interests:', interestError);
          // Don't fail the whole request if this fails, but log it
        }
      }

      // If user is logged in, also update investor_profiles
      if (user) {
        await supabase
          .from('investor_profiles')
          .upsert({
            user_id: user.id,
            access_status: 'pending',
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });
      }

      setSubmitted(true);
      toast({
        title: 'Request Submitted',
        description: 'Your investor interest has been received and is under review. You will be notified once your request is processed.',
      });
    } catch (error: any) {
      console.error('Error submitting investor interest:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-2xl mx-auto py-20 px-4">
          <Card className="text-center">
            <CardContent className="pt-12 pb-12">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-6" />
              <h1 className="text-3xl font-bold mb-4">Request Received</h1>
              <p className="text-lg text-gray-600 mb-8">
                Thank you for your interest in Crave'n Inc. Your request has been received and is under review.
                If approved, you will receive access to additional investor materials via email.
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => navigate('/')} variant="outline">
                  Return Home
                </Button>
                <Button 
                  onClick={() => navigate(`/investors/status?email=${encodeURIComponent(formData.email)}`)} 
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  Check Request Status
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-2xl mx-auto py-12 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Request Investor Access</CardTitle>
            <CardDescription>
              Complete the form below to express interest in investing in Crave'n Inc.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  required
                  placeholder="John Doe"
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <Label htmlFor="entity_name">Company / Fund (if applicable)</Label>
                <Input
                  id="entity_name"
                  value={formData.entity_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, entity_name: e.target.value }))}
                  placeholder="ABC Ventures"
                />
              </div>

              <div>
                <Label htmlFor="investor_type">Investor Type *</Label>
                <Select
                  value={formData.investor_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, investor_type: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select investor type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Individual">Individual</SelectItem>
                    <SelectItem value="Angel">Angel Investor</SelectItem>
                    <SelectItem value="Fund">Fund / VC</SelectItem>
                    <SelectItem value="Strategic">Strategic Investor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="jurisdiction">Jurisdiction (Country / State)</Label>
                <Input
                  id="jurisdiction"
                  value={formData.jurisdiction}
                  onChange={(e) => setFormData(prev => ({ ...prev, jurisdiction: e.target.value }))}
                  placeholder="United States, California"
                />
              </div>

              <div>
                <Label htmlFor="capital_range">Capital Range (Non-binding, optional)</Label>
                <Select
                  value={formData.capital_range}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, capital_range: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select capital range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="<$50K">Less than $50,000</SelectItem>
                    <SelectItem value="$50K-$100K">$50,000 - $100,000</SelectItem>
                    <SelectItem value="$100K-$250K">$100,000 - $250,000</SelectItem>
                    <SelectItem value="$250K-$500K">$250,000 - $500,000</SelectItem>
                    <SelectItem value="$500K-$1M">$500,000 - $1,000,000</SelectItem>
                    <SelectItem value=">$1M">Greater than $1,000,000</SelectItem>
                    <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="acknowledgment"
                    checked={formData.acknowledgment_accepted}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, acknowledgment_accepted: checked === true }))
                    }
                    className="mt-1"
                  />
                  <Label htmlFor="acknowledgment" className="text-sm cursor-pointer leading-relaxed">
                    <strong>Investor Acknowledgment & Risk Disclosure *</strong>
                    <br />
                    <span className="text-gray-600">
                      I acknowledge that the information provided by Crave'n Inc. is for informational purposes only and does not constitute an offer to sell or a solicitation of an offer to buy any securities.
                      <br /><br />
                      I understand that any investment in Crave'n Inc. involves substantial risk, including the possible loss of all invested capital.
                      <br /><br />
                      I further acknowledge that no representations or guarantees have been made regarding future performance, valuation, or returns, and that any investment decision must be made based on my own independent evaluation and, where appropriate, consultation with my professional advisors.
                    </span>
                  </Label>
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting || !formData.acknowledgment_accepted}
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Request Investor Access'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default InvestorInterest;


import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, TrendingUp, DollarSign, Shield, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import InvestorAccessGuard from '@/components/investor/InvestorAccessGuard';

const InvestorPortal: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [accreditationStatus, setAccreditationStatus] = useState<string>('');
  const [savingAccreditation, setSavingAccreditation] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setUser(authUser);

        if (authUser) {
          // Fetch accreditation status
          const { data: profile } = await supabase
            .from('investor_profiles')
            .select('accreditation_status')
            .eq('user_id', authUser.id)
            .maybeSingle();

          if (profile?.accreditation_status) {
            setAccreditationStatus(profile.accreditation_status);
          }
        }
      } catch (error) {
        console.error('Error checking access:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, []);

  const handleAccreditationChange = async (value: string) => {
    if (!user) return;

    setSavingAccreditation(true);
    try {
      const { error } = await supabase
        .from('investor_profiles')
        .upsert({
          user_id: user.id,
          accreditation_status: value === 'none' ? null : value,
          accreditation_self_certified_at: value !== 'none' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      setAccreditationStatus(value === 'none' ? '' : value);
      toast({
        title: 'Saved',
        description: 'Accreditation status has been saved.',
      });
    } catch (error: any) {
      console.error('Error saving accreditation:', error);
      toast({
        title: 'Error',
        description: 'Failed to save accreditation status',
        variant: 'destructive',
      });
    } finally {
      setSavingAccreditation(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <InvestorAccessGuard>
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-6xl mx-auto py-12 px-4">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Investor Portal</h1>
            <p className="text-gray-600">
              Access to confidential investor materials for Crave'n Inc.
            </p>
          </div>

          {/* Accreditation Self-Certification (Reg D 506b) */}
          <Card className="mb-8 border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-orange-500" />
                Accreditation Self-Certification (Reg D 506b)
              </CardTitle>
              <CardDescription>
                Are you an accredited investor as defined by SEC rules?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="accreditation">Accreditation Status</Label>
                  <Select
                    value={accreditationStatus || 'none'}
                    onValueChange={handleAccreditationChange}
                    disabled={savingAccreditation}
                  >
                    <SelectTrigger id="accreditation" className="w-full">
                      <SelectValue placeholder="Select your accreditation status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not Selected</SelectItem>
                      <SelectItem value="accredited">Yes, I am an accredited investor</SelectItem>
                      <SelectItem value="non_accredited">No, I am not an accredited investor</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> This self-certification is for Reg D 506(b) compliance purposes. 
                    No verification is required at this stage. This information helps us understand our investor base 
                    and ensure compliance with securities regulations.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Investor Materials */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-orange-500" />
                  Pitch Deck
                </CardTitle>
                <CardDescription>
                  Comprehensive overview of Crave'n Inc. business model, market opportunity, and growth strategy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    // TODO: Link to actual pitch deck document
                    toast({
                      title: 'Coming Soon',
                      description: 'Pitch deck will be available here.',
                    });
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Pitch Deck
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-orange-500" />
                  Executive Summary
                </CardTitle>
                <CardDescription>
                  High-level summary of company performance, key metrics, and strategic initiatives
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    toast({
                      title: 'Coming Soon',
                      description: 'Executive summary will be available here.',
                    });
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Executive Summary
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                  Financial Projections
                </CardTitle>
                <CardDescription>
                  High-level financial projections and key performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    toast({
                      title: 'Coming Soon',
                      description: 'Financial projections will be available here.',
                    });
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  View Financial Projections
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-orange-500" />
                  Use of Funds
                </CardTitle>
                <CardDescription>
                  Detailed breakdown of how investment capital will be allocated
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    toast({
                      title: 'Coming Soon',
                      description: 'Use of funds document will be available here.',
                    });
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  View Use of Funds
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Reg D Disclosure Summary */}
          <Card className="mb-8 border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-orange-500" />
                Reg D Disclosure Summary
              </CardTitle>
              <CardDescription>
                Important information about Regulation D offerings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose max-w-none">
                <h3 className="text-lg font-semibold mb-2">Regulation D 506(b) Offering</h3>
                <p className="text-sm text-gray-700 mb-4">
                  This offering is being conducted under Regulation D Rule 506(b), which allows for:
                </p>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-2 mb-4">
                  <li>Up to 35 non-accredited investors</li>
                  <li>Unlimited accredited investors</li>
                  <li>No general advertising or solicitation</li>
                  <li>Relationship-driven raise</li>
                </ul>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Important:</strong> This offering has not been registered with the SEC. 
                    Securities are being offered in reliance on an exemption from registration under Regulation D. 
                    These securities may not be sold, transferred, or assigned without compliance with applicable 
                    securities laws or an opinion of counsel satisfactory to the Company.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact / Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle>Contact & Next Steps</CardTitle>
              <CardDescription>
                Questions or ready to proceed with an investment?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Investor Relations</Label>
                  <p className="text-sm text-gray-700">
                    Email: <a href="mailto:investors@cravenusa.com" className="text-orange-500 hover:underline">investors@cravenusa.com</a>
                  </p>
                </div>
                <div>
                  <Label>Next Steps</Label>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mt-2">
                    <li>Review all materials provided in this portal</li>
                    <li>Complete accreditation self-certification (if not already done)</li>
                    <li>Contact investor relations with any questions</li>
                    <li>Schedule a call to discuss investment terms</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    </InvestorAccessGuard>
  );
};

export default InvestorPortal;


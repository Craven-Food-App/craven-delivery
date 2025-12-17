import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const InvestorAccess: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    investor_type: '',
    organization: '',
    location: '',
    linkedin_url: '',
    notes: '',
    disclaimer1: false,
    disclaimer2: false,
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        // Prefill email
        setFormData(prev => ({ ...prev, email: user.email || '' }));
      }
      setLoading(false);
    };
    checkUser();

    // Show message from location state if present
    if (location.state?.message) {
      toast({
        title: 'Access Required',
        description: location.state.message,
        variant: 'default',
      });
    }
  }, [location, toast]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);

    try {
      if (authMode === 'signup') {
        if (!authFullName) {
          toast({
            title: 'Error',
            description: 'Please enter your full name',
            variant: 'destructive',
          });
          setAuthLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            data: {
              full_name: authFullName,
            },
          },
        });

        if (error) throw error;

        toast({
          title: 'Account Created',
          description: 'Please check your email to verify your account.',
        });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });

        if (error) throw error;

        // Refresh user state
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        if (user) {
          setFormData(prev => ({ ...prev, email: user.email || '' }));
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Authentication failed',
        variant: 'destructive',
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.disclaimer1 || !formData.disclaimer2) {
      toast({
        title: 'Required',
        description: 'Please acknowledge both disclaimers.',
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
      // Find the default investment opportunity (Craven Delivery, or first active one)
      let opportunity = null;
      const { data: cravenOpp, error: cravenError } = await supabase
        .from('investment_opportunities')
        .select('id')
        .eq('is_active', true)
        .eq('company_name', 'Craven Delivery')
        .maybeSingle();

      if (!cravenError && cravenOpp) {
        opportunity = cravenOpp;
      } else {
        // Fallback to first active opportunity
        const { data: firstOpp, error: firstError } = await supabase
          .from('investment_opportunities')
          .select('id')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (!firstError && firstOpp) {
          opportunity = firstOpp;
        } else if (firstError) {
          console.error('Error fetching investment opportunity:', firstError);
        }
      }

      // Insert access request
      const { data: requestData, error: requestError } = await supabase
        .from('investor_access_requests')
        .insert({
          user_id: user?.id || null,
          full_name: formData.full_name,
          email: formData.email,
          investor_type: formData.investor_type,
          organization: formData.organization || null,
          location: formData.location || null,
          linkedin_url: formData.linkedin_url || null,
          notes: formData.notes || null,
          status: 'pending',
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Also insert into investor_interests so it shows up in Investor Relations
      if (opportunity?.id) {
        // Map investor_type from access form to investor_interests format
        const investorTypeMap: Record<string, string> = {
          'angel': 'angel',
          'strategic': 'corporate',
          'institutional': 'vc',
          'other': 'other',
        };

        const { error: interestError } = await supabase
          .from('investor_interests')
          .insert({
            opportunity_id: opportunity.id,
            user_id: user?.id || null,
            full_name: formData.full_name,
            email: formData.email,
            phone: null,
            company_name: formData.organization || null,
            investor_type: investorTypeMap[formData.investor_type] || 'other',
            investment_range: null,
            message: formData.notes || null,
            status: 'new',
            source: 'investor_access_form',
          });

        if (interestError) {
          console.error('Error inserting investor interest:', interestError);
          // Don't fail the whole request if interest insert fails
        }
      } else {
        console.warn('No active investment opportunity found. Investor interest not recorded.');
      }

      // Upsert investor profile
      if (user) {
        const { error: profileError } = await supabase
          .from('investor_profiles')
          .upsert({
            user_id: user.id,
            access_status: 'pending',
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });

        if (profileError) {
          console.error('Error updating investor profile:', profileError);
          // Don't fail the whole request if profile update fails
        }
      }

      setSubmitted(true);
      toast({
        title: 'Request Submitted',
        description: 'Your request has been received and is under review.',
      });
    } catch (error: any) {
      console.error('Error submitting access request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // Show confirmation if submitted
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
                Your request has been received. If approved, you will receive access to additional investor materials.
              </p>
              <Button onClick={() => navigate('/investors')} variant="outline">
                Return to Investors Page
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  // Show auth if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-md mx-auto py-12 px-4">
          <Card>
            <CardHeader>
              <CardTitle>Sign In Required</CardTitle>
              <CardDescription>
                Please sign in or create an account to request investor access.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as 'signin' | 'signup')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                <TabsContent value="signin">
                  <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                      <Label htmlFor="auth-email">Email</Label>
                      <Input
                        id="auth-email"
                        type="email"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="auth-password">Password</Label>
                      <Input
                        id="auth-password"
                        type="password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" disabled={authLoading} className="w-full">
                      {authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Sign In
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="signup">
                  <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                      <Label htmlFor="auth-fullname">Full Name</Label>
                      <Input
                        id="auth-fullname"
                        value={authFullName}
                        onChange={(e) => setAuthFullName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="auth-email-signup">Email</Label>
                      <Input
                        id="auth-email-signup"
                        type="email"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="auth-password-signup">Password</Label>
                      <Input
                        id="auth-password-signup"
                        type="password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                    <Button type="submit" disabled={authLoading} className="w-full">
                      {authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Sign Up
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
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
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Request Investor Access</CardTitle>
            <CardDescription>
              Complete the form below to request access to investor materials.
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
                    <SelectItem value="angel">Angel</SelectItem>
                    <SelectItem value="strategic">Strategic</SelectItem>
                    <SelectItem value="institutional">Institutional</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="organization">Organization</Label>
                <Input
                  id="organization"
                  value={formData.organization}
                  onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                <Input
                  id="linkedin_url"
                  type="url"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, linkedin_url: e.target.value }))}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>

              <div>
                <Label htmlFor="notes">Investment Thesis / Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                  placeholder="Tell us about your investment focus and interest in Crave'n..."
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="disclaimer1"
                    checked={formData.disclaimer1}
                    onChange={(e) => setFormData(prev => ({ ...prev, disclaimer1: e.target.checked }))}
                    required
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <Label htmlFor="disclaimer1" className="text-sm cursor-pointer">
                    I understand this site is for informational purposes and is not an offer or solicitation to buy or sell securities. *
                  </Label>
                </div>

                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="disclaimer2"
                    checked={formData.disclaimer2}
                    onChange={(e) => setFormData(prev => ({ ...prev, disclaimer2: e.target.checked }))}
                    required
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <Label htmlFor="disclaimer2" className="text-sm cursor-pointer">
                    I acknowledge investing is risky and I may lose all invested capital. *
                  </Label>
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
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

export default InvestorAccess;


import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, Clock, XCircle, FileText, Mail, ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface InvestorIntake {
  id: string;
  full_name: string;
  email: string;
  entity_name: string | null;
  investor_type: string;
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
  reviewed_at: string | null;
  admin_notes: string | null;
}

const InvestorRequestStatus: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [intake, setIntake] = useState<InvestorIntake | null>(null);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        // Check if user is logged in
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setUser(authUser);

        // Get email from URL params or user
        const urlParams = new URLSearchParams(window.location.search);
        const emailParam = urlParams.get('email');
        const email = authUser?.email || emailParam;

        if (!email) {
          setLoading(false);
          return;
        }

        // Fetch most recent intake for this email
        const { data, error } = await supabase
          .from('investor_intake')
          .select('id, full_name, email, entity_name, investor_type, status, created_at, reviewed_at, admin_notes')
          .eq('email', email)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching intake status:', error);
        } else if (data) {
          setIntake(data);
        }
      } catch (error) {
        console.error('Error fetching status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500 text-white">Approved</Badge>;
      case 'denied':
        return <Badge className="bg-red-500 text-white">Denied</Badge>;
      default:
        return <Badge className="bg-yellow-500 text-white">Pending Review</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-12 w-12 text-green-500" />;
      case 'denied':
        return <XCircle className="h-12 w-12 text-red-500" />;
      default:
        return <Clock className="h-12 w-12 text-yellow-500" />;
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'approved':
        return {
          title: 'Access Approved',
          description: 'Your investor access request has been approved. You now have access to investor materials.',
        };
      case 'denied':
        return {
          title: 'Access Denied',
          description: 'Your investor access request has been denied. If you believe this is an error, please contact investor relations.',
        };
      default:
        return {
          title: 'Request Under Review',
          description: 'Your investor access request is currently under review. We typically review requests within 2-3 business days.',
        };
    }
  };

  const getNextSteps = (status: string) => {
    switch (status) {
      case 'approved':
        return [
          'Access the Investor Portal to view pitch deck, financials, and other materials',
          'Complete accreditation self-certification (Reg D 506b)',
          'Contact investor relations with any questions',
          'Schedule a call to discuss investment terms',
        ];
      case 'denied':
        return [
          'If you believe this is an error, contact investor relations at investors@cravenusa.com',
          'Review your submission to ensure all information was accurate',
          'You may submit a new request if your circumstances have changed',
        ];
      default:
        return [
          'Check your email for updates on your request status',
          'Ensure your contact information is up to date',
          'We will notify you via email once your request has been reviewed',
          'Typical review time is 2-3 business days',
        ];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!intake) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-2xl mx-auto py-20 px-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-6" />
              <h1 className="text-3xl font-bold mb-4">No Request Found</h1>
              <p className="text-lg text-gray-600 mb-8">
                We couldn't find an investor access request for your email address.
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => navigate('/investors/interest')} className="bg-orange-500 hover:bg-orange-600">
                  Submit Request
                </Button>
                <Button onClick={() => navigate('/investors')} variant="outline">
                  View Investor Information
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const statusInfo = getStatusMessage(intake.status);
  const nextSteps = getNextSteps(intake.status);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-3xl mx-auto py-12 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <CardTitle className="text-3xl">{statusInfo.title}</CardTitle>
              {getStatusBadge(intake.status)}
            </div>
            <CardDescription className="text-base">
              {statusInfo.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center mb-6">
              {getStatusIcon(intake.status)}
            </div>

            <div className="space-y-4 border-t pt-6">
              <div>
                <h3 className="font-semibold text-sm text-gray-500 uppercase mb-2">Request Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <p className="font-medium">{intake.full_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <p className="font-medium">{intake.email}</p>
                  </div>
                  {intake.entity_name && (
                    <div>
                      <span className="text-gray-500">Company/Fund:</span>
                      <p className="font-medium">{intake.entity_name}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Investor Type:</span>
                    <p className="font-medium capitalize">{intake.investor_type}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Submitted:</span>
                    <p className="font-medium">
                      {new Date(intake.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {intake.reviewed_at && (
                    <div>
                      <span className="text-gray-500">Reviewed:</span>
                      <p className="font-medium">
                        {new Date(intake.reviewed_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {intake.admin_notes && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-sm text-gray-500 uppercase mb-2">Admin Notes</h3>
                  <p className="text-sm text-gray-700">{intake.admin_notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>What happens next with your request</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {nextSteps.map((step, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-semibold mt-0.5">
                    {index + 1}
                  </div>
                  <span className="text-gray-700">{step}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="mt-6 flex gap-4 justify-center">
          {intake.status === 'approved' ? (
            <Button
              onClick={() => navigate('/investors/portal')}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <FileText className="mr-2 h-4 w-4" />
              Access Investor Portal
            </Button>
          ) : (
            <Button
              onClick={() => navigate('/investors')}
              variant="outline"
            >
              View Investor Information
            </Button>
          )}
          <Button onClick={() => navigate('/')} variant="outline">
            Return Home
          </Button>
        </div>

        <Card className="mt-6 border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-900 mb-1">Questions?</h3>
                <p className="text-sm text-orange-800">
                  Contact investor relations at{' '}
                  <a href="mailto:investors@cravenusa.com" className="underline font-medium">
                    investors@cravenusa.com
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default InvestorRequestStatus;


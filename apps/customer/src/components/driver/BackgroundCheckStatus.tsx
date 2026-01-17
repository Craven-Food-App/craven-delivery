import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Shield, Clock, CheckCircle, Mail, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, differenceInHours, addDays } from 'date-fns';
import Header from '@/components/Header';

interface ApplicationData {
  first_name: string;
  background_check_initiated_at: string;
  background_check_estimated_completion: string;
  background_check_approved_at: string | null;
  status: string;
}

export const BackgroundCheckStatus: React.FC = () => {
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchApplicationStatus();
    
    // Update progress every minute
    const interval = setInterval(() => {
      if (application) {
        calculateProgress();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [application]);

  const fetchApplicationStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('craver_applications')
        .select('first_name, background_check_initiated_at, background_check_estimated_completion, background_check_approved_at, status')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setApplication(data);
      calculateProgress(data);
    } catch (error) {
      console.error('Error fetching application status:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (app: ApplicationData | null = application) => {
    if (!app || !app.background_check_initiated_at || !app.background_check_estimated_completion) {
      setProgress(0);
      return;
    }

    const startDate = new Date(app.background_check_initiated_at);
    const endDate = new Date(app.background_check_estimated_completion);
    const now = new Date();

    const totalHours = differenceInHours(endDate, startDate);
    const elapsedHours = differenceInHours(now, startDate);

    const progressPercent = Math.min(Math.max((elapsedHours / totalHours) * 100, 0), 95);
    setProgress(progressPercent);
  };

  const getDaysRemaining = () => {
    if (!application?.background_check_estimated_completion) return 0;
    const daysLeft = differenceInDays(
      new Date(application.background_check_estimated_completion),
      new Date()
    );
    return Math.max(daysLeft, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Application Not Found</h1>
          <p className="text-muted-foreground">Please submit a Feeder application first.</p>
        </div>
      </div>
    );
  }

  const isApproved = application.background_check_approved_at !== null;
  const daysRemaining = getDaysRemaining();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      <Header />
      
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 mb-4 shadow-lg">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Hey {application.first_name}! 👋
          </h1>
          <p className="text-lg text-gray-600">
            Here's the status of your Feeder application
          </p>
        </div>

        {/* Status Card */}
        <Card className="p-8 shadow-xl bg-white/95 backdrop-blur-sm">
          <div className="space-y-6">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold mb-1">Background Check</h2>
                <p className="text-sm text-gray-600">Required for all Feeders</p>
              </div>
              <Badge 
                variant={isApproved ? "default" : "secondary"}
                className={`text-sm px-4 py-2 ${isApproved ? 'bg-green-500' : 'bg-orange-500'}`}
              >
                {isApproved ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approved
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 mr-2" />
                    In Progress
                  </>
                )}
              </Badge>
            </div>

            {!isApproved ? (
              <>
                {/* Progress Bar */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Processing your background check...</span>
                    <span className="font-semibold text-orange-600">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                </div>

                {/* Estimated Completion */}
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 mb-2">Estimated Completion</h3>
                      <p className="text-2xl font-bold text-orange-600 mb-1">
                        {daysRemaining === 0 ? 'Today' : daysRemaining === 1 ? 'Tomorrow' : `${daysRemaining} days`}
                      </p>
                      <p className="text-sm text-gray-600">
                        Expected by {format(new Date(application.background_check_estimated_completion), 'MMMM d, yyyy')}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Background checks typically take 1-5 business days (possibly more)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Email Notification Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm text-blue-900 mb-1">
                        We'll notify you via email
                      </p>
                      <p className="text-xs text-blue-800">
                        You'll receive an email as soon as your background check is complete. 
                        Make sure to check your spam folder just in case!
                      </p>
                    </div>
                  </div>
                </div>

                {/* What We're Checking */}
                <div className="pt-6 border-t">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-gray-600" />
                    What We're Verifying
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-orange-500 mt-2"></div>
                      <div>
                        <p className="font-medium text-sm">Identity Verification</p>
                        <p className="text-xs text-gray-600">Confirming your identity and documents</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-orange-500 mt-2"></div>
                      <div>
                        <p className="font-medium text-sm">Driving Record</p>
                        <p className="text-xs text-gray-600">Reviewing your driving history</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-orange-500 mt-2"></div>
                      <div>
                        <p className="font-medium text-sm">Criminal Background</p>
                        <p className="text-xs text-gray-600">Standard safety screening</p>
                      </div>
                    </li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-green-600 mb-2">
                  Background Check Approved!
                </h3>
                <p className="text-gray-600 mb-6">
                  You're cleared to start delivering. Check your email for next steps!
                </p>
                <p className="text-sm text-gray-500">
                  Approved on {format(new Date(application.background_check_approved_at), 'MMMM d, yyyy')}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Help Section */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Questions about your background check?{' '}
            <a href="/help-center" className="text-orange-600 hover:text-orange-700 font-medium">
              Visit our Help Center
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};


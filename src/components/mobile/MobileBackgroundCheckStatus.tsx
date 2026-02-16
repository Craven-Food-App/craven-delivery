import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Shield, Clock, CheckCircle, Mail, Calendar, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, differenceInHours } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import cravenLogo from '@/assets/craven-logo.png';

interface ApplicationData {
  first_name: string;
  background_check_initiated_at: string;
  background_check_estimated_completion: string;
  background_check_approved_at: string | null;
  status: string;
}

interface MobileBackgroundCheckStatusProps {
  onApproved?: () => void;
}

export const MobileBackgroundCheckStatus: React.FC<MobileBackgroundCheckStatusProps> = ({ onApproved }) => {
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchApplicationStatus();
    
    // Update progress every minute
    const interval = setInterval(() => {
      if (application) {
        calculateProgress();
      }
    }, 60000);

    // Check for approval every 30 seconds
    const approvalCheck = setInterval(() => {
      fetchApplicationStatus();
    }, 30000);

    return () => {
      clearInterval(interval);
      clearInterval(approvalCheck);
    };
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
      
      // If just got approved, call onApproved callback
      if (data.background_check_approved_at && !application?.background_check_approved_at) {
        if (onApproved) {
          setTimeout(() => onApproved(), 2000); // Give them 2 seconds to see the approval message
        }
      }
      
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-orange-50 to-white">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Application Not Found</h1>
          <p className="text-gray-600 mb-6">Please submit a Feeder application first.</p>
          <button
            onClick={() => navigate('/feeder')}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold"
          >
            Apply Now
          </button>
        </div>
      </div>
    );
  }

  const isApproved = application.background_check_approved_at !== null;
  const daysRemaining = getDaysRemaining();

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-orange-50 to-orange-100 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', minHeight: 'calc(env(safe-area-inset-top, 0px) + 60px)' }}>
        <div className="flex items-center justify-between p-4">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-gray-700 hover:text-orange-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
          <img src={cravenLogo} alt="Crave'n" className="h-8" />
          <div className="w-20"></div>
        </div>
      </div>

      <div className="px-4 py-8 max-w-2xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 mb-4 shadow-lg">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            Hey {application.first_name}! 👋
          </h1>
          <p className="text-gray-600">
            Here's your application status
          </p>
        </div>

        {/* Status Card */}
        <Card className="p-6 shadow-xl bg-white">
          <div className="space-y-6">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold mb-1">Background Check</h2>
                <p className="text-xs text-gray-600">Required for all Feeders</p>
              </div>
              <Badge 
                variant={isApproved ? "default" : "secondary"}
                className={`px-3 py-1.5 ${isApproved ? 'bg-green-500' : 'bg-orange-500'}`}
              >
                {isApproved ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approved
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 mr-1" />
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
                    <span className="text-gray-600">Processing...</span>
                    <span className="font-semibold text-orange-600">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                </div>

                {/* Estimated Completion */}
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 mb-1 text-sm">Estimated Completion</h3>
                      <p className="text-xl font-bold text-orange-600 mb-1">
                        {daysRemaining === 0 ? 'Today' : daysRemaining === 1 ? 'Tomorrow' : `${daysRemaining} days`}
                      </p>
                      <p className="text-xs text-gray-600">
                        Expected by {format(new Date(application.background_check_estimated_completion), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Email Notification */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm text-blue-900 mb-1">
                        We'll notify you via email
                      </p>
                      <p className="text-xs text-blue-800">
                        You'll receive an email when complete. Check your spam folder!
                      </p>
                    </div>
                  </div>
                </div>

                {/* What We're Checking */}
                <div className="pt-4 border-t">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4 text-gray-600" />
                    What We're Verifying
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5"></div>
                      <div>
                        <p className="font-medium text-xs">Identity Verification</p>
                        <p className="text-xs text-gray-600">Confirming your identity</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5"></div>
                      <div>
                        <p className="font-medium text-xs">Driving Record</p>
                        <p className="text-xs text-gray-600">Reviewing driving history</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5"></div>
                      <div>
                        <p className="font-medium text-xs">Criminal Background</p>
                        <p className="text-xs text-gray-600">Standard safety screening</p>
                      </div>
                    </li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-green-600 mb-2">
                  Background Check Approved! 🎉
                </h3>
                <p className="text-gray-600 mb-4">
                  You're cleared to start delivering!
                </p>
                <p className="text-sm text-gray-500">
                  Approved {format(new Date(application.background_check_approved_at), 'MMM d, yyyy')}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Help Section */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Questions?{' '}
            <a href="/help" className="text-orange-600 hover:text-orange-700 font-medium">
              Visit Help Center
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default MobileBackgroundCheckStatus;


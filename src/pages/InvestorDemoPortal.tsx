import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  ShoppingBag, 
  Store, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  Eye,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

interface AccessRecord {
  id: string;
  email: string;
  full_name: string | null;
  organization: string | null;
  status: string;
  expires_at: string;
}

export default function InvestorDemoPortal() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [accessRecord, setAccessRecord] = useState<AccessRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    validateAccess();
  }, [searchParams]);

  async function validateAccess() {
    // Check for verified session first (from access code + email verification)
    const session = sessionStorage.getItem('investor_demo_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        
        // Check if session is expired
        if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
          sessionStorage.removeItem('investor_demo_session');
          setError('Your access has expired. Please request a new invitation.');
          setLoading(false);
          return;
        }

        setAccessRecord({
          id: parsed.accessId,
          email: parsed.email,
          full_name: parsed.fullName,
          organization: parsed.organization,
          status: 'active',
          expires_at: parsed.expiresAt,
        });
        setLoading(false);
        return;
      } catch (e) {
        // Invalid session, continue to token check
        sessionStorage.removeItem('investor_demo_session');
      }
    }

    // Fallback to token-based access for backward compatibility
    const token = searchParams.get('token');

    if (!token) {
      setError('No access token provided. Please use the link from your invitation email or enter your access code.');
      setLoading(false);
      return;
    }

    try {
      // Verify the access token
      const { data, error: dbError } = await supabase
        .from('investor_demo_access')
        .select('*')
        .eq('access_token', token)
        .maybeSingle();

      if (dbError) {
        console.error('Database error:', dbError);
        setError('Failed to validate access token.');
        setLoading(false);
        return;
      }

      if (!data) {
        setError('Invalid or expired access token. Please request a new invitation.');
        setLoading(false);
        return;
      }

      // Check if token is expired
      const expiresAt = new Date(data.expires_at);
      if (expiresAt < new Date()) {
        setError('Your access has expired. Please request a new invitation.');
        setLoading(false);
        return;
      }

      // Check if access is revoked
      if (data.status === 'revoked') {
        setError('Access has been revoked. Please contact us for assistance.');
        setLoading(false);
        return;
      }

      setAccessRecord(data);
      setLoading(false);

      // Store token in sessionStorage for subsequent views
      sessionStorage.setItem('investor_demo_token', token);
      sessionStorage.setItem('investor_demo_access_id', data.id);

    } catch (error) {
      console.error('Error validating access:', error);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  }

  async function logView(viewType: 'customer' | 'merchant' | 'driver') {
    if (!accessRecord) return;

    try {
      await supabase.from('investor_demo_access_logs').insert({
        access_id: accessRecord.id,
        email: accessRecord.email,
        view_type: viewType,
        accessed_at: new Date().toISOString(),
        ip_address: null, // Could be captured from client if needed
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      console.error('Error logging view:', error);
      // Don't block navigation on logging errors
    }
  }

  function handleViewClick(viewType: 'customer' | 'merchant' | 'driver', path: string) {
    logView(viewType);
    navigate(path);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-12 pb-12 flex flex-col items-center">
            <Loader2 className="w-12 h-12 animate-spin text-violet-600 mb-4" />
            <p className="text-slate-600">Validating your access...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !accessRecord) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-12 pb-12 flex flex-col items-center text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <Button
              variant="outline"
              onClick={() => window.location.href = 'https://cravenusa.com'}
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const expiresAt = new Date(accessRecord.expires_at);
  const daysUntilExpiry = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 rounded-full mb-4">
            <p className="text-white font-semibold text-sm">Investor Demo Portal</p>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Welcome to Crave'n Platform
          </h1>
          {accessRecord.full_name && (
            <p className="text-xl text-slate-600 mb-2">
              Hello, {accessRecord.full_name}
            </p>
          )}
          {accessRecord.organization && (
            <p className="text-lg text-slate-500">
              {accessRecord.organization}
            </p>
          )}
        </div>

        {/* Status Banner */}
        <Card className="mb-8 bg-white/80 backdrop-blur border-violet-200">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-semibold text-slate-900">Access Granted</p>
                  <p className="text-sm text-slate-600">{accessRecord.email}</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Valid for {daysUntilExpiry} days
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Demo Notice */}
        <Card className="mb-8 bg-amber-50/80 backdrop-blur border-amber-200">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-start gap-3">
              <Eye className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-amber-900 mb-1">Demo Environment</p>
                <p className="text-sm text-amber-800">
                  All data displayed in these demos is <strong>mock data for demonstration purposes only</strong>. 
                  It does not reflect actual platform activity, users, or transactions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* View Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Customer View */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-violet-300 cursor-pointer bg-white/80 backdrop-blur">
            <CardHeader className="pb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">Customer Experience</CardTitle>
              <CardDescription>Browse restaurants, place orders, track deliveries in real-time</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Restaurant discovery & filtering
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Menu browsing & cart management
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Live order tracking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Customer support integration
                </li>
              </ul>
              <Button
                onClick={() => handleViewClick('customer', '/investor-demo/customer')}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 group"
              >
                View Customer Demo
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          {/* Merchant View */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-blue-300 cursor-pointer bg-white/80 backdrop-blur">
            <CardHeader className="pb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Store className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">Merchant Dashboard</CardTitle>
              <CardDescription>Order management, menu configuration, business analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Real-time order management
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Menu & pricing controls
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Revenue & performance analytics
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Driver coordination
                </li>
              </ul>
              <Button
                onClick={() => handleViewClick('merchant', '/investor-demo/merchant')}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 group"
              >
                View Merchant Demo
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          {/* Driver View */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-emerald-300 cursor-pointer bg-white/80 backdrop-blur">
            <CardHeader className="pb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">Driver Mobile View</CardTitle>
              <CardDescription>Delivery interface, earnings tracker, route optimization</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Mobile-optimized interface
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Delivery queue management
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Real-time earnings tracking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Navigation integration
                </li>
              </ul>
              <Button
                onClick={() => handleViewClick('driver', '/investor-demo/driver')}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 group"
              >
                View Driver Demo
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <Card className="bg-white/60 backdrop-blur border-slate-200">
          <CardContent className="pt-6 pb-6 text-center">
            <p className="text-sm text-slate-600 mb-2">
              <strong>Questions or feedback?</strong>
            </p>
            <p className="text-sm text-slate-500">
              Contact us at{' '}
              <a href="mailto:tstroman.ceo@cravenusa.com" className="text-violet-600 hover:underline font-medium">
                tstroman.ceo@cravenusa.com
              </a>
            </p>
            <hr className="my-4 border-slate-200" />
            <p className="text-xs text-slate-400">
              Crave'n Inc. • Confidential • For Investor Use Only
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


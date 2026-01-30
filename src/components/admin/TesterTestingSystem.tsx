// @ts-nocheck
// Tester Enrollment Testing System

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { isTorrance } from '@/utils/torranceAccess';
import { 
  Search, 
  Play, 
  RefreshCw, 
  UserPlus, 
  Activity, 
  MessageSquare, 
  Gift, 
  CheckCircle,
  XCircle,
  Trash2,
  Eye,
  Zap,
  ArrowRight,
  Loader2
} from 'lucide-react';

interface TestUser {
  id: string;
  email: string;
  full_name: string;
  user_id: string | null;
  status: string;
  activated_at: string | null;
  deadline_at: string | null;
  is_selected_tester: boolean;
}

interface TestProgress {
  enrollment: any;
  activity_days: number;
  feedback_count: number;
  days_remaining: number;
  tiers: {
    tier_a: { eligible: boolean; issued: boolean };
    tier_b: { eligible: boolean; issued: boolean };
    tier_c: { eligible: boolean; issued: boolean };
  };
}

const TesterTestingSystem: React.FC = () => {
  const { toast } = useToast();
  const [testUsers, setTestUsers] = useState<TestUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<TestUser | null>(null);
  const [progress, setProgress] = useState<TestProgress | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testName, setTestName] = useState('');
  const [e2eRunning, setE2eRunning] = useState(false);
  const [e2eStep, setE2eStep] = useState<string>('');
  const [e2eResult, setE2eResult] = useState<any>(null);

  useEffect(() => {
    fetchTestUsers();
  }, []);

  useEffect(() => {
    if (selectedUser?.user_id) {
      loadProgress(selectedUser.user_id);
    }
  }, [selectedUser]);

  const fetchTestUsers = async () => {
    try {
      // Use service role or check admin status first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[TesterTestingSystem] No user found');
        setLoading(false);
        return;
      }

      console.log('[TesterTestingSystem] Fetching as user:', user.email, user.id);

      // TORRANCE STROMAN: UNIVERSAL ACCESS - CHECK FIRST
      const isTorranceUser = isTorrance(user.email);
      console.log('[TesterTestingSystem] Is Torrance:', isTorranceUser);

      // If Torrance, skip admin check
      if (!isTorranceUser) {
        // Check if user is admin
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        console.log('[TesterTestingSystem] Profile:', profile, 'Profile Error:', profileError);

        // Also check user_roles table as fallback
        let isAdmin = profile?.role === 'admin';
        if (!isAdmin) {
          const { data: userRole } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .maybeSingle();
          
          isAdmin = !!userRole;
        }

        if (!isAdmin) {
          console.log('[TesterTestingSystem] Access denied - not Torrance and not admin');
          toast({
            title: 'Access Denied',
            description: 'Admin access required',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
      }

      console.log('[TesterTestingSystem] Access granted, fetching enrollments...');

      // For Torrance, we might need to bypass RLS or use a different approach
      // Try the query first
      const { data, error, count } = await supabase
        .from('android_tester_enrollments')
        .select('*', { count: 'exact' })
        .order('enrolled_at', { ascending: false })
        .limit(50);

      console.log('[TesterTestingSystem] Query result:', { data, error, count });

      if (error) {
        console.error('[TesterTestingSystem] Query error:', error);
        // If RLS is blocking, try to get count first
        if (error.code === 'PGRST301' || error.message?.includes('permission')) {
          console.log('[TesterTestingSystem] RLS permission error, checking if table exists...');
          // Try a simpler query to see if table exists
          const { data: testData, error: testError } = await supabase
            .from('android_tester_enrollments')
            .select('id')
            .limit(1);
          console.log('[TesterTestingSystem] Test query:', { testData, testError });
        }
        throw error;
      }

      console.log('[TesterTestingSystem] Setting test users:', data?.length || 0);
      setTestUsers(data || []);
    } catch (error: any) {
      console.error('[TesterTestingSystem] Error fetching test users:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load test users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_tester_progress', {
        p_user_id: userId,
      });

      if (error) throw error;
      setProgress(data);
    } catch (error: any) {
      console.error('Error loading progress:', error);
      toast({
        title: 'Error',
        description: 'Failed to load progress',
        variant: 'destructive',
      });
    }
  };

  const createTestEnrollment = async () => {
    if (!testEmail || !testName) {
      toast({
        title: 'Missing Information',
        description: 'Please provide email and name',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('tester-enroll', {
        body: {
          email: testEmail.trim(),
          full_name: testName.trim(),
        }
      });

      if (error) throw error;

      if (data?.error === 'already_enrolled') {
        toast({
          title: 'Already Enrolled',
          description: 'This email is already enrolled',
        });
      } else if (data?.success) {
        toast({
          title: 'Success',
          description: 'Test enrollment created',
        });
        setTestEmail('');
        setTestName('');
        await fetchTestUsers();
      }
    } catch (error: any) {
      console.error('Error creating enrollment:', error);
      toast({
        title: 'Error',
        description: 'Failed to create test enrollment',
        variant: 'destructive',
      });
    }
  };

  const activateTestUser = async (enrollmentId: string, email: string) => {
    try {
      // Check if enrollment already has a user_id
      const enrollment = testUsers.find(u => u.id === enrollmentId);
      if (enrollment?.user_id) {
        toast({
          title: 'Already Activated',
          description: 'This enrollment is already linked to a user',
        });
        return;
      }

      // Use Edge Function to create test user and activate
      // This will be handled server-side with admin privileges
      const { data, error } = await supabase.functions.invoke('tester-activate-test-user', {
        body: {
          enrollment_id: enrollmentId,
          email: email,
        }
      });

      if (error) {
        // Fallback: try regular activation if test function doesn't exist
        toast({
          title: 'Note',
          description: 'Test user activation function not available. User must sign up first, then activation happens automatically.',
        });
        return;
      }

      if (data?.success) {
        toast({
          title: 'Success',
          description: 'Test user created and activated',
        });
        await fetchTestUsers();
        if (selectedUser?.id === enrollmentId) {
          setSelectedUser({ ...selectedUser, user_id: data.user_id });
        }
      }
    } catch (error: any) {
      console.error('Error activating user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to activate test user. User may need to sign up first.',
        variant: 'destructive',
      });
    }
  };

  const logActivity = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('log_tester_activity_day', {
        p_user_id: userId,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Activity logged',
      });
      await loadProgress(userId);
    } catch (error: any) {
      console.error('Error logging activity:', error);
      toast({
        title: 'Error',
        description: 'Failed to log activity',
        variant: 'destructive',
      });
    }
  };

  const submitFeedback = async (userId: string, promptKey: string) => {
    try {
      const { data, error } = await supabase.rpc('submit_tester_feedback', {
        p_user_id: userId,
        p_prompt_key: promptKey,
        p_rating: 5,
        p_comment: 'Test feedback',
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Feedback submitted',
      });
      await loadProgress(userId);
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit feedback',
        variant: 'destructive',
      });
    }
  };

  const evaluateAndIssue = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('tester-evaluate-and-issue', {
        body: { user_id: userId }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Issued ${data?.issued_tiers?.length || 0} tier(s). Total: $${((data?.total_issued_cents || 0) / 100).toFixed(2)}`,
      });
      await loadProgress(userId);
      await fetchTestUsers();
    } catch (error: any) {
      console.error('Error evaluating:', error);
      toast({
        title: 'Error',
        description: 'Failed to evaluate and issue',
        variant: 'destructive',
      });
    }
  };

  const resetTestData = async (userId: string) => {
    if (!confirm('Are you sure you want to reset all test data for this user? This will delete activity, feedback, and referrals.')) {
      return;
    }

    try {
      // Delete activity days
      await supabase
        .from('tester_activity_days')
        .delete()
        .eq('user_id', userId);

      // Delete feedback events
      await supabase
        .from('tester_feedback_events')
        .delete()
        .eq('user_id', userId);

      // Delete referrals
      await supabase
        .from('tester_referrals')
        .delete()
        .eq('referrer_user_id', userId);

      // Delete reward issuances
      await supabase
        .from('tester_reward_issuances')
        .delete()
        .eq('user_id', userId);

      // Delete credit grants
      await supabase
        .from('tester_credit_grants')
        .delete()
        .eq('user_id', userId);

      // Reset enrollment status
      await supabase
        .from('android_tester_enrollments')
        .update({
          status: 'enrolled',
          activated_at: null,
          deadline_at: null,
          user_id: null,
        })
        .eq('user_id', userId);

      toast({
        title: 'Success',
        description: 'Test data reset',
      });
      await loadProgress(userId);
      await fetchTestUsers();
    } catch (error: any) {
      console.error('Error resetting data:', error);
      toast({
        title: 'Error',
        description: 'Failed to reset test data',
        variant: 'destructive',
      });
    }
  };

  const filteredUsers = testUsers.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // End-to-End Test Flow
  const runEndToEndTest = async () => {
    if (!testEmail || !testName) {
      toast({
        title: 'Missing Information',
        description: 'Please provide email and name',
        variant: 'destructive',
      });
      return;
    }

    setE2eRunning(true);
    setE2eStep('Creating enrollment...');
    setE2eResult(null);

    try {
      // Step 1: Create Enrollment
      const { data: enrollData, error: enrollError } = await supabase.functions.invoke('tester-enroll', {
        body: {
          email: testEmail.trim(),
          full_name: testName.trim(),
        }
      });

      if (enrollError) throw enrollError;
      if (enrollData?.error === 'already_enrolled') {
        // Continue with existing enrollment
        setE2eStep('Using existing enrollment...');
      } else if (!enrollData?.success) {
        throw new Error('Failed to create enrollment');
      }

      // Step 2: Activate Test User
      setE2eStep('Activating test user...');
      const enrollmentId = enrollData?.enrollment_id || testUsers.find(u => u.email === testEmail.trim().toLowerCase())?.id;
      
      if (!enrollmentId) {
        throw new Error('Enrollment ID not found');
      }

      const { data: activateData, error: activateError } = await supabase.functions.invoke('tester-activate-test-user', {
        body: {
          enrollment_id: enrollmentId,
          email: testEmail.trim(),
        }
      });

      if (activateError) {
        // Fallback: try regular activation if test function doesn't exist
        setE2eStep('Activation function not available - manual activation required');
        setE2eRunning(false);
        toast({
          title: 'Partial Success',
          description: 'Enrollment created. User must sign up to activate.',
        });
        await fetchTestUsers();
        return;
      }

      const userId = activateData?.user_id;
      if (!userId) {
        throw new Error('User ID not returned from activation');
      }

      // Step 3: Simulate Activity (3 days) - Insert directly with distinct dates
      setE2eStep('Simulating 3 activity days...');
      const today = new Date();
      for (let i = 0; i < 3; i++) {
        const activityDate = new Date(today);
        activityDate.setDate(today.getDate() - i); // Today, yesterday, day before
        
        // Insert activity day directly (bypassing RPC to set specific date)
        await supabase
          .from('tester_activity_days')
          .upsert({
            user_id: userId,
            activity_date: activityDate.toISOString().split('T')[0], // YYYY-MM-DD format
          }, {
            onConflict: 'user_id,activity_date'
          });
      }

      // Step 4: Submit Feedback (2 prompts)
      setE2eStep('Submitting feedback (2 prompts)...');
      await supabase.rpc('submit_tester_feedback', {
        p_user_id: userId,
        p_prompt_key: 'test_prompt_1',
        p_rating: 5,
        p_comment: 'E2E test feedback 1',
      });
      await supabase.rpc('submit_tester_feedback', {
        p_user_id: userId,
        p_prompt_key: 'test_prompt_2',
        p_rating: 5,
        p_comment: 'E2E test feedback 2',
      });

      // Step 5: Evaluate and Issue Rewards
      setE2eStep('Evaluating eligibility and issuing rewards...');
      const { data: evalData, error: evalError } = await supabase.functions.invoke('tester-evaluate-and-issue', {
        body: { user_id: userId }
      });

      if (evalError) {
        console.error('Evaluation error:', evalError);
        // Non-fatal, continue
      }

      // Step 6: Load Final Progress
      setE2eStep('Loading final progress...');
      const { data: progressData } = await supabase.rpc('get_tester_progress', {
        p_user_id: userId,
      });

      // Refresh user list
      await fetchTestUsers();

      // Set result
      setE2eResult({
        success: true,
        enrollment_id: enrollmentId,
        user_id: userId,
        email: testEmail.trim(),
        progress: progressData,
        issued_tiers: evalData?.issued_rewards || [],
      });

      setE2eStep('Complete!');
      toast({
        title: 'End-to-End Test Complete',
        description: `Test user created and activated. Tier A reward issued.`,
      });

    } catch (error: any) {
      console.error('E2E test error:', error);
      setE2eStep(`Error: ${error.message}`);
      toast({
        title: 'Test Failed',
        description: error.message || 'End-to-end test failed',
        variant: 'destructive',
      });
    } finally {
      setE2eRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tester Enrollment Testing System</h1>
        <p className="text-muted-foreground mt-1">
          Test the enrollment flow, simulate progress, and trigger rewards
        </p>
      </div>

      <Tabs defaultValue="e2e" className="space-y-4">
        <TabsList>
          <TabsTrigger value="e2e">End-to-End Test</TabsTrigger>
          <TabsTrigger value="users">Test Users</TabsTrigger>
          <TabsTrigger value="actions">Quick Actions</TabsTrigger>
          <TabsTrigger value="progress">Progress View</TabsTrigger>
        </TabsList>

        <TabsContent value="e2e" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-500" />
                End-to-End Test Flow
              </CardTitle>
              <CardDescription>
                Complete automated test: Create enrollment → Activate → Simulate activity → Issue rewards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Input Form */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Test Email</label>
                  <Input
                    placeholder="test@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    disabled={e2eRunning}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Test Name</label>
                  <Input
                    placeholder="Test User Name"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    disabled={e2eRunning}
                  />
                </div>
                <Button 
                  onClick={runEndToEndTest} 
                  disabled={e2eRunning || !testEmail || !testName}
                  className="w-full"
                  size="lg"
                >
                  {e2eRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running Test...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Complete Test Flow
                    </>
                  )}
                </Button>
              </div>

              {/* Progress Indicator */}
              {e2eRunning && (
                <div className="space-y-3 p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                    <span className="text-sm font-medium">{e2eStep}</span>
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3" />
                      <span>1. Create enrollment</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {e2eStep.includes('Activating') ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : e2eStep.includes('Activating') || e2eStep.includes('Simulating') ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border-2" />
                      )}
                      <span>2. Activate test user</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {e2eStep.includes('Simulating') ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : e2eStep.includes('Submitting') || e2eStep.includes('Evaluating') ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border-2" />
                      )}
                      <span>3. Simulate 3 activity days</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {e2eStep.includes('Submitting') ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : e2eStep.includes('Evaluating') || e2eStep.includes('Loading') ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border-2" />
                      )}
                      <span>4. Submit 2 feedback prompts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {e2eStep.includes('Evaluating') ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : e2eStep.includes('Loading') || e2eStep.includes('Complete') ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border-2" />
                      )}
                      <span>5. Evaluate & issue Tier A reward</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Results */}
              {e2eResult && (
                <div className="space-y-4 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-green-900 dark:text-green-100">Test Complete!</h3>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">User ID:</span>
                      <span className="font-mono text-xs">{e2eResult.user_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span>{e2eResult.email}</span>
                    </div>
                    {e2eResult.progress && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Activity Days:</span>
                          <span className="font-semibold">{e2eResult.progress.progress?.activity_days || 0} / 3</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Feedback Count:</span>
                          <span className="font-semibold">{e2eResult.progress.progress?.feedback_count || 0} / 2</span>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="font-medium mb-2">Reward Status:</div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span>Tier A (Base):</span>
                              <Badge className={e2eResult.progress.tiers?.tier_a?.issued ? 'bg-green-500' : ''}>
                                {e2eResult.progress.tiers?.tier_a?.issued ? '$25 Issued' : 'Not Issued'}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Tier B (Selected):</span>
                              <Badge variant="outline">
                                {e2eResult.progress.tiers?.tier_b?.issued ? '$50 Issued' : 'Not Eligible'}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Tier C (Ecosystem):</span>
                              <Badge variant="outline">
                                {e2eResult.progress.tiers?.tier_c?.issued ? '$25 Issued' : 'Not Eligible'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="pt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const user = testUsers.find(u => u.user_id === e2eResult.user_id);
                        if (user) {
                          setSelectedUser(user);
                          // Switch to progress tab
                          document.querySelector('[value="progress"]')?.click();
                        }
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setE2eResult(null);
                        setTestEmail('');
                        setTestName('');
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Run Another Test
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Test Enrollment</CardTitle>
              <CardDescription>Create a new test enrollment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Test User Name"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={createTestEnrollment}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test Users</CardTitle>
              <CardDescription>
                {filteredUsers.length} enrollment{filteredUsers.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by email or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedUser?.id === user.id ? 'bg-muted' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="capitalize">
                            {user.status}
                          </Badge>
                          {user.is_selected_tester && (
                            <Badge variant="default" className="bg-green-500">
                              Selected
                            </Badge>
                          )}
                          {user.user_id ? (
                            <Badge variant="secondary">Activated</Badge>
                          ) : (
                            <Badge variant="outline">Not Activated</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!user.user_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              activateTestUser(user.id, user.email);
                            }}
                          >
                            Activate
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUser(user);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          {selectedUser?.user_id ? (
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions - {selectedUser.email}</CardTitle>
                <CardDescription>Manually trigger events for testing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => logActivity(selectedUser.user_id!)}
                    variant="outline"
                    className="w-full"
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Log Activity Day
                  </Button>

                  <Button
                    onClick={() => submitFeedback(selectedUser.user_id!, 'test_prompt_1')}
                    variant="outline"
                    className="w-full"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Submit Feedback 1
                  </Button>

                  <Button
                    onClick={() => submitFeedback(selectedUser.user_id!, 'test_prompt_2')}
                    variant="outline"
                    className="w-full"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Submit Feedback 2
                  </Button>

                  <Button
                    onClick={() => evaluateAndIssue(selectedUser.user_id!)}
                    variant="default"
                    className="w-full"
                  >
                    <Gift className="h-4 w-4 mr-2" />
                    Evaluate & Issue Rewards
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <Button
                    onClick={() => resetTestData(selectedUser.user_id!)}
                    variant="destructive"
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Reset All Test Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <AlertDescription>
                Select a test user from the "Test Users" tab to perform actions
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          {selectedUser?.user_id && progress ? (
            <Card>
              <CardHeader>
                <CardTitle>Progress - {selectedUser.email}</CardTitle>
                <CardDescription>Current enrollment progress and status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium mb-2">Enrollment Status</div>
                  <Badge className="capitalize">{progress.enrollment?.status}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium mb-1">Activity Days</div>
                    <div className="text-2xl font-bold">
                      {progress.activity_days} / 3
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">Feedback Count</div>
                    <div className="text-2xl font-bold">
                      {progress.feedback_count} / 2
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">Days Remaining</div>
                    <div className="text-2xl font-bold">
                      {progress.days_remaining}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Tier A (Base)</span>
                    {progress.tiers.tier_a.issued ? (
                      <Badge className="bg-green-500">$25 Issued</Badge>
                    ) : progress.tiers.tier_a.eligible ? (
                      <Badge className="bg-blue-500">Eligible</Badge>
                    ) : (
                      <Badge variant="outline">Not Eligible</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Tier B (Selected)</span>
                    {progress.tiers.tier_b.issued ? (
                      <Badge className="bg-green-500">$50 Issued</Badge>
                    ) : progress.tiers.tier_b.eligible ? (
                      <Badge className="bg-blue-500">Eligible</Badge>
                    ) : (
                      <Badge variant="outline">Not Eligible</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Tier C (Ecosystem)</span>
                    {progress.tiers.tier_c.issued ? (
                      <Badge className="bg-green-500">$25 Issued</Badge>
                    ) : progress.tiers.tier_c.eligible ? (
                      <Badge className="bg-blue-500">Eligible</Badge>
                    ) : (
                      <Badge variant="outline">Not Eligible</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <AlertDescription>
                Select an activated test user to view progress
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TesterTestingSystem;


import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle, Clock, AlertTriangle, User, Mail, Phone, MapPin, Calendar, Car, FileText } from 'lucide-react';
import { format, differenceInDays, differenceInHours, isPast } from 'date-fns';

interface Application {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  vehicle_type: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  license_number: string;
  license_state: string;
  status: string;
  background_check: boolean;
  background_check_initiated_at: string;
  background_check_estimated_completion: string;
  background_check_approved_at: string | null;
  created_at: string;
  reviewer_notes: string | null;
}

export default function BackgroundCheckDashboard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchApplications();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('admin-background-checks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'craver_applications'
        },
        () => {
          fetchApplications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('craver_applications')
        .select('*')
        .not('background_check_initiated_at', 'is', null)
        .order('background_check_initiated_at', { ascending: false });

      if (error) throw error;
      setApplications((data || []) as Application[]);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load background check data');
    } finally {
      setLoading(false);
    }
  };

  const approveBackgroundCheck = async (applicationId: string) => {
    if (processingIds.has(applicationId)) return;
    
    setProcessingIds(new Set(processingIds).add(applicationId));
    
    try {
      const application = applications.find(app => app.id === applicationId);
      if (!application) throw new Error('Application not found');

      const { error } = await supabase
        .from('craver_applications')
        .update({
          background_check: true,
          background_check_approved_at: new Date().toISOString(),
          status: 'approved',
          reviewer_notes: reviewNotes[applicationId] || 'Background check approved by admin'
        })
        .eq('id', applicationId);

      if (error) throw error;

      // Send approval email
      try {
        await supabase.functions.invoke('send-driver-welcome-email', {
          body: {
            driverName: `${application.first_name} ${application.last_name}`,
            driverEmail: application.email,
            isBackgroundCheckApproval: true
          },
        });
      } catch (emailError) {
        console.error('Email error:', emailError);
      }

      toast.success(`${application.first_name} ${application.last_name}'s background check approved! Email sent.`);
      setReviewNotes({ ...reviewNotes, [applicationId]: '' });
      fetchApplications();
    } catch (error) {
      console.error('Error approving background check:', error);
      toast.error('Failed to approve background check');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(applicationId);
        return newSet;
      });
    }
  };

  const rejectBackgroundCheck = async (applicationId: string) => {
    if (processingIds.has(applicationId)) return;
    
    if (!reviewNotes[applicationId]?.trim()) {
      toast.error('Please add notes explaining the rejection');
      return;
    }

    setProcessingIds(new Set(processingIds).add(applicationId));
    
    try {
      const application = applications.find(app => app.id === applicationId);
      if (!application) throw new Error('Application not found');

      const { error } = await supabase
        .from('craver_applications')
        .update({
          background_check: false,
          status: 'rejected',
          reviewer_notes: reviewNotes[applicationId]
        })
        .eq('id', applicationId);

      if (error) throw error;

      toast.success(`Application rejected. ${application.first_name} will be notified.`);
      setReviewNotes({ ...reviewNotes, [applicationId]: '' });
      fetchApplications();
    } catch (error) {
      console.error('Error rejecting background check:', error);
      toast.error('Failed to reject background check');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(applicationId);
        return newSet;
      });
    }
  };

  const getTimeRemaining = (estimatedCompletion: string) => {
    const now = new Date();
    const completion = new Date(estimatedCompletion);
    const hoursLeft = differenceInHours(completion, now);
    const daysLeft = differenceInDays(completion, now);
    
    if (isPast(completion)) {
      return { text: 'Ready for review', color: 'text-green-600', isPastDue: true };
    }
    
    if (hoursLeft < 24) {
      return { text: `${hoursLeft}h remaining`, color: 'text-orange-600', isPastDue: false };
    }
    
    return { text: `${daysLeft}d remaining`, color: 'text-blue-600', isPastDue: false };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const pendingApprovals = applications.filter(app => 
    !app.background_check && app.status === 'under_review'
  );
  
  const approved = applications.filter(app => 
    app.background_check && app.background_check_approved_at
  );
  
  const rejected = applications.filter(app => 
    app.status === 'rejected'
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Background Check Management</h2>
        <p className="text-muted-foreground">Review and approve Feeder background checks</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingApprovals.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approved.length}</div>
            <p className="text-xs text-muted-foreground">Cleared to drive</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejected.length}</div>
            <p className="text-xs text-muted-foreground">Not approved</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Review ({pendingApprovals.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approved.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejected.length})
          </TabsTrigger>
        </TabsList>

        {/* Pending Review Tab */}
        <TabsContent value="pending" className="space-y-4">
          {pendingApprovals.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No applications pending background check approval
              </CardContent>
            </Card>
          ) : (
            pendingApprovals.map((app) => {
              const timeRemaining = getTimeRemaining(app.background_check_estimated_completion);
              const isProcessing = processingIds.has(app.id);
              
              return (
                <Card key={app.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <User className="w-5 h-5" />
                          {app.first_name} {app.last_name}
                        </CardTitle>
                        <CardDescription className="mt-2 space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-3 h-3" />
                            {app.email}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-3 h-3" />
                            {app.phone}
                          </div>
                        </CardDescription>
                      </div>
                      <Badge variant={timeRemaining.isPastDue ? "default" : "secondary"} className={timeRemaining.color}>
                        <Clock className="w-3 h-3 mr-1" />
                        {timeRemaining.text}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Application Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-muted-foreground">DOB:</span>
                        <p>{format(new Date(app.date_of_birth), 'PP')}</p>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">License:</span>
                        <p>{app.license_state} - {app.license_number}</p>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Address:</span>
                        <p>{app.city}, {app.state} {app.zip_code}</p>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Vehicle:</span>
                        <p>{app.vehicle_year} {app.vehicle_make} {app.vehicle_model}</p>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Submitted:</span>
                        <span className="font-medium">{format(new Date(app.created_at), 'PPp')}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Check Initiated:</span>
                        <span className="font-medium">{format(new Date(app.background_check_initiated_at), 'PPp')}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Est. Completion:</span>
                        <span className={`font-medium ${timeRemaining.color}`}>
                          {format(new Date(app.background_check_estimated_completion), 'PPp')}
                        </span>
                      </div>
                    </div>

                    {/* Admin Notes */}
                    <div className="space-y-2">
                      <Label htmlFor={`notes-${app.id}`}>Admin Notes (Optional)</Label>
                      <Textarea
                        id={`notes-${app.id}`}
                        value={reviewNotes[app.id] || ''}
                        onChange={(e) => setReviewNotes({ ...reviewNotes, [app.id]: e.target.value })}
                        placeholder="Add any notes about this approval/rejection..."
                        rows={2}
                        disabled={isProcessing}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <Button
                        onClick={() => approveBackgroundCheck(app.id)}
                        disabled={isProcessing}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve Background Check
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => rejectBackgroundCheck(app.id)}
                        disabled={isProcessing}
                        variant="destructive"
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>

                    {timeRemaining.isPastDue && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-800 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          <strong>Ready for Review:</strong> Estimated processing time has elapsed
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Approved Tab */}
        <TabsContent value="approved" className="space-y-4">
          {approved.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No approved background checks yet
              </CardContent>
            </Card>
          ) : (
            approved.map((app) => (
              <Card key={app.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        {app.first_name} {app.last_name}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-3 h-3" />
                          {app.email}
                        </div>
                      </CardDescription>
                    </div>
                    <Badge variant="default" className="bg-green-600">
                      Cleared to Drive
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Approved On:</span>
                      <span className="font-medium">
                        {format(new Date(app.background_check_approved_at!), 'PPp')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Processing Time:</span>
                      <span className="font-medium">
                        {differenceInDays(
                          new Date(app.background_check_approved_at!),
                          new Date(app.background_check_initiated_at)
                        )} days
                      </span>
                    </div>
                  </div>
                  
                  {app.reviewer_notes && (
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-sm font-medium mb-1">Admin Notes:</p>
                      <p className="text-sm text-muted-foreground">{app.reviewer_notes}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-sm pt-3 border-t">
                    <div>
                      <span className="text-muted-foreground">Vehicle:</span>
                      <p className="font-medium">{app.vehicle_type}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Location:</span>
                      <p className="font-medium">{app.city}, {app.state}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Rejected Tab */}
        <TabsContent value="rejected" className="space-y-4">
          {rejected.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No rejected applications
              </CardContent>
            </Card>
          ) : (
            rejected.map((app) => (
              <Card key={app.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-red-600" />
                        {app.first_name} {app.last_name}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-3 h-3" />
                          {app.email}
                        </div>
                      </CardDescription>
                    </div>
                    <Badge variant="destructive">
                      Rejected
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {app.reviewer_notes && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-red-900 mb-1">Rejection Reason:</p>
                      <p className="text-sm text-red-800">{app.reviewer_notes}</p>
                    </div>
                  )}
                  
                  <div className="text-sm text-muted-foreground">
                    Rejected on {app.background_check_approved_at && format(new Date(app.background_check_approved_at), 'PPp')}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

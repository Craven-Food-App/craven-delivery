// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ApplicationCard from './ApplicationCard';
import DocumentViewer from './DocumentViewer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, CheckCircle, XCircle } from 'lucide-react';
import { logApplicationAction } from '@/utils/auditLogger';

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
  vehicle_color: string;
  license_plate: string;
  drivers_license: string;
  insurance_policy: string;
  insurance_provider: string;
  background_check: boolean;
  vehicle_inspection: boolean;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  profile_photo?: string;
}

const ApplicationReview: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentViewer, setDocumentViewer] = useState<{
    isOpen: boolean;
    documentPath: string;
    documentName: string;
  }>({
    isOpen: false,
    documentPath: '',
    documentName: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchApplications();

    // Set up realtime subscription
    const channel = supabase
      .channel('admin-applications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'craver_applications'
        },
        (payload) => {
          console.log('Application change:', payload);
          fetchApplications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const fixJahnieceLocation = async () => {
      try {
        const { data: jahniece, error } = await supabase
          .from('craver_applications')
          .select('id, city, state')
          .ilike('first_name', 'Jahniece')
          .ilike('last_name', 'Regester')
          .maybeSingle();

        if (error) {
          console.warn('Lookup for Jahniece failed:', error);
          return;
        }

        if (jahniece && (jahniece.city !== 'New York' || jahniece.state !== 'NY')) {
          const { error: updateError } = await supabase
            .from('craver_applications')
            .update({ city: 'New York', state: 'NY' })
            .eq('id', jahniece.id);

          if (!updateError) {
            fetchApplications();
            toast({ title: 'Location corrected', description: 'Updated Jahniece Regester to New York, NY.' });
          }
        }
      } catch (e) {
        console.error('Error correcting Jahniece location:', e);
      }
    };

    fixJahnieceLocation();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('craver_applications')
        .select(`
          *,
          driver_onboarding_progress!driver_onboarding_progress_application_id_fkey (
            onboarding_completed_at,
            current_step
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setApplications((data || []) as any);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: "Error",
        description: "Failed to load applications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveBackgroundCheck = async (applicationId: string, notes: string = '') => {
    try {
      const application = applications.find(app => app.id === applicationId);
      if (!application) throw new Error('Application not found');

      const { error } = await supabase
        .from('craver_applications')
        .update({
          background_check: true,
          background_check_approved_at: new Date().toISOString(),
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewer_notes: notes || 'Background check approved by admin'
        })
        .eq('id', applicationId);

      if (error) {
        throw error;
      }

      // Send background check approval email
      try {
        const { error: emailError } = await supabase.functions.invoke('send-driver-welcome-email', {
          body: {
            driverName: `${application.first_name} ${application.last_name}`,
            driverEmail: application.email,
            isBackgroundCheckApproval: true
          },
        });

        if (emailError) {
          console.error('Error sending approval email:', emailError);
          toast({
            title: "Background Check Approved",
            description: "Approved successfully, but email notification failed to send.",
            variant: "default",
          });
        } else {
          toast({
            title: "Background Check Approved ✅",
            description: `${application.first_name} has been cleared to drive and notified via email.`,
          });
        }
      } catch (emailError) {
        console.error('Error sending approval email:', emailError);
        toast({
          title: "Background Check Approved",
          description: "Approved successfully, but email notification failed to send.",
          variant: "default",
        });
      }

      fetchApplications();
    } catch (error) {
      console.error('Error approving background check:', error);
      toast({
        title: "Error",
        description: "Failed to approve background check",
        variant: "destructive",
      });
    }
  };

  const handleApprove = async (applicationId: string, notes: string) => {
    // This now just calls the background check approval
    await handleApproveBackgroundCheck(applicationId, notes);
  };

  const handleSendApprovalEmail = async (applicationId: string) => {
    try {
      const application = applications.find(app => app.id === applicationId);
      if (!application) throw new Error('Application not found');

      const { error: emailError } = await supabase.functions.invoke('send-approval-email', {
        body: {
          driverName: `${application.first_name} ${application.last_name}`,
          driverEmail: application.email,
          applicationId: applicationId,
        },
      });

      if (emailError) {
        throw emailError;
      }

      toast({
        title: "Email Sent",
        description: "Approval email has been sent to the driver.",
      });
    } catch (error) {
      console.error('Error sending approval email:', error);
      toast({
        title: "Error",
        description: "Failed to send approval email",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (applicationId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('craver_applications')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewer_notes: notes
        })
        .eq('id', applicationId);

      if (error) {
        throw error;
      }

      toast({
        title: "Application Rejected",
        description: "The Feeder application has been rejected.",
        variant: "destructive",
      });

      fetchApplications();
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast({
        title: "Error",
        description: "Failed to reject application",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (applicationId: string) => {
    try {
      const application = applications.find(app => app.id === applicationId);
      if (!application) throw new Error('Application not found');

      const { error } = await supabase
        .from('craver_applications')
        .delete()
        .eq('id', applicationId);

      if (error) {
        throw error;
      }

      // Log audit trail
      await logApplicationAction(
        'delete',
        applicationId,
        `${application.first_name} ${application.last_name}`,
        {
          email: application.email,
          status: application.status,
          vehicle_type: application.vehicle_type,
        }
      );

      toast({
        title: "Application Deleted",
        description: `Application for ${application.first_name} ${application.last_name} has been permanently deleted.`,
        variant: "default",
      });

      fetchApplications();
    } catch (error) {
      console.error('Error deleting application:', error);
      toast({
        title: "Error",
        description: "Failed to delete application",
        variant: "destructive",
      });
    }
  };

  const handleViewDocument = (documentPath: string, documentName: string) => {
    setDocumentViewer({
      isOpen: true,
      documentPath,
      documentName
    });
  };

  const closeDocumentViewer = () => {
    setDocumentViewer({
      isOpen: false,
      documentPath: '',
      documentName: ''
    });
  };

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const approvedApplications = applications.filter(app => app.status === 'approved');
  const rejectedApplications = applications.filter(app => app.status === 'rejected');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Feeder Applications</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{applications.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingApplications.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedApplications.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejectedApplications.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Applications Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="relative">
            Pending Review
            {pendingApplications.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingApplications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedApplications.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedApplications.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All Applications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {pendingApplications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending applications to review
                </div>
              ) : (
                pendingApplications.map((application) => (
                  <ApplicationCard
                    key={application.id}
                    application={application}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onDelete={handleDelete}
                    onViewDocument={handleViewDocument}
                    onSendApprovalEmail={handleSendApprovalEmail}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="approved">
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {approvedApplications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No approved applications yet
                </div>
              ) : (
                approvedApplications.map((application) => (
                  <ApplicationCard
                    key={application.id}
                    application={application}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onDelete={handleDelete}
                    onViewDocument={handleViewDocument}
                    onSendApprovalEmail={handleSendApprovalEmail}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="rejected">
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {rejectedApplications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No rejected applications
                </div>
              ) : (
                rejectedApplications.map((application) => (
                  <ApplicationCard
                    key={application.id}
                    application={application}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onDelete={handleDelete}
                    onViewDocument={handleViewDocument}
                    onSendApprovalEmail={handleSendApprovalEmail}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="all">
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {applications.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onDelete={handleDelete}
                  onViewDocument={handleViewDocument}
                  onSendApprovalEmail={handleSendApprovalEmail}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Document Viewer */}
      <DocumentViewer
        isOpen={documentViewer.isOpen}
        onClose={closeDocumentViewer}
        documentPath={documentViewer.documentPath}
        documentName={documentViewer.documentName}
      />
    </div>
  );
};

export default ApplicationReview;
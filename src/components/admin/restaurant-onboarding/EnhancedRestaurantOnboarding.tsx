import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { RestaurantOnboardingData } from './types';
import { StatsOverview } from './components/StatsOverview';
import { ListView } from './views/ListView';
import { AnalyticsDashboard } from './analytics/AnalyticsDashboard';
import { KanbanView } from './views/KanbanView';
import { ExportButton } from './components/ExportButton';
import { ActivityLog } from './components/ActivityLog';
import { EmailTemplates } from './components/EmailTemplates';
import { TeamAssignment } from './components/TeamAssignment';
import { SLATracking } from './components/SLATracking';
import { calculateStats } from './utils/helpers';
import { logActivity, ActivityActionTypes } from './utils/activityLogger';
// Enterprise components
import { EnterpriseDataGrid } from '../restaurant-onboarding-enterprise/data-grid';
import { ExecutiveDashboard } from '../restaurant-onboarding-enterprise/dashboard';
import { MenuPreparationManager } from '../restaurant-onboarding-enterprise/menu-preparation';
import { EnhancedDocumentVerificationPanel } from '../restaurant-onboarding-enterprise/document-verification';

export function EnhancedRestaurantOnboarding() {
  const [restaurants, setRestaurants] = useState<RestaurantOnboardingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantOnboardingData | null>(null);
  const [isVerificationPanelOpen, setIsVerificationPanelOpen] = useState(false);
  const [selectedRestaurantIds, setSelectedRestaurantIds] = useState<string[]>([]);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);

    try {
      const { data, error } = await supabase
        .from('restaurant_onboarding_progress')
        .select(`
          *,
          restaurant:restaurants!inner(
            id,
            name,
            owner_id,
            email,
            phone,
            address,
            city,
            state,
            zip_code,
            cuisine_type,
            logo_url,
            onboarding_status,
            created_at,
            banking_complete,
            readiness_score,
            business_license_url,
            insurance_certificate_url,
            health_permit_url,
            owner_id_url,
            business_verified_at,
            verification_notes,
            restaurant_type,
            expected_monthly_orders,
            description
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our type
      const transformed = (data || []).map(item => ({
        ...item,
        restaurant: Array.isArray(item.restaurant) ? item.restaurant[0] : item.restaurant
      })).filter(item => item.restaurant) as RestaurantOnboardingData[];

      setRestaurants(transformed);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      toast.error('Failed to load restaurants');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchRestaurants(false);
    toast.success('Refreshed restaurant list');
  };

  const handleVerifyDocuments = (restaurant: RestaurantOnboardingData) => {
    setSelectedRestaurant(restaurant);
    setIsVerificationPanelOpen(true);
  };

  // Bulk action handlers
  const handleBulkApprove = async (restaurantIds: string[], notes?: string) => {
    try {
      // Update restaurants in Supabase
      const { error } = await supabase
        .from('restaurant_onboarding')
        .update({ 
          business_info_verified: true,
          business_verified_at: new Date().toISOString(),
          admin_notes: notes || 'Bulk approved by admin'
        })
        .in('restaurant_id', restaurantIds);

      if (error) throw error;

      // Refresh data
      fetchRestaurants(false);
    } catch (error) {
      console.error('Error bulk approving restaurants:', error);
      throw error;
    }
  };

  const handleBulkReject = async (restaurantIds: string[], notes: string) => {
    try {
      // Update restaurants in Supabase
      const { error } = await supabase
        .from('restaurant_onboarding')
        .update({ 
          business_info_verified: false,
          admin_notes: notes
        })
        .in('restaurant_id', restaurantIds);

      if (error) throw error;

      // Refresh data
      fetchRestaurants(false);
    } catch (error) {
      console.error('Error bulk rejecting restaurants:', error);
      throw error;
    }
  };

  const handleBulkEmail = async (restaurantIds: string[], message: string) => {
    try {
      // Get restaurant emails
      const { data: restaurants } = await supabase
        .from('restaurants')
        .select('id, email, name')
        .in('id', restaurantIds);

      if (!restaurants) return;

      // Send emails (in real app, this would call an email service)
      console.log('Sending bulk email to:', restaurants.map(r => r.email));
      console.log('Message:', message);
      
      // Log activity for each restaurant
      for (const restaurant of restaurants) {
        await logActivity({
          restaurantId: restaurant.id,
          actionType: ActivityActionTypes.EMAIL_SENT,
          actionDescription: `Bulk email sent: ${message.substring(0, 50)}...`,
          metadata: { messagePreview: message.substring(0, 100) }
        });
      }
      
      // For now, just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error sending bulk email:', error);
      throw error;
    }
  };

  // Single email handler
  const handleSendEmail = async (restaurantId: string, subject: string, body: string) => {
    try {
      // In a real app, this would call an email service API
      // For now, we'll just log it and simulate sending
      console.log('Sending email to restaurant:', restaurantId);
      console.log('Subject:', subject);
      console.log('Body:', body);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Log the activity
      await logActivity({
        restaurantId,
        actionType: ActivityActionTypes.EMAIL_SENT,
        actionDescription: `Email sent: ${subject}`,
        metadata: { subject, bodyPreview: body.substring(0, 100) }
      });

      toast.success('Email sent successfully!');
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  };

  const handleBulkAssign = async (restaurantIds: string[], adminId: string) => {
    try {
      // Update restaurants with assigned admin
      const { error } = await supabase
        .from('restaurant_onboarding')
        .update({ 
          assigned_admin_id: adminId,
          updated_at: new Date().toISOString()
        })
        .in('restaurant_id', restaurantIds);

      if (error) throw error;

      // Refresh data
      fetchRestaurants(false);
    } catch (error) {
      console.error('Error bulk assigning restaurants:', error);
      throw error;
    }
  };

  const handleBulkStatusUpdate = async (restaurantIds: string[], status: string) => {
    try {
      // Update restaurants status
      const { error } = await supabase
        .from('restaurant_onboarding')
        .update({ 
          onboarding_status: status,
          updated_at: new Date().toISOString()
        })
        .in('restaurant_id', restaurantIds);

      if (error) throw error;

      // Refresh data
      fetchRestaurants(false);
    } catch (error) {
      console.error('Error bulk updating status:', error);
      throw error;
    }
  };

  // Kanban stage update handler
  const handleUpdateStage = async (restaurantId: string, newStage: string) => {
    try {
      // Map stage to database fields
      const updates: any = {
        updated_at: new Date().toISOString()
      };

      switch (newStage) {
        case 'documents_pending':
          // Reset to initial state
          updates.business_info_verified = false;
          updates.menu_preparation_status = 'not_started';
          updates.go_live_ready = false;
          break;
        case 'verification_pending':
          // Has documents but not verified
          updates.business_info_verified = false;
          break;
        case 'setup_in_progress':
          // Verified but setup incomplete
          updates.business_info_verified = true;
          updates.business_verified_at = new Date().toISOString();
          updates.menu_preparation_status = 'in_progress';
          break;
        case 'ready_to_launch':
          // Setup complete, ready to go live
          updates.business_info_verified = true;
          updates.menu_preparation_status = 'ready';
          updates.menu_ready_at = new Date().toISOString();
          updates.go_live_ready = false;
          break;
        case 'live':
          // Go live
          updates.business_info_verified = true;
          updates.menu_preparation_status = 'ready';
          updates.go_live_ready = true;
          break;
      }

      const { error } = await supabase
        .from('restaurant_onboarding')
        .update(updates)
        .eq('restaurant_id', restaurantId);

      if (error) throw error;

      toast.success('Restaurant stage updated successfully');
      
      // Log activity
      await logActivity({
        restaurantId,
        actionType: ActivityActionTypes.STATUS_CHANGED,
        actionDescription: `Stage changed to: ${newStage.replace(/_/g, ' ')}`,
        metadata: { newStage, previousStage: 'unknown' }
      });
      
      fetchRestaurants(false);
    } catch (error) {
      console.error('Error updating stage:', error);
      toast.error('Failed to update restaurant stage');
      throw error;
    }
  };

  const handleApprove = async (restaurantId: string, notes: string, checklistData?: any) => {
    try {
      // Get current user for audit trail
      const { data: { user } } = await supabase.auth.getUser();

      // Update the restaurants table
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({
          business_verified_at: new Date().toISOString(),
          verification_notes: {
            approved_by: user?.id,
            approved_at: new Date().toISOString(),
            notes: notes || 'Approved by admin',
          },
          onboarding_status: 'verified',
        })
        .eq('id', restaurantId);

      if (updateError) throw updateError;

      // Update the onboarding progress table
      const { error: progressError } = await supabase
        .from('restaurant_onboarding_progress')
        .update({
          business_info_verified: true,
          business_verified_at: new Date().toISOString(),
          admin_notes: notes || 'Approved by admin',
        })
        .eq('restaurant_id', restaurantId);

      if (progressError) throw progressError;

      toast.success('Restaurant verified successfully!');
      await fetchRestaurants(false);
    } catch (error) {
      console.error('Error approving restaurant:', error);
      throw error;
    }
  };

  const handleReject = async (restaurantId: string, notes: string) => {
    if (!notes.trim()) {
      toast.error('Please provide rejection notes');
      throw new Error('Notes required');
    }

    try {
      // Get current user for audit trail
      const { data: { user } } = await supabase.auth.getUser();

      // Update the restaurants table
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({
          verification_notes: {
            rejected_by: user?.id,
            rejected_at: new Date().toISOString(),
            notes: notes,
          },
          onboarding_status: 'rejected',
        })
        .eq('id', restaurantId);

      if (updateError) throw updateError;

      // Update the onboarding progress table
      const { error: progressError } = await supabase
        .from('restaurant_onboarding_progress')
        .update({
          business_info_verified: false,
          business_verified_at: null,
          admin_notes: notes,
        })
        .eq('restaurant_id', restaurantId);

      if (progressError) throw progressError;

      toast.success('Restaurant verification rejected');
      await fetchRestaurants(false);
    } catch (error) {
      console.error('Error rejecting restaurant:', error);
      throw error;
    }
  };

  const handleChat = (restaurant: RestaurantOnboardingData) => {
    // TODO: Implement chat functionality
    toast.info('Chat feature coming soon!');
  };

  const stats = calculateStats(restaurants);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading restaurants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
            Restaurant Onboarding Control Center
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage and verify merchant applications with powerful tools
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            restaurants={restaurants}
          />
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <StatsOverview stats={stats} />

      {/* Main Content */}
      <Tabs defaultValue="all" className="w-full">
        <div className="space-y-2">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="all">
              All ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="executive">
              📊 Executive
            </TabsTrigger>
            <TabsTrigger value="kanban">
              📋 Kanban
            </TabsTrigger>
            <TabsTrigger value="menu">
              🍽️ Menu Prep
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({stats.pendingReview})
            </TabsTrigger>
            <TabsTrigger value="in-progress">
              In Progress ({stats.inProgress})
            </TabsTrigger>
            <TabsTrigger value="ready">
              Ready ({stats.readyToLaunch})
            </TabsTrigger>
          </TabsList>
          
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="live">
              Live ({stats.live})
            </TabsTrigger>
            <TabsTrigger value="analytics">
              📊 Analytics
            </TabsTrigger>
            <TabsTrigger value="emails">
              📧 Email Templates
            </TabsTrigger>
            <TabsTrigger value="team">
              👥 Team
            </TabsTrigger>
            <TabsTrigger value="sla">
              ⏱️ SLA Tracking
            </TabsTrigger>
          </TabsList>
          
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="activity">
              🕐 Activity Log
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="mt-6">
          <EnterpriseDataGrid
            data={restaurants}
            onRowClick={handleVerifyDocuments}
            selectedIds={selectedRestaurantIds}
            onSelectionChange={setSelectedRestaurantIds}
          />
          {selectedRestaurantIds.length > 0 && (
            <div className="mt-4 flex items-center gap-2 p-4 bg-muted rounded-lg">
              <span className="text-sm font-medium">{selectedRestaurantIds.length} selected</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkApprove(selectedRestaurantIds)}
              >
                Approve Selected
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkReject(selectedRestaurantIds, 'Bulk rejected')}
              >
                Reject Selected
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRestaurantIds([])}
              >
                Clear Selection
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="executive" className="mt-6">
          <ExecutiveDashboard restaurants={restaurants} />
        </TabsContent>

        <TabsContent value="kanban" className="mt-6">
          <KanbanView
            restaurants={restaurants}
            onVerifyDocuments={handleVerifyDocuments}
            onUpdateStage={handleUpdateStage}
          />
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          <EnterpriseDataGrid
            data={restaurants.filter(r => 
              !r.business_info_verified && 
              r.restaurant.business_license_url &&
              r.restaurant.owner_id_url &&
              r.restaurant.onboarding_status !== 'rejected'
            )}
            onRowClick={handleVerifyDocuments}
            selectedIds={selectedRestaurantIds}
            onSelectionChange={setSelectedRestaurantIds}
          />
        </TabsContent>

        <TabsContent value="in-progress" className="mt-6">
          <EnterpriseDataGrid
            data={restaurants.filter(r => 
              r.business_info_verified && 
              (r.menu_preparation_status !== 'ready' || !r.restaurant.banking_complete)
            )}
            onRowClick={handleVerifyDocuments}
            selectedIds={selectedRestaurantIds}
            onSelectionChange={setSelectedRestaurantIds}
          />
        </TabsContent>

        <TabsContent value="menu" className="mt-6">
          <MenuPreparationManager
            restaurants={restaurants}
            onUpdate={() => fetchRestaurants(false)}
          />
        </TabsContent>

        <TabsContent value="ready" className="mt-6">
          <EnterpriseDataGrid
            data={restaurants.filter(r => 
              r.business_info_verified && 
              r.restaurant.banking_complete && 
              r.menu_preparation_status === 'ready' &&
              !r.go_live_ready
            )}
            onRowClick={handleVerifyDocuments}
            selectedIds={selectedRestaurantIds}
            onSelectionChange={setSelectedRestaurantIds}
          />
        </TabsContent>

        <TabsContent value="live" className="mt-6">
          <EnterpriseDataGrid
            data={restaurants.filter(r => r.go_live_ready)}
            onRowClick={handleVerifyDocuments}
            selectedIds={selectedRestaurantIds}
            onSelectionChange={setSelectedRestaurantIds}
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <AnalyticsDashboard restaurants={restaurants} />
        </TabsContent>

        <TabsContent value="emails" className="mt-6">
          <EmailTemplates onSendEmail={handleSendEmail} />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <TeamAssignment 
            restaurants={restaurants}
            onAssignComplete={() => fetchRestaurants(false)}
          />
        </TabsContent>

        <TabsContent value="sla" className="mt-6">
          <SLATracking restaurants={restaurants} />
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <ActivityLog />
        </TabsContent>
      </Tabs>

      {/* Enhanced Document Verification Panel */}
      <EnhancedDocumentVerificationPanel
        restaurant={selectedRestaurant}
        isOpen={isVerificationPanelOpen}
        onClose={() => {
          setIsVerificationPanelOpen(false);
          setSelectedRestaurant(null);
        }}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}


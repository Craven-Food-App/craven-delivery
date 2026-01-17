import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  FileCheck, 
  Eye, 
  CheckCircle, 
  Clock, 
  XCircle,
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Building2,
  CheckSquare,
  Square
} from 'lucide-react';
import { QueueMode } from './restaurant-onboarding/verification/QueueMode';
import type { RestaurantOnboardingData } from './restaurant-onboarding/types';
import { logActivity, ActivityActionTypes } from './restaurant-onboarding/utils/activityLogger';
import { DocumentVerificationPanel } from './restaurant-onboarding/verification/DocumentVerificationPanel';

export const EnhancedRestaurantVerificationDashboard = () => {
  const [restaurants, setRestaurants] = useState<RestaurantOnboardingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantOnboardingData | null>(null);
  const [isVerificationPanelOpen, setIsVerificationPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [queueMode, setQueueMode] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    approved: 0,
    rejected: 0,
    skipped: 0,
  });
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedRestaurants, setSelectedRestaurants] = useState<RestaurantOnboardingData[]>([]);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

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
    fetchRestaurants(true);
    toast.success('Refreshed restaurant list');
  };

  const handleVerifyRestaurant = (restaurant: RestaurantOnboardingData) => {
    setSelectedRestaurant(restaurant);
    setIsVerificationPanelOpen(true);
  };

  const handleStartQueueMode = () => {
    const pending = filterRestaurants('pending');
    if (pending.length === 0) {
      toast.error('No pending restaurants to review');
      return;
    }
    setQueueMode(true);
    setSelectedRestaurant(pending[0]);
    setIsVerificationPanelOpen(true);
    setSessionStats({ reviewed: 0, approved: 0, rejected: 0, skipped: 0 });
    toast.success(`Queue mode started! ${pending.length} restaurants to review`);
  };

  const handleQueueNext = () => {
    const pending = filterRestaurants('pending');
    const currentIndex = selectedRestaurant 
      ? pending.findIndex(r => r.id === selectedRestaurant.id)
      : -1;
    
    if (currentIndex < pending.length - 1) {
      setSelectedRestaurant(pending[currentIndex + 1]);
    } else {
      toast.success('Queue complete! All pending restaurants reviewed.');
      setQueueMode(false);
      setIsVerificationPanelOpen(false);
    }
  };

  const handleQueuePrevious = () => {
    const pending = filterRestaurants('pending');
    const currentIndex = selectedRestaurant 
      ? pending.findIndex(r => r.id === selectedRestaurant.id)
      : -1;
    
    if (currentIndex > 0) {
      setSelectedRestaurant(pending[currentIndex - 1]);
    }
  };

  const handleQueueSkip = () => {
    setSessionStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
    handleQueueNext();
  };

  // Bulk selection handlers
  const handleToggleBulkMode = () => {
    setBulkMode(!bulkMode);
    setSelectedRestaurants([]);
  };

  const handleSelectRestaurant = (restaurant: RestaurantOnboardingData, selected: boolean) => {
    if (selected) {
      setSelectedRestaurants(prev => [...prev, restaurant]);
    } else {
      setSelectedRestaurants(prev => prev.filter(r => r.id !== restaurant.id));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedRestaurants.length === 0) return;

    const allHaveRequiredDocs = selectedRestaurants.every(r => 
      r.restaurant.business_license_url && r.restaurant.owner_id_url
    );

    if (!allHaveRequiredDocs) {
      toast.error('All restaurants must have required documents (License & ID) to bulk approve');
      return;
    }

    try {
      for (const restaurant of selectedRestaurants) {
        await handleApprove(restaurant.restaurant_id, 'Bulk approved by admin');
      }
      toast.success(`Successfully approved ${selectedRestaurants.length} restaurants!`);
      setSelectedRestaurants([]);
      setBulkMode(false);
    } catch (error) {
      toast.error('Failed to bulk approve restaurants');
    }
  };

  const handleApprove = async (restaurantId: string, notes: string, checklistData?: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Update restaurants table
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({
          business_verified_at: new Date().toISOString(),
          verification_notes: {
            approved_by: user?.id,
            approved_at: new Date().toISOString(),
            notes: notes || 'Approved by admin',
            checklist: checklistData,
          },
          onboarding_status: 'verified',
        })
        .eq('id', restaurantId);

      if (updateError) throw updateError;

      // Update onboarding progress table
      const { error: progressError } = await supabase
        .from('restaurant_onboarding_progress')
        .update({
          business_info_verified: true,
          business_verified_at: new Date().toISOString(),
          admin_notes: notes || 'Approved by admin',
        })
        .eq('restaurant_id', restaurantId);

      if (progressError) throw progressError;

      // Log activity
      await logActivity({
        restaurantId,
        actionType: ActivityActionTypes.APPROVED,
        actionDescription: 'Business documents approved and verified',
        metadata: { notes, checklistData }
      });

      toast.success('Restaurant verified successfully!');
      
      // Update session stats if in queue mode
      if (queueMode) {
        setSessionStats(prev => ({ 
          ...prev, 
          reviewed: prev.reviewed + 1,
          approved: prev.approved + 1 
        }));
        // Auto-advance to next in queue
        setTimeout(() => handleQueueNext(), 500);
      }
      
      fetchRestaurants(true);
    } catch (error) {
      console.error('Error approving restaurant:', error);
      throw error;
    }
  };

  const handleReject = async (restaurantId: string, notes: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Update restaurants table
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({
          verification_notes: {
            rejected_by: user?.id,
            rejected_at: new Date().toISOString(),
            notes: notes,
            reason: notes, // Use notes as reason
          },
          onboarding_status: 'rejected',
        })
        .eq('id', restaurantId);

      if (updateError) throw updateError;

      // Update onboarding progress
      const { error: progressError } = await supabase
        .from('restaurant_onboarding_progress')
        .update({
          business_info_verified: false,
          admin_notes: notes,
        })
        .eq('restaurant_id', restaurantId);

      if (progressError) throw progressError;

      // Log activity
      await logActivity({
        restaurantId,
        actionType: ActivityActionTypes.REJECTED,
        actionDescription: `Rejected: ${notes}`,
        metadata: { notes, reason: notes }
      });

      toast.success('Restaurant verification rejected');
      
      // Update session stats if in queue mode
      if (queueMode) {
        setSessionStats(prev => ({ 
          ...prev, 
          reviewed: prev.reviewed + 1,
          rejected: prev.rejected + 1 
        }));
        // Auto-advance to next in queue
        setTimeout(() => handleQueueNext(), 500);
      }
      
      fetchRestaurants(true);
    } catch (error) {
      console.error('Error rejecting restaurant:', error);
      throw error;
    }
  };

  const filterRestaurants = (status: string) => {
    let filtered = restaurants;

    switch (status) {
      case 'pending':
        filtered = restaurants.filter(r => 
          !r.business_info_verified && 
          r.restaurant.onboarding_status !== 'rejected' &&
          (r.restaurant.business_license_url || r.restaurant.owner_id_url)
        );
        break;
      case 'verified':
        filtered = restaurants.filter(r => r.business_info_verified);
        break;
      case 'rejected':
        filtered = restaurants.filter(r => r.restaurant.onboarding_status === 'rejected');
        break;
      default:
        filtered = restaurants;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.restaurant.name.toLowerCase().includes(query) ||
        r.restaurant.city.toLowerCase().includes(query) ||
        r.restaurant.email.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const stats = {
    total: restaurants.length,
    pending: restaurants.filter(r => !r.business_info_verified && r.restaurant.onboarding_status !== 'rejected').length,
    verified: restaurants.filter(r => r.business_info_verified).length,
    rejected: restaurants.filter(r => r.restaurant.onboarding_status === 'rejected').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Clock className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
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
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
            Restaurant Document Verification
          </h2>
          <p className="text-muted-foreground mt-1">
            Dedicated document review and verification center
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stats.pending > 0 && !queueMode && (
            <Button onClick={handleStartQueueMode} className="bg-blue-600 hover:bg-blue-700">
              <TrendingUp className="h-4 w-4 mr-2" />
              Start Queue Mode ({stats.pending})
            </Button>
          )}
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Restaurants</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Verified</p>
                <p className="text-3xl font-bold text-green-600">{stats.verified}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar & Bulk Mode Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by restaurant name, city, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={bulkMode ? 'default' : 'outline'}
          onClick={handleToggleBulkMode}
          className="whitespace-nowrap"
        >
          {bulkMode ? (
            <CheckSquare className="h-4 w-4 mr-2" />
          ) : (
            <Square className="h-4 w-4 mr-2" />
          )}
          Bulk Select
        </Button>
      </div>

      {/* Bulk Action Bar */}
      {bulkMode && selectedRestaurants.length > 0 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <Card className="border-2 border-primary shadow-2xl">
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="text-sm">
                  {selectedRestaurants.length} selected
                </Badge>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleBulkApprove}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve All ({selectedRestaurants.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedRestaurants([]);
                    setBulkMode(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            All ({filterRestaurants('all').length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            <Clock className="h-4 w-4 mr-2" />
            Pending ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="verified">
            <CheckCircle className="h-4 w-4 mr-2" />
            Verified ({stats.verified})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            <XCircle className="h-4 w-4 mr-2" />
            Rejected ({stats.rejected})
          </TabsTrigger>
        </TabsList>

        {['all', 'pending', 'verified', 'rejected'].map((status) => (
          <TabsContent key={status} value={status} className="space-y-4 mt-6">
            {filterRestaurants(status).length === 0 ? (
              <Card>
                <CardContent className="pt-12 pb-12">
                  <div className="text-center">
                    <FileCheck className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">
                      No {status === 'all' ? '' : status} restaurants found
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {searchQuery ? 'Try adjusting your search query' : 'Restaurants will appear here as they apply'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filterRestaurants(status).map((restaurant) => (
                  <RestaurantVerificationCard
                    key={restaurant.id}
                    restaurant={restaurant}
                    onVerify={handleVerifyRestaurant}
                    bulkMode={bulkMode}
                    isSelected={selectedRestaurants.some(r => r.id === restaurant.id)}
                    onSelect={handleSelectRestaurant}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Queue Mode Controls (shown when in queue mode) */}
      {queueMode && isVerificationPanelOpen && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4">
          <QueueMode
            restaurants={filterRestaurants('pending')}
            currentRestaurant={selectedRestaurant}
            onSelectRestaurant={setSelectedRestaurant}
            onNext={handleQueueNext}
            onPrevious={handleQueuePrevious}
            onSkip={handleQueueSkip}
            sessionStats={sessionStats}
          />
        </div>
      )}

      {/* Verification Panel */}
      {selectedRestaurant && (
        <DocumentVerificationPanel
          restaurant={selectedRestaurant}
          isOpen={isVerificationPanelOpen}
          onClose={() => {
            setIsVerificationPanelOpen(false);
            setSelectedRestaurant(null);
            if (queueMode) {
              setQueueMode(false);
              toast.info('Queue mode ended');
            }
          }}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
};

interface RestaurantVerificationCardProps {
  restaurant: RestaurantOnboardingData;
  onVerify: (restaurant: RestaurantOnboardingData) => void;
  bulkMode?: boolean;
  isSelected?: boolean;
  onSelect?: (restaurant: RestaurantOnboardingData, selected: boolean) => void;
}

function RestaurantVerificationCard({ 
  restaurant, 
  onVerify,
  bulkMode = false,
  isSelected = false,
  onSelect
}: RestaurantVerificationCardProps) {
  const hasBusinessLicense = !!restaurant.restaurant.business_license_url;
  const hasOwnerID = !!restaurant.restaurant.owner_id_url;
  const hasInsurance = !!restaurant.restaurant.insurance_certificate_url;
  const hasHealthPermit = !!restaurant.restaurant.health_permit_url;

  const docsUploaded = [hasBusinessLicense, hasOwnerID, hasInsurance, hasHealthPermit].filter(Boolean).length;
  const totalDocs = 4;
  const completionPercentage = (docsUploaded / totalDocs) * 100;

  const isVerified = restaurant.business_info_verified;
  const isRejected = restaurant.restaurant.onboarding_status === 'rejected';
  const isPending = !isVerified && !isRejected;

  const getStatusBadge = () => {
    if (isVerified) {
      return (
        <Badge className="bg-green-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      );
    }
    if (isRejected) {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    );
  };

  const getDaysAgo = (dateString: string): string => {
    const days = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  return (
    <Card className={`hover:shadow-lg transition-shadow ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 flex items-start gap-2">
            {bulkMode && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => onSelect?.(restaurant, e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg mb-1">{restaurant.restaurant.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {restaurant.restaurant.city}, {restaurant.restaurant.state}
              </p>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Document Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Documents</span>
            <span className="font-semibold">{docsUploaded}/4</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${
                completionPercentage === 100 ? 'bg-green-500' :
                completionPercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Document Checklist */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className={`flex items-center gap-1 ${hasBusinessLicense ? 'text-green-600' : 'text-gray-400'}`}>
            {hasBusinessLicense ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            License
          </div>
          <div className={`flex items-center gap-1 ${hasOwnerID ? 'text-green-600' : 'text-gray-400'}`}>
            {hasOwnerID ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            Owner ID
          </div>
          <div className={`flex items-center gap-1 ${hasInsurance ? 'text-green-600' : 'text-gray-400'}`}>
            {hasInsurance ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            Insurance
          </div>
          <div className={`flex items-center gap-1 ${hasHealthPermit ? 'text-green-600' : 'text-gray-400'}`}>
            {hasHealthPermit ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            Health Permit
          </div>
        </div>

        {/* Additional Info */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">
            Applied {getDaysAgo(restaurant.created_at)}
          </p>
          {restaurant.restaurant.cuisine_type && (
            <p className="text-xs text-muted-foreground">
              🍽️ {restaurant.restaurant.cuisine_type}
            </p>
          )}
        </div>

        {/* Action Button */}
        <Button
          onClick={() => onVerify(restaurant)}
          className="w-full"
          variant={isPending ? 'default' : 'outline'}
        >
          <Eye className="h-4 w-4 mr-2" />
          {isPending ? 'Review Documents' : 'View Details'}
        </Button>
      </CardContent>
    </Card>
  );
}


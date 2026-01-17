// @ts-nocheck
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  XCircle, 
  Mail, 
  Users, 
  Settings,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import type { RestaurantOnboardingData } from '../types';

interface BulkActionBarProps {
  selectedRestaurants: RestaurantOnboardingData[];
  onClearSelection: () => void;
  onBulkApprove: (restaurantIds: string[], notes?: string) => Promise<void>;
  onBulkReject: (restaurantIds: string[], notes: string) => Promise<void>;
  onBulkEmail: (restaurantIds: string[], message: string) => Promise<void>;
  onBulkAssign: (restaurantIds: string[], adminId: string) => Promise<void>;
  onBulkStatusUpdate: (restaurantIds: string[], status: string) => Promise<void>;
}

export function BulkActionBar({
  selectedRestaurants,
  onClearSelection,
  onBulkApprove,
  onBulkReject,
  onBulkEmail,
  onBulkAssign,
  onBulkStatusUpdate,
}: BulkActionBarProps) {
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [notes, setNotes] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [selectedAdmin, setSelectedAdmin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedCount = selectedRestaurants.length;

  if (selectedCount === 0) return null;

  const handleBulkApprove = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      const restaurantIds = selectedRestaurants.map(r => r.restaurant_id);
      await onBulkApprove(restaurantIds, notes || 'Bulk approved by admin');
      toast.success(`Successfully approved ${selectedCount} restaurants!`);
      setShowApproveDialog(false);
      setNotes('');
      onClearSelection();
    } catch (error) {
      console.error('Error bulk approving:', error);
      toast.error('Failed to approve restaurants');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkReject = async () => {
    if (!notes.trim()) {
      toast.error('Please provide rejection notes');
      return;
    }
    
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      const restaurantIds = selectedRestaurants.map(r => r.restaurant_id);
      await onBulkReject(restaurantIds, notes);
      toast.success(`Successfully rejected ${selectedCount} restaurants!`);
      setShowRejectDialog(false);
      setNotes('');
      onClearSelection();
    } catch (error) {
      console.error('Error bulk rejecting:', error);
      toast.error('Failed to reject restaurants');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkEmail = async () => {
    if (!emailMessage.trim()) {
      toast.error('Please provide email message');
      return;
    }
    
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      const restaurantIds = selectedRestaurants.map(r => r.restaurant_id);
      await onBulkEmail(restaurantIds, emailMessage);
      toast.success(`Email sent to ${selectedCount} restaurants!`);
      setShowEmailDialog(false);
      setEmailMessage('');
      onClearSelection();
    } catch (error) {
      console.error('Error sending bulk email:', error);
      toast.error('Failed to send emails');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!selectedAdmin) {
      toast.error('Please select an admin');
      return;
    }
    
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      const restaurantIds = selectedRestaurants.map(r => r.restaurant_id);
      await onBulkAssign(restaurantIds, selectedAdmin);
      toast.success(`Assigned ${selectedCount} restaurants to admin!`);
      setShowAssignDialog(false);
      setSelectedAdmin('');
      onClearSelection();
    } catch (error) {
      console.error('Error bulk assigning:', error);
      toast.error('Failed to assign restaurants');
    } finally {
      setIsProcessing(false);
    }
  };

  const canApprove = selectedRestaurants.every(r => 
    r.restaurant.business_license_url && 
    r.restaurant.owner_id_url && 
    !r.business_info_verified
  );

  const canReject = selectedRestaurants.every(r => !r.business_info_verified);

  // Get current user for admin list (in production, fetch from profiles table)
  const [admins, setAdmins] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('id, email, full_name')
          .eq('role', 'admin');
        
        if (data) {
          setAdmins(data.map(admin => ({
            id: admin.id,
            name: admin.full_name || admin.email
          })));
        }
      } catch (error) {
        console.error('Error fetching admins:', error);
      }
    };
    fetchAdmins();
  }, []);

  return (
    <>
      {/* Bulk Action Bar */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-4xl w-full mx-4">
          <div className="flex items-center justify-between gap-4">
            {/* Selection Info */}
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-sm">
                {selectedCount} selected
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Bulk Approve */}
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowApproveDialog(true)}
                disabled={!canApprove || isProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve ({selectedCount})
              </Button>

              {/* Bulk Reject */}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowRejectDialog(true)}
                disabled={!canReject || isProcessing}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject ({selectedCount})
              </Button>

              {/* Bulk Email */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEmailDialog(true)}
                disabled={isProcessing}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email ({selectedCount})
              </Button>

              {/* Bulk Assign */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAssignDialog(true)}
                disabled={isProcessing}
              >
                <Users className="h-4 w-4 mr-2" />
                Assign ({selectedCount})
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Bulk Approve Restaurants
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>{selectedCount} restaurants</strong> will be approved and marked as verified.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="approve-notes">Approval Notes (Optional)</Label>
              <Textarea
                id="approve-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this bulk approval..."
                rows={3}
              />
            </div>

            {/* Restaurant List */}
            <div className="space-y-2">
              <Label>Restaurants to Approve:</Label>
              <div className="max-h-32 overflow-y-auto border rounded-lg p-2">
                {selectedRestaurants.map((restaurant) => (
                  <div key={restaurant.id} className="flex items-center gap-2 py-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{restaurant.restaurant.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkApprove}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? 'Approving...' : `Approve ${selectedCount} Restaurants`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Bulk Reject Restaurants
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">
                  <strong>{selectedCount} restaurants</strong> will be rejected. This action cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reject-notes">Rejection Notes *</Label>
              <Textarea
                id="reject-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Please provide detailed reasons for rejection..."
                rows={3}
                required
              />
            </div>

            {/* Restaurant List */}
            <div className="space-y-2">
              <Label>Restaurants to Reject:</Label>
              <div className="max-h-32 overflow-y-auto border rounded-lg p-2">
                {selectedRestaurants.map((restaurant) => (
                  <div key={restaurant.id} className="flex items-center gap-2 py-1">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm">{restaurant.restaurant.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkReject}
              disabled={isProcessing || !notes.trim()}
            >
              {isProcessing ? 'Rejecting...' : `Reject ${selectedCount} Restaurants`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              Bulk Email Restaurants
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>{selectedCount} restaurants</strong> will receive this email message.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email-message">Email Message *</Label>
              <Textarea
                id="email-message"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Type your message here..."
                rows={5}
                required
              />
            </div>

            {/* Email Templates */}
            <div className="space-y-2">
              <Label>Quick Templates:</Label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEmailMessage('Please provide the missing documents to complete your restaurant onboarding.')}
                >
                  Request Documents
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEmailMessage('Your restaurant application has been approved! Welcome to the platform.')}
                >
                  Approval Notice
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEmailMessage('Please complete your menu setup to continue with the onboarding process.')}
                >
                  Menu Reminder
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkEmail}
              disabled={isProcessing || !emailMessage.trim()}
            >
              {isProcessing ? 'Sending...' : `Send to ${selectedCount} Restaurants`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Bulk Assign Restaurants
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-purple-800">
                <strong>{selectedCount} restaurants</strong> will be assigned to the selected admin.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="admin-select">Select Admin *</Label>
              <select
                id="admin-select"
                value={selectedAdmin}
                onChange={(e) => setSelectedAdmin(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Choose an admin...</option>
                {admins.map((admin) => (
                  <option key={admin.id} value={admin.id}>
                    {admin.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Restaurant List */}
            <div className="space-y-2">
              <Label>Restaurants to Assign:</Label>
              <div className="max-h-32 overflow-y-auto border rounded-lg p-2">
                {selectedRestaurants.map((restaurant) => (
                  <div key={restaurant.id} className="flex items-center gap-2 py-1">
                    <Users className="h-4 w-4 text-purple-600" />
                    <span className="text-sm">{restaurant.restaurant.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkAssign}
              disabled={isProcessing || !selectedAdmin}
            >
              {isProcessing ? 'Assigning...' : `Assign to Admin`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

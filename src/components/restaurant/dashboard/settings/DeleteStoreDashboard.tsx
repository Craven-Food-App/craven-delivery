import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Trash2, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Restaurant {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  created_at: string;
}

const DeleteStoreDashboard = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>("");
  const [deleteConfirmation, setDeleteConfirmation] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showFinalWarning, setShowFinalWarning] = useState(false);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("You must be logged in to view stores");
        return;
      }

      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, address, city, state, created_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRestaurants(data || []);
    } catch (error: any) {
      console.error('Error fetching restaurants:', error);
      toast.error('Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  const selectedRestaurant = restaurants.find(r => r.id === selectedRestaurantId);
  const canProceedToType = selectedRestaurantId !== "";
  const canProceedToFinal = deleteConfirmation === "DELETE";
  const canDelete = canProceedToFinal && showFinalWarning;

  const handleDelete = async () => {
    if (!selectedRestaurant) return;

    try {
      setDeleting(true);

      // Delete the restaurant (cascade will handle related records)
      const { error } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', selectedRestaurantId);

      if (error) throw error;

      toast.success(`Store "${selectedRestaurant.name}" has been deleted successfully`);
      
      // Reset form
      setSelectedRestaurantId("");
      setDeleteConfirmation("");
      setShowFinalWarning(false);
      
      // Refresh the list
      await fetchRestaurants();
    } catch (error: any) {
      console.error('Error deleting restaurant:', error);
      toast.error('Failed to delete store. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleFinalConfirm = () => {
    setShowFinalWarning(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading stores...</p>
        </div>
      </div>
    );
  }

  if (restaurants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Delete Store</CardTitle>
          <CardDescription>Manage and delete your store locations</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No stores found</AlertTitle>
            <AlertDescription>
              You don't have any stores to delete.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete Store
          </CardTitle>
          <CardDescription>
            Permanently delete a store. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Select Store */}
          <div className="space-y-2">
            <Label htmlFor="store-select">Select Store to Delete</Label>
            <Select
              value={selectedRestaurantId}
              onValueChange={(value) => {
                setSelectedRestaurantId(value);
                setDeleteConfirmation("");
                setShowFinalWarning(false);
              }}
            >
              <SelectTrigger id="store-select">
                <SelectValue placeholder="Choose a store to delete..." />
              </SelectTrigger>
              <SelectContent>
                {restaurants.map((restaurant) => (
                  <SelectItem key={restaurant.id} value={restaurant.id}>
                    {restaurant.name} - {restaurant.city}, {restaurant.state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedRestaurant && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedRestaurant.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedRestaurant.address}, {selectedRestaurant.city}, {selectedRestaurant.state}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Created: {new Date(selectedRestaurant.created_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {/* Step 2: Confirmation Question */}
          {canProceedToType && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Are you sure you want to delete this store? This will permanently remove all data associated with this store including orders, menu items, and settings.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="delete-confirmation">
                  Type <span className="font-mono font-bold">DELETE</span> to confirm
                </Label>
                <Input
                  id="delete-confirmation"
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => {
                    setDeleteConfirmation(e.target.value);
                    setShowFinalWarning(false);
                  }}
                  placeholder="Type DELETE here"
                  className="font-mono"
                />
                {deleteConfirmation && deleteConfirmation !== "DELETE" && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <XCircle className="h-4 w-4" />
                    The confirmation text must match exactly (case sensitive)
                  </p>
                )}
                {canProceedToFinal && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Confirmation text matches
                  </p>
                )}
              </div>

              {/* Step 3: Final Warning Button */}
              {canProceedToFinal && (
                <Button
                  variant="destructive"
                  onClick={handleFinalConfirm}
                  className="w-full"
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Continue to Final Confirmation
                </Button>
              )}
            </div>
          )}

          {/* Final Warning Dialog */}
          <AlertDialog open={showFinalWarning} onOpenChange={setShowFinalWarning}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Final Warning
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p className="font-semibold text-lg">
                    This Cannot Be Undone.
                  </p>
                  <p>
                    You are about to permanently delete <strong>{selectedRestaurant?.name}</strong>. 
                    All associated data including orders, menu items, settings, and store locations will be permanently removed.
                  </p>
                  <p className="text-destructive font-medium">
                    This action cannot be reversed.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setShowFinalWarning(false)}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Yes, Delete Store"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeleteStoreDashboard;


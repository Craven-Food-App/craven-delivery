import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

const StoreAvailabilityDashboard = () => {
  const { toast } = useToast();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [hours, setHours] = useState<any[]>([]);
  const [specialHours, setSpecialHours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [showSpecialHoursDialog, setShowSpecialHoursDialog] = useState(false);
  const [newSpecialHours, setNewSpecialHours] = useState({
    name: "",
    start_date: "",
    end_date: "",
    is_closed: false,
    open_time: "",
    close_time: ""
  });

  const days = [
    { label: "Monday", value: 1 },
    { label: "Tuesday", value: 2 },
    { label: "Wednesday", value: 3 },
    { label: "Thursday", value: 4 },
    { label: "Friday", value: 5 },
    { label: "Saturday", value: 6 },
    { label: "Sunday", value: 0 },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (!restaurantData) return;

      setRestaurant(restaurantData);
      setIsActive(restaurantData.is_active || false);

      const { data: hoursData } = await supabase
        .from('restaurant_hours')
        .select('*')
        .eq('restaurant_id', restaurantData.id)
        .order('day_of_week');

      setHours(hoursData || []);

      const { data: specialData } = await supabase
        .from('restaurant_special_hours')
        .select('*')
        .eq('restaurant_id', restaurantData.id)
        .order('start_date', { ascending: false });

      setSpecialHours(specialData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addSpecialHours = async () => {
    try {
      const response = await supabase.functions.invoke('update-store-hours', {
        body: {
          restaurantId: restaurant.id,
          specialHours: newSpecialHours
        }
      });

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: "Special hours added successfully",
      });

      setShowSpecialHoursDialog(false);
      setNewSpecialHours({
        name: "",
        start_date: "",
        end_date: "",
        is_closed: false,
        open_time: "",
        close_time: ""
      });
      fetchData();
    } catch (error) {
      console.error('Error adding special hours:', error);
      toast({
        title: "Error",
        description: "Failed to add special hours",
        variant: "destructive",
      });
    }
  };

  const deleteSpecialHours = async (id: string) => {
    try {
      const { error } = await supabase
        .from('restaurant_special_hours')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Special hours removed",
      });
      fetchData();
    } catch (error) {
      console.error('Error deleting special hours:', error);
      toast({
        title: "Error",
        description: "Failed to delete special hours",
        variant: "destructive",
      });
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="w-full h-full bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">Store availability</h1>

        {/* Store Status - Read Only */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Store status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border-2 ${isActive ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-lg mb-1">
                        {isActive ? "Active" : "Inactive"}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {isActive 
                          ? "Your store is currently accepting orders" 
                          : "Your store is not accepting orders"}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Only Crave'N administrators can change your store's active status. Contact support if you need assistance.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Regular Hours */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Regular menu hours</CardTitle>
            <CardDescription>
              These are the hours your store is available on Crave'N.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hours.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hours configured yet
              </div>
            ) : (
              <div className="space-y-4">
                {days.map(day => {
                  const dayHours = hours.find(h => h.day_of_week === day.value);
                  return (
                    <div key={day.value} className="flex items-center justify-between border-b pb-3">
                      <span className="font-medium">{day.label}</span>
                      {dayHours?.is_closed ? (
                        <span className="text-muted-foreground">Closed</span>
                      ) : dayHours ? (
                        <span>{dayHours.open_time} - {dayHours.close_time}</span>
                      ) : (
                        <span className="text-muted-foreground">Not set</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Special Hours */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Special hours and closures</CardTitle>
                <CardDescription>
                  Add special hours or closures for holidays, special events, or other exceptional events.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              {specialHours.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No special hours or closures scheduled
                </div>
              ) : (
                <div className="divide-y">
                  {specialHours.map(sh => (
                    <div key={sh.id} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{sh.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {sh.start_date} - {sh.end_date}
                        </div>
                        {sh.is_closed ? (
                          <span className="text-sm text-destructive">Closed</span>
                        ) : (
                          <span className="text-sm">{sh.open_time} - {sh.close_time}</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteSpecialHours(sh.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Dialog open={showSpecialHoursDialog} onOpenChange={setShowSpecialHoursDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Add new
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add special hours or closure</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={newSpecialHours.name}
                      onChange={e => setNewSpecialHours({ ...newSpecialHours, name: e.target.value })}
                      placeholder="e.g., Thanksgiving, Staff Party"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={newSpecialHours.start_date}
                        onChange={e => setNewSpecialHours({ ...newSpecialHours, start_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={newSpecialHours.end_date}
                        onChange={e => setNewSpecialHours({ ...newSpecialHours, end_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is-closed"
                      checked={newSpecialHours.is_closed}
                      onCheckedChange={(checked) => setNewSpecialHours({ ...newSpecialHours, is_closed: !!checked })}
                    />
                    <Label htmlFor="is-closed">Store is closed during this time</Label>
                  </div>
                  {!newSpecialHours.is_closed && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Open Time</Label>
                        <Input
                          type="time"
                          value={newSpecialHours.open_time}
                          onChange={e => setNewSpecialHours({ ...newSpecialHours, open_time: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Close Time</Label>
                        <Input
                          type="time"
                          value={newSpecialHours.close_time}
                          onChange={e => setNewSpecialHours({ ...newSpecialHours, close_time: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                  <Button onClick={addSpecialHours} className="w-full">
                    Add Special Hours
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StoreAvailabilityDashboard;
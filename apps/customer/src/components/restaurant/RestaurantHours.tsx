import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { Clock, Save } from "lucide-react";

interface RestaurantHoursProps {
  restaurantId: string;
}

interface HoursData {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

const DAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

const RestaurantHours: React.FC<RestaurantHoursProps> = ({ restaurantId }) => {
  const [hours, setHours] = useState<HoursData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchHours();
  }, [restaurantId]);

  const fetchHours = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_hours')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('day_of_week');

      if (error) throw error;

      // Initialize with default hours if none exist
      const hoursData = DAYS.map((_, index) => {
        const existingHour = data?.find(h => h.day_of_week === index);
        return existingHour || {
          day_of_week: index,
          open_time: '09:00',
          close_time: '22:00',
          is_closed: false
        };
      });

      setHours(hoursData);
    } catch (error) {
      console.error('Error fetching hours:', error);
      toast({
        title: "Error",
        description: "Failed to load restaurant hours",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateHours = (dayIndex: number, field: keyof HoursData, value: any) => {
    setHours(prev => prev.map((hour, index) => 
      index === dayIndex ? { ...hour, [field]: value } : hour
    ));
  };

  const saveHours = async () => {
    setSaving(true);
    try {
      // Delete existing hours
      await supabase
        .from('restaurant_hours')
        .delete()
        .eq('restaurant_id', restaurantId);

      // Insert new hours
      const hoursToInsert = hours.map(hour => ({
        restaurant_id: restaurantId,
        day_of_week: hour.day_of_week,
        open_time: hour.is_closed ? null : hour.open_time,
        close_time: hour.is_closed ? null : hour.close_time,
        is_closed: hour.is_closed
      }));

      const { error } = await supabase
        .from('restaurant_hours')
        .insert(hoursToInsert);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Restaurant hours updated successfully"
      });
    } catch (error) {
      console.error('Error saving hours:', error);
      toast({
        title: "Error",
        description: "Failed to save restaurant hours",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const setAllDays = (field: 'open_time' | 'close_time', value: string) => {
    setHours(prev => prev.map(hour => 
      hour.is_closed ? hour : { ...hour, [field]: value }
    ));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading hours...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Hours of Operation
        </CardTitle>
        <CardDescription>
          Set your restaurant's operating hours for each day of the week
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick set all */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Set All Open Times</Label>
            <Input
              type="time"
              onChange={(e) => setAllDays('open_time', e.target.value)}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Set All Close Times</Label>
            <Input
              type="time"
              onChange={(e) => setAllDays('close_time', e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Individual day settings */}
        <div className="space-y-4">
          {hours.map((hour, index) => (
            <div key={index} className="grid grid-cols-12 gap-4 items-center p-4 border rounded-lg">
              <div className="col-span-3">
                <Label className="font-medium">{DAYS[index]}</Label>
              </div>
              
              <div className="col-span-2 flex items-center space-x-2">
                <Switch
                  checked={!hour.is_closed}
                  onCheckedChange={(checked) => updateHours(index, 'is_closed', !checked)}
                />
                <Label className="text-sm">Open</Label>
              </div>

              {!hour.is_closed ? (
                <>
                  <div className="col-span-3">
                    <Input
                      type="time"
                      value={hour.open_time}
                      onChange={(e) => updateHours(index, 'open_time', e.target.value)}
                    />
                  </div>
                  <div className="col-span-1 text-center text-muted-foreground">
                    to
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="time"
                      value={hour.close_time}
                      onChange={(e) => updateHours(index, 'close_time', e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <div className="col-span-7 text-muted-foreground">
                  Closed
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button onClick={saveHours} disabled={saving}>
            {saving ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Hours
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RestaurantHours;
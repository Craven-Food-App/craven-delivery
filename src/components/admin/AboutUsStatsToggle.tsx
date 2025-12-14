import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BarChart, BarChart3, Save } from 'lucide-react';

export const AboutUsStatsToggle: React.FC = () => {
  const [statsVisible, setStatsVisible] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'feature_about_us_stats_visible')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.setting_value) {
        setStatsVisible(data.setting_value.enabled !== false); // Default to true if not set
      }
    } catch (error) {
      console.error('Error fetching feature flags:', error);
      toast.error('Failed to load feature settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          setting_key: 'feature_about_us_stats_visible',
          setting_value: {
            enabled: statsVisible
          },
          description: 'Controls whether the stats section (Active Users, Restaurant Partners, Delivery Drivers, Cities Served) is visible on the About Us page',
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        }, {
          onConflict: 'setting_key'
        });

      if (error) throw error;

      toast.success('Stats section toggle updated successfully');
    } catch (error) {
      console.error('Error saving feature toggle:', error);
      toast.error('Failed to save feature toggle');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-4">Loading feature toggles...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          About Us Stats Section
        </CardTitle>
        <CardDescription>
          Control visibility of the stats section on the About Us page
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Section Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="stats-toggle" className="text-base font-medium">
              Stats Section (Active Users, Restaurant Partners, Delivery Drivers, Cities Served)
            </Label>
            <p className="text-sm text-muted-foreground">
              Show or hide the statistics section on the About Us page
            </p>
          </div>
          <Switch
            id="stats-toggle"
            checked={statsVisible}
            onCheckedChange={setStatsVisible}
          />
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
          {statsVisible ? (
            <>
              <BarChart className="h-4 w-4 text-green-600" />
              <span className="text-sm">Stats section is <strong>visible</strong> on About Us page</span>
            </>
          ) : (
            <>
              <BarChart3 className="h-4 w-4 text-orange-600" />
              <span className="text-sm">Stats section is <strong>hidden</strong> from About Us page</span>
            </>
          )}
        </div>

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full"
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardContent>
    </Card>
  );
};


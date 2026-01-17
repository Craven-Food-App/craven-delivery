// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Eye, EyeOff, Save } from 'lucide-react';

export const FeatureToggleManager: React.FC = () => {
  const [restaurantsVisible, setRestaurantsVisible] = useState(false);
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
        .eq('setting_key', 'feature_restaurants_visible')
        .single();

      if (error) throw error;

      if (data?.setting_value) {
        setRestaurantsVisible(data.setting_value.enabled === true);
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
        .update({
          setting_value: {
            enabled: restaurantsVisible
          },
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        })
        .eq('setting_key', 'feature_restaurants_visible');

      if (error) throw error;

      toast.success('Feature toggle updated successfully');
    } catch (error) {
      console.error('Error saving feature toggle:', error);
      toast.error('Failed to save feature toggle');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mx-auto"></div>
          <p className="text-xs text-gray-500 mt-3">Loading feature toggles...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="px-3 py-2 border-b border-gray-200 bg-[#fafbfc]">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Feature Toggles
          </CardTitle>
          <CardDescription className="text-xs mt-1">
            Control which features are visible to users
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          {/* Restaurants Page Toggle */}
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
            <div className="flex-1">
              <Label htmlFor="restaurants-toggle" className="text-xs font-semibold text-gray-900">
                Restaurants Page
              </Label>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Show or hide the restaurants page from navigation menus
              </p>
            </div>
            <Switch
              id="restaurants-toggle"
              checked={restaurantsVisible}
              onCheckedChange={setRestaurantsVisible}
            />
          </div>

          {/* Status Indicator */}
          <div className={`flex items-center gap-2 p-2.5 rounded-md text-xs ${
            restaurantsVisible ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'
          }`}>
            {restaurantsVisible ? (
              <>
                <Eye className="h-3.5 w-3.5 text-green-600" />
                <span className="text-green-700 font-medium">Restaurants page is <strong>visible</strong> to users</span>
              </>
            ) : (
              <>
                <EyeOff className="h-3.5 w-3.5 text-orange-600" />
                <span className="text-orange-700 font-medium">Restaurants page is <strong>hidden</strong> from users</span>
              </>
            )}
          </div>

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full h-8 text-xs bg-orange-500 hover:bg-orange-600"
          >
            <Save className="mr-1.5 h-3 w-3" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Settings, Clock, Save } from 'lucide-react';

export const BackgroundCheckSettings: React.FC = () => {
  const [delayDays, setDelayDays] = useState('3');
  const [customDelay, setCustomDelay] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings' as any)
        .select('setting_value')
        .eq('setting_key', 'background_check_delay_days')
        .single();

      if (error) throw error;

      if ((data as any)?.setting_value) {
        setDelayDays((data as any).setting_value.default?.toString() || '3');
        setEnabled((data as any).setting_value.enabled !== false);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const finalDelay = delayDays === 'custom' ? parseInt(customDelay) : parseInt(delayDays);

      const { error } = await supabase
        .from('admin_settings' as any)
        .update({
          setting_value: {
            min: 1,
            max: 5,
            default: finalDelay,
            enabled: enabled
          },
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        })
        .eq('setting_key', 'background_check_delay_days');

      if (error) throw error;

      toast.success('Background check settings updated successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Background Check Settings
        </CardTitle>
        <CardDescription>
          Configure the simulated background check processing time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Background Check Delay */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Simulated Processing Delay</Label>
            <p className="text-sm text-muted-foreground">
              Enable realistic processing time for applicants
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {enabled && (
          <>
            {/* Processing Time Selection */}
            <div className="space-y-2">
              <Label htmlFor="delay">Processing Time</Label>
              <Select value={delayDays} onValueChange={setDelayDays}>
                <SelectTrigger id="delay">
                  <SelectValue placeholder="Select delay" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Instant (Testing Only)
                    </div>
                  </SelectItem>
                  <SelectItem value="1">1 Day</SelectItem>
                  <SelectItem value="2">2 Days</SelectItem>
                  <SelectItem value="3">3 Days (Recommended)</SelectItem>
                  <SelectItem value="4">4 Days</SelectItem>
                  <SelectItem value="5">5 Days</SelectItem>
                  <SelectItem value="custom">Custom Duration</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Delay Input */}
            {delayDays === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="customDelay">Custom Delay (Days)</Label>
                <Input
                  id="customDelay"
                  type="number"
                  min="0"
                  max="30"
                  value={customDelay}
                  onChange={(e) => setCustomDelay(e.target.value)}
                  placeholder="Enter number of days"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum 30 days
                </p>
              </div>
            )}

            {/* Preview */}
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Applicant Experience:</p>
              <p className="text-sm text-muted-foreground">
                After submitting their application, Feeders will be told their background check 
                will take <strong>1-5 business days (possibly more)</strong>. The estimated completion 
                date will be set to <strong>{delayDays === 'custom' ? customDelay || '?' : delayDays} day{delayDays !== '1' && delayDays !== 'custom' ? 's' : ''}</strong> from submission.
              </p>
            </div>
          </>
        )}

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={saving || (delayDays === 'custom' && !customDelay)}
          className="w-full"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs text-blue-900">
            <strong>Note:</strong> This setting affects all new applications. Existing pending applications 
            will use the delay that was configured when they were submitted. Admins can approve background 
            checks at any time, regardless of the estimated completion date.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};


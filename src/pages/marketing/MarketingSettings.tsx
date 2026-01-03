/**
 * Settings & Configurations
 * System preferences and brand settings
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings as SettingsIcon, Save, Palette, Mail, Bell, Globe } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MarketingSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    // Branding
    logoUrl: '',
    primaryColor: '#ff7a45',
    secondaryColor: '#ff9c6e',
    brandName: 'Crave\'N Delivery',
    
    // Email Settings
    senderName: 'Crave\'N Delivery',
    senderEmail: 'noreply@cravenusa.com',
    replyToEmail: 'support@cravenusa.com',
    
    // SMS Settings
    smsSenderName: 'Craven',
    smsProvider: 'twilio',
    
    // Notification Settings
    pushIconUrl: '/logo.png',
    pushSoundEnabled: true,
    
    // API Keys
    googleAnalyticsId: '',
    metaPixelId: '',
    
    // Regional
    timezone: 'America/New_York',
    currency: 'USD',
    defaultLanguage: 'en'
  });

  const handleSave = () => {
    // TODO: Save to database
    console.log('Saving settings:', settings);
  };

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Settings & Configurations</h2>
          <p className="text-xs text-gray-500 mt-0.5">Configure system preferences and brand settings</p>
        </div>
        <Button onClick={handleSave} size="sm" className="h-7 px-2.5 text-xs bg-orange-500 hover:bg-orange-600">
          <Save className="h-3 w-3 mr-1.5" />
          Save Settings
        </Button>
      </div>

      {/* Branding - Compact */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="px-3 py-2 border-b border-gray-200 bg-[#fafbfc]">
          <div className="flex items-center gap-2">
            <Palette className="h-3.5 w-3.5 text-orange-600" />
            <CardTitle className="text-sm font-semibold">Branding</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-3 space-y-2">
          <div>
            <Label htmlFor="brandName" className="text-xs">Brand Name</Label>
            <Input
              id="brandName"
              value={settings.brandName}
              onChange={(e) => setSettings(prev => ({ ...prev, brandName: e.target.value }))}
              className="mt-1 h-8 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="primaryColor" className="text-xs">Primary Color</Label>
              <Input
                id="primaryColor"
                type="color"
                value={settings.primaryColor}
                onChange={(e) => setSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                className="mt-1 h-8"
              />
            </div>
            <div>
              <Label htmlFor="secondaryColor" className="text-xs">Secondary Color</Label>
              <Input
                id="secondaryColor"
                type="color"
                value={settings.secondaryColor}
                onChange={(e) => setSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                className="mt-1 h-8"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="logoUrl" className="text-xs">Logo URL</Label>
            <Input
              id="logoUrl"
              value={settings.logoUrl}
              onChange={(e) => setSettings(prev => ({ ...prev, logoUrl: e.target.value }))}
              placeholder="https://..."
              className="mt-1 h-8 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Settings - Compact */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="px-3 py-2 border-b border-gray-200 bg-[#fafbfc]">
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-orange-600" />
            <CardTitle className="text-sm font-semibold">Email Settings</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <Label htmlFor="senderName" className="text-xs">Sender Name</Label>
              <Input
                id="senderName"
                value={settings.senderName}
                onChange={(e) => setSettings(prev => ({ ...prev, senderName: e.target.value }))}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="senderEmail" className="text-xs">Sender Email</Label>
              <Input
                id="senderEmail"
                type="email"
                value={settings.senderEmail}
                onChange={(e) => setSettings(prev => ({ ...prev, senderEmail: e.target.value }))}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="replyToEmail" className="text-xs">Reply-To Email</Label>
              <Input
                id="replyToEmail"
                type="email"
                value={settings.replyToEmail}
                onChange={(e) => setSettings(prev => ({ ...prev, replyToEmail: e.target.value }))}
                className="mt-1 h-8 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SMS Settings - Compact */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="px-3 py-2 border-b border-gray-200 bg-[#fafbfc]">
          <div className="flex items-center gap-2">
            <Bell className="h-3.5 w-3.5 text-orange-600" />
            <CardTitle className="text-sm font-semibold">SMS Settings</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <Label htmlFor="smsSenderName" className="text-xs">Sender Name</Label>
              <Input
                id="smsSenderName"
                value={settings.smsSenderName}
                onChange={(e) => setSettings(prev => ({ ...prev, smsSenderName: e.target.value }))}
                className="mt-1 h-8 text-xs"
                maxLength={11}
              />
              <p className="text-[10px] text-gray-500 mt-0.5">Max 11 characters</p>
            </div>
            <div>
              <Label htmlFor="smsProvider" className="text-xs">SMS Provider</Label>
              <Select
                value={settings.smsProvider}
                onValueChange={(value) => setSettings(prev => ({ ...prev, smsProvider: value }))}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="twilio">Twilio</SelectItem>
                  <SelectItem value="aws">AWS SNS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys - Compact */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="px-3 py-2 border-b border-gray-200 bg-[#fafbfc]">
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-3.5 w-3.5 text-orange-600" />
            <CardTitle className="text-sm font-semibold">API Keys & Integrations</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-3 space-y-2">
          <div>
            <Label htmlFor="googleAnalyticsId" className="text-xs">Google Analytics ID</Label>
            <Input
              id="googleAnalyticsId"
              value={settings.googleAnalyticsId}
              onChange={(e) => setSettings(prev => ({ ...prev, googleAnalyticsId: e.target.value }))}
              placeholder="G-XXXXXXXXXX"
              className="mt-1 h-8 text-xs"
            />
          </div>
          <div>
            <Label htmlFor="metaPixelId" className="text-xs">Meta Pixel ID</Label>
            <Input
              id="metaPixelId"
              value={settings.metaPixelId}
              onChange={(e) => setSettings(prev => ({ ...prev, metaPixelId: e.target.value }))}
              placeholder="123456789012345"
              className="mt-1 h-8 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Regional Settings - Compact */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="px-3 py-2 border-b border-gray-200 bg-[#fafbfc]">
          <div className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-orange-600" />
            <CardTitle className="text-sm font-semibold">Regional Settings</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <Label htmlFor="timezone" className="text-xs">Timezone</Label>
              <Select
                value={settings.timezone}
                onValueChange={(value) => setSettings(prev => ({ ...prev, timezone: value }))}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="America/Chicago">Central Time</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="currency" className="text-xs">Currency</Label>
              <Select
                value={settings.currency}
                onValueChange={(value) => setSettings(prev => ({ ...prev, currency: value }))}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="CAD">CAD (C$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="defaultLanguage" className="text-xs">Default Language</Label>
              <Select
                value={settings.defaultLanguage}
                onValueChange={(value) => setSettings(prev => ({ ...prev, defaultLanguage: value }))}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketingSettings;

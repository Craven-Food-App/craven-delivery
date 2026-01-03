/**
 * Tools & Integrations
 * Connect external services for marketing operations
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plug, Check, ExternalLink, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Integration {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  status: 'connected' | 'disconnected' | 'pending';
  lastSync?: string;
}

const ToolsIntegrations: React.FC = () => {
  const [integrations] = useState<Integration[]>([
    {
      id: 'google_analytics',
      name: 'Google Analytics',
      category: 'Analytics',
      description: 'Track website traffic and user behavior',
      icon: '📊',
      status: 'disconnected'
    },
    {
      id: 'meta_ads',
      name: 'Meta Ads Manager',
      category: 'Advertising',
      description: 'Manage Facebook and Instagram ad campaigns',
      icon: '📱',
      status: 'disconnected'
    },
    {
      id: 'mailchimp',
      name: 'Mailchimp',
      category: 'Email',
      description: 'Email marketing platform integration',
      icon: '✉️',
      status: 'disconnected'
    },
    {
      id: 'sendgrid',
      name: 'SendGrid',
      category: 'Email',
      description: 'Transactional and marketing emails',
      icon: '📧',
      status: 'connected',
      lastSync: new Date().toISOString()
    },
    {
      id: 'twilio',
      name: 'Twilio',
      category: 'SMS',
      description: 'SMS messaging and notifications',
      icon: '💬',
      status: 'disconnected'
    },
    {
      id: 'firebase',
      name: 'Firebase Cloud Messaging',
      category: 'Push Notifications',
      description: 'Push notification delivery',
      icon: '🔔',
      status: 'connected',
      lastSync: new Date().toISOString()
    },
    {
      id: 'hubspot',
      name: 'HubSpot CRM',
      category: 'CRM',
      description: 'Customer relationship management',
      icon: '👥',
      status: 'disconnected'
    },
    {
      id: 'stripe',
      name: 'Stripe',
      category: 'Payments',
      description: 'Promotional credit management',
      icon: '💳',
      status: 'connected',
      lastSync: new Date().toISOString()
    }
  ]);

  const handleConnect = (integrationId: string) => {
    // TODO: Implement OAuth flow or API key setup
    console.log('Connecting:', integrationId);
  };

  const groupedIntegrations = integrations.reduce((acc, integration) => {
    if (!acc[integration.category]) {
      acc[integration.category] = [];
    }
    acc[integration.category].push(integration);
    return acc;
  }, {} as Record<string, Integration[]>);

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Tools & Integrations</h2>
          <p className="text-xs text-gray-500 mt-0.5">Connect external services to enhance marketing capabilities</p>
        </div>
      </div>

      {/* Compact Status Cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Connected</p>
              <Check className="h-3 w-3 text-green-600" />
            </div>
            <p className="text-xl font-semibold text-green-600 leading-tight">
              {integrations.filter(i => i.status === 'connected').length}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Available</p>
              <Plug className="h-3 w-3 text-blue-600" />
            </div>
            <p className="text-xl font-semibold text-gray-900 leading-tight">{integrations.length}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Disconnected</p>
              <Plug className="h-3 w-3 text-gray-400" />
            </div>
            <p className="text-xl font-semibold text-gray-600 leading-tight">
              {integrations.filter(i => i.status === 'disconnected').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Integrations by Category - Compact */}
      {Object.entries(groupedIntegrations).map(([category, items]) => (
        <Card key={category} className="border border-gray-200 shadow-sm">
          <CardHeader className="px-3 py-2 border-b border-gray-200 bg-[#fafbfc]">
            <CardTitle className="text-sm font-semibold">{category}</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {items.map((integration) => (
                <div
                  key={integration.id}
                  className="p-2.5 border border-gray-200 rounded-md hover:border-orange-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="text-lg flex-shrink-0">{integration.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-xs text-gray-900 truncate">{integration.name}</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">{integration.description}</p>
                      </div>
                    </div>
                    <Badge className={`text-[10px] px-1.5 py-0.5 font-medium border flex-shrink-0 ${
                      integration.status === 'connected' ? 'bg-green-50 text-green-700 border-green-200' :
                      integration.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      'bg-gray-50 text-gray-700 border-gray-200'
                    }`}>
                      {integration.status}
                    </Badge>
                  </div>
                  {integration.status === 'connected' && integration.lastSync && (
                    <p className="text-[10px] text-gray-500 mb-1.5">
                      Last synced: {new Date(integration.lastSync).toLocaleDateString()}
                    </p>
                  )}
                  <div className="flex gap-1.5">
                    {integration.status === 'connected' ? (
                      <>
                        <Button variant="outline" size="sm" className="flex-1 h-6 px-1.5 text-[10px]">
                          <Settings className="h-3 w-3 mr-1" />
                          Config
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 h-6 px-1.5 text-[10px]">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-1 h-6 px-1.5 text-[10px] bg-orange-500 hover:bg-orange-600"
                        onClick={() => handleConnect(integration.id)}
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ToolsIntegrations;

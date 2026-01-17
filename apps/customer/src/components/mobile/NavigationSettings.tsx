import React, { useState, useEffect } from 'react';
import { 
  Navigation, 
  MapPin, 
  Settings, 
  Check,
  Apple,
  Smartphone,
  Map
} from 'lucide-react';

interface NavigationSettingsProps {
  onNavigationAppChange?: (app: 'apple' | 'google' | 'waze') => void;
  className?: string;
}

const NavigationSettings: React.FC<NavigationSettingsProps> = ({ 
  onNavigationAppChange,
  className = ''
}) => {
  const [selectedApp, setSelectedApp] = useState<'apple' | 'google' | 'waze'>('apple');

  useEffect(() => {
    // Load saved preference from localStorage
    const savedApp = localStorage.getItem('preferredNavigationApp') as 'apple' | 'google' | 'waze';
    if (savedApp) {
      setSelectedApp(savedApp);
    }
  }, []);

  const handleAppSelect = (app: 'apple' | 'google' | 'waze') => {
    setSelectedApp(app);
    localStorage.setItem('preferredNavigationApp', app);
    onNavigationAppChange?.(app);
  };

  const navigationApps = [
    {
      id: 'apple' as const,
      name: 'Apple Maps',
      description: 'Default iOS navigation',
      icon: Apple,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      id: 'google' as const,
      name: 'Google Maps',
      description: 'Most popular navigation app',
      icon: Map,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      id: 'waze' as const,
      name: 'Waze',
      description: 'Community-driven navigation',
      icon: Smartphone,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    }
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center space-x-2 mb-4">
        <Settings className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">Navigation Settings</h3>
      </div>
      
      <div className="space-y-3">
        {navigationApps.map((app) => {
          const Icon = app.icon;
          const isSelected = selectedApp === app.id;
          
          return (
            <button
              key={app.id}
              onClick={() => handleAppSelect(app.id)}
              className={`w-full p-4 rounded-xl border-2 transition-all duration-200 ${
                isSelected 
                  ? `${app.borderColor} ${app.bgColor} shadow-sm` 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg ${app.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${app.color}`} />
                  </div>
                  <div className="text-left">
                    <p className={`font-semibold ${isSelected ? app.color : 'text-gray-900'}`}>
                      {app.name}
                    </p>
                    <p className="text-sm text-gray-500">{app.description}</p>
                  </div>
                </div>
                
                {isSelected && (
                  <div className={`w-6 h-6 rounded-full ${app.bgColor} flex items-center justify-center`}>
                    <Check className={`w-4 h-4 ${app.color}`} />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
      
      <div className="mt-6 p-4 bg-gray-50 rounded-xl">
        <div className="flex items-start space-x-3">
          <Navigation className="w-5 h-5 text-gray-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900">Navigation Integration</p>
            <p className="text-sm text-gray-600 mt-1">
              When you tap "Start Navigation", it will open {navigationApps.find(app => app.id === selectedApp)?.name} 
              with the destination pre-filled.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavigationSettings;

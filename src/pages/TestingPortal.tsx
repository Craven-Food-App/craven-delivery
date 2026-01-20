import React, { useState } from 'react';
import AdminAccessGuard from '@/components/AdminAccessGuard';
import { TestCustomer } from '@/components/testing/TestCustomer';
import { TestDriver } from '@/components/testing/TestDriver';
import { TestRestaurant } from '@/components/testing/TestRestaurant';
import { LiveDriverTesting } from '@/components/testing/LiveDriverTesting';
import { TestDataManager } from '@/components/testing/TestDataManager';
import { TestDiamondExclusiveOrders } from '@/components/testing/TestDiamondExclusiveOrders';
import { TestCtoEvaluation } from '@/components/testing/TestCtoEvaluation';
import { TestOnFireGame } from '@/components/testing/TestOnFireGame';
import { TestOrderCompletion } from '@/components/testing/TestOrderCompletion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Users, Car, Store, Zap, Database, Gem, Shield, Flame, CheckCircle } from 'lucide-react';
import cravenLogo from "@/assets/craven-logo.png";
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { useAutoLogout } from '@/hooks/useAutoLogout';

const TestingPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState('customer');
  
  // Track user activity
  useActivityTracking('testing');
  
  // Auto-logout after 30 minutes of inactivity
  useAutoLogout('testing');

  const navItems = [
    { id: 'customer', label: 'Customer Testing', icon: Users },
    { id: 'driver', label: 'Driver Testing', icon: Car },
    { id: 'restaurant', label: 'Restaurant Testing', icon: Store },
    { id: 'live', label: 'Live Driver Testing', icon: Zap },
    { id: 'order-completion', label: 'LIVE Order Completion', icon: CheckCircle },
    { id: 'data', label: 'Test Data Manager', icon: Database },
    { id: 'diamond-exclusive', label: 'Diamond Exclusive Orders', icon: Gem },
    { id: 'cto-eval', label: 'CTO Evaluation Gate (Test)', icon: Shield },
    { id: 'on-fire', label: 'ON FIRE Game Demo', icon: Flame },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'customer':
        return <TestCustomer />;
      case 'driver':
        return <TestDriver />;
      case 'restaurant':
        return <TestRestaurant />;
      case 'live':
        return <LiveDriverTesting />;
      case 'data':
        return <TestDataManager />;
      case 'diamond-exclusive':
        return <TestDiamondExclusiveOrders />;
      case 'cto-eval':
        return <TestCtoEvaluation />;
      case 'on-fire':
        return <TestOnFireGame />;
      case 'order-completion':
        return <TestOrderCompletion />;
      default:
        return <TestCustomer />;
    }
  };

  return (
    <AdminAccessGuard>
      <div className="flex h-screen w-full bg-background">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-card flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 mb-4">
              <img src={cravenLogo} alt="Crave'n" className="h-6" />
              <span className="font-bold">Testing Portal</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.location.href = '/hub'}
              className="w-full justify-start"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Hub
            </Button>
          </div>

          <ScrollArea className="flex-1 px-3">
            <div className="space-y-4 py-4">
              <div className="pt-2 pb-2">
                <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Test Suites
                </h3>
              </div>

              {navItems.map((item) => (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveTab(item.id)}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </AdminAccessGuard>
  );
};

export default TestingPortal;


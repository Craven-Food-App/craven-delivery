import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  FileText, 
  TrendingUp, 
  DollarSign, 
  LayoutDashboard,
  Shield,
  Briefcase,
  Eye
} from 'lucide-react';
import cravenLogo from "@/assets/craven-logo.png";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const InvestorSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems: NavItem[] = [
    { 
      id: 'portal', 
      label: 'Portal Home', 
      icon: LayoutDashboard, 
      path: '/investors/portal' 
    },
    { 
      id: 'overview', 
      label: 'Overview', 
      icon: Eye, 
      path: '/investors/overview' 
    },
    { 
      id: 'opportunities', 
      label: 'Investment Opportunities', 
      icon: Briefcase, 
      path: '/investors/opportunities' 
    },
    { 
      id: 'presentation', 
      label: 'Pitch Deck', 
      icon: FileText, 
      path: '/investors/presentation' 
    },
    { 
      id: 'executive-summary', 
      label: 'Executive Summary', 
      icon: FileText, 
      path: '/investors/executive-summary' 
    },
    { 
      id: 'financial-projections', 
      label: 'Financial Projections', 
      icon: TrendingUp, 
      path: '/investors/financial-projections' 
    },
    { 
      id: 'use-of-funds', 
      label: 'Use of Funds', 
      icon: DollarSign, 
      path: '/investors/use-of-funds' 
    },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <aside className="w-64 border-r bg-white dark:bg-zinc-900 flex flex-col h-screen fixed left-0 top-0 z-50 shadow-lg">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2 mb-4">
          <img src={cravenLogo} alt="Crave'n" className="h-6" />
          <span className="font-bold text-orange-600 dark:text-orange-500">Investor Portal</span>
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
              Investor Materials
            </h3>
          </div>

          {navItems.map((item) => (
            <Button
              key={item.id}
              variant={isActive(item.path) ? 'secondary' : 'ghost'}
              className={`w-full justify-start ${
                isActive(item.path) 
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-900 dark:text-orange-100 hover:bg-orange-200 dark:hover:bg-orange-900/50' 
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              onClick={() => navigate(item.path)}
            >
              <item.icon className="h-4 w-4 mr-2" />
              {item.label}
            </Button>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2 text-xs text-muted-foreground dark:text-zinc-400">
          <Shield className="h-4 w-4" />
          <span>Confidential</span>
        </div>
      </div>
    </aside>
  );
};

export default InvestorSidebar;


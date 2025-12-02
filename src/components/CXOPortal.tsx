import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Activity,
  BarChart3,
  TrendingUp,
  Users,
  MessageSquare,
  Briefcase,
  Settings,
  X,
  ChevronRight,
  Mail,
  FileText,
  Scale,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import BusinessEmailSystem from '@/components/executive/BusinessEmailSystem';
import ExecutivePortalLayout, { ExecutiveNavItem } from '@/components/executive/ExecutivePortalLayout';
import ExecutiveWordProcessor from '@/components/executive/ExecutiveWordProcessor';
import { CXOOnboardingGovernance } from '@/components/cxo/CXOOnboardingGovernance';


// --- ICONS MAPPING ---

type IconKey =
  | 'Activity'
  | 'BarChart3'
  | 'TrendingUp'
  | 'Users'
  | 'MessageSquare'
  | 'Briefcase'
  | 'Settings'
  | 'Mail'
  | 'FileText'
  | 'Scale';


const IconMap = {
  Activity,
  BarChart3,
  TrendingUp,
  Users,
  MessageSquare,
  Briefcase,
  Settings,
  Mail,
  FileText,
  Scale,
};


// --- DATA STRUCTURES ---


interface NavItem {
  id:
    | 'onboarding'
    | 'dashboard'
    | 'analytics'
    | 'journeys'
    | 'feedback'
    | 'team'
    | 'initiatives'
    | 'communications'
    | 'settings'
    | 'wordprocessor';
  name: string;
  icon: IconKey;
}


interface Metric {
  title: string;
  value: string;
  trend: number; // positive or negative
  unit: string;
  color: string;
}


interface FeedbackItem {
  id: number;
  source: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  text: string;
  date: string;
  cxoResponse: string | null;
}


interface Initiative {
  id: number;
  title: string;
  owner: string;
  status: 'In Progress' | 'Completed' | 'Blocked';
  dueDate: string;
}


// --- DUMMY DATA ---


const NAV_ITEMS: NavItem[] = [
  { id: 'onboarding', name: 'CXO Onboarding & Governance', icon: 'Scale' },
  { id: 'dashboard', name: 'Dashboard', icon: 'Activity' },
  { id: 'analytics', name: 'Analytics Deep Dive', icon: 'BarChart3' },
  { id: 'journeys', name: 'Journey Mapping', icon: 'TrendingUp' },
  { id: 'feedback', name: 'Real-time Feedback', icon: 'MessageSquare' },
  { id: 'team', name: 'Team Alignment', icon: 'Users' },
  { id: 'initiatives', name: 'Strategic Initiatives', icon: 'Briefcase' },
  { id: 'communications', name: 'Executive Communications', icon: 'Mail' },
  { id: 'wordprocessor', name: 'Word Processor', icon: 'FileText' },
  { id: 'settings', name: 'Portal Settings', icon: 'Settings' },
];


const METRICS: Metric[] = [
  { title: 'NPS (Net Promoter Score)', value: '62', trend: 4.1, unit: 'pts', color: 'text-orange-500' },
  { title: 'CSAT (Customer Satisfaction)', value: '88.3%', trend: -1.2, unit: '%', color: 'text-green-500' },
  { title: 'Customer Retention Rate', value: '78%', trend: 0.5, unit: '%', color: 'text-green-500' },
  { title: 'Churn Reduction Potential', value: '$1.4M', trend: 6.8, unit: '', color: 'text-orange-500' },
];


const RECENT_FEEDBACK: FeedbackItem[] = [
  {
    id: 1, source: 'App Store', sentiment: 'negative', date: '2 hours ago',
    text: 'The new onboarding flow is confusing and I almost gave up before reaching the main screen.',
    cxoResponse: null,
  },
  {
    id: 2, source: 'Customer Survey', sentiment: 'positive', date: '5 hours ago',
    text: 'Fastest support interaction I\'ve ever had. Five stars to the rep!',
    cxoResponse: 'Forwarded to Support Lead for recognition and internal case study.',
  },
  {
    id: 3, source: 'Social Media', sentiment: 'neutral', date: '1 day ago',
    text: 'The pricing seems competitive, but the documentation is a little sparse on integrations.',
    cxoResponse: null,
  },
];


const INITIATIVES: Initiative[] = [
  { id: 101, title: 'Revamp Mobile Checkout Flow', owner: 'A. Chen', status: 'In Progress', dueDate: 'Q4 2025' },
  { id: 102, title: 'Implement AI Chatbot for Tier 1 Support', owner: 'M. Lopez', status: 'Completed', dueDate: 'Sep 2025' },
  { id: 103, title: 'Define Self-Service Knowledge Base Strategy', owner: 'S. Singh', status: 'Blocked', dueDate: 'Q1 2026' },
];


// --- COMPONENTS ---


// Card Component (Ant Design Style)
const AntCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
  <div className={`bg-white p-6 rounded-xl shadow-lg border border-gray-100 ${className}`}>
    <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">{title}</h3>
    {children}
  </div>
);


// Metric Tile
const MetricTile: React.FC<{ metric: Metric }> = ({ metric }) => {
  const Icon = metric.trend > 0 ? TrendingUp : X;
  const trendColor = metric.trend > 0 ? 'text-green-500' : 'text-red-500';


  return (
    <AntCard title={metric.title} className="hover:shadow-xl transition-shadow">
      <div className="flex items-end justify-between">
        <p className="text-4xl font-extrabold text-gray-900">{metric.value}</p>
        <div className="flex flex-col items-end">
          <span className={`flex items-center text-sm font-medium ${trendColor}`}>
            <Icon size={16} className="mr-1" />
            {Math.abs(metric.trend)}{metric.unit}
          </span>
          <span className="text-xs text-gray-500">vs Last Period</span>
        </div>
      </div>
    </AntCard>
  );
};


// Feedback List Item
const FeedbackList: React.FC<{ feedback: FeedbackItem }> = ({ feedback }) => {
  const sentimentClasses = useMemo(() => {
    switch (feedback.sentiment) {
      case 'positive': return 'bg-green-100 text-green-700';
      case 'negative': return 'bg-red-100 text-red-700';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  }, [feedback.sentiment]);


  return (
    <div className="border-b py-3 last:border-b-0">
      <div className="flex justify-between items-start mb-1">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sentimentClasses}`}>
          {feedback.sentiment.toUpperCase()}
        </span>
        <span className="text-xs text-gray-500">{feedback.date} - {feedback.source}</span>
      </div>
      <p className="text-gray-700 italic text-sm my-2 line-clamp-2">"{feedback.text}"</p>
      {feedback.cxoResponse && (
        <p className="text-xs text-blue-600 mt-1 flex items-center">
          <ChevronRight size={12} className="mr-1" />
          Actioned: {feedback.cxoResponse}
        </p>
      )}
      {!feedback.cxoResponse && (
        <button className="text-xs text-orange-600 hover:text-orange-800 transition">
          Prioritize & Respond
        </button>
      )}
    </div>
  );
};


// Initiatives Table
const InitiativesTable: React.FC<{ initiatives: Initiative[] }> = ({ initiatives }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Initiative</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {initiatives.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50 transition duration-150">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.title}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.owner}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  item.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                  item.status === 'In Progress' ? 'bg-blue-100 text-blue-800' : 
                  'bg-red-100 text-red-800'
                }`}>
                  {item.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.dueDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};


// Main CXO Dashboard View
const DashboardView: React.FC = () => (
  <div className="space-y-8">
    {/* Header and Quick Actions */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
      <h2 className="text-3xl font-bold text-gray-900">Experience Dashboard</h2>
      <div className="space-x-4 mt-4 sm:mt-0">
        <button className="px-4 py-2 bg-orange-600 text-white font-medium rounded-lg shadow-md hover:bg-orange-700 transition duration-150 flex items-center">
          <Briefcase size={18} className="mr-2" />
          New Initiative
        </button>
      </div>
    </div>

    {/* Metrics Overview Grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {METRICS.map((metric, index) => (
        <MetricTile key={index} metric={metric} />
      ))}
    </div>

    {/* Main Content Grid (Ant Design inspired structure) */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column (Main Data Trends) */}
      <div className="lg:col-span-2 space-y-6">
        <AntCard title="Customer Journey Funnel Analysis (Mock Chart)">
          {/* Placeholder for a complex chart (e.g., using Recharts) */}
          <div className="h-64 bg-gray-50 flex items-center justify-center text-gray-500 rounded-lg border border-dashed">
            Visualizing Conversion, Activation, and Retention Stages over 90 Days
          </div>
        </AntCard>

        <AntCard title="Upcoming Key Strategic Initiatives">
          <InitiativesTable initiatives={INITIATIVES} />
        </AntCard>
      </div>

      {/* Right Column (Actionable Feedback/Tasks) */}
      <div className="lg:col-span-1 space-y-6">
        <AntCard title="Actionable Feedback Feed">
          {RECENT_FEEDBACK.map((item) => (
            <FeedbackList key={item.id} feedback={item} />
          ))}
          <button className="w-full mt-4 text-center text-sm font-medium text-orange-600 hover:text-orange-700 transition">
            View All Feedback
          </button>
        </AntCard>

        <AntCard title="CX/Product Team Alignment">
          <ul className="space-y-3">
            <li className="flex items-center justify-between text-gray-700 text-sm">
              <span>Product Backlog Items ready for CX review</span>
              <span className="font-semibold text-blue-600">8</span>
            </li>
            <li className="flex items-center justify-between text-gray-700 text-sm">
              <span>Open High-Priority Customer Cases</span>
              <span className="font-semibold text-red-600">3</span>
            </li>
            <li className="flex items-center justify-between text-gray-700 text-sm">
              <span>Upcoming Cross-Functional Syncs</span>
              <span className="font-semibold text-green-600">2</span>
            </li>
          </ul>
          <button className="mt-4 w-full py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition duration-150">
            Assign Task
          </button>
        </AntCard>
      </div>
    </div>
  </div>
);


// General Placeholder View
const PlaceholderView: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex flex-col items-center justify-center h-full min-h-[50vh] bg-white rounded-xl shadow-lg border border-gray-100 p-8">
    <h2 className="text-3xl font-bold text-gray-800 mb-4">{title}</h2>
    <p className="text-gray-500 text-center">
      This section is where the in-depth data and specific tooling for {title.toLowerCase()} would reside.
      <br />
      For now, we are focusing on the main Dashboard view.
    </p>
    <button className="mt-8 px-6 py-3 bg-orange-600 text-white font-medium rounded-lg shadow-md hover:bg-orange-700 transition duration-150">
      Start New Analysis
    </button>
  </div>
);


const CommunicationsView: React.FC = () => (
  <div className="space-y-6">
    <AntCard title="Company-wide Communications Overview">
      <p className="text-sm text-gray-600 leading-relaxed">
        Manage cross-portal messaging, review historical threads, and coordinate targeted outreach to executive teams and field operators from a single communications hub.
      </p>
    </AntCard>
    <BusinessEmailSystem />
  </div>
);


// Main App Component
const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavItem['id']>('onboarding');
  const navigate = useNavigate();

  const navItems: ExecutiveNavItem[] = useMemo(
    () =>
      NAV_ITEMS.map((item) => ({
        id: item.id,
        label: item.name,
        icon: IconMap[item.icon] as any, // Lucide icons are compatible
      })),
    []
  );

  const handleBackToHub = () => {
    navigate('/hub');
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      sessionStorage.removeItem('hub_employee_info');
      navigate('/auth?hq=true');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'onboarding':
        return <CXOOnboardingGovernance />;
      case 'dashboard':
        return <DashboardView />;
      case 'analytics':
        return <PlaceholderView title="Analytics Deep Dive" />;
      case 'journeys':
        return <PlaceholderView title="Customer Journey Mapping" />;
      case 'feedback':
        return <PlaceholderView title="Real-time Feedback Management" />;
      case 'team':
        return <PlaceholderView title="Team Alignment & OKRs" />;
      case 'initiatives':
        return <PlaceholderView title="Strategic Initiatives Tracker" />;
      case 'communications':
        return <CommunicationsView />;
      case 'wordprocessor':
        return <ExecutiveWordProcessor storageKey="cxo" />;
      case 'settings':
        return <PlaceholderView title="Portal Configuration Settings" />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <ExecutivePortalLayout
      title="CXO Portal"
      subtitle="Experience leadership command center"
      navItems={navItems}
      activeItemId={activeTab}
      onSelect={(id) => setActiveTab(id as NavItem['id'])}
      onBack={handleBackToHub}
      onSignOut={handleSignOut}
      userInfo={{ initials: 'TS', name: 'Torrance Stroman', role: 'Chief Experience Officer' }}
    >
      {renderContent()}
    </ExecutivePortalLayout>
  );
};

export default App;


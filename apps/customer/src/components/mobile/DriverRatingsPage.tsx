import React from 'react';
import {
  Star,
  Award,
  TrendingUp,
  CheckCircle,
  Clock,
  ThumbsUp,
  Package,
  Lock,
  Menu,
  Bell,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

 type ColorKey = 'green' | 'blue' | 'orange' | 'purple';

type MetricKey = 'acceptance' | 'completion' | 'onTime' | 'customerRating' | 'lifetimeDeliveries';

type MetricConfig = {
  value: number;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: ColorKey;
  max?: number;
};

type RewardConfig = {
  id: number;
  title: string;
  description: string;
  unlocked: boolean;
  requirement: string;
  icon: React.ComponentType<{ className?: string }>;
  benefit: string;
};

type DriverRatingsPageProps = {
  onOpenMenu?: () => void;
  onOpenNotifications?: () => void;
};

const driverScore = 95;

const metrics: Record<MetricKey, MetricConfig> = {
  acceptance: { value: 98, label: 'Acceptance Rate', icon: CheckCircle, color: 'green' },
  completion: { value: 99, label: 'Completion Rate', icon: CheckCircle, color: 'green' },
  onTime: { value: 94, label: 'On-time Rate', icon: Clock, color: 'blue' },
  customerRating: { value: 4.9, label: 'Customer Rating', icon: Star, color: 'orange', max: 5 },
  lifetimeDeliveries: { value: 1247, label: 'Lifetime Deliveries', icon: Package, color: 'purple' }
};

const rewards: RewardConfig[] = [
  {
    id: 1,
    title: 'Priority Dispatch',
    description: 'Get first access to high-value orders',
    unlocked: true,
    requirement: 'Score 90+',
    icon: TrendingUp,
    benefit: '+15% more orders'
  },
  {
    id: 2,
    title: 'Peak Hour Bonus',
    description: 'Earn 1.5x during rush hours',
    unlocked: true,
    requirement: 'Score 85+',
    icon: Award,
    benefit: '+$5-12 per delivery'
  },
  {
    id: 3,
    title: 'Gold Badge',
    description: 'Display elite status to customers',
    unlocked: true,
    requirement: 'Score 90+',
    icon: Award,
    benefit: '+20% tips average'
  },
  {
    id: 4,
    title: 'Flexible Scheduling',
    description: 'Schedule shifts up to 2 weeks ahead',
    unlocked: false,
    requirement: 'Score 95+',
    icon: Clock,
    benefit: 'Early access'
  },
  {
    id: 5,
    title: 'Premium Support',
    description: '24/7 priority customer support line',
    unlocked: false,
    requirement: 'Score 98+',
    icon: ThumbsUp,
    benefit: 'Instant help'
  }
];

const colorBackground: Record<ColorKey, string> = {
  green: 'bg-green-50',
  blue: 'bg-blue-50',
  orange: 'bg-orange-50',
  purple: 'bg-purple-50'
};

const colorText: Record<ColorKey, string> = {
  green: 'text-green-600',
  blue: 'text-blue-600',
  orange: 'text-orange-600',
  purple: 'text-purple-600'
};

const progressColor: Record<ColorKey, string> = {
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  orange: 'bg-orange-500',
  purple: 'bg-purple-500'
};

export const DriverRatingsPage: React.FC<DriverRatingsPageProps> = ({ onOpenMenu, onOpenNotifications }) => {
  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <div className="bg-white flex-shrink-0">
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center justify-between mb-6">
            <button
              type="button"
              onClick={() => {
                if (onOpenMenu) {
                  onOpenMenu();
                } else {
                  toast.info('Menu coming soon.');
                }
              }}
              className="w-10 h-10 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white transition"
            >
              <Menu className="w-5 h-5 text-gray-700" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (onOpenNotifications) {
                  onOpenNotifications();
                } else {
                  toast.info('Notifications coming soon.');
                }
              }}
              className="w-10 h-10 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white transition"
            >
              <Bell className="w-5 h-5 text-gray-700" />
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Ratings & Rewards</h1>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto px-5 py-6"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
          .overflow-y-auto::-webkit-scrollbar {
            display: none;
          }
        `
          }}
        />

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-5 shadow-xl">
            <div className="flex items-center space-x-2 mb-3">
              <Award className="w-5 h-5 text-white" />
              <p className="text-white text-xs font-semibold">Overall Score</p>
            </div>
            <div className="flex items-baseline space-x-1">
              <h2 className="text-5xl font-bold text-white">{driverScore}</h2>
              <span className="text-white text-lg opacity-80">/100</span>
            </div>
            <div className="mt-3 h-2 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${driverScore}%` }}
              />
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-400 to-gray-500 rounded-3xl p-5 shadow-xl relative overflow-hidden">
            <div className="flex items-center space-x-2 mb-3">
              <Package className="w-5 h-5 text-white" />
              <p className="text-white text-xs font-semibold">Shopping Score</p>
            </div>
            <div className="flex items-center space-x-2">
              <Lock className="w-8 h-8 text-white opacity-60" />
              <span className="text-white text-sm font-medium">Coming Soon</span>
            </div>
            <div className="absolute top-0 right-0 opacity-10">
              <Package className="w-24 h-24 text-white" />
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="space-y-3">
            {Object.entries(metrics).map(([key, metric]) => {
              const Icon = metric.icon;
              const color = metric.color;
              const showProgress = key !== 'lifetimeDeliveries';
              const progress = metric.max
                ? Math.min(100, (metric.value / metric.max) * 100)
                : Math.min(100, metric.value);

              return (
                <div key={key} className="bg-white rounded-2xl p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${colorBackground[color]}`}>
                        <Icon className={`w-5 h-5 ${colorText[color]}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{metric.label}</p>
                        <p className="text-xs text-gray-500">
                          {key === 'lifetimeDeliveries' ? 'Total completed' : 'Last 30 days'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        {key === 'customerRating' ? metric.value.toFixed(1) : metric.value}
                        {key === 'customerRating' && <span className="text-base text-gray-400">/5</span>}
                        {!['customerRating', 'lifetimeDeliveries'].includes(key) && (
                          <span className="text-base text-gray-400">%</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {showProgress && (
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${progressColor[color]} rounded-full transition-all duration-500`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Your Rewards</h3>
            <span className="text-sm text-orange-600 font-semibold">
              {rewards.filter((reward) => reward.unlocked).length}/{rewards.length} Unlocked
            </span>
          </div>

          <div className="space-y-3">
            {rewards.map((reward) => {
              const Icon = reward.icon;

              return (
                <div
                  key={reward.id}
                  className={`rounded-2xl p-4 border-2 transition-all ${
                    reward.unlocked
                      ? 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300'
                      : 'bg-white border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div
                      className={`p-3 rounded-xl ${reward.unlocked ? 'bg-orange-500' : 'bg-gray-300'} flex items-center justify-center`}
                    >
                      {reward.unlocked ? (
                        <Icon className="w-6 h-6 text-white" />
                      ) : (
                        <Lock className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="font-bold text-gray-900">{reward.title}</h4>
                        {reward.unlocked && (
                          <div className="px-2 py-1 bg-green-500 rounded-full flex items-center">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{reward.description}</p>
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-semibold ${
                            reward.unlocked ? 'text-orange-600' : 'text-gray-500'
                          }`}
                        >
                          {reward.requirement}
                        </span>
                        <span className="text-xs font-medium text-gray-500">{reward.benefit}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-blue-50 rounded-2xl p-5 mb-6 border border-blue-200">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-1">Keep Up The Great Work!</h4>
              <p className="text-sm text-gray-600">
                You're only 3 points away from unlocking Flexible Scheduling. Maintain your on-time rate to reach 95+!
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );
};


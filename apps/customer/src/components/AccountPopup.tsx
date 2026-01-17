import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Heart, Star, MessageCircle, Gift, Users, CreditCard, Zap, Shield, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import cravemoreIcon from '@/assets/cravemore-icon.png';

interface AccountPopupProps {
  isOpen: boolean;
  onClose: () => void;
  position?: { top: number; left: number };
}

const AccountPopup: React.FC<AccountPopupProps> = ({ isOpen, onClose, position }) => {
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  if (!isOpen) return null;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userInitials = getInitials(userName);

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div 
        className="absolute bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
        style={{
          width: '320px', // ~4 inches
          height: '680px', // ~8-9 inches to accommodate Account Settings
          top: position?.top || 100,
          left: position?.left || 100,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 pb-4 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Account</h2>
          
          {/* User Profile */}
          <div className="flex items-center gap-3">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-yellow-400 text-white text-xl font-bold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-lg">{userName}</h3>
              <button className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                View Profile
              </button>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="space-y-0 min-h-0">
            {/* CraveMore Promotion */}
            <button 
              onClick={() => {
                onClose();
                window.location.href = '/crave-more';
              }}
              className="w-full flex items-center gap-3 p-3 bg-black hover:bg-gray-900 transition-colors -mx-6"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center">
                <img src={cravemoreIcon} alt="CraveMore" className="w-8 h-8" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm text-white font-medium">
                  Save an average of $5 on each order. 
                  <span className="font-semibold"> Start a free CraveMore trial!</span>
                </p>
              </div>
              <div className="w-6 h-6 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </button>

            {/* CraveN Rewards Card */}
            <div className="flex items-center gap-3 py-3 border-b border-gray-100">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Crave'N Rewards Mastercard®</p>
                    <p className="text-sm text-gray-500">Get 4% cash back and 1 year of CraveMore</p>
              </div>
            </div>

            {/* Get $0 delivery fees */}
            <div className="flex items-center gap-3 py-3 border-b border-gray-100">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-green-700">Get $0 delivery fees</p>
              </div>
            </div>

            {/* Saved Stores */}
            <div className="flex items-center gap-3 py-3 border-b border-gray-100">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Heart className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Saved Stores</p>
              </div>
            </div>

            {/* My Rewards */}
            <div className="flex items-center gap-3 py-3 border-b border-gray-100">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Star className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">My Rewards</p>
              </div>
            </div>

            {/* Help */}
            <div className="flex items-center gap-3 py-3 border-b border-gray-100">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Help</p>
              </div>
            </div>

            {/* Gift Card */}
            <div className="flex items-center gap-3 py-3 border-b border-gray-100">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Gift className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Gift Card</p>
              </div>
            </div>

            {/* Get $20 in Credits */}
            <div className="flex items-center gap-3 p-3 bg-pink-50 rounded-lg border border-pink-200">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Get $20 in Credits</p>
              </div>
            </div>

            {/* Account Settings Section */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Account Settings</h3>
              
              {/* Account */}
              <div className="py-3 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Account</p>
                    <p className="text-sm text-gray-500">{userName}</p>
                  </div>
                  <button className="text-sm text-blue-600 hover:text-blue-800 underline">
                    Switch
                  </button>
                </div>
              </div>

              {/* Payment */}
              <div className="py-3 border-b border-gray-100">
                <p className="font-semibold text-gray-900 text-sm">Payment</p>
              </div>

              {/* Language */}
              <div className="py-3 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-900 text-sm">Language</p>
                  <button className="flex items-center gap-2 px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50">
                    <Globe className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">English (US)</span>
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Sign Out */}
              <div className="pt-3">
                <button className="font-bold text-gray-900 hover:text-red-600 transition-colors">
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default AccountPopup;

import { Star, Package, ShoppingBag, Tag, Truck, Bell, Send, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const RETAIL_TYPES = ['apparel', 'retail', 'clothing', 'fashion', 'electronics', 'hardware', 'beauty', 'cosmetics', 'specialty_retail'];
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop";

interface RestaurantCardProps {
  id: string;
  name: string;
  image: string;
  rating: number;
  deliveryTime: string;
  deliveryFee: string;
  cuisine: string;
  distance?: string;
  isPromoted?: boolean;
  /** Marketplace catalog: ACTIVE = order now, REQUESTABLE = request flow, COMING_SOON = notify me */
  marketplaceStatus?: 'ACTIVE' | 'REQUESTABLE' | 'COMING_SOON';
  onRequest?: () => void | Promise<void>;
  onNotifyMe?: (email?: string) => void | Promise<void>;
}

const RestaurantCard = ({ 
  id,
  name, 
  image, 
  rating, 
  deliveryTime, 
  deliveryFee, 
  cuisine,
  distance,
  isPromoted = false,
  marketplaceStatus = 'ACTIVE',
  onRequest,
  onNotifyMe,
}: RestaurantCardProps) => {
  const navigate = useNavigate();
  const isRetail = RETAIL_TYPES.some(t => cuisine?.toLowerCase().includes(t));
  const [notifyEmail, setNotifyEmail] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [notifySent, setNotifySent] = useState(false);

  const isActive = marketplaceStatus === 'ACTIVE';
  const isRequestable = marketplaceStatus === 'REQUESTABLE';
  const isComingSoon = marketplaceStatus === 'COMING_SOON';

  const handleClick = (e: React.MouseEvent) => {
    if (!isActive) {
      e.stopPropagation();
      return;
    }
    navigate(`/restaurant/${id}/menu`);
  };

  const handleRequest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onRequest || requesting) return;
    setRequesting(true);
    try {
      await onRequest();
    } finally {
      setRequesting(false);
    }
  };

  const handleNotifyMe = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onNotifyMe || notifySent) return;
    setRequesting(true);
    try {
      await onNotifyMe(notifyEmail || undefined);
      setNotifySent(true);
    } finally {
      setRequesting(false);
    }
  };

  // Plan: when no logo, display business name only (no placeholder graphics)
  const hasLogo = Boolean(image);
  const displayImage = hasLogo ? image : (isActive && !isRequestable && !isComingSoon ? DEFAULT_IMAGE : '');

  return (
    <div className={`group ${isActive ? 'cursor-pointer' : ''}`} onClick={handleClick}>
      <div className="bg-white rounded-xl overflow-hidden border border-gray-100" style={{ width: '100%', maxWidth: '100%' }}>
        {/* Image or name-only when no logo (marketplace requestable/coming soon) */}
        <div className={`relative ${isRetail ? 'h-48 sm:h-56 bg-gray-50' : 'h-44 sm:h-52'} overflow-hidden rounded-xl ${!isActive ? 'bg-gray-50' : ''} flex items-center justify-center`}>
          {displayImage ? (
            <img 
              src={displayImage} 
              alt={name}
              className={`w-full h-full ${isRetail || !isActive ? 'object-contain p-2' : 'object-cover'} ${isActive ? 'group-hover:scale-105' : ''} transition-transform duration-500`}
            />
          ) : (
            <span className="text-gray-700 font-semibold text-center px-3 line-clamp-3" style={{ fontSize: '1rem' }}>{name}</span>
          )}
          {isRequestable && (
            <div className="absolute top-2 left-2 right-2 flex justify-center">
              <span className="bg-gray-800 text-white px-2 py-1 rounded-full text-xs font-medium">Not on Crave&apos;n yet</span>
            </div>
          )}
          {isComingSoon && (
            <div className="absolute top-2 left-2 right-2 flex justify-center">
              <span className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium">Coming soon to Crave&apos;n</span>
            </div>
          )}
          {isRetail && isActive && (
            <div className="absolute top-3 right-3 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <Package className="h-3 w-3" />
              Ships Free
            </div>
          )}
        </div>

        {/* Content */}
        <div className="pt-2.5 pb-1 px-0.5">
          {isRequestable && (
            <>
              <h3 className="font-bold text-base text-gray-900 line-clamp-1 mb-1">{name}</h3>
              {cuisine && <p className="text-xs text-gray-500 capitalize mb-2">{cuisine}</p>}
              <button
                type="button"
                onClick={handleRequest}
                disabled={requesting}
                className="w-full py-2 px-3 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-70 flex items-center justify-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                {requesting ? 'Requesting…' : "Request this business on Crave'n"}
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Invite this business —{' '}
                <a
                  href="https://cravenusa.com/merchant"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-orange-500 font-medium hover:underline inline-flex items-center gap-0.5"
                >
                  <Share2 className="h-3 w-3" />
                  Share with them
                </a>
              </p>
            </>
          )}
          {isComingSoon && (
            <>
              <h3 className="font-bold text-base text-gray-900 line-clamp-1 mb-1">{name}</h3>
              {cuisine && <p className="text-xs text-gray-500 capitalize mb-2">{cuisine}</p>}
              {!notifySent ? (
                <>
                  <input
                    type="email"
                    placeholder="Your email"
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-2"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    type="button"
                    onClick={handleNotifyMe}
                    disabled={requesting}
                    className="w-full py-2 px-3 rounded-lg bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700 disabled:opacity-70 flex items-center justify-center gap-1.5"
                  >
                    <Bell className="h-3.5 w-3.5" />
                    {requesting ? 'Sending…' : 'Notify me when available'}
                  </button>
                </>
              ) : (
                <p className="text-sm text-green-600 font-medium">We&apos;ll notify you!</p>
              )}
            </>
          )}
          {isActive && isRetail ? (
            <>
              {/* Retail Card Layout */}
              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                <h3 className="font-bold text-base text-gray-900 line-clamp-1">
                  {name}
                </h3>
                <div className="flex items-center gap-1 text-sm text-gray-700">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold">{rating}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-0.5">
                <ShoppingBag className="h-3 w-3" />
                <span className="capitalize">{cuisine}</span>
                {distance && <span>· {distance}</span>}
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Tag className="h-3 w-3 text-orange-500" />
                    Shop Now
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    {deliveryTime}
                  </span>
                </div>
                {isPromoted && (
                  <span className="text-xs font-medium text-blue-600">Featured</span>
                )}
              </div>
            </>
          ) : isActive ? (
            <>
              {/* Food Card Layout (original) */}
              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                <h3 className="font-bold text-base text-gray-900 line-clamp-1">
                  {name}
                </h3>
                <div className="flex items-center gap-1 text-sm text-gray-700">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold">{rating}</span>
                </div>
                <span className="text-sm text-gray-500">
                  {distance ? `· ${distance}` : ""} · {deliveryTime}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  {deliveryFee === "Free" ? "$0 delivery fee, first order" : `${deliveryFee} delivery fee`}
                </p>
                {isPromoted && (
                  <span className="text-sm font-medium text-blue-600">Sponsored</span>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default RestaurantCard;
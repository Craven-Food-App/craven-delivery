import { Star, Package, ShoppingBag, Tag, Truck, Bell, Send, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const RETAIL_TYPES = ['apparel', 'retail', 'clothing', 'fashion', 'electronics', 'hardware', 'beauty', 'cosmetics', 'specialty_retail'];
const BASE_LOGO = "https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/seed%20logos";
const SEEDED_LOGO_URLS: Record<string, string> = {
  "Tony Packo's": `${BASE_LOGO}/FB_IMG_1773013555938.jpg`,
  "Applebee's": `${BASE_LOGO}/FB_IMG_1773013585044.jpg`,
  "Arby's": `${BASE_LOGO}/FB_IMG_1773013601605.jpg`,
  "Balance Grille": `${BASE_LOGO}/FB_IMG_1773013654751.jpg`,
  "Bangkok Kitchen": `${BASE_LOGO}/FB_IMG_1773013751104.jpg`,
  "Bar Louie": `${BASE_LOGO}/FB_IMG_1773013775224.jpg`,
  "Bob Evans": `${BASE_LOGO}/FB_IMG_1773013792415.jpg`,
  "Chili's": `${BASE_LOGO}/FB_IMG_1773013841352.jpg`,
  "Cracker Barrel": `${BASE_LOGO}/FB_IMG_1773013861105.jpg`,
  "Denny's": `${BASE_LOGO}/FB_IMG_1773013878790.jpg`,
  "Dunkin'": `${BASE_LOGO}/FB_IMG_1773013952977.jpg`,
  "Holland House": `${BASE_LOGO}/FB_IMG_1773014023637.jpg`,
  "Home Slice Pizza": `${BASE_LOGO}/FB_IMG_1773014076682.jpg`,
  "IHOP": `${BASE_LOGO}/FB_IMG_1773014105739.jpg`,
  "McDonald's": `${BASE_LOGO}/FB_IMG_1773014131269.jpg`,
  "McDonalds": `${BASE_LOGO}/FB_IMG_1773014131269.jpg`,
  "Olive Garden": `${BASE_LOGO}/FB_IMG_1773014153763.jpg`,
  "Outback Steakhouse": `${BASE_LOGO}/FB_IMG_1773014170637.jpg`,
  "Panda Express": `${BASE_LOGO}/FB_IMG_1773014193727.jpg`,
  "Red Lobster": `${BASE_LOGO}/FB_IMG_1773014220077.jpg`,
  "Red Robin": `${BASE_LOGO}/FB_IMG_1773014242955.jpg`,
  "Red Robbin": `${BASE_LOGO}/FB_IMG_1773014242955.jpg`,
  "Rosiies": `${BASE_LOGO}/FB_IMG_1773014271528.jpg`,
  "Rosie's": `${BASE_LOGO}/FB_IMG_1773014271528.jpg`,
  "Rudy's Hot Dog": `${BASE_LOGO}/FB_IMG_1773014327092.jpg`,
  "Schmucker's Restaurant": `${BASE_LOGO}/FB_IMG_1773014432347.jpg`,
  "Sonic": `${BASE_LOGO}/FB_IMG_1773014452021.jpg`,
  "Star Diner": `${BASE_LOGO}/FB_IMG_1773014472754.jpg`,
  "Starbucks": `${BASE_LOGO}/FB_IMG_1773014488001.jpg`,
  "Taco Bell": `${BASE_LOGO}/FB_IMG_1773014506899.jpg`,
  "Texas Roadhouse": `${BASE_LOGO}/FB_IMG_1773014555948.jpg`,
  "The Attic on Adams": `${BASE_LOGO}/FB_IMG_1773014580737.jpg`,
  "Ye Olde Dirty Bird": `${BASE_LOGO}/Picsart_26-03-08_20-07-48-171.jpg`,
  "Ye Olde Durty Bird": `${BASE_LOGO}/Picsart_26-03-08_20-07-48-171.jpg`,
};
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
  /** Opens enterprise "Request this business" modal with structured metrics (for REQUESTABLE cards) */
  onShareWithBusiness?: (business: { id: string; name: string; image?: string; cuisine?: string }) => void;
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
  onShareWithBusiness,
}: RestaurantCardProps) => {
  const navigate = useNavigate();
  const isRetail = RETAIL_TYPES.some(t => cuisine?.toLowerCase().includes(t));
  const [notifyEmail, setNotifyEmail] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [notifySent, setNotifySent] = useState(false);
  const [showNotifyInline, setShowNotifyInline] = useState(false);

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

  // All cards: use image when available, else seeded logo by name, else placeholder
  const hasLogo = Boolean(image);
  const seededLogo = name ? SEEDED_LOGO_URLS[name] : undefined;
  const displayImage = hasLogo ? image : (seededLogo ?? (isActive ? DEFAULT_IMAGE : ''));

  // Unified content: same layout for all (name + rating · time, then tag line + right badge)
  const ratingDisplay = isActive ? rating : '—';
  const timeDisplay = isActive ? deliveryTime : (isComingSoon ? 'Soon' : '—');
  const tagLine = isRequestable
    ? "Not on Crave'n yet"
    : isComingSoon
    ? "Coming soon to Crave'n"
    : deliveryFee === "Free"
    ? "$0 delivery fee, first order"
    : `${deliveryFee} delivery fee`;
  const rightBadge = isActive && isPromoted ? (isRetail ? 'Featured' : 'Sponsored') : null;

  return (
    <div className={`group ${isActive ? 'cursor-pointer' : ''}`} onClick={handleClick}>
      <div className="bg-white rounded-t-xl overflow-hidden border border-gray-100 rounded-b-xl" style={{ width: '100%', maxWidth: '100%' }}>
        {/* Image: same treatment for all cards — rounded top, object-cover */}
        <div className={`relative h-32 overflow-hidden rounded-t-xl bg-white flex items-center justify-center`}>
          {displayImage ? (
            <img
              src={displayImage}
              alt={name}
              className={`max-w-[85%] max-h-[85%] object-contain ${isActive ? 'group-hover:scale-105' : ''} transition-transform duration-500`}
            />
          ) : (
            <span className="text-gray-600 font-semibold text-center px-3 line-clamp-2 text-sm">{name}</span>
          )}
          {/* Small overlay button at bottom-right for request / notify */}
          {isRequestable && onRequest && (
            <button
              type="button"
              onClick={handleRequest}
              disabled={requesting}
              className="absolute bottom-2 right-2 z-10 py-1.5 px-2.5 rounded-md bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 disabled:opacity-70 flex items-center gap-1 shadow-lg"
            >
              <Send className="h-3 w-3" />
              {requesting ? '…' : 'Request'}
            </button>
          )}
          {isComingSoon && !notifySent && !showNotifyInline && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowNotifyInline(true);
              }}
              className="absolute bottom-2 right-2 py-1.5 px-2.5 rounded-md bg-gray-800 text-white text-xs font-semibold hover:bg-gray-700 flex items-center gap-1 shadow-lg"
            >
              <Bell className="h-3 w-3" />
              Notify me
            </button>
          )}
          {isRetail && isActive && (
            <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
              <Package className="h-3 w-3" />
              Ships Free
            </div>
          )}
        </div>

        {/* Unified content: same layout for ACTIVE, REQUESTABLE, COMING_SOON */}
        <div className="pt-2.5 pb-2 px-2">
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <h3 className="font-bold text-base text-gray-900 line-clamp-1 flex-1 min-w-0">{name}</h3>
            <div className="flex items-center gap-1 text-sm text-gray-700 flex-shrink-0">
              {isActive && (
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              )}
              <span className="font-semibold">{ratingDisplay}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-600">{timeDisplay}</span>
            </div>
          </div>
          <div className="flex justify-between items-center gap-2">
            <p className="text-sm text-gray-500 truncate flex-1 min-w-0">{tagLine}</p>
            {rightBadge && (
              <span className="text-sm font-medium text-blue-600 flex-shrink-0">{rightBadge}</span>
            )}
            {isRequestable && (onShareWithBusiness ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onShareWithBusiness({ id, name, image, cuisine });
                }}
                className="text-orange-500 font-medium hover:underline inline-flex items-center gap-0.5 text-xs flex-shrink-0"
              >
                <Share2 className="h-3 w-3" />
                Share with business
              </button>
            ) : (
              <span className="text-orange-500 font-medium inline-flex items-center gap-0.5 text-xs flex-shrink-0">
                <Share2 className="h-3 w-3" />
                Share with business
              </span>
            ))}
          </div>
          {/* Inline notify form (COMING_SOON) */}
          {isComingSoon && showNotifyInline && !notifySent && (
            <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="email"
                placeholder="Your email"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 min-w-0"
              />
              <button
                type="button"
                onClick={handleNotifyMe}
                disabled={requesting}
                className="py-1.5 px-2.5 rounded-lg bg-gray-800 text-white text-xs font-semibold hover:bg-gray-700 disabled:opacity-70"
              >
                {requesting ? '…' : 'Send'}
              </button>
            </div>
          )}
          {isComingSoon && notifySent && (
            <p className="text-xs text-green-600 font-medium mt-1">We&apos;ll notify you!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestaurantCard;
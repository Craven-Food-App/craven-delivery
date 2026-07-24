import { Star, Package, ShoppingBag, Tag, Truck, Bell, Send, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { resolveMerchantLogoUrl } from "@/utils/merchantSeedLogos";

const RETAIL_TYPES = ['apparel', 'retail', 'clothing', 'fashion', 'electronics', 'hardware', 'beauty', 'cosmetics', 'specialty_retail'];

export type RestaurantCardVariant = 'default' | 'food' | 'shelf';

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
  /** Stage layout: food = wide tile; shelf = logo-forward retail/grocery */
  variant?: RestaurantCardVariant;
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
  variant = 'default',
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

  const displayImage = resolveMerchantLogoUrl(name, image, undefined) || '';

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

  const actionOverlays = (
    <>
      {isRequestable && (onShareWithBusiness || onRequest) && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onShareWithBusiness) {
              onShareWithBusiness({ id, name, image, cuisine });
            } else if (onRequest) {
              handleRequest(e as any);
            }
          }}
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
    </>
  );

  const notifyInline = (
    <>
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
    </>
  );

  /* ── Rails: shelf (retail / mall) — dense logo tiles, no gimmicks ── */
  if (variant === 'shelf') {
    return (
      <div className={`group ${isActive ? 'cursor-pointer' : ''}`} onClick={handleClick} style={{ width: '100%' }}>
        <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
          <div className="relative h-[88px] bg-white flex items-center justify-center p-2.5 border-b border-gray-100">
            {displayImage ? (
              <img
                src={displayImage}
                alt={name}
                className={`max-w-full max-h-full object-contain ${isActive ? 'group-hover:scale-[1.03]' : ''} transition-transform duration-300`}
              />
            ) : (
              <ShoppingBag className="h-6 w-6 text-gray-300" />
            )}
            {actionOverlays}
          </div>
          <div className="px-2 pt-1.5 pb-1.5">
            <h3 className="font-semibold text-[12px] text-gray-900 line-clamp-2 leading-snug">{name}</h3>
            <p className="text-[10px] text-gray-500 mt-0.5 truncate">
              {isActive ? (distance || timeDisplay) : tagLine}
            </p>
            {notifyInline}
          </div>
        </div>
      </div>
    );
  }

  /* ── Rails: food — same info density as classic, snap-friendly width ── */
  if (variant === 'food') {
    return (
      <div className={`group ${isActive ? 'cursor-pointer' : ''}`} onClick={handleClick} style={{ width: '100%' }}>
        <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
          <div className="relative h-[108px] bg-white flex items-center justify-center border-b border-gray-100">
            {displayImage ? (
              <img
                src={displayImage}
                alt={name}
                className={`max-w-[82%] max-h-[82%] object-contain ${isActive ? 'group-hover:scale-[1.03]' : ''} transition-transform duration-300`}
              />
            ) : (
              <span className="text-gray-600 font-semibold text-center px-3 line-clamp-2 text-sm">{name}</span>
            )}
            {actionOverlays}
          </div>
          <div className="pt-1.5 pb-1.5 px-2">
            <div className="flex items-start justify-between gap-1.5 mb-0">
              <h3 className="font-bold text-[13px] text-gray-900 line-clamp-1 flex-1 min-w-0">{name}</h3>
              <div className="flex items-center gap-0.5 text-xs text-gray-700 flex-shrink-0">
                {isActive && (
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                )}
                <span className="font-semibold">{ratingDisplay}</span>
                <span className="text-gray-300">·</span>
                <span className="text-gray-600">{timeDisplay}</span>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 truncate leading-tight mt-0.5">{tagLine}</p>
            {notifyInline}
          </div>
        </div>
      </div>
    );
  }

  /* ── Classic (unchanged) ── */
  return (
    <div className={`group ${isActive ? 'cursor-pointer' : ''}`} onClick={handleClick}>
      <div className="bg-white rounded-t-xl overflow-hidden border border-gray-100 rounded-b-xl" style={{ width: '100%', maxWidth: '100%' }}>
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
          {actionOverlays}
          {isRetail && isActive && (
            <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
              <Package className="h-3 w-3" />
              Ships Free
            </div>
          )}
        </div>

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
          </div>
          {notifyInline}
        </div>
      </div>
    </div>
  );
};

export default RestaurantCard;
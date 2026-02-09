import { Star, Package, ShoppingBag, Tag, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";

const RETAIL_TYPES = ['apparel', 'retail', 'clothing', 'fashion', 'electronics', 'hardware', 'beauty', 'cosmetics', 'specialty_retail'];

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
  isPromoted = false 
}: RestaurantCardProps) => {
  const navigate = useNavigate();
  const isRetail = RETAIL_TYPES.some(t => cuisine?.toLowerCase().includes(t));

  const handleClick = () => {
    navigate(`/restaurant/${id}/menu`);
  };

  return (
    <div className="group cursor-pointer" onClick={handleClick}>
      <div className="bg-white rounded-xl overflow-hidden" style={{ width: '100%', maxWidth: '100%' }}>
        {/* Image */}
        <div className={`relative ${isRetail ? 'h-48 sm:h-56 bg-gray-50' : 'h-44 sm:h-52'} overflow-hidden rounded-xl`}>
          <img 
            src={image} 
            alt={name}
            className={`w-full h-full ${isRetail ? 'object-contain p-2' : 'object-cover'} group-hover:scale-105 transition-transform duration-500`}
          />
          {isRetail && (
            <div className="absolute top-3 right-3 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <Package className="h-3 w-3" />
              Ships Free
            </div>
          )}
        </div>

        {/* Content */}
        <div className="pt-2.5 pb-1 px-0.5">
          {isRetail ? (
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
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default RestaurantCard;
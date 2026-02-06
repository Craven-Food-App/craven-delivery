import { Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

  const handleClick = () => {
    navigate(`/restaurant/${id}/menu`);
  };

  return (
    <div className="group cursor-pointer" onClick={handleClick}>
      <div className="bg-white rounded-xl overflow-hidden" style={{ width: '100%', maxWidth: '100%' }}>
        {/* Image — clean, no overlay badges */}
        <div className="relative h-44 sm:h-52 overflow-hidden rounded-xl">
          <img 
            src={image} 
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* Content */}
        <div className="pt-2.5 pb-1 px-0.5">
          {/* Row 1: Name · ⭐ Rating · Distance · Time */}
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

          {/* Row 2: Delivery fee (left) + Sponsored label (right) */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              {deliveryFee === "Free" ? "$0 delivery fee, first order" : `${deliveryFee} delivery fee`}
            </p>
            {isPromoted && (
              <span className="text-sm font-medium text-blue-600">Sponsored</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantCard;
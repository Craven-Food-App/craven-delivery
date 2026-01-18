import { Star, Clock, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface RestaurantCardProps {
  id: string;
  name: string;
  image: string;
  rating: number;
  deliveryTime: string;
  deliveryFee: string;
  cuisine: string;
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
  isPromoted = false 
}: RestaurantCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/restaurant/${id}/menu`);
  };

  return (
    <div className="group cursor-pointer" onClick={handleClick}>
      <div className="bg-card rounded-lg shadow-card hover:shadow-hover transition-all duration-300 transform hover:scale-105 overflow-hidden w-full">
        {/* Image */}
        <div className="relative h-40 sm:h-48 overflow-hidden rounded-t-lg">
          <img 
            src={image} 
            alt={name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          
          {/* Overlay tags */}
          <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
            {/* Promoted Badge */}
            {isPromoted && (
              <div className="bg-[#ff5f1f] text-white px-2 py-1 rounded text-xs font-semibold">
                Promoted
              </div>
            )}
            
            {/* Delivery Fee Badge */}
            {deliveryFee === "Free" && (
              <div className="bg-[#10b981] text-white px-2 py-1 rounded text-xs font-semibold">
                Free Delivery
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4">
          {/* Row 1: Star rating (left) and Restaurant name (right) */}
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center space-x-1 text-sm flex-shrink-0">
              <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{rating}</span>
            </div>
            <h3 className="font-bold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1 flex-1 min-w-0 text-right">
              {name}
            </h3>
          </div>

          {/* Row 2: Promo text (left) and Distance/time (right) */}
          <div className="flex justify-between items-center mb-1">
            <p className="text-muted-foreground text-xs sm:text-sm line-clamp-1 flex-1 min-w-0">
              {deliveryFee === "Free" ? "$0 delivery fee, first order" : (isPromoted ? "Sponsored" : cuisine)}
            </p>
            <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0 ml-2">
              - {deliveryTime}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantCard;
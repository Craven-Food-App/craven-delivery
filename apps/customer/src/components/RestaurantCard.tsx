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
        <div className="relative h-40 sm:h-48 overflow-hidden">
          <img 
            src={image} 
            alt={name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          
          {/* Promoted Badge */}
          {isPromoted && (
            <div className="absolute top-3 left-3 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium">
              Promoted
            </div>
          )}
          
          {/* Delivery Fee Badge */}
          {deliveryFee === "Free" && (
            <div className="absolute top-3 right-3 bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-xs font-medium">
              Free Delivery
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors line-clamp-1 flex-1 min-w-0">
              {name}
            </h3>
            <div className="flex items-center space-x-1 text-xs sm:text-sm flex-shrink-0 ml-2">
              <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{rating}</span>
            </div>
          </div>

          <p className="text-muted-foreground text-xs sm:text-sm mb-3 line-clamp-1">{cuisine}</p>

          <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs">{deliveryTime}</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <Truck className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs">{deliveryFee}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantCard;
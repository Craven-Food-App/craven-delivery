import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, MapPin, Phone, Globe } from 'lucide-react';

interface RestaurantHeroProps {
  restaurant: {
    name: string;
    description: string;
    image_url?: string;
    logo_url?: string;
    cuisine_type: string;
    rating: number;
    delivery_fee_cents: number;
    min_delivery_time: number;
    max_delivery_time: number;
    address: string;
    phone?: string;
  };
}

const RestaurantHero = ({ restaurant }: RestaurantHeroProps) => {
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <div className="relative h-64 md:h-80 overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${restaurant.image_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200'})`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
      </div>
      
      <div className="relative h-full flex items-end">
        <div className="container mx-auto px-4 pb-8">
          <div className="flex items-end gap-6">
            {restaurant.logo_url && (
              <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-2xl bg-white p-2 flex-shrink-0">
                <img
                  src={restaurant.logo_url}
                  alt={`${restaurant.name} logo`}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            
            <div className="text-white flex-1">
              <div className="mb-3">
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur-sm mb-3">
                  {restaurant.cuisine_type}
                </Badge>
                <h1 className="text-4xl md:text-5xl font-bold mb-3 drop-shadow-lg">
                  {restaurant.name}
                </h1>
                <p className="text-white/90 mb-4 text-lg leading-relaxed max-w-2xl">
                  {restaurant.description}
                </p>
              </div>
              
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-2">
                  <Star className="h-4 w-4 fill-current text-yellow-400" />
                  <span className="font-semibold">{restaurant.rating.toFixed(1)}</span>
                  <span className="text-white/80">(150+ reviews)</span>
                </div>
                
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-2">
                  <Clock className="h-4 w-4" />
                  <span>{restaurant.min_delivery_time}-{restaurant.max_delivery_time} min</span>
                </div>
                
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-2">
                  <MapPin className="h-4 w-4" />
                  <span>{restaurant.delivery_fee_cents === 0 ? 'Free delivery' : `${formatPrice(restaurant.delivery_fee_cents)} delivery`}</span>
                </div>

                {restaurant.phone && (
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-2">
                    <Phone className="h-4 w-4" />
                    <span>{restaurant.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-4 right-4 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-4 left-1/3 w-24 h-24 bg-gradient-to-br from-secondary/30 to-transparent rounded-full blur-2xl" />
    </div>
  );
};

export default RestaurantHero;
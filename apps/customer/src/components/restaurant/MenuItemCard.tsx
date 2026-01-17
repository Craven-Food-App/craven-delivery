import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Heart } from 'lucide-react';

import { useIsMobile } from '@/hooks/use-mobile';

interface MenuItemCardProps {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  image_url?: string;
  category: string;
  is_available: boolean;
  dietary_info?: string[];
  restaurantId?: string;
  onAddToCart: (id: string) => void;
  onCustomize?: (item: any) => void;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
}

const MenuItemCard = ({
  id,
  name,
  description,
  price_cents,
  image_url,
  category,
  is_available,
  dietary_info,
  restaurantId,
  onAddToCart,
  onCustomize,
  onToggleFavorite,
  isFavorite = false
}: MenuItemCardProps) => {
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const isMobile = useIsMobile();

  // Mobile compact layout
  if (isMobile) {
    return (
      <Card className="overflow-hidden hover:shadow-md transition-all duration-300 border-border/50 group">
        <CardContent className="p-0">
          <div className="flex gap-3 p-4">
            {image_url && (
              <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
                <img
                  src={image_url}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between">
                <button
                  onClick={() => onCustomize && onCustomize({
                    id, name, description, price_cents, image_url, 
                    category, is_available, dietary_info
                  })}
                  className="text-left"
                  disabled={!is_available}
                >
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {name}
                  </h3>
                </button>
                {onToggleFavorite && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onToggleFavorite}
                    className={`transition-colors p-1 ${
                      isFavorite 
                        ? 'text-red-500 hover:text-red-600' 
                        : 'text-muted-foreground hover:text-red-500'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                  </Button>
                )}
              </div>
              
              <p className="text-muted-foreground text-sm line-clamp-2">
                {description.length > 60 ? `${description.substring(0, 60)}...` : description}
              </p>
              
              <div className="flex items-center justify-between pt-1">
                <span className="text-lg font-bold text-foreground">
                  {formatPrice(price_cents)}
                </span>
                
                <Button 
                  onClick={() => onAddToCart(id)}
                  disabled={!is_available}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Desktop layout (unchanged)
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 group">
      <CardContent className="p-0">
        <div className="flex gap-4 p-6">
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between">
              <button
                onClick={() => onCustomize && onCustomize({
                  id, name, description, price_cents, image_url, 
                  category, is_available, dietary_info
                })}
                className="text-left"
                disabled={!is_available}
              >
                <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                  {name}
                </h3>
              </button>
              {onToggleFavorite && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onToggleFavorite}
                  className={`transition-colors ${
                    isFavorite 
                      ? 'text-red-500 hover:text-red-600' 
                      : 'text-muted-foreground hover:text-red-500'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                </Button>
              )}
            </div>
            
            <p className="text-muted-foreground leading-relaxed text-sm">
              {description}
            </p>
            
            {dietary_info && dietary_info.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {dietary_info.map((info) => (
                  <Badge 
                    key={info} 
                    variant="outline" 
                    className="text-xs bg-green-50 text-green-700 border-green-200"
                  >
                    {info}
                  </Badge>
                ))}
              </div>
            )}
            
            <div className="flex items-center justify-between pt-2">
              <span className="text-2xl font-bold text-foreground">
                {formatPrice(price_cents)}
              </span>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => onAddToCart(id)}
                  disabled={!is_available}
                  size="sm"
                  variant="outline"
                  className="border-primary/20 hover:bg-primary/10 text-primary hover:text-primary"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Quick Add
                </Button>
                
                {onCustomize && (
                  <Button 
                    onClick={() => onCustomize({
                      id, name, description, price_cents, image_url, 
                      category, is_available, dietary_info
                    })}
                    disabled={!is_available}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    Customize
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          {image_url && (
            <div className="w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden group-hover:shadow-lg transition-shadow">
              <img
                src={image_url}
                alt={name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MenuItemCard;